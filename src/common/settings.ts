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


export type TargetPlatformName = 'madiator.com' | 'odysee' | 'app'
export interface TargetPlatform {
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
}

export const targetPlatformSettings: Record<TargetPlatformName, TargetPlatform> = {
  'madiator.com': {
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
  },
  odysee: {
    domainPrefix: 'https://odysee.com/',
    displayName: 'Odysee',
    theme: '#1e013b',
    button: {
      text: 'Watch on Odysee',
      icon: chrome.runtime.getURL('icons/lbry/odysee-logo.svg')
    }
  },
  app: {
    domainPrefix: 'lbry://',
    displayName: 'LBRY App',
    theme: '#075656',
    button: {
      text: 'Watch on LBRY',
      icon: chrome.runtime.getURL('icons/lbry/lbry-logo.svg')
    }
  },
}

export const getTargetPlatfromSettingsEntiries = () => {
  return Object.entries(targetPlatformSettings) as any as [Extract<keyof typeof targetPlatformSettings, string>, TargetPlatform][]
}



export type SourcePlatformName = 'youtube.com' | 'yewtu.be'
export interface SourcePlatform {
  hostnames: string[]
  htmlQueries: {
    mountButtonBefore: string,
    videoPlayer: string
  }
}

export const sourcePlatfromSettings: Record<SourcePlatformName, SourcePlatform> = {
  "yewtu.be": {
    hostnames: ['yewtu.be', 'vid.puffyan.us', 'invidio.xamh.de', 'invidious.kavin.rocks'],
    htmlQueries: {
      mountButtonBefore: '#watch-on-youtube',
      videoPlayer: '#player-container video'
    }
  },
  "youtube.com": {
    hostnames: ['www.youtube.com'],
    htmlQueries: {
      mountButtonBefore: 'ytd-video-owner-renderer~#subscribe-button',
      videoPlayer: '#ytd-player video'
    }
  }
}

export function getSourcePlatfromSettingsFromHostname(hostname: string) {
  const values = Object.values(sourcePlatfromSettings)
  for (const settings of values)
    if (settings.hostnames.includes(hostname)) return settings
  return null
}


export type YTUrlResolverName = 'lbryInc' | 'madiatorScrap'

export const Keys = Symbol('keys')
export const Values = Symbol('values')
export const SingleValueAtATime = Symbol()
export type YtUrlResolveResponsePath = (string | number | typeof Keys | typeof Values)[]
export interface YtUrlResolveFunction {
  pathname: string
  defaultParams: Record<string, string | number>
  valueParamName: string
  paramArraySeperator: string | typeof SingleValueAtATime
  responsePath: YtUrlResolveResponsePath
}
export interface YTUrlResolver {
  name: string
  hostname: string
  functions: {
    getChannelId: YtUrlResolveFunction
    getVideoId: YtUrlResolveFunction
  }
}

export const ytUrlResolversSettings: Record<YTUrlResolverName, YTUrlResolver> = {
  lbryInc: {
    name: "Odysee",
    hostname: "api.odysee.com",
    functions: {
      getChannelId: {
        pathname: "/yt/resolve",
        defaultParams: {},
        valueParamName: "channel_ids",
        paramArraySeperator: ',',
        responsePath: ["data", "channels", Values]
      },
      getVideoId: {
        pathname: "/yt/resolve",
        defaultParams: {},
        valueParamName: "video_ids",
        paramArraySeperator: ",",
        responsePath: ["data", "videos", Values]
      }
    }
  },
  madiatorScrap: {
    name: "Madiator.com",
    hostname: "scrap.madiator.com",
    functions: {
      getChannelId: {
        pathname: "/api/get-lbry-channel",
        defaultParams: {
          v: 2
        },
        valueParamName: "url",
        paramArraySeperator: SingleValueAtATime,
        responsePath: ["lbrych"]
      },
      getVideoId: {
        pathname: "/api/get-lbry-video",
        defaultParams: {
          v: 2
        },
        valueParamName: "url",
        paramArraySeperator: SingleValueAtATime,
        responsePath: ["lbryurl"]
      }
    }
  }
}

export const getYtUrlResolversSettingsEntiries = () => {
  return Object.entries(ytUrlResolversSettings) as any as [Extract<keyof typeof ytUrlResolversSettings, string>, YTUrlResolver][]
}