import { getSettingsAsync, redirectDomains } from '../common/settings';
import { getFileContent, YTDescriptor, ytService } from '../common/yt';

/**
 * Parses OPML file and queries the API for lbry channels
 *
 * @param file to read
 * @returns a promise with the list of channels that were found on lbry
 */
async function lbryChannelsFromOpml(file: File): Promise<string[]> {
  const lbryUrls = await ytService.resolveById(...ytService.readOpml(await getFileContent(file))
    .map(url => ytService.getId(url))
    .filter((id): id is YTDescriptor => !!id));

  const { redirect } = await getSettingsAsync('redirect');
  const urlPrefix = redirectDomains[redirect].prefix;
  return lbryUrls.map(channel => urlPrefix + channel);
}

window.addEventListener('load', () => {
  const subconv = document.getElementById('subconv') as HTMLInputElement;
  const goButton = document.getElementById('go-button')!;
  const lbryChannelList = document.getElementById('lbry-channel-list')!;
  goButton.addEventListener('click', async () => {
    const files = subconv.files;
    if (!files || files.length <= 0) return;

    const resultsList = await lbryChannelsFromOpml(files[0]);

    if (resultsList.length === 0) {
      lbryChannelList.innerHTML = `<li>No channels found :(</li>`;
      return;
    }
    lbryChannelList.innerHTML = resultsList.map(link => `<li><a href='${link}'>${link}</a></li>`).join('\n');
  });
});
