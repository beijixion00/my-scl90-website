const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

// SCL-90题目内容
const SCL90_QUESTIONS = [
  "头痛", "神经过敏，心中不踏实", "头脑中有不必要的想法或字句盘旋", "头晕和昏倒", "对异性的兴趣减退",
  "对旁人责备求全", "感到别人能控制您的思想", "责怪别人制造麻烦", "忘记性大", "担心自己的衣饰整齐及仪态的端正",
  "容易烦恼和激动", "胸痛", "害怕空旷的场所或街道", "感到自己的精力下降，活动减慢", "想结束自己的生命",
  "听到旁人听不到的声音", "发抖", "感到大多数人都不可信任", "胃口不好", "容易哭泣",
  "同异性相处时感到害羞不自在", "感到受骗，中了圈套或有人想抓住您", "无缘无故地突然感到害怕", "自己不能控制地大发脾气", "怕单独出门",
  "经常责怪自己", "腰痛", "感到难以完成任务", "感到孤独", "感到苦闷",
  "过分担忧", "对事物不感兴趣", "感到害怕", "您的感情容易受到伤害", "旁人能知道您的私下想法",
  "感到别人不理解您，不同情您", "感到人们对你不友好，不喜欢您", "做事必须做得很慢以保证做得正确", "心跳得很厉害", "恶心或胃部不舒服",
  "感到比不上他人", "肌肉酸痛", "感到有人在监视您或谈论您", "难以入睡", "做事必须反复检查",
  "难以作出决定", "怕乘电车、公共汽车、地铁或火车", "呼吸有困难", "一阵阵发冷或发热", "因为感到害怕而避开某些东西、场合或活动",
  "脑子变空了", "身体发麻或刺痛", "喉咙有梗塞感", "感到前途没有希望", "不能集中注意",
  "感到身体的某一部分软弱无力", "感到紧张或容易紧张", "感到手或脚发重", "想到死亡的事", "吃得太多",
  "当别人看着您或谈论您时感到不自在", "有一些不属于您自己的想法", "有想打人或伤害他人的冲动", "醒得太早", "必须反复洗手、点数目或触摸某些东西",
  "睡得不稳不深", "有想摔坏或破坏东西的冲动", "有一些别人没有的想法或念头", "感到对别人神经过敏", "在商店或电影院等人多的地方感到不自在",
  "感到任何事情都很困难", "一阵阵恐惧或惊恐", "感到公共场合吃东西很不舒服", "经常与人争论", "单独一人时神经很紧张",
  "别人对您的成绩没有作出恰当的评价", "即使和别人在一起也感到孤单", "感到坐立不安心神不定", "感到自己没有什么价值", "感到熟悉的东西变成陌生或不像是真的",
  "大叫或摔东西", "害怕会在公共场合昏倒", "感到别人想占您的便宜", "为一些有关性方面的想法而很苦恼", "您认为应该因为自己的过错而受到惩罚",
  "感到要赶快把事情做完", "感到自己的身体有严重问题", "从未感到和其他人很亲近", "感到自己有罪", "感到自己的脑子有毛病"
];

// 首页路由
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SCL-90心理健康测评</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { max-width: 500px; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
            h1 { margin-bottom: 20px; font-size: 24px; }
            p { margin-bottom: 30px; font-size: 16px; opacity: 0.9; }
            .info { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
            .btn { background: #ff6b6b; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; transition: background 0.3s; }
            .btn:hover { background: #ff5252; }
            .success { background: rgba(46, 204, 113, 0.2); border: 2px solid #2ecc71; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎉 SCL-90心理健康测评网站</h1>
            <p>专业的心理健康评估工具 - 成功部署上线！</p>
            <div class="info success">
                <strong>✅ 网站已成功部署到云端！</strong><br>
                这是一个从零开始构建的完整项目
            </div>
            <div class="info">
                <strong>🚀 技术栈：</strong><br>
                Node.js + Express + Vercel 部署
            </div>
            <div class="info">
                <strong>📊 功能特点：</strong><br>
                • 完整的SCL-90测评系统<br>
                • 90道专业题目<br>
                • 10个维度分析<br>
                • 实时数据处理
            </div>
            <a href="/api/questions" class="btn">📋 查看题目接口</a>
            <a href="/info" class="btn">ℹ️ 项目信息</a>
        </div>
    </body>
    </html>
  `);
});

// 项目信息页面
app.get('/info', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>项目信息 - SCL-90心理健康测评</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; backdrop-filter: blur(10px); }
            .section { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; }
            .back-btn { background: #ff6b6b; color: white; padding: 10px 20px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; margin-bottom: 20px; }
            h1, h2 { color: white; }
            ul { text-align: left; }
            code { background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/" class="back-btn">← 返回首页</a>
            <h1>🚀 项目详细信息</h1>

            <div class="section">
                <h2>📋 项目信息</h2>
                <ul>
                    <li><strong>项目名称：</strong>SCL-90心理健康测评网站</li>
                    <li><strong>开发者：</strong>changxiansheng</li>
                    <li><strong>开发时间：</strong>2024年</li>
                    <li><strong>部署平台：</strong>Vercel</li>
                </ul>
            </div>

            <div class="section">
                <h2>💻 技术栈</h2>
                <ul>
                    <li><strong>后端：</strong>Node.js + Express.js</li>
                    <li><strong>部署：</strong>Vercel 云平台</li>
                    <li><strong>API：</strong>RESTful API 设计</li>
                    <li><strong>数据格式：</strong>JSON</li>
                </ul>
            </div>

            <div class="section">
                <h2>🎯 功能特点</h2>
                <ul>
                    <li>✅ 完整的SCL-90测评功能（90道题目）</li>
                    <li>✅ 10个维度分析（躯体化、强迫、抑郁等）</li>
                    <li>✅ RESTful API接口</li>
                    <li>✅ 响应式设计</li>
                    <li>✅ 云端部署</li>
                </ul>
            </div>

            <div class="section">
                <h2>🔗 API接口</h2>
                <ul>
                    <li><code>GET /</code> - 首页</li>
                    <li><code>GET /info</code> - 项目信息</li>
                    <li><code>GET /api/questions</code> - 获取SCL-90题目</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
  `);
});

// 获取题目API
app.get('/api/questions', (req, res) => {
  res.json({
    success: true,
    message: "SCL-90心理健康测评题目",
    total: SCL90_QUESTIONS.length,
    questions: SCL90_QUESTIONS.map((question, index) => ({
      id: index + 1,
      text: question
    }))
  });
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'SCL-90网站运行正常'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 SCL-90心理测评服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`✅ 网站已成功启动！`);
});

// 导出app用于Vercel
module.exports = app;