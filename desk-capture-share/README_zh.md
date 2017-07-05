## Desktop Share extension

this extension show you how to capture your desktop and share it with others

[online demo here](https://ldodo.cc/koa/desktop)

[project here](https://github.com/lduoduo/mykoa/tree/webRTC)
### Desktop Capture

Shows how to grab a desktop capture feed using getUserMedia. Requires
the appropriate permissions (`desktopCapture`) to be set in the manifest file.

### Desktop Share

use webrtc to transform mediastream, this need a further socket server to help you build your rtc connection

### APIs

* [Runtime](http://developer.chrome.com/apps/app.runtime.html)
* [Window](http://developer.chrome.com/apps/app.window.html)
* [desktopCapture](https://developer.chrome.com/apps/desktopCapture)

### contents
+ manifest.json
> all extension need this file, to declare the framework of this extension

[document here](https://developer.chrome.com/extensions)
+ content script
> inject into web pages, to be a bridge between web page and background

[document here](https://developer.chrome.com/extensions/content_scripts)
+ background.js

### history of tries to deliver MediaStream from background to web pages
1. background.js capture the desktop stream and deliver to web page through content script
> `FAIL`: the stream web page get was an empty object

2. background.js capture the desktop stream and transfer to a blob url, deliver this url to web page
> `FAIL`: Not Allowed to load local resource blob

3. background.js capture the desktop stream, start a local sockt server, use webrtc to deliver to web page
> `FAIL`: 'sockets' is only allowed for packaged apps, but this is a extension

4. background.js capture the desktop stream, attach to webrtc through further socket server, content script also use webrtc to get this stream, deliver to web page
> `FAIL`: Uncaught DOMException: Failed to excute 'postMessage' on 'Window': MediaStream Object could not be cloned

5. background.js capture the desktop stream, attach to webrtc through further socket server, web page use webrtc to get this stream
>  `SUCCESS!`


### Screenshot
![screenshot](https://github.com/lduoduo/my-chrome-extensions/blob/master/desk-capture-share/assets/image.png?raw=true)


