const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB2_HOST || 'localhost',
    user: process.env.DB2_USER || 'root',
    password: process.env.DB2_PASSWORD || 'password',
    database: process.env.DB2_DATABASE || 'account_system',
    dateStrings: true
});

// 测试连接
pool.getConnection()
    .then(conn => {
        console.log('✅ account数据库连接成功');
        conn.release();
    })
    .catch(err => {
        console.error('❌ account数据库连接失败:', err);
        process.exit(1);
    });

module.exports = pool;

