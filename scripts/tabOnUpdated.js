chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.storage.local.get(async ({ enabled }) => {
    if (!enabled) return;
    if (!changeInfo.url) return;
    if (tab.url.match(/\b(https:\/\/lbry.tv|lbry:\/\/)/g)) {
      chrome.storage.local.get('redirect', ({redirect}) => {
        var redirectTo;

        // If handler can be added for new lbry:// tabs, below code can be uncommented and merged

        // if (redirect === "lbry.tv") {
        //   console.error(tab.url);
        //   let isChannel = tab.url.match(/^lbry:\/\/@[^^$#@;/"<>%{}|^~[\]`]+?#([a-z0-9]{40}|[a-z0-9])$/g);
        //   let isClaim = tab.url.match(/^lbry:\/\/@[^^$#@;/"<>%{}|^~[\]`]+?#([a-z0-9]{40}|[a-z0-9])\/[^^$#@;/"<>%{}|^~[\]`]+?#([a-z0-9]{40}|[a-z0-9])$/g);

        //   if (isChannel) {
        //     let channelId = tab.url.match(/#[a-z0-9]+/g)[0].substr(1);
        //     redirectTo = `https://lbry.tv/${tab.url.match(/@[^^$#@;/"<>%{}|^~[\]`]+?(?=#)/g)[0]}${channelId.length > 1 ? '#' : ':'}${channelId}`;
        //   } else if (isClaim) {
        //     let channelId = tab.url.match(/#[a-z0-9]+/g)[0].substr(1);
        //     let claimId = tab.url.match(/[a-z0-9]+$/g)[0];
        //     redirectTo = `https://lbry.tv/${tab.url.match(/@[^^$#@;/"<>%{}|^~[\]`]+?(?=#)/g)[0]}${channelId.length > 1 ? '#' : ':'}${channelId}/${tab.url.match(/[^^$#@;/"<>%{}|^~[\]`]+(?=#[a-z0-9]+$)/g)}${claimId.length > 1 ? '#' : ':'}${claimId}`;
        //   }
        //   console.error(redirectTo);
        // }

        if (redirect === "app") {
          let isChannel = tab.url.match(/^(https|http):\/\/lbry.tv\/@([^$#@;/"<>%{}|^~[\]`])+?(#([a-z0-9]{40})|:[a-z0-9])$/g);
          let isClaim =  tab.url.match(/^(https|http):\/\/lbry.tv\/@([^$#@;/"<>%{}|^~[\]`])+?(#([a-z0-9]{40})|:[a-z0-9])\/([^$#@;/"<>%{}|^~[\]`])+?(#([a-z0-9]{40})|:[a-z0-9])$/g);

          if (isChannel) {
            redirectTo = `lbry://${tab.url.match(/@([^$#@;/"<>%{}|^~[\]`])+?(?=[#:])/g)[0]}#${tab.url.match(/#([a-z0-9]{40})|:[a-z0-9]$/g)[0].substr(1)}`;
          } else if (isClaim) {
            redirectTo = `lbry://${tab.url.match(/@([^$#@;/"<>%{}|^~[\]`])+?(?=[#:])/g)}#${tab.url.match(/(#([a-z0-9]{40})|:[a-z0-9])(?=\/([^$#@;/"<>%{}|^~[\]`])+?(#([a-z0-9]{40})|:[a-z0-9])$)/g)[0].substr(1)}${tab.url.match(/\/([^$#@;/"<>%{}|^~[\]`])+?(?=[#:])/g)[0]}#${tab.url.match(/(#([a-z0-9]{40})|:[a-z0-9])$/g)[0].substr(1)}`;
          }
        }

        if (redirectTo) {
          chrome.tabs.update(tabId, { url: redirectTo + "?src=watch-on-lbry" });
          if (redirect === "app") alert("Opened link in LBRY App!");
        }
      });
      return;
    }
    const { id, type } = getId(tab.url);
    if (!id) return;

    const url = `https://api.lbry.com/yt/resolve?${type}_ids=${id}`;
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    const json = await response.json();
    console.log(json);
    const title = json.data[`${type}s`][id];
    if (!title) return;
    console.log(title);

    chrome.storage.local.get('redirect', ({ redirect }) => {
      console.log(redirect);
      let newUrl;
      if (redirect === "lbry.tv") {
        newUrl = `https://lbry.tv/${title.replace(/^lbry:\/\//, "").replace(/#/g, ":")}?src=watch-on-lbry`;
      } else if (redirect === "app") {
        newUrl = `lbry://${title.replace(/^lbry:\/\//, "")}`;
      }
      chrome.tabs.update(tabId, { url: newUrl });
    });
  });
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
