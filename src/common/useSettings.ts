import { useEffect, useReducer } from 'preact/hooks'
import { generateKeys } from './crypto'
import { DEFAULT_SETTINGS, ExtensionSettings } from './settings'

/**
 * A hook to read the settings from local storage
 *
 * @param defaultSettings the default value. Must have all relevant keys present and should not change
 */
export function useSettings(defaultSettings: ExtensionSettings) {
  const [state, dispatch] = useReducer((state, nstate: Partial<ExtensionSettings>) => ({ ...state, ...nstate }), defaultSettings)
  const settingsKeys = Object.keys(defaultSettings)
  // register change listeners, gets current values, and cleans up the listeners on unload
  useEffect(() => {
    const changeListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return
      const changeEntries = Object.keys(changes).filter((key) => settingsKeys.includes(key)).map((key) => [key, changes[key].newValue])
      if (changeEntries.length === 0) return // no changes; no use dispatching
      dispatch(Object.fromEntries(changeEntries))
    }

    chrome.storage.onChanged.addListener(changeListener)
    chrome.storage.local.get(settingsKeys, async (settings) => dispatch(settings))

    return () => chrome.storage.onChanged.removeListener(changeListener)
  }, [])

  return state
}

/** Utilty to set a setting in the browser */
export const setSetting = <K extends keyof ExtensionSettings>(setting: K, value: ExtensionSettings[K]) => chrome.storage.local.set({ [setting]: value })


/** A hook to read watch on lbry settings from local storage */
export const useLbrySettings = () => useSettings(DEFAULT_SETTINGS)