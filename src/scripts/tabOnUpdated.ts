import { appRedirectUrl, parseProtocolUrl } from '../common/lbry-url';
import { getSettingsAsync, redirectDomains } from '../common/settings';
import { ytService } from '../common/yt';

function openApp(tabId: number, url: string) {
  chrome.tabs.update(tabId, { url });
  alert('Opened link in LBRY App!'); // Better for UX since sometimes LBRY App doesn't take focus, if that is fixed, this can be removed
  // Close tab if it lacks history and go back if it does
  chrome.tabs.executeScript(tabId, {
    code: `if (window.history.length === 1) {
            window.close();
          } else {
            window.history.back();
          }`
  });
}

async function resolveYT(ytUrl: string) {
  const descriptor = ytService.getId(ytUrl);
  if (!descriptor) return; // can't parse YT url; may not be one

  const lbryProtocolUrl: string | null = await ytService.resolveById(descriptor).then(a => a[0]);
  const segments = parseProtocolUrl(lbryProtocolUrl || '', { encode: true });
  if (segments.length === 0) return;
  return segments.join('/');
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, { url: tabUrl }) => {
  const { enabled, redirect } = await getSettingsAsync('enabled', 'redirect');
  const urlPrefix = redirectDomains[redirect].prefix;

  if (!enabled || !changeInfo.url || !tabUrl) return;

  const url = tabUrl.match(/\b(https:\/\/lbry.tv|lbry:\/\/)/g) ? appRedirectUrl(tabUrl, { encode: true })
    : await resolveYT(tabUrl);

  if (!url) return;
  if (redirect === 'app') {
    openApp(tabId, urlPrefix + url);
    return;
  }
  chrome.tabs.executeScript(tabId, { code: `location.replace("${urlPrefix + url}")` });
});
