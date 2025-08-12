export function extractDoubaoConversation(
  extractContent: (element: Element | null) => string
): [string, string][] {
  const conversations: [string, string][] = [];

  // 豆包AI使用 data-testid 来区分消息类型
  // 用户消息: data-testid="send_message"
  // AI回复: data-testid="receive_message"
  
  // 查找所有消息容器
  const messageContainers = document.querySelectorAll('[data-testid="message-block-container"]');
  
  messageContainers.forEach((container) => {
    // 检查是否为用户消息
    const userMessage = container.querySelector('[data-testid="send_message"]');
    if (userMessage) {
      const content = extractContent(userMessage);
      if (content.length > 1) {
        conversations.push(["用户", content]);
      }
      return;
    }

    // 检查是否为AI回复
    const aiMessage = container.querySelector('[data-testid="receive_message"]');
    if (aiMessage) {
      const content = extractContent(aiMessage);
      if (content.length > 1) {
        conversations.push(["豆包", content]);
      }
      return;
    }
  });

  return conversations;
}

export function detectDoubao(): boolean {
  return window.location.hostname.includes('doubao.com') ||
         window.location.hostname.includes('www.doubao.com') ||
         document.querySelector('[data-testid="send_message"]') !== null ||
         document.querySelector('[data-testid="receive_message"]') !== null;
}