import { h, render } from 'preact'
import { useState } from 'preact/hooks'
import { createDialogManager, Dialogs } from '../../components/dialogs'
import { exportProfileKeysAsFile, friendlyPublicKey, generateProfileAndSetNickname, getProfile, purgeProfile, resetProfileSettings } from '../../modules/crypto'
import { lbryUrlCache } from '../../modules/yt/urlCache'
import { getTargetPlatfromSettingsEntiries, getYtUrlResolversSettingsEntiries, setExtensionSetting, useExtensionSettings } from '../../settings'
import { openImportPopup } from '../import/main'


/** Gets all the options for redirect destinations as selection options */
const targetPlatforms = getTargetPlatfromSettingsEntiries()
const ytUrlResolverOptions = getYtUrlResolversSettingsEntiries()

function WatchOnLbryPopup(params: { profile: Awaited<ReturnType<typeof getProfile>> | null }) {
  const { targetPlatform, urlResolver, redirectChannel, redirectVideo, redirectVideoPlaylist, buttonVideoSub, buttonChannelSub, buttonVideoPlayer, privateKey, publicKey } = useExtensionSettings()
  let [loading, updateLoading] = useState(() => false)
  let [route, updateRoute] = useState<string>(() => '')

  const dialogManager = createDialogManager()
  const nickname = params.profile ? params.profile.nickname ?? 'No Nickname' : '...'


  async function loads<T>(operation: Promise<T>) {
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
    <Dialogs manager={dialogManager} />
    {

      <header>
        {
          publicKey &&
          <section>
            <label>{nickname}</label>
            <p>{friendlyPublicKey(publicKey)}</p>
            <span><b>Score: {params.profile?.score ?? '...'}</b> - <a target='_blank' href="https://finder.madiator.com/leaderboard" class="filled">🔗Leaderboard</a></span>
            {urlResolver !== 'madiatorFinder' && <span class="error">You need to use Madiator Finder API for scoring to work</span>}
          </section>
        }

        {
          route !== ''
            ?
            <section>
              <a onClick={() => updateRoute('')} className="filled">⇐ Back</a>
            </section>
            :
            <section>
                <a className='filled' onClick={() => updateRoute('profile')}>Profile Settings</a>
            </section>
        }
      </header>
    }
    {
      route === 'profile' ?
        publicKey ?
          <main>
            <section>
              <div className='options'>
                <a onClick={() => loads(generateProfileAndSetNickname(dialogManager)).then(() => renderPopup())} className={`button active`}>
                  Change Nickname
                </a>
                <a onClick={async () => {
                  if (!await dialogManager.confirm("This will delete your keypair from this device."
                    + "\nStill wanna continue?"
                    + "\n\nNOTE: Without keypair you can't purge your data online."
                    + "\nSo if you wish to purge, please use purging instead.")) return
                  resetProfileSettings()
                  renderPopup()
                }}
                  className={`button`}
                >
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
                <a onClick={() => openImportPopup()}
                  className={`button`}
                >
                  Import
                </a>
              </div>
            </section>
            <section>
              <label>Purge your profile and data!</label>
              <p>Purge your profile data online and offline.</p>
              <div className='options'>
                <div className="center">
                  <span className='filled'>(╯°□°）╯︵ ┻━┻</span>
                </div>
                <a onClick={() => loads(purgeProfile(dialogManager)).then(() => renderPopup())} className={`button`}>
                  Purge Everything!!
                </a>
              </div>
            </section>
            <section>
              <label>Generate new profile</label>
              <p>Generate a new keypair.</p>
              <div className='options'>
                <a onClick={async () => await dialogManager.confirm("This will overwrite your old keypair.\nStill wanna continue?\n\nNOTE: Without keypair you can't purge your data online.\nSo if you wish to purge, please use purging instead.")
                  && loads(generateProfileAndSetNickname(dialogManager, true)).then(() => renderPopup())
                }
                  className={`button`}
                >
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
                <a onClick={() => openImportPopup()} className={`button`}>
                  Import
                </a>
                <a onClick={() => loads(generateProfileAndSetNickname(dialogManager)).then(() => renderPopup())} className={`button active`}>
                  Generate
                </a>
              </div>
            </section>
          </main>
        :
        route === 'advanced' ?
          <main>
            <section>
              <label>Which platform you would like to redirect to?</label>
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
              <a onClick={() => loads(lbryUrlCache.clearAll().then(() => dialogManager.alert("Cleared Cache!")))} className={`button active`}>
                Clear Resolver Cache
              </a>
            </section>
          </main>
          :
          <main>
            <section>
              <label>Auto redirect when:</label>
              <div className='options'>
                <div class="toggle-option">
                  <span>Playing a video</span>
                  <a onClick={() => setExtensionSetting('redirectVideo', !redirectVideo)} className={`button ${redirectVideo ? 'active' : ''}`}>
                    {redirectVideo ? 'Active' : 'Deactive'}
                  </a>
                </div>
                <div class="toggle-option">
                  <span>Playing a playlist</span>
                  <a onClick={() => setExtensionSetting('redirectVideoPlaylist', !redirectVideoPlaylist)} className={`button ${redirectVideoPlaylist ? 'active' : ''}`}>
                    {redirectVideoPlaylist ? 'Active' : 'Deactive'}
                  </a>
                </div>
                <div class="toggle-option">
                  <span>Viewing a channel</span>
                  <a onClick={() => setExtensionSetting('redirectChannel', !redirectChannel)} className={`button ${redirectChannel ? 'active' : ''}`}>
                    {redirectChannel ? 'Active' : 'Deactive'}
                  </a>
                </div>
              </div>
            </section>
            <section>
              <label>Show redirect button on:</label>
              <div className='options'>
                <div className="toggle-option">
                  <span>Video Page</span>
                  <a onClick={() => setExtensionSetting('buttonVideoSub', !buttonVideoSub)} className={`button ${buttonVideoSub ? 'active' : ''}`}>
                    {buttonVideoSub ? 'Active' : 'Deactive'}
                  </a>
                </div>
                <div className="toggle-option">
                  <span>Channel Page</span>
                  <a onClick={() => setExtensionSetting('buttonChannelSub', !buttonChannelSub)} className={`button ${buttonChannelSub ? 'active' : ''}`}>
                    {buttonChannelSub ? 'Active' : 'Deactive'}
                  </a>
                </div>
                <div className="toggle-option">
                  <span>Video Player</span>
                  <a onClick={() => setExtensionSetting('buttonVideoPlayer', !buttonVideoPlayer)} className={`button ${buttonVideoPlayer ? 'active' : ''}`}>
                    {buttonVideoPlayer ? 'Active' : 'Deactive'}
                  </a>
                </div>
              </div>
            </section>
            <section>
              <label>Tools</label>
              <a target='_blank' href='/pages/YTtoLBRY/index.html' className={`filled`}>
                Subscription Converter
              </a>
              <a className='filled' onClick={() => updateRoute('advanced')}>Advanced Settings</a>
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
