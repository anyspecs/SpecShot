// 移除REST上传相关import，改为纯离线流程

export default defineBackground(() => {
  const SUPPORTED_URLS = ['chatgpt.com', 'claude.ai', 'poe.com', 'kimi.com', 'kimi.moonshot.cn', 'www.kimi.com', 'gemini.google.com', 'bard.google.com'];
  
  // 全局下载检测服务
  let isWaitingForDownload = false;
  let downloadWaitTimeout: NodeJS.Timeout | null = null;
  let currentPlatform: string = 'Unknown';
  
  // 缓存每个tab的平台信息
  const tabPlatformCache = new Map<number, string>();
  
  // 初始化下载监听器
  setupDownloadDetection();
  
  // 初始化时清除默认popup设置
  browser.action.setPopup({ popup: '' });

  // 处理图标点击事件
  browser.action.onClicked.addListener(async (tab) => {
    console.log('🖱️ 插件图标被点击, tab:', tab.id);
    
    if (!tab.id) {
      console.error('❌ 无效的tab ID');
      return;
    }
    
    try {
      // 首先尝试从缓存获取平台信息
      let platform = tabPlatformCache.get(tab.id) || 'Unknown';
      console.log('📋 缓存中的平台信息:', platform);
      
      // 如果缓存中没有或者是Unknown，则重新检测
      if (platform === 'Unknown') {
        console.log('🔍 重新检测平台...');
        try {
          const platformResponse = await browser.tabs.sendMessage(tab.id, { action: "detectPlatform" });
          platform = platformResponse?.platform || 'Unknown';
          console.log('🔍 检测结果:', platform);
          
          // 更新缓存
          tabPlatformCache.set(tab.id, platform);
        } catch (detectError) {
          console.error('❌ 平台检测失败:', detectError);
          platform = 'Unknown';
        }
      }
      
      if (platform === 'Unknown') {
        // 如果检测不到平台，显示popup进行平台检测
        console.log('❓ 未知平台，显示popup');
        browser.action.setPopup({ tabId: tab.id, popup: '/popup.html' });
        browser.action.openPopup();
        return;
      }
      
      // 检测到支持的平台，直接执行剪存操作
      console.log('✅ 支持的平台，开始直接剪存:', platform);
      currentPlatform = platform;
      
      // 执行剪存操作
      const extractResponse = await browser.tabs.sendMessage(tab.id, { 
        action: "extract", 
        format: "markdown" 
      });
      
      if (extractResponse?.error) {
        // 如果出错，显示popup进行错误处理
        console.log('❌ 剪存失败，显示popup:', extractResponse.error);
        browser.action.setPopup({ tabId: tab.id, popup: '/popup.html' });
        browser.action.openPopup();
      } else {
        // 成功则开始监听下载
        console.log('🎉 剪存成功，开始监听下载');
        startDownloadWatch();
      }
      
    } catch (error) {
      console.error('❌ 图标点击处理失败:', error);
      // 出错时显示popup
      browser.action.setPopup({ tabId: tab.id, popup: '/popup.html' });
      browser.action.openPopup();
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      if (SUPPORTED_URLS.some(url => tab.url!.includes(url))) {
        browser.action.enable(tabId);
      } else {
        browser.action.disable(tabId);
        // 如果不是支持的URL，清除缓存
        tabPlatformCache.delete(tabId);
      }
    }
    
    // URL变化时重置popup设置和清除缓存
    if (changeInfo.url) {
      console.log('🔄 URL变化，重置状态:', {
        tabId,
        newUrl: changeInfo.url,
        oldPlatform: tabPlatformCache.get(tabId)
      });
      
      // 清除该tab的平台缓存，强制重新检测
      tabPlatformCache.delete(tabId);
      
      // 重置popup设置
      browser.action.setPopup({ tabId, popup: '' });
    }
  });

  // 监听tab关闭事件，清理缓存
  browser.tabs.onRemoved.addListener((tabId) => {
    console.log('🗑️ Tab关闭，清理缓存:', tabId);
    tabPlatformCache.delete(tabId);
  });

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "platformChanged") {
      // 处理来自content script的平台变化通知
      const tabId = sender.tab?.id;
      if (tabId) {
        console.log('📡 收到平台变化通知:', {
          tabId,
          platform: request.platform,
          url: request.url
        });
        
        // 更新缓存
        tabPlatformCache.set(tabId, request.platform);
        
        // 重置该tab的popup设置
        browser.action.setPopup({ tabId, popup: '' });
        
        console.log('💾 已更新tab缓存:', {
          tabId,
          platform: request.platform,
          cacheSize: tabPlatformCache.size
        });
      }
      sendResponse({ success: true });
      return true;
      
    } else if (request.action === "extract") {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, { action: "extract", format: request.format })
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        }
      });
      return true;
      
    } else if (request.action === "detectPlatform") {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, { action: "detectPlatform" })
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        }
      });
      return true;
      
    } else if (request.action === "startDownloadWatch") {
      // 开始监听下载
      currentPlatform = request.platform || 'Unknown';
      startDownloadWatch();
      sendResponse({ success: true, message: '开始监听文件下载' });
      return true;
      
    } else if (request.action === "queryLatestDownload") {
      // 查询最新下载文件
      queryLatestDownload().then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  });

  // 下载检测服务函数
  function setupDownloadDetection() {
    if (browser.downloads) {
      // 监听下载开始
      browser.downloads.onCreated.addListener((downloadItem) => {
        console.log('📥 检测到新下载:', downloadItem.filename);
        
        if (isWaitingForDownload && isRelevantDownload(downloadItem)) {
          console.log('🎯 相关下载文件:', downloadItem.filename);
        }
      });

      // 监听下载状态变化
      browser.downloads.onChanged.addListener((downloadDelta) => {
        if (downloadDelta.state?.current === 'complete') {
          console.log('✅ 下载完成:', downloadDelta.id);
          if (isWaitingForDownload) {
            handleDownloadComplete(downloadDelta.id);
          }
        } else if (downloadDelta.state?.current === 'interrupted') {
          console.log('❌ 下载中断:', downloadDelta.id);
        }
      });

      console.log('📥 下载检测服务已启动');
    }
  }

  function startDownloadWatch() {
    isWaitingForDownload = true;
    console.log(`🔍 开始监听 ${currentPlatform} 平台的文件下载`);
    
    // 设置30秒超时
    if (downloadWaitTimeout) {
      clearTimeout(downloadWaitTimeout);
    }
    
    downloadWaitTimeout = setTimeout(() => {
      isWaitingForDownload = false;
      console.log('⏰ 下载监听超时');
    }, 30000);
  }

  async function queryLatestDownload() {
    try {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      const downloads = await browser.downloads.search({
        orderBy: ['-startTime'],
        limit: 10
      });

      console.log(`🔍 查询到 ${downloads.length} 个下载项`);

      // 根据平台查找相关文件
      for (const download of downloads) {
        if (download.filename && 
            download.state === 'complete' &&
            new Date(download.startTime).getTime() > fiveMinutesAgo &&
            isRelevantDownload(download)) {
          
          console.log(`✅ 找到匹配文件: ${download.filename}`);
          return {
            success: true,
            download: download,
            filename: download.filename,
            size: download.fileSize || 0
          };
        }
      }

      return {
        success: false,
        message: '未找到相关的下载文件'
      };
    } catch (error: any) {
      console.error('查询下载失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  function isRelevantDownload(downloadItem: any): boolean {
    const filename = downloadItem.filename?.toLowerCase() || '';
    const url = downloadItem.url?.toLowerCase() || '';
    
    // 根据平台判断相关文件
    switch (currentPlatform) {
      case 'Kimi':
        return (
          filename.endsWith('.docx') ||
          filename.includes('kimi') ||
          filename.includes('论文') ||
          filename.includes('总结') ||
          url.includes('kimi') ||
          url.includes('moonshot') ||
          downloadItem.mime?.includes('wordprocessingml')
        );
        
      case 'ChatGPT':
      case 'Claude':
      case 'Poe':
      case 'Gemini':
        return (
          filename.endsWith('.md') ||
          filename.endsWith('.txt') ||
          filename.includes('conversation') ||
          filename.includes('chat') ||
          filename.includes('export') ||
          filename.includes('gemini')
        );
        
      default:
        // 通用文件类型
        return (
          filename.endsWith('.md') ||
          filename.endsWith('.txt') ||
          filename.endsWith('.docx') ||
          filename.includes('export') ||
          filename.includes('download')
        );
    }
  }

  async function handleDownloadComplete(downloadId: number) {
    try {
      const downloads = await browser.downloads.search({ id: downloadId });
      const downloadItem = downloads[0];
      
      if (!downloadItem) {
        console.error('下载项不存在:', downloadId);
        return;
      }

      if (isRelevantDownload(downloadItem)) {
        console.log('🎯 相关文件下载完成:', downloadItem.filename);
        
        // 停止监听
        isWaitingForDownload = false;
        if (downloadWaitTimeout) {
          clearTimeout(downloadWaitTimeout);
          downloadWaitTimeout = null;
        }
        
        // 文件下载完成，直接跳转到processor页面
        await handleFileDownloadComplete(downloadItem);
      }
    } catch (error: any) {
      console.error('处理下载完成失败:', error);
    }
  }

  async function handleFileDownloadComplete(downloadItem: any) {
    try {
      console.log('✅ 文件下载完成:', downloadItem.filename);
      console.log('📋 文件路径:', downloadItem.filename);
      
      // 直接跳转到processor页面
      const processorTab = await browser.tabs.create({ 
        url: 'http://localhost:3000/processor',
        active: true 
      });
      
      console.log('🌐 已跳转到processor页面');
      
      // 通知popup文件处理完成
      browser.runtime.sendMessage({
        action: 'fileDownloadComplete',
        success: true,
        filename: downloadItem.filename,
        filePath: downloadItem.filename,
        platform: currentPlatform
      });
      
    } catch (error: any) {
      console.error('❌ 处理文件下载完成失败:', error);
      
      browser.runtime.sendMessage({
        action: 'fileDownloadComplete',
        success: false,
        error: error.message
      });
    }
  }
});
