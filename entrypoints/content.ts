import { htmlToMarkdown, formatMarkdownMetadata, formatMarkdownMessage, downloadMarkdown } from './export/markdown';
import { simplifyHtml, formatHtmlMetadata, formatHtmlMessage, downloadHtml } from './export/html';
import { htmlToPlaintext, formatPlaintextMetadata, formatPlaintextMessage, downloadPlaintext } from './export/text';
import { extractChatGPTConversation } from './llm/chatgpt';
import { extractClaudeConversation } from './llm/claude';
import { extractPoeConversation } from './llm/poe';
import { KimiAutomation } from './llm/kimi';
import { detectPlatform, type Platform } from './llm/platform';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://claude.ai/*', 
    '*://poe.com/*',
    '*://kimi.moonshot.cn/*',
    '*://kimi.com/*',
    '*://www.kimi.com/*'
  ],
  main() {
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
          
          // 创建文件并上传到REST API
          const filename = `${platform}_conversation_${new Date().getTime()}.md`;
          const file = new File([content], filename, { type: 'text/markdown' });
          
          // 通过消息传递到popup处理文件上传
          return { 
            platform, 
            messageCount: messages.length, 
            downloadInitiated: true,
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
