import { JSX } from "preact"

export interface ExtensionSettings {
  redirect: boolean
  targetPlatform: TargetPlatformName
  urlResolver: YTUrlResolverName
}

export const DEFAULT_SETTINGS: ExtensionSettings = { redirect: true, targetPlatform: 'odysee', urlResolver: 'lbryInc' }

export function getExtensionSettingsAsync(): Promise<ExtensionSettings> {
  return new Promise(resolve => chrome.storage.local.get(o => resolve(o as any)))
}



const targetPlatform = (o: {
  domainPrefix: string
  displayName: string
  theme: string
  button: {
    text: string
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
    theme: '#075656',
    button: {
      text: 'Watch on',
      icon: chrome.runtime.getURL('icons/lbry/madiator-logo.svg'),
      style: {
        button: { flexDirection: 'row-reverse' },
        icon: { transform: 'scale(1.2)' }
      }
    }
  }),
  odysee: targetPlatform({
    domainPrefix: 'https://odysee.com/',
    displayName: 'Odysee',
    theme: '#1e013b',
    button: {
      text: 'Watch on Odysee',
      icon: chrome.runtime.getURL('icons/lbry/odysee-logo.svg')
    }
  }),
  app: targetPlatform({
    domainPrefix: 'lbry://',
    displayName: 'LBRY App',
    theme: '#075656',
    button: {
      text: 'Watch on LBRY',
      icon: chrome.runtime.getURL('icons/lbry/lbry-logo.svg')
    }
  }),
}





const sourcePlatform = (o: {
  hostnames: string[]
  htmlQueries: {
    mountButtonBefore: string,
    videoPlayer: string
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
  "yewtu.be": sourcePlatform({
    hostnames: ['yewtu.be', 'vid.puffyan.us', 'invidio.xamh.de', 'invidious.kavin.rocks'],
    htmlQueries: {
      mountButtonBefore: '#watch-on-youtube',
      videoPlayer: '#player-container video'
    }
  }),
  "youtube.com": sourcePlatform({
    hostnames: ['www.youtube.com'],
    htmlQueries: {
      mountButtonBefore: 'ytd-video-owner-renderer~#subscribe-button',
      videoPlayer: '#ytd-player video'
    }
  })
}

const ytUrlResolver = (o: {
  name: string
  href: string
}) => o
export type YTUrlResolver = ReturnType<typeof ytUrlResolver>
export type YTUrlResolverName = Extract<keyof typeof ytUrlResolversSettings, string>
export const getYtUrlResolversSettingsEntiries = () => Object.entries(ytUrlResolversSettings) as any as [Extract<keyof typeof ytUrlResolversSettings, string>, YTUrlResolver][]
export const ytUrlResolversSettings = {
  lbryInc: ytUrlResolver({
    name: "Odysee",
    href: "https://api.odysee.com/yt/resolve"
  }),
  madiatorFinder: ytUrlResolver({
    name: "Madiator Finder",
    href: "https://finder.madiator.com/api/v1/resolve"
  })
}