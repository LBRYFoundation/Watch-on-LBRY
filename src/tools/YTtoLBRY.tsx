import { Fragment, h, render } from 'preact';
import { useState } from 'preact/hooks';

import { getSettingsAsync, redirectDomains } from '../common/settings';
import { getFileContent, ytService } from '../common/yt';

/**
 * Parses the subscription file and queries the API for lbry channels
 *
 * @param file to read
 * @returns a promise with the list of channels that were found on lbry
 */
async function lbryChannelsFromFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const content = await getFileContent(file);

  const ids = new Set((ext === 'xml' || ext == 'opml' ? ytService.readOpml(content) : ytService.readJson(content)))
  const lbryUrls = await ytService.resolveById(...Array.from(ids).map(id => ({ id, type: 'channel' } as const)));
  const { redirect } = await getSettingsAsync('redirect');
  const urlPrefix = redirectDomains[redirect].prefix;
  return lbryUrls.map(channel => urlPrefix + channel);
}

function YTtoLBRY() {
  const [file, setFile] = useState(null as File | null);
  const [lbryChannels, setLbryChannels] = useState([] as string[]);
  const [isLoading, setLoading] = useState(false);

  return <>
    <iframe width="100%" height="400px" allowFullScreen
      src="https://lbry.tv/$/embed/howtouseconverter/c9827448d6ac7a74ecdb972c5cdf9ddaf648a28e" />
    <div class="selectYtSubscriptions">Select Youtube Subscriptions</div>
    <hr />
    <input type="file" className="PickFile" onChange={e =>
      setFile(e.currentTarget.files?.length ? e.currentTarget.files[0] : null)} />
    <hr />
    <input type="button" value="Start Conversion!" class="goButton" disabled={!file || isLoading} onClick={async () => {
      if (!file) return;
      setLoading(true);
      setLbryChannels(await lbryChannelsFromFile(file));
      setLoading(false);
    }} />
    <ul>
      {lbryChannels.map((x, i) => <li key={i} children={<a href={x} children={x} />} />)}
    </ul>
  </>;
}

render(<YTtoLBRY />, document.getElementById('root')!);
