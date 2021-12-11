import { PlatformName, platformSettings } from '../common/settings'
import type { UpdateContext } from '../scripts/tabOnUpdated'
import { h, JSX, render } from 'preact'

const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t));

interface ButtonSettings {
  text: string
  icon: string
  style?: 
  {
    icon?: JSX.CSSProperties
    button?: JSX.CSSProperties
  }
}

const buttonSettings: Record<PlatformName, ButtonSettings> = {
  app: { 
    text: 'Watch on LBRY', 
    icon: chrome.runtime.getURL('icons/lbry/lbry-logo.svg') 
  },
  'madiator.com': { 
    text: 'Watch on', 
    icon: chrome.runtime.getURL('icons/lbry/madiator-logo.svg'),
    style: {
      button: { flexDirection: 'row-reverse' },
      icon: { transform: 'scale(1.2)' }
    }
  },
  odysee: {
    text: 'Watch on Odysee', 
    icon: chrome.runtime.getURL('icons/lbry/odysee-logo.svg')
  },
};

interface ButtonParameters
{
  platform?: PlatformName
  pathname?: string
  time?: number
}

export function WatchOnLbryButton({ platform = 'app', pathname, time }: ButtonParameters) {
  if (!pathname || !platform) return null;
  const platformSetting = platformSettings[platform];
  const buttonSetting = buttonSettings[platform];

  const url = new URL(`${platformSetting.domainPrefix}${pathname}`)
  if (time) url.searchParams.append('t', time.toFixed(0))

  return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
    <a href={`${url.toString()}`} onClick={pauseVideo} role='button'
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        borderRadius: '2px',
        backgroundColor: platformSetting.theme,
        border: '0',
        color: 'whitesmoke',
        padding: '10px 16px',
        marginRight: '5px',
        fontSize: '14px',
        textDecoration: 'none',
        ...buttonSetting.style?.button,
      }}>
        <img src={buttonSetting.icon} height={16}
          style={{ transform: 'scale(1.5)', ...buttonSetting.style?.icon }} />
        <span>{buttonSetting.text}</span>
      </a>
  </div>;
}

let mountPoint: HTMLDivElement | null = null
/** Returns a mount point for the button */
async function findButtonMountPoint(): Promise<HTMLDivElement | void> {
  let ownerBar = document.querySelector('ytd-video-owner-renderer');
  for (let i = 0; !ownerBar && i < 50; i++) {
    await sleep(200);
    ownerBar = document.querySelector('ytd-video-owner-renderer');
  }

  if (!ownerBar) return;
  const div = document.createElement('div');
  div.style.display = 'flex';
  ownerBar.insertAdjacentElement('afterend', div);

  mountPoint = div
}

let videoElement: HTMLVideoElement | null = null;
async function findVideoElement() {
  while(!(videoElement = document.querySelector('#ytd-player video'))) await sleep(200)
  videoElement.addEventListener('timeupdate', () => updateButton(ctxCache))
}

function pauseVideo() { document.querySelectorAll<HTMLVideoElement>('video').forEach(v => v.pause()); }

function openApp(url: string) {
  pauseVideo();
  location.assign(url);
}

/** Compute the URL and determine whether or not a redirect should be performed. Delegates the redirect to callbacks. */
let ctxCache: UpdateContext | null = null
function handleURLChange (ctx: UpdateContext | null) {
  ctxCache = ctx
  updateButton(ctx)
  if (ctx?.enabled) redirectTo(ctx)
}

function updateButton(ctx: UpdateContext | null) {
  if (!mountPoint) return
  if (!ctx) return render(<WatchOnLbryButton />, mountPoint)
  if (ctx.descriptor.type !== 'video') return;
  const time = videoElement?.currentTime ?? 0
  const pathname = ctx.pathname
  const platform = ctx.platform

  render(<WatchOnLbryButton platform={platform} pathname={pathname} time={time} />, mountPoint)
}

function redirectTo({ platform, pathname }: UpdateContext) {
  
  const parseYouTubeTime = (timeString: string) => {
    const signs = timeString.replace(/[0-9]/g, '')
    if (signs.length === 0) return timeString
    const numbers = timeString.replace(/[^0-9]/g, '-').split('-')
    let total = 0
    for (let i = 0; i < signs.length; i++) {
      let t = parseInt(numbers[i])
      switch (signs[i]) {
        case 'd': t *= 24; case 'h': t *= 60; case 'm': t *= 60; case 's': break
        default: return '0'
      }
      total += t
    }
    return total.toString()
  }

  const platformSetting = platformSettings[platform];
  const url = new URL(`${platformSetting.domainPrefix}${pathname}`)
  const time = new URL(location.href).searchParams.get('t')
  
  if (time) url.searchParams.append('t', parseYouTubeTime(time))

  if (platform === 'app') return openApp(url.toString());
  location.replace(url.toString());
}



findButtonMountPoint().then(() => updateButton(ctxCache))
findVideoElement().then(() => updateButton(ctxCache))


/** Request UpdateContext from background */
const requestCtxFromUrl = async (url: string) => await new Promise<UpdateContext | null>((resolve) => chrome.runtime.sendMessage({ url }, resolve))

/** Handle the location on load of the page */ 
requestCtxFromUrl(location.href).then((ctx) => handleURLChange(ctx))

/*
 * Gets messages from background script which relays tab update events. This is because there's no sensible way to detect
 * history.pushState changes from a content script
 */
chrome.runtime.onMessage.addListener(async (ctx: UpdateContext) => handleURLChange(ctx));

/** On settings change */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.platform) handleURLChange(await requestCtxFromUrl(location.href))
});