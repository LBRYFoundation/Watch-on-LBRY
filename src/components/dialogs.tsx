import { h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

type Message = string
type Alert = { type: 'alert' | 'prompt' | 'confirm', message: Message, resolve: (data: string | boolean | null) => void }
export type DialogManager = ReturnType<typeof createDialogManager>

export function createDialogManager() {
    const [alerts, setAlerts] = useState({} as Record<string, Alert>)
    const id = crypto.randomUUID()

    function add(alert: Alert) {
        setAlerts({ ...alerts, alert })
    }
    function remove() {
        delete alerts[id]
        setAlerts({ ...alerts })
    }

    return {
        useAlerts() { return alerts },
        async alert(message: Message) {
            return await new Promise<void>((resolve) => add({
                message, type: 'alert', resolve: () => {
                    resolve()
                    remove()
                }
            }))
        },
        async prompt(message: Message) {
            return await new Promise<string | null>((resolve) => add({
                message, type: 'prompt', resolve: (data) => {
                    resolve(data?.toString() ?? null)
                    remove()
                }
            }))
        },
        async confirm(message: Message) {
            return await new Promise<boolean>((resolve) => add({
                message, type: 'confirm', resolve: (data) => {
                    resolve(!!data)
                    remove()
                }
            }))
        }
    }
}

export function Dialogs(params: { manager: ReturnType<typeof createDialogManager> }) {
    const alerts = params.manager.useAlerts()
    let currentAlert = Object.values(alerts)[0]
    if (!currentAlert) return <noscript></noscript>

    const [value, setValue] = useState(null as Parameters<typeof currentAlert['resolve']>[0])

    let cancelled = false

    const dialog = useRef(null as any as HTMLDialogElement)
    useEffect(() => {
        if (!dialog.current) return
        if (!dialog.current.open) dialog.current.showModal()
        const onClose = () => currentAlert.resolve(null)
        dialog.current.addEventListener('close', onClose)
        return dialog.current.removeEventListener('close', onClose)
    })
    return <dialog class="alert-dialog" ref={dialog}>
        <style>
            {`
.alert-dialog
{
    position: fixed;
    border: none;
    background: var(--color-dark);
    color: var(--color-light);
    margin-bottom: 0;
    width: 100%;
    max-width: unset;
    padding: 1.5em;
}

.alert-dialog::before {
    content: "";
    display: block;
    background: var(--color-gradient-0);
    height: 0.1em;
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
}

.alert-dialog form {
    display: grid;
    gap: 2em
}

.alert-dialog form .fields {
    display: grid;
    gap: .5em
}

.alert-dialog form .fields pre {
    font: inherit;
}

.alert-dialog form .actions {
    display: flex;
    gap: .5em;
    font-size: 1.1em;
    font-weight: bold;
}

.alert-dialog form .actions::before {
    content: "";
    flex-grow: 1111111111111;
}`}
        </style>
        <form method='dialog' onSubmit={(event) => {
            event.preventDefault()
            currentAlert.resolve(cancelled ? null : currentAlert.type === 'confirm' ? true : value)
        }}>
            <div class="fields">
                <pre>{currentAlert.message}</pre>
                {currentAlert.type === 'prompt' && <input type='text' onInput={(event) => setValue(event.currentTarget.value)} />}
            </div>
            <div class="actions">
                {/* This is here to capture, return key */}
                <button style="position:0;opacity:0;pointer-events:none"></button>

                {currentAlert.type !== 'alert' && <button className='button' onClick={() => cancelled = true}>Cancel</button>}
                <button className='button active'>
                    {
                        currentAlert.type === 'alert' ? 'Ok'
                            : currentAlert.type === 'confirm' ? 'Confirm'
                                : currentAlert.type === 'prompt' ? 'Apply'
                                    : 'Ok'
                    }
                </button>
            </div>
        </form>
    </dialog>
}
