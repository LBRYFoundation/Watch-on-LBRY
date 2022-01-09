import { DEFAULT_SETTINGS, ExtensionSettings, getExtensionSettingsAsync } from '../common/settings';

/** Reset settings to default value and update the browser badge text */
async function initSettings() {
  const settings = await getExtensionSettingsAsync();

  // get all the values that aren't set and use them as a change set
  const invalidEntries = (Object.entries(DEFAULT_SETTINGS) as Array<[keyof ExtensionSettings, ExtensionSettings[keyof ExtensionSettings]]>)
    .filter(([k]) => settings[k] === null || settings[k] === undefined);

  // fix our local var and set it in storage for later
  if (invalidEntries.length > 0) {
    const changeSet = Object.fromEntries(invalidEntries);
    Object.assign(settings, changeSet);
    chrome.storage.local.set(changeSet);
  }

  chrome.browserAction.setBadgeText({ text: settings.redirect ? 'ON' : 'OFF' });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.redirect) return;
  chrome.browserAction.setBadgeText({ text: changes.redirect.newValue ? 'ON' : 'OFF' });
});


chrome.runtime.onStartup.addListener(initSettings);
chrome.runtime.onInstalled.addListener(initSettings);
