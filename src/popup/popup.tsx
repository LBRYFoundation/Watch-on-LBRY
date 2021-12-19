import { h, render } from 'preact'
import ButtonRadio, { SelectionOption } from '../common/components/ButtonRadio'
import { getTargetPlatfromSettingsEntiries, ExtensionSettings, TargetPlatformName } from '../common/settings'
import { useLbrySettings } from '../common/useSettings'
import './popup.sass'

/** Utilty to set a setting in the browser */
const setSetting = <K extends keyof ExtensionSettings>(setting: K, value: ExtensionSettings[K]) => chrome.storage.local.set({ [setting]: value });

/** Gets all the options for redirect destinations as selection options */
const platformOptions: SelectionOption[] = getTargetPlatfromSettingsEntiries()
  .map(([value, { displayName: display }]) => ({ value, display }));

function WatchOnLbryPopup() {
  const { redirect, targetPlatform } = useLbrySettings();

  return <div className='container'>
    <section>
      <label className='radio-label'>Enable Redirection:</label>
      <ButtonRadio value={redirect ? 'YES' : 'NO'} options={['YES', 'NO']}
        onChange={redirect => setSetting('redirect', redirect.toLowerCase() === 'yes')} />
    </section>
    <section>
      <label className='radio-label'>Where would you like to redirect?</label>
      <ButtonRadio value={targetPlatform} options={platformOptions}
        onChange={(platform: TargetPlatformName) => setSetting('targetPlatform', platform)} />
    </section>
    <section>
      <label className='radio-label'>Other useful tools:</label>
      <a href='/tools/YTtoLBRY.html' target='_blank'>
        <button type='button' className='btn1 button is-primary'>Subscriptions Converter</button>
      </a>
    </section>
  </div>;
}

render(<WatchOnLbryPopup />, document.getElementById('root')!);
