var extensionId = 'aeilahanmchnodpfmboajalejjehglhl'
// var port = chrome.runtime.connect(extensionId);

// 消息来源对应的方法
let map = {
    'client': 'onClient',
    'server': 'onServer'
}

let home = {
    onClient(data) {
        let {extensionId, type} = data
        console.log("Content script received data from client --->  ", data);
        console.log('send message to background')
        // port.postMessage(data, function(response) {
        chrome.runtime.sendMessage(data, function (response) {
            // console.log('get message from background', response)
            // // console.log(response.farewell);
            // console.log('response to page')

            // toggle()
        });
    },
    onServer(data) {
        console.log("Content script received data from server --->  ", data);
        console.log('response to page')
        data.from = 'middle-server'
        // 注意，如果type是媒体流，这边需要经过rtc特殊处理再传回给客户端，否则无法获取本地流
        // if (data.response && data.response.type && data.response.type === 'mediastream') {
        //     return this.startRTC(data.response.wss);
        // }
        window.postMessage(data, '*')
    },
    startRTC(url) {
        duoduo_rtc.init(url);
        duoduo_rtc.on('stream', function (mediastream) {
            var vn = document.createElement('video')
            vn.srcObject = mediastream
            // vn.src = URL.createObjectURL(stream);
            vn.play()
            document.body.appendChild(vn)

            window.postMessage({ from: "middle-server", extensionId, response: { code: 200, mediastream } }, '*')
        }.bind(this))
    }
}

// 接收server端消息
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        home.onServer(request)
    }
);

// 接收client端消息
window.addEventListener("message", function (event) {
    // We only accept messages from ourselves
    if (event.source != window) return;

    // console.log('content script get：', event)
    // 非约定的直接忽略
    if (!event || !event.data || !event.data.from || !event.data.extensionId || !event.data.type) return
    let {from} = event.data
    let clientExtensionId = event.data.extensionId

    // 先进行extensionId校验，校验失败不做任何事
    if (clientExtensionId !== extensionId) {
        window.postMessage({
            from: "middle-server",
            extensionId,
            response: {
                code: 500,
                error: '浏览器插件id校验失败, 请先安装或更新插件!'
            }
        }, '*')
        return
    }

    // 消息来源进行处理
    home[map[from]](event.data);

    // if (event && event.data && event.data.from && (event.data.from == "client")) {

    //     console.log('send message to background')
    //     chrome.runtime.sendMessage({ greeting: "hello" }, function(response) {
    //         console.log('get message from background', response)
    //         // console.log(response.farewell);
    //         console.log('response to page')
    //         window.postMessage({ from: 'middle-server', response }, '*')
    //         // toggle()
    //     });
    // }
}, false);

// 监听从background.js发来的消息
// chrome.runtime.onMessage.addListener(
//     function (request, sender, sendResponse) {
//         console.log(sender.tab ?
//             "from a content script:" + sender.tab.url :
//             "from the extension");
//         if (request.greeting == "hello")
//             sendResponse({ farewell: "goodbye" });
//     });


console.log('Content script loaded!')