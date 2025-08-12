export type Platform =
  | "Claude"
  | "ChatGPT"
  | "Poe"
  | "Kimi"
  | "Gemini"
  | "Doubao"
  | "Unknown";

export function detectPlatform(): Platform {
  if (window.location.hostname === "chatgpt.com") return "ChatGPT";
  if (window.location.hostname === "claude.ai") return "Claude";
  if (window.location.hostname === "doubao.com") return "Doubao";
  if (window.location.hostname === "gemini.google.com") return "Gemini";
  if (window.location.hostname === "kimi.moonshot.cn") return "Kimi";
  if (document.querySelector("div.ChatMessagesView_messagePair__ZEXUz"))
    return "Poe";
  return "Unknown";
}
