const axios = require('axios')

const isLocal = process.argv.includes('--local')

async function ssoCallback(req, res) {
    const { token, back } = req.query

    console.log(back)

    if (!token) {
        return res.status(400).json({ error: '缺少验证码 Token' })
    }

    try {
        const response = await axios.post(
            'http://localhost:3721/sso/verify',
            `token=${token}`
        )
        if (response.data.success) {
            // 保存会话（回调方式）
            req.session.user = {
                id: response.data.userId,
                username: response.data.userName,
                realname: response.data.userRealName,
            };

            req.session.save(err => {
                if (err) {
                    console.error('会话保存失败:', err);
                    return res.status(500).json({ error: '服务器内部错误' });
                }
                return res.redirect(back)
            });
        } else {
            return res.status(403).json({ error: '验证失败', codes: response.data.error })
        }
    } catch (error) {
        return res.status(500).json({ error: '验证服务不可用' })
    }
}

function init(app) {
    app.get('/sso/callback', ssoCallback)
    app.get('/sso/undefined', (req, res) => {
        return res.redirect('/')
    })
}

module.exports = init
