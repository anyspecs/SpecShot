import { htmlToMarkdown, formatMarkdownMetadata, formatMarkdownMessage, downloadMarkdown } from './export/markdown';
import { simplifyHtml, formatHtmlMetadata, formatHtmlMessage, downloadHtml } from './export/html';
import { htmlToPlaintext, formatPlaintextMetadata, formatPlaintextMessage, downloadPlaintext } from './export/text';
import { extractChatGPTConversation } from './llm/chatgpt';
import { extractClaudeConversation } from './llm/claude';
import { extractPoeConversation } from './llm/poe';
import { extractGeminiConversation } from './llm/gemini';
import { extractDoubaoConversation } from './llm/doubao';
import { KimiAutomation } from './llm/kimi';
import { detectPlatform, type Platform } from './llm/platform';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://claude.ai/*', 
    '*://poe.com/*',
    '*://kimi.moonshot.cn/*',
    '*://kimi.com/*',
    '*://www.kimi.com/*',
    '*://gemini.google.com/*',
    '*://bard.google.com/*',
    '*://doubao.com/*',
    '*://www.doubao.com/*'
  ],
  main() {
    // 初始化时立即检测并记录平台
    let currentPlatform = detectPlatform();
    let lastUrl = window.location.href;
    
    console.log('🚀 Content script初始化:', {
      url: lastUrl,
      platform: currentPlatform,
      timestamp: new Date().toISOString()
    });
    
    // 向background script报告当前平台状态
    const reportPlatformChange = (platform: string) => {
      console.log('📡 向background报告平台变化:', platform);
      try {
        browser.runtime.sendMessage({
          action: 'platformChanged',
          platform: platform,
          url: window.location.href
        }).catch(err => {
          console.log('Background可能还未准备就绪:', err.message);
        });
      } catch (e) {
        console.log('发送平台变化消息失败:', e);
      }
    };
    
    // 初始报告
    reportPlatformChange(currentPlatform);
    
    const checkUrlAndPlatformChange = () => {
      const currentUrl = window.location.href;
      const newPlatform = detectPlatform();
      
      if (currentUrl !== lastUrl || newPlatform !== currentPlatform) {
        console.log('🔄 检测到变化:', {
          urlChanged: currentUrl !== lastUrl,
          platformChanged: newPlatform !== currentPlatform,
          oldUrl: lastUrl,
          newUrl: currentUrl,
          oldPlatform: currentPlatform,
          newPlatform: newPlatform
        });
        
        lastUrl = currentUrl;
        currentPlatform = newPlatform;
        
        // 报告变化
        reportPlatformChange(newPlatform);
      }
    };
    
    // 监听浏览器导航事件
    window.addEventListener('popstate', () => {
      console.log('🔙 PopState事件触发');
      setTimeout(checkUrlAndPlatformChange, 100);
    });
    
    // 监听pushState和replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      console.log('➡️ PushState事件触发');
      setTimeout(checkUrlAndPlatformChange, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      console.log('🔄 ReplaceState事件触发');
      setTimeout(checkUrlAndPlatformChange, 100);
    };
    
    // 使用MutationObserver监听DOM变化（适用于SPA）
    const observer = new MutationObserver(() => {
      checkUrlAndPlatformChange();
    });
    
    // 等待DOM加载完成后开始观察
    if (document.body) {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          observer.observe(document.body, { 
            childList: true, 
            subtree: true 
          });
        }
      });
    }
    
    // 定期检查变化（作为备用方案）
    setInterval(checkUrlAndPlatformChange, 2000);

    async function extractConversation(format: string) {
      const platform = detectPlatform();
      
      // Kimi平台使用自动化操作模式
      if (platform === 'Kimi') {
        return await handleKimiAutomation();
      }
      
      // 其他平台使用直接提取模式
      return handleDirectExtraction(platform, format);
    }

    async function handleKimiAutomation() {
      try {
        const result = await KimiAutomation.performAutomation();
        return {
          platform: 'Kimi',
          automationMode: true,
          success: result.success,
          message: result.message,
          error: result.error,
          userGuidance: result.userGuidance,
          logs: result.logs
        };
      } catch (error: any) {
        return {
          platform: 'Kimi',
          automationMode: true,
          success: false,
          error: `Kimi自动化操作失败: ${error.message}`,
          logs: [`Error: ${error.message}`]
        };
      }
    }

    function handleDirectExtraction(platform: Platform, format: string) {
      const logs: string[] = [];
      const log = (message: string) => {
        console.log(message);
        logs.push(message);
      };

      try {
        log(`Platform detected: ${platform}`);
        log(`Format selected: ${format}`);
        
        const messages = extractConversationFromPlatform(platform, format);
        
        if (messages.length > 0) {
          const content = formatConversation(platform, messages, format);
          
          // 触发文件下载
          const downloadFilename = downloadConversation(content, format);
          log(`文件下载已触发: ${downloadFilename}`);
          
          // 创建文件数据用于后续处理
          const filename = `${platform}_conversation_${new Date().getTime()}.md`;
          const file = new File([content], filename, { type: 'text/markdown' });
          
          // 通过消息传递到popup处理文件上传
          return { 
            platform, 
            messageCount: messages.length, 
            downloadInitiated: true,
            downloadFilename,
            fileData: {
              content,
              filename,
              size: file.size,
              type: file.type
            },
            logs 
          };
        } else {
          return { error: "No messages found in the conversation.", logs };
        }
      } catch (error: any) {
        return { error: `Extraction failed: ${error.message}`, logs };
      }
    }

    function extractConversationFromPlatform(platform: Platform, format: string): [string, string][] {
      const extractContent = (element: Element | null) => {
        if (!element) return '';
        switch (format) {
          case 'markdown':
            return htmlToMarkdown(element.innerHTML);
          case 'html':
            return simplifyHtml(element.innerHTML);
          case 'plaintext':
            return htmlToPlaintext(element.innerHTML);
          default:
            return htmlToMarkdown(element.innerHTML);
        }
      };

      switch (platform) {
        case 'ChatGPT':
          return extractChatGPTConversation(extractContent);
        case 'Claude':
          return extractClaudeConversation(extractContent);
        case 'Poe':
          return extractPoeConversation(extractContent);
        case 'Gemini':
          return extractGeminiConversation(extractContent);
        case 'Doubao':
          return extractDoubaoConversation(extractContent);
        default:
          return [];
      }
    }

    function formatConversation(platform: Platform, messages: [string, string][], format: string): string {
      let content = '';
      
      switch (format) {
        case 'markdown':
          content = formatMarkdownMetadata(window.location.href, platform);
          messages.forEach(([speaker, text]) => {
            content += formatMarkdownMessage(speaker, text);
          });
          break;
        case 'html':
          content = formatHtmlMetadata(window.location.href, platform);
          messages.forEach(([speaker, text]) => {
            content += formatHtmlMessage(speaker, text);
          });
          break;
        case 'plaintext':
          content = formatPlaintextMetadata(window.location.href, platform);
          messages.forEach(([speaker, text]) => {
            content += formatPlaintextMessage(speaker, text);
          });
          break;
      }
      
      return content;
    }

    function downloadConversation(content: string, format: string): string {
      switch (format) {
        case 'markdown':
          return downloadMarkdown(content);
        case 'html':
          return downloadHtml(content);
        case 'plaintext':
          return downloadPlaintext(content);
        default:
          return downloadMarkdown(content);
      }
    }

    browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      if (request.action === "extract") {
        try {
          const result = await extractConversation(request.format);
          sendResponse(result);
        } catch (error: any) {
          sendResponse({ 
            error: `处理失败: ${error.message}`,
            logs: [`Error: ${error.message}`]
          });
        }
      } else if (request.action === "detectPlatform") {
        sendResponse({ platform: detectPlatform() });
      }
      return true;
    });
  },
});
