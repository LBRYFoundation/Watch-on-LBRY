import chunk from 'lodash/chunk';
import groupBy from 'lodash/groupBy';
import pickBy from 'lodash/pickBy';

const LBRY_API_HOST = 'https://api.odysee.com';
const QUERY_CHUNK_SIZE = 300;

interface YtResolverResponse {
  success: boolean;
  error: object | null;
  data: {
    videos?: Record<string, string>;
    channels?: Record<string, string>;
  };
}

interface YtSubscription {
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

export interface YTDescriptor {
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
    const subscriptions: YtSubscription[] = JSON.parse(jsonContents);
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
    return rows.map((row) => row.substr(0, row.indexOf(',')))
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

  getId(url: string): YTDescriptor | null {
    const videoId = ytService.getVideoId(url);
    if (videoId) return { id: videoId, type: 'video' };
    const channelId = ytService.getChannelId(url);
    if (channelId) return { id: channelId, type: 'channel' };
    return null;
  },

  /**
  * @param descriptors YT resource IDs to check
  * @returns a promise with the list of channels that were found on lbry
  */
  async resolveById(...descriptors: YTDescriptor[]): Promise<string[]> {
    const descChunks = chunk(descriptors, QUERY_CHUNK_SIZE);
    const responses: (YtResolverResponse | null)[] = await Promise.all(descChunks.map(descChunk => {
      const groups = groupBy(descChunk, d => d.type);
      const params = new URLSearchParams(pickBy({
        video_ids: groups['video']?.map(s => s.id).join(','),
        channel_ids: groups['channel']?.map(s => s.id).join(','),
      }));
      return fetch(`${LBRY_API_HOST}/yt/resolve?${params}`, { cache: 'force-cache' })
        .then(rsp => rsp.ok ? rsp.json() : null);
    }));

    return responses.filter((rsp): rsp is YtResolverResponse => !!rsp)
      .flatMap(rsp => [...Object.values(rsp.data.videos || {}), ...Object.values(rsp.data.channels || {})])  // flatten the results into a 1D array
      .filter(s => s);
  },
};
