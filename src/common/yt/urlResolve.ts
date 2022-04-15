import { chunk } from "lodash"
import { sign } from "../crypto"
import { getExtensionSettingsAsync, ytUrlResolversSettings } from "../settings"
import { LbryPathnameCache } from "./urlCache"

const QUERY_CHUNK_SIZE = 100

export type YtUrlResolveItem = { type: 'video' | 'channel', id: string }
type Results = Record<string, YtUrlResolveItem>
type Paramaters = YtUrlResolveItem[]

interface ApiResponse {
    channels?: Record<string, string>
    videos?: Record<string, string>
}

export async function resolveById(params: Paramaters, progressCallback?: (progress: number) => void): Promise<Results> {
    const { urlResolver: urlResolverSettingName, privateKey, publicKey } = await getExtensionSettingsAsync()
    const urlResolverSetting = ytUrlResolversSettings[urlResolverSettingName]

    async function requestChunk(params: Paramaters) {
        const results: Results = {}

        // Check for cache first, add them to the results if there are any cache
        // And remove them from the params, so we dont request for them
        params = (await Promise.all(params.map(async (item) => {
            const cachedLbryUrl = await LbryPathnameCache.get(item.id)

            // Cache can be null, if there is no lbry url yet
            if (cachedLbryUrl !== undefined) {
                // Null values shouldn't be in the results
                if (cachedLbryUrl !== null) results[item.id] = { id: cachedLbryUrl, type: item.type }
                return null
            }

            // No cache found
            return item
        }))).filter((o) => o) as Paramaters

        if (params.length === 0) return results

        const url = new URL(`${urlResolverSetting.href}`)
        url.searchParams.set('video_ids', params.filter((item) => item.type === 'video').map((item) => item.id).join(','))
        url.searchParams.set('channel_ids', params.filter((item) => item.type === 'channel').map((item) => item.id).join(','))
        if (publicKey && privateKey)
            url.searchParams.set('keys', JSON.stringify({
                signature: await sign(url.searchParams.toString(), privateKey),
                publicKey
            }))

        const apiResponse = await fetch(url.toString(), { cache: 'no-store' })
        if (apiResponse.ok) {
            const response: ApiResponse = await apiResponse.json()
            for (const [id, lbryUrl] of Object.entries(response.channels ?? {})) {
                // we cache it no matter if its null or not
                await LbryPathnameCache.put(lbryUrl, id)

                if (lbryUrl) results[id] = { id: lbryUrl, type: 'channel' }
            }
            for (const [id, lbryUrl] of Object.entries(response.videos ?? {})) {
                // we cache it no matter if its null or not
                await LbryPathnameCache.put(lbryUrl, id)

                if (lbryUrl) results[id] = { id: lbryUrl, type: 'video' }
            }
        }

        return results
    }

    const results: Results = {}
    const chunks = chunk(params, QUERY_CHUNK_SIZE)

    let i = 0
    if (progressCallback) progressCallback(0)
    for (const chunk of chunks) {
        if (progressCallback) progressCallback(++i / (chunks.length + 1))
        Object.assign(results, await requestChunk(chunk))
    }
    console.log(results)

    if (progressCallback) progressCallback(1)
    return results
}
