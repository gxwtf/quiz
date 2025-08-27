const express = require('express');
const session = require('express-session');
const sessionFileStore = require('session-file-store')(session);
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const http = require('http'); // 需要引入http模块
const quizSocket = require('./quizSocket');
const ssoCallback = require('./ssoCallbackSystem');

// 初始化应用
const app = express();
const server = http.createServer(app);

// 中间件配置
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    store: new sessionFileStore({ path: './session' }),
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
});
app.use(sessionMiddleware);
app.use(express.static('public', { index: ['index.html'], redirect: true, extensions: ['html'] }));
app.use(express.json());

// 根路径重定向逻辑
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 路由
app.use('/', authRoutes);
app.use('/quiz', quizRoutes);

app.get('/404-video', (req, res) => {
    const videoPath = path.join(__dirname, 'public', 'src', '404.mp4');
    res.sendFile(videoPath);
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('服务器错误');
});

// 时间同步
app.get('/queryTime', (req, res) => {
    res.json({ servertime: Date.now() });
});

ssoCallback(app);

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html')); // 返回自定义 404 页面
});

// socket应用初始化
quizSocket.init(server, sessionMiddleware);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务运行在 http://localhost:${PORT}`);
});
