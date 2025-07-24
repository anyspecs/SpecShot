import { htmlToMarkdown, formatMarkdownMetadata, formatMarkdownMessage, downloadMarkdown } from './export/markdown';
import { simplifyHtml, formatHtmlMetadata, formatHtmlMessage, downloadHtml } from './export/html';
import { htmlToPlaintext, formatPlaintextMetadata, formatPlaintextMessage, downloadPlaintext } from './export/text';
import { extractChatGPTConversation } from './llm/chatgpt';
import { extractClaudeConversation } from './llm/claude';
import { extractPoeConversation } from './llm/poe';
import { detectPlatform, type Platform } from './llm/platform';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://claude.ai/*', 
    '*://poe.com/*'
  ],
  main() {
    function extractConversation(format: string) {
      const logs: string[] = [];
      const log = (message: string) => {
        console.log(message);
        logs.push(message);
      };

      try {
        const platform = detectPlatform();
        log(`Platform detected: ${platform}`);
        log(`Format selected: ${format}`);
        
        const messages = extractConversationFromPlatform(platform, format);
        
        if (messages.length > 0) {
          const content = formatConversation(platform, messages, format);
          const downloadStatus = downloadConversation(content, format);
          return { platform, messageCount: messages.length, downloadInitiated: true, logs };
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

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "extract") {
        sendResponse(extractConversation(request.format));
      } else if (request.action === "detectPlatform") {
        sendResponse({ platform: detectPlatform() });
      }
      return true;
    });
  },
});
