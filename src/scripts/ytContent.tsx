import { h, render } from 'preact'
import { getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, TargetPlatform, targetPlatformSettings } from '../common/settings'
import { parseYouTubeURLTimeString } from '../common/yt'

const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t))

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

export function WatchOnLbryButton({ targetPlatform, lbryPathname, time }: WatchOnLbryButtonParameters)
{
  if (!lbryPathname || !targetPlatform) return null

  const url = new URL(`${targetPlatform.domainPrefix}${lbryPathname}`)
  if (time) url.searchParams.set('t', time.toFixed(0))

  return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
    <a href={`${url.toString()}`} role='button'
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
  </div>
}

function updateButton(mountPoint: HTMLDivElement, target: Target | null): void
{
  if (!target) return render(<WatchOnLbryButton />, mountPoint)
  render(<WatchOnLbryButton targetPlatform={target.platfrom} lbryPathname={target.lbryPathname} time={target.time ?? undefined} />, mountPoint)
}

async function redirectTo({ lbryPathname, platfrom, time }: Target)
{
  const url = new URL(`${platfrom.domainPrefix}${lbryPathname}`)

  if (time) url.searchParams.set('t', time.toFixed(0))

  if (platfrom === targetPlatformSettings.app)
  {
    open(url, '_blank')
    findVideoElement().then((videoElement) => {
      videoElement.addEventListener('play', () => videoElement.pause(), { once: true })
      videoElement.pause()
    })
    if (window.history.length === 1) window.close();
    else window.history.back()
  }
  location.replace(url.toString())
}

/** Returns a mount point for the button */
async function findButtonMountPoint(): Promise<HTMLDivElement>
{
  let mountBefore: HTMLDivElement | null = null
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)
  const exits: HTMLDivElement | null = document.querySelector('#watch-on-yt-button-container')
  if (exits) return exits;
  while (!(mountBefore = document.querySelector(sourcePlatform.htmlQueries.mountButtonBefore))) await sleep(200)
  
  const div = document.createElement('div')
  div.id = 'watch-on-yt-button-container'
  div.style.display = 'flex'
  div.style.alignItems = 'center'
  mountBefore.parentElement?.insertBefore(div, mountBefore)

  return div
}

async function findVideoElement()
{
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)
  let videoElement: HTMLVideoElement | null = null

  while (!(videoElement = document.querySelector(sourcePlatform.htmlQueries.videoPlayer))) await sleep(200)

  return videoElement
}

window.addEventListener('load', async () =>
{
  const settings = await getExtensionSettingsAsync()
  let target: Target | null = null

  const [buttonMountPoint, videoElement] = await Promise.all([findButtonMountPoint(), findVideoElement()])

  // Listen Settings Change
  chrome.storage.onChanged.addListener(async (changes, areaName) =>
  {
    if (areaName !== 'local') return
    Object.assign(settings, Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.newValue])))
    await updateByURL(new URL(location.href))
  })

  /*
  * Gets messages from background script which relays tab update events. This is because there's no sensible way to detect
  * history.pushState changes from a content script
  */
  // Listen URL Change
  chrome.runtime.onMessage.addListener(onUrlChange)

  // We should get this from background, so the caching works and we don't get erros in the future if yt decides to impliment CORS
  async function requestLbryPathname(videoId: string)  
  {
    return await new Promise<string | null>((resolve) => chrome.runtime.sendMessage({ videoId }, resolve))
  }

  function getVideoTime(url: URL)
  {
    return settings.redirect ?
      (url.searchParams.has('t') ? parseYouTubeURLTimeString(url.searchParams.get('t')!) : null) :
      (videoElement.currentTime > 3 && videoElement.currentTime < videoElement.duration - 1 ? videoElement.currentTime : null)
  }

  async function updateByURL(url: URL) 
  {
    console.log(url)
    if (url.pathname !== '/watch') return

    const videoId = url.searchParams.get('v')
    const lbryPathname = videoId && await requestLbryPathname(videoId)
    if (lbryPathname) target = { lbryPathname, platfrom: targetPlatformSettings[settings.targetPlatform], time: getVideoTime(url) }
    else target = null

    if (settings.redirect) target && redirectTo(target)
    else updateButton(buttonMountPoint, target)
  }

  videoElement.addEventListener('timeupdate',
    () => target && updateButton(buttonMountPoint, Object.assign(target, { time: getVideoTime(new URL(location.href)) })))

  async function onUrlChange()
  {
    await updateByURL(new URL(location.href))
  }

  await updateByURL(new URL(location.href))
})