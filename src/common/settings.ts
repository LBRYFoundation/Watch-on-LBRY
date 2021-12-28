export interface ExtensionSettings {
  redirect: boolean
  targetPlatform: TargetPlatformName
}

export const DEFAULT_SETTINGS: ExtensionSettings = { redirect: true, targetPlatform: 'odysee' };

export function getExtensionSettingsAsync<K extends Array<keyof ExtensionSettings>>(...keys: K): Promise<Pick<ExtensionSettings, K[number]>> {
  return new Promise(resolve => chrome.storage.local.get(keys, o => resolve(o as any)));
}



export type TargetPlatformName = 'madiator.com' | 'odysee' | 'app' 
export interface TargetPlatformSettings {
  domainPrefix: string
  displayName: string
  theme: string
}

export const targetPlatformSettings: Record<TargetPlatformName, TargetPlatformSettings> = {
  'madiator.com': { 
    domainPrefix: 'https://madiator.com/', 
    displayName: 'Madiator.com', 
    theme: '#075656' 
  },
  odysee: { 
    domainPrefix: 'https://odysee.com/', 
    displayName: 'Odysee', 
    theme: '#1e013b' 
  },
  app: { 
    domainPrefix: 'lbry://', 
    displayName: 'LBRY App', 
    theme: '#075656' 
  },
};

export const getTargetPlatfromSettingsEntiries = () => {
  return Object.entries(targetPlatformSettings) as any as [Extract<keyof typeof targetPlatformSettings, string>, TargetPlatformSettings][]
}



export type SourcePlatfromName = 'youtube.com' | 'yewtu.be'
export interface SourcePlatfromSettings {
  hostnames: string[]
  htmlQueries: {
    mountButtonBefore: string,
    videoPlayer: string
  }
}

export const sourcePlatfromSettings: Record<SourcePlatfromName, SourcePlatfromSettings> = {
  "yewtu.be": {
    hostnames: ['yewtu.be'],
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