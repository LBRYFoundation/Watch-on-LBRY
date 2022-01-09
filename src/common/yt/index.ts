import chunk from 'lodash/chunk'
import groupBy from 'lodash/groupBy'
import { getExtensionSettingsAsync, Keys, SingleValueAtATime, Values, YtUrlResolveFunction, YtUrlResolveResponsePath, ytUrlResolversSettings } from '../settings'
import { LbryURLCache } from './urlCache'

// const LBRY_API_HOST = 'https://api.odysee.com'; MOVED TO SETTINGS
const QUERY_CHUNK_SIZE = 300

interface YtExportedJsonSubscription
{
    id: string
    etag: string
    title: string
    snippet: {
        description: string
        resourceId: {
            channelId: string
        }
    }
}

export interface YtIdResolverDescriptor
{
    id: string
    type: 'channel' | 'video'
}

/**
 * @param file to load
 * @returns a promise with the file as a string
 */
export function getFileContent(file: File): Promise<string>
{
    return new Promise((resolve, reject) =>
    {
        const reader = new FileReader()
        reader.addEventListener('load', event => resolve(event.target?.result as string || ''))
        reader.addEventListener('error', () =>
        {
            reader.abort()
            reject(new DOMException(`Could not read ${file.name}`))
        })
        reader.readAsText(file)
    })
}

/**
 * Extracts the channelID from a YT URL.
 *
 * Handles these two types of YT URLs:
 *  * /feeds/videos.xml?channel_id=*
 *  * /channel/*
 */
export function getChannelId(channelURL: string)
{
    const match = channelURL.match(/channel\/([^\s?]*)/)
    return match ? match[1] : new URL(channelURL).searchParams.get('channel_id')
}

/**
 * Reads the array of YT channels from an OPML file
 *
 * @param opmlContents an opml file as as tring
 * @returns the channel IDs
 */
export function getSubsFromOpml(opmlContents: string): string[]
{
    const opml = new DOMParser().parseFromString(opmlContents, 'application/xml')
    opmlContents = ''
    return Array.from(opml.querySelectorAll('outline > outline'))
        .map(outline => outline.getAttribute('xmlUrl'))
        .filter((url): url is string => !!url)
        .map(url => getChannelId(url))
        .filter((url): url is string => !!url) // we don't want it if it's empty
}

/**
 * Reads an array of YT channel IDs from the YT subscriptions JSON file
 *
 * @param jsonContents a JSON file as a string
 * @returns the channel IDs
 */
export function getSubsFromJson(jsonContents: string): string[]
{
    const subscriptions: YtExportedJsonSubscription[] = JSON.parse(jsonContents)
    jsonContents = ''
    return subscriptions.map(sub => sub.snippet.resourceId.channelId)
}

/**
 * Reads an array of YT channel IDs from the YT subscriptions CSV file
 *
 * @param csvContent a CSV file as a string
 * @returns the channel IDs
 */
export function getSubsFromCsv(csvContent: string): string[]
{
    const rows = csvContent.split('\n')
    csvContent = ''
    return rows.slice(1).map((row) => row.substring(0, row.indexOf(',')))
}

/**
* @param descriptorsWithIndex YT resource IDs to check
* @returns a promise with the list of channels that were found on lbry
*/
export async function resolveById(descriptors: YtIdResolverDescriptor[], progressCallback?: (progress: number) => void): Promise<(string | null)[]>
{
    const descriptorsWithIndex: (YtIdResolverDescriptor & { index: number })[] = descriptors.map((descriptor, index) => ({ ...descriptor, index }))
    descriptors = null as any
    const results: (string | null)[] = []

    await Promise.all(descriptorsWithIndex.map(async (descriptor, index) =>
    {
        if (!descriptor) return
        const cache = await LbryURLCache.get(descriptor.id)

        // Cache can be null, if there is no lbry url yet
        if (cache !== undefined)
        {
            // Directly setting it to results
            results[index] = cache

            // We remove it so we dont ask it to API
            descriptorsWithIndex.splice(index, 1)
        }
    }))

    const descriptorsChunks = chunk(descriptorsWithIndex, QUERY_CHUNK_SIZE)
    let progressCount = 0
    await Promise.all(descriptorsChunks.map(async (descriptorChunk) => 
    {
        const descriptorsGroupedByType: Record<YtIdResolverDescriptor['type'], typeof descriptorsWithIndex | null> = groupBy(descriptorChunk, (descriptor) => descriptor.type) as any

        const { urlResolver: urlResolverSettingName } = await getExtensionSettingsAsync()
        const urlResolverSetting = ytUrlResolversSettings[urlResolverSettingName]

        const url = new URL(`https://${urlResolverSetting.hostname}`)

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
                await Promise.all(descriptorsGroup.map(async (descriptor) =>
                {
                    switch (null)
                    {
                        default:
                            if (!descriptor.id) break
                            url.searchParams.set(urlResolverFunction.paramName, descriptor.id)

                            const apiResponse = await fetch(url.toString(), { cache: 'no-store' })
                            if (!apiResponse.ok)
                            {
                                // Some API might not respond with 200 if it can't find the url
                                if (apiResponse.status === 404) await LbryURLCache.put(null, descriptor.id)
                                break
                            }

                            const value = followResponsePath<string>(await apiResponse.json(), urlResolverFunction.responsePath)
                            if (value) results[descriptor.index] = value
                            await LbryURLCache.put(value, descriptor.id)
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

                        const apiResponse = await fetch(url.toString(), { cache: 'no-store' })
                        if (!apiResponse.ok) break
                        const values = followResponsePath<string[]>(await apiResponse.json(), urlResolverFunction.responsePath)

                        await Promise.all(values.map(async (value, index) =>
                        {
                            const descriptor = descriptorsGroup[index]
                            if (value) results[descriptor.index] = value
                            await LbryURLCache.put(value, descriptor.id)
                        }))
                }
                progressCount += descriptorsGroup.length
                if (progressCallback) progressCallback(progressCount / descriptorsWithIndex.length)
            }
        }

        if (descriptorsGroupedByType['channel']) await requestGroup(urlResolverSetting.functions.getChannelId, descriptorsGroupedByType['channel'])
        if (descriptorsGroupedByType['video']) await requestGroup(urlResolverSetting.functions.getVideoId, descriptorsGroupedByType['video'])

    }))

    return results
}