import { h, render } from 'preact'
import { useState } from 'preact/hooks'
import { createDialogManager, Dialogs } from '../../components/dialogs'
import { importProfileKeysFromFile, inputKeyFile } from '../../modules/crypto'

function ImportPage() {
  const [loading, updateLoading] = useState(() => false)

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

  function importProfile() {
    inputKeyFile(async (file) => file && await loads(
      importProfileKeysFromFile(dialogManager, file)
        .then((success) => success && (location.pathname = '/pages/popup/index.html'))
    ))
  }

  const dialogManager = createDialogManager()

  return <div id='popup'>
    <Dialogs manager={dialogManager} />
    <main>
      <section>
        <label>Import your profile</label>
        <p>Import your unique keypair.</p>
        <div className='options'>
          <a onClick={() => importProfile()} className={`button`}>Import</a>
        </div>
      </section>
    </main>
    {loading && <div class="overlay">
      <span>Loading...</span>
    </div>}
  </div>
}

render(<ImportPage />, document.getElementById('root')!)
