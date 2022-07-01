import { h, render } from 'preact'
import { parseYouTubeURLTimeString } from '../modules/yt'
import type { resolveById } from '../modules/yt/urlResolve'
import { getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, TargetPlatform, targetPlatformSettings } from '../settings'

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
        backgroundImage: targetPlatform.theme,
        fontWeight: 'bold',
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
async function requestResolveById(...params: Parameters<typeof resolveById>): ReturnType<typeof resolveById> {
  const json = await new Promise<string | null | 'error'>((resolve) => chrome.runtime.sendMessage({ json: JSON.stringify(params) }, resolve))
  if (json === 'error') throw new Error("Background error.")
  return json ? JSON.parse(json) : null
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
    await updater()
  })

  /*
  * Gets messages from background script which relays tab update events. This is because there's no sensible way to detect
  * history.pushState changes from a content script
  */
  // Listen URL Change
  chrome.runtime.onMessage.addListener(({ message }, sender) => message === 'url-changed' && updater())

  async function getTargetByURL(url: URL) {
    if (url.pathname === '/watch' && url.searchParams.has('v')) {
      const videoId = url.searchParams.get('v')!
      const result = await requestResolveById([{ id: videoId, type: 'video' }])
      const target: Target | null = result?.[videoId] ? { lbryPathname: result[videoId].id, platfrom: targetPlatformSettings[settings.targetPlatform], time: null } : null

      return target
    }
    else if (url.pathname.startsWith('/channel/')) {
      await requestResolveById([{ id: url.pathname.substring("/channel/".length), type: 'channel' }])
    }
    else if (url.pathname.startsWith('/c/') || url.pathname.startsWith('/user/')) {
      // We have to download the page content again because these parts of the page are not responsive
      // yt front end sucks anyway
      const content = await (await fetch(location.href)).text()
      const prefix = `https://www.youtube.com/feeds/videos.xml?channel_id=`
      const suffix = `"`
      const startsAt = content.indexOf(prefix) + prefix.length
      const endsAt = content.indexOf(suffix, startsAt)
      await requestResolveById([{ id: content.substring(startsAt, endsAt), type: 'channel' }])
    }

    return null
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

      // On redirect with app, people might choose to cancel browser's dialog
      // So we dont destroy the current window automatically for them
      // And also we are keeping the same window for less distiraction
      if (settings.redirect) {
        location.replace(url.toString())
      }
      else {
        open(url.toString(), '_blank')
        if (window.history.length === 1) window.close()
        else window.history.back()
      }
    }
    else
      location.replace(url.toString())
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