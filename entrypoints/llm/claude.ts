export function extractClaudeConversation(extractContent: (element: Element | null) => string): [string, string][] {
  return Array.from(document.querySelectorAll('div.font-user-message, div.font-claude-message'))
    .map(container => {
      const speaker = container.classList.contains('font-user-message') ? "User" : "AI";
      const contentElement = speaker === "AI" ? container.querySelector('div') : container;
      return [speaker, extractContent(contentElement)] as [string, string];
    })
    .filter(([, text]) => text.length > 1);
}