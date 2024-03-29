import { resolveById } from "../modules/yt/urlResolve"

const onGoingLbryPathnameRequest: Record<string, ReturnType<typeof resolveById>> = {}

chrome.runtime.onMessage.addListener(({ method, data }, sender, sendResponse) => {
  function resolve(result: Awaited<ReturnType<typeof resolveById>>) {
    sendResponse(JSON.stringify(result))
  }
  (async () => {

    switch (method) {
      case 'openTab':
        {
          const { href }: { href: string } = JSON.parse(data)
          chrome.tabs.create({ url: href, active: sender.tab?.active, index: sender.tab ? sender.tab.index + 1 : undefined })
        }
        break
      case 'resolveUrl':
        try {
          const params: Parameters<typeof resolveById> = JSON.parse(data)
          // Don't create a new Promise for same ID until on going one is over.
          const promise = onGoingLbryPathnameRequest[data] ?? (onGoingLbryPathnameRequest[data] = resolveById(...params))
          resolve(await promise)
        } catch (error) {
          sendResponse(`error: ${(error as any).toString()}`)
          console.error(error)
        }
        finally {
          delete onGoingLbryPathnameRequest[data]
        }
        break
    }
  })()

  return true
})