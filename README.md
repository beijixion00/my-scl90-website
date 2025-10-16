# SCL-90心理健康测评网站

一个专业的SCL-90心理健康评估系统，从零开始构建。

## 功能特点

- ✅ 完整的SCL-90测评功能（90道题目）
- ✅ 10个维度分析（躯体化、强迫、抑郁等）
- ✅ 数据库存储（SQLite）
- ✅ 管理员后台系统
- ✅ 独立测评链接管理
- ✅ 多人同时测评支持

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite
- **前端**: HTML + CSS + JavaScript
- **部署**: Railway

## 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

访问 http://localhost:3000

## 部署状态

🚀 **在线部署**: [点击访问部署的网站](https://your-scl90-site.railway.app)

## 项目结构

```
my-scl90-website/
├── server.js          # 主服务器文件
├── package.json       # 项目配置
├── Procfile          # 部署配置
├── README.md         # 项目说明
├── scl90.db          # SQLite数据库（自动生成）
└── public/           # 前端文件
    ├── index.html
    ├── admin.html
    ├── assessment.html
    └── results.html
```

## API接口

- `GET /` - 首页
- `GET /api/questions` - 获取SCL-90题目
- `POST /api/assessment/start` - 开始测评
- `POST /api/assessment/submit` - 提交答案

## 贡献

从零学习Node.js网站开发，项目包含完整的代码和详细的搭建教程。

## 许可证

MIT License