/**
 * 获取桌面共享功能代码
 */

var constraints;
var min_bandwidth = 512;
var max_bandwidth = 1048;
var room_password = '';
var isAudio = false;

function captureDesktop(cbSuccess, cbFail) {
    captureManager.start(cbSuccess, cbFail)
}

var captureManager = {
    cbSuccess: null,
    cbFail: null,
    // 回调监听
    listeners: {},
    // 注册监听回调事件
    on(name, fn) {
        this.listeners[name] = fn
    },
    // 重置各种状态
    resetStatus() {
        chrome.browserAction.setIcon({
            path: 'assets/desktop.png'
        });

        chrome.browserAction.setTitle({
            title: 'Share Desktop'
        });

        chrome.browserAction.setBadgeText({
            text: ''
        });
    },
    start(cbSuccess, cbFail) {
        let that = this;

        that.cbSuccess = cbSuccess || function () { }
        that.cbFail = cbFail || function () { }

        chrome.browserAction.setTitle({
            title: 'Capturing Desktop'
        });

        chrome.storage.sync.get(null, function (items) {
            if (items['is_audio'] && items['is_audio'] === 'true') {
                isAudio = true;
                captureTabUsingTabCapture();
                return;
            }

            var sources = ['window', 'screen'];
            var desktop_id = chrome.desktopCapture.chooseDesktopMedia(sources, that.onAccessApproved.bind(that));
        });
    },
    // 选择后的回调
    onAccessApproved(chromeMediaSourceId) {
        if (!chromeMediaSourceId) {
            this.resetStatus();
            let error = 'User denied to share his screen.'
            this.cbFail(error)
            return;
        }

        let that = this;
        chrome.storage.sync.get(null, function (items) {
            var resolutions = {};

            if (items['min_bandwidth']) {
                min_bandwidth = parseInt(items['min_bandwidth']);
            }

            if (items['max_bandwidth']) {
                max_bandwidth = parseInt(items['max_bandwidth']);
            }

            var _resolutions = items['resolutions'];
            if (!_resolutions) {
                resolutions = {
                    maxWidth: screen.width > 1920 ? screen.width : 1920,
                    maxHeight: screen.height > 1080 ? screen.height : 1080
                }

                chrome.storage.sync.set({
                    resolutions: '1080p'
                }, function () { });
            }

            if (_resolutions === 'fit-screen') {
                resolutions.maxWidth = screen.width;
                resolutions.maxHeight = screen.height;
            }

            if (_resolutions === '1080p') {
                resolutions.maxWidth = 1920;
                resolutions.maxHeight = 1080;
            }

            if (_resolutions === '720p') {
                resolutions.maxWidth = 1280;
                resolutions.maxHeight = 720;
            }

            if (_resolutions === '360p') {
                resolutions.maxWidth = 640;
                resolutions.maxHeight = 360;
            }

            constraints = {
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: chromeMediaSourceId,
                        maxWidth: resolutions.maxWidth,
                        maxHeight: resolutions.maxHeight,
                        minFrameRate: 30,
                        maxFrameRate: 64,
                        minAspectRatio: 1.77
                    },
                    optional: [{
                        bandwidth: resolutions.maxWidth * 8 * 1024
                    }]
                }
            };

            navigator.webkitGetUserMedia(constraints, that.gotStream.bind(that), that.getUserMediaError.bind(that));
        });
    },
    // 获取到了媒体流
    gotStream(stream) {
        let that = this
        if (!stream) {
            that.resetStatus();
            let error = 'Internal error occurred while capturing the screen'
            that.cbFail(error)
            return;
        }

        this.cbSuccess(stream)
        // chrome.browserAction.setTitle({
        //     title: 'Connecting to WebSockets server.'
        // });

        // chrome.browserAction.disable();

        stream.onended = function () {
            that.listeners['streamend'] && that.listeners['streamend']()
            that.resetStatus();
            // chrome.runtime.reload();
        };

        stream.getVideoTracks()[0].onended = stream.onended;
        if (stream.getAudioTracks().length) {
            stream.getAudioTracks()[0].onended = stream.onended;
        }

        function isMediaStreamActive() {
            if ('active' in stream) {
                if (!stream.active) {
                    return false;
                }
            } else if ('ended' in stream) { // old hack
                if (stream.ended) {
                    return false;
                }
            }
            return true;
        }

        // this method checks if media stream is stopped
        // or any track is ended.
        (function looper() {
            if (isMediaStreamActive() === false) {
                stream.onended();
                return;
            }

            setTimeout(looper, 1000); // check every second
        })();

        chrome.browserAction.setIcon({
            path: 'assets/pause.png'
        });

    },
    // 获取媒体流失败
    getUserMediaError(err) {
        this.resetStatus();
        let error = JSON.stringify(err, null, '<br>')
        this.cbFail(error)
    }
}