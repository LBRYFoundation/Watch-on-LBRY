import { chunk, groupBy } from "lodash"
import { getExtensionSettingsAsync, Keys, SingleValueAtATime, Values, YtUrlResolveFunction, YtUrlResolveResponsePath, ytUrlResolversSettings } from "../settings"
import { LbryPathnameCache } from "./urlCache"

// const LBRY_API_HOST = 'https://api.odysee.com'; MOVED TO SETTINGS
const QUERY_CHUNK_SIZE = 300

export interface YtIdResolverDescriptor
{
    id: string
    type: 'channel' | 'video'
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
         const cache = await LbryPathnameCache.get(descriptor.id)
 
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
                                 if (apiResponse.status === 404) await LbryPathnameCache.put(null, descriptor.id)
                                 break
                             }
 
                             const value = followResponsePath<string>(await apiResponse.json(), urlResolverFunction.responsePath)
                             if (value) results[descriptor.index] = value
                             await LbryPathnameCache.put(value, descriptor.id)
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
                             await LbryPathnameCache.put(value, descriptor.id)
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