export interface GeminiConversationOptions {
  includeImages?: boolean;
  downloadImages?: boolean;
}

export async function extractGeminiConversation(
  extractContent: (element: Element | null) => string,
  options: GeminiConversationOptions = {}
): Promise<[string, string][]> {
  const conversation: [string, string][] = [];

  console.log("🔍 开始提取Gemini对话...");

  // 获取所有消息容器
  const userMessages = document.querySelectorAll(
    ".user-query-bubble-with-background"
  );
  const aiMessages = document.querySelectorAll(".markdown.markdown-main-panel");

  console.log(`📝 找到 ${userMessages.length} 条用户消息`);
  console.log(`🤖 找到 ${aiMessages.length} 条AI回复`);

  // 创建消息数组，包含消息和时间戳信息
  const allMessages: {
    element: Element;
    type: "user" | "ai";
    index: number;
  }[] = [];

  // 添加用户消息
  userMessages.forEach((element, index) => {
    allMessages.push({ element, type: "user", index });
  });

  // 添加AI消息
  aiMessages.forEach((element, index) => {
    allMessages.push({ element, type: "ai", index });
  });

  // 按照DOM顺序排序（基于元素在页面中的位置）
  allMessages.sort((a, b) => {
    const posA = a.element.compareDocumentPosition(b.element);
    if (posA & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (posA & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });

  // 处理排序后的消息
  for (const { element, type } of allMessages) {
    if (type === "user") {
      // 提取用户消息内容
      let content = await extractUserMessage(element, extractContent, options);

      if (content.trim()) {
        conversation.push(["User", content.trim()]);
      }
    } else if (type === "ai") {
      // 提取AI回复内容
      const content = extractContent(element);
      if (content.trim()) {
        conversation.push(["Gemini", content.trim()]);
      }
    }
  }

  console.log(`✅ 提取完成，共 ${conversation.length} 条消息`);
  return conversation;
}

// 为了向后兼容，提供同步版本
export function extractGeminiConversationSync(
  extractContent: (element: Element | null) => string,
  options: GeminiConversationOptions = {}
): [string, string][] {
  const conversation: [string, string][] = [];

  console.log("🔍 开始同步提取Gemini对话...");

  // 获取所有消息容器
  const userMessages = document.querySelectorAll(
    ".user-query-bubble-with-background"
  );
  const aiMessages = document.querySelectorAll(".markdown.markdown-main-panel");

  console.log(`📝 找到 ${userMessages.length} 条用户消息`);
  console.log(`🤖 找到 ${aiMessages.length} 条AI回复`);

  // 创建消息数组，包含消息和时间戳信息
  const allMessages: {
    element: Element;
    type: "user" | "ai";
    index: number;
  }[] = [];

  // 添加用户消息
  userMessages.forEach((element, index) => {
    allMessages.push({ element, type: "user", index });
  });

  // 添加AI消息
  aiMessages.forEach((element, index) => {
    allMessages.push({ element, type: "ai", index });
  });

  // 按照DOM顺序排序（基于元素在页面中的位置）
  allMessages.sort((a, b) => {
    const posA = a.element.compareDocumentPosition(b.element);
    if (posA & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (posA & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });

  // 处理排序后的消息
  allMessages.forEach(({ element, type }) => {
    if (type === "user") {
      // 提取用户消息内容（同步版本）
      let content = extractUserMessageSync(element, extractContent, options);

      if (content.trim()) {
        conversation.push(["User", content.trim()]);
      }
    } else if (type === "ai") {
      // 提取AI回复内容
      const content = extractContent(element);
      if (content.trim()) {
        conversation.push(["Gemini", content.trim()]);
      }
    }
  });

  console.log(`✅ 同步提取完成，共 ${conversation.length} 条消息`);
  return conversation;
}

// 检测是否为Gemini页面
export function detectGemini(): boolean {
  return (
    window.location.hostname.includes("gemini.google.com") ||
    window.location.hostname.includes("bard.google.com") ||
    document.querySelector(".user-query-bubble-with-background") !== null ||
    document.querySelector(".markdown.markdown-main-panel") !== null
  );
}

/**
 * 异步提取用户消息内容，包括图片处理
 */
async function extractUserMessage(
  element: Element,
  extractContent: (element: Element | null) => string,
  options: GeminiConversationOptions
): Promise<string> {
  let content = "";

  // 提取文本内容
  const queryTextDiv = element.querySelector(".query-text");
  if (queryTextDiv) {
    const queryLines = queryTextDiv.querySelectorAll(".query-text-line");

    queryLines.forEach((line) => {
      const lineText = line.textContent?.trim() || "";
      if (lineText) {
        content += lineText + "\n";
      }
    });
  }

  // 如果启用图片处理，提取图片信息
  if (options.includeImages) {
    const imageContent = await processGeminiImages(element, options);
    if (imageContent) {
      content = imageContent + "\n\n" + content;
    }
  }

  return content;
}

/**
 * 同步提取用户消息内容，包括图片URL信息
 */
function extractUserMessageSync(
  element: Element,
  extractContent: (element: Element | null) => string,
  options: GeminiConversationOptions
): string {
  let content = "";

  // 提取文本内容
  const queryTextDiv = element.querySelector(".query-text");
  if (queryTextDiv) {
    const queryLines = queryTextDiv.querySelectorAll(".query-text-line");

    queryLines.forEach((line) => {
      const lineText = line.textContent?.trim() || "";
      if (lineText) {
        content += lineText + "\n";
      }
    });
  }

  // 如果启用图片处理，提取图片URL信息（同步版本）
  if (options.includeImages) {
    const imageContent = processGeminiImagesSync(element, options);
    if (imageContent) {
      content = imageContent + "\n\n" + content;
    }
  }

  return content;
}

/**
 * 异步处理Gemini消息中的图片
 */
async function processGeminiImages(
  messageContainer: Element,
  options: GeminiConversationOptions
): Promise<string> {
  console.log("🖼️ 开始处理Gemini消息中的图片...");

  // 尝试多种选择器策略查找图片容器
  let imageContainers = findImageContainers(messageContainer);

  if (imageContainers.length === 0) {
    console.log("⚠️ 在当前消息容器中未找到图片");
    return "";
  }

  return await processImageContainers(imageContainers, options);
}

/**
 * 同步处理Gemini消息中的图片（仅提取URL信息）
 */
function processGeminiImagesSync(
  messageContainer: Element,
  options: GeminiConversationOptions
): string {
  console.log("🖼️ 开始同步处理Gemini消息中的图片...");

  // 尝试多种选择器策略查找图片容器
  let imageContainers = findImageContainers(messageContainer);

  if (imageContainers.length === 0) {
    console.log("⚠️ 在当前消息容器中未找到图片");
    return "";
  }

  return processImageContainersSync(imageContainers, options);
}

/**
 * 异步处理图片容器集合
 */
async function processImageContainers(
  imageContainers: Element[],
  options: GeminiConversationOptions
): Promise<string> {
  let imageContent = "";

  console.log(`🔍 找到 ${imageContainers.length} 个图片容器`);

  for (let i = 0; i < imageContainers.length; i++) {
    const container = imageContainers[i];

    // 使用新的URL提取策略
    const { actualUrl, blobUrl, method } = extractImageUrl(container);

    if (!actualUrl && !blobUrl) {
      console.warn(`⚠️ 图片容器 ${i + 1} 中未找到有效的图片URL`);
      continue;
    }

    // 生成文件名
    const filename = generateGeminiImageFilename(i + 1, actualUrl || blobUrl);

    console.log(`📥 处理图片 ${i + 1}: ${filename} (方法: ${method})`);
    console.log(`  实际URL: ${actualUrl || "无"}`);
    console.log(`  Blob URL: ${blobUrl || "无"}`);

    try {
      // 优先使用实际图片URL
      if (actualUrl) {
        try {
          // 尝试转换为base64
          const markdownImage = await convertImageToBase64Markdown(
            actualUrl,
            filename
          );
          imageContent += `\n\n${markdownImage}\n`;
          imageContent += `*📎 附件: ${filename}*\n`;
          console.log(`✅ 图片转换成功: ${filename}`);

          // 如果启用下载，触发下载
          if (options.downloadImages) {
            await downloadGeminiImage(actualUrl, filename);
          }
        } catch (fetchError) {
          console.warn(`❌ 实际URL访问失败: ${fetchError.message}`);
          // 降级到URL形式
          imageContent += `\n\n📎 **附件**: ${filename}\n`;
          imageContent += `🔗 **图片URL**: ${actualUrl}\n`;
          imageContent += `![${filename}](${actualUrl} "${filename} - Gemini图片")\n`;
          imageContent += `⚠️ **注意**: 图片可能受到访问限制\n`;
        }
      } else if (blobUrl) {
        // 只有blob URL的情况
        imageContent += `\n\n📎 **附件**: ${filename}\n`;
        imageContent += `🔗 **图片URL**: ${blobUrl}\n`;
        imageContent += `![${filename}](${blobUrl} "${filename} - Gemini图片")\n`;
        imageContent += `⚠️ **注意**: 这是临时URL，可能无法在其他地方访问\n`;
        console.log(`⚠️ 仅使用blob URL: ${filename}`);
      }
    } catch (error) {
      console.warn(`❌ 图片处理失败: ${filename} - ${error}`);
      imageContent += `\n\n📎 **附件**: ${filename}\n`;
      imageContent += `❌ **处理失败**: ${error}\n`;
    }
  }

  return imageContent;
}

/**
 * 同步处理图片容器集合（仅提取URL信息）
 */
function processImageContainersSync(
  imageContainers: Element[],
  options: GeminiConversationOptions
): string {
  let imageContent = "";

  console.log(`🔍 找到 ${imageContainers.length} 个图片容器`);

  for (let i = 0; i < imageContainers.length; i++) {
    const container = imageContainers[i];

    // 使用新的URL提取策略
    const { actualUrl, blobUrl, method } = extractImageUrl(container);

    if (!actualUrl && !blobUrl) {
      console.warn(`⚠️ 图片容器 ${i + 1} 中未找到有效的图片URL`);
      continue;
    }

    // 生成文件名
    const filename = generateGeminiImageFilename(i + 1, actualUrl || blobUrl);

    console.log(`📥 处理图片 ${i + 1}: ${filename} (方法: ${method})`);

    imageContent += `\n\n📎 **附件**: ${filename}\n`;

    if (actualUrl) {
      imageContent += `🔗 **图片URL**: ${actualUrl}\n`;
      imageContent += `![${filename}](${actualUrl} "${filename} - Gemini图片")\n`;
    }

    if (blobUrl) {
      imageContent += `🔗 **预览URL**: ${blobUrl}\n`;
      if (!actualUrl) {
        imageContent += `![${filename}](${blobUrl} "${filename} - Gemini图片预览")\n`;
      }
    }

    imageContent += `📋 **提取方法**: ${method}\n`;
  }

  return imageContent;
}

/**
 * 查找图片容器的多种策略
 */
function findImageContainers(messageContainer: Element): Element[] {
  const strategies = [
    // 策略1: 直接查找 user-query-file-preview
    () => messageContainer.querySelectorAll("user-query-file-preview"),

    // 策略2: 在父容器中查找
    () => {
      const parent = messageContainer.parentElement;
      return parent ? parent.querySelectorAll("user-query-file-preview") : [];
    },

    // 策略3: 查找文件预览容器
    () => messageContainer.querySelectorAll(".file-preview-container"),

    // 策略4: 查找包含预览图片的容器
    () => {
      const previewImages = messageContainer.querySelectorAll(".preview-image");
      const containers: Element[] = [];
      previewImages.forEach((img) => {
        const container =
          img.closest("user-query-file-preview") ||
          img.closest(".file-preview-container") ||
          img.parentElement;
        if (container && !containers.includes(container)) {
          containers.push(container);
        }
      });
      return containers;
    },

    // 策略5: 查找包含智能镜头链接的容器
    () => {
      const lensLinks = messageContainer.querySelectorAll(
        'a[href*="lens.google.com"]'
      );
      const containers: Element[] = [];
      lensLinks.forEach((link) => {
        const container =
          link.closest("user-query-file-preview") ||
          link.closest(".file-preview-container") ||
          link.parentElement;
        if (container && !containers.includes(container)) {
          containers.push(container);
        }
      });
      return containers;
    },
  ];

  for (let i = 0; i < strategies.length; i++) {
    const containers = Array.from(strategies[i]());
    if (containers.length > 0) {
      console.log(`✅ 使用策略 ${i + 1} 找到 ${containers.length} 个图片容器`);
      return containers;
    }
  }

  console.log("❌ 所有策略都未找到图片容器");
  return [];
}

/**
 * 提取图片URL的多种策略
 */
function extractImageUrl(container: Element): {
  actualUrl: string;
  blobUrl: string;
  method: string;
} {
  let actualUrl = "";
  let blobUrl = "";
  let method = "";

  // 策略1: 从智能镜头链接提取
  const lensLink = container.querySelector(
    'a[href*="lens.google.com"]'
  ) as HTMLAnchorElement;
  if (lensLink && lensLink.href) {
    // 尝试多种URL提取模式
    const patterns = [
      /url=([^&]+)/, // 标准模式
      /uploadbyurl\?url=([^&]+)/, // 完整模式
      /https%3A%2F%2F([^&]+)/, // 编码模式
    ];

    for (const pattern of patterns) {
      const match = lensLink.href.match(pattern);
      if (match) {
        try {
          actualUrl = decodeURIComponent(match[1]);
          method = "lens_link";
          break;
        } catch (e) {
          console.warn("URL解码失败:", match[1]);
        }
      }
    }
  }

  // 策略2: 从预览图片获取blob URL
  const previewImg = container.querySelector(
    ".preview-image"
  ) as HTMLImageElement;
  if (previewImg && previewImg.src) {
    blobUrl = previewImg.src;
    if (!method) method = "blob_url";
  }

  // 策略3: 查找其他可能的图片元素
  if (!blobUrl) {
    const allImages = container.querySelectorAll("img");
    for (const img of allImages) {
      if (
        img.src &&
        (img.src.startsWith("blob:") || img.src.startsWith("data:"))
      ) {
        blobUrl = img.src;
        if (!method) method = "fallback_img";
        break;
      }
    }
  }

  return { actualUrl, blobUrl, method };
}

/**
 * 生成Gemini图片文件名
 */
function generateGeminiImageFilename(index: number, imageUrl: string): string {
  let filename = `gemini-image-${index}`;

  // 尝试从URL中提取文件扩展名
  if (imageUrl) {
    const urlParts = imageUrl.split(".");
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && /^(jpg|jpeg|png|gif|webp|bmp)$/i.test(lastPart)) {
      filename += `.${lastPart.toLowerCase()}`;
    } else {
      filename += ".jpg"; // 默认扩展名
    }
  } else {
    filename += ".jpg";
  }

  return sanitizeFilename(filename);
}

/**
 * 将图片URL转换为base64格式的markdown
 */
async function convertImageToBase64Markdown(
  imageUrl: string,
  filename: string
): Promise<string> {
  try {
    // 尝试多种fetch策略
    let response: Response;

    try {
      // 策略1: 直接fetch
      response = await fetch(imageUrl);
    } catch (fetchError) {
      // 策略2: 使用no-cors模式（可能受限）
      console.warn("直接fetch失败，尝试no-cors模式:", fetchError);
      response = await fetch(imageUrl, { mode: "no-cors" });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();

    // 检查blob是否有效
    if (blob.size === 0) {
      throw new Error("获取到的图片数据为空，可能受到CORS限制");
    }

    const base64 = await blobToBase64(blob);
    const mimeType = blob.type || "image/jpeg";

    return `![${filename}](data:${mimeType};base64,${base64})`;
  } catch (error) {
    console.error(`图片转换失败: ${imageUrl}`, error);
    throw new Error(`Failed to convert image to base64: ${error}`);
  }
}

/**
 * 将Blob转换为base64字符串
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data URL前缀，只保留base64数据
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 下载Gemini图片
 */
async function downloadGeminiImage(
  imageUrl: string,
  filename: string
): Promise<void> {
  try {
    console.log(`🔄 开始下载图片: ${filename}`);
    console.log(`📍 图片URL: ${imageUrl}`);

    // 尝试多种下载策略
    let blob: Blob;

    try {
      // 策略1: 直接fetch
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      blob = await response.blob();
    } catch (fetchError) {
      console.warn(`直接fetch失败: ${fetchError.message}`);

      // 策略2: 尝试使用Image对象和Canvas转换
      try {
        blob = await downloadImageViaCanvas(imageUrl);
        console.log("✅ 使用Canvas方法成功获取图片");
      } catch (canvasError) {
        console.warn(`Canvas方法失败: ${canvasError.message}`);
        throw new Error(
          `所有下载策略都失败了: fetch(${fetchError.message}), canvas(${canvasError.message})`
        );
      }
    }

    // 检查blob是否有效
    if (blob.size === 0) {
      throw new Error("获取到的图片数据为空");
    }

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`✅ 图片下载成功: ${filename} (${blob.size} bytes)`);
  } catch (error) {
    console.error(`❌ 图片下载失败: ${filename} - ${error}`);
    throw error;
  }
}

/**
 * 使用Canvas方法下载图片（绕过某些CORS限制）
 */
async function downloadImageViaCanvas(imageUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // 设置跨域属性
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        // 创建canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("无法获取Canvas上下文"));
          return;
        }

        // 设置canvas尺寸
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 绘制图片
        ctx.drawImage(img, 0, 0);

        // 转换为blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas转换为Blob失败"));
            }
          },
          "image/jpeg",
          0.9
        );
      } catch (error) {
        reject(new Error(`Canvas处理失败: ${error}`));
      }
    };

    img.onerror = () => {
      reject(new Error("图片加载失败"));
    };

    // 开始加载图片
    img.src = imageUrl;
  });
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
 * 批量下载Gemini对话中的图片
 */
export async function downloadGeminiImages(): Promise<{
  success: boolean;
  downloadedFiles: string[];
  errors: string[];
}> {
  const downloadedFiles: string[] = [];
  const errors: string[] = [];

  try {
    console.log("🔍 开始批量下载Gemini图片...");

    // 使用全局查找策略
    const imageContainers = findAllImageContainers();
    console.log(`📥 找到 ${imageContainers.length} 个图片容器`);

    if (imageContainers.length === 0) {
      return {
        success: false,
        downloadedFiles: [],
        errors: ["未找到任何图片容器"],
      };
    }

    for (let i = 0; i < imageContainers.length; i++) {
      const container = imageContainers[i];
      const { actualUrl, blobUrl, method } = extractImageUrl(container);

      if (actualUrl) {
        const filename = generateGeminiImageFilename(i + 1, actualUrl);
        console.log(`📥 下载图片 ${i + 1}: ${filename} (${method})`);

        try {
          await downloadGeminiImage(actualUrl, filename);
          downloadedFiles.push(filename);
          console.log(`✅ 下载成功: ${filename}`);
        } catch (error) {
          const errorMsg = `下载失败 ${filename}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      } else if (blobUrl) {
        const filename = generateGeminiImageFilename(i + 1, blobUrl);
        const errorMsg = `无法下载 ${filename}: 仅有blob URL，无实际下载地址`;
        errors.push(errorMsg);
        console.warn(errorMsg);
      } else {
        const errorMsg = `图片容器 ${i + 1}: 未找到有效的图片URL`;
        errors.push(errorMsg);
        console.warn(errorMsg);
      }
    }

    console.log(
      `✅ 批量下载完成，成功: ${downloadedFiles.length}, 失败: ${errors.length}`
    );

    return {
      success: errors.length === 0,
      downloadedFiles,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      downloadedFiles,
      errors: [errorMsg],
    };
  }
}

/**
 * 全局查找所有图片容器
 */
function findAllImageContainers(): Element[] {
  const strategies = [
    () => Array.from(document.querySelectorAll("user-query-file-preview")),
    () => Array.from(document.querySelectorAll(".file-preview-container")),
    () => {
      const previewImages = document.querySelectorAll(".preview-image");
      const containers: Element[] = [];
      previewImages.forEach((img) => {
        const container =
          img.closest("user-query-file-preview") ||
          img.closest(".file-preview-container") ||
          img.parentElement;
        if (container && !containers.includes(container)) {
          containers.push(container);
        }
      });
      return containers;
    },
    () => {
      const lensLinks = document.querySelectorAll('a[href*="lens.google.com"]');
      const containers: Element[] = [];
      lensLinks.forEach((link) => {
        const container =
          link.closest("user-query-file-preview") ||
          link.closest(".file-preview-container") ||
          link.parentElement;
        if (container && !containers.includes(container)) {
          containers.push(container);
        }
      });
      return containers;
    },
  ];

  for (let i = 0; i < strategies.length; i++) {
    const containers = strategies[i]();
    if (containers.length > 0) {
      console.log(`✅ 全局策略 ${i + 1} 找到 ${containers.length} 个图片容器`);
      return containers;
    }
  }

  console.log("❌ 所有全局策略都未找到图片容器");
  return [];
}

/**
 * 获取Gemini对话中的图片信息（不下载）
 */
export async function getGeminiImageInfo(): Promise<{
  imageCount: number;
  images: Array<{
    filename: string;
    url: string;
    blobUrl?: string;
    method: string;
  }>;
}> {
  const images: Array<{
    filename: string;
    url: string;
    blobUrl?: string;
    method: string;
  }> = [];

  // 使用全局查找策略
  const imageContainers = findAllImageContainers();

  for (let i = 0; i < imageContainers.length; i++) {
    const container = imageContainers[i];
    const { actualUrl, blobUrl, method } = extractImageUrl(container);

    const filename = generateGeminiImageFilename(i + 1, actualUrl || blobUrl);

    images.push({
      filename,
      url: actualUrl,
      blobUrl: blobUrl,
      method: method,
    });
  }

  return {
    imageCount: images.length,
    images,
  };
}
