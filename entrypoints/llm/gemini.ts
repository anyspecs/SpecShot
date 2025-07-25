export function extractGeminiConversation(
  extractContent: (element: Element | null) => string
): [string, string][] {
  const conversation: [string, string][] = [];
  
  // 获取所有消息容器
  const userMessages = document.querySelectorAll('.user-query-bubble-with-background');
  const aiMessages = document.querySelectorAll('.markdown.markdown-main-panel');
  
  // 创建消息数组，包含消息和时间戳信息
  const allMessages: { element: Element; type: 'user' | 'ai'; index: number }[] = [];
  
  // 添加用户消息
  userMessages.forEach((element, index) => {
    allMessages.push({ element, type: 'user', index });
  });
  
  // 添加AI消息
  aiMessages.forEach((element, index) => {
    allMessages.push({ element, type: 'ai', index });
  });
  
  // 按照DOM顺序排序（基于元素在页面中的位置）
  allMessages.sort((a, b) => {
    const posA = a.element.compareDocumentPosition(b.element);
    if (posA & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (posA & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
  
  // 处理排序后的消息
  allMessages.forEach(({ element, type }) => {
    if (type === 'user') {
      // 提取用户消息内容
      const queryTextDiv = element.querySelector('.query-text');
      if (queryTextDiv) {
        const queryLines = queryTextDiv.querySelectorAll('.query-text-line');
        let content = '';
        
        queryLines.forEach((line) => {
          // 处理每个段落，保留文本内容
          const lineText = line.textContent?.trim() || '';
          if (lineText) {
            content += lineText + '\n';
          }
        });
        
        if (content.trim()) {
          conversation.push(['User', content.trim()]);
        }
      }
    } else if (type === 'ai') {
      // 提取AI回复内容
      const content = extractContent(element);
      if (content.trim()) {
        conversation.push(['Gemini', content.trim()]);
      }
    }
  });
  
  return conversation;
}

// 检测是否为Gemini页面
export function detectGemini(): boolean {
  return window.location.hostname.includes('gemini.google.com') ||
         window.location.hostname.includes('bard.google.com') ||
         document.querySelector('.user-query-bubble-with-background') !== null ||
         document.querySelector('.markdown.markdown-main-panel') !== null;
}