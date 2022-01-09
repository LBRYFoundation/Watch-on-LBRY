import { ExtensionSettings, getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, TargetPlatformName, targetPlatformSettings } from '../common/settings'
import type { UpdateContext } from '../scripts/tabOnUpdated'
import { h, JSX, render } from 'preact'
import { YtIdResolverDescriptor, ytService } from '../common/yt'

const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t));

function pauseAllVideos() { document.querySelectorAll<HTMLVideoElement>('video').forEach(v => v.pause()); }

interface ButtonSettings {
  text: string
  icon: string
  style?: 
  {
    icon?: JSX.CSSProperties
    button?: JSX.CSSProperties
  }
}

const buttonSettings: Record<TargetPlatformName, ButtonSettings> = {
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
  targetPlatform?: TargetPlatformName
  lbryPathname?: string
  time?: number
}

export function WatchOnLbryButton({ targetPlatform = 'app', lbryPathname, time }: ButtonParameters = {}) {
  if (!lbryPathname || !targetPlatform) return null;
  const targetPlatformSetting = targetPlatformSettings[targetPlatform];
  const buttonSetting = buttonSettings[targetPlatform];

  const url = new URL(`${targetPlatformSetting.domainPrefix}${lbryPathname}`)
  if (time) url.searchParams.append('t', time.toFixed(0))

  return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
    <a href={`${url.toString()}`} onClick={pauseAllVideos} role='button'
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        borderRadius: '2px',
        backgroundColor: targetPlatformSetting.theme,
        border: '0',
        color: 'whitesmoke',
        padding: '10px 16px',
        marginRight: '4px',
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
  let mountBefore: HTMLDivElement | null = null
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)

  while (!(mountBefore = document.querySelector(sourcePlatform.htmlQueries.mountButtonBefore))) await sleep(200);

  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.alignItems = 'center'
  mountBefore.parentElement?.insertBefore(div, mountBefore)
  mountPoint = div
}

let videoElement: HTMLVideoElement | null = null;
async function findVideoElement() {
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)

  while(!(videoElement = document.querySelector(sourcePlatform.htmlQueries.videoPlayer))) await sleep(200)

  videoElement.addEventListener('timeupdate', () => updateButton(ctxCache))
}

/** Compute the URL and determine whether or not a redirect should be performed. Delegates the redirect to callbacks. */
let ctxCache: UpdateContext | null = null
function handleURLChange (ctx: UpdateContext | null): void {
  ctxCache = ctx
  updateButton(ctx)
  if (ctx?.redirect) redirectTo(ctx)
}

function updateButton(ctx: UpdateContext | null): void {
  if (!mountPoint) return
  if (!ctx) return render(<WatchOnLbryButton />, mountPoint)
  if (ctx.descriptor.type !== 'video') return;
  const lbryPathname = ctx.lbryPathname
  const targetPlatform = ctx.targetPlatform
  let time: number = videoElement?.currentTime ?? 0
  if (time < 3) time = 0
  if (time >= (videoElement?.duration ?? 0) - 1) time = 0

  render(<WatchOnLbryButton targetPlatform={targetPlatform} lbryPathname={lbryPathname} time={time || undefined} />, mountPoint)
}

function redirectTo({ targetPlatform, lbryPathname }: UpdateContext): void {
  
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

  const targetPlatformSetting = targetPlatformSettings[targetPlatform];
  const url = new URL(`${targetPlatformSetting.domainPrefix}${lbryPathname}`)
  const time = new URL(location.href).searchParams.get('t')
  
  if (time) url.searchParams.append('t', parseYouTubeTime(time))

  if (targetPlatform === 'app')
  {
    pauseAllVideos();
    location.assign(url);
    return
  }
  location.replace(url.toString());
}



findButtonMountPoint().then(() => updateButton(ctxCache))
findVideoElement().then(() => updateButton(ctxCache))

async function onPageLoad()
{
  // Listen History.pushState
  {
    const originalPushState = history.pushState
    history.pushState = function(...params) { onPushState(); return originalPushState(...params) }
  }

  const settings = await getExtensionSettingsAsync('redirect', 'targetPlatform', 'urlResolver')
  
  // Listen Settings Change
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return;
    Object.assign(settings, changes)
  });

  async function updateByURL(url: URL) 
  {
    if (url.pathname !== '/watch') return
    const videoId = url.searchParams.get('v')
    if (!videoId) return
    const descriptor: YtIdResolverDescriptor = { id: videoId, type: 'video' }
    const lbryPathname = (await ytService.resolveById([descriptor]))[0]
    if (!lbryPathname) return
    updateButton({ descriptor, lbryPathname, redirect: settings.redirect, targetPlatform: settings.targetPlatform })
  }

  async function onPushState()
  {
    await updateByURL(new URL(location.href))
  }

  await updateByURL(new URL(location.href))
}