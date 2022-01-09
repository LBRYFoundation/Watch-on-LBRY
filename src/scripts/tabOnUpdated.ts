import { TargetPlatformName } from '../common/settings'
import { YtIdResolverDescriptor } from '../common/yt'
export interface UpdateContext {
  descriptor: YtIdResolverDescriptor
  /** LBRY URL fragment */
  lbryPathname: string
  redirect: boolean
  targetPlatform: TargetPlatformName
}