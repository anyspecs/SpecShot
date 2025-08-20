
import {
  htmlToMarkdown,
  formatMarkdownMetadata,
  formatMarkdownMessage,
  downloadMarkdown,
} from "./export/markdown";
import {
  simplifyHtml,
  formatHtmlMetadata,
  formatHtmlMessage,
  downloadHtml,
} from "./export/html";
import {
  htmlToPlaintext,
  formatPlaintextMetadata,
  formatPlaintextMessage,
  downloadPlaintext,
} from "./export/text";
import {
  extractChatGPTConversation,
  extractChatGPTConversationSync,
  downloadChatGPTImages,
  getChatGPTImageInfo,
} from "./llm/chatgpt";
import {
  extractClaudeConversation,
  extractClaudeConversationSync,
  downloadClaudeImages,
  getClaudeImageInfo,
} from "./llm/claude";
import { extractPoeConversation } from "./llm/poe";
import {
  extractGeminiConversation,
  extractGeminiConversationSync,
  downloadGeminiImages,
  getGeminiImageInfo,
} from "./llm/gemini";
import {
  extractDoubaoConversation,
  extractDoubaoConversationSync,
  downloadDoubaoImages,
  getDoubaoImageInfo,
} from "./llm/doubao";
import {
  extractAIStudioConversation,
  extractAIStudioConversationSync,
  downloadAIStudioImages,
  getAIStudioImageInfo,
} from "./llm/aistudio";
import { KimiAutomation } from "./llm/kimi";
import { detectPlatform, type Platform } from "./llm/platform";

export default defineContentScript({
  matches: [
    "*://chatgpt.com/*",
    "*://claude.ai/*",
    "*://poe.com/*",
    "*://kimi.moonshot.cn/*",
    "*://kimi.com/*",
    "*://www.kimi.com/*",
    "*://gemini.google.com/*",
    "*://bard.google.com/*",
    "*://doubao.com/*",
    "*://www.doubao.com/*",
    "*://aistudio.google.com/*",

  ],
  main() {
    // 初始化时立即检测并记录平台
    let currentPlatform = detectPlatform();
    let lastUrl = window.location.href;

    console.log("🚀 Content script初始化:", {
      url: lastUrl,
      hostname: window.location.hostname,
      platform: currentPlatform,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
    });

    // 如果是Claude但检测失败，记录详细信息
    if (
      window.location.hostname.includes("claude.ai") &&
      currentPlatform === "Unknown"
    ) {
      console.warn("⚠️ Claude平台检测失败，开始诊断:");
      console.log("页面标题:", document.title);
      console.log("DOM状态:", document.readyState);
      console.log("Body存在:", !!document.body);

      // 检查常见的Claude元素
      const selectors = [
        "div.font-claude-message",
        "div.font-user-message",
        '[data-testid="user-message"]',
        'div[class*="message"]',
      ];

      selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`选择器 "${selector}":`, elements.length, "个元素");
        } catch (e) {
          console.log(`选择器 "${selector}" 失败:`, e.message);
        }
      });
    }

    // 向background script报告当前平台状态
    const reportPlatformChange = (platform: string) => {
      console.log("📡 向background报告平台变化:", platform);
      try {
        browser.runtime
          .sendMessage({
            action: "platformChanged",
            platform: platform,
            url: window.location.href,
          })
          .catch((err) => {
            console.log("Background可能还未准备就绪:", err.message);
          });
      } catch (e) {
        console.log("发送平台变化消息失败:", e);
      }
    };

    // 初始报告
    reportPlatformChange(currentPlatform);

    const checkUrlAndPlatformChange = () => {
      const currentUrl = window.location.href;
      const newPlatform = detectPlatform();

      if (currentUrl !== lastUrl || newPlatform !== currentPlatform) {
        console.log("🔄 检测到变化:", {
          urlChanged: currentUrl !== lastUrl,
          platformChanged: newPlatform !== currentPlatform,
          oldUrl: lastUrl,
          newUrl: currentUrl,
          oldPlatform: currentPlatform,
          newPlatform: newPlatform,
        });

        lastUrl = currentUrl;
        currentPlatform = newPlatform;

        // 报告变化
        reportPlatformChange(newPlatform);
      }
    };

    // 监听浏览器导航事件
    window.addEventListener("popstate", () => {
      console.log("🔙 PopState事件触发");
      setTimeout(checkUrlAndPlatformChange, 100);
    });

    // 监听pushState和replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      console.log("➡️ PushState事件触发");
      setTimeout(checkUrlAndPlatformChange, 100);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      console.log("🔄 ReplaceState事件触发");
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
        subtree: true,
      });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        }
      });
    }

    // 定期检查变化（作为备用方案）
    setInterval(checkUrlAndPlatformChange, 2000);

    async function extractConversation(format: string) {
      const platform = detectPlatform();

      // Kimi平台使用自动化操作模式
      if (platform === "Kimi") {
        return await handleKimiAutomation();
      }

      // 其他平台使用直接提取模式
      return await handleDirectExtraction(platform, format);
    }

    async function handleKimiAutomation() {
      try {
        const result = await KimiAutomation.performAutomation();
        return {
          platform: "Kimi",
          automationMode: true,
          success: result.success,
          message: result.message,
          error: result.error,
          userGuidance: result.userGuidance,
          logs: result.logs,
        };
      } catch (error: any) {
        return {
          platform: "Kimi",
          automationMode: true,
          success: false,
          error: `Kimi自动化操作失败: ${error.message}`,
          logs: [`Error: ${error.message}`],
        };
      }
    }

    async function handleDirectExtraction(platform: Platform, format: string) {
      const logs: string[] = [];
      const log = (message: string) => {
        console.log(message);
        logs.push(message);
      };

      try {
        log(`Platform detected: ${platform}`);
        log(`Format selected: ${format}`);

        // 支持异步消息提取
        const messages = await extractConversationFromPlatform(
          platform,
          format
        );

        if (messages.length > 0) {
          const content = formatConversation(platform, messages, format);

          // 触发文件下载
          const downloadFilename = downloadConversation(content, format);
          log(`文件下载已触发: ${downloadFilename}`);

          // 创建文件数据用于后续处理
          const filename = `${platform}_conversation_${new Date().getTime()}.md`;
          const file = new File([content], filename, { type: "text/markdown" });

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
              type: file.type,
            },
            logs,
          };
        } else {
          return { error: "No messages found in the conversation.", logs };
        }
      } catch (error: any) {
        return { error: `Extraction failed: ${error.message}`, logs };
      }
    }

    async function extractConversationFromPlatform(
      platform: Platform,
      format: string
    ): Promise<[string, string][]> {
      const extractContent = (element: Element | null) => {
        if (!element) return "";
        switch (format) {
          case "markdown":
            return htmlToMarkdown(element.innerHTML);
          case "html":
            return simplifyHtml(element.innerHTML);
          case "plaintext":
            return htmlToPlaintext(element.innerHTML);
          default:
            return htmlToMarkdown(element.innerHTML);
        }
      };

      switch (platform) {
        case "ChatGPT":
          // 使用异步版本进行图片处理
          return await extractChatGPTConversation(extractContent, {
            includeImages: true,
            downloadImages: false,
          });
        case "Claude":
          // 使用异步版本进行base64图片处理
          return await extractClaudeConversation(extractContent, {
            includeImages: true,
            downloadImages: false,
          });
        case "Poe":
          return extractPoeConversation(extractContent);

        case "Gemini":
          // 使用异步版本进行图片处理
          return await extractGeminiConversation(extractContent, {
            includeImages: true,
            downloadImages: false,
          });
        case "Doubao":
          // 使用异步版本进行base64图片处理
          return await extractDoubaoConversation(extractContent, {
            includeImages: true,
            downloadImages: false,
          });
        case "AIStudio":
          // 使用异步版本进行base64图片处理
          return await extractAIStudioConversation(extractContent, {
            includeImages: true,
            downloadImages: false,
          });

        default:
          return [];
      }
    }

    function formatConversation(
      platform: Platform,
      messages: [string, string][],
      format: string
    ): string {
      let content = "";

      switch (format) {
        case "markdown":
          content = formatMarkdownMetadata(window.location.href, platform);
          messages.forEach(([speaker, text]) => {
            content += formatMarkdownMessage(speaker, text);
          });
          break;
        case "html":
          content = formatHtmlMetadata(window.location.href, platform);
          messages.forEach(([speaker, text]) => {
            content += formatHtmlMessage(speaker, text);
          });
          break;
        case "plaintext":
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
        case "markdown":
          return downloadMarkdown(content);
        case "html":
          return downloadHtml(content);
        case "plaintext":
          return downloadPlaintext(content);
        default:
          return downloadMarkdown(content);
      }
    }

    browser.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        console.log(
          "📨 收到消息:",
          request.action,
          "当前平台:",
          detectPlatform()
        );

        if (request.action === "extract") {
          try {
            const currentPlatform = detectPlatform();
            console.log("📝 开始提取对话, 平台:", currentPlatform);

            if (currentPlatform === "Unknown") {
              sendResponse({
                error: `无法识别当前平台，URL: ${window.location.href}`,
                logs: [
                  `当前URL: ${window.location.href}`,
                  `页面标题: ${document.title}`,
                  `用户代理: ${navigator.userAgent.substring(0, 50)}...`,
                ],
              });
              return true;
            }

            const result = await extractConversation(request.format);
            console.log("✅ 提取完成:", result);
            sendResponse(result);
          } catch (error: any) {
            console.error("❌ 提取失败:", error);
            sendResponse({
              error: `处理失败: ${error.message}`,
              logs: [
                `Error: ${error.message}`,
                `平台: ${detectPlatform()}`,
                `URL: ${window.location.href}`,
              ],
            });
          }
        } else if (request.action === "detectPlatform") {
          sendResponse({ platform: detectPlatform() });
        } else if (request.action === "downloadImages") {
          try {
            const platform = detectPlatform();
            if (platform === "Claude") {
              const result = await downloadClaudeImages();
              sendResponse({
                platform: "Claude",
                success: result.success,
                downloadedFiles: result.downloadedFiles,
                errors: result.errors,
                message: result.success
                  ? `成功下载 ${result.downloadedFiles.length} 张图片`
                  : "图片下载失败",
              });
            } else if (platform === "Gemini") {
              const result = await downloadGeminiImages();
              sendResponse({
                platform: "Gemini",
                success: result.success,
                downloadedFiles: result.downloadedFiles,
                errors: result.errors,
                message: result.success
                  ? `成功下载 ${result.downloadedFiles.length} 张Gemini图片`
                  : "Gemini图片下载失败",
              });
            } else if (platform === "Doubao") {
              const result = await downloadDoubaoImages();
              sendResponse({
                platform: "Doubao",
                success: result.success,
                downloadedFiles: result.downloadedFiles,
                errors: result.errors,
                message: result.success
                  ? `成功下载 ${result.downloadedFiles.length} 张豆包图片`
                  : "豆包图片下载失败",
              });
            } else if (platform === "ChatGPT") {
              const result = await downloadChatGPTImages();
              sendResponse({
                platform: "ChatGPT",
                success: result.success,
                downloadedFiles: result.downloadedFiles,
                errors: result.errors,
                message: result.success
                  ? `成功下载 ${result.downloadedFiles.length} 张ChatGPT图片`
                  : "ChatGPT图片下载失败",
              });
            } else if (platform === "AIStudio") {
              const result = await downloadAIStudioImages();
              sendResponse({
                platform: "AIStudio",
                success: result.success,
                downloadedFiles: result.downloadedFiles,
                errors: result.errors,
                message: result.success
                  ? `成功下载 ${result.downloadedFiles.length} 张AI Studio图片`
                  : "AI Studio图片下载失败",
              });
            } else {
              sendResponse({
                platform,
                success: false,
                error: "当前平台不支持图片下载功能",
                downloadedFiles: [],
              });
            }
          } catch (error: any) {
            sendResponse({
              success: false,
              error: `图片下载失败: ${error.message}`,
              downloadedFiles: [],
            });
          }
        } else if (request.action === "getImageInfo") {
          try {
            const platform = detectPlatform();
            if (platform === "Claude") {
              const result = await getClaudeImageInfo();
              sendResponse({
                platform: "Claude",
                success: true,
                imageCount: result.imageCount,
                images: result.images,
              });
            } else if (platform === "Gemini") {
              const result = await getGeminiImageInfo();
              sendResponse({
                platform: "Gemini",
                success: true,
                imageCount: result.imageCount,
                images: result.images,
              });
            } else if (platform === "Doubao") {
              const result = await getDoubaoImageInfo();
              sendResponse({
                platform: "Doubao",
                success: true,
                imageCount: result.imageCount,
                images: result.images,
              });
            } else if (platform === "ChatGPT") {
              const result = await getChatGPTImageInfo();
              sendResponse({
                platform: "ChatGPT",
                success: true,
                imageCount: result.imageCount,
                images: result.images,
              });
            } else if (platform === "AIStudio") {
              const result = await getAIStudioImageInfo();
              sendResponse({
                platform: "AIStudio",
                success: true,
                imageCount: result.imageCount,
                images: result.images,
              });
            } else {
              sendResponse({
                platform,
                success: false,
                imageCount: 0,
                images: [],
                message: "当前平台不支持图片信息获取",
              });
            }
          } catch (error: any) {
            sendResponse({
              success: false,
              error: `获取图片信息失败: ${error.message}`,
              imageCount: 0,
              images: [],
            });
          }
        }
        return true;
      }
    );
  },
});
