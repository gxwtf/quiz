var time, initTime_interval;
async function initTime() {
    var delay = Date.now();
    var res = await fetch('/queryTime');
    var tmp = Date.now();
    delay = (tmp - delay) / 2;
    var { servertime } = await res.json();
    servertime = new Date(servertime);
    delay += Date.now() - tmp;
    time = new Date(servertime.setMilliseconds(servertime.getMilliseconds() + delay));
    initTime_interval = setInterval(() => {
        time = new Date(time.setSeconds(time.getSeconds() + 1));
    }, 1000);
}
initTime();
setInterval(() => {
    clearInterval(initTime_interval);
    initTime();
}, 5 * 1000);