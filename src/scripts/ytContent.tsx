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

  interface Source {
    platform: SourcePlatform
    id: string
    type: ResolveUrlTypes
    time: number | null
  }

  const targetPlatforms = getTargetPlatfromSettingsEntiries()
  const settings = await getExtensionSettingsAsync()
  // Listen Settings Change
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return
    Object.assign(settings, Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.newValue])))
  })

  const buttonMountPoint = document.createElement('div')
  buttonMountPoint.style.display = 'flex'

  const playerButtonMountPoint = document.createElement('div')
  playerButtonMountPoint.style.display = 'flex'

  function WatchOnLbryButton({ source, target }: { source?: Source, target?: Target }) {
    if (!target || !source) return null
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
          marginRight: source?.type === 'channel' ? '10px' : '4px',
          fontSize: '14px',
          textDecoration: 'none',
          ...target.platform.button.style?.button,
        }}
        onClick={() => findVideoElementAwait(source).then((videoElement) => {
          videoElement.pause()
        })}
      >
        <img src={target.platform.button.icon} height={16}
          style={{ transform: 'scale(1.5)', ...target.platform.button.style?.icon }} />
        <span>{target.type === 'channel' ? 'Channel on' : 'Watch on'} {target.platform.button.platformNameText}</span>
      </a>
    </div>
  }

  function WatchOnLbryPlayerButton({ source, target }: { source?: Source, target?: Target }) {
    if (!target || !source) return null
    const url = getLbryUrlByTarget(target)

    return <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
      <a href={`${url.href}`} target={target.platform === targetPlatformSettings.app ? '' : '_blank'} role='button'
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontWeight: 'bold',
          border: '0',
          color: 'whitesmoke',
          marginRight: '10px',
          fontSize: '14px',
          textDecoration: 'none',
          ...target.platform.button.style?.button,
        }}
        onClick={() => findVideoElementAwait(source).then((videoElement) => {
          videoElement.pause()
        })}
      >
        <img src={target.platform.button.icon} height={16}
          style={{ transform: 'scale(1.5)', ...target.platform.button.style?.icon }} />
        <span>{target.type === 'channel' ? 'Channel on' : 'Watch on'} {target.platform.button.platformNameText}</span>
      </a>
    </div>
  }

  function updateButton(params: { source: Source, target: Target } | null): void {
    if (!params) {
      render(<WatchOnLbryButton />, buttonMountPoint)
      render(<WatchOnLbryPlayerButton />, playerButtonMountPoint)
      return
    }

    const mountPlayerButtonBefore = params.source.platform.htmlQueries.mountPoints.mountPlayerButtonBefore ?
      document.querySelector(params.source.platform.htmlQueries.mountPoints.mountPlayerButtonBefore) :
      null
    if (!mountPlayerButtonBefore) render(<WatchOnLbryPlayerButton />, playerButtonMountPoint)
    else {
      if (mountPlayerButtonBefore.previousSibling !== playerButtonMountPoint)
        mountPlayerButtonBefore.parentElement?.insertBefore(playerButtonMountPoint, mountPlayerButtonBefore)
      render(<WatchOnLbryPlayerButton target={params.target} source={params.source} />, playerButtonMountPoint)
    }

    const mountButtonBefore = document.querySelector(params.source.platform.htmlQueries.mountPoints.mountButtonBefore[params.source.type])
    if (!mountButtonBefore) render(<WatchOnLbryButton />, playerButtonMountPoint)
    else {
      if (mountButtonBefore.previousSibling !== buttonMountPoint)
        mountButtonBefore.parentElement?.insertBefore(buttonMountPoint, mountButtonBefore)
      render(<WatchOnLbryButton target={params.target} source={params.source} />, buttonMountPoint)
    }
  }

  async function findVideoElementAwait(source: Source) {
    let videoElement: HTMLVideoElement | null = null
    while (!(videoElement = document.querySelector(source.platform.htmlQueries.videoPlayer))) await sleep(200)
    return videoElement
  }

  async function getSourceByUrl(url: URL): Promise<Source | null> {
    const platform = getSourcePlatfromSettingsFromHostname(new URL(location.href).hostname)
    if (!platform) return null

    if (url.pathname === '/watch' && url.searchParams.has('v')) {
      return {
        id: url.searchParams.get('v')!,
        platform,
        time: url.searchParams.has('t') ? parseYouTubeURLTimeString(url.searchParams.get('t')!) : null,
        type: 'video'
      }
    }
    else if (url.pathname.startsWith('/channel/')) {
      return {
        id: url.pathname.substring("/channel/".length),
        platform,
        time: null,
        type: 'channel'
      }
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
      return {
        id,
        platform,
        time: null,
        type: 'channel'
      }
    }

    return null
  }

  async function getTargetsBySources(...sources: Source[]) {
    const params: Parameters<typeof requestResolveById>[0] = sources.map((source) => ({ id: source.id, type: source.type }))
    const platform = targetPlatformSettings[settings.targetPlatform]

    const results = await requestResolveById(params)
    const targets: Record<string, Target | null> = Object.fromEntries(
      sources.map((source) => {
        const result = results[source.id]
        if (!result) return [
          source.id,
          null
        ]

        return [
          source.id,
          {
            type: result.type,
            lbryPathname: result.id,
            platform,
            time: source.time
          }
        ]
      })
    )

    return targets
  }
  // We should get this from background, so the caching works and we don't get errors in the future if yt decides to impliment CORS
  async function requestResolveById(...params: Parameters<typeof resolveById>): ReturnType<typeof resolveById> {
    const json = await new Promise<string | null | 'error'>((resolve) => chrome.runtime.sendMessage({ json: JSON.stringify(params) }, resolve))
    if (json === 'error') {
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

    const url: URL = (urlCache?.href === location.href) ? urlCache : new URL(location.href)
    const source = await getSourceByUrl(new URL(location.href))
    if (!source) continue

    try {
      if (settings.redirect) {
        const target = (await getTargetsBySources(source))[source.id]
        if (!target) continue
        if (url === urlCache) continue

        const lbryURL = getLbryUrlByTarget(target)

        // As soon as video play is ready and start playing, pause it.
        findVideoElementAwait(source).then((videoElement) => {
          videoElement.addEventListener('play', () => videoElement.pause(), { once: true })
          videoElement.pause()
        })

        if (target.platform === targetPlatformSettings.app) {
          if (document.hidden) await new Promise((resolve) => document.addEventListener('visibilitychange', resolve, { once: true }))
          // Replace is being used so browser doesnt start an empty window
          // Its not gonna be able to replace anyway, since its a LBRY Uri
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
        let target = (await getTargetsBySources(source))[source.id]

        // There is no target found via API try to check Video Description for LBRY links.
        if (!target) {
          const linksContainer =
            source.type === 'video' ?
              document.querySelector(source.platform.htmlQueries.videoDescription) :
              source.platform.htmlQueries.channelLinks ? document.querySelector(source.platform.htmlQueries.channelLinks) : null

          console.log(linksContainer)

          if (linksContainer) {
            const anchors = Array.from(linksContainer.querySelectorAll<HTMLAnchorElement>('a'))

            for (const anchor of anchors) {
              if (!anchor.href) continue
              const url = new URL(anchor.href)
              let lbryURL: URL | null = null

              // Extract real link from youtube's redirect link
              if (source.platform === sourcePlatfromSettings['youtube.com']) {
                if (!targetPlatforms.some(([key, platform]) => url.searchParams.get('q')?.startsWith(platform.domainPrefix))) continue
                lbryURL = new URL(url.searchParams.get('q')!)
              }
              // Just directly use the link itself on other platforms
              else {
                if (!targetPlatforms.some(([key, platform]) => url.href.startsWith(platform.domainPrefix))) continue
                lbryURL = new URL(url.href)
              }

              if (lbryURL) {
                target = {
                  lbryPathname: lbryURL.pathname.substring(1),
                  time: null,
                  type: lbryURL.pathname.substring(1).includes('/') ? 'video' : 'channel',
                  platform: targetPlatformSettings[settings.targetPlatform]
                }
                break
              }
            }
          }
        }

        if (!target) updateButton(null)
        else {
          // If target is a video target add timestampt to it
          if (target.type === 'video') {
            const videoElement = document.querySelector<HTMLVideoElement>(source.platform.htmlQueries.videoPlayer)
            if (videoElement) target.time = videoElement.currentTime > 3 && videoElement.currentTime < videoElement.duration - 1 ? videoElement.currentTime : null
          }

          updateButton({ target, source })
        }
      }
    } catch (error) {
      console.error(error)
    }
    urlCache = url
  }

})()