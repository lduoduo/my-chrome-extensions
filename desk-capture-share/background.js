/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
// ?
var ports;
var extensionId = 'aeilahanmchnodpfmboajalejjehglhl'
var popup_id;

// 发送请求的发送者
var senderInfo = null

// 目前支持的自定义注册事件
var supportedEventList = ['test', 'mediastream']

// 单击浏览器按钮的表现，弹出popup窗
// chrome.browserAction.onClicked.addListener(function () {
//     // chrome.app.window.create('popup.html', {
//     //     id: "desktopCaptureID",
//     //     innerBounds: {
//     //         width: 700,
//     //         height: 600
//     //     }
//     // });
//     chrome.windows.create({
//         url: "data:text/html,<h1>hello</h1>",
//         type: 'popup',
//         width: screen.width / 2,
//         height: 170
//     });
// });

// chrome.runtime.onConnect.addListener(function (port) {
//     ports = port;
//     port.onMessage.addListener(portOnMessageHanlder);
// })
// 监听来自content_script的消息
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        // request --> 客户端请求传过来的参数
        // 先进行extensionId校验，校验失败不做任何事
        if (request.extensionId !== extensionId) return
        senderInfo = sender

        captureManager.start(BG.captureDesktopSuccess.bind(BG), BG.captureDesktopFail.bind(BG));
        captureManager.on('streamend', BG.captureDesktopEnd.bind(BG));

        BG.callback({ from: "server", extensionId, response: { code: 200, supportedEventList } });
    }
);

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == 'install') {
        chrome.tabs.create({
            url: 'chrome://extensions/?options=' + chrome.runtime.id
        });
    }
});

// 主体事件
var BG = {
    callback(data) {
        if (!senderInfo || !senderInfo.tab || !senderInfo.tab.id) return
        let tabId = senderInfo.tab.id
        chrome.tabs.sendMessage(tabId, data)
    },
    captureDesktopSuccess(stream) {
        // this.callback({
        //     from: "server",
        //     extensionId,
        //     response: {
        //         code: 200,
        //         response: {
        //             type: 'mediastream',
        //             data: stream
        //         }
        //     }
        // })
        this.startRTC(stream);

    },
    captureDesktopFail(error) {
        this.callback({ from: "server", extensionId, response: { code: 500, error } });
    },
    captureDesktopEnd() {
        duoduo_rtc.stop();
    },
    // 开启rtc连接传输stream
    startRTC(stream) {
        // let roomId = 10001;
        let roomId = Date.now() + ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)]
        // let ip = '192.168.31.210';
        // let ip = '10.242.96.105';        
        let host = 'ldodo.cc'
        let address = `wss://${host}/rtcWs/?roomId=${roomId}`;

        duoduo_rtc.init(address, stream)
        // rtc初始化成功后返回一个wss连接地址传递给客户端进行p2p连接获取stream
        duoduo_rtc.on('ready', function (wss) {
            this.callback({ from: "server", extensionId, response: { code: 200, type: 'mediastream', wss } });
        }.bind(this))
    }
}

