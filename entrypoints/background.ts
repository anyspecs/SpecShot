export default defineBackground(() => {
  const SUPPORTED_URLS = ['chatgpt.com', 'claude.ai', 'poe.com'];

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      if (SUPPORTED_URLS.some(url => tab.url!.includes(url))) {
        browser.action.enable(tabId);
      } else {
        browser.action.disable(tabId);
      }
    }
  });

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, { action: "extract", format: request.format })
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        }
      });
      return true;
    } else if (request.action === "detectPlatform") {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, { action: "detectPlatform" })
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        }
      });
      return true;
    }
  });
});
