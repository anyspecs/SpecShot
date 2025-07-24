const SUPPORTED_URLS = ['chatgpt.com', 'claude.ai', 'poe.com'];

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (SUPPORTED_URLS.some(url => tab.url.includes(url))) {
      chrome.action.enable(tabId);
    } else {
      chrome.action.disable(tabId);
    }
  }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extract", format: request.format}, function(response) {
        sendResponse(response);
      });
    });
    return true;
  } else if (request.action === "detectPlatform") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "detectPlatform"}, function(response) {
        sendResponse(response);
      });
    });
    return true;
  }
});
