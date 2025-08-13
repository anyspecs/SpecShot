import { DoubaoImageProcessor } from "../utils/image-downloader";

export interface DoubaoConversationOptions {
  includeImages?: boolean;
  downloadImages?: boolean;
}

export async function extractDoubaoConversation(
  extractContent: (element: Element | null) => string,
  options: DoubaoConversationOptions = {}
): Promise<[string, string][]> {
  const conversations: [string, string][] = [];

  console.log("🔍 开始提取豆包对话...");

  // 豆包AI使用 data-testid 来区分消息类型
  // 用户消息: data-testid="send_message"
  // AI回复: data-testid="receive_message"

  // 查找所有消息容器
  const messageContainers = document.querySelectorAll(
    '[data-testid="message-block-container"]'
  );
  console.log(`📝 找到 ${messageContainers.length} 个消息容器`);

  for (let i = 0; i < messageContainers.length; i++) {
    const container = messageContainers[i];

    // 检查是否为用户消息
    const userMessage = container.querySelector('[data-testid="send_message"]');
    if (userMessage) {
      let content = extractContent(userMessage);

      // 如果启用图片处理，检查消息中的图片
      if (options.includeImages) {
        content = await processImagesInMessage(container, content, options);
      }

      if (content.length > 1) {
        conversations.push(["用户", content]);
      }
      continue;
    }

    // 检查是否为AI回复
    const aiMessage = container.querySelector(
      '[data-testid="receive_message"]'
    );
    if (aiMessage) {
      const content = extractContent(aiMessage);
      if (content.length > 1) {
        conversations.push(["豆包", content]);
      }
      continue;
    }
  }

  console.log(`✅ 提取完成，共 ${conversations.length} 条消息`);
  return conversations;
}

// 为了向后兼容，提供同步版本
export function extractDoubaoConversationSync(
  extractContent: (element: Element | null) => string,
  options: DoubaoConversationOptions = {}
): [string, string][] {
  const conversations: [string, string][] = [];

  console.log("🔍 开始同步提取豆包对话...");

  // 查找所有消息容器
  const messageContainers = document.querySelectorAll(
    '[data-testid="message-block-container"]'
  );
  console.log(`📝 找到 ${messageContainers.length} 个消息容器`);

  for (let i = 0; i < messageContainers.length; i++) {
    const container = messageContainers[i];

    // 检查是否为用户消息
    const userMessage = container.querySelector('[data-testid="send_message"]');
    if (userMessage) {
      let content = extractContent(userMessage);

      // 同步版本只添加图片URL信息，不进行base64转换
      if (options.includeImages) {
        const imageInfo = extractImageInfo(container);
        if (imageInfo) {
          content = imageInfo + "\n\n" + content;
        }
      }

      if (content.length > 1) {
        conversations.push(["用户", content]);
      }
      continue;
    }

    // 检查是否为AI回复
    const aiMessage = container.querySelector(
      '[data-testid="receive_message"]'
    );
    if (aiMessage) {
      const content = extractContent(aiMessage);
      if (content.length > 1) {
        conversations.push(["豆包", content]);
      }
      continue;
    }
  }

  console.log(`✅ 同步提取完成，共 ${conversations.length} 条消息`);
  return conversations;
}

/**
 * 处理消息中的图片（异步版本）
 */
async function processImagesInMessage(
  messageContainer: Element,
  originalContent: string,
  options: DoubaoConversationOptions
): Promise<string> {
  console.log("🖼️ 开始处理豆包消息中的图片...");

  // 豆包图片选择器策略：
  // 1. 查找图片容器：.container-vWPG4p.clickable-zqugHB
  // 2. 查找图片元素：picture > img
  // 3. 支持多种图片URL格式

  const imageContainers = messageContainer.querySelectorAll(
    ".container-vWPG4p.clickable-zqugHB"
  );
  console.log(`🔍 找到 ${imageContainers.length} 个图片容器`);

  if (imageContainers.length === 0) {
    return originalContent;
  }

  let imageContent = "";

  for (let i = 0; i < imageContainers.length; i++) {
    const container = imageContainers[i];
    const img = container.querySelector("picture img") as HTMLImageElement;

    if (!img) continue;

    // 获取图片URL，优先使用srcset中的高质量版本
    let imageUrl = img.src;
    const srcset = img.srcset;

    if (srcset) {
      // 解析srcset，选择最高质量的图片
      const srcsetEntries = srcset.split(",").map((entry) => entry.trim());
      const highQualityEntry =
        srcsetEntries.find((entry) => entry.includes("2x")) || srcsetEntries[0];
      if (highQualityEntry) {
        imageUrl = highQualityEntry.split(" ")[0];
      }
    }

    const alt = img.alt || "doubao-image";
    const filename = generateDoubaoImageFilename(imageUrl, alt, i);

    console.log(`📥 处理豆包图片: ${filename}`);

    try {
      // 尝试将图片转换为base64嵌入markdown
      const markdownImage = await DoubaoImageProcessor.getImageAsMarkdownBase64(
        imageUrl,
        filename
      );
      imageContent += `\n\n${markdownImage}\n`;
      imageContent += `*📎 附件: ${filename}*\n`;
      console.log(`✅ 豆包图片转换成功: ${filename}`);
    } catch (error) {
      // 如果转换失败，回退到URL形式
      console.warn(`❌ 豆包图片转换失败: ${filename} - ${error}`);
      imageContent += `\n\n📎 **附件**: ${filename}\n`;
      imageContent += `🔗 **图片URL**: ${imageUrl}\n`;
      imageContent += `![${filename}](${imageUrl} "${filename} - 无法转换为base64")\n`;
    }

    if (options.downloadImages) {
      // 触发图片下载（异步）
      DoubaoImageProcessor.downloadImage(imageUrl)
        .then((blob) => {
          DoubaoImageProcessor.downloadImageBlob(blob, filename);
        })
        .catch((error) => {
          console.error(`Failed to download doubao image ${filename}:`, error);
        });
    }
  }

  return imageContent + "\n\n" + originalContent;
}

/**
 * 提取图片信息（同步版本）
 */
function extractImageInfo(messageContainer: Element): string {
  const imageContainers = messageContainer.querySelectorAll(
    ".container-vWPG4p.clickable-zqugHB"
  );

  if (imageContainers.length === 0) {
    return "";
  }

  let imageInfo = "";

  for (let i = 0; i < imageContainers.length; i++) {
    const container = imageContainers[i];
    const img = container.querySelector("picture img") as HTMLImageElement;

    if (!img) continue;

    // 获取图片URL
    let imageUrl = img.src;
    const srcset = img.srcset;

    if (srcset) {
      const srcsetEntries = srcset.split(",").map((entry) => entry.trim());
      const highQualityEntry =
        srcsetEntries.find((entry) => entry.includes("2x")) || srcsetEntries[0];
      if (highQualityEntry) {
        imageUrl = highQualityEntry.split(" ")[0];
      }
    }

    const alt = img.alt || "doubao-image";
    const filename = generateDoubaoImageFilename(imageUrl, alt, i);

    imageInfo += `\n📎 **附件**: ${filename}\n`;
    imageInfo += `🔗 **图片URL**: ${imageUrl}\n`;
    imageInfo += `![${filename}](${imageUrl} "${filename}")\n`;
  }

  return imageInfo;
}

/**
 * 生成豆包图片文件名
 */
function generateDoubaoImageFilename(
  url: string,
  alt: string,
  index: number
): string {
  // 尝试从URL中提取文件名
  const urlParts = url.split("/");
  const lastPart = urlParts[urlParts.length - 1];

  // 如果URL包含文件扩展名，使用它
  if (lastPart.includes(".")) {
    const cleanName = lastPart.split("?")[0]; // 移除查询参数
    return sanitizeFilename(cleanName);
  }

  // 否则生成一个基于alt和索引的文件名
  const baseName = alt || "doubao-image";
  const extension = url.includes(".png")
    ? ".png"
    : url.includes(".jpg") || url.includes(".jpeg")
    ? ".jpg"
    : url.includes(".gif")
    ? ".gif"
    : url.includes(".webp")
    ? ".webp"
    : ".png";

  return sanitizeFilename(`${baseName}-${index + 1}${extension}`);
}

/**
 * 清理文件名
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

/**
 * 专门用于批量下载豆包对话中的图片
 */
export async function downloadDoubaoImages(): Promise<{
  success: boolean;
  downloadedFiles: string[];
  errors: string[];
}> {
  try {
    const downloadedFiles = await DoubaoImageProcessor.batchDownloadImages();

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
 * 获取豆包对话中的图片信息（不下载）
 */
export async function getDoubaoImageInfo(): Promise<{
  imageCount: number;
  images: Array<{ filename: string; url: string; alt?: string }>;
}> {
  const images = await DoubaoImageProcessor.extractImages();

  return {
    imageCount: images.length,
    images: images.map((img) => ({
      filename: img.filename,
      url: img.url,
      alt: img.alt,
    })),
  };
}

export function detectDoubao(): boolean {
  return (
    window.location.hostname.includes("doubao.com") ||
    window.location.hostname.includes("www.doubao.com") ||
    document.querySelector('[data-testid="send_message"]') !== null ||
    document.querySelector('[data-testid="receive_message"]') !== null
  );
}
