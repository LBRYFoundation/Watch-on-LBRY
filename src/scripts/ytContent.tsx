import { h, JSX, render } from 'preact';

import { parseProtocolUrl } from '../common/lbry-url';
import { LbrySettings, redirectDomains } from '../common/settings';
import { YTDescriptor, ytService } from '../common/yt';
import { UpdateContext } from './tabOnUpdated';

interface UpdaterOptions {
  /** invoked if a redirect should be performed */
  onRedirect?(ctx: UpdateContext): void
  /** invoked if a URL is found */
  onURL?(ctx: UpdateContext): void
}

interface ButtonSettings {
  text: string
  icon: string
  style?: JSX.CSSProperties
}

const buttonSettings: Record<LbrySettings['redirect'], ButtonSettings> = {
  app: { text: 'Watch on LBRY', icon: chrome.runtime.getURL('icons/lbry/lbry-logo.svg') },
  'madiator.com': { text: 'Watch on LBRY', icon: chrome.runtime.getURL('icons/lbry/lbry-logo.svg') },
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
async function handleURLChange(ctx: UpdateContext, { onRedirect, onURL }: UpdaterOptions): Promise<void> {
  if (onURL) onURL(ctx);
  if (ctx.enabled && onRedirect) onRedirect(ctx);
}

const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t));

/** Returns a mount point for the button */
async function findMountPoint(): Promise<HTMLDivElement | void> {
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

function WatchOnLbryButton({ redirect = 'app', url: pathname, time }: { redirect?: LbrySettings['redirect'], url?: string, time?: string }) {
  if (!pathname) return null;
  const domain = redirectDomains[redirect];
  const buttonSetting = buttonSettings[redirect];

  const url = new URL(`${domain.prefix}${pathname}`)
  if (time) url.searchParams.append('t', time)

  return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
    <a href={`${url.toString()}`} onClick={pauseVideo} role='button'
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


let ctxCache: UpdateContext | undefined

{(async () => {
  let videoElement: HTMLVideoElement | null = null;
  let renderingButton = false
    
  const handleTimeChange = () => {
    if (renderingButton) return
    if (!videoElement) return
    if (!ctxCache?.url) return
    const time = (videoElement.currentTime ?? 0).toFixed(0)
    const { url, redirect } = ctxCache
    
    renderingButton = true
    mountPointPromise.then(mountPoint => mountPoint && render(<WatchOnLbryButton time={time} url={url} redirect={redirect} />, mountPoint))
    .then(() => renderingButton = false)
  }

  while (true) {
    await sleep(200)
    if (!videoElement) {
      videoElement = document.querySelector('video')
      if (videoElement) videoElement.addEventListener('timeupdate', handleTimeChange)
    }
    else if (!videoElement.parentElement) {
      videoElement.removeEventListener('timeupdate', handleTimeChange)
      videoElement = null
    }
  }
})()}


const handle = (ctx: UpdateContext) => (ctxCache = ctx) && ctx.url && handleURLChange(ctx, {
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
chrome.runtime.sendMessage({ url: location.href }, async (ctx: UpdateContext) => handle(ctx));

/*
 * Gets messages from background script which relays tab update events. This is because there's no sensible way to detect
 * history.pushState changes from a content script
 */
chrome.runtime.onMessage.addListener(async (ctx: UpdateContext) => {
  mountPointPromise.then(mountPoint => mountPoint && render(<WatchOnLbryButton />, mountPoint))
  handle(ctx);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.redirect) return;
  chrome.runtime.sendMessage({ url: location.href }, async (ctx: UpdateContext) => handle(ctx));
});
