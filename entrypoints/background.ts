import { RestFileTransfer } from './automation/rest-file-transfer';

export default defineBackground(() => {
  const SUPPORTED_URLS = ['chatgpt.com', 'claude.ai', 'poe.com', 'kimi.com', 'kimi.moonshot.cn', 'www.kimi.com'];
  
  // 全局下载检测服务
  let isWaitingForDownload = false;
  let downloadWaitTimeout: NodeJS.Timeout | null = null;
  let currentPlatform: string = 'Unknown';
  
  // 初始化下载监听器
  setupDownloadDetection();

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      if (SUPPORTED_URLS.some(url => tab.url!.includes(url))) {
        browser.action.enable(tabId);
      } else {
        browser.action.disable(tabId);
      }
    }
  });

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
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
        return (
          filename.endsWith('.md') ||
          filename.endsWith('.txt') ||
          filename.includes('conversation') ||
          filename.includes('chat') ||
          filename.includes('export')
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
        
        // 上传文件到REST API
        await uploadFileToRest(downloadItem);
      }
    } catch (error: any) {
      console.error('处理下载完成失败:', error);
    }
  }

  async function uploadFileToRest(downloadItem: any) {
    try {
      console.log('📤 开始上传文件到REST API:', downloadItem.filename);
      console.log('📋 下载项详情:', downloadItem);
      
      const transfer = new RestFileTransfer();
      
      // 创建模拟文件对象（浏览器扩展无法直接读取下载文件）
      const simulatedContent = `文件信息:\n文件名: ${downloadItem.filename}\n下载时间: ${new Date().toISOString()}\n平台: ${currentPlatform}`;
      const file = new File([simulatedContent], downloadItem.filename, {
        type: downloadItem.mime || 'application/octet-stream'
      });
      
      const result = await transfer.startTransfer(file, currentPlatform, (progress) => {
        console.log(`上传进度: ${Math.round(progress)}%`);
      });
      
      if (result.success && result.redirectUrl) {
        console.log('✅ 文件上传成功，准备跳转:', result.redirectUrl);
        
        // 通知popup跳转
        browser.runtime.sendMessage({
          action: 'fileUploadComplete',
          success: true,
          redirectUrl: result.redirectUrl,
          filename: downloadItem.filename
        });
      } else {
        console.error('❌ 文件上传失败:', result.error);
      }
      
    } catch (error: any) {
      console.error('❌ 上传过程失败:', error);
      
      browser.runtime.sendMessage({
        action: 'fileUploadComplete',
        success: false,
        error: error.message
      });
    }
  }
});
