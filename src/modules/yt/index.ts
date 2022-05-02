interface YtExportedJsonSubscription {
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


/**
 * Reads the array of YT channels from an OPML file
 *
 * @param opmlContents an opml file as as tring
 * @returns the channel IDs
 */
export function getSubsFromOpml(opmlContents: string): string[] {
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
export function getSubsFromJson(jsonContents: string): string[] {
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
export function getSubsFromCsv(csvContent: string): string[] {
    const rows = csvContent.split('\n')
    csvContent = ''
    return rows.slice(1).map((row) => row.substring(0, row.indexOf(',')))
}

/**
 * Extracts the channelID from a YT URL.
 *
 * Handles these two types of YT URLs:
 *  * /feeds/videos.xml?channel_id=*
 *  * /channel/*
 */
export function getChannelId(channelURL: string) {
    const match = channelURL.match(/channel\/([^\s?]*)/)
    return match ? match[1] : new URL(channelURL).searchParams.get('channel_id')
}

export function parseYouTubeURLTimeString(timeString: string) {
    const signs = timeString.replace(/[0-9]/g, '')
    if (signs.length === 0) return null
    const numbers = timeString.replace(/[^0-9]/g, '-').split('-')
    let total = 0
    for (let i = 0; i < signs.length; i++) {
        let t = parseInt(numbers[i])
        switch (signs[i]) {
            case 'd': t *= 24
            case 'h': t *= 60
            case 'm': t *= 60
            case 's': break
            default: return null
        }
        total += t
    }
    return total
}