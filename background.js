var loaded = false;
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (changeInfo.status == 'complete' && tab.status == 'complete' && tab.url != undefined) {
		if(tab.url.includes('watch?') && !loaded) {
			loaded = true
			let videoId = getVideoId(tab.url)
			validateVideo(videoId)
		}
	}
});

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
		let url =  "https://open.lbry.tv/" + title
		chrome.tabs.update({url: url});
	 }
   });

}
