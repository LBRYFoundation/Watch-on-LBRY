import { chunk, groupBy } from "lodash"
import { getExtensionSettingsAsync, Keys, SingleValueAtATime, Values, YtUrlResolveFunction, YtUrlResolveResponsePath, ytUrlResolversSettings } from "../settings"
import { LbryPathnameCache } from "./urlCache"

// const LBRY_API_HOST = 'https://api.odysee.com'; MOVED TO SETTINGS
const QUERY_CHUNK_SIZE = 300

export interface YtIdResolverDescriptor {
    id: string
    type: 'channel' | 'video'
}

/**
* @param descriptorsWithIndex YT resource IDs to check
* @returns a promise with the list of channels that were found on lbry
*/
export async function resolveById(descriptors: YtIdResolverDescriptor[], progressCallback?: (progress: number) => void): Promise<(string | null)[]> {
    let descriptorsPayload: (YtIdResolverDescriptor & { index: number })[] = descriptors.map((descriptor, index) => ({ ...descriptor, index }))
    descriptors = null as any
    const results: (string | null)[] = []


    descriptorsPayload = (await Promise.all(descriptorsPayload.map(async (descriptor, index) => {
        if (!descriptor?.id) return
        const cache = await LbryPathnameCache.get(descriptor.id)

        // Cache can be null, if there is no lbry url yet
        if (cache !== undefined) {
            // Null values shouldn't be in the results
            if (cache) results[index] = cache
            return
        }

        return descriptor
    }))).filter((descriptor) => descriptor) as any

    const descriptorsPayloadChunks = chunk(descriptorsPayload, QUERY_CHUNK_SIZE)
    let progressCount = 0
    await Promise.all(descriptorsPayloadChunks.map(async (descriptorChunk) => {
        const descriptorsGroupedByType: Record<YtIdResolverDescriptor['type'], typeof descriptorsPayload | null> = groupBy(descriptorChunk, (descriptor) => descriptor.type) as any

        const { urlResolver: urlResolverSettingName } = await getExtensionSettingsAsync()
        const urlResolverSetting = ytUrlResolversSettings[urlResolverSettingName]

        const url = new URL(`https://${urlResolverSetting.hostname}`)

        function followResponsePath<T>(response: any, responsePath: YtUrlResolveResponsePath) {
            for (const path of responsePath) {
                switch (typeof path) {
                    case 'string': case 'number': response = response[path]; continue
                }
                switch (path) {
                    case Keys: response = Object.keys(response); continue
                    case Values: response = Object.values(response); continue
                }
            }
            return response as T
        }

        async function requestGroup(urlResolverFunction: YtUrlResolveFunction, descriptorsGroup: typeof descriptorsPayload) {
            url.pathname = urlResolverFunction.pathname
            Object.entries(urlResolverFunction.defaultParams).forEach(([name, value]) => url.searchParams.set(name, value.toString()))

            if (urlResolverFunction.paramArraySeperator === SingleValueAtATime) {
                await Promise.all(descriptorsGroup.map(async (descriptor) => {
                    url.searchParams.set(urlResolverFunction.valueParamName, descriptor.id)

                    const apiResponse = await fetch(url.toString(), { cache: 'no-store' })
                    if (apiResponse.ok) {
                        const value = followResponsePath<string>(await apiResponse.json(), urlResolverFunction.responsePath)
                        if (value) results[descriptor.index] = value
                        await LbryPathnameCache.put(value, descriptor.id)
                    }
                    else if (apiResponse.status === 404) await LbryPathnameCache.put(null, descriptor.id)

                    progressCount++
                    if (progressCallback) progressCallback(progressCount / descriptorsPayload.length)
                }))
            }
            else {
                url.searchParams.set(urlResolverFunction.valueParamName, descriptorsGroup
                    .map((descriptor) => descriptor.id)
                    .join(urlResolverFunction.paramArraySeperator))

                const apiResponse = await fetch(url.toString(), { cache: 'no-store' })
                if (apiResponse.ok) {
                    const values = followResponsePath<string[]>(await apiResponse.json(), urlResolverFunction.responsePath)
                    await Promise.all(values.map(async (value, index) => {
                        const descriptor = descriptorsGroup[index]
                        if (value) results[descriptor.index] = value
                        await LbryPathnameCache.put(value, descriptor.id)
                    }))
                }

                progressCount += descriptorsGroup.length
                if (progressCallback) progressCallback(progressCount / descriptorsPayload.length)
            }
        }

        if (descriptorsGroupedByType['channel']) await requestGroup(urlResolverSetting.functions.getChannelId, descriptorsGroupedByType['channel'])
        if (descriptorsGroupedByType['video']) await requestGroup(urlResolverSetting.functions.getVideoId, descriptorsGroupedByType['video'])
    }))
    if (progressCallback) progressCallback(1)
    return results
}