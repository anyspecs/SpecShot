export enum KimiError {
  PLATFORM_NOT_DETECTED = 'PLATFORM_NOT_DETECTED',
  CHAT_NOT_READY = 'CHAT_NOT_READY',
  SHARE_BUTTON_NOT_FOUND = 'SHARE_BUTTON_NOT_FOUND',
  EXPORT_BUTTON_NOT_FOUND = 'EXPORT_BUTTON_NOT_FOUND',
  DOWNLOAD_TIMEOUT = 'DOWNLOAD_TIMEOUT',
  PARSER_NAVIGATION_FAILED = 'PARSER_NAVIGATION_FAILED',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
}

export interface ErrorResult {
  error: KimiError;
  message: string;
  userGuidance?: string;
  retryable: boolean;
}

export class KimiErrorHandler {
  private static errorMessages: Record<KimiError, string> = {
    [KimiError.PLATFORM_NOT_DETECTED]: 'Kimi平台未检测到',
    [KimiError.CHAT_NOT_READY]: '聊天页面未加载完成',
    [KimiError.SHARE_BUTTON_NOT_FOUND]: '分享按钮未找到',
    [KimiError.EXPORT_BUTTON_NOT_FOUND]: '导出按钮未找到',
    [KimiError.DOWNLOAD_TIMEOUT]: '文件下载超时',
    [KimiError.PARSER_NAVIGATION_FAILED]: '跳转解析网站失败',
    [KimiError.UNEXPECTED_ERROR]: '未知错误'
  };

  private static userGuidance: Record<KimiError, string> = {
    [KimiError.PLATFORM_NOT_DETECTED]: '请确保在Kimi聊天页面使用此功能',
    [KimiError.CHAT_NOT_READY]: '请等待页面完全加载后再试',
    [KimiError.SHARE_BUTTON_NOT_FOUND]: '请手动点击页面右下角的分享图标 📤',
    [KimiError.EXPORT_BUTTON_NOT_FOUND]: '请在分享弹窗中手动点击"导出word"按钮 📄',
    [KimiError.DOWNLOAD_TIMEOUT]: '请检查浏览器下载设置，确保允许文件下载',
    [KimiError.PARSER_NAVIGATION_FAILED]: '解析网站可能暂时不可用，请稍后重试',
    [KimiError.UNEXPECTED_ERROR]: '请刷新页面后重试，或联系技术支持'
  };

  private static retryableErrors: Set<KimiError> = new Set([
    KimiError.CHAT_NOT_READY,
    KimiError.SHARE_BUTTON_NOT_FOUND,
    KimiError.EXPORT_BUTTON_NOT_FOUND,
    KimiError.DOWNLOAD_TIMEOUT
  ]);

  static createError(error: KimiError, details?: string): ErrorResult {
    return {
      error,
      message: this.errorMessages[error] + (details ? `: ${details}` : ''),
      userGuidance: this.userGuidance[error],
      retryable: this.retryableErrors.has(error)
    };
  }

  static fromException(exception: any): ErrorResult {
    console.error('Kimi automation error:', exception);
    
    // 尝试从错误信息中识别具体错误类型
    const message = exception?.message || String(exception);
    
    if (message.includes('分享') || message.includes('share')) {
      return this.createError(KimiError.SHARE_BUTTON_NOT_FOUND, message);
    }
    
    if (message.includes('导出') || message.includes('export')) {
      return this.createError(KimiError.EXPORT_BUTTON_NOT_FOUND, message);
    }
    
    if (message.includes('下载') || message.includes('download')) {
      return this.createError(KimiError.DOWNLOAD_TIMEOUT, message);
    }
    
    return this.createError(KimiError.UNEXPECTED_ERROR, message);
  }

  static shouldRetry(error: ErrorResult, attemptCount: number, maxAttempts: number = 3): boolean {
    return error.retryable && attemptCount < maxAttempts;
  }
}