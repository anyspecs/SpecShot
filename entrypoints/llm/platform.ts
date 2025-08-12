export type Platform = "Claude" | "ChatGPT" | "Poe" | "Kimi" | "Gemini" | "Doubao" | "Unknown";

export function detectPlatform(): Platform {
  if (detectKimi()) return "Kimi";
  if (detectGemini()) return "Gemini";
  if (detectDoubao()) return "Doubao";
  if (document.querySelector("div.font-claude-message")) return "Claude";
  if (window.location.hostname === "chatgpt.com") return "ChatGPT";
  if (document.querySelector("div.ChatMessagesView_messagePair__ZEXUz"))
    return "Poe";
  return "Unknown";
}

export function detectKimi(): boolean {
  // 简化为纯URL域名检测，与ChatGPT保持一致
  const isKimiDomain = window.location.hostname === 'kimi.com' || 
                       window.location.hostname === 'kimi.moonshot.cn' ||
                       window.location.hostname === 'www.kimi.com';

  console.log('Kimi detection results:', {
    hostname: window.location.hostname,
    isKimiDomain
  });

  return isKimiDomain;
}

export function detectGemini(): boolean {
  return window.location.hostname.includes('gemini.google.com') ||
         window.location.hostname.includes('bard.google.com') ||
         document.querySelector('.user-query-bubble-with-background') !== null ||
         document.querySelector('.markdown.markdown-main-panel') !== null;
}

export function detectDoubao(): boolean {
  return window.location.hostname.includes('doubao.com') ||
         window.location.hostname.includes('www.doubao.com') ||
         document.querySelector('[data-testid="send_message"]') !== null ||
         document.querySelector('[data-testid="receive_message"]') !== null;
}

export function isKimiChatReady(): boolean {
  // 放宽检测条件，只要有基本的聊天界面元素即可
  const hasBasicChat = Boolean(
    document.querySelector(".chat-detail-content") || // 聊天内容区域
    document.querySelector("[class*='chat']") || // 任何包含chat的类
    document.querySelector(".conversation") // 对话区域
  );
  
  // 检查是否有分享相关按钮（更宽松的检测）
  const hasShareButton = Boolean(
    document.querySelector('svg[name="Share_a"]') || // 分享按钮SVG
    document.querySelector('.share-bottom-container') || // 分享容器
    document.querySelector('[class*="share"]') // 任何包含share的元素
  );
  
  const isNotLoading = !document.querySelector(".loading, .skeleton");
  
  console.log('Kimi chat ready check:', {
    hasBasicChat,
    hasShareButton, 
    isNotLoading,
    result: hasBasicChat && isNotLoading
  });
  
  // 简化条件：只要有聊天界面且不在加载状态即可
  return hasBasicChat && isNotLoading;
}
