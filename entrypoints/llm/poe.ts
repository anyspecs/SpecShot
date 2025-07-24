export function extractPoeConversation(extractContent: (element: Element | null) => string): [string, string][] {
  return Array.from(document.querySelectorAll('div.ChatMessagesView_messagePair__ZEXUz'))
    .flatMap(container => {
      const messages: [string, string][] = [];
      const userMessage = container.querySelector('div.ChatMessage_rightSideMessageWrapper__r0roB');
      if (userMessage) {
        const content = userMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
        if (content) {
          const text = extractContent(content);
          if (text.length > 1) messages.push(["User", text]);
        }
      }
      
      const aiMessages = Array.from(container.querySelectorAll('div.ChatMessage_messageWrapper__4Ugd6'))
        .filter(msg => !msg.classList.contains('ChatMessage_rightSideMessageWrapper__r0roB'));
      aiMessages.forEach(aiMessage => {
        const content = aiMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
        if (content) {
          const text = extractContent(content);
          if (text.length > 1) messages.push(["AI", text]);
        }
      });
      return messages;
    });
}