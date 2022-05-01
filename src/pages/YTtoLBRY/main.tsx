import { h, render } from 'preact'
import { useState } from 'preact/hooks'
import { getFileContent } from '../../modules/file'
import { getSubsFromCsv, getSubsFromJson, getSubsFromOpml } from '../../modules/yt'
import { resolveById } from '../../modules/yt/urlResolve'
import { targetPlatformSettings, useExtensionSettings } from '../../settings'
import readme from './README.md'

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
        src='https://lbry.tv/$/embed/howtouseconverter/c9827448d6ac7a74ecdb972c5cdf9ddaf648a28e' />
      <section dangerouslySetInnerHTML={{ __html: readme }} />
    </aside>
  </main>
}

render(<YTtoLBRY />, document.getElementById('root')!)
