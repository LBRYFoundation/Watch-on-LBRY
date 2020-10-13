import { DEFAULT_SETTINGS, LbrySettings, getSettingsAsync } from '../common/settings';

/** Reset settings to default value and update the browser badge text */
async function initSettings() {
  const settings = await getSettingsAsync(...Object.keys(DEFAULT_SETTINGS) as Array<keyof LbrySettings>);

  // get all the values that aren't set and use them as a change set
  const invalidEntries = (Object.entries(DEFAULT_SETTINGS) as Array<[keyof LbrySettings, LbrySettings[keyof LbrySettings]]>)
    .filter(([k]) => settings[k] === null || settings[k] === undefined);

  // fix our local var and set it in storage for later
  if (invalidEntries.length > 0) {
    const changeSet = Object.fromEntries(invalidEntries);
    Object.assign(settings, changeSet);
    chrome.storage.local.set(changeSet);
  }

  chrome.browserAction.setBadgeText({ text: settings.enabled ? 'ON' : 'OFF' });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.enabled) return;
  chrome.browserAction.setBadgeText({ text: changes.enabled.newValue ? 'ON' : 'OFF' });
});


chrome.runtime.onStartup.addListener(initSettings);
chrome.runtime.onInstalled.addListener(initSettings);
