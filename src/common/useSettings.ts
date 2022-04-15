import { useEffect, useReducer } from 'preact/hooks'
import { generateKeys } from './crypto'
import { DEFAULT_SETTINGS, ExtensionSettings } from './settings'

/**
 * A hook to read the settings from local storage
 *
 * @param initial the default value. Must have all relevant keys present and should not change
 */
export function useSettings(initial: ExtensionSettings) {
  const [state, dispatch] = useReducer((state, nstate: Partial<ExtensionSettings>) => ({ ...state, ...nstate }), initial)
  // register change listeners, gets current values, and cleans up the listeners on unload
  useEffect(() => {
    const changeListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return
      const changeSet = Object.keys(changes)
        .filter(k => Object.keys(initial).includes(k))
        .map(k => [k, changes[k].newValue])
      if (changeSet.length === 0) return // no changes; no use dispatching
      dispatch(Object.fromEntries(changeSet))
    }

    if (!state.privateKey || !state.publicKey) generateKeys().then((keys) => {
      setSetting('publicKey', keys.publicKey)
      setSetting('privateKey', keys.privateKey)
    })

    chrome.storage.onChanged.addListener(changeListener)
    chrome.storage.local.get(Object.keys(initial), o => dispatch(o as Partial<ExtensionSettings>))

    return () => chrome.storage.onChanged.removeListener(changeListener)
  }, [])

  return state
}

/** Utilty to set a setting in the browser */
export const setSetting = <K extends keyof ExtensionSettings>(setting: K, value: ExtensionSettings[K]) => chrome.storage.local.set({ [setting]: value })


/** A hook to read watch on lbry settings from local storage */
export const useLbrySettings = () => useSettings(DEFAULT_SETTINGS)