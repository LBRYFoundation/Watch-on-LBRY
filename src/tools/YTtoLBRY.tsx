import { h, render } from 'preact'
import { useState } from 'preact/hooks'
import { getExtensionSettingsAsync, targetPlatformSettings } from '../common/settings'
import { getFileContent, ytService } from '../common/yt'
import readme from './README.md'



/**
 * Parses the subscription file and queries the API for lbry channels
 *
 * @param file to read
 * @returns a promise with the list of channels that were found on lbry
 */
async function lbryChannelsFromFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  const ids = new Set((
    ext === 'xml' || ext == 'opml' ? ytService.readOpml : 
    ext === 'csv' ? ytService.readCsv : 
    ytService.readJson)(await getFileContent(file)))
  const lbryUrls = await ytService.resolveById(
    Array.from(ids).map(id => ({ id, type: 'channel' } as const)), 
    (progress) => render(<YTtoLBRY progress={progress} />, document.getElementById('root')!));
  const { targetPlatform: platform } = await getExtensionSettingsAsync();
  const urlPrefix = targetPlatformSettings[platform].domainPrefix;
  return lbryUrls.map(channel => urlPrefix + channel);
}

function ConversionCard({ onSelect, progress }: { onSelect(file: File): Promise<void> | void, progress: number }) {
  const [file, setFile] = useState(null as File | null);
  const [isLoading, setLoading] = useState(false);

  return <div className='ConversionCard'>
    <h2>Select YouTube Subscriptions</h2>
    <div style={{ marginBottom: 10 }}>
      <input type='file' onChange={e => setFile(e.currentTarget.files?.length ? e.currentTarget.files[0] : null)} />
    </div>
    <button class='btn btn-primary' children='Start Conversion!' disabled={!file || isLoading} onClick={async () => {
      if (!file) return;
      setLoading(true);
      await onSelect(file);
      setLoading(false);
    }} />
    <div class="progress-text">
      {progress > 0 ? `${(progress * 100).toFixed(1)}%` : ''}
    </div>
  </div>
}

function YTtoLBRY({ progress }: { progress: number }) {
  const [lbryChannels, setLbryChannels] = useState([] as string[]);

  return <div className='YTtoLBRY'>
    <div className='Conversion'>
      <ConversionCard progress={progress} onSelect={async file => setLbryChannels(await lbryChannelsFromFile(file))} />
      <ul>
        {lbryChannels.map((x, i) => <li key={i} children={<a href={x} children={x} />} />)}
      </ul>
    </div>
    <div className='ConversionHelp'>
      <iframe width='712px' height='400px' allowFullScreen
        src='https://lbry.tv/$/embed/howtouseconverter/c9827448d6ac7a74ecdb972c5cdf9ddaf648a28e' />
      <section dangerouslySetInnerHTML={{ __html: readme }} />
    </div>
  </div>
}

render(<YTtoLBRY progress={0} />, document.getElementById('root')!);
