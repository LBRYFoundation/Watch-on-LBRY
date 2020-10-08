const func = () => {
  chrome.storage.local.get(['enabled', 'redirect'], ({ enabled, redirect }) => {
    if (enabled === null || enabled === undefined) enabled = true;
    if (!redirect) redirect = 'lbry.tv';
    chrome.storage.local.set({ enabled, redirect });
    // have to set this manually as the trigger doesn't work for `onInstalled`
    chrome.browserAction.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  });
};

chrome.runtime.onStartup.addListener(func);
chrome.runtime.onInstalled.addListener(func);
