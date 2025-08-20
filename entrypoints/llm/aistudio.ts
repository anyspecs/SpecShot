import { AIStudioImageProcessor } from "../utils/image-downloader";
import { DEV_CONFIG, devLog } from "../config/dev-config";

export interface AIStudioConversationOptions {
  includeImages?: boolean;
  downloadImages?: boolean;
}

export async function extractAIStudioConversation(
  extractContent: (element: Element | null) => string,
  options: AIStudioConversationOptions = {}
): Promise<[string, string][]> {
  const conversations: [string, string][] = [];

  devLog.info("🔍 开始提取AI Studio对话...");

  // 等待页面内容加载完成
  const contentReady = await waitForContent();
  if (!contentReady) {
    const validation = validateAIStudioPage();
    throw new Error(`AI Studio页面验证失败: ${validation.error}`);
  }

  // AI Studio 使用 chat-turn-container 包含每个对话轮次
  const turnContainers = document.querySelectorAll(".chat-turn-container");
  devLog.info(`📝 找到 ${turnContainers.length} 个对话轮次`);

  for (let i = 0; i < turnContainers.length; i++) {
    const container = turnContainers[i];

    try {
      // 检查是否为用户消息
      const userContainer = container.querySelector(".user-prompt-container");
      if (userContainer) {
        let content = await extractUserMessage(userContainer, extractContent, options);
        if (content.length > 1) {
          conversations.push(["User", content]);
        }
        continue;
      }

      // 检查是否为AI回复
      const modelContainer = container.querySelector(".model-prompt-container");
      if (modelContainer) {
        let content = await extractModelMessage(modelContainer, extractContent, options);
        if (content.length > 1) {
          conversations.push(["Gemini", content]);
        }
        continue;
      }
    } catch (error) {
      console.warn(`⚠️ 处理对话轮次 ${i} 时出错:`, error);
      // 继续处理其他对话轮次
    }
  }

  console.log(`✅ 提取完成，共 ${conversations.length} 条消息`);
  return conversations;
}

// 为了向后兼容，提供同步版本
export function extractAIStudioConversationSync(
  extractContent: (element: Element | null) => string,
  options: AIStudioConversationOptions = {}
): [string, string][] {
  const conversations: [string, string][] = [];

  console.log("🔍 开始同步提取AI Studio对话...");

  const turnContainers = document.querySelectorAll(".chat-turn-container");
  devLog.info(`📝 找到 ${turnContainers.length} 个对话轮次`);

  for (let i = 0; i < turnContainers.length; i++) {
    const container = turnContainers[i];

    // 检查是否为用户消息
    const userContainer = container.querySelector(".user-prompt-container");
    if (userContainer) {
      let content = extractUserMessageSync(userContainer, extractContent, options);
      if (content.length > 1) {
        conversations.push(["User", content]);
      }
      continue;
    }

    // 检查是否为AI回复
    const modelContainer = container.querySelector(".model-prompt-container");
    if (modelContainer) {
      let content = extractModelMessageSync(modelContainer, extractContent, options);
      if (content.length > 1) {
        conversations.push(["Gemini", content]);
      }
      continue;
    }
  }

  console.log(`✅ 同步提取完成，共 ${conversations.length} 条消息`);
  return conversations;
}

/**
 * 提取用户消息（异步版本）
 */
async function extractUserMessage(
  userContainer: Element,
  extractContent: (element: Element | null) => string,
  options: AIStudioConversationOptions
): Promise<string> {
  console.log("👤 处理用户消息...");

  // 查找用户消息内容
  const contentElement = 
    userContainer.querySelector("ms-text-chunk") ||
    userContainer.querySelector("ms-prompt-chunk") ||
    userContainer.querySelector(".turn-content");

  let content = contentElement ? extractContent(contentElement) : "";

  // 处理图片
  if (options.includeImages) {
    const imageContent = await processImagesInMessage(userContainer, options);
    if (imageContent) {
      content = imageContent + "\n\n" + content;
    }
  }

  return content;
}

/**
 * 提取AI模型回复（异步版本）
 */
async function extractModelMessage(
  modelContainer: Element,
  extractContent: (element: Element | null) => string,
  options: AIStudioConversationOptions
): Promise<string> {
  console.log("🤖 处理AI回复...");

  // 使用流式回复处理函数
  let content = handleStreamingResponse(modelContainer);
  
  // 如果没有找到内容，尝试其他选择器
  if (!content) {
    const contentElement = 
      modelContainer.querySelector("ms-text-chunk") ||
      modelContainer.querySelector(".turn-content");
    content = contentElement ? extractAIStudioContent(contentElement) : "";
  }

  // 处理grounding sources
  const sources = extractGroundingSources(modelContainer);
  if (sources) {
    content += "\n\n" + sources;
  }

  // 处理Google Search建议
  const searchSuggestions = extractSearchSuggestions(modelContainer);
  if (searchSuggestions) {
    content += "\n\n" + searchSuggestions;
  }

  return content;
}

/**
 * 提取用户消息（同步版本）
 */
function extractUserMessageSync(
  userContainer: Element,
  extractContent: (element: Element | null) => string,
  options: AIStudioConversationOptions
): string {
  const contentElement = 
    userContainer.querySelector("ms-text-chunk") ||
    userContainer.querySelector("ms-prompt-chunk") ||
    userContainer.querySelector(".turn-content");

  let content = contentElement ? extractContent(contentElement) : "";

  // 同步版本只添加图片URL信息
  if (options.includeImages) {
    const imageInfo = extractImageInfoSync(userContainer);
    if (imageInfo) {
      content = imageInfo + "\n\n" + content;
    }
  }

  return content;
}

/**
 * 提取AI模型回复（同步版本）
 */
function extractModelMessageSync(
  modelContainer: Element,
  extractContent: (element: Element | null) => string,
  options: AIStudioConversationOptions
): string {
  const contentElement = 
    modelContainer.querySelector("ms-text-chunk") ||
    modelContainer.querySelector(".turn-content");

  let content = contentElement ? extractAIStudioContent(contentElement) : "";

  // 处理grounding sources
  const sources = extractGroundingSources(modelContainer);
  if (sources) {
    content += "\n\n" + sources;
  }

  // 处理Google Search建议
  const searchSuggestions = extractSearchSuggestions(modelContainer);
  if (searchSuggestions) {
    content += "\n\n" + searchSuggestions;
  }

  return content;
}

/**
 * 提取AI Studio特殊内容结构
 */
function extractAIStudioContent(element: Element): string {
  // 处理ms-cmark-node结构
  const cmarkNodes = element.querySelectorAll("ms-cmark-node");
  let content = "";

  for (let i = 0; i < cmarkNodes.length; i++) {
    const node = cmarkNodes[i];
    // 提取文本内容，保留HTML结构
    const nodeText = node.textContent?.trim() || "";
    if (nodeText) {
      content += nodeText + " ";
    }
  }

  // 如果没有找到cmark节点，回退到普通文本提取
  if (!content.trim()) {
    content = element.textContent?.trim() || "";
  }

  return content.trim();
}

/**
 * 错误处理和兼容性检查
 */
function validateAIStudioPage(): { isValid: boolean; error?: string } {
  // 检查是否在正确的域名
  if (!window.location.hostname.includes("aistudio.google.com")) {
    return {
      isValid: false,
      error: "不在AI Studio域名下"
    };
  }

  // 检查是否有基本的对话结构
  const turnContainers = document.querySelectorAll(".chat-turn-container");
  if (turnContainers.length === 0) {
    return {
      isValid: false,
      error: "未找到对话容器，可能页面还在加载或不是对话页面"
    };
  }

  // 检查是否有AI Studio特有的组件
  const aiStudioComponents = document.querySelectorAll("ms-text-chunk, ms-prompt-chunk, ms-cmark-node");
  if (aiStudioComponents.length === 0) {
    return {
      isValid: false,
      error: "未找到AI Studio特有组件，可能页面结构发生变化"
    };
  }

  return { isValid: true };
}

/**
 * 等待页面内容加载完成
 */
async function waitForContent(timeout: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const validation = validateAIStudioPage();
    if (validation.isValid) {
      return true;
    }
    
    // 等待100ms后重试
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
}

/**
 * 处理流式回复状态
 */
function handleStreamingResponse(container: Element): string {
  // 检查是否为流式回复状态
  const streamingIndicator = container.querySelector('[data-is-streaming="true"]');
  if (streamingIndicator) {
    console.log("⚠️ 检测到流式回复进行中，内容可能不完整");
  }
  
  // 查找实际内容，忽略加载状态元素
  const contentSelectors = [
    "ms-text-chunk",
    ".turn-content",
    "ms-cmark-node"
  ];
  
  for (const selector of contentSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      return extractAIStudioContent(element);
    }
  }
  
  return "";
}

/**
 * 处理消息中的图片（异步版本）
 */
async function processImagesInMessage(
  messageContainer: Element,
  options: AIStudioConversationOptions
): Promise<string> {
  console.log("🖼️ 开始处理AI Studio消息中的图片...");

  const imageChunks = messageContainer.querySelectorAll("ms-image-chunk");
  console.log(`🔍 找到 ${imageChunks.length} 个图片块`);

  if (imageChunks.length === 0) {
    return "";
  }

  let imageContent = "";

  for (let i = 0; i < imageChunks.length; i++) {
    const chunk = imageChunks[i];
    const img = chunk.querySelector("img") as HTMLImageElement;

    if (!img) continue;

    const imageUrl = img.src;
    const alt = img.alt || "aistudio-image";
    const filename = generateAIStudioImageFilename(imageUrl, alt, i);

    console.log(`📥 处理AI Studio图片: ${filename}`);

    try {
      // 尝试将图片转换为base64嵌入markdown
      const markdownImage = await AIStudioImageProcessor.getImageAsMarkdownBase64(
        imageUrl,
        filename
      );
      imageContent += `\n\n${markdownImage}\n`;
      imageContent += `*📎 附件: ${filename}*\n`;
      console.log(`✅ AI Studio图片转换成功: ${filename}`);
    } catch (error) {
      // 如果转换失败，回退到URL形式
      console.warn(`❌ AI Studio图片转换失败: ${filename} - ${error}`);
      imageContent += `\n\n📎 **附件**: ${filename}\n`;
      imageContent += `🔗 **图片URL**: ${imageUrl}\n`;
      imageContent += `![${filename}](${imageUrl} "${filename} - 无法转换为base64")\n`;
    }

    if (options.downloadImages) {
      // 触发图片下载（异步）
      AIStudioImageProcessor.downloadImage(imageUrl)
        .then((blob) => {
          AIStudioImageProcessor.downloadImageBlob(blob, filename);
        })
        .catch((error) => {
          console.error(`Failed to download aistudio image ${filename}:`, error);
        });
    }
  }

  return imageContent;
}

/**
 * 提取图片信息（同步版本）
 */
function extractImageInfoSync(messageContainer: Element): string {
  const imageChunks = messageContainer.querySelectorAll("ms-image-chunk");

  if (imageChunks.length === 0) {
    return "";
  }

  let imageInfo = "";

  for (let i = 0; i < imageChunks.length; i++) {
    const chunk = imageChunks[i];
    const img = chunk.querySelector("img") as HTMLImageElement;

    if (!img) continue;

    const imageUrl = img.src;
    const alt = img.alt || "aistudio-image";
    const filename = generateAIStudioImageFilename(imageUrl, alt, i);

    imageInfo += `\n📎 **附件**: ${filename}\n`;
    imageInfo += `🔗 **图片URL**: ${imageUrl}\n`;
    imageInfo += `![${filename}](${imageUrl} "${filename}")\n`;
  }

  return imageInfo;
}

/**
 * 提取grounding sources
 */
function extractGroundingSources(container: Element): string {
  const sourcesContainer = container.querySelector("ms-grounding-sources");
  if (!sourcesContainer) return "";

  console.log("📚 提取grounding sources...");

  let sourcesText = "\n\n**Sources:**\n";
  const sourceLinks = sourcesContainer.querySelectorAll("ol li a");

  for (let i = 0; i < sourceLinks.length; i++) {
    const link = sourceLinks[i] as HTMLAnchorElement;
    const text = link.textContent?.trim() || "";
    const href = link.href || "";
    
    if (text && href) {
      sourcesText += `${i + 1}. [${text}](${href})\n`;
    }
  }

  return sourcesText;
}

/**
 * 提取Google Search建议
 */
function extractSearchSuggestions(container: Element): string {
  const searchContainer = container.querySelector("ms-search-entry-point");
  if (!searchContainer) return "";

  console.log("🔍 提取Google Search建议...");

  let searchText = "\n\n**Google Search Suggestions:**\n";
  const searchChips = searchContainer.querySelectorAll(".chip");

  for (let i = 0; i < searchChips.length; i++) {
    const chip = searchChips[i] as HTMLAnchorElement;
    const text = chip.textContent?.trim() || "";
    const href = chip.href || "";
    
    if (text && href) {
      searchText += `- [${text}](${href})\n`;
    }
  }

  return searchText;
}

/**
 * 生成AI Studio图片文件名
 */
function generateAIStudioImageFilename(
  url: string,
  alt: string,
  index: number
): string {
  // 对于blob URL，生成基于alt和索引的文件名
  if (url.startsWith("blob:")) {
    const baseName = alt || "aistudio-image";
    return sanitizeFilename(`${baseName}-${index + 1}.png`);
  }

  // 尝试从URL中提取文件名
  const urlParts = url.split("/");
  const lastPart = urlParts[urlParts.length - 1];

  if (lastPart.includes(".")) {
    const cleanName = lastPart.split("?")[0]; // 移除查询参数
    return sanitizeFilename(cleanName);
  }

  // 否则生成一个基于alt和索引的文件名
  const baseName = alt || "aistudio-image";
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
 * 专门用于批量下载AI Studio对话中的图片
 */
export async function downloadAIStudioImages(): Promise<{
  success: boolean;
  downloadedFiles: string[];
  errors: string[];
}> {
  try {
    const downloadedFiles = await AIStudioImageProcessor.batchDownloadImages();

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
 * 获取AI Studio对话中的图片信息（不下载）
 */
export async function getAIStudioImageInfo(): Promise<{
  imageCount: number;
  images: Array<{ filename: string; url: string; alt?: string }>;
}> {
  const images = await AIStudioImageProcessor.extractImages();

  return {
    imageCount: images.length,
    images: images.map((img) => ({
      filename: img.filename,
      url: img.url,
      alt: img.alt,
    })),
  };
}

/**
 * 检测是否为AI Studio平台
 */
export function detectAIStudio(): boolean {
  return (
    window.location.hostname === "aistudio.google.com" ||
    document.querySelector(".chat-turn-container") !== null ||
    document.querySelector("ms-text-chunk") !== null
  );
}