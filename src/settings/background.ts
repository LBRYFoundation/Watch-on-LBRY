import { DEFAULT_SETTINGS, ExtensionSettings, getExtensionSettingsAsync, setExtensionSetting, targetPlatformSettings, ytUrlResolversSettings } from '../settings'

// This is for manifest v2 and v3
const chromeAction = chrome.action ?? chrome.browserAction

/** Reset settings to default value and update the browser badge text */
async function initSettings() {
    let settings = await getExtensionSettingsAsync()

    // get all the values that aren't set and use them as a change set
    const invalidEntries = (Object.entries(DEFAULT_SETTINGS) as Array<[keyof ExtensionSettings, ExtensionSettings[keyof ExtensionSettings]]>)
        .filter(([k]) => settings[k] === undefined || settings[k] === null)

    // fix our local var and set it in storage for later
    if (invalidEntries.length > 0) {
        const changeSet = Object.fromEntries(invalidEntries)
        chrome.storage.local.set(changeSet)
        settings = await getExtensionSettingsAsync()
    }

    if (!Object.keys(targetPlatformSettings).includes(settings.targetPlatform)) setExtensionSetting('targetPlatform', DEFAULT_SETTINGS.targetPlatform)
    if (!Object.keys(ytUrlResolversSettings).includes(settings.urlResolver)) setExtensionSetting('urlResolver', DEFAULT_SETTINGS.urlResolver)

    chromeAction.setBadgeText({ text: settings.redirect ? 'ON' : 'OFF' })
}

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.redirect) return
    chromeAction.setBadgeText({ text: changes.redirect.newValue ? 'ON' : 'OFF' })
})

chrome.runtime.onStartup.addListener(initSettings)
chrome.runtime.onInstalled.addListener(initSettings)