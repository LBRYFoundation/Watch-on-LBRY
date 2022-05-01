import { resolveById } from "../modules/yt/urlResolve"

const onGoingLbryPathnameRequest: Record<string, ReturnType<typeof resolveById>> = {}

chrome.runtime.onMessage.addListener(({ json }, sender, sendResponse) => {
  function resolve(result: Awaited<ReturnType<typeof resolveById>>) {
    sendResponse(JSON.stringify(result))
  }
  (async () => {
    try {
      const params: Parameters<typeof resolveById> = JSON.parse(json)
      // Don't create a new Promise for same ID until on going one is over.
      const promise = onGoingLbryPathnameRequest[json] ?? (onGoingLbryPathnameRequest[json] = resolveById(...params))
      console.log('lbrypathname request', params, await promise)
      resolve(await promise)
    } catch (error) {
      sendResponse('error')
      console.error(error)
    }
    finally {
      delete onGoingLbryPathnameRequest[json]
    }
  })()

  return true
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => changeInfo.status === 'complete' && chrome.tabs.sendMessage(tabId, { message: 'url-changed' }))