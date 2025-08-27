async function loadLeaderboard(fetchUrl, isAdmin = false) {
    try {
        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';

        const response = await fetch(fetchUrl);
        const { success, rank, userId } = await response.json(); // 假设接口返回当前userId

        if (!success) throw new Error('获取排名失败');

        // 查找当前用户
        const userIndex = rank.findIndex(item => item.user_id === userId);

        if (!isAdmin && userIndex !== -1) {
            // 创建我的排名区块
            const total = rank.length;
            const userRank = rank[userIndex];
            const myRanking = document.createElement('li');
            myRanking.className = 'player-card my-ranking';
            myRanking.innerHTML = `
            <div class="rank-badge">${userIndex + 1}</div>
            <div class="player-info">
            <span class="player-name">我的排名 | ${userRank.user_name}</span>
            <span class="player-score">${userRank.score.toFixed(2)}</span>
            </div>
        `;
            leaderboard.appendChild(myRanking);
            if (document.getElementById('userIndex')) document.getElementById('userIndex').innerHTML = `排名：${userIndex + 1}`;
            if (document.getElementById('ratio')) document.getElementById('ratio').innerHTML = `超过了 ${((1 - userIndex / total) * 100).toFixed(2)}% 的参与者`;
        }

        // 生成完整排行榜
        rank.forEach((item, index) => {
            const li = document.createElement('li');
            const medalType = (index === 0 ? 'gold' : index === 1 ? 'sliver' : index === 2 ? 'bronze' : '');
            li.className = 'player-card ' + medalType;
            li.innerHTML = `
            <div class="rank-badge">${index + 1}</div>
            <div class="player-info">
            <span class="player-name">${item.user_name}</span>
            <span class="player-score">${item.score.toFixed(2)}</span>
            </div>
            <div class="medal ${medalType}">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</div>
        `;
            leaderboard.appendChild(li);
        });
    } catch (error) {
        console.error('加载失败:', error);
        leaderboard.innerHTML = '<div class="error">加载失败，请刷新页面</div>';
    }
}