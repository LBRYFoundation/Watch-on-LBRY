import chunk from 'lodash/chunk';
import groupBy from 'lodash/groupBy';
import { getExtensionSettingsAsync, Keys, SingleValueAtATime, Values, YtUrlResolveFunction, YTUrlResolver, YtUrlResolveResponsePath, ytUrlResolversSettings } from './settings'

// const LBRY_API_HOST = 'https://api.odysee.com'; MOVED TO SETTINGS
const QUERY_CHUNK_SIZE = 300;

interface YtExportedJsonSubscription {
  id: string;
  etag: string;
  title: string;
  snippet: {
    description: string;
    resourceId: {
      channelId: string;
    };
  };
}

/**
 * @param file to load
 * @returns a promise with the file as a string
 */
export function getFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', event => resolve(event.target?.result as string || ''));
    reader.addEventListener('error', () => {
      reader.abort();
      reject(new DOMException(`Could not read ${file.name}`));
    });
    reader.readAsText(file);
  });
}

export interface YtIdResolverDescriptor {
  id: string
  type: 'channel' | 'video'
}

export const ytService = {

  /**
   * Reads the array of YT channels from an OPML file
   *
   * @param opmlContents an opml file as as tring
   * @returns the channel IDs
   */
  readOpml(opmlContents: string): string[] {
    const opml = new DOMParser().parseFromString(opmlContents, 'application/xml');
    opmlContents = ''
    return Array.from(opml.querySelectorAll('outline > outline'))
      .map(outline => outline.getAttribute('xmlUrl'))
      .filter((url): url is string => !!url)
      .map(url => ytService.getChannelId(url))
      .filter((url): url is string => !!url); // we don't want it if it's empty
  },

  /**
   * Reads an array of YT channel IDs from the YT subscriptions JSON file
   *
   * @param jsonContents a JSON file as a string
   * @returns the channel IDs
   */
  readJson(jsonContents: string): string[] {
    const subscriptions: YtExportedJsonSubscription[] = JSON.parse(jsonContents);
    jsonContents = ''
    return subscriptions.map(sub => sub.snippet.resourceId.channelId);
  },

  /**
   * Reads an array of YT channel IDs from the YT subscriptions CSV file
   *
   * @param csvContent a CSV file as a string
   * @returns the channel IDs
   */
  readCsv(csvContent: string): string[] {
    const rows = csvContent.split('\n')
    csvContent = ''
    return rows.slice(1).map((row) => row.substring(0, row.indexOf(',')))
  },

  /**
   * Extracts the channelID from a YT URL.
   *
   * Handles these two types of YT URLs:
   *  * /feeds/videos.xml?channel_id=*
   *  * /channel/*
   */
  getChannelId(channelURL: string) {
    const match = channelURL.match(/channel\/([^\s?]*)/);
    return match ? match[1] : new URL(channelURL).searchParams.get('channel_id');
  },

  /** Extracts the video ID from a YT URL */
  getVideoId(url: string) {
    const regex = /watch\/?\?.*v=([^\s&]*)/;
    const match = url.match(regex);
    return match ? match[1] : null; // match[1] is the videoId
  },

  getId(url: string): YtIdResolverDescriptor | null {
    const videoId = ytService.getVideoId(url);
    if (videoId) return { id: videoId, type: 'video' };
    const channelId = ytService.getChannelId(url);
    if (channelId) return { id: channelId, type: 'channel' };
    return null;
  },

  /**
  * @param descriptorsWithIndex YT resource IDs to check
  * @returns a promise with the list of channels that were found on lbry
  */
  async resolveById(descriptors: YtIdResolverDescriptor[], progressCallback?: (progress: number) => void): Promise<string[]> {
    const descriptorsWithIndex: (YtIdResolverDescriptor & { index: number })[] = descriptors.map((descriptor, index) => ({...descriptor, index}))
    
    const descriptorsChunks = chunk(descriptorsWithIndex, QUERY_CHUNK_SIZE);
    const results: string[] = []
    let progressCount = 0;
    await Promise.all(descriptorsChunks.map(async (descriptorChunk) => 
    {
      const descriptorsGroupedByType: Record<YtIdResolverDescriptor['type'], typeof descriptorsWithIndex | null> = groupBy(descriptorChunk, (descriptor) => descriptor.type) as any;

      const { urlResolver: urlResolverSettingName } = await getExtensionSettingsAsync('urlResolver')
      const urlResolverSetting = ytUrlResolversSettings[urlResolverSettingName]

      const url = new URL(`https://${urlResolverSetting.hostname}`);

      function followResponsePath<T>(response: any, responsePath: YtUrlResolveResponsePath) 
      {
        for (const path of responsePath) 
        {
          switch (typeof path) 
          {
            case 'string': 
            case 'number':
              response = response[path]
              break
            default:
              switch (path) 
              {
                case Keys:
                  response = Object.keys(response)
                  break
                case Values:
                  response = Object.values(response)
                  break
              }
          }
        }
        return response as T
      }

      async function requestGroup(urlResolverFunction: YtUrlResolveFunction, descriptorsGroup: typeof descriptorsWithIndex)
      {
        url.pathname = urlResolverFunction.pathname
        if (urlResolverFunction.paramArraySeperator === SingleValueAtATime)
        {
          await Promise.all(descriptorsGroup.map(async (descriptor) => {
            switch (null)
            {
              default:
              if (!descriptor.id) break
              url.searchParams.set(urlResolverFunction.paramName, descriptor.id)
  
              const apiResponse = await fetch(url.toString(), { cache: 'force-cache' });
              if (!apiResponse.ok) break
              const value = followResponsePath<string>(await apiResponse.json(), urlResolverFunction.responsePath)
              if (value) results[descriptor.index] = value
            }
            progressCount++
            if (progressCallback) progressCallback(progressCount / descriptorsWithIndex.length)
          }))
        }
        else
        {

          switch (null)
          {
            default:
              url.searchParams
              .set(urlResolverFunction.paramName, descriptorsGroup
                .map((descriptor) => descriptor.id)
                .filter((descriptorId) => descriptorId)
                .join(urlResolverFunction.paramArraySeperator)
              )
              const apiResponse = await fetch(url.toString(), { cache: 'force-cache' });
              if (!apiResponse.ok) break
              const values = followResponsePath<string[]>(await apiResponse.json(), urlResolverFunction.responsePath)
              values.forEach((value, index) => {
                const descriptorIndex = descriptorsGroup[index].index
                if (value) (results[descriptorIndex] = value)
              })
          }
          progressCount += descriptorsGroup.length
          if (progressCallback) progressCallback(progressCount / descriptorsWithIndex.length)
        }
      }

      if (descriptorsGroupedByType['channel']) await requestGroup(urlResolverSetting.functions.getChannelId, descriptorsGroupedByType['channel'])
      if (descriptorsGroupedByType['video']) await requestGroup(urlResolverSetting.functions.getVideoId, descriptorsGroupedByType['video'])

    }));
    
    return results
  } 
}
