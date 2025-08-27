document.addEventListener('DOMContentLoaded', function () {
    const announcement = document.getElementById('announcement');
    const closeBtn = document.getElementById('closeAnnouncement');

    // 关闭公告
    closeBtn.addEventListener('click', function () {
        announcement.classList.add('hidden');
    });
});