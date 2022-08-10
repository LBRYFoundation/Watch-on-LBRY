import { h, render } from 'preact'
import { useState } from 'preact/hooks'
import { getFileContent } from '../../modules/file'
import { getSubsFromCsv, getSubsFromJson, getSubsFromOpml } from '../../modules/yt'
import { resolveById } from '../../modules/yt/urlResolve'
import { targetPlatformSettings, useExtensionSettings } from '../../settings'

async function getSubscribedChannelIdsFromFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const content = await getFileContent(file)
  switch (ext) {
    case 'xml':
    case 'opml':
      return getSubsFromOpml(content)
    case 'csv':
      return getSubsFromCsv(content)
    default:
      return getSubsFromJson(content)
  }
}

async function findChannels(channelIds: string[], progressCallback: Parameters<typeof resolveById>['1']) {
  const resultItems = await resolveById(channelIds.map((channelId) => ({ id: channelId, type: 'channel' })), progressCallback)
  return Object.values(resultItems).map((item) => item.id)
}

function Conversion() {
  const [file, setFile] = useState(null as File | null)
  const [progress, setProgress] = useState(0)
  const [lbryChannelIds, setLbryChannels] = useState([] as Awaited<ReturnType<typeof findChannels>>)
  const settings = useExtensionSettings()

  let loading = progress > 0 && progress !== 1

  return <div className='conversion'>
    <form onSubmit={async (event) => {
      event.preventDefault()
      if (file) setLbryChannels(await findChannels(await getSubscribedChannelIdsFromFile(file), (progress) => setProgress(progress)))
    }}
    >
      <div class="fields">
        <label for="conversion-file">Select YouTube Subscriptions</label>
        <input id="conversion-file" type='file' onChange={event => setFile(event.currentTarget.files?.length ? event.currentTarget.files[0] : null)} />
      </div>
      <div class="actions">
        <button className={`button ${!file || progress > 0 ? '' : 'active'}`} disabled={!file || loading}>
          {loading ? `${(progress * 100).toFixed(1)}%` : 'Start Conversion!'}
        </button>
      </div>
    </form>
    {
      progress === 1 &&
      <div class="results">
        <b>Results:</b>
        {
          lbryChannelIds.length > 0
            ? lbryChannelIds.map((lbryChannelId) =>
              <article class="result-item">
                <a href={`${targetPlatformSettings[settings.targetPlatform].domainPrefix}${lbryChannelId}`}>{lbryChannelId}</a>
              </article>)
            : <span class="error">No Result</span>
        }
      </div>
    }
  </div>
}

function YTtoLBRY() {
  return <main>
    <Conversion />
    <aside class="help">
      <iframe allowFullScreen
        src='https://odysee.com/$/embed/convert-subscriptions-from-YouTube-to-LBRY/36f3a010295afe1c55e91b63bcb2eabc028ec86c?r=8bgP4hEdbd9jwBJmhEaqP3dD75LzsUob' />
      <section><h1 id="getting-your-subscription-data">Getting your subscription data</h1>
        <ol>
          <li>Go to <a href="https://takeout.google.com/settings/takeout" target='_blank'>https://takeout.google.com/settings/takeout</a></li>
          <li>Deselect everything except <code>YouTube and YouTube Music</code> and within that only select <code>subscriptions</code></li>
          <li>Go through the process and create the export</li>
          <li>Once it's exported, open the archive and find <code>YouTube and YouTube Music/subscriptions/subscriptions.(json/csv/opml)</code> and upload it to the extension</li>
        </ol>
      </section>
    </aside>
  </main>
}

render(<YTtoLBRY />, document.getElementById('root')!)
