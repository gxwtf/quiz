function hideScreen(prompt) {
    const ppt = document.createElement('h1');
    ppt.innerHTML = prompt;
    ppt.style.paddingLeft = '20px';
    const cover = document.createElement('div');
    cover.appendChild(ppt);
    cover.style.zIndex = 114514;
    cover.style.position = 'fixed';
    cover.style.top = 0;
    cover.style.left = 0;
    cover.style.width = '100%';
    cover.style.height = '100%';
    cover.style.background = '#ffffff';
    document.body.appendChild(cover);
    Array.from(document.getElementsByClassName('container')).forEach(e => {
        e.remove();
    });
}

async function init() {
    const res = await fetch('/quiz/verify/identification', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
        hideScreen(data.error + '<br>三秒后将跳转至登录界面');
        setTimeout(() => {
            location.href = `/login?back=${location.href.replace(/http.?:\/\/[^/]*/, '')}`;
        }, 3000);
        return;
    }
    if (location.href.indexOf('admin') !== -1 && !data.admin) {
        hideScreen('没有管理员权限<br>你是不是想吃子弹了<br>送你仨字：想得美');
        setTimeout(() => {
            window.location.href = '/404';
        }, 2000);
        return;
    }
    try {
        document.getElementById('username').innerHTML = data.username;
    } catch (err) { }
    const personModel = document.getElementById('person-model');
    if (!data.admin) {
        personModel.remove();
    }
}
init();

function launchFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}
