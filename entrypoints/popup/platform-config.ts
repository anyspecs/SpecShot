
export type Platform = 'ChatGPT' | 'Claude' | 'Poe' | 'Kimi' | 'Gemini' | 'Doubao' | 'AIStudio' | 'Unknown';

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
  Gemini: {
    action: 'extract',
    format: 'markdown',
    buttonText: '剪存对话',
    icon: '💎',
    description: 'Gemini对话剪存'
  },
  Doubao: {
    action: 'extract',
    format: 'markdown',
    buttonText: '剪存对话',
    icon: '🫘',
    description: '豆包对话剪存'
  },

  AIStudio: {
    action: 'extract',
    format: 'markdown',
    buttonText: '剪存对话',
    icon: '🔬',
    description: 'AI Studio对话剪存'
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
    Gemini: '请确保在Gemini对话页面，且对话内容已加载',
    Doubao: '请确保在豆包对话页面，且对话内容已加载',

    AIStudio: '请确保在AI Studio对话页面，且对话内容已加载',
    Unknown: '请在ChatGPT、Claude、Poe、Kimi、Gemini、豆包或AI Studio页面使用此扩展'

  };
  
  return helpMessages[platform];
};