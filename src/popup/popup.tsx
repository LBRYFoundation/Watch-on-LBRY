import { h, render } from 'preact'
import { useState } from 'preact/hooks'
import { getTargetPlatfromSettingsEntiries, getYtUrlResolversSettingsEntiries } from '../common/settings'
import { setSetting, useLbrySettings } from '../common/useSettings'
import '../common/common.css'
import './popup.css'
import { LbryPathnameCache } from '../common/yt/urlCache'
import { loginAndSetNickname } from '../common/crypto'


/** Gets all the options for redirect destinations as selection options */
const targetPlatforms = getTargetPlatfromSettingsEntiries()

const ytUrlResolverOptions = getYtUrlResolversSettingsEntiries()

function WatchOnLbryPopup() {
  const { redirect, targetPlatform, urlResolver, privateKey, publicKey } = useLbrySettings()
  let [clearingCache, updateClearingCache] = useState(() => false)

  return <div className='popup'>
    <header>
      <div className='profile'>
        {publicKey
          ? <span className='name'>{publicKey}</span>
          : <a className='button' onClick={() => loginAndSetNickname()}>Login</a>}
      </div>
    </header>
    <main>
      <section>
        <label>Pick a mode !</label>
        <div className='options'>
          <a onClick={() => setSetting('redirect', true)} className={`button ${redirect ? 'active' : ''}`}>
            Redirect
          </a>
          <a onClick={() => setSetting('redirect', false)} className={`button ${redirect ? '' : 'active'}`}>
            Show a button
          </a>
        </div>
      </section>
      <section>
        <label>Where would you like to redirect ?</label>
        <div className='options'>
          {targetPlatforms.map(([name, value]) =>
            <a onClick={() => setSetting('targetPlatform', name)} className={`button ${targetPlatform === name ? 'active' : ''}`}>
              {value.displayName}
            </a>
          )}
        </div>
      </section>
      <section>
        <label>Which resolver API you want to use ?</label>
        <div className='options'>
          {ytUrlResolverOptions.map(([name, value]) =>
            <a onClick={() => setSetting('urlResolver', name)} className={`button ${urlResolver === name ? 'active' : ''}`}>
              {value.name}
            </a>
          )}
        </div>
        <a onClick={async () => {
          updateClearingCache(true)
          await LbryPathnameCache.clearAll()
          updateClearingCache(false)
          alert("Cleared Cache!")
        }} className={`button active ${clearingCache ? 'disabled' : ''}`}>
          Clear Resolver Cache
        </a>
      </section>
    </main>
  </div>
}

render(<WatchOnLbryPopup />, document.getElementById('root')!)
