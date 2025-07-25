import { useState, useEffect } from 'react';
import './App.css';
import { 
  PLATFORM_CONFIGS, 
  getButtonConfig, 
  getPlatformSpecificHelp,
  type Platform, 
  type ButtonState 
} from './platform-config';
import { AuthManager, type UserInfo } from '../utils/auth-manager';

interface LogEntry {
  timestamp: string;
  message: string;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

function App() {
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('Unknown');
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [debugLog, setDebugLog] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 认证相关状态
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);

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

  // 检查认证状态
  const checkAuthStatus = async () => {
    try {
      log('检查认证状态...');
      const status = await AuthManager.checkAuthStatus();
      
      if (status === 'authenticated') {
        const authData = await AuthManager.getAuthData();
        setAuthState('authenticated');
        setUserInfo(authData.userInfo);
        log(`已认证用户: ${authData.userInfo?.name}`);
      } else {
        setAuthState('unauthenticated');
        log('用户未认证');
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setAuthState('unauthenticated');
      handleAuthError(error, '认证状态检查');
    }
  };

  const initializePopup = async () => {
    log('初始化扩展...');
    
    // 首先检查认证状态
    await checkAuthStatus();
    
    // 检测当前平台
    const platform = await detectCurrentPlatform();
    setCurrentPlatform(platform);
    
    // 显示平台信息
    const config = PLATFORM_CONFIGS[platform];
    log(`当前平台: ${platform} ${config.icon}`);
    
    if (platform === 'Unknown') {
      log('请在ChatGPT、Claude、Poe或Kimi页面使用此扩展');
    } else if (authState === 'authenticated') {
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

  // 处理登录跳转 - 简化为纯网页登录
  const handleLoginRedirect = async () => {
    try {
      log('🔐 跳转到网页登录...');
      
      // 直接跳转到网页登录
      chrome.tabs.create({ 
        url: 'http://localhost:3000/login?from=extension',
        active: true 
      });
      
      // 关闭当前popup
      window.close();
      
    } catch (error) {
      console.error('Login redirect failed:', error);
      handleAuthError(error, '登录跳转');
    }
  };


  // 修改后的文件处理逻辑（发送数据到processor页面）
  const handleFileUpload = async (fileData: any, platform: string) => {
    if (authState !== 'authenticated') {
      handleLoginRedirect();
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      log('📁 准备文件数据...');
      
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
      
      setProgress(30);
      log('📝 格式化文件内容...');
      
      // 准备文件数据
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${platform}-conversations-${timestamp}.md`;
      const content = fileData.content || fileData;
      
      setProgress(60);
      log('🌐 打开processor页面...');
      
      // 先打开processor页面
      const processorTab = await chrome.tabs.create({ 
        url: 'http://localhost:3000/processor',
        active: true 
      });
      
      setProgress(80);
      log('📨 发送文件数据到processor...');
      
      // 使用重试机制发送数据
      const sendWithRetry = async (retryCount = 0) => {
        const maxRetries = 3;
        const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
        
        setTimeout(async () => {
          try {
            log(`📤 尝试发送数据 (第${retryCount + 1}次)...`);
            
            const result = await chrome.scripting.executeScript({
              target: { tabId: processorTab.id! },
              function: (data, attempt) => {
                console.log(`Extension: 第${attempt}次尝试发送postMessage`, data);
                console.log('Extension: 页面状态:', {
                  readyState: document.readyState,
                  url: window.location.href,
                  hasReact: !!window.React,
                  bodyContent: document.body ? document.body.innerHTML.length : 0,
                  hasMessageListener: window.hasMessageListener || false
                });
                
                // 等待页面完全加载后再发送
                const sendAfterLoad = () => {
                  // 发送postMessage
                  console.log('Extension: 准备发送postMessage...');
                  window.postMessage({
                    type: 'PLUGIN_FILE_DATA',
                    content: data.content,
                    filename: data.filename,
                    platform: data.platform
                  }, '*');
                  
                  console.log('Extension: postMessage已发送');
                  
                  // 同时设置到window对象，作为备用方案
                  window.extensionFileData = {
                    type: 'PLUGIN_FILE_DATA',
                    content: data.content,
                    filename: data.filename,
                    platform: data.platform
                  };
                  console.log('Extension: 数据已设置到window.extensionFileData');
                  
                  // 触发自定义事件作为第三种备用方案
                  try {
                    const customEvent = new CustomEvent('extensionFileData', {
                      detail: {
                        type: 'PLUGIN_FILE_DATA',
                        content: data.content,
                        filename: data.filename,
                        platform: data.platform
                      }
                    });
                    window.dispatchEvent(customEvent);
                    console.log('Extension: 自定义事件已触发');
                  } catch (e) {
                    console.log('Extension: 自定义事件触发失败', e);
                  }
                  
                  return `成功发送 (尝试${attempt})`;
                };
                
                // 如果页面未完全加载，等待加载完成
                if (document.readyState !== 'complete') {
                  console.log('Extension: 页面未完全加载，等待...');
                  window.addEventListener('load', () => {
                    setTimeout(sendAfterLoad, 1000);
                  });
                  return `等待页面加载 (尝试${attempt})`;
                } else {
                  // 页面已加载，稍微延迟后发送（给React组件时间初始化）
                  setTimeout(sendAfterLoad, 500);
                  return `页面已加载，延迟发送 (尝试${attempt})`;
                }
              },
              args: [{ content, filename, platform }, retryCount + 1]
            });
            
            log(`✅ 第${retryCount + 1}次发送成功！`);
            log(`📝 返回: ${result[0].result}`);
            
          } catch (error) {
            console.error(`第${retryCount + 1}次发送失败:`, error);
            log(`❌ 第${retryCount + 1}次失败: ${error}`);
            
            if (retryCount < maxRetries - 1) {
              log(`🔄 将在${(retryCount + 2) * 2}秒后重试...`);
              sendWithRetry(retryCount + 1);
            } else {
              log('❌ 所有重试都失败了，请手动刷新processor页面');
            }
          }
        }, delay);
      };
      
      // 开始发送
      sendWithRetry();
      
      setProgress(100);
      log('🎉 操作完成！');
      
      // 关闭popup
      setTimeout(() => {
        window.close();
      }, 1000);
      
    } catch (error: any) {
      log(`❌ 操作失败: ${error.message}`);
      setIsProcessing(false);
      setProgress(0);
      setButtonState('error');
      throw error;
    }
  };

  const handleOneClickAction = async () => {
    // 检查认证状态
    if (authState !== 'authenticated') {
      handleLoginRedirect();
      return;
    }
    
    const config = PLATFORM_CONFIGS[currentPlatform];
    
    setButtonState('processing');
    clearLogs();
    log(`执行${config.description}...`);

    try {
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
      
      // 处理文件上传或跳转
      if (response && response.fileData) {
        await handleFileUpload(response.fileData, currentPlatform);
      } else if (response && response.automationMode && response.success) {
        // Kimi自动化成功，直接跳转到processor页面
        log('🎉 Kimi自动化完成，跳转到processor页面...');
        await chrome.tabs.create({ 
          url: 'http://localhost:3000/processor',
          active: true 
        });
        
        // 关闭popup
        setTimeout(() => {
          window.close();
        }, 500);
      }
      
      setButtonState('success');
    } catch (error: any) {
      setButtonState('error');
      setIsProcessing(false);
      setProgress(0);
      handleError(error);
    }
  };

  // 认证错误处理
  const handleAuthError = (error: any, context: string) => {
    console.error(`Auth error in ${context}:`, error);
    
    let userMessage = '';
    if (error.message?.includes('network')) {
      userMessage = '网络连接失败，请检查网络后重试';
    } else if (error.message?.includes('token')) {
      userMessage = '认证令牌无效，请重新登录';
    } else if (error.message?.includes('permission')) {
      userMessage = '权限不足，请联系管理员';
    } else {
      userMessage = `${context}失败，请重试`;
    }
    
    setErrorMessage(userMessage);
    log(`❌ ${userMessage}`);
    
    // 自动清除错误消息
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // 重试机制
  const handleRetry = async () => {
    if (retryCount >= 3) {
      setErrorMessage('重试次数过多，请稍后再试');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setErrorMessage('');
    await checkAuthStatus();
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
    if (authState === 'unauthenticated') {
      handleLoginRedirect();
      return;
    }
    
    if (buttonState === 'error' || buttonState === 'success') {
      // 重试逻辑
      setButtonState('idle');
      setTimeout(handleOneClickAction, 100);
    } else if (buttonState === 'idle') {
      handleOneClickAction();
    }
  };

  // 登出处理
  const handleLogout = async () => {
    try {
      await AuthManager.logout();
      setAuthState('unauthenticated');
      setUserInfo(null);
      log('🔓 已登出');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    initializePopup();
    
    // 监听来自background script的消息
    const messageListener = (message: any) => {
      if (message.action === 'fileUploadComplete') {
        // 处理下载检测完成的情况，发送到processor页面
        if (message.success) {
          log('✅ 文件检测完成！');
          log('🌐 正在跳转到processor页面...');
          
          // 跳转到processor页面
          chrome.tabs.create({ 
            url: 'http://localhost:3000/processor',
            active: true 
          }).then((tab) => {
            // 如果后台服务提供了文件数据，发送给processor
            if (message.fileData) {
              setTimeout(async () => {
                try {
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const filename = `${currentPlatform}-conversations-${timestamp}.md`;
                  
                  await chrome.scripting.executeScript({
                    target: { tabId: tab.id! },
                    function: (data) => {
                      window.postMessage({
                        type: 'PLUGIN_FILE_DATA',
                        content: data.content,
                        filename: data.filename,
                        platform: data.platform
                      }, '*');
                    },
                    args: [{ 
                      content: message.fileData, 
                      filename, 
                      platform: currentPlatform 
                    }]
                  });
                  
                  log('✅ 文件数据发送成功！');
                } catch (error) {
                  console.error('Failed to send file data:', error);
                  log('❌ 文件数据发送失败，请手动上传文件');
                }
              }, 2000);
            }
          });
          
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          log(`❌ 文件检测失败: ${message.error}`);
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

  // 错误显示组件
  const ErrorDisplay = ({ error, onRetry }: { error: string, onRetry: () => void }) => (
    <div className="error-container">
      <div className="error-message">{error}</div>
      <button className="retry-btn" onClick={onRetry}>
        重试 ({retryCount}/3)
      </button>
    </div>
  );

  // 认证状态UI渲染
  const renderAuthUI = () => {
    if (authState === 'loading') {
      return (
        <div className="auth-loading">
          <span>🔍</span>
          <p>检查登录状态...</p>
        </div>
      );
    }
    
    if (authState === 'unauthenticated') {
      return (
        <div className="auth-required">
          <div className="auth-message">
            <span className="auth-icon">🔒</span>
            <h3>请先登录再使用插件</h3>
            <p>需要在网页版登录后才能使用文件提取和上传功能</p>
            <div className="auth-actions">
              <button 
                className="login-btn"
                onClick={handleLoginRedirect}
              >
                🌐 前往网页登录
              </button>
              <button 
                className="refresh-btn"
                onClick={handleRetry}
                disabled={retryCount >= 3}
              >
                🔄 刷新状态 ({retryCount}/3)
              </button>
            </div>
            {errorMessage && <ErrorDisplay error={errorMessage} onRetry={handleRetry} />}
          </div>
        </div>
      );
    }
    
    // 已认证状态 - 显示用户信息和操作界面
    return (
      <div className="authenticated">
        <div className="user-info">
          <img src={userInfo?.avatar} alt="avatar" className="user-avatar" />
          <div className="user-details">
            <span className="user-name">{userInfo?.name}</span>
            <span className="user-email">{userInfo?.email}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="登出">
            🚪
          </button>
        </div>
        {renderMainUI()}
      </div>
    );
  };

  // 主要UI渲染
  const renderMainUI = () => {
    const config = PLATFORM_CONFIGS[currentPlatform];
    const buttonConfig = getButtonConfig(currentPlatform, buttonState);

    return (
      <>
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
      </>
    );
  };

  if (!isInitialized) {
    return (
      <div className="popup-container">
        <div className="loading">
          <span>🔍</span>
          <p>初始化中...</p>
        </div>
      </div>
    );
  }

  // 如果正在处理，显示进度条界面
  if (isProcessing) {
    return (
      <div className="popup-container">
        <div className="progress-container">
          <div className="progress-icon">💾</div>
          <div className="progress-text">准备中... {Math.round(progress)}%</div>
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
      {renderAuthUI()}
    </div>
  );
}

export default App;
