# 广学五题坊答题系统

一个基于 Node.js + Express + MySQL 的在线答题系统，支持用户登录、答题、成绩统计和证书生成等功能。

## 🚀 功能特性

- **用户认证**: 支持用户名密码登录和SSO单点登录
- **答题系统**: 支持单选题、多选题等多种题型
- **实时统计**: 实时显示答题进度和成绩排名
- **证书生成**: 自动生成PDF格式的成绩证书
- **响应式设计**: 支持PC端和移动端访问
- **管理后台**: 完整的题目管理和用户管理功能

## 📦 技术栈

- **后端**: Node.js, Express.js
- **数据库**: MySQL
- **实时通信**: Socket.IO
- **前端**: 原生HTML/CSS/JavaScript
- **PDF生成**: pdf-lib, pdfkit
- **文件处理**: multer
- **认证**: express-session, bcrypt

## 🛠️ 安装部署

### 环境要求

- Node.js 20.0+
- MySQL 5.7+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone <你的仓库地址>
cd gxwtf_quiz
```

### 2. 安装依赖

```bash
npm install
```

### 3. 数据库配置

1. 创建MySQL数据库：
```sql
CREATE DATABASE quiz_system;
```

2. 导入数据库结构（使用项目中的 `gxwtf_quiz.sql` 文件）

3. 配置环境变量，复制 `.env.example` 为 `.env` 并修改配置：

```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=quiz_system

# 会话配置
SESSION_SECRET=your_session_secret

# 服务器配置
PORT=3000
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 http://localhost:3000 启动

## 📁 项目结构

```
gxwtf_quiz/
├── config/           # 配置文件
│   ├── db.js        # 数据库连接
│   └── db2.js       # 备用数据库配置
├── controllers/      # 控制器
│   └── quizController.js
├── generate/         # 证书生成相关
│   ├── background*.jpg  # 证书背景图
│   ├── font*.ttf       # 证书字体
│   └── generate.js     # 证书生成逻辑
├── public/          # 静态文件
│   ├── admin/       # 管理后台页面
│   ├── css/         # 样式文件
│   ├── js/          # 前端脚本
│   ├── player/      # 玩家页面
│   └── *.html       # 主页面
├── routes/          # 路由文件
│   ├── authRoutes.js   # 认证路由
│   └── quizRoutes.js   # 答题路由
├── app.js           # 应用入口
├── quizSocket.js    # Socket.IO 实时通信
├── ssoCallbackSystem.js # SSO回调处理
└── package.json     # 项目配置
```

## 🎯 使用说明

### 用户端功能

1. **登录系统**: 支持用户名密码或SSO登录
2. **答题界面**: 显示题目和选项，支持倒计时
3. **成绩查看**: 答题结束后显示成绩和排名
4. **证书下载**: 生成并下载PDF格式的成绩证书

### 管理端功能

1. **题目管理**: 添加、编辑、删除题目
2. **用户管理**: 查看用户信息和答题记录
3. **数据统计**: 查看整体答题情况和成绩分布
4. **系统设置**: 配置系统参数和公告信息

## 🔧 开发指南

### 添加新题目类型

1. 在数据库 `questions` 表中添加新的题目类型
2. 在 `quizController.js` 中处理新的题目逻辑
3. 在前端页面中添加对应的显示和交互逻辑

### 自定义证书模板

1. 修改 `generate/` 目录下的背景图片和字体
2. 调整 `generate.js` 中的证书生成逻辑
3. 更新证书样式和布局

### 配置SSO集成

1. 设置 `SSO_ENABLED=true`
2. 配置正确的 `SSO_BASE_URL`
3. 确保SSO服务端的回调配置正确

## 📊 数据库设计

主要数据表：
- `users` - 用户信息表
- `questions` - 题目信息表
- `user_answers` - 用户答题记录
- `sessions` - 会话信息表
- `certificates` - 证书信息表

详细数据库结构请参考 `gxwtf_quiz.sql` 文件。

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 常见问题

### Q: 数据库连接失败怎么办？
A: 检查数据库服务是否启动，确认 `.env` 文件中的数据库配置是否正确。

### Q: 证书生成失败怎么办？
A: 检查 `generate/` 目录下的字体文件和背景图片是否存在。

### Q: SSO登录不成功怎么办？
A: 确认SSO服务端配置正确，检查网络连接和域名配置。

## 📞 支持

如有问题请提交 [Issue](https://github.com/your-repo/issues) 或联系开发团队。

---

⭐ 如果这个项目对你有帮助，请给它一个星标！