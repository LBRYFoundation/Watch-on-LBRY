import { resolveById } from "../modules/yt/urlResolve"

interface BackgroundMethod<P extends any[], R> {
  PARAMS_TYPE: P
  RESULT_TYPE: R
  call(sender: chrome.runtime.MessageSender, paramsJson: string, ...params: P): Promise<R>
}

// Satifies BackgroundMethod
function backgroundMethod<P extends any[], R>(method: BackgroundMethod<P, R>['call']): BackgroundMethod<P, R> {
  return {
    PARAMS_TYPE: null as any,
    RESULT_TYPE: null as any,
    call: method
  }
}



const resolveUrlOnGoingRequest: Record<string, ReturnType<typeof resolveById>> = {}

export type BackgroundMethods = typeof methods
const methods = {

  /* 
    This method is needed to open a new tab from a content script,
    because using window.open() from a content script is blocked by Chrome while using redirect feature. 
  */ 
  openTab: backgroundMethod<[{ href: string }], void>(async (sender, json, { href }) => {
    chrome.tabs.create({ url: href, active: sender.tab?.active, index: sender.tab ? sender.tab.index + 1 : undefined })
  }),


  /*
    This method is needed to resolve a YouTube URL from a content script,
    this is on the background script because so we can cache the result and avoid making multiple requests for the same ID.
  */
  resolveUrlById: backgroundMethod<Parameters<typeof resolveById>, Awaited<ReturnType<typeof resolveById>>>(async (sender, json, ...params) => {
    try {
      // Don't create a new Promise for same ID until on going one is over.
      const promise = resolveUrlOnGoingRequest[json] ?? (resolveUrlOnGoingRequest[json] = resolveById(...params))
      return await promise
    }
    catch (error) {
      throw error
    }
    finally {
      delete resolveUrlOnGoingRequest[json]
    }
  })

} as const



chrome.runtime.onMessage.addListener(({ method, data }: { method: keyof BackgroundMethods, data: string }, sender, sendResponse) => {
  try {
    const methodData = methods[method]
    if (!methodData) throw new Error(`Unknown method: ${method}`)
    methodData.call(sender, data, ...JSON.parse(data))
    .then(result => sendResponse(JSON.stringify(result ?? null)))
  }
  catch (error) {
    sendResponse(`error: ${error?.toString?.()}`)
    console.error(error)
  }

  return true
})