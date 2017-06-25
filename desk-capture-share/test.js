function test() {
    window.ws = new WebSocket('wss://ldodo.cc/rtcWs/?roomId=1498406077316c')

    ws.onopen = function () {
        console.log("websocket connected");
    };
    ws.onmessage = function (e) {
        let data = e.data || null
        data = JSON.parse(data)
        console.log(data)
    };
    ws.onclose = function () {
        console.log('Connection lost');
    };
}
