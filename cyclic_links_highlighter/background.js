chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({enabled: false}, prefs => {
    chrome.storage.local.set({enabled: prefs.enabled});
    chrome.action.setBadgeText({text: ''});
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'CYCLIC_COUNT') {
    const tabId = sender.tab?.id;
    if (typeof tabId === 'number') {
      chrome.action.setBadgeBackgroundColor({color: [200, 20, 20, 255]});
      chrome.action.setBadgeText({text: msg.count ? String(msg.count) : '', tabId});
    }
  }

  if (msg?.type === 'TOGGLE_ENABLED') {
    chrome.storage.local.set({enabled: !!msg.enabled}, () => {
      try { sendResponse({ok: true}); } catch {}
    });
    return true;
  }

  if (msg?.type === 'REQUEST_RESCAN') {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(t => {
        try {
          chrome.tabs.sendMessage(t.id, {type: 'RUN_HIGHLIGHT'});
        } catch (e) {
          // игнорируем все ошибки отправки в закрытые/перезагружаемые вкладки
        }
      });
    });
    try { sendResponse({ok: true}); } catch {}
    return true;
  }
});