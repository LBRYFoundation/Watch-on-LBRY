chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.storage.local.get(async ({ enabled }) => {
    if (!enabled) return;
    if (!changeInfo.url) return;
    const { id, type } = getId(tab.url);
    if (!id) return;

    const url = `https://cors-anywhere.herokuapp.com/https://api.lbry.com/yt/resolve?${type}_ids=${id}`;
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
        newUrl = `https://lbry.tv/${title.replace(/^lbry:\/\//, "").replace(/#/g, ":")}`;
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
