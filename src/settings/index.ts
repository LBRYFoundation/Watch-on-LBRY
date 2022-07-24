import type { JSX } from "preact"
import { useEffect, useReducer } from "preact/hooks"
import type { ResolveUrlTypes } from "../modules/yt/urlResolve"

export interface ExtensionSettings {
  redirect: boolean
  targetPlatform: TargetPlatformName
  urlResolver: YTUrlResolverName
  publicKey: string | null,
  privateKey: string | null
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  redirect: true,
  targetPlatform: 'odysee',
  urlResolver: 'odyseeApi',
  privateKey: null,
  publicKey: null
}

export function getExtensionSettingsAsync(): Promise<ExtensionSettings> {
  return new Promise(resolve => chrome.storage.local.get(o => resolve(o as any)))
}

/** Utilty to set a setting in the browser */
export const setExtensionSetting = <K extends keyof ExtensionSettings>(setting: K, value: ExtensionSettings[K]) => chrome.storage.local.set({ [setting]: value })


/**
 * A hook to read the settings from local storage
 *
 * @param defaultSettings the default value. Must have all relevant keys present and should not change
 */
function useSettings(defaultSettings: ExtensionSettings) {
  const [state, dispatch] = useReducer((state, nstate: Partial<ExtensionSettings>) => ({ ...state, ...nstate }), defaultSettings)
  const settingsKeys = Object.keys(defaultSettings)
  // register change listeners, gets current values, and cleans up the listeners on unload
  useEffect(() => {
    const changeListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return
      const changeEntries = Object.keys(changes).filter((key) => settingsKeys.includes(key)).map((key) => [key, changes[key].newValue])
      if (changeEntries.length === 0) return // no changes; no use dispatching
      dispatch(Object.fromEntries(changeEntries))
    }

    chrome.storage.onChanged.addListener(changeListener)
    chrome.storage.local.get(settingsKeys, async (settings) => dispatch(settings))

    return () => chrome.storage.onChanged.removeListener(changeListener)
  }, [])

  return state
}

/** A hook to read watch on lbry settings from local storage */
export const useExtensionSettings = () => useSettings(DEFAULT_SETTINGS)

const targetPlatform = (o: {
  domainPrefix: string
  displayName: string
  theme: string
  button: {
    platformNameText: string,
    icon: string
    style?:
    {
      icon?: JSX.CSSProperties
      button?: JSX.CSSProperties
    }
  }
}) => o
export type TargetPlatform = ReturnType<typeof targetPlatform>
export type TargetPlatformName = Extract<keyof typeof targetPlatformSettings, string>
export const getTargetPlatfromSettingsEntiries = () => {
  return Object.entries(targetPlatformSettings) as any as [Extract<keyof typeof targetPlatformSettings, string>, TargetPlatform][]
}
export const targetPlatformSettings = {
  'madiator.com': targetPlatform({
    domainPrefix: 'https://madiator.com/',
    displayName: 'Madiator.com',
    theme: 'linear-gradient(130deg, #499375, #43889d)',
    button: {
      platformNameText: '',
      icon: chrome.runtime.getURL('assets/icons/lbry/madiator-logo.svg'),
      style: {
        button: { flexDirection: 'row-reverse' },
        icon: { transform: 'scale(1.2)' }
      }
    }
  }),
  odysee: targetPlatform({
    domainPrefix: 'https://odysee.com/',
    displayName: 'Odysee',
    theme: 'linear-gradient(130deg, #c63d59, #f77937)',
    button: {
      platformNameText: 'Odysee',
      icon: chrome.runtime.getURL('assets/icons/lbry/odysee-logo.svg')
    }
  }),
  app: targetPlatform({
    domainPrefix: 'lbry://',
    displayName: 'LBRY App',
    theme: 'linear-gradient(130deg, #499375, #43889d)',
    button: {
      platformNameText: 'LBRY',
      icon: chrome.runtime.getURL('assets/icons/lbry/lbry-logo.svg')
    }
  }),
}



const sourcePlatform = (o: {
  hostnames: string[]
  htmlQueries: {
    mountPoints: {
      mountButtonBefore: Record<ResolveUrlTypes, string>,
      mountPlayerButtonBefore: string | null,
    }
    videoPlayer: string,
    videoDescription: string
    channelLinks: string | null
  }
}) => o
export type SourcePlatform = ReturnType<typeof sourcePlatform>
export type SourcePlatformName = Extract<keyof typeof sourcePlatfromSettings, string>
export function getSourcePlatfromSettingsFromHostname(hostname: string) {
  const values = Object.values(sourcePlatfromSettings)
  for (const settings of values)
    if (settings.hostnames.includes(hostname)) return settings
  return null
}
export const sourcePlatfromSettings = {
  "youtube.com": sourcePlatform({
    hostnames: ['www.youtube.com'],
    htmlQueries: {
      mountPoints: {
        mountButtonBefore: {
          video: 'ytd-video-owner-renderer~#subscribe-button',
          channel: '#channel-header-container #buttons'
        },
        mountPlayerButtonBefore: 'ytd-player .ytp-right-controls',
      },
      videoPlayer: '#ytd-player video',
      videoDescription: 'ytd-video-secondary-info-renderer #description',
      channelLinks: '#channel-header #links-holder'
    }
  }),
  "yewtu.be": sourcePlatform({
    hostnames: ['yewtu.be', 'vid.puffyan.us', 'invidio.xamh.de', 'invidious.kavin.rocks'],
    htmlQueries: {
      mountPoints: {
        mountButtonBefore:
        {
          video: '#watch-on-youtube',
          channel: '#subscribe'
        },
        mountPlayerButtonBefore: null,
      },
      videoPlayer: '#player-container video',
      videoDescription: '#descriptionWrapper',
      channelLinks: null
    }
  })
}

const ytUrlResolver = (o: {
  name: string
  href: string
  signRequest: boolean
}) => o
export type YTUrlResolver = ReturnType<typeof ytUrlResolver>
export type YTUrlResolverName = Extract<keyof typeof ytUrlResolversSettings, string>
export const getYtUrlResolversSettingsEntiries = () => Object.entries(ytUrlResolversSettings) as any as [Extract<keyof typeof ytUrlResolversSettings, string>, YTUrlResolver][]
export const ytUrlResolversSettings = {
  odyseeApi: ytUrlResolver({
    name: "Odysee",
    href: "https://api.odysee.com/yt",
    signRequest: false
  }),
  madiatorFinder: ytUrlResolver({
    name: "Madiator Finder",
    href: "https://finder.madiator.com/api/v1",
    signRequest: true
  }),
  /* madiatorFinderLocal: ytUrlResolver({
    name: "Madiator Finder Local",
    href: "http://127.0.0.1:3001/api/v1",
    signRequest: true
  }) */
}