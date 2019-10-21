var loaded = false;
var enable = false;

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (changeInfo.status == 'complete' && tab.status == 'complete' && tab.url != undefined && enable) {
		if(tab.url.includes('watch?') && !loaded) {
			loaded = true
			let videoId = getVideoId(tab.url)
			validateVideo(videoId)
		}

		if (tab.url.includes('/channel/') && !loaded) {
			loaded = true
			//przypisujemy do zmiennej id kanału
			let channelId = getChannelId(tab.url)
			getInformationFromApi(channelId)
		}

	}
});

function getChannelId(url) {
	//pop obcina ostatni element z tablicy (zwraca ostatni element)
	//												to zwracam
	// https://www.youtube.com/channel    /  UC-vYDJQiabg9BK8XTDPFspg
	return url.split("/").pop()
}

function getInformationFromApi(id) {
	loaded = false
	let url = 'https://cors-anywhere.herokuapp.com/https://api.lbry.com/yt/resolve?channel_ids=' + id
	console.log('Calling url: ' + url)
  
	var request = new Request(
	  url,
	  {
		method: 'GET',
		headers: new Headers({ 'Content-Type': 'application/json' })
	  }
	)
  
	fetch(request)
	  .then(function(resp) {
		return resp.json();
	  })
	  .then(function(data) {
		let channel = data.data.channels[id]
		if (channel != null) {
			let url =  "https://open.lbry.com/" + channel
			chrome.tabs.update({url: url});
		 }
	 });
}

function getVideoId(videoUrl) {
	var videoId = videoUrl.split('v=')[1]
	  var ampersandPosition = videoId.indexOf('&')
	  if(ampersandPosition != -1) {
		videoId = videoId.substring(0, ampersandPosition)
	  }
	  return videoId
}


function validateVideo (id) {
  loaded = false
  let url = 'https://cors-anywhere.herokuapp.com/https://api.lbry.com/yt/resolve?video_ids=' + id
  console.log('Calling url: ' + url)

  var request = new Request(
    url,
    {
      method: 'GET',
      headers: new Headers({ 'Content-Type': 'application/json' })
    }
  )

  fetch(request)
    .then(function(resp) {
      return resp.json();
    })
    .then(function(data) {
	  let title = data.data.videos[id]
	  
	 if (title != null) {
		let url =  "https://open.lbry.com/" + title
		chrome.tabs.update({url: url});
	 }
   });

}

chrome.browserAction.onClicked.addListener(function (tab) {
 enable = enable ? false : true;
 if(enable){
  chrome.browserAction.setBadgeText({ text: 'ON' });
 }else{
  chrome.browserAction.setBadgeText({ text: 'OFF' });
 }
});
