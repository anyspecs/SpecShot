export interface DownloadResult {
  success: boolean;
  file?: File;
  filename?: string;
  error?: string;
}

export class DownloadMonitor {
  private static instance: DownloadMonitor;
  private downloadPromises: Map<string, { resolve: Function; reject: Function }> = new Map();

  static getInstance(): DownloadMonitor {
    if (!DownloadMonitor.instance) {
      DownloadMonitor.instance = new DownloadMonitor();
    }
    return DownloadMonitor.instance;
  }

  constructor() {
    this.setupDownloadListeners();
  }

  private setupDownloadListeners() {
    if (typeof browser !== 'undefined' && browser.downloads) {
      // 监听下载开始
      browser.downloads.onCreated.addListener((downloadItem) => {
        console.log('📥 下载开始:', downloadItem.filename);
        
        // 检查是否是相关文件(.docx文件或Kimi相关)
        if (this.isKimiDownload(downloadItem)) {
          console.log('🎯 检测到目标文件下载:', downloadItem.filename);
        }
      });

      // 监听下载完成
      browser.downloads.onChanged.addListener((downloadDelta) => {
        if (downloadDelta.state?.current === 'complete') {
          console.log('✅ 下载完成:', downloadDelta.id);
          this.handleDownloadComplete(downloadDelta.id);
        } else if (downloadDelta.state?.current === 'interrupted') {
          console.log('❌ 下载中断:', downloadDelta.id);
          this.handleDownloadError(downloadDelta.id, '下载被中断');
        }
      });
    }
  }

  private isKimiDownload(downloadItem: any): boolean {
    const filename = downloadItem.filename?.toLowerCase() || '';
    const url = downloadItem.url?.toLowerCase() || '';
    
    console.log('🔍 检查下载文件:', {
      filename: downloadItem.filename,
      url: downloadItem.url,
      mime: downloadItem.mime
    });
    
    const isMatch = (
      filename.includes('kimi') ||
      filename.includes('论文') ||
      filename.includes('总结') ||
      filename.includes('训练') ||
      filename.endsWith('.docx') ||
      url.includes('kimi') ||
      url.includes('moonshot') ||
      downloadItem.mime?.includes('wordprocessingml')
    );
    
    console.log('📋 文件匹配结果:', isMatch);
    return isMatch;
  }

  private async handleDownloadComplete(downloadId: number) {
    try {
      // 获取下载项详情
      const downloads = await browser.downloads.search({ id: downloadId });
      const downloadItem = downloads[0];
      
      if (!downloadItem) {
        throw new Error('下载项未找到');
      }

      console.log('📁 下载文件信息:', {
        filename: downloadItem.filename,
        state: downloadItem.state,
        mime: downloadItem.mime,
        size: downloadItem.fileSize
      });
      
      // 检查是否是我们关心的文件
      if (this.isKimiDownload(downloadItem)) {
        console.log('✅ 目标文件下载完成:', downloadItem.filename);
        
        // 通知所有等待中的Promise（不区分具体文件名）
        this.downloadPromises.forEach(async (promise, key) => {
          try {
            // 读取文件内容
            const file = await this.readDownloadedFile(downloadItem);
            promise.resolve({
              success: true,
              file,
              filename: downloadItem.filename
            });
          } catch (error: any) {
            promise.reject(error);
          }
        });
        
        // 清空所有等待中的Promise
        this.downloadPromises.clear();
      }
    } catch (error: any) {
      console.error('处理下载完成失败:', error);
      this.handleDownloadError(downloadId, error.message);
    }
  }

  private handleDownloadError(downloadId: number, error: string) {
    // 通知所有等待中的Promise
    this.downloadPromises.forEach((promise, filename) => {
      promise.reject(new Error(error));
    });
    this.downloadPromises.clear();
  }

  private async readDownloadedFile(downloadItem: any): Promise<File> {
    // 注意：直接读取下载文件在浏览器扩展中有限制
    // 这里返回一个模拟的File对象，实际项目中需要其他方法
    const response = await fetch(downloadItem.url);
    const blob = await response.blob();
    
    return new File([blob], downloadItem.filename, {
      type: downloadItem.mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  // 等待特定文件下载完成
  async waitForDownload(expectedFilename?: string, timeout: number = 30000): Promise<DownloadResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const key = expectedFilename || 'unknown';
        this.downloadPromises.delete(key);
        reject(new Error('下载超时'));
      }, timeout);

      const wrappedResolve = (result: DownloadResult) => {
        clearTimeout(timeoutId);
        resolve(result);
      };

      const wrappedReject = (error: Error) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      const key = expectedFilename || 'unknown';
      this.downloadPromises.set(key, {
        resolve: wrappedResolve,
        reject: wrappedReject
      });
    });
  }

  // 清理所有等待中的下载
  cleanup() {
    this.downloadPromises.forEach((promise) => {
      promise.reject(new Error('下载监听器被清理'));
    });
    this.downloadPromises.clear();
  }
}