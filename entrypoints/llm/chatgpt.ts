import { ChatGPTImageProcessor } from "../utils/image-downloader";

export interface ChatGPTConversationOptions {
  includeImages?: boolean;
  downloadImages?: boolean;
}

export async function extractChatGPTConversation(
  extractContent: (element: Element | null) => string,
  options: ChatGPTConversationOptions = {}
): Promise<[string, string][]> {
  const messages: Array<{
    element: Element;
    speaker: string;
    content: string;
    position: number;
  }> = [];

  console.log("🔍 开始提取ChatGPT对话...");

  const messageElements = document.querySelectorAll(
    "[data-message-author-role]"
  );
  console.log(`📝 找到 ${messageElements.length} 条消息`);

  if (messageElements.length > 0) {
    // 使用传统for循环避免迭代器问题
    for (let i = 0; i < messageElements.length; i++) {
      const element = messageElements[i];
      const role = element.getAttribute("data-message-author-role");
      const speaker = role === "assistant" ? "AI" : "User";

      let contentElement =
        element.querySelector("[data-message-content]") ||
        element.querySelector(".markdown") ||
        element.querySelector('[class*="prose"]') ||
        element.querySelector(".text-message") ||
        element.querySelector("[data-start]") ||
        element.querySelector("blockquote") ||
        element.querySelector("div > p, div > ul, div > ol");

      if (!contentElement) {
        const divs = element.querySelectorAll("div");
        for (const div of divs) {
          const text = div.textContent?.trim() || "";
          if (
            text.length > 10 &&
            !div.querySelector('button, svg, [role="button"]')
          ) {
            contentElement = div;
            break;
          }
        }
      }

      if (contentElement) {
        let content = extractContent(contentElement);

        // 如果启用图片处理，检查消息中的图片
        if (options.includeImages) {
          content = await processImagesInMessage(element, content, options);
        }

        if (content.length > 1) {
          messages.push({
            element: element,
            speaker: speaker,
            content: content,
            position: i,
          });
        }
      }
    }
  } else {
    // 处理旧版ChatGPT界面
    const userMessages = document.querySelectorAll("blockquote");
    for (let i = 0; i < userMessages.length; i++) {
      const blockquote = userMessages[i];
      let content = extractContent(blockquote);

      if (options.includeImages) {
        content = await processImagesInMessage(blockquote, content, options);
      }

      if (content.length > 1) {
        messages.push({
          element: blockquote,
          speaker: "User",
          content: content,
          position: i * 2,
        });
      }
    }

    const aiContentElements = document.querySelectorAll(
      "p[data-start], ul[data-start], ol[data-start]"
    );
    for (let i = 0; i < aiContentElements.length; i++) {
      const element = aiContentElements[i];
      if (!element.closest("blockquote")) {
        let content = extractContent(element);

        if (options.includeImages) {
          content = await processImagesInMessage(element, content, options);
        }

        if (content.length > 1) {
          messages.push({
            element: element,
            speaker: "AI",
            content: content,
            position: i * 2 + 1,
          });
        }
      }
    }
  }

  // 按照位置排序，确保消息顺序正确
  messages.sort((a, b) => a.position - b.position);

  console.log(`✅ 提取完成，共 ${messages.length} 条消息`);
  return messages.map((msg) => [msg.speaker, msg.content] as [string, string]);
}
// 为了向后兼容，提供同步版本
export function extractChatGPTConversationSync(
  extractContent: (element: Element | null) => string,
  options: ChatGPTConversationOptions = {}
): [string, string][] {
  const messages: Array<{
    element: Element;
    speaker: string;
    content: string;
    position: number;
  }> = [];

  console.log("🔍 开始同步提取ChatGPT对话...");

  const messageElements = document.querySelectorAll(
    "[data-message-author-role]"
  );
  console.log(`📝 找到 ${messageElements.length} 条消息`);

  if (messageElements.length > 0) {
    for (let i = 0; i < messageElements.length; i++) {
      const element = messageElements[i];
      const role = element.getAttribute("data-message-author-role");
      const speaker = role === "assistant" ? "AI" : "User";

      let contentElement =
        element.querySelector("[data-message-content]") ||
        element.querySelector(".markdown") ||
        element.querySelector('[class*="prose"]') ||
        element.querySelector(".text-message") ||
        element.querySelector("[data-start]") ||
        element.querySelector("blockquote") ||
        element.querySelector("div > p, div > ul, div > ol");

      if (!contentElement) {
        const divs = element.querySelectorAll("div");
        for (const div of divs) {
          const text = div.textContent?.trim() || "";
          if (
            text.length > 10 &&
            !div.querySelector('button, svg, [role="button"]')
          ) {
            contentElement = div;
            break;
          }
        }
      }

      if (contentElement) {
        let content = extractContent(contentElement);

        // 同步版本只添加图片URL信息，不进行base64转换
        if (options.includeImages) {
          const imageSelectors = [
            'img[src*="files.oaiusercontent.com"]',
            'img[src*="cdn.openai.com"]',
            'img[src*="oaidalleapiprodscus.blob.core.windows.net"]',
            'img[src*="dalle-3"]',
            'img[src^="data:image"]',
            'img[src^="blob:"]',
            'img[src^="http"]',
          ];

          let imageInfo = "";
          let imageCount = 0;

          for (const selector of imageSelectors) {
            const images = element.querySelectorAll(selector);
            for (let j = 0; j < images.length; j++) {
              const img = images[j] as HTMLImageElement;
              const url = img.src;
              const alt = img.alt || "chatgpt-image";
              const filename = sanitizeFilename(`${alt}-${imageCount + 1}`);

              imageInfo += `\n\n📎 **附件**: ${filename}\n`;
              imageInfo += `🔗 **图片URL**: ${url}\n`;
              imageInfo += `![${filename}](${url} "${filename}")\n`;
              imageCount++;
            }
          }

          if (imageInfo) {
            content = imageInfo + "\n\n" + content;
          }
        }

        if (content.length > 1) {
          messages.push({
            element: element,
            speaker: speaker,
            content: content,
            position: i,
          });
        }
      }
    }
  } else {
    // 处理旧版ChatGPT界面
    const userMessages = document.querySelectorAll("blockquote");
    for (let i = 0; i < userMessages.length; i++) {
      const blockquote = userMessages[i];
      let content = extractContent(blockquote);

      if (options.includeImages) {
        content = addImageInfoSync(blockquote, content);
      }

      if (content.length > 1) {
        messages.push({
          element: blockquote,
          speaker: "User",
          content: content,
          position: i * 2,
        });
      }
    }

    const aiContentElements = document.querySelectorAll(
      "p[data-start], ul[data-start], ol[data-start]"
    );
    for (let i = 0; i < aiContentElements.length; i++) {
      const element = aiContentElements[i];
      if (!element.closest("blockquote")) {
        let content = extractContent(element);

        if (options.includeImages) {
          content = addImageInfoSync(element, content);
        }

        if (content.length > 1) {
          messages.push({
            element: element,
            speaker: "AI",
            content: content,
            position: i * 2 + 1,
          });
        }
      }
    }
  }

  // 按照位置排序，确保消息顺序正确
  messages.sort((a, b) => a.position - b.position);

  console.log(`✅ 同步提取完成，共 ${messages.length} 条消息`);
  return messages.map((msg) => [msg.speaker, msg.content] as [string, string]);
}

/**
 * 处理消息中的图片（异步版本）
 */
async function processImagesInMessage(
  messageContainer: Element,
  originalContent: string,
  options: ChatGPTConversationOptions
): Promise<string> {
  console.log("🖼️ 开始处理ChatGPT消息中的图片...");

  const imageSelectors = [
    'img[src*="files.oaiusercontent.com"]',
    'img[src*="cdn.openai.com"]',
    'img[src*="oaidalleapiprodscus.blob.core.windows.net"]',
    'img[src*="dalle-3"]',
    'img[src^="data:image"]',
    'img[src^="blob:"]',
    'img[src^="http"]',
  ];

  let allImages: HTMLImageElement[] = [];

  // 收集所有图片
  for (const selector of imageSelectors) {
    const images = messageContainer.querySelectorAll(selector);
    for (let i = 0; i < images.length; i++) {
      const img = images[i] as HTMLImageElement;
      // 避免重复添加
      if (!allImages.some((existing) => existing.src === img.src)) {
        allImages.push(img);
      }
    }
  }

  console.log(`🔍 找到 ${allImages.length} 张图片`);

  if (allImages.length === 0) {
    return originalContent;
  }

  let imageContent = "";

  for (let i = 0; i < allImages.length; i++) {
    const img = allImages[i];
    const url = img.src;
    const alt = img.alt || "chatgpt-image";
    const sanitizedFilename = sanitizeFilename(`${alt}-${i + 1}`);

    console.log(`📥 处理图片: ${sanitizedFilename}`);

    try {
      // 尝试将图片转换为base64嵌入markdown
      const markdownImage =
        await ChatGPTImageProcessor.getImageAsMarkdownBase64(
          url,
          sanitizedFilename
        );
      imageContent += `\n\n${markdownImage}\n`;
      imageContent += `*📎 附件: ${sanitizedFilename}*\n`;
      console.log(`✅ 图片转换成功: ${sanitizedFilename}`);
    } catch (error) {
      // 如果转换失败，回退到URL形式
      console.warn(`❌ 图片转换失败: ${sanitizedFilename} - ${error}`);
      imageContent += `\n\n📎 **附件**: ${sanitizedFilename}\n`;
      imageContent += `🔗 **图片URL**: ${url}\n`;
      imageContent += `![${sanitizedFilename}](${url} "${sanitizedFilename} - 无法转换为base64")\n`;
    }

    if (options.downloadImages) {
      // 触发图片下载（异步）
      ChatGPTImageProcessor.downloadImage(url)
        .then((blob) => {
          ChatGPTImageProcessor.downloadImageBlob(blob, sanitizedFilename);
        })
        .catch((error) => {
          console.error(
            `Failed to download image ${sanitizedFilename}:`,
            error
          );
        });
    }
  }

  return imageContent + "\n\n" + originalContent;
}

/**
 * 同步版本的图片信息添加
 */
function addImageInfoSync(element: Element, originalContent: string): string {
  const imageSelectors = [
    'img[src*="files.oaiusercontent.com"]',
    'img[src*="cdn.openai.com"]',
    'img[src*="oaidalleapiprodscus.blob.core.windows.net"]',
    'img[src*="dalle-3"]',
    'img[src^="data:image"]',
    'img[src^="blob:"]',
    'img[src^="http"]',
  ];

  let imageInfo = "";
  let imageCount = 0;

  for (const selector of imageSelectors) {
    const images = element.querySelectorAll(selector);
    for (let i = 0; i < images.length; i++) {
      const img = images[i] as HTMLImageElement;
      const url = img.src;
      const alt = img.alt || "chatgpt-image";
      const filename = sanitizeFilename(`${alt}-${imageCount + 1}`);

      imageInfo += `\n\n📎 **附件**: ${filename}\n`;
      imageInfo += `🔗 **图片URL**: ${url}\n`;
      imageInfo += `![${filename}](${url} "${filename}")\n`;
      imageCount++;
    }
  }

  return imageInfo ? imageInfo + "\n\n" + originalContent : originalContent;
}

/**
 * 清理文件名，移除非法字符
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

/**
 * 专门用于批量下载ChatGPT对话中的图片
 */
export async function downloadChatGPTImages(): Promise<{
  success: boolean;
  downloadedFiles: string[];
  errors: string[];
}> {
  try {
    const downloadedFiles = await ChatGPTImageProcessor.batchDownloadImages();

    return {
      success: true,
      downloadedFiles,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      downloadedFiles: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * 获取ChatGPT对话中的图片信息（不下载）
 */
export async function getChatGPTImageInfo(): Promise<{
  imageCount: number;
  images: Array<{ filename: string; url: string; alt?: string }>;
}> {
  const images = await ChatGPTImageProcessor.extractImages();

  return {
    imageCount: images.length,
    images: images.map((img) => ({
      filename: img.filename,
      url: img.url,
      alt: img.alt,
    })),
  };
}
