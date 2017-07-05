/**
 * 获取桌面共享功能代码
 */

var constraints;
var min_bandwidth = 512;
var max_bandwidth = 1048;
var room_password = '';
var isAudio = false;

// 客户端调用的命令
var command = {
    // 只捕捉屏幕
    DESKTOP_ONLY: '1',
    // 同时捕捉屏幕和声音
    DESKTOP_AUDIO: '2'
}

var captureManager = {
    isAudio: false,
    stream: null,
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

        let stream = this.stream
        stream && stream.getTracks().forEach(function (track) {
            stream.removeTrack(track)
        })

        this.stream = null
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
    init(option = {}) {
        let {cbSuccess, cbFail, type} = option
        this.isAudio = type === command.DESKTOP_AUDIO

        captureManager.start(cbSuccess, cbFail)
        // if (!type) {
        //     captureManager.start(cbSuccess, cbFail)
        //     return
        // }
        // chrome.storage.sync.set({
        //     resolutions: '1080p',
        //     is_audio: type === command.DESKTOP_AUDIO
        // }, function () { 
        //     captureManager.start(cbSuccess, cbFail)
        // });
    },
    start(cbSuccess, cbFail) {
        let that = this;

        that.cbSuccess = cbSuccess || function () { }
        that.cbFail = cbFail || function () { }

        // chrome.browserAction.setTitle({
        //     title: 'Capturing Desktop'
        // });

        // this.captureAudio()
        // chrome.storage.sync.get(null, function (items) {
        //     // if (items['is_audio']) {
        //     //     isAudio = true;
        //     //     captureTabUsingTabCapture();
        //     //     return;
        //     // }

        //     var sources = ['window', 'screen', 'tab', 'audio'];
        //     var desktop_id = chrome.desktopCapture.chooseDesktopMedia(sources, that.onAccessApproved.bind(that));
        // });

        var sources = ['window', 'screen', 'tab', 'audio'];
        // var sources = ['audio']
        var desktop_id = chrome.desktopCapture.chooseDesktopMedia(sources, that.onAccessApproved.bind(that));

    },
    // 选择后的回调
    onAccessApproved(chromeMediaSourceId, options) {
        console.log('options:',options)
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
                // audio: options.canRequestAudioTrack,
                // audio: {
                //     mandatory: {
                //         chromeMediaSource: 'system'
                //         // chromeMediaSourceId: audioSource,
                //     }
                // },
                // video: {
                //     mandatory: {
                //         chromeMediaSource: 'desktop',
                //         chromeMediaSourceId: event.data.sourceId,
                //         maxWidth: window.screen.width,
                //         maxHeight: window.screen.height,
                //         maxFrameRate: 3
                //     },
                //     optional: [
                //         { googLeakyBucket: true },
                //         { googTemporalLayeredScreencast: true }
                //     ]
                // }
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
                    optional: [
                        // { googLeakyBucket: true },
                        { googTemporalLayeredScreencast: true },
                        { bandwidth: resolutions.maxWidth * 8 * 1024 }
                    ]
                }
            };

            navigator.webkitGetUserMedia(constraints, that.gotStream.bind(that), that.getUserMediaError.bind(that));
        });
    },
    captureAudio() {
        let that = this
        let audioConstraints = {
            audio: true,
            video: false
        };
        navigator.mediaDevices.getUserMedia(audioConstraints).then((stream) => {
            window.anode = document.createElement('audio')
            anode.srcObject = stream
            anode.controls = true
            anode.play()
            // document.body.appendChild(anode)
        }).catch(err => {
            console.log(err)
        })
        // navigator.webkitGetUserMedia(audioConstraints, function (stream) {
        //     that.stream = that.stream || stream
        //     if (stream.getAudioTrack().length > 0) {
        //         that.stream.addTrack(stream.getAudioTrack()[0])
        //         that.cbSuccess(that.stream)
        //     }
        // }, that.getUserMediaError.bind(that));
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

        // 捕捉到视频流之后再捕获音频流
        this.stream = stream

        this.cbSuccess(stream)
        // let vn = document.querySelector('#testVideo')
        // vn.srcObject = stream;
        // vn.play();
        // chrome.browserAction.setTitle({
        //     title: 'Connecting to WebSockets server.'
        // });

        // chrome.browserAction.disable();

        stream.onended = function () {

            // 停止捕获声音
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

        // if (!this.isAudio) return this.cbSuccess(stream)
        // this.captureAudio()

    },
    // 获取媒体流失败
    getUserMediaError(err) {
        console.error(err)
        this.resetStatus();
        let error = JSON.stringify(err, null, '<br>')
        this.cbFail(error)
    }
}