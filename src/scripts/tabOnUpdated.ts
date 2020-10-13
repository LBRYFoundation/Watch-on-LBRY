import { getSettingsAsync, redirectDomains } from "../common/settings";

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
  const { id, type } = getId(tabUrl);
  if (!id) return;

  const url = `https://api.lbry.com/yt/resolve?${type}_ids=${id}`;
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  const json = await response.json();
  console.log(json);
  const title = json.data[`${type}s`][id];
  if (!title) return;
  console.log(title);


  console.log(redirect);
  let newUrl;
  if (redirect === "lbry.tv") {
    newUrl = `${urlPrefix}${title.replace(/^lbry:\/\//, "").replace(/#/g, ":")}?src=watch-on-lbry`;
  } else if (redirect === "app") {
    newUrl = `lbry://${title.replace(/^lbry:\/\//, "")}`;
  }
  chrome.tabs.update(tabId, { url: newUrl });
});

function getId(url) {
  const videoId = getVideoId(url);
  if (videoId) return { id: videoId, type: "video" };
  const channelId = getChannelId(url);
  if (channelId) return { id: channelId, type: "channel" };
  return {}; // Equivalent of returning null
}

function getVideoId(url) {
  const regex = /watch\/?\?.*v=([^\s&]*)/;
  const match = url.match(regex);
  return match ? match[1] : null; // match[1] is the videoId
}

function getChannelId(url) {
  const regex = /channel\/([^\s?]*)/;
  const match = url.match(regex);
  return match ? match[1] : null; // match[1] is the channelId
}

function getNewUrl(title) {
}
