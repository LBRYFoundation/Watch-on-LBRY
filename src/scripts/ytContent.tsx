import { h, JSX, render } from 'preact';

import { parseProtocolUrl } from '../common/lbry-url';
import { getSettingsAsync, LbrySettings, redirectDomains } from '../common/settings';
import { YTDescriptor, ytService } from '../common/yt';

interface UpdaterOptions {
  /** invoked if a redirect should be performed */
  onRedirect?(ctx: UpdateContext): void
  /** invoked if a URL is found */
  onURL?(ctx: UpdateContext): void
}

interface UpdateContext {
  descriptor: YTDescriptor
  /** LBRY URL fragment */
  url: string
  enabled: boolean
  redirect: LbrySettings['redirect']
}

interface ButtonSettings {
  text: string
  icon: string
  style?: JSX.CSSProperties
}

const buttonSettings: Record<LbrySettings['redirect'], ButtonSettings> = {
  app: { text: 'Watch on LBRY', icon: chrome.runtime.getURL('icons/lbry/lbry-logo.svg') },
  'lbry.tv': { text: 'Watch on LBRY', icon: chrome.runtime.getURL('icons/lbry/lbry-logo.svg') },
  odysee: {
    text: 'Watch on Odysee', icon: chrome.runtime.getURL('icons/lbry/odysee-logo.svg'),
    style: { backgroundColor: '#1e013b' },
  },
};

function pauseVideo() { document.querySelectorAll<HTMLVideoElement>('video').forEach(v => v.pause()); }

function openApp(url: string) {
  pauseVideo();
  location.assign(url);
}

async function resolveYT(descriptor: YTDescriptor) {
  const lbryProtocolUrl: string | null = await ytService.resolveById(descriptor).then(a => a[0]);
  const segments = parseProtocolUrl(lbryProtocolUrl || '', { encode: true });
  if (segments.length === 0) return;
  return segments.join('/');
}

/** Compute the URL and determine whether or not a redirect should be performed. Delegates the redirect to callbacks. */
async function handleURLChange(url: URL | Location, { onRedirect, onURL }: UpdaterOptions): Promise<void> {
  const { enabled, redirect } = await getSettingsAsync('enabled', 'redirect');
  const descriptor = ytService.getId(url.href);
  if (!descriptor) return; // couldn't get the ID, so we're done
  const res = await resolveYT(descriptor);
  if (!res) return; // couldn't find it on lbry, so we're done

  const ctx = { descriptor, url: res, enabled, redirect };
  if (onURL) onURL(ctx);
  if (enabled && onRedirect) onRedirect(ctx);
}

/** Returns a mount point for the button */
async function findMountPoint(): Promise<HTMLDivElement | void> {
  const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t));
  let ownerBar = document.querySelector('ytd-video-owner-renderer');
  for (let i = 0; !ownerBar && i < 50; i++) {
    await sleep(200);
    ownerBar = document.querySelector('ytd-video-owner-renderer');
  }

  if (!ownerBar) return;
  const div = document.createElement('div');
  div.style.display = 'flex';
  ownerBar.insertAdjacentElement('afterend', div);
  return div;
}

function WatchOnLbryButton({ redirect = 'app', url }: { redirect?: LbrySettings['redirect'], url?: string }) {
  if (!url) return null;
  const domain = redirectDomains[redirect];
  const buttonSetting = buttonSettings[redirect];
  return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
    <a href={domain.prefix + url} onClick={pauseVideo} role='button'
      children={<div>
        <img src={buttonSetting.icon} height={10} width={14}
          style={{ marginRight: 12, transform: 'scale(1.75)' }} />
        {buttonSetting.text}
      </div>}
      style={{
        borderRadius: '2px',
        backgroundColor: '#075656',
        border: '0',
        color: 'whitesmoke',
        padding: '10px 16px',
        marginRight: '5px',
        fontSize: '14px',
        textDecoration: 'none',
        ...buttonSetting.style,
      }} />
  </div>;
}


const mountPointPromise = findMountPoint();

const handle = (url: URL | Location) => handleURLChange(url, {
  async onURL({ descriptor: { type }, url, redirect }) {
    const mountPoint = await mountPointPromise;
    if (type !== 'video' || !mountPoint) return;
    render(<WatchOnLbryButton url={url} redirect={redirect} />, mountPoint);
  },
  onRedirect({ redirect, url }) {
    const domain = redirectDomains[redirect];
    if (redirect === 'app') return openApp(domain.prefix + url);
    location.replace(domain.prefix + url);
  },
});

// handle the location on load of the page
handle(location);

/*
 * Gets messages from background script which relays tab update events. This is because there's no sensible way to detect
 * history.pushState changes from a content script
 */
chrome.runtime.onMessage.addListener(async (req: { url: string }) => {
  mountPointPromise.then(mountPoint => mountPoint && render(<WatchOnLbryButton />, mountPoint))
  if (!req.url) return;
  handle(new URL(req.url));
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.redirect) return;
  handle(new URL(location.href));
});
