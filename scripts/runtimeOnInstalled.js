chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('enabled', ({ enabled }) => {
    if (enabled === null || enabled === undefined) enabled = true;
    chrome.storage.local.set({ enabled });
    // have to set this manually as the trigger doesn't work for `onInstalled`
    chrome.browserAction.setBadgeText({ text: enabled ? "ON" : "OFF" });
  });
});
