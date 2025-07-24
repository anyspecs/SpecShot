const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

const PLATFORMS = {
  CLAUDE: 'Claude',
  CHATGPT: 'ChatGPT',
  POE: 'Poe',
  UNKNOWN: 'Unknown'
};

const FORMAT_HANDLERS = {
  markdown: {
    convert: htmlToMarkdown,
    fileExtension: 'md',
    formatMetadata: (url, platform) => `# Conversation extracted from ${url}\n**Platform:** ${platform}\n**Format:** markdown\n\n`,
    formatMessage: (speaker, text) => `## ${speaker}:\n${text}\n\n`
  },
  html: {
    convert: simplifyHtml,
    fileExtension: 'html',
    formatMetadata: (url, platform) => `<h1>Conversation extracted from ${url}</h1><p><strong>Platform:</strong> ${platform}</p><p><strong>Format:</strong> html</p>`,
    formatMessage: (speaker, text) => `<h2>${speaker}:</h2><div>${text}</div>`
  },
  plaintext: {
    convert: htmlToPlaintext,
    fileExtension: 'txt',
    formatMetadata: (url, platform) => `Conversation extracted from ${url}\nPlatform: ${platform}\nFormat: plaintext\n\n`,
    formatMessage: (speaker, text) => `${speaker}:\n${text}\n\n`
  }
};

function extractConversation(format) {
  const logs = [];
  const log = message => {
    console.log(message);
    logs.push(message);
  };

  try {
    const platform = detectPlatform();
    log(`Platform detected: ${platform}`);
    log(`Format selected: ${format}`);
    
    const messages = extractConversationFromPlatform(platform, format);
    
    if (messages.length > 0) {
      const content = formatConversation(platform, messages, format);
      const downloadStatus = downloadConversation(content, format);
      return { platform, messageCount: messages.length, downloadInitiated: true, logs };
    } else {
      return { error: "No messages found in the conversation.", logs };
    }
  } catch (error) {
    return { error: `Extraction failed: ${error.message}`, logs };
  }
}

function detectPlatform() {
  if (document.querySelector('div.font-claude-message')) return PLATFORMS.CLAUDE;
  if (window.location.hostname === 'chatgpt.com') return PLATFORMS.CHATGPT;
  if (document.querySelector('div.ChatMessagesView_messagePair__ZEXUz')) return PLATFORMS.POE;
  return PLATFORMS.UNKNOWN;
}

function extractConversationFromPlatform(platform, format) {
  const extractors = {
    [PLATFORMS.CHATGPT]: extractChatGPTConversation,
    [PLATFORMS.CLAUDE]: extractClaudeConversation,
    [PLATFORMS.POE]: extractPoeConversation
  };

  return extractors[platform] ? extractors[platform](format) : [];
}

function extractChatGPTConversation(format) {
  const messages = [];

  // 查找所有带有data-message-author-role属性的元素
  const messageElements = document.querySelectorAll(
    "[data-message-author-role]"
  );

  if (messageElements.length > 0) {
    messageElements.forEach((element) => {
      const role = element.getAttribute("data-message-author-role");
      const speaker = role === "assistant" ? "AI" : "User";

      // 查找消息内容容器，基于实际HTML结构
      let contentElement =
        element.querySelector("[data-message-content]") ||
        element.querySelector(".markdown") ||
        element.querySelector('[class*="prose"]') ||
        element.querySelector(".text-message") ||
        element.querySelector("[data-start]") ||
        element.querySelector("blockquote") ||
        element.querySelector("div > p, div > ul, div > ol");

      // 最后尝试查找包含文本的div
      if (!contentElement) {
        const divs = element.querySelectorAll("div");
        for (const div of divs) {
          const text = div.textContent.trim();
          if (
            text.length > 10 &&
            !div.querySelector('button, svg, [role="button"]')
          ) {
            contentElement = div;
            break;
          }
        }
      }

      if (contentElement) {
        const text = extractContent(contentElement, format);
        if (text.length > 1) {
          messages.push([speaker, text]);
        }
      }
    });
  } else {
    // 备用策略：基于实际HTML结构直接查找
    // 用户消息通常在blockquote中
    const userMessages = document.querySelectorAll("blockquote");
    userMessages.forEach((blockquote) => {
      const text = extractContent(blockquote, format);
      if (text.length > 1) {
        messages.push(["User", text]);
      }
    });

    // AI回复通常在带有data-start属性的p, ul, ol元素中
    const aiContentElements = document.querySelectorAll(
      "p[data-start], ul[data-start], ol[data-start]"
    );
    aiContentElements.forEach((element) => {
      // 确保不是blockquote内的元素
      if (!element.closest("blockquote")) {
        const text = extractContent(element, format);
        if (text.length > 1) {
          messages.push(["AI", text]);
        }
      }
    });
  }

  return messages;
}
function extractClaudeConversation(format) {
  return Array.from(document.querySelectorAll('div.font-user-message, div.font-claude-message'))
    .map(container => {
      const speaker = container.classList.contains('font-user-message') ? "User" : "AI";
      const contentElement = speaker === "AI" ? container.querySelector('div') : container;
      return [speaker, extractContent(contentElement, format)];
    })
    .filter(([, text]) => text.length > 1);
}

function extractPoeConversation(format) {
  return Array.from(document.querySelectorAll('div.ChatMessagesView_messagePair__ZEXUz'))
    .flatMap(container => {
      const messages = [];
      const userMessage = container.querySelector('div.ChatMessage_rightSideMessageWrapper__r0roB');
      if (userMessage) {
        const content = userMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
        if (content) {
          const text = extractContent(content, format);
          if (text.length > 1) messages.push(["User", text]);
        }
      }
      
      const aiMessages = Array.from(container.querySelectorAll('div.ChatMessage_messageWrapper__4Ugd6'))
        .filter(msg => !msg.classList.contains('ChatMessage_rightSideMessageWrapper__r0roB'));
      aiMessages.forEach(aiMessage => {
        const content = aiMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
        if (content) {
          const text = extractContent(content, format);
          if (text.length > 1) messages.push(["AI", text]);
        }
      });
      return messages;
    });
}

function extractContent(element, format) {
  return FORMAT_HANDLERS[format].convert(element.innerHTML);
}

function formatConversation(platform, messages, format) {
  const { formatMetadata, formatMessage } = FORMAT_HANDLERS[format];
  let content = formatMetadata(window.location.href, platform);
  messages.forEach(([speaker, text]) => {
    content += formatMessage(speaker, text);
  });
  return content;
}

function downloadConversation(content, format) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation_${new Date().toISOString().replace(/[:.]/g, '-')}.${FORMAT_HANDLERS[format].fileExtension}`;
  a.click();
  URL.revokeObjectURL(url);
  return 'File download initiated';
}

function htmlToMarkdown(html) {
  return html
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, function(match, content) {
      return content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function htmlToPlaintext(html) {
  return html
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, function(match, content) {
      return content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function simplifyHtml(html) {
  return html
    .replace(/<(\w+)\s+[^>]*>/g, '<$1>')
    .replace(/\s+/g, ' ')
    .trim();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract") {
    sendResponse(extractConversation(request.format));
  } else if (request.action === "detectPlatform") {
    sendResponse({ platform: detectPlatform() });
  }
});
