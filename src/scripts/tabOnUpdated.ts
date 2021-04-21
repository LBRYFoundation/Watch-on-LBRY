import { appRedirectUrl, parseProtocolUrl } from '../common/lbry-url';
import { getSettingsAsync, LbrySettings } from '../common/settings';
import { YTDescriptor, ytService } from '../common/yt';
export interface UpdateContext {
  descriptor: YTDescriptor
  /** LBRY URL fragment */
  url: string
  enabled: boolean
  redirect: LbrySettings['redirect']
}

async function resolveYT(descriptor: YTDescriptor) {
  const lbryProtocolUrl: string | null = await ytService.resolveById(descriptor).then(a => a[0]);
  const segments = parseProtocolUrl(lbryProtocolUrl || '', { encode: true });
  if (segments.length === 0) return;
  return segments.join('/');
}

const urlCache: Record<string, string | undefined> = {};

async function ctxFromURL(url: string): Promise<UpdateContext | void> {
  if (!url || !(url.startsWith('https://www.youtube.com/watch?v=') || url.startsWith('https://www.youtube.com/channel/'))) return;
  url = new URL(url).href;
  const { enabled, redirect } = await getSettingsAsync('enabled', 'redirect');
  const descriptor = ytService.getId(url);
  if (!descriptor) return; // couldn't get the ID, so we're done

  const res = url in urlCache ? urlCache[url] : await resolveYT(descriptor);
  urlCache[url] = res;
  if (!res) return; // couldn't find it on lbry, so we're done

  return { descriptor, url: res, enabled, redirect };
}

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

chrome.runtime.onMessage.addListener(({ url }: { url: string }, sender, sendResponse) => {
  ctxFromURL(url).then(ctx => {
    sendResponse(ctx);
  })
  return true;
})

// relay youtube link changes to the content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, { url }) => {
  if (!changeInfo.url || !url || !(url.startsWith('https://www.youtube.com/watch?v=') || url.startsWith('https://www.youtube.com/channel/'))) return;

  ctxFromURL(url).then(ctx => chrome.tabs.sendMessage(tabId, ctx));
});
