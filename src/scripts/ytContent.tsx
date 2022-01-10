import { h, render } from 'preact'
import { getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, TargetPlatform, targetPlatformSettings } from '../common/settings'
import { parseYouTubeURLTimeString } from '../common/yt'

const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t))

interface WatchOnLbryButtonParameters {
  targetPlatform?: TargetPlatform
  lbryPathname?: string
  time?: number
}

interface Target {
  platfrom: TargetPlatform
  lbryPathname: string
  time: number | null
}

function WatchOnLbryButton({ targetPlatform, lbryPathname, time }: WatchOnLbryButtonParameters) {
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

function updateButton(mountPoint: HTMLDivElement, target: Target | null): void {
  if (!target) return render(<WatchOnLbryButton />, mountPoint)
  render(<WatchOnLbryButton targetPlatform={target.platfrom} lbryPathname={target.lbryPathname} time={target.time ?? undefined} />, mountPoint)
}

async function redirectTo({ lbryPathname, platfrom, time }: Target) {
  const url = new URL(`${platfrom.domainPrefix}${lbryPathname}`)

  if (time) url.searchParams.set('t', time.toFixed(0))

  findVideoElement().then((videoElement) => {
    videoElement.addEventListener('play', () => videoElement.pause(), { once: true })
    videoElement.pause()
  })

  if (platfrom === targetPlatformSettings.app) {
    if (document.hidden) await new Promise((resolve) => document.addEventListener('visibilitychange', resolve, { once: true }))
    open(url, '_blank')
    if (window.history.length === 1) window.close()
    else window.history.back()
  }
  location.replace(url.toString())
}

/** Returns a mount point for the button */
async function findButtonMountPoint(): Promise<HTMLDivElement> {
  const id = 'watch-on-lbry-button-container'
  let mountBefore: HTMLDivElement | null = null
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)
  const exits: HTMLDivElement | null = document.querySelector(`#${id}`)
  if (exits) return exits
  while (!(mountBefore = document.querySelector(sourcePlatform.htmlQueries.mountButtonBefore))) await sleep(200)

  const div = document.createElement('div')
  div.id = id
  div.style.display = 'flex'
  div.style.alignItems = 'center'
  mountBefore.parentElement?.insertBefore(div, mountBefore)

  return div
}

async function findVideoElement() {
  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)
  let videoElement: HTMLVideoElement | null = null
  while (!(videoElement = document.querySelector(sourcePlatform.htmlQueries.videoPlayer))) await sleep(200)
  return videoElement
}

// We should get this from background, so the caching works and we don't get errors in the future if yt decides to impliment CORS
async function requestLbryPathname(videoId: string) {
  return await new Promise<string | null>((resolve) => chrome.runtime.sendMessage({ videoId }, resolve))
}

// Start
(async () => {
  const settings = await getExtensionSettingsAsync()
  let updater: (() => Promise<void>)

  // Listen Settings Change
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return
    Object.assign(settings, Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.newValue])))
    if (changes.redirect) await onModeChange()
  })

  /*
  * Gets messages from background script which relays tab update events. This is because there's no sensible way to detect
  * history.pushState changes from a content script
  */
  // Listen URL Change
  chrome.runtime.onMessage.addListener(() => updater())

  async function getTargetByURL(url: URL) {
    if (url.pathname !== '/watch') return null

    const videoId = url.searchParams.get('v')
    const lbryPathname = videoId && await requestLbryPathname(videoId)
    const target: Target | null = lbryPathname ? { lbryPathname, platfrom: targetPlatformSettings[settings.targetPlatform], time: null } : null

    return target
  }

  let removeVideoTimeUpdateListener: (() => void) | null = null
  async function onModeChange() {
    let target: Target | null = null
    if (settings.redirect)
      updater = async () => {
        const url = new URL(location.href)
        target = await getTargetByURL(url)
        if (!target) return
        target.time = url.searchParams.has('t') ? parseYouTubeURLTimeString(url.searchParams.get('t')!) : null
        redirectTo(target)
      }
    else {
      const mountPoint = await findButtonMountPoint()
      const videoElement = await findVideoElement()

      const getTime = () => videoElement.currentTime > 3 && videoElement.currentTime < videoElement.duration - 1 ? videoElement.currentTime : null

      const onTimeUpdate = () => target && updateButton(mountPoint, Object.assign(target, { time: getTime() }))
      removeVideoTimeUpdateListener?.call(null)
      videoElement.addEventListener('timeupdate', onTimeUpdate)
      removeVideoTimeUpdateListener = () => videoElement.removeEventListener('timeupdate', onTimeUpdate)

      updater = async () => {
        const url = new URL(location.href)
        target = await getTargetByURL(url)
        if (target) target.time = getTime()
        updateButton(mountPoint, target)
      }
    }

    await updater()
  }

  await onModeChange()
})()