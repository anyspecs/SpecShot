import { DOMClicker } from '../automation/dom-clicker';
import { KimiErrorHandler, KimiError } from '../automation/error-handler';
import { ParserNavigator } from '../automation/parser-navigator';
import { DownloadMonitor } from '../automation/download-monitor';
import { detectPlatform } from './platform';

export interface KimiAutomationResult {
  success: boolean;
  message: string;
  error?: KimiError;
  userGuidance?: string;
  logs: string[];
}

export class KimiAutomation {
  private static readonly SHARE_BUTTON_SELECTORS = [
    // 基于SVG的name属性 - 最精确
    'svg[name="Share_a"]',
    // SVG的父容器按钮/图标
    '*[class*="icon"] svg[name="Share_a"]',
    'button svg[name="Share_a"]', 
    '.icon svg[name="Share_a"]',
    // 基于SVG路径特征
    'svg path[d*="M434.176 236.99456c0-66.92864"]',
    // 更宽泛的分享按钮定位
    '[class*="share"] svg',
    '[title*="分享"] svg', 
    '[aria-label*="分享"] svg',
    // 通用的可点击分享元素
    'button[class*="share"]',
    '.share-bottom-container button',
    '.chat-header-actions button',
    // 移除不支持的伪选择器，使用标准CSS
    '[class*="share"]',
    '[role="button"]'
  ];

  private static readonly EXPORT_WORD_SELECTORS = [
    // 基于实际HTML结构 - 指定第4个导出按钮
    'div[data-v-182d5fe2][data-v-de32dd08].simple-button.main-button:nth-of-type(4)',
    'div[data-v-182d5fe2][data-v-de32dd08].simple-button.main-button:last-child',
    // 所有导出按钮，稍后在代码中选择最后一个
    'div[data-v-182d5fe2][data-v-de32dd08].simple-button.main-button',
    '.simple-button.main-button svg[name="Document"]',
    // 基于SVG name属性 
    'svg[name="Document"]',
    // 基于按钮类和SVG特征
    '.simple-button svg[name="Document"]',
    '.main-button svg[name="Document"]',
    // 更通用的导出按钮定位
    '.simple-button.main-button',
    'div.simple-button.main-button'
  ];

  private static readonly DOWNLOAD_BUTTON_SELECTORS = [
    // 基于实际下载按钮的选择器
    'button:contains("下载")',
    '.download-btn',
    'button[data-action="download"]',
    'a[download]',
    // 通用的下载相关按钮
    'button[class*="download"]',
    '[role="button"]:contains("下载")',
    // 可能的图标按钮
    'button svg[name="Download"]',
    '.download-action button'
  ];

  private logs: string[] = [];

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.logs.push(logMessage);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  async automateExport(): Promise<KimiAutomationResult> {
    this.logs = [];
    this.log('🚀 开始Kimi自动化导出流程');

    try {
      // 1. 平台检测
      if (detectPlatform() !== "Kimi") {
        const error = KimiErrorHandler.createError(KimiError.PLATFORM_NOT_DETECTED);
        return this.createErrorResult(error);
      }
      this.log('✅ Kimi平台检测成功');

      // 2. 页面状态检查
      if (!this.isKimiChatReady()) {
        this.log('⏳ 等待聊天页面加载...');
        let retries = 5;
        while (retries > 0 && !this.isKimiChatReady()) {
          await this.delay(1000);
          retries--;
        }
        
        if (!this.isKimiChatReady()) {
          const error = KimiErrorHandler.createError(KimiError.CHAT_NOT_READY);
          return this.createErrorResult(error);
        }
      }
      this.log('✅ 聊天页面状态正常');

      // 3. 点击分享按钮
      this.log('🔍 寻找分享按钮...');
      const shareResult = await DOMClicker.findAndClick(
        KimiAutomation.SHARE_BUTTON_SELECTORS,
        '分享按钮',
        3, // 最大重试3次
        1000 // 重试间隔1秒
      );

      if (!shareResult.success) {
        const error = KimiErrorHandler.createError(
          KimiError.SHARE_BUTTON_NOT_FOUND, 
          shareResult.message
        );
        return this.createErrorResult(error);
      }
      this.log(`✅ ${shareResult.message}`);

      // 4. 等待分享弹窗显示
      this.log('⏳ 等待分享弹窗显示...');
      await this.delay(1000);

      // 5. 等待并点击导出Word按钮
      this.log('🔍 寻找导出Word按钮...');
      
      // 先等待按钮出现
      const exportButton = await DOMClicker.waitForElement(
        KimiAutomation.EXPORT_WORD_SELECTORS,
        5000 // 等待5秒
      );

      if (!exportButton) {
        const error = KimiErrorHandler.createError(KimiError.EXPORT_BUTTON_NOT_FOUND);
        return this.createErrorResult(error);
      }

      const exportResult = await DOMClicker.findAndClick(
        KimiAutomation.EXPORT_WORD_SELECTORS,
        '导出Word按钮',
        2,
        500
      );

      if (!exportResult.success) {
        const error = KimiErrorHandler.createError(
          KimiError.EXPORT_BUTTON_NOT_FOUND,
          exportResult.message
        );
        return this.createErrorResult(error);
      }
      this.log(`✅ ${exportResult.message}`);

      // 6. 完成自动化流程，提示用户手动下载
      this.log('✅ 自动化流程完成！');
      this.log('💡 请手动点击"导出word"按钮开始下载...');
      this.log('🔍 后台服务将自动检测下载文件并上传...');
      
      return {
        success: true,
        automationMode: true,
        message: 'Kimi自动化流程完成，等待手动下载',
        fileData: {
          filename: 'kimi-export.docx',
          size: 0,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          needsDownloadDetection: true // 标记需要后台检测下载
        },
        logs: this.logs
      };


    } catch (exception) {
      this.log(`❌ 未预期的错误: ${exception}`);
      const error = KimiErrorHandler.fromException(exception);
      return this.createErrorResult(error);
    }
  }

  private createErrorResult(error: ReturnType<typeof KimiErrorHandler.createError>): KimiAutomationResult {
    this.log(`❌ ${error.message}`);
    if (error.userGuidance) {
      this.log(`💡 用户指导: ${error.userGuidance}`);
    }

    return {
      success: false,
      message: error.message,
      error: error.error,
      userGuidance: error.userGuidance,
      logs: this.logs
    };
  }

  private isKimiChatReady(): boolean {
    // 简化的聊天准备状态检测
    const hasBasicChat = Boolean(
      document.querySelector(".chat-detail-content") || // 聊天内容区域
      document.querySelector("[class*='chat']") || // 任何包含chat的类
      document.querySelector(".conversation") // 对话区域
    );
    
    const isNotLoading = !document.querySelector(".loading, .skeleton");
    
    // 简化条件：只要有聊天界面且不在加载状态即可
    return hasBasicChat && isNotLoading;
  }

  // 静态方法，用于content.ts中调用
  static async performAutomation(): Promise<KimiAutomationResult> {
    const automation = new KimiAutomation();
    return await automation.automateExport();
  }
}