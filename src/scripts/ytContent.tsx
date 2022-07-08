import { h, render } from 'preact'
import { parseYouTubeURLTimeString } from '../modules/yt'
import type { resolveById, ResolveUrlTypes } from '../modules/yt/urlResolve'
import { getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, getTargetPlatfromSettingsEntiries, SourcePlatform, sourcePlatfromSettings, TargetPlatform, targetPlatformSettings } from '../settings';

(async () => {
  const sleep = (t: number) => new Promise(resolve => setTimeout(resolve, t))

  interface Target {
    platform: TargetPlatform
    lbryPathname: string
    type: ResolveUrlTypes
    time: number | null
  }

  const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
  if (!sourcePlatform) return
  const targetPlatforms = getTargetPlatfromSettingsEntiries()

  const settings = await getExtensionSettingsAsync()
  // Listen Settings Change
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return
    Object.assign(settings, Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.newValue])))
  })

  const mountPoint = document.createElement('div')
  mountPoint.style.display = 'flex'

  function WatchOnLbryButton({ target }: { target?: Target }) {
    if (!target) return null
    const url = getLbryUrlByTarget(target)

    return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
      <a href={`${url.href}`} target={target.platform === targetPlatformSettings.app ? '' : '_blank'} role='button'
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          borderRadius: '2px',
          backgroundColor: target.platform.theme,
          backgroundImage: target.platform.theme,
          fontWeight: 'bold',
          border: '0',
          color: 'whitesmoke',
          padding: '10px 16px',
          marginRight: target.type === 'channel' ? '10px' : '4px',
          fontSize: '14px',
          textDecoration: 'none',
          ...target.platform.button.style?.button,
        }}
        onClick={() => findVideoElementAwait().then((videoElement) => {
          videoElement.pause()
        })}
      >
        <img src={target.platform.button.icon} height={16}
          style={{ transform: 'scale(1.5)', ...target.platform.button.style?.icon }} />
        <span>{target.platform.button.text}</span>
      </a>
    </div>
  }

  function updateButton(target: Target | null): void {
    if (!target) return render(<WatchOnLbryButton />, mountPoint)

    const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
    if (!sourcePlatform) return render(<WatchOnLbryButton />, mountPoint)

    const mountBefore = document.querySelector(sourcePlatform.htmlQueries.mountButtonBefore[target.type])
    if (!mountBefore) return render(<WatchOnLbryButton />, mountPoint)

    mountBefore.parentElement?.insertBefore(mountPoint, mountBefore)
    render(<WatchOnLbryButton target={target} />, mountPoint)
  }

  async function findVideoElementAwait() {
    const sourcePlatform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
    if (!sourcePlatform) throw new Error(`Unknown source of: ${location.href}`)
    let videoElement: HTMLVideoElement | null = null
    while (!(videoElement = document.querySelector(sourcePlatform.htmlQueries.videoPlayer))) await sleep(200)
    return videoElement
  }

  async function getTargetsByURL(...urls: URL[]) {
    const params: Parameters<typeof requestResolveById>[0] = []
    const platform = targetPlatformSettings[settings.targetPlatform]

    const datas: Record<string, { url: URL, type: ResolveUrlTypes }> = {}

    for (const url of urls) {
      if (url.pathname === '/watch' && url.searchParams.has('v')) {
        const id = url.searchParams.get('v')!
        const type: ResolveUrlTypes = 'video'
        params.push({ id, type })
        datas[id] = { url, type }
      }
      else if (url.pathname.startsWith('/channel/')) {
        const id = url.pathname.substring("/channel/".length)
        const type: ResolveUrlTypes = 'channel'
        params.push({ id, type })
        datas[id] = { url, type }
      }
      else if (url.pathname.startsWith('/c/') || url.pathname.startsWith('/user/')) {
        // We have to download the page content again because these parts of the page are not responsive
        // yt front end sucks anyway
        const content = await (await fetch(location.href)).text()
        const prefix = `https://www.youtube.com/feeds/videos.xml?channel_id=`
        const suffix = `"`
        const startsAt = content.indexOf(prefix) + prefix.length
        const endsAt = content.indexOf(suffix, startsAt)
        const id = content.substring(startsAt, endsAt)
        const type: ResolveUrlTypes = 'channel'
        params.push({ id, type })
        datas[id] = { url, type }
      }
    }

    const results = Object.entries(await requestResolveById(params))
    const targets: Record<string, Target | null> = Object.fromEntries(results.map(([id, result]) => {
      const data = datas[id]

      if (!result) return [
        data.url.href,
        null
      ]

      return [
        data.url.href,
        {
          type: data.type,
          lbryPathname: result?.id,
          platform,
          time: data.type === 'channel' ? null : (data.url.searchParams.has('t') ? parseYouTubeURLTimeString(data.url.searchParams.get('t')!) : null)
        }
      ]
    }))

    return targets
  }
  // We should get this from background, so the caching works and we don't get errors in the future if yt decides to impliment CORS
  async function requestResolveById(...params: Parameters<typeof resolveById>): ReturnType<typeof resolveById> {
    const json = await new Promise<string | null | 'error'>((resolve) => chrome.runtime.sendMessage({ json: JSON.stringify(params) }, resolve))
    if (json === 'error') 
    {
      console.error("Background error on:", params)
      throw new Error("Background error.")
    }
    return json ? JSON.parse(json) : null
  }

  function getLbryUrlByTarget(target: Target) {
    const url = new URL(`${target.platform.domainPrefix}${target.lbryPathname}`)
    if (target.time) url.searchParams.set('t', target.time.toFixed(0))

    return url
  }

  let urlCache: URL | null = null
  while (true) {
    await sleep(500)

    const url: URL = (urlCache?.href === location.href) ? urlCache : new URL(location.href);
    try {
      if (settings.redirect) {
        const target = (await getTargetsByURL(url))[url.href]
        if (!target) continue
        if (url === urlCache) continue
  
        const lbryURL = getLbryUrlByTarget(target)
  
        findVideoElementAwait().then((videoElement) => {
          videoElement.addEventListener('play', () => videoElement.pause(), { once: true })
          videoElement.pause()
        })
  
        if (target.platform === targetPlatformSettings.app) {
          if (document.hidden) await new Promise((resolve) => document.addEventListener('visibilitychange', resolve, { once: true }))
          // Its not gonna be able to replace anyway
          // This was empty window doesnt stay open
          location.replace(lbryURL)
        }
        else {
          open(lbryURL, '_blank')
          if (window.history.length === 1) window.close()
          else window.history.back()
        }
      }
      else {
        if (urlCache !== url) updateButton(null)
        let target = (await getTargetsByURL(url))[url.href]
        if (!target) {
          const descriptionElement = document.querySelector(sourcePlatform.htmlQueries.videoDescription)
          if (descriptionElement) {
            const anchors = Array.from(descriptionElement.querySelectorAll<HTMLAnchorElement>('a'))
  
            for (const anchor of anchors) {
              if (!anchor.href) continue
              const url = new URL(anchor.href)
              let lbryURL: URL | null = null
              if (sourcePlatform === sourcePlatfromSettings['youtube.com']) {
                if (!targetPlatforms.some(([key, platform]) => url.searchParams.get('q')?.startsWith(platform.domainPrefix))) continue
                lbryURL = new URL(url.searchParams.get('q')!)
              }
              else {
                if (!targetPlatforms.some(([key, platform]) => url.href.startsWith(platform.domainPrefix))) continue
                lbryURL = new URL(url.href)
              }
  
              if (lbryURL) {
                target = {
                  lbryPathname: lbryURL.pathname.substring(1),
                  time: null,
                  type: 'video',
                  platform: targetPlatformSettings[settings.targetPlatform]
                }
                break
              }
            }
          }
        }
  
        if (target?.type === 'video') {
          const videoElement = document.querySelector<HTMLVideoElement>(sourcePlatform.htmlQueries.videoPlayer)
          if (videoElement) target.time = videoElement.currentTime > 3 && videoElement.currentTime < videoElement.duration - 1 ? videoElement.currentTime : null
        }
  
        // We run it anyway with null target to hide the button
        updateButton(target)
      }
    } catch (error) {
      console.error(error)
    }
    urlCache = url
  }

})()