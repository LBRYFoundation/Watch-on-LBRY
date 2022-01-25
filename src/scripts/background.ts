import { parseProtocolUrl } from '../common/lbry-url'
import { resolveById, YtIdResolverDescriptor } from '../common/yt/urlResolve'
async function resolveYT(descriptor: YtIdResolverDescriptor) {
  const lbryProtocolUrl: string | null = await resolveById([descriptor]).then(a => a[0])
  const segments = parseProtocolUrl(lbryProtocolUrl || '', { encode: true })
  if (segments.length === 0) return
  return segments.join('/')
}

const onGoingLbryPathnameRequest: Record<string, Promise<string | void>> = {}
async function lbryPathnameFromVideoId(videoId: string): Promise<string | void> {
  // Don't create a new Promise for same ID until on going one is over.
  const promise = onGoingLbryPathnameRequest[videoId] ?? (onGoingLbryPathnameRequest[videoId] = resolveYT({ id: videoId, type: 'video' }))
  await promise
  delete onGoingLbryPathnameRequest[videoId]
  return await promise
}

chrome.runtime.onMessage.addListener(({ videoId }: { videoId: string }, sender, sendResponse) => {
  lbryPathnameFromVideoId(videoId).then((lbryPathname) => sendResponse(lbryPathname)).catch((err) => sendResponse(err))
  return true
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => changeInfo.url && chrome.tabs.sendMessage(tabId, {}))