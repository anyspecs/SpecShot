import { useState, useEffect } from "react";
import "./App.css";
import {
  PLATFORM_CONFIGS,
  getButtonConfig,
  getPlatformSpecificHelp,
  type Platform,
  type ButtonState,
} from "./platform-config";
import { DEV_CONFIG, devLog } from "../config/dev-config";
// 移除AuthManager import，不再需要认证功能

interface LogEntry {
  timestamp: string;
  message: string;
}

// 移除AuthState类型定义

function App() {
  const [currentPlatform, setCurrentPlatform] = useState<Platform>("Unknown");
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [debugLog, setDebugLog] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'html' | 'text'>('markdown');

  // 移除认证相关状态

  const log = (message: string) => {
    if (!DEV_CONFIG.showDebugLogs) return; // 开发者配置控制
    
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
    };
    setDebugLog((prev) => [...prev, logEntry]);
  };

  const clearLogs = () => {
    if (!DEV_CONFIG.showDebugLogs) return; // 开发者配置控制
    setDebugLog([]);
  };

  const detectCurrentPlatform = async (): Promise<Platform> => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        const response = await browser.tabs.sendMessage(tabs[0].id!, {
          action: "detectPlatform",
        });
        return response?.platform || "Unknown";
      }
      return "Unknown";
    } catch (error) {
      console.error("Platform detection failed:", error);
      return "Unknown";
    }
  };

  // 移除认证状态检查

  const initializePopup = async () => {
    log("初始化扩展...");

    // 检测当前平台
    const platform = await detectCurrentPlatform();
    setCurrentPlatform(platform);

    // 显示平台信息
    const config = PLATFORM_CONFIGS[platform];
    log(`当前平台: ${platform} ${config.icon}`);

    if (platform === "Unknown") {
      log("请在ChatGPT、Claude、Poe或Kimi页面使用此扩展");
    } else {
      log(`准备执行: ${config.description}`);
    }

    setIsInitialized(true);
  };

  const sendMessageToContentScript = async (message: any) => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tabs[0]) {
      throw new Error("No active tab found");
    }

    return await browser.tabs.sendMessage(tabs[0].id!, message);
  };

  const performDirectExtraction = async (
    platform: Platform,
    format: string
  ) => {
    log(`开始从${platform}提取对话...`);
    log(`使用格式: ${format.toUpperCase()}`);

    const response = await sendMessageToContentScript({
      action: "extract",
      format,
    });

    return handleDirectExtractionResponse(response);
  };

  const performKimiAutomation = async () => {
    log("🚀 启动Kimi自动化流程...");

    const response = await sendMessageToContentScript({
      action: "extract",
      format: "automation",
    });

    return handleKimiAutomationResponse(response);
  };

  const performPlatformDetection = async () => {
    log("检测当前平台...");

    const response = await sendMessageToContentScript({
      action: "detectPlatform",
    });

    if (response.platform !== "Unknown") {
      setCurrentPlatform(response.platform);
      log(`检测到平台: ${response.platform}`);
    } else {
      log("未识别的平台，请确保在支持的AI聊天页面使用");
    }
  };

  // 移除登录跳转逻辑

  // 简化的文件处理逻辑（仅下载功能）
  const handleFileDownload = async (fileData: any, platform: string) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      log("📁 准备文件下载...");
      setProgress(30);
      
      // 准备文件数据
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const extensions = { markdown: 'md', html: 'html', text: 'txt' };
      const mimeTypes = { 
        markdown: 'text/markdown', 
        html: 'text/html', 
        text: 'text/plain' 
      };
      
      const filename = `${platform}-conversations-${timestamp}.${extensions[selectedFormat]}`;
      const content = fileData.content || fileData;

      setProgress(60);
      log(`📝 准备下载${selectedFormat.toUpperCase()}文件...`);

      // 直接触发文件下载
      const blob = new Blob([content], { type: mimeTypes[selectedFormat] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      log("✅ 文件下载完成！");

      // 关闭popup
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error: any) {
      log(`❌ 下载失败: ${error.message}`);
      setIsProcessing(false);
      setProgress(0);
      setButtonState("error");
      throw error;
    }
  };

  const handleOneClickAction = async () => {
    // 恢复原有的一键操作逻辑，但跳过认证检查
    const config = PLATFORM_CONFIGS[currentPlatform];

    setButtonState("processing");
    clearLogs();
    log(`执行${config.description}...`);

    try {
      let response;

      switch (config.action) {
        case "extract":
          response = await performDirectExtraction(
            currentPlatform,
            selectedFormat
          );
          break;

        case "automate":
          response = await performKimiAutomation();
          break;

        case "detect":
          await performPlatformDetection();
          setButtonState("success");
          return;
      }

      // 处理文件下载
      if (response && response.fileData) {
        await handleFileDownload(response.fileData, currentPlatform);
      }

      setButtonState("success");
    } catch (error: any) {
      setButtonState("error");
      setIsProcessing(false);
      setProgress(0);
      handleError(error);
    }
  };

  // 移除认证错误处理

  // 移除重试机制

  const handleError = (error: any) => {
    log(`❌ 操作失败: ${error.message || "未知错误"}`);

    // 显示平台特定的帮助信息
    const help = getPlatformSpecificHelp(currentPlatform);
    log(`💡 ${help}`);

    // Kimi特殊错误处理
    if (currentPlatform === "Kimi" && error.userGuidance) {
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
      throw new Error("No response from content script");
    }

    return response; // 返回响应数据给主流程处理
  };

  const copyDebugLog = async () => {
    const logText = debugLog
      .map((entry) => `${entry.timestamp}: ${entry.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(logText);
      log("Debug log copied to clipboard.");
    } catch (error) {
      log(`Failed to copy debug log: ${error}`);
    }
  };

  const handleButtonClick = () => {
    // 恢复原有的按钮点击逻辑，但移除认证检查
    if (buttonState === "error" || buttonState === "success") {
      // 重试逻辑
      setButtonState("idle");
      setTimeout(handleOneClickAction, 100);
    } else if (buttonState === "idle") {
      handleOneClickAction();
    }
  };

  // 移除登出处理

  useEffect(() => {
    initializePopup();

    // 监听来自background script的消息（简化版本）
    const messageListener = (message: any) => {
      if (message.action === "fileDownloadComplete") {
        if (message.success) {
          log("✅ 文件下载完成！");
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          log(`❌ 文件下载失败: ${message.error}`);
          setIsProcessing(false);
          setProgress(0);
          setButtonState("error");
        }
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, []);


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
          disabled={buttonConfig.disabled && buttonState === "processing"}
        >
          {buttonState === "processing" && (
            <span className="loading-spinner">⏳</span>
          )}
          {buttonConfig.text}
        </button>

        {/* 导出格式选择 */}
        <div className="format-selection">
          <h3>选择导出格式</h3>
          <div className="format-options">
            <label className={`format-option ${selectedFormat === 'markdown' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="markdown"
                checked={selectedFormat === 'markdown'}
                onChange={(e) => setSelectedFormat(e.target.value as 'markdown' | 'html' | 'text')}
              />
              <span className="format-icon">📝</span>
              <span className="format-name">Markdown</span>
              <span className="format-desc">适合技术文档</span>
            </label>
            
            <label className={`format-option ${selectedFormat === 'html' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="html"
                checked={selectedFormat === 'html'}
                onChange={(e) => setSelectedFormat(e.target.value as 'markdown' | 'html' | 'text')}
              />
              <span className="format-icon">🌐</span>
              <span className="format-name">HTML</span>
              <span className="format-desc">保留完整格式</span>
            </label>
            
            <label className={`format-option ${selectedFormat === 'text' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="text"
                checked={selectedFormat === 'text'}
                onChange={(e) => setSelectedFormat(e.target.value as 'markdown' | 'html' | 'text')}
              />
              <span className="format-icon">📄</span>
              <span className="format-name">Plain Text</span>
              <span className="format-desc">纯文本格式</span>
            </label>
          </div>
        </div>

        {/* 状态日志区域 - 只在开发者模式下显示 */}
        {DEV_CONFIG.showDebugLogs && (
          <div className="log-area">
            {debugLog.slice(-3).map((entry, index) => (
              <div key={index} className="log-entry">
                <span className="log-time">{entry.timestamp}</span>
                <span className="log-message">{entry.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* 底部推广链接 */}
        <div className="footer-link">
          <p className="footer-text">
            我们还提供更专业的聊天上下文压缩与分享服务，欢迎了解
          </p>
          <a 
            href="https://hub.anyspecs.cn/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link-button"
          >
            访问 AnySpecs Hub
          </a>
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
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return <div className="popup-container">{renderMainUI()}</div>;
}

export default App;
