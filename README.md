## Looking for contributors :)
![Logo](src/assets/icons/wol/default-transparent.svg)
# Watch on LBRY

A plugin for web browsers that brings more utility for LBRY Protocol by allowing you to find people you watch on YouTube that are availible on LBRY.tv/Odysee/Desktop App and other LBRY Protocol based apps/websites, allows you to easly check your subscribtion list and much more!

# Privacy

This plugin is using LBRY Inc YouTube Sync API to check if video fot synchronized with LBRY Platform. For more informations read LBRY Inc Privacy Policy at [here](https://lbry.com/privacypolicy)

## Installation

[![Get it on Firefox](doc/img/AMO-button_1.png)](https://addons.mozilla.org/en/firefox/addon/watch-on-lbry/?src=search)
[![Get it on Chrome](doc/img/chrome-small-border.png)](https://chrome.google.com/webstore/detail/watch-on-lbry/jjmbbhopnjdjnpceiecihldbhibchgek)

## Build

From the root of the project

For Production
```bash
$ npm install
$ npm run build
$ npm run build:webext  # optional, to create the zip file from the dist directory
```

For Development
```bash
$ npm install
$ npm run watch
```

Then, either manually install it for your browser or, from another terminal invoke:

```bash
$ npm run start:chrome
$ npm run start:firefox # or, if you'd prefer firefox
```

### Manual Install for Chrome:
Visit ```chrome://extensions``` (via omnibox or menu -> Tools -> Extensions).
Enable Developer mode by ticking the checkbox in the upper-right corner.
Click on the "Load unpacked extension..." button.
Select the directory containing your unpacked extension.
### Manual Install for Firefox
To install an extension temporarily:

-   open Firefox
-   enter “about:debugging” in the URL bar
-   click “Load Temporary Add-on”
-   open the extension’s directory and select any file inside the extension.

The extension will be installed, and will stay installed until you restart Firefox.


## Usage

Go to YouTube in your browser. When you load a video or channel, it will detect if it's also uploaded to the LBRY Network and the it will move you to open.lbry.com so you can watch the video on LBRY (either on the web or in the app)!

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Contributors

<table>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/kodxana>
            <img src=https://avatars.githubusercontent.com/u/16674412?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=kodxana/>
            <br />
            <sub style="font-size:14px"><b>kodxana</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/DeepDoge>
            <img src=https://avatars.githubusercontent.com/u/44804845?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Shiba/>
            <br />
            <sub style="font-size:14px"><b>Shiba</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/Aenigma>
            <img src=https://avatars.githubusercontent.com/u/409173?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Kevin Raoofi/>
            <br />
            <sub style="font-size:14px"><b>Kevin Raoofi</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/Yamboy1>
            <img src=https://avatars.githubusercontent.com/u/37413895?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Yamboy1/>
            <br />
            <sub style="font-size:14px"><b>Yamboy1</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/clay53>
            <img src=https://avatars.githubusercontent.com/u/16981283?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Clayton Hickey/>
            <br />
            <sub style="font-size:14px"><b>Clayton Hickey</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/adam-dorin>
            <img src=https://avatars.githubusercontent.com/u/1072815?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Adam/>
            <br />
            <sub style="font-size:14px"><b>Adam</b></sub>
        </a>
    </td>
</tr>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/53jk1>
            <img src=https://avatars.githubusercontent.com/u/56700396?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Kacper Bąk/>
            <br />
            <sub style="font-size:14px"><b>Kacper Bąk</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/eggplantbren>
            <img src=https://avatars.githubusercontent.com/u/1578298?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Brendon J. Brewer/>
            <br />
            <sub style="font-size:14px"><b>Brendon J. Brewer</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/FireMasterK>
            <img src=https://avatars.githubusercontent.com/u/20838718?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Kavin/>
            <br />
            <sub style="font-size:14px"><b>Kavin</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/kauffj>
            <img src=https://avatars.githubusercontent.com/u/530774?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Jeremy Kauffman/>
            <br />
            <sub style="font-size:14px"><b>Jeremy Kauffman</b></sub>
        </a>
    </td>
</tr>
</table>

## License
[GPL-3.0 License](LICENSE)

## Support

If you want you can donate me with crypto :)

LBC : bXeBKSjPygVbvkBH79Bp6CxiyeRC2hpVQ3


This will help future plugin development :)
