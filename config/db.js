const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'quiz_system',
    waitForConnections: true,
});

// 测试连接
pool.getConnection()
    .then(conn => {
        console.log('✅ quiz数据库连接成功');
        conn.release();
    })
    .catch(err => {
        console.error('❌ quiz数据库连接失败:', err);
        process.exit(1);
    });

module.exports = pool;
