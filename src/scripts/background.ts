import { resolveById, YtUrlResolveItem } from '../common/yt/urlResolve'

async function resolveYT(item: YtUrlResolveItem) {
  const lbryProtocolUrl: string | null = (await resolveById([item]).then((items) => items[item.id]))?.id ?? null
  if (!lbryProtocolUrl) return null
  return lbryProtocolUrl.replaceAll('#', ':')
  /* const segments = parseProtocolUrl(lbryProtocolUrl || '', { encode: true })
  if (segments.length === 0) throw new Error()
  return segments.join('/') */
}

const onGoingLbryPathnameRequest: Record<string, Promise<string | null>> = {}
async function lbryPathnameFromVideoId(videoId: string): Promise<string | null> {
  // Don't create a new Promise for same ID until on going one is over.
  try {
    const promise = onGoingLbryPathnameRequest[videoId] ?? (onGoingLbryPathnameRequest[videoId] = resolveYT({ id: videoId, type: 'video' }))
    console.log('lbrypathname request', videoId, await promise)
    return await promise
  } catch (error) {
    throw error
  }
  finally {
    delete onGoingLbryPathnameRequest[videoId]
  }
}

chrome.runtime.onMessage.addListener(({ videoId }: { videoId: string }, sender, sendResponse) => {
  lbryPathnameFromVideoId(videoId).then((lbryPathname) => sendResponse(lbryPathname)).catch((err) => {
    sendResponse('error')
    console.error(err)
  })
  return true
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => changeInfo.url && chrome.tabs.sendMessage(tabId, {}))