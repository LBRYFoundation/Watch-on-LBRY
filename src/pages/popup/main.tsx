import { h, render } from 'preact'
import { useState } from 'preact/hooks'
import { exportProfileKeysAsFile, friendlyPublicKey, generateProfileAndSetNickname, getProfile, importProfileKeysFromFile, purgeProfile, resetProfileSettings } from '../../modules/crypto'
import { LbryPathnameCache } from '../../modules/yt/urlCache'
import { getTargetPlatfromSettingsEntiries, getYtUrlResolversSettingsEntiries, setExtensionSetting, useExtensionSettings } from '../../settings'


/** Gets all the options for redirect destinations as selection options */
const targetPlatforms = getTargetPlatfromSettingsEntiries()
const ytUrlResolverOptions = getYtUrlResolversSettingsEntiries()

function WatchOnLbryPopup(params: { profile: Awaited<ReturnType<typeof getProfile>> | null }) {
  const { redirect, targetPlatform, urlResolver, privateKey, publicKey } = useExtensionSettings()
  let [loading, updateLoading] = useState(() => false)
  let [popupRoute, updateRoute] = useState<string | null>(() => null)

  const nickname = params.profile ? params.profile.nickname ?? 'No Nickname' : '...'

  async function startAsyncOperation<T>(operation: Promise<T>) {
    try {
      updateLoading(true)
      await operation
    } catch (error) {
      console.error(error)
    }
    finally {
      updateLoading(false)
    }
  }

  return <div id='popup'>

    {
      publicKey
        ? <header>
          <section>
            <label>{nickname}</label>
            <p>{friendlyPublicKey(publicKey)}</p>
            <span><b>Score: {params.profile?.score ?? '...'}</b> - <a target='_blank' href="https://finder.madiator.com/leaderboard" class="filled">🔗Leaderboard</a></span>
            {urlResolver !== 'madiatorFinder' && <span class="error">You need to use Madiator Finder API for scoring to work</span>}
          </section>
          <section>
            {
              popupRoute === 'profile'
                ? <a onClick={() => updateRoute('')} className="filled">⇐ Back</a>
                : <a className='filled' onClick={() => updateRoute('profile')} href="#profile">Profile Settings</a>
            }
          </section>
        </header>
        : <header>
          {
            popupRoute === 'profile'
              ? <a onClick={() => updateRoute('')} className="filled">⇐ Back</a>
              : <a className='filled' onClick={() => updateRoute('profile')} href="#profile">Profile Settings</a>
          }
        </header>
    }
    {
      popupRoute === 'profile' ?
        publicKey ?
          <main>
            <section>
              <div className='options'>
                <a onClick={() => startAsyncOperation(generateProfileAndSetNickname()).then(() => renderPopup())} className={`button active`}>
                  Change Nickname
                </a>
                <a onClick={() => confirm("This will delete your keypair from this device.\nStill wanna continue?\n\nNOTE: Without keypair you can't purge your data online.\nSo if you wish to purge, please use purging instead.") && resetProfileSettings() && renderPopup()} className={`button`}>
                  Forget/Logout
                </a>
              </div>
            </section>
            <section>
              <label>Backup your account</label>
              <p>Import and export your unique keypair.</p>
              <div className='options'>
                <a onClick={() => exportProfileKeysAsFile()} className={`button active`}>
                  Export
                </a>
                <a onClick={() => confirm("This will overwrite your old keypair.\nStill wanna continue?\n\nNOTE: Without keypair you can't purge your data online.\nSo if you wish to purge, please use purging instead.") && startAsyncOperation(importProfileKeysFromFile()).then(() => renderPopup())} className={`button`}>
                  Import
                </a>
              </div>
            </section>
            <section>
              <label>Purge your profile and data!</label>
              <p>Purge your profile data online and offline.</p>
              <div className='options'>
                <span className="filled button">(╯°□°）╯︵ ┻━┻</span>
                <a onClick={() => startAsyncOperation(purgeProfile()).then(() => renderPopup())} className={`button`}>
                  Purge Everything!!
                </a>
              </div>
            </section>
            <section>
              <label>Generate new profile</label>
              <p>Generate a new keypair.</p>
              <div className='options'>
                <a onClick={() => confirm("This will overwrite your old keypair.\nStill wanna continue?\n\nNOTE: Without keypair you can't purge your data online.\nSo if you wish to purge, please use purging instead.") && startAsyncOperation(generateProfileAndSetNickname(true)).then(() => renderPopup())} className={`button`}>
                  Generate New Account
                </a>
              </div>
            </section>
          </main>
          :
          <main>
            <section>
              <label>You don't have a profile.</label>
              <p>You can either import keypair for an existing profile or generate a new profile keypair.</p>
              <div className='options'>
                <a onClick={() => startAsyncOperation(importProfileKeysFromFile()).then(() => renderPopup())} className={`button`}>
                  Import
                </a>
                <a onClick={() => startAsyncOperation(generateProfileAndSetNickname()).then(() => renderPopup())} className={`button active`}>
                  Generate
                </a>
              </div>
            </section>
          </main>
        :
        <main>
          <section>
            <label>Pick a mode:</label>
            <div className='options'>
              <a onClick={() => setExtensionSetting('redirect', true)} className={`button ${redirect ? 'active' : ''}`}>
                Redirect
              </a>
              <a onClick={() => setExtensionSetting('redirect', false)} className={`button ${redirect ? '' : 'active'}`}>
                Show a button
              </a>
            </div>
          </section>
          <section>
            <label>Which platform you would like to redirect?</label>
            <div className='options'>
              {targetPlatforms.map(([name, value]) =>
                <a onClick={() => setExtensionSetting('targetPlatform', name)} className={`button ${targetPlatform === name ? 'active' : ''}`}>
                  {value.displayName}
                </a>
              )}
            </div>
          </section>
          <section>
            <label>Which resolver API you want to use?</label>
            <div className='options'>
              {ytUrlResolverOptions.map(([name, value]) =>
                <a onClick={() => setExtensionSetting('urlResolver', name)} className={`button ${urlResolver === name ? 'active' : ''}`}>
                  {value.name}
                </a>
              )}
            </div>
            <a onClick={() => startAsyncOperation(LbryPathnameCache.clearAll()).then(() => alert("Cleared Cache!"))} className={`button active`}>
              Clear Resolver Cache
            </a>
          </section>
          <section>
            <label>Tools</label>
            <a target='_blank' href='/tools/YTtoLBRY/index.html' className={`filled`}>
              Subscription Converter
            </a>
          </section>
        </main>
    }
    {loading && <div class="overlay">
      <span>Loading...</span>
    </div>}
  </div>
}

function renderPopup() {
  render(<WatchOnLbryPopup profile={null} />, document.getElementById('root')!)
  getProfile().then((profile) => render(<WatchOnLbryPopup profile={profile} />, document.getElementById('root')!))
}

renderPopup()