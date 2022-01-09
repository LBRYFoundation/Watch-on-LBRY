import { appRedirectUrl, parseProtocolUrl } from '../common/lbry-url'
import { getExtensionSettingsAsync, getSourcePlatfromSettingsFromHostname, TargetPlatformName } from '../common/settings'
import { YtIdResolverDescriptor, ytService } from '../common/yt'
export interface UpdateContext {
  descriptor: YtIdResolverDescriptor
  /** LBRY URL fragment */
  lbryPathname: string
  redirect: boolean
  targetPlatform: TargetPlatformName
}

async function resolveYT(descriptor: YtIdResolverDescriptor) {
  const lbryProtocolUrl: string | null = await ytService.resolveById([descriptor]).then(a => a[0]);
  const segments = parseProtocolUrl(lbryProtocolUrl || '', { encode: true });
  if (segments.length === 0) return;
  return segments.join('/');
}

const ctxFromURLOnGoingPromise: Record<string, Promise<UpdateContext | void>> = {}
async function ctxFromURL(href: string): Promise<UpdateContext | void> {
  if (!href) return;
  
  const url = new URL(href);
  if (!getSourcePlatfromSettingsFromHostname(url.hostname)) return
  if (!(url.pathname.startsWith('/watch') || url.pathname.startsWith('/channel'))) return

  const descriptor = ytService.getId(href);
  if (!descriptor) return; // couldn't get the ID, so we're done

  // Don't create a new Promise for same ID until on going one is over.
  const promise = ctxFromURLOnGoingPromise[descriptor.id] ?? (ctxFromURLOnGoingPromise[descriptor.id] = (async () => {
    // NOTE: API call cached by resolveYT method automatically
    const res = await resolveYT(descriptor)
    if (!res) return // couldn't find it on lbry, so we're done

    const { redirect, targetPlatform } = await getExtensionSettingsAsync('redirect', 'targetPlatform')
    return { descriptor, lbryPathname: res, redirect, targetPlatform }
  })())
  await promise
  delete ctxFromURLOnGoingPromise[descriptor.id]
  return await promise
}