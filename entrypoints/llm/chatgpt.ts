export function extractChatGPTConversation(extractContent: (element: Element | null) => string): [string, string][] {
  const messages: [string, string][] = [];

  const messageElements = document.querySelectorAll("[data-message-author-role]");

  if (messageElements.length > 0) {
    messageElements.forEach((element) => {
      const role = element.getAttribute("data-message-author-role");
      const speaker = role === "assistant" ? "AI" : "User";

      let contentElement =
        element.querySelector("[data-message-content]") ||
        element.querySelector(".markdown") ||
        element.querySelector('[class*="prose"]') ||
        element.querySelector(".text-message") ||
        element.querySelector("[data-start]") ||
        element.querySelector("blockquote") ||
        element.querySelector("div > p, div > ul, div > ol");

      if (!contentElement) {
        const divs = element.querySelectorAll("div");
        for (const div of divs) {
          const text = div.textContent?.trim() || '';
          if (text.length > 10 && !div.querySelector('button, svg, [role="button"]')) {
            contentElement = div;
            break;
          }
        }
      }

      if (contentElement) {
        const text = extractContent(contentElement);
        if (text.length > 1) {
          messages.push([speaker, text]);
        }
      }
    });
  } else {
    const userMessages = document.querySelectorAll("blockquote");
    userMessages.forEach((blockquote) => {
      const text = extractContent(blockquote);
      if (text.length > 1) {
        messages.push(["User", text]);
      }
    });

    const aiContentElements = document.querySelectorAll("p[data-start], ul[data-start], ol[data-start]");
    aiContentElements.forEach((element) => {
      if (!element.closest("blockquote")) {
        const text = extractContent(element);
        if (text.length > 1) {
          messages.push(["AI", text]);
        }
      }
    });
  }

  return messages;
}