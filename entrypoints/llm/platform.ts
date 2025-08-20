export type Platform =
  | "Claude"
  | "ChatGPT"
  | "Poe"
  | "Kimi"
  | "Gemini"
  | "Doubao"
  | "AIStudio"
  | "Unknown";

export function detectPlatform(): Platform {
  const hostname = window.location.hostname;

  if (hostname === "chatgpt.com") return "ChatGPT";
  if (hostname === "claude.ai") return "Claude";
  if (hostname === "doubao.com" || hostname === "www.doubao.com")
    return "Doubao";
  if (hostname === "gemini.google.com") return "Gemini";
  if (hostname === "aistudio.google.com") return "AIStudio";
  if (hostname === "kimi.moonshot.cn") return "Kimi";
  if (document.querySelector("div.ChatMessagesView_messagePair__ZEXUz"))
    return "Poe";
  return "Unknown";
}
