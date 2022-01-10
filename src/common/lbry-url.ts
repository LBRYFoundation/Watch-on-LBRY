// Port of https://github.com/lbryio/lbry-sdk/blob/master/lbry/schema/url.py

interface UrlOptions {
  /**
   * Whether or not to encodeURIComponent the path segments.
   * Doing so is a workaround such that browsers interpret it as a valid URL in a way that the desktop app understands.
   */
  encode?: boolean
}

const invalidNamesRegex = /[^=&#:$@%*?;\"/\\<>%{}|^~`\[\]\u0000-\u0020\uD800-\uDFFF\uFFFE-\uFFFF]+/.source

/** Creates a named regex group */
const named = (name: string, regex: string) => `(?<${name}>${regex})`
/** Creates a non-capturing group */
const group = (regex: string) => `(?:${regex})`
/** Allows for one of the patterns */
const oneOf = (...choices: string[]) => group(choices.join('|'))
/** Create an lbry url claim */
const claim = (name: string, prefix = '') => group(
  named(`${name}_name`, prefix + invalidNamesRegex)
  + oneOf(
    group(':' + named(`${name}_claim_id`, '[0-9a-f]{1,40}')),
    group('\\*' + named(`${name}_sequence`, '[1-9][0-9]*')),
    group('\\$' + named(`${name}_amount_order`, '[1-9][0-9]*'))
  ) + '?'
)

/** Create an lbry url claim, but use the old pattern for claims */
const legacyClaim = (name: string, prefix = '') => group(
  named(`${name}_name`, prefix + invalidNamesRegex)
  + oneOf(
    group('#' + named(`${name}_claim_id`, '[0-9a-f]{1,40}')),
    group(':' + named(`${name}_sequence`, '[1-9][0-9]*')),
    group('\\$' + named(`${name}_amount_order`, '[1-9][0-9]*'))
  ) + '?')

export const builder = { named, group, oneOf, claim, legacyClaim, invalidNamesRegex }

/** Creates a pattern to parse lbry protocol URLs. Unused, but I left it here. */
function createProtocolUrlRegex(legacy = false) {
  const claim = legacy ? builder.legacyClaim : builder.claim
  return new RegExp('^' + named('scheme', 'lbry://') + '?' + oneOf(
    group(claim('channel_with_stream', '@') + '/' + claim('stream_in_channel')),
    claim('channel', '@'),
    claim('stream'),
  ) + '$')
}

/** Creates a pattern to match lbry.tv style sites by their pathname */
function createWebUrlRegex(legacy = false) {
  const claim = legacy ? builder.legacyClaim : builder.claim
  return new RegExp('^/' + oneOf(
    group(claim('channel_with_stream', '@') + '/' + claim('stream_in_channel')),
    claim('channel', '@'),
    claim('stream'),
  ) + '$')
}

/** Pattern for lbry.tv style sites */
export const URL_REGEX = createWebUrlRegex()
export const PROTOCOL_URL_REGEX = createProtocolUrlRegex()
const PROTOCOL_URL_REGEX_LEGACY = createProtocolUrlRegex(true)

/**
 * Encapsulates a lbry url path segment.
 * Handles `StreamClaimNameAndModifier' and `ChannelClaimNameAndModifier`
 */
export class PathSegment {
  constructor(public name: string,
    public claimID?: string,
    public sequence?: number,
    public amountOrder?: number) { }

  static fromMatchGroup(segment: string, groups: Record<string, string>) {
    return new PathSegment(
      groups[`${segment}_name`],
      groups[`${segment}_claim_id`],
      parseInt(groups[`${segment}_sequence`]),
      parseInt(groups[`${segment}_amount_order`])
    )
  }

  /** Prints the segment */
  toString() {
    if (this.claimID) return `${this.name}:${this.claimID}`
    if (this.sequence) return `${this.name}*${this.sequence}`
    if (this.amountOrder) return `${this.name}$${this.amountOrder}`
    return this.name
  }
}

/**
 * Utility function
 *
 * @param ptn pattern to use; specific to the patterns defined in this file
 * @param url the url to try to parse
 * @returns an array of path segments; if invalid, will return an empty array
 */
function patternSegmenter(ptn: RegExp, url: string, options: UrlOptions = { encode: false }): string[] {
  const match = url.match(ptn)?.groups
  if (!match) return []

  const segments = match['channel_name'] ? ['channel']
    : match['channel_with_stream_name'] ? ['channel_with_stream', 'stream_in_channel']
      : match['stream_name'] ? ['stream']
        : null

  if (!segments) throw new Error(`${url} matched the overall pattern, but could not determine type`)

  return segments.map(s => PathSegment.fromMatchGroup(s, match).toString())
    .map(s => options.encode ? encodeURIComponent(s) : s)
}

/**
 * Produces the lbry protocl URL from the frontend URL
 *
 * @param url lbry frontend URL
 * @param options options for the redirect
 */
export function appRedirectUrl(url: string, options?: UrlOptions): string | undefined {
  const segments = patternSegmenter(URL_REGEX, new URL(url).pathname, options)
  if (segments.length === 0) return
  const path = segments.join('/')

  return `lbry://${path}`
}

/**
 * Parses a lbry protocol and returns its constituent path segments. Attempts the spec compliant and then the old URL schemes.
 *
 * @param url the lbry url
 * @returns an array of path segments; if invalid, will return an empty array
 */
export function parseProtocolUrl(url: string, options: UrlOptions = { encode: false }): string[] {
  for (const ptn of [PROTOCOL_URL_REGEX, PROTOCOL_URL_REGEX_LEGACY]) {
    const segments = patternSegmenter(ptn, url, options)
    if (segments.length === 0) continue
    return segments
  }
  return []
}
