import { h, render } from 'preact'
import { getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, TargetPlatform, targetPlatformSettings } from '../common/settings'
import { parseYouTubeURLTimeString } from '../common/yt'

const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t));

function pauseAllVideos() { document.querySelectorAll<HTMLVideoElement>('video').forEach(v => v.pause()); }

interface WatchOnLbryButtonParameters
{
  targetPlatform?: TargetPlatform
  lbryPathname?: string
  time?: number
}

interface Target
{
  platfrom: TargetPlatform
  lbryPathname: string
  time: number | null
}

export function WatchOnLbryButton({ targetPlatform, lbryPathname, time }: WatchOnLbryButtonParameters) {
  if (!lbryPathname || !targetPlatform) return null;

  const url = new URL(`${targetPlatform.domainPrefix}${lbryPathname}`)
  if (time) url.searchParams.set('t', time.toFixed(0))

  return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
    <a href={`${url.toString()}`} onClick={pauseAllVideos} role='button'
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        borderRadius: '2px',
        backgroundColor: targetPlatform.theme,
        border: '0',
        color: 'whitesmoke',
        padding: '10px 16px',
        marginRight: '4px',
        fontSize: '14px',
        textDecoration: 'none',
        ...targetPlatform.button.style?.button,
      }}>
        <img src={targetPlatform.button.icon} height={16}
          style={{ transform: 'scale(1.5)', ...targetPlatform.button.style?.icon }} />
        <span>{targetPlatform.button.text}</span>
      </a>
  </div>;
}

function updateButton(mountPoint: HTMLDivElement, target: Target | null): void {
  if (!target) return render(<WatchOnLbryButton />, mountPoint)
  render(<WatchOnLbryButton targetPlatform={target.platfrom} lbryPathname={target.lbryPathname} time={target.time ?? undefined} />, mountPoint)
}

function redirectTo({ lbryPathname, platfrom }: Target)
{
  const url = new URL(`${platfrom.domainPrefix}${lbryPathname}`)
  const time = new URL(location.href).searchParams.get('t')
  
  if (time) url.searchParams.set('t', parseYouTubeURLTimeString(time))

  if (platfrom === targetPlatformSettings.app)
  {
    pauseAllVideos();
    location.assign(url);
    return
  }
  location.replace(url.toString());
}

/** Returns a mount point for the button */
async function findButtonMountPoint(): Promise<HTMLDivElement> {
  let mountBefore: HTMLDivElement | null = null
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)

  while (!(mountBefore = document.querySelector(sourcePlatform.htmlQueries.mountButtonBefore))) await sleep(200);

  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.alignItems = 'center'
  mountBefore.parentElement?.insertBefore(div, mountBefore)
  
  return div
}

async function findVideoElement() {
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)
  let videoElement: HTMLVideoElement | null = null;

  while(!(videoElement = document.querySelector(sourcePlatform.htmlQueries.videoPlayer))) await sleep(200)

  return videoElement
}

window.addEventListener('load', async () =>
{
  const settings = await getExtensionSettingsAsync()
  const [buttonMountPoint, videoElement] = await Promise.all([findButtonMountPoint(), findVideoElement()])
  
  // Listen Settings Change
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return;
    Object.assign(settings, changes)
  });

  // Listen History.pushState
  {
    const originalPushState = history.pushState
    history.pushState = function(...params) { originalPushState(...params); afterPushState(); }
  }

  // Request Lbry pathname from background
  // We should get this from background, so the caching works and we don't get erros in the future if yt decides to impliment CORS
  const requestLbryPathname = async (videoId: string) => await new Promise<string | null>((resolve) => chrome.runtime.sendMessage({ videoId }, resolve))

  let target: Target | null = null
  async function updateByURL(url: URL) 
  {
    if (url.pathname !== '/watch') return

    const videoId = url.searchParams.get('v')
    if (!videoId) return
    const lbryPathname = await requestLbryPathname(videoId)
    if (!lbryPathname) return
    const time = videoElement.currentTime > 3 && videoElement.currentTime < videoElement.duration - 1 ? videoElement.currentTime : null
    target = { lbryPathname, platfrom: targetPlatformSettings[settings.targetPlatform], time }

    if (settings.redirect) redirectTo(target)  
    else updateButton(buttonMountPoint, target)
  }

  videoElement.addEventListener('timeupdate', () => updateButton(buttonMountPoint, target))

  async function afterPushState()
  {
    await updateByURL(new URL(location.href))
  }

  await updateByURL(new URL(location.href))
})