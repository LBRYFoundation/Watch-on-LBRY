import { appRedirectUrl } from '../common/lbry-url';
import { getSettingsAsync } from '../common/settings';

// handles lbry.tv -> lbry app redirect
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, { url: tabUrl }) => {
  const { enabled, redirect } = await getSettingsAsync('enabled', 'redirect');
  if (!enabled || redirect !== 'app' || !changeInfo.url || !tabUrl?.startsWith('https://lbry.tv/')) return;

  const url = appRedirectUrl(tabUrl, { encode: true });
  if (!url) return;
  chrome.tabs.update(tabId, { url });
  alert('Opened link in LBRY App!'); // Better for UX since sometimes LBRY App doesn't take focus, if that is fixed, this can be removed
  chrome.tabs.executeScript(tabId, {
    code: `if (window.history.length === 1) {
            window.close();
          } else {
            window.history.back();
          }
          document.querySelectorAll('video').forEach(v => v.pause());
          `
  });
});

// relay youtube link changes to the content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, { url }) => {
  if (!changeInfo.url || !url ||
    !(url.startsWith('https://www.youtube.com/watch?v=') || url.startsWith('https://www.youtube.com/channel/'))) return;
  chrome.tabs.sendMessage(tabId, { url });
});
