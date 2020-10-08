console.log("YouTube To LBRY finder!");
var ytChannelsString = "";
var lbryChannelsString = "";
let lbryArray = [];
var toCheck = [];
let tempJson = {"0":0};
var subconv;
var goButton;
var lbryChannelList;

window.addEventListener('load', (event) => {
    subconv = document.getElementById("subconv");
    goButton = document.getElementById("go-button");
    lbryChannelList = document.getElementById("lbry-channel-list");

    goButton.addEventListener('click', () => onGoClicked());
});

function getFile(file) {
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
        var content = event.target.result;
        content = content.replace('<opml version="1.1">','');
        content = content.replace('<body>','');
        content = content.replace('/><outline','');
        content = content.replace('</outline></body></opml>',' ');
        splitChannels = content.split("=");
        toCheck = [];
        for (var i = 0; i <= splitChannels.length-1; i++) {
            tempChannel = splitChannels[i];
            if (tempChannel.indexOf("outline text")>=29) {
                toCheck[toCheck.length] = tempChannel.slice(0, tempChannel.indexOf("outline text")-5);
            }
        }
        lbryAPIrequest();
    });
    reader.readAsText(file);
}

function onGoClicked() {
    if (subconv.files.length > 0) {
        getFile(subconv.files[0]);
    }
}

function lbryAPIrequest() {
    // Clear current channel list
    while (lbryChannelList.lastElementChild) {
        lbryChannelList.removeChild(lbryChannelList.lastElementChild);
    }
    
    chrome.storage.local.get('redirect', redirect => {
        validateChannels(toCheck, redirect.redirect, []);
    });
}

function validateChannels(channels, redirect, validatedChannels) {
    const requestSize = 325;
    var channelsString = "";
    for (let i = 0; i < channels.length && i < requestSize; i++) {
        channelsString += `${channelsString.length > 0 ? ',' : ''}${channels[i]}`
    }
    request = new XMLHttpRequest(); 
    request.open("GET", `https://api.lbry.com/yt/resolve?channel_ids={${channelsString}}`);
    request.send();
    request.onload = () => {
        if (request.status == 200) {
            var testChannels = JSON.parse(request.responseText).data.channels;
            Object.keys(testChannels).map((testChannelKey) => {
                let testChannel = testChannels[testChannelKey];
                if (testChannel != null) {
                    let link = `${redirect === "lbry.tv" ? "https://lbry.tv/" : "lbry://"}${testChannel}`;
                    validatedChannels.push(link);
                    let li = document.createElement('li');
                    let a = document.createElement('a');
                    a.href = link;
                    a.innerText = link;
                    li.appendChild(a);
                    lbryChannelList.appendChild(li);
                }
            });
        }
        if (requestSize < channels.length) {
            channels.splice(0, requestSize);
            validateChannels(channels, redirect, validatedChannels);
        } else if (validatedChannels.length === 0) {
            let li = document.createElement('li');
            li.innerText = "No channels found :(";
            lbryChannelList.appendChild(li);
        }
    }
}

chrome.storage.local.get('redirect', redirect => {
    console.log(redirect);
})
