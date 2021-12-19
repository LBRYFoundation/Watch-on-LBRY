import { appRedirectUrl, parseProtocolUrl } from '../common/lbry-url'
import { getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, TargetPlatformName } from '../common/settings'
import { YTDescriptor, ytService } from '../common/yt'
export interface UpdateContext {
  descriptor: YTDescriptor
  /** LBRY URL fragment */
  lbryPathname: string
  redirect: boolean
  targetPlatform: TargetPlatformName
}

async function resolveYT(descriptor: YTDescriptor) {
  const lbryProtocolUrl: string | null = await ytService.resolveById(descriptor).then(a => a[0]);
  const segments = parseProtocolUrl(lbryProtocolUrl || '', { encode: true });
  if (segments.length === 0) return;
  return segments.join('/');
}

const lbryPathnameCache: Record<string, string | undefined> = {};

async function ctxFromURL(href: string): Promise<UpdateContext | void> {
  if (!href) return;

  const url = new URL(href);
  if (!getSourcePlatfromSettingsFromHostname(url.hostname)) return
  if (url.pathname.startsWith('/watch?')) return
  if (url.pathname.startsWith('/channel?')) return

  const { redirect, targetPlatform } = await getExtensionSettingsAsync('redirect', 'targetPlatform');
  const descriptor = ytService.getId(href);
  if (!descriptor) return; // couldn't get the ID, so we're done

  const res = href in lbryPathnameCache ? lbryPathnameCache[href] : await resolveYT(descriptor);
  lbryPathnameCache[href] = res;
  if (!res) return; // couldn't find it on lbry, so we're done

  return { descriptor, lbryPathname: res, redirect, targetPlatform };
}

// handles lbry.tv -> lbry app redirect
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, { url: tabUrl }) => {
  const { redirect, targetPlatform } = await getExtensionSettingsAsync('redirect', 'targetPlatform');
  if (!redirect || targetPlatform !== 'app' || !changeInfo.url || !tabUrl?.startsWith('https://odysee.com/')) return;

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
  if (url) ctxFromURL(url).then(ctx => chrome.tabs.sendMessage(tabId, ctx));
});
