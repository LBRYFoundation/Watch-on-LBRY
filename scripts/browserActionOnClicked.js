chrome.browserAction.onClicked.addListener(() => {
  chrome.storage.local.get('enabled', ({ enabled }) => {
    chrome.storage.local.set({ enabled: !enabled });
  });
});
