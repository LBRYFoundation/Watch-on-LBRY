import { getSettingsAsync, redirectDomains } from "../common/settings";
import { ytService } from "../common/yt";

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, { url: tabUrl }) => {
  const { enabled, redirect } = await getSettingsAsync('enabled', 'redirect');
  const urlPrefix = redirectDomains[redirect].prefix;

  if (!enabled || !changeInfo.url || !tabUrl) return;
  if (tabUrl.match(/\b(https:\/\/lbry.tv|lbry:\/\/)/g)) {

    var redirectTo;
    if (redirect === "app") {
      let isChannel = tabUrl.match(/^(https|http):\/\/lbry.tv\/@([^?:$#@;/"<>%{}|^~[\]`])+?:[a-z0-9]{1,40}($|(?=\?))/g);
      let isClaim = tabUrl.match(/^(https|http):\/\/lbry.tv\/@([^?:$#@;/"<>%{}|^~[\]`])+?:[a-z0-9]{1,40}\/([^?:$#@;/"<>%{}|^~[\]`])+?:[a-z0-9]{1,40}($|(?=\?))/g);

      if (isChannel) {
        redirectTo = `lbry://${tabUrl.match(/@([^$#@;/"<>%{}|^~[\]`])+?(?=[#:])/g)![0]}#${tabUrl.match(/#([a-z0-9]{40})|:[a-z0-9]($|(?=\?))/g)![0].substr(1)}`;
      } else if (isClaim) {
        redirectTo = `lbry://${tabUrl.match(/@([^$#@;/"<>%{}|^~[\]`])+?(?=[#:])/g)}#${tabUrl.match(/(#([a-z0-9]{40})|:[a-z0-9])(?=\/([^$#@;/"<>%{}|^~[\]`])+?(#([a-z0-9]{40})|:[a-z0-9])($|(?=\?)))/g)![0].substr(1)}${tabUrl.match(/\/([^$#@;/"<>%{}|^~[\]`])+?(?=[#:])/g)![0]}#${tabUrl.match(/(#([a-z0-9]{40})|:[a-z0-9])($|(?=\?))/g)![0].substr(1)}`;
      }
    }

    if (redirectTo) {
      chrome.tabs.update(tabId, { url: redirectTo + "?src=watch-on-lbry" });
      if (redirect === "app") {
        alert("Opened link in LBRY App!"); // Better for UX since sometimes LBRY App doesn't take focus, if that is fixed, this can be removed

        // Close tab if it lacks history and go back if it does
        chrome.tabs.executeScript(tabId, {
          code: `
                if (window.history.length === 1) {
                  window.close();
                } else {
                  window.history.back();
                }`
        });
      }
    }
    return;
  }
  const descriptor = ytService.getId(tabUrl);
  if (!descriptor) return;
  const title = (await ytService.resolveById(descriptor))[0]
  if (!title) return;
  console.log(title);

  let newUrl;
  if (redirect === "lbry.tv") {
    newUrl = `${urlPrefix}${title.replace(/^lbry:\/\//, "").replace(/#/g, ":")}?src=watch-on-lbry`;
  } else if (redirect === "app") {
    newUrl = `lbry://${title.replace(/^lbry:\/\//, "")}`;
  }
  chrome.tabs.update(tabId, { url: newUrl });
});
