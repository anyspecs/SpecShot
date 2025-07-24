export interface ParserConfig {
  url: string;
  source: string;
  timestamp: number;
  chatId?: string;
  metadata?: Record<string, string>;
}

export class ParserNavigator {
  private static readonly DEFAULT_PARSER_URL = 'file:///Users/jike/Documents/code/histroy_extract/mock-parser.html';
  
  private static getCurrentChatId(): string {
    try {
      // 尝试从URL中提取聊天ID
      const pathMatch = window.location.pathname.match(/\/chat\/([^\/]+)/);
      if (pathMatch) return pathMatch[1];
      
      // 尝试从页面元素中提取
      const chatElement = document.querySelector('[data-chat-id]');
      if (chatElement) return chatElement.getAttribute('data-chat-id') || '';
      
      // 生成临时ID
      return `kimi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch {
      return `fallback_${Date.now()}`;
    }
  }

  private static gatherMetadata(): Record<string, string> {
    try {
      return {
        title: document.title || 'Kimi Chat',
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent.slice(0, 100) // 截取前100字符避免过长
      };
    } catch {
      return {};
    }
  }

  static createParserUrl(customUrl?: string): string {
    const baseUrl = customUrl || this.DEFAULT_PARSER_URL;
    const config: ParserConfig = {
      url: baseUrl,
      source: 'kimi',
      timestamp: Date.now(),
      chatId: this.getCurrentChatId(),
      metadata: this.gatherMetadata()
    };

    try {
      const parserUrl = new URL(baseUrl);
      
      // 添加基础参数
      parserUrl.searchParams.set('source', config.source);
      parserUrl.searchParams.set('timestamp', config.timestamp.toString());
      parserUrl.searchParams.set('chatId', config.chatId || '');
      
      // 添加元数据
      if (config.metadata) {
        parserUrl.searchParams.set('metadata', JSON.stringify(config.metadata));
      }
      
      return parserUrl.toString();
    } catch (error) {
      console.warn('Failed to create parser URL:', error);
      return `${baseUrl}?source=kimi&timestamp=${Date.now()}`;
    }
  }

  static async navigateToParser(customUrl?: string): Promise<{success: boolean, message: string}> {
    try {
      const parserUrl = this.createParserUrl(customUrl);
      
      // 尝试在新标签页中打开
      const newWindow = window.open(parserUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        // 检查窗口是否被阻止
        setTimeout(() => {
          if (newWindow.closed) {
            console.warn('Parser window was blocked or closed immediately');
          }
        }, 1000);
        
        return {
          success: true,
          message: '已跳转到解析网站'
        };
      } else {
        // 弹窗被阻止，尝试直接跳转
        window.location.href = parserUrl;
        return {
          success: true,
          message: '正在跳转到解析网站...'
        };
      }
    } catch (error) {
      console.error('Navigation failed:', error);
      return {
        success: false,
        message: `跳转失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  static showManualNavigationHelp(): void {
    const parserUrl = this.createParserUrl();
    const message = `
自动跳转失败，请手动访问解析网站：
${parserUrl}

或者：
1. 复制上述链接到新标签页
2. 上传刚才下载的Word文件
3. 选择所需的导出格式
    `.trim();
    
    console.log(message);
    
    // 尝试复制链接到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(parserUrl).catch(() => {
        console.warn('Failed to copy URL to clipboard');
      });
    }
  }
}