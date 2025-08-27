const { Server } = require('socket.io');
global.quizStat = new Object();
function init(server, sessionMiddleware) {
    global.quizSystem_io = new Server(server);
    global.quizSystem_io.engine.use(sessionMiddleware);
    global.quizSystem_io.on('connection', (socket) => {
        console.log('a user connected');
        // 管理员控制
        socket.on('admin-control', (action, callback) => {
            try {
                switch (action.type) {
                    case 'START_QUIZ':
                        console.log('kun');
                        global.quizStat[action.quizId].isRunning = true;
                        socket.to(action.quizId + '-player').emit('quiz-start');
                        break;
                    case 'NEXT_QUESTION':
                        console.log('next question');
                        global.quizStat[action.quizId].num++;
                        global.quizStat[action.quizId].isRunning = true;
                        socket.to(action.quizId + '-player').emit('next-question');
                        break;
                    case 'STOP_QUESTION':
                        global.quizStat[action.quizId].isRunning = false;
                        socket.to(action.quizId + '-player').emit('stop-question');
                        break;
                }
                callback();
            }
            catch (err) { }
        });

        // 玩家加入
        socket.on('player-join', (player, callback) => {
            try {
                console.log('player-join');
                const quizId = player.quizId;
                socket.join(quizId + '-player');
                console.log(player);
                console.log(socket.request.session);
                socket.to(quizId + '-info').emit('players-update', { name: socket.request.session.user.username });
                callback();
            }
            catch (err) { }
        });

        socket.on('info-join', (admin, callback) => {
            try {
                console.log('info-join');
                socket.join(admin.quizId + '-info');
                callback();
            }
            catch (err) { }
        });

        // 管理员加入
        socket.on('admin-join', (admin, callback) => {
            try {
                if (!global.quizStat[admin.quizId] || global.quizStat[admin.quizId].num > 100000) {
                    global.quizStat[admin.quizId] = {
                        num: 0,
                        isRunning: true,
                        players: []
                    };
                }
                socket.join(admin.quizId + '-admin');
                callback();
            }
            catch (err) { }
        });

        // 管理员加入
        socket.on('restart-quiz', (admin, callback) => {
            try {
                global.quizStat[admin.quizId] = {
                    num: 0,
                    isRunning: true,
                    players: []
                };
                socket.join(admin.quizId + '-admin');
                callback();
            }
            catch (err) { }
        })
    });
}
exports.init = init;
