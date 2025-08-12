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
