/**
 * 建立rtc连接
 */

var duoduo_signal = {
    ws: null,
    inited: false,
    // 回调监听
    listeners: {},
    init(address) {
        !this.inited && this.initSignal(address)
    },
    // 注册监听回调事件
    on(name, fn) {
        this.listeners[name] = fn
    },
    initSignal(address) {
        let that = this;
        this.ws = address;
        var ws = this.ws = new WebSocket(address);

        ws.onopen = function () {
            that.inited = true
            that.join();
            that.listeners['connected'] && that.listeners['connected']()
            console.log("websocket connected");
        };
        ws.onmessage = function (e) {
            let data = e.data || null
            data = JSON.parse(data)
            console.log(data);
            switch (data.type) {
                case "self": that.onSelf(data.data); break;
                case "sys": that.onsys(data.data); break;
                case "peer": that.onPeer(data.data); break;
            };
        };
        ws.onclose = function () {
            that.inited = false
            console.log('Connection lost');
        };

        // 缓存原始send方法
        let send = ws.send;
        // 包装send方法
        ws.send = function (data) {
            // send.call(this, data);
            send.call(this, JSON.stringify(data));
            // console.log(data)
            console.log("websocket send: ", data);
        };
    },
    // 重置状态
    reset() {
        this.inited = false
        this.ws.onopen = null
        this.ws.onmessage = null
        this.ws.onerror = null
        this.ws.onclose = null
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close()
        }
        this.ws = null
        this.listeners = {}
    },
    // 发给自己的消息
    onSelf(data) {
        if (data.user) this.user = data.user
    },
    // 系统消息
    onsys(data) {
        // 如果有人加入则开始rtc连接
        if (data.code === 200 && data.type === 'in') {
            this.listeners['start'] && this.listeners['start']()
        }
        // 有人退出就断开rtc连接
        if (data.code === 200 && data.type === 'out') {
            this.listeners['stop'] && this.listeners['stop']()
        }
    },
    // peer消息
    onPeer(data) {
        // let {type, data} = data
        if (!data.type) return
        this.listeners[data.type] && this.listeners[data.type](data.data)
    },
    // 给服务端发送peer消息
    send(type, data) {
        data = {
            type: 'peer',
            data: {
                type,
                data
            }
        }
        this.ws.send(data);
    },
    join() {
        this.ws.send({
            type: 'join'
        })
    },
    sendPeer() {
        this.ws.send({
            type: 'peer',
            data: {
                status: 'ready',
                data: 222
            }
        })
    },
    stop() {
        if (!this.ws) return
        this.ws.send({
            type: 'leave',
            data: this.user
        })
        this.reset();
    }
}
var duoduo_rtc = {
    rtcConnection: null,
    stream: null,
    inited: false,
    // 回调监听
    listeners: {},
    // 注册监听回调事件
    on(name, fn) {
        this.listeners[name] = fn
    },
    init(address, stream) {
        if (!address) return
        this.stream = stream;

        duoduo_signal.init(address);
        if (this.inited) {
            return this.updateStream()
        }
        duoduo_signal.on('connected', this.setup.bind(this))
        duoduo_signal.on('start', this.start.bind(this))
        duoduo_signal.on('stop', this.stop.bind(this))
        duoduo_signal.on('candidate', this.onNewPeer.bind(this))
        duoduo_signal.on('offer', this.onOffer.bind(this))
        duoduo_signal.on('answer', this.onAnswer.bind(this))
    },
    setup() {
        let rtcConnection;
        if (navigator.mozGetUserMedia) {
            rtcConnection = this.rtcConnection = new RTCPeerConnection();
        } else {
            rtcConnection = this.rtcConnection = new RTCPeerConnection(null, {
                optional: [{
                    googCpuOveruseDetection: false
                }]
            });
        }

        console.log('setup peerconnection')
        /** 初始化成功的标志位 */
        this.inited = true;

        this.stream && rtcConnection.addStream(this.stream);

        this.initPeerEvent();

        this.listeners['ready'] && this.listeners['ready'](duoduo_signal.ws.url)
    },
    initPeerEvent() {
        let rtcConnection = this.rtcConnection, that = this;

        /** 远端流过来了, 新建video标签显示 */
        rtcConnection.onaddstream = function (event) {

            console.log("get remote stream", event.stream);
            that.listeners['stream'] && that.listeners['stream'](event.stream);

        };

        rtcConnection.onremovestream = function (e) {

            console.log("on remove stream", arguments);
        }

        /** 收到协议 */
        rtcConnection.onicecandidate = function (event) {
            console.log('onicecandidate: ', event.candidate);

            if (event.candidate) {
                duoduo_signal.send('candidate', event.candidate);
            } else {
                console.log("onicecandidate end");
            }
        };

        rtcConnection.onnegotiationneeded = function (event) {
            console.log('onnegotiationneeded', event);
        };

        rtcConnection.oniceconnectionstatechange = function () {
            console.log("oniceconnectionstatechange: ", rtcConnection.iceConnectionState);
        };
    },
    // 真正开始连接
    start() {
        console.log('开始连接, 发出链接邀请');
        let rtcConnection = this.rtcConnection
        let that = this
        let config = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
        };
        rtcConnection.createOffer(config).then(function (_offer) {
            console.log("create offer success", _offer);
            console.log("setLocalDescription")
            return rtcConnection.setLocalDescription(_offer).then(function () {
                console.log("after setLocalDescription, rtcConnection.localDescription:", rtcConnection.localDescription)
                duoduo_signal.send('offer', _offer);
            })
        }).catch((error) => {
            console.error("An error on startPeerConnection:", error)
        })
    },
    // 断开连接
    stop() {
        if (!this.inited) return
        this.listeners['stop'] && this.listeners['stop']()
        if (this.rtcConnection) this.rtcConnection.close()
        this.rtcConnection = null
        let stream = this.stream
        if (stream) {
            stream.getTracks().forEach(function (track) {
                track.stop()
                stream.removeTrack(track)
            })
        }
        this.stream = null
        this.listeners = {}
        this.inited = false

        duoduo_signal.stop()
    },
    // 更新流
    updateStream() {
        this.stream && this.rtcConnection && this.rtcConnection.addStream(this.stream);
    },
    /** 将对方加入自己的候选者中 */
    onNewPeer: function (candidate) {
        // var candidate = data.data;
        this.rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
    },
    /** 接收链接邀请，发出响应 */
    onOffer: function (offer) {
        let rtcConnection = this.rtcConnection
        // var offer = data;

        console.log("on remote offer", offer);
        console.log('setRemoteDescription offer')
        rtcConnection.setRemoteDescription(offer).then(() => {
            return rtcConnection.createAnswer().then((_answer) => {
                console.log('create answer:', _answer)
                console.log('setLocalDescription answer')
                return rtcConnection.setLocalDescription(_answer).then(() => {
                    console.log('send answer')
                    duoduo_signal.send('answer', _answer);
                })
            })
        }).catch((error) => {
            console.log('onOffer error:', error)
        })
    },
    /** 接收响应，设置远程的peer session */
    onAnswer: function (answer) {
        let rtcConnection = this.rtcConnection
        // var answer = data;
        console.log('on remote answer', answer)
        console.log('setRemoteDescription answer')
        rtcConnection.setRemoteDescription(answer).catch(function (e) {
            console.error(e);
        });
        // my.rtcConnection.setRemoteDescription(new RTCSessionDescription(answer));
    },
}
