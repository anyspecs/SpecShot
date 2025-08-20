import { ClaudeImageProcessor } from "../utils/image-downloader";

export interface ClaudeConversationOptions {
  includeImages?: boolean;
  downloadImages?: boolean;
}

export async function extractClaudeConversation(
  extractContent: (element: Element | null) => string,
  options: ClaudeConversationOptions = {}
): Promise<[string, string][]> {
  const messages: Array<{
    element: Element;
    speaker: string;
    content: string;
    position: number;
  }> = [];

  console.log("🔍 开始提取Claude对话...");

  // 提取用户消息（异步处理）
  const userMessages = document.querySelectorAll(
    '[data-testid="user-message"]'
  );
  console.log(`📝 找到 ${userMessages.length} 条用户消息`);

  // 使用传统for循环避免迭代器问题
  for (let i = 0; i < userMessages.length; i++) {
    const container = userMessages[i];
    let content = extractContent(container);

    // 如果启用图片处理，检查消息中的图片（异步处理）
    if (options.includeImages) {
      content = await processImagesInMessage(container, content, options);
    }

    if (content.trim().length > 0) {
      messages.push({
        element: container,
        speaker: "User",
        content: content,
        position: i * 2, // 用户消息使用偶数位置
      });
    }
  }

  // 提取Claude AI回复
  const aiMessages = document.querySelectorAll("[data-is-streaming]");
  console.log(`🤖 找到 ${aiMessages.length} 条AI回复`);

  // 使用传统for循环避免迭代器问题
  for (let i = 0; i < aiMessages.length; i++) {
    const container = aiMessages[i];
    const responseElement = container.querySelector(".font-claude-response");
    if (responseElement) {
      const content = extractContent(responseElement);
      if (content.trim().length > 0) {
        messages.push({
          element: container as Element,
          speaker: "Claude",
          content: content,
          position: i * 2 + 1, // AI回复使用奇数位置
        });
      }
    }
  }

  // 按照位置排序，确保消息顺序正确
  messages.sort((a, b) => a.position - b.position);

  console.log(`✅ 提取完成，共 ${messages.length} 条消息`);
  return messages.map((msg) => [msg.speaker, msg.content] as [string, string]);
}

// 为了向后兼容，提供同步版本
export function extractClaudeConversationSync(
  extractContent: (element: Element | null) => string,
  options: ClaudeConversationOptions = {}
): [string, string][] {
  const messages: Array<{
    element: Element;
    speaker: string;
    content: string;
    position: number;
  }> = [];

  console.log("🔍 开始同步提取Claude对话...");

  // 提取用户消息
  const userMessages = document.querySelectorAll(
    '[data-testid="user-message"]'
  );
  console.log(`📝 找到 ${userMessages.length} 条用户消息`);

  // 使用传统for循环避免迭代器问题
  for (let i = 0; i < userMessages.length; i++) {
    const container = userMessages[i];
    let content = extractContent(container);

    // 同步版本只添加图片URL信息，不进行base64转换
    if (options.includeImages) {
      const imageSelector =
        '.group\\/thumbnail img[src*="/api/"][src*="/files/"][src*="/preview"]';
      let images = container.parentElement?.querySelectorAll(imageSelector);

      // 如果在父容器中没找到，尝试在祖先容器中查找
      if (!images || images.length === 0) {
        let ancestor = container.parentElement;
        while (ancestor && (!images || images.length === 0)) {
          images = ancestor.querySelectorAll(imageSelector);
          ancestor = ancestor.parentElement;
          if (ancestor === document.body) break;
        }
      }

      if (images && images.length > 0) {
        let imageInfo = "";
        for (let j = 0; j < images.length; j++) {
          const img = images[j] as HTMLImageElement;
          const url = img.src;
          const alt = img.alt || "claude-image";
          const imgContainer = img.closest("[data-testid]");
          const filename =
            imgContainer?.getAttribute("data-testid") || alt || "image.png";
          const sanitizedFilename = sanitizeFilename(filename);

          imageInfo += `\n\n📎 **附件**: ${sanitizedFilename}\n`;
          imageInfo += `🔗 **图片URL**: ${url}\n`;
          imageInfo += `![${sanitizedFilename}](${url} "${sanitizedFilename}")\n`;
        }
        content = imageInfo + "\n\n" + content;
      }
    }

    if (content.trim().length > 0) {
      messages.push({
        element: container,
        speaker: "User",
        content: content,
        position: i * 2, // 用户消息使用偶数位置
      });
    }
  }

  // 提取Claude AI回复
  const aiMessages = document.querySelectorAll("[data-is-streaming]");
  console.log(`🤖 找到 ${aiMessages.length} 条AI回复`);

  // 使用传统for循环避免迭代器问题
  for (let i = 0; i < aiMessages.length; i++) {
    const container = aiMessages[i];
    const responseElement = container.querySelector(".font-claude-response");
    if (responseElement) {
      const content = extractContent(responseElement);
      if (content.trim().length > 0) {
        messages.push({
          element: container as Element,
          speaker: "Claude",
          content: content,
          position: i * 2 + 1, // AI回复使用奇数位置
        });
      }
    }
  }

  // 按照位置排序，确保消息顺序正确
  messages.sort((a, b) => a.position - b.position);

  console.log(`✅ 同步提取完成，共 ${messages.length} 条消息`);
  return messages.map((msg) => [msg.speaker, msg.content] as [string, string]);
}

/**
 * 处理消息中的图片
 * 基于测试脚本的成功实现
 */
async function processImagesInMessage(
  messageContainer: Element,
  originalContent: string,
  options: ClaudeConversationOptions
): Promise<string> {
  console.log("🖼️ 开始处理消息中的图片...");

  // 查找图片的策略：
  // 1. 先在消息容器的父级查找图片
  // 2. 然后在消息容器本身查找
  // 3. 最后在整个文档中查找（作为备用）

  let imageContainer = messageContainer.parentElement || messageContainer;

  // 查找Claude图片的选择器（基于测试脚本）
  const imageSelector =
    '.group\\/thumbnail img[src*="/api/"][src*="/files/"][src*="/preview"]';
  let images = imageContainer.querySelectorAll(imageSelector);

  // 如果在父容器中没找到，尝试在更大范围查找
  if (images.length === 0) {
    // 查找包含图片的祖先容器
    let ancestor = messageContainer.parentElement;
    while (ancestor && images.length === 0) {
      images = ancestor.querySelectorAll(imageSelector);
      ancestor = ancestor.parentElement;
      // 防止查找范围过大
      if (ancestor === document.body) break;
    }
  }

  console.log(`🔍 找到 ${images.length} 张图片`);

  if (images.length === 0) {
    return originalContent;
  }

  let imageContent = "";

  // 使用传统for循环处理图片，避免迭代器问题
  for (let i = 0; i < images.length; i++) {
    const img = images[i] as HTMLImageElement;
    const url = img.src;
    const alt = img.alt || "claude-image";

    // 获取文件名 - 基于测试脚本的逻辑
    const container = img.closest("[data-testid]");
    const filename =
      container?.getAttribute("data-testid") || alt || "image.png";
    const sanitizedFilename = sanitizeFilename(filename);

    console.log(`📥 处理图片: ${sanitizedFilename}`);

    try {
      // 尝试将图片转换为base64嵌入markdown
      const markdownImage = await ClaudeImageProcessor.getImageAsMarkdownBase64(
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
      ClaudeImageProcessor.downloadImage(url)
        .then((blob) => {
          ClaudeImageProcessor.downloadImageBlob(blob, sanitizedFilename);
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
 * 清理文件名，基于测试脚本的实现
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

/**
 * 专门用于批量下载Claude对话中的图片
 */
export async function downloadClaudeImages(): Promise<{
  success: boolean;
  downloadedFiles: string[];
  errors: string[];
}> {
  try {
    const downloadedFiles = await ClaudeImageProcessor.batchDownloadImages();

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
 * 获取Claude对话中的图片信息（不下载）
 */
export async function getClaudeImageInfo(): Promise<{
  imageCount: number;
  images: Array<{ filename: string; url: string; alt?: string }>;
}> {
  const images = await ClaudeImageProcessor.extractImages();

  return {
    imageCount: images.length,
    images: images.map((img) => ({
      filename: img.filename,
      url: img.url,
      alt: img.alt,
    })),
  };
}
