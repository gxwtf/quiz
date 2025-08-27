const express = require('express');
const router = express.Router();
const pool = require('../config/db2');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必要字段
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }

    // 数据库查询
    const [users] = await pool.query(
      'SELECT id, username, real_name, admin, password FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const passwordMatch = await bcrypt.compare(password, users[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 保存会话（回调方式）
    req.session.user = {
      id: users[0].id,
      username: users[0].username,
      realname: users[0].real_name,
    };

    req.session.save(err => {
      if (err) {
        console.error('会话保存失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      res.json({ success: true, admin: users[0].admin });
    });

  } catch (error) {
    console.error('登录错误:', error.stack);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: '登出失败' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
