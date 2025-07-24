export type Platform = 'Claude' | 'ChatGPT' | 'Poe' | 'Unknown';

export function detectPlatform(): Platform {
  if (document.querySelector('div.font-claude-message')) return 'Claude';
  if (window.location.hostname === 'chatgpt.com') return 'ChatGPT';
  if (document.querySelector('div.ChatMessagesView_messagePair__ZEXUz')) return 'Poe';
  return 'Unknown';
}