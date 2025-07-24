import { useState, useEffect } from 'react';
import './App.css';
import { 
  PLATFORM_CONFIGS, 
  getButtonConfig, 
  getPlatformSpecificHelp,
  type Platform, 
  type ButtonState 
} from './platform-config';
import { RestFileTransfer } from '../automation/rest-file-transfer';

interface LogEntry {
  timestamp: string;
  message: string;
}

function App() {
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('Unknown');
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [debugLog, setDebugLog] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const log = (message: string) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message
    };
    setDebugLog(prev => [...prev, logEntry]);
  };

  const clearLogs = () => {
    setDebugLog([]);
  };

  const detectCurrentPlatform = async (): Promise<Platform> => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const response = await browser.tabs.sendMessage(tabs[0].id!, {
          action: 'detectPlatform'
        });
        return response?.platform || 'Unknown';
      }
      return 'Unknown';
    } catch (error) {
      console.error('Platform detection failed:', error);
      return 'Unknown';
    }
  };

  const initializePopup = async () => {
    log('初始化扩展...');
    
    // 检测当前平台
    const platform = await detectCurrentPlatform();
    setCurrentPlatform(platform);
    
    // 显示平台信息
    const config = PLATFORM_CONFIGS[platform];
    log(`当前平台: ${platform} ${config.icon}`);
    
    if (platform === 'Unknown') {
      log('请在ChatGPT、Claude、Poe或Kimi页面使用此扩展');
    } else {
      log(`准备执行: ${config.description}`);
    }
    
    setIsInitialized(true);
  };

  const sendMessageToContentScript = async (message: any) => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      throw new Error('No active tab found');
    }
    
    return await browser.tabs.sendMessage(tabs[0].id!, message);
  };

  const performDirectExtraction = async (platform: Platform, format: string) => {
    log(`开始从${platform}提取对话...`);
    log(`使用格式: ${format.toUpperCase()}`);
    
    const response = await sendMessageToContentScript({
      action: 'extract',
      format
    });
    
    return handleDirectExtractionResponse(response);
  };

  const performKimiAutomation = async () => {
    log('🚀 启动Kimi自动化流程...');
    
    const response = await sendMessageToContentScript({
      action: 'extract',
      format: 'automation'
    });
    
    return handleKimiAutomationResponse(response);
  };

  const performPlatformDetection = async () => {
    log('检测当前平台...');
    
    const response = await sendMessageToContentScript({
      action: 'detectPlatform'
    });
    
    if (response.platform !== 'Unknown') {
      setCurrentPlatform(response.platform);
      log(`检测到平台: ${response.platform}`);
    } else {
      log('未识别的平台，请确保在支持的AI聊天页面使用');
    }
  };

  // 文件上传进度处理
  const handleFileUpload = async (fileData: any, platform: string) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // 检查是否需要等待下载检测
      if (fileData.needsDownloadDetection) {
        log('🔍 等待后台服务检测文件下载...');
        log('💡 请手动点击下载按钮开始下载文件');
        
        // 显示模拟进度，等待后台检测
        for (let i = 0; i <= 80; i += 2) {
          setProgress(i);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // 保持在80%等待后台完成
        log('⏳ 正在等待文件下载完成...');
        return; // 让后台服务处理剩余流程
      }
      
      const transfer = new RestFileTransfer();
      
      let file: File;
      
      if (fileData.file) {
        // 已经是File对象，直接使用
        file = fileData.file;
        log(`📁 使用下载的文件: ${file.name}`);
      } else if (fileData.content) {
        // 直接提取的内容，创建文件
        file = new File([fileData.content], fileData.filename, { 
          type: fileData.type 
        });
      } else if (fileData.needsFilePickup) {
        // Kimi下载的文件，已经找到但需要特殊处理
        if (fileData.downloadPath) {
          log(`📁 检测到下载文件: ${fileData.filename}`);
          log(`📤 准备上传文件 (${fileData.size} bytes)...`);
          
          // 创建一个模拟的File对象
          // 注意：这里无法直接读取用户下载文件夹的文件内容
          // 实际项目中需要用户手动选择文件或使用其他方法
          const simulatedContent = `Kimi导出文件: ${fileData.filename}\n时间: ${new Date().toISOString()}`;
          file = new File([simulatedContent], fileData.filename, { 
            type: fileData.type 
          });
          
          log('⚠️ 注意：当前使用模拟文件内容进行上传测试');
        } else {
          if (fileData.downloadError) {
            log(`⚠️ 下载监听失败: ${fileData.downloadError}`);
          }
          log('📁 请手动点击下载按钮并重试...');
          throw new Error('自动下载失败，请手动下载文件后重试');
        }
      } else {
        throw new Error('无效的文件数据');
      }
      
      log(`📤 开始上传文件: ${file.name}`);
      
      const result = await transfer.startTransfer(file, platform, (progress) => {
        setProgress(progress);
        if (progress % 20 === 0) { // 每20%记录一次日志
          log(`上传进度: ${Math.round(progress)}%`);
        }
      });
      
      if (result.success && result.redirectUrl) {
        setProgress(100);
        log('✅ 文件上传完成！');
        log('🌐 正在跳转到解析网站...');
        
        setTimeout(() => {
          window.open(result.redirectUrl!, '_blank');
          setIsProcessing(false);
          setProgress(0);
        }, 500);
      } else {
        throw new Error(result.error || '上传失败');
      }
      
    } catch (error: any) {
      log(`❌ 上传失败: ${error.message}`);
      setIsProcessing(false);
      setProgress(0);
      throw error;
    }
  };

  const handleOneClickAction = async () => {
    const config = PLATFORM_CONFIGS[currentPlatform];
    
    setButtonState('processing');
    clearLogs();
    log(`执行${config.description}...`);

    try {
      // 启动后台下载监听服务
      await browser.runtime.sendMessage({
        action: 'startDownloadWatch',
        platform: currentPlatform
      });
      
      let response;
      
      switch (config.action) {
        case 'extract':
          response = await performDirectExtraction(currentPlatform, config.format!);
          break;
          
        case 'automate':
          response = await performKimiAutomation();
          break;
          
        case 'detect':
          await performPlatformDetection();
          setButtonState('success');
          return;
      }
      
      // 处理文件上传
      if (response && response.fileData) {
        await handleFileUpload(response.fileData, currentPlatform);
      }
      
      setButtonState('success');
    } catch (error: any) {
      setButtonState('error');
      setIsProcessing(false);
      setProgress(0);
      handleError(error);
    }
  };

  const handleError = (error: any) => {
    log(`❌ 操作失败: ${error.message || '未知错误'}`);
    
    // 显示平台特定的帮助信息
    const help = getPlatformSpecificHelp(currentPlatform);
    log(`💡 ${help}`);
    
    // Kimi特殊错误处理
    if (currentPlatform === 'Kimi' && error.userGuidance) {
      log(`💡 ${error.userGuidance}`);
    }
  };

  const handleKimiAutomationResponse = (response: any) => {
    // 处理日志
    if (response?.logs) {
      response.logs.forEach((logMessage: string) => log(logMessage));
    }

    if (response?.error) {
      throw new Error(response.error);
    }
    
    return response; // 返回响应数据给主流程处理
  };

  const handleDirectExtractionResponse = (response: any) => {
    // 处理日志
    if (response?.logs) {
      response.logs.forEach((logMessage: string) => log(logMessage));
    }

    if (response?.error) {
      throw new Error(response.error);
    } else if (response) {
      log(`✅ 内容提取完成！发现 ${response.messageCount} 条消息`);
    } else {
      throw new Error('No response from content script');
    }
    
    return response; // 返回响应数据给主流程处理
  };

  const copyDebugLog = async () => {
    const logText = debugLog.map(entry => `${entry.timestamp}: ${entry.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      log('Debug log copied to clipboard.');
    } catch (error) {
      log(`Failed to copy debug log: ${error}`);
    }
  };

  const handleButtonClick = () => {
    if (buttonState === 'error' || buttonState === 'success') {
      // 重试逻辑
      setButtonState('idle');
      setTimeout(handleOneClickAction, 100);
    } else if (buttonState === 'idle') {
      handleOneClickAction();
    }
  };

  useEffect(() => {
    initializePopup();
    
    // 监听来自background script的消息
    const messageListener = (message: any) => {
      if (message.action === 'fileUploadComplete') {
        if (message.success) {
          log('✅ 文件自动上传完成！');
          log('🌐 正在跳转到解析网站...');
          
          setTimeout(() => {
            window.open(message.redirectUrl, '_blank');
            setIsProcessing(false);
            setProgress(0);
            setButtonState('success');
          }, 500);
        } else {
          log(`❌ 自动上传失败: ${message.error}`);
          setIsProcessing(false);
          setProgress(0);
          setButtonState('error');
        }
      }
    };
    
    browser.runtime.onMessage.addListener(messageListener);
    
    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="popup-container">
        <div className="loading">
          <span>🔍</span>
          <p>检测平台中...</p>
        </div>
      </div>
    );
  }

  const config = PLATFORM_CONFIGS[currentPlatform];
  const buttonConfig = getButtonConfig(currentPlatform, buttonState);

  // 如果正在处理，显示进度条界面
  if (isProcessing) {
    return (
      <div className="popup-container">
        <div className="progress-container">
          <div className="progress-icon">💾</div>
          <div className="progress-text">上传中... {Math.round(progress)}%</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      {/* 平台信息显示 */}
      <div className="platform-header">
        <span className="platform-icon">{config.icon}</span>
        <div className="platform-info">
          <h2>{currentPlatform}</h2>
          <p>{config.description}</p>
        </div>
      </div>

      {/* 一键操作按钮 */}
      <button 
        className={`main-action-btn ${buttonConfig.className}`}
        onClick={handleButtonClick}
        disabled={buttonConfig.disabled && buttonState === 'processing'}
      >
        {buttonState === 'processing' && <span className="loading-spinner">⏳</span>}
        {buttonConfig.text}
      </button>

      {/* 状态日志区域 - 只显示最近5条 */}
      <div className="log-area">
        {debugLog.slice(-5).map((entry, index) => (
          <div key={index} className="log-entry">
            <span className="log-time">{entry.timestamp}</span>
            <span className="log-message">{entry.message}</span>
          </div>
        ))}
      </div>

      {/* 注释掉复制日志按钮，保留代码
      {debugLog.length > 0 && (
        <button 
          onClick={copyDebugLog}
          className="secondary-btn copy-btn"
        >
          📋 复制日志
        </button>
      )}
      */}
    </div>
  );
}

export default App;
