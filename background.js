chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if(tab.url.includes('watch?')) {
		let videoId = getVideoId(tab.url)
		validateVideo(videoId)
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

chrome.runtime.onMessage.addListener(function(request, sender) {
    chrome.tabs.update(sender.tab.id, {url: request.redirect});
});

function validateVideo (id) {
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
      console.log('Success!')
	  let title = data.data.videos[id]
	  
	  
	 if (title != null) {
		let url =  "https://open.lbry.com/" + title
		console.log(url)
		chrome.tabs.update({url: url});
		
   });

}
