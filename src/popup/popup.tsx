import { h, render } from 'preact'
import ButtonRadio, { SelectionOption } from '../common/components/ButtonRadio'
import { getPlatfromSettingsEntiries, LbrySettings, PlatformName } from '../common/settings'
import { useLbrySettings } from '../common/useSettings'
import './popup.sass'



/** Utilty to set a setting in the browser */
const setSetting = <K extends keyof LbrySettings>(setting: K, value: LbrySettings[K]) => chrome.storage.local.set({ [setting]: value });

/** Gets all the options for redirect destinations as selection options */
const platformOptions: SelectionOption[] = getPlatfromSettingsEntiries()
  .map(([value, { display }]) => ({ value, display }));

function WatchOnLbryPopup() {
  const { enabled, platform } = useLbrySettings();

  return <div className='container'>
    <label className='radio-label'>Enable Redirection:</label>
    <ButtonRadio value={enabled ? 'YES' : 'NO'} options={['YES', 'NO']}
      onChange={enabled => setSetting('enabled', enabled.toLowerCase() === 'yes')} />
    <label className='radio-label'>Where would you like to redirect?</label>
    <ButtonRadio value={platform} options={platformOptions}
      onChange={(platform: PlatformName) => setSetting('platform', platform)} />
    <label className='radio-label'>Other useful tools:</label>
    <a href='/tools/YTtoLBRY.html' target='_blank'>
      <button type='button' className='btn1 button is-primary'>Subscriptions Converter</button>
    </a>
  </div>;
}

render(<WatchOnLbryPopup />, document.getElementById('root')!);
