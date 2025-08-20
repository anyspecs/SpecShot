export interface ImageInfo {
  url: string;
  filename: string;
  alt?: string;
  blob?: Blob;
}

export interface ImageDownloadResult {
  success: boolean;
  images: ImageInfo[];
  errors: string[];
}

/**
 * Claude图片URL处理器
 * 处理Claude特有的API格式图片URL
 */
export class ClaudeImageProcessor {
  /**
   * 从Claude页面提取所有图片信息
   * 基于测试脚本的成功实现
   */
  static async extractImages(): Promise<ImageInfo[]> {
    const images: ImageInfo[] = [];

    // 查找所有Claude图片元素（使用与测试脚本相同的选择器）
    const imageElements = document.querySelectorAll(
      '.group\\/thumbnail img[src*="/api/"][src*="/files/"][src*="/preview"]'
    );

    console.log(`🔍 找到 ${imageElements.length} 张Claude图片`);

    // 使用传统for循环避免迭代器问题
    for (let i = 0; i < imageElements.length; i++) {
      const img = imageElements[i] as HTMLImageElement;
      const url = img.src;
      const alt = img.alt || "claude-image";

      // 从data-testid或alt属性获取文件名（与测试脚本一致）
      const container = img.closest("[data-testid]");
      const filename =
        container?.getAttribute("data-testid") || alt || "image.png";

      images.push({
        url,
        filename: this.sanitizeFilename(filename),
        alt,
      });
    }

    console.log(`✅ 提取了 ${images.length} 张图片信息`);
    return images;
  }

  /**
   * 下载单个图片并转换为blob
   */
  static async downloadImage(imageUrl: string): Promise<Blob> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(
        `Failed to download image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 批量下载所有图片
   */
  static async downloadAllImages(): Promise<ImageDownloadResult> {
    const result: ImageDownloadResult = {
      success: true,
      images: [],
      errors: [],
    };

    try {
      const imageInfos = await this.extractImages();

      if (imageInfos.length === 0) {
        return result;
      }

      // 并行下载所有图片
      const downloadPromises = imageInfos.map(async (info) => {
        try {
          const blob = await this.downloadImage(info.url);
          return { ...info, blob };
        } catch (error) {
          result.errors.push(
            `Failed to download ${info.filename}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          result.success = false;
          return info; // 返回原始信息，但没有blob
        }
      });

      result.images = await Promise.all(downloadPromises);
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Failed to extract images: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return result;
  }

  /**
   * 创建图片下载链接并触发下载
   */
  static downloadImageBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 批量下载图片文件
   */
  static async batchDownloadImages(): Promise<string[]> {
    const result = await this.downloadAllImages();
    const downloadedFiles: string[] = [];

    for (const image of result.images) {
      if (image.blob) {
        this.downloadImageBlob(image.blob, image.filename);
        downloadedFiles.push(image.filename);
      }
    }

    return downloadedFiles;
  }

  /**
   * 清理文件名，移除非法字符
   */
  private static sanitizeFilename(filename: string): string {
    // 移除或替换文件名中的非法字符
    return filename
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, "_")
      .substring(0, 100); // 限制文件名长度
  }

  /**
   * 将图片转换为Base64数据URL
   */
  static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取图片的base64数据并返回markdown格式
   */
  static async getImageAsMarkdownBase64(
    imageUrl: string,
    filename: string
  ): Promise<string> {
    try {
      const blob = await this.downloadImage(imageUrl);
      const base64 = await this.blobToDataURL(blob);
      const mimeType = this.getImageMimeType(blob);

      // 返回markdown格式的图片
      return `![${filename}](${base64} "${filename}")`;
    } catch (error) {
      console.error(`Failed to convert image to base64: ${error}`);
      // 返回占位符
      return `![${filename}](${imageUrl} "${filename} - 无法转换为base64")`;
    }
  }

  /**
   * 批量获取所有图片的base64格式，用于嵌入markdown
   * 基于测试脚本的成功实现
   */
  static async getAllImagesAsBase64(): Promise<
    Array<{
      filename: string;
      url: string;
      base64: string;
      markdown: string;
      size?: number;
      type?: string;
      error?: string;
    }>
  > {
    const images = await this.extractImages();
    const results = [];

    console.log(`🔄 开始转换 ${images.length} 张图片为base64...`);

    if (images.length === 0) {
      console.log("ℹ️ 当前页面没有Claude格式的图片");
      return results;
    }

    // 使用传统for循环避免迭代器问题
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        console.log(`📥 下载图片: ${image.filename}`);
        const blob = await this.downloadImage(image.url);

        console.log(
          `🔄 转换为base64: ${image.filename} (${
            blob.size
          } bytes, ${this.getImageMimeType(blob)})`
        );
        const base64 = await this.blobToDataURL(blob);
        const markdown = `![${image.filename}](${base64} "${image.filename}")`;

        results.push({
          filename: image.filename,
          url: image.url,
          base64,
          markdown,
          size: blob.size,
          type: blob.type,
        });

        console.log(`✅ 图片转换成功: ${image.filename}`);
      } catch (error) {
        console.error(`❌ 图片转换失败: ${image.filename} - ${error}`);
        results.push({
          filename: image.filename,
          url: image.url,
          base64: "",
          markdown: `![${image.filename}](${image.url} "${image.filename} - 转换失败")`,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.base64).length;
    const failed = results.filter((r) => r.error).length;
    console.log(`📊 转换结果: ${successful} 成功, ${failed} 失败`);

    return results;
  }

  /**
   * 获取图片的MIME类型
   */
  static getImageMimeType(blob: Blob): string {
    return blob.type || "image/png";
  }

  /**
   * 检查URL是否为Claude图片API
   */
  static isClaudeImageUrl(url: string): boolean {
    return (
      url.includes("/api/") &&
      url.includes("/files/") &&
      url.includes("/preview")
    );
  }
}
/**
 * 豆包图片URL处理器
 * 处理豆包特有的CDN格式图片URL
 */
export class DoubaoImageProcessor {
  /**
   * 从豆包页面提取所有图片信息
   */
  static async extractImages(): Promise<ImageInfo[]> {
    const images: ImageInfo[] = [];

    // 查找所有豆包图片元素
    const imageContainers = document.querySelectorAll(
      ".container-vWPG4p.clickable-zqugHB"
    );

    console.log(`🔍 找到 ${imageContainers.length} 个豆包图片容器`);

    for (let i = 0; i < imageContainers.length; i++) {
      const container = imageContainers[i];
      const img = container.querySelector("picture img") as HTMLImageElement;

      if (!img) continue;

      // 获取图片URL，优先使用srcset中的高质量版本
      let imageUrl = img.src;
      const srcset = img.srcset;

      if (srcset) {
        const srcsetEntries = srcset.split(",").map((entry) => entry.trim());
        const highQualityEntry =
          srcsetEntries.find((entry) => entry.includes("2x")) ||
          srcsetEntries[0];
        if (highQualityEntry) {
          imageUrl = highQualityEntry.split(" ")[0];
        }
      }

      const alt = img.alt || "doubao-image";
      const filename = this.generateImageFilename(imageUrl, alt, i);

      images.push({
        url: imageUrl,
        filename: this.sanitizeFilename(filename),
        alt,
      });
    }

    console.log(`✅ 提取了 ${images.length} 张豆包图片信息`);
    return images;
  }

  /**
   * 下载单个图片并转换为blob
   */
  static async downloadImage(imageUrl: string): Promise<Blob> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(
        `Failed to download doubao image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 批量下载所有图片
   */
  static async downloadAllImages(): Promise<ImageDownloadResult> {
    const result: ImageDownloadResult = {
      success: true,
      images: [],
      errors: [],
    };

    try {
      const imageInfos = await this.extractImages();

      if (imageInfos.length === 0) {
        return result;
      }

      // 并行下载所有图片
      const downloadPromises = imageInfos.map(async (info) => {
        try {
          const blob = await this.downloadImage(info.url);
          return { ...info, blob };
        } catch (error) {
          result.errors.push(
            `Failed to download ${info.filename}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          result.success = false;
          return info;
        }
      });

      result.images = await Promise.all(downloadPromises);
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Failed to extract doubao images: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return result;
  }

  /**
   * 创建图片下载链接并触发下载
   */
  static downloadImageBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 批量下载图片文件
   */
  static async batchDownloadImages(): Promise<string[]> {
    const result = await this.downloadAllImages();
    const downloadedFiles: string[] = [];

    for (const image of result.images) {
      if (image.blob) {
        this.downloadImageBlob(image.blob, image.filename);
        downloadedFiles.push(image.filename);
      }
    }

    return downloadedFiles;
  }

  /**
   * 将图片转换为Base64数据URL
   */
  static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取图片的base64数据并返回markdown格式
   */
  static async getImageAsMarkdownBase64(
    imageUrl: string,
    filename: string
  ): Promise<string> {
    try {
      const blob = await this.downloadImage(imageUrl);
      const base64 = await this.blobToDataURL(blob);

      // 返回markdown格式的图片
      return `![${filename}](${base64} "${filename}")`;
    } catch (error) {
      console.error(`Failed to convert doubao image to base64: ${error}`);
      // 返回占位符
      return `![${filename}](${imageUrl} "${filename} - 无法转换为base64")`;
    }
  }

  /**
   * 生成豆包图片文件名
   */
  private static generateImageFilename(
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
      return cleanName;
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

    return `${baseName}-${index + 1}${extension}`;
  }

  /**
   * 清理文件名，移除非法字符
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, "_")
      .substring(0, 100);
  }

  /**
   * 获取图片的MIME类型
   */
  static getImageMimeType(blob: Blob): string {
    return blob.type || "image/png";
  }

  /**
   * 检查URL是否为豆包图片CDN
   */
  static isDoubaoImageUrl(url: string): boolean {
    return (
      url.includes("byteimg.com") ||
      url.includes("doubao.com") ||
      url.includes("tplv-")
    );
  }
}

/**
 * ChatGPT图片URL处理器
 * 处理ChatGPT特有的图片URL格式
 */
export class ChatGPTImageProcessor {
  /**
   * 从ChatGPT页面提取所有图片信息
   */
  static async extractImages(): Promise<ImageInfo[]> {
    const images: ImageInfo[] = [];

    // ChatGPT图片的常见选择器
    const imageSelectors = [
      // 用户上传的图片
      'img[src*="files.oaiusercontent.com"]',
      'img[src*="cdn.openai.com"]',
      // 生成的图片
      'img[src*="oaidalleapiprodscus.blob.core.windows.net"]',
      'img[src*="dalle-3"]',
      // 其他可能的图片格式
      '[data-message-author-role] img[src^="data:image"]',
      '[data-message-author-role] img[src^="blob:"]',
      '[data-message-author-role] img[src^="http"]',
    ];

    console.log(`🔍 开始查找ChatGPT图片...`);

    for (const selector of imageSelectors) {
      const imageElements = document.querySelectorAll(selector);
      console.log(
        `📸 选择器 "${selector}" 找到 ${imageElements.length} 张图片`
      );

      for (let i = 0; i < imageElements.length; i++) {
        const img = imageElements[i] as HTMLImageElement;
        const url = img.src;
        const alt = img.alt || "chatgpt-image";

        // 跳过已经处理过的图片
        if (images.some((existing) => existing.url === url)) {
          continue;
        }

        // 生成文件名
        const filename = this.generateImageFilename(url, alt, images.length);

        images.push({
          url,
          filename: this.sanitizeFilename(filename),
          alt,
        });
      }
    }

    console.log(`✅ 提取了 ${images.length} 张ChatGPT图片信息`);
    return images;
  }

  /**
   * 下载单个图片并转换为blob
   */
  static async downloadImage(imageUrl: string): Promise<Blob> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(
        `Failed to download ChatGPT image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 批量下载所有图片
   */
  static async downloadAllImages(): Promise<ImageDownloadResult> {
    const result: ImageDownloadResult = {
      success: true,
      images: [],
      errors: [],
    };

    try {
      const imageInfos = await this.extractImages();

      if (imageInfos.length === 0) {
        return result;
      }

      // 并行下载所有图片
      const downloadPromises = imageInfos.map(async (info) => {
        try {
          const blob = await this.downloadImage(info.url);
          return { ...info, blob };
        } catch (error) {
          result.errors.push(
            `Failed to download ${info.filename}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          result.success = false;
          return info;
        }
      });

      result.images = await Promise.all(downloadPromises);
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Failed to extract ChatGPT images: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return result;
  }

  /**
   * 创建图片下载链接并触发下载
   */
  static downloadImageBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 批量下载图片文件
   */
  static async batchDownloadImages(): Promise<string[]> {
    const result = await this.downloadAllImages();
    const downloadedFiles: string[] = [];

    for (const image of result.images) {
      if (image.blob) {
        this.downloadImageBlob(image.blob, image.filename);
        downloadedFiles.push(image.filename);
      }
    }

    return downloadedFiles;
  }

  /**
   * 将图片转换为Base64数据URL
   */
  static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取图片的base64数据并返回markdown格式
   */
  static async getImageAsMarkdownBase64(
    imageUrl: string,
    filename: string
  ): Promise<string> {
    try {
      const blob = await this.downloadImage(imageUrl);
      const base64 = await this.blobToDataURL(blob);

      // 返回markdown格式的图片
      return `![${filename}](${base64} "${filename}")`;
    } catch (error) {
      console.error(`Failed to convert ChatGPT image to base64: ${error}`);
      // 返回占位符
      return `![${filename}](${imageUrl} "${filename} - 无法转换为base64")`;
    }
  }

  /**
   * 批量获取所有图片的base64格式，用于嵌入markdown
   */
  static async getAllImagesAsBase64(): Promise<
    Array<{
      filename: string;
      url: string;
      base64: string;
      markdown: string;
      size?: number;
      type?: string;
      error?: string;
    }>
  > {
    const images = await this.extractImages();
    const results = [];

    console.log(`🔄 开始转换 ${images.length} 张ChatGPT图片为base64...`);

    if (images.length === 0) {
      console.log("ℹ️ 当前页面没有ChatGPT格式的图片");
      return results;
    }

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        console.log(`📥 下载图片: ${image.filename}`);
        const blob = await this.downloadImage(image.url);

        console.log(
          `🔄 转换为base64: ${image.filename} (${
            blob.size
          } bytes, ${this.getImageMimeType(blob)})`
        );
        const base64 = await this.blobToDataURL(blob);
        const markdown = `![${image.filename}](${base64} "${image.filename}")`;

        results.push({
          filename: image.filename,
          url: image.url,
          base64,
          markdown,
          size: blob.size,
          type: blob.type,
        });

        console.log(`✅ 图片转换成功: ${image.filename}`);
      } catch (error) {
        console.error(`❌ 图片转换失败: ${image.filename} - ${error}`);
        results.push({
          filename: image.filename,
          url: image.url,
          base64: "",
          markdown: `![${image.filename}](${image.url} "${image.filename} - 转换失败")`,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.base64).length;
    const failed = results.filter((r) => r.error).length;
    console.log(`📊 转换结果: ${successful} 成功, ${failed} 失败`);

    return results;
  }

  /**
   * 生成ChatGPT图片文件名
   */
  private static generateImageFilename(
    url: string,
    alt: string,
    index: number
  ): string {
    // 尝试从URL中提取文件名
    if (url.includes("files.oaiusercontent.com")) {
      // 用户上传的文件，尝试提取原始文件名
      const match = url.match(/\/([^\/\?]+)(?:\?|$)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    if (url.includes("oaidalleapiprodscus.blob.core.windows.net")) {
      // DALL-E生成的图片
      return `dalle-generated-${index + 1}.png`;
    }

    if (url.startsWith("data:image")) {
      // Base64图片
      const mimeMatch = url.match(/data:image\/([^;]+)/);
      const extension = mimeMatch ? mimeMatch[1] : "png";
      return `chatgpt-image-${index + 1}.${extension}`;
    }

    // 默认命名
    const baseName = alt || "chatgpt-image";
    const extension = this.getExtensionFromUrl(url) || "png";
    return `${baseName}-${index + 1}.${extension}`;
  }

  /**
   * 从URL中提取文件扩展名
   */
  private static getExtensionFromUrl(url: string): string | null {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1] : null;
  }

  /**
   * 清理文件名，移除非法字符
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, "_")
      .substring(0, 100);
  }

  /**
   * 获取图片的MIME类型
   */
  static getImageMimeType(blob: Blob): string {
    return blob.type || "image/png";
  }

  /**
   * 检查URL是否为ChatGPT图片
   */
  static isChatGPTImageUrl(url: string): boolean {
    return (
      url.includes("files.oaiusercontent.com") ||
      url.includes("cdn.openai.com") ||
      url.includes("oaidalleapiprodscus.blob.core.windows.net") ||
      url.includes("dalle-3") ||
      url.startsWith("data:image") ||
      url.startsWith("blob:")
    );
  }
}

/**
 * AI Studio图片URL处理器
 * 处理AI Studio特有的blob URL格式
 */
export class AIStudioImageProcessor {
  /**
   * 从AI Studio页面提取所有图片信息
   */
  static async extractImages(): Promise<ImageInfo[]> {
    const images: ImageInfo[] = [];

    // 查找所有AI Studio图片元素
    const imageChunks = document.querySelectorAll("ms-image-chunk");

    console.log(`🔍 找到 ${imageChunks.length} 个AI Studio图片块`);

    for (let i = 0; i < imageChunks.length; i++) {
      const chunk = imageChunks[i];
      const img = chunk.querySelector("img") as HTMLImageElement;

      if (!img) continue;

      const url = img.src;
      const alt = img.alt || "aistudio-image";

      // 跳过已经处理过的图片
      if (images.some((existing) => existing.url === url)) {
        continue;
      }

      // 生成文件名
      const filename = this.generateImageFilename(url, alt, images.length);

      images.push({
        url,
        filename: this.sanitizeFilename(filename),
        alt,
      });
    }

    console.log(`✅ 提取了 ${images.length} 张AI Studio图片信息`);
    return images;
  }

  /**
   * 下载单个图片并转换为blob
   * 注意：blob: URLs需要特殊处理
   */
  static async downloadImage(imageUrl: string): Promise<Blob> {
    try {
      // 对于blob: URL，直接通过fetch获取
      if (imageUrl.startsWith("blob:")) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.blob();
      }

      // 对于普通HTTP URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(
        `Failed to download AI Studio image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * 批量下载所有图片
   */
  static async downloadAllImages(): Promise<ImageDownloadResult> {
    const result: ImageDownloadResult = {
      success: true,
      images: [],
      errors: [],
    };

    try {
      const imageInfos = await this.extractImages();

      if (imageInfos.length === 0) {
        return result;
      }

      // 并行下载所有图片
      const downloadPromises = imageInfos.map(async (info) => {
        try {
          const blob = await this.downloadImage(info.url);
          return { ...info, blob };
        } catch (error) {
          result.errors.push(
            `Failed to download ${info.filename}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          result.success = false;
          return info;
        }
      });

      result.images = await Promise.all(downloadPromises);
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Failed to extract AI Studio images: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return result;
  }

  /**
   * 创建图片下载链接并触发下载
   */
  static downloadImageBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 批量下载图片文件
   */
  static async batchDownloadImages(): Promise<string[]> {
    const result = await this.downloadAllImages();
    const downloadedFiles: string[] = [];

    for (const image of result.images) {
      if (image.blob) {
        this.downloadImageBlob(image.blob, image.filename);
        downloadedFiles.push(image.filename);
      }
    }

    return downloadedFiles;
  }

  /**
   * 将图片转换为Base64数据URL
   */
  static async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 获取图片的base64数据并返回markdown格式
   */
  static async getImageAsMarkdownBase64(
    imageUrl: string,
    filename: string
  ): Promise<string> {
    try {
      const blob = await this.downloadImage(imageUrl);
      const base64 = await this.blobToDataURL(blob);

      // 返回markdown格式的图片
      return `![${filename}](${base64} "${filename}")`;
    } catch (error) {
      console.error(`Failed to convert AI Studio image to base64: ${error}`);
      // 返回占位符
      return `![${filename}](${imageUrl} "${filename} - 无法转换为base64")`;
    }
  }

  /**
   * 批量获取所有图片的base64格式，用于嵌入markdown
   */
  static async getAllImagesAsBase64(): Promise<
    Array<{
      filename: string;
      url: string;
      base64: string;
      markdown: string;
      size?: number;
      type?: string;
      error?: string;
    }>
  > {
    const images = await this.extractImages();
    const results = [];

    console.log(`🔄 开始转换 ${images.length} 张AI Studio图片为base64...`);

    if (images.length === 0) {
      console.log("ℹ️ 当前页面没有AI Studio格式的图片");
      return results;
    }

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        console.log(`📥 下载图片: ${image.filename}`);
        const blob = await this.downloadImage(image.url);

        console.log(
          `🔄 转换为base64: ${image.filename} (${
            blob.size
          } bytes, ${this.getImageMimeType(blob)})`
        );
        const base64 = await this.blobToDataURL(blob);
        const markdown = `![${image.filename}](${base64} "${image.filename}")`;

        results.push({
          filename: image.filename,
          url: image.url,
          base64,
          markdown,
          size: blob.size,
          type: blob.type,
        });

        console.log(`✅ 图片转换成功: ${image.filename}`);
      } catch (error) {
        console.error(`❌ 图片转换失败: ${image.filename} - ${error}`);
        results.push({
          filename: image.filename,
          url: image.url,
          base64: "",
          markdown: `![${image.filename}](${image.url} "${image.filename} - 转换失败")`,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successful = results.filter((r) => r.base64).length;
    const failed = results.filter((r) => r.error).length;
    console.log(`📊 转换结果: ${successful} 成功, ${failed} 失败`);

    return results;
  }

  /**
   * 生成AI Studio图片文件名
   */
  private static generateImageFilename(
    url: string,
    alt: string,
    index: number
  ): string {
    // 对于blob URL，生成基于alt和索引的文件名
    if (url.startsWith("blob:")) {
      const baseName = alt || "aistudio-image";
      return `${baseName}-${index + 1}.png`;
    }

    // 尝试从URL中提取文件名
    const urlParts = url.split("/");
    const lastPart = urlParts[urlParts.length - 1];

    if (lastPart.includes(".")) {
      const cleanName = lastPart.split("?")[0]; // 移除查询参数
      return cleanName;
    }

    // 否则生成一个基于alt和索引的文件名
    const baseName = alt || "aistudio-image";
    const extension = this.getExtensionFromUrl(url) || "png";
    return `${baseName}-${index + 1}.${extension}`;
  }

  /**
   * 从URL中提取文件扩展名
   */
  private static getExtensionFromUrl(url: string): string | null {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1] : null;
  }

  /**
   * 清理文件名，移除非法字符
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, "_")
      .substring(0, 100);
  }

  /**
   * 获取图片的MIME类型
   */
  static getImageMimeType(blob: Blob): string {
    return blob.type || "image/png";
  }

  /**
   * 检查URL是否为AI Studio图片
   */
  static isAIStudioImageUrl(url: string): boolean {
    return (
      url.startsWith("blob:https://aistudio.google.com/") ||
      url.includes("aistudio.google.com") ||
      url.includes("googleusercontent.com")
    );
  }
}
