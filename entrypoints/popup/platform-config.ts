export type Platform = 'ChatGPT' | 'Claude' | 'Poe' | 'Kimi' | 'Unknown';
export type ActionType = 'extract' | 'automate' | 'detect';
export type ButtonState = 'idle' | 'processing' | 'success' | 'error';

export interface PlatformConfig {
  action: ActionType;
  format: string | null;
  buttonText: string;
  icon: string;
  description: string;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  ChatGPT: {
    action: 'extract',
    format: 'markdown',
    buttonText: '剪存对话',
    icon: '🤖',
    description: 'ChatGPT对话剪存'
  },
  Claude: {
    action: 'extract',
    format: 'markdown',
    buttonText: '剪存对话',
    icon: '🧠',
    description: 'Claude对话剪存'
  },
  Poe: {
    action: 'extract',
    format: 'markdown',
    buttonText: '剪存对话',
    icon: '🦆',
    description: 'Poe对话剪存'
  },
  Kimi: {
    action: 'automate',
    format: null,
    buttonText: '剪存对话',
    icon: '🌙',
    description: 'Kimi对话剪存'
  },
  Unknown: {
    action: 'detect',
    format: null,
    buttonText: '检测当前平台',
    icon: '❓',
    description: '平台检测中'
  }
} as const;

export interface ButtonConfig {
  text: string;
  className: string;
  disabled: boolean;
}

export const getButtonConfig = (platform: Platform, state: ButtonState): ButtonConfig => {
  const baseConfig = PLATFORM_CONFIGS[platform];
  
  switch (state) {
    case 'idle':
      return {
        text: baseConfig.buttonText,
        className: 'btn-primary',
        disabled: false
      };
    
    case 'processing':
      return {
        text: '剪存中...',
        className: 'btn-processing',
        disabled: true
      };
    
    case 'success':
      return {
        text: '操作完成 ✓',
        className: 'btn-success',
        disabled: false
      };
    
    case 'error':
      return {
        text: '操作失败 - 点击重试',
        className: 'btn-error',
        disabled: false
      };
  }
};

export const getPlatformSpecificHelp = (platform: Platform): string => {
  const helpMessages: Record<Platform, string> = {
    ChatGPT: '请确保在ChatGPT对话页面，且页面已完全加载',
    Claude: '请确保在Claude对话页面，且对话内容可见',
    Poe: '请确保在Poe对话页面，且对话内容已加载',
    Kimi: '请确保在Kimi聊天页面，且页面功能正常',
    Unknown: '请在ChatGPT、Claude、Poe或Kimi页面使用此扩展'
  };
  
  return helpMessages[platform];
};