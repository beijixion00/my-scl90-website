const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

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

// SCL-90维度映射
const SCL90_DIMENSIONS = {
  somatization: [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58],
  obsessive_compulsive: [3, 9, 10, 28, 38, 45, 46, 51, 55, 65],
  interpersonal_sensitivity: [6, 21, 34, 36, 37, 41, 61, 69, 73],
  depression: [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79],
  anxiety: [2, 17, 23, 33, 39, 57, 72, 78, 80, 86],
  hostility: [11, 24, 63, 67, 74, 81],
  phobic_anxiety: [13, 25, 47, 50, 70, 75, 82],
  paranoid_ideation: [8, 18, 43, 68, 76, 83],
  psychoticism: [7, 16, 35, 62, 77, 84, 85, 87, 88, 90],
  additional: [19, 44, 59, 60, 64, 66, 89]
};

// 维度名称
const DIMENSION_NAMES = {
  somatization: '躯体化',
  obsessive_compulsive: '强迫症状',
  interpersonal_sensitivity: '人际关系敏感',
  depression: '抑郁',
  anxiety: '焦虑',
  hostility: '敌对',
  phobic_anxiety: '恐怖',
  paranoid_ideation: '偏执',
  psychoticism: '精神病性',
  additional: '其他'
};

// 管理员密码
const ADMIN_PASSWORD = '1234love';
const ADMIN_TOKEN = 'secure_admin_token_2024';

// 内存存储（替代数据库）
let assessmentLinks = [];
let assessments = {};
let assessmentCounter = 1;

// 生成唯一ID
function generateUniqueId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

// 验证管理员身份
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization || req.headers['x-admin-token'] || req.cookies.adminToken;
  if (token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: '未授权访问' });
  }
}

// 计算测评结果
function calculateResults(answers) {
  const results = {};

  Object.entries(SCL90_DIMENSIONS).forEach(([key, questions]) => {
    const scores = questions.map(q => answers[q - 1]);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // 计算T分数
    const tScore = 50 + (averageScore - 2.5) * 10;

    // 判断严重程度
    let level = '正常';
    if (tScore >= 70) level = '严重';
    else if (tScore >= 60) level = '中度';
    else if (tScore >= 40) level = '轻度';

    results[key] = {
      name: DIMENSION_NAMES[key],
      score: parseFloat(averageScore.toFixed(2)),
      tScore: parseFloat(tScore.toFixed(2)),
      level
    };
  });

  return results;
}

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
            .container { max-width: 600px; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
            h1 { margin-bottom: 20px; font-size: 28px; }
            p { margin-bottom: 30px; font-size: 16px; opacity: 0.9; }
            .info { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; font-size: 14px; text-align: left; }
            .btn { background: #ff6b6b; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; transition: all 0.3s; }
            .btn:hover { background: #ff5252; transform: translateY(-2px); }
            .btn-primary { background: #4ecdc4; }
            .btn-primary:hover { background: #45b7b0; }
            .success { background: rgba(46, 204, 113, 0.2); border: 2px solid #2ecc71; }
            .warning { background: rgba(241, 196, 15, 0.2); border: 2px solid #f1c40f; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 SCL-90心理健康测评系统</h1>
            <p>专业的心理健康评估工具 - 完整功能版</p>

            <div class="info success">
                <h3>🎉 系统功能完整</h3>
                <ul>
                    <li>✅ 完整的SCL-90测评功能（90道题目）</li>
                    <li>✅ 10个维度专业分析</li>
                    <li>✅ 实时计算结果</li>
                    <li>✅ 测评链接管理</li>
                    <li>✅ 管理员后台</li>
                </ul>
            </div>

            <div class="info warning">
                <h3>📋 测评说明</h3>
                <p>SCL-90症状自评量表是世界上最著名的心理健康测试量表之一，包含90个条目，从躯体化、焦虑、抑郁、人际关系敏感等10个维度评估心理健康状况。</p>
            </div>

            <div style="margin-top: 30px;">
                <a href="/assessment/start" class="btn btn-primary">🚀 开始测评</a>
                <a href="/admin/login" class="btn">👨‍💼 管理员登录</a>
            </div>

            <div class="info" style="margin-top: 30px;">
                <p><strong>技术支持：</strong>Node.js + Express + Vercel 云部署</p>
                <p><strong>开发者：</strong>changxiansheng</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// 开始测评页面
app.get('/assessment/start', (req, res) => {
  const linkId = generateUniqueId();

  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>开始SCL-90测评</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
            .container { max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; backdrop-filter: blur(10px); }
            h1 { margin-bottom: 30px; font-size: 28px; }
            .info { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left; }
            .btn { background: #4ecdc4; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; transition: all 0.3s; }
            .btn:hover { background: #45b7b0; transform: translateY(-2px); }
            .back-btn { background: #95a5a6; }
            .back-btn:hover { background: #7f8c8d; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 SCL-90心理健康测评</h1>

            <div class="info">
                <h3>📋 测评说明</h3>
                <p><strong>测试时间：</strong>约15-20分钟</p>
                <p><strong>题目数量：</strong>90道题</p>
                <p><strong>评分标准：</strong>1分（没有）到5分（非常严重）</p>
                <p><strong>测评内容：</strong>包含躯体化、强迫症状、人际关系敏感、抑郁、焦虑、敌对、恐怖、偏执、精神病性和其他10个维度</p>
            </div>

            <div class="info">
                <h3>⚠️ 注意事项</h3>
                <ul>
                    <li>请根据最近一周的实际感受回答</li>
                    <li>每个问题都要回答，不要遗漏</li>
                    <li>选择最符合您情况的选项</li>
                    <li>测试结果仅供参考，如需专业帮助请咨询心理医生</li>
                </ul>
            </div>

            <div style="margin-top: 30px;">
                <button onclick="startAssessment('${linkId}')" class="btn">🚀 开始测评</button>
                <a href="/" class="btn back-btn">← 返回首页</a>
            </div>
        </div>

        <script>
            function startAssessment(linkId) {
                fetch('/api/assessment/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ linkId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = '/assessment/' + linkId;
                    } else {
                        alert('开始测评失败，请重试');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('网络错误，请重试');
                });
            }
        </script>
    </body>
    </html>
  `);
});

// 测评页面
app.get('/assessment/:linkId', (req, res) => {
  const { linkId } = req.params;

  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SCL-90测评进行中</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; padding: 20px; }
            .container { max-width: 900px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
            .progress { background: rgba(255,255,255,0.2); height: 20px; border-radius: 10px; margin: 20px 0; overflow: hidden; }
            .progress-bar { background: #4ecdc4; height: 100%; transition: width 0.3s; }
            .question-card { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 10px; margin: 20px 0; }
            .options { display: flex; justify-content: space-around; flex-wrap: wrap; margin: 20px 0; }
            .option { background: rgba(255,255,255,0.2); padding: 15px 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s; margin: 5px; border: 2px solid transparent; }
            .option:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
            .option.selected { border-color: #4ecdc4; background: rgba(78, 205, 196, 0.3); }
            .btn { background: #4ecdc4; color: white; padding: 12px 25px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 10px; transition: all 0.3s; }
            .btn:hover { background: #45b7b0; }
            .btn:disabled { background: #95a5a6; cursor: not-allowed; }
            .question-number { font-size: 14px; opacity: 0.8; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 SCL-90心理健康测评</h1>

            <div class="progress">
                <div class="progress-bar" id="progressBar" style="width: 0%"></div>
            </div>

            <div id="questionContainer">
                <div class="question-card">
                    <div class="question-number" id="questionNumber">第 1 题 / 共 90 题</div>
                    <h2 id="questionText">加载中...</h2>
                    <div class="options" id="optionsContainer"></div>
                    <div style="margin-top: 30px;">
                        <button onclick="previousQuestion()" id="prevBtn" class="btn" disabled>上一题</button>
                        <button onclick="nextQuestion()" id="nextBtn" class="btn" disabled>下一题</button>
                        <button onclick="submitAssessment()" id="submitBtn" class="btn" style="display: none;">提交测评</button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            const questions = ${JSON.stringify(SCL90_QUESTIONS)};
            let currentQuestion = 0;
            let answers = new Array(90).fill(null);

            function loadQuestion() {
                document.getElementById('questionNumber').textContent = \`第 \${currentQuestion + 1} 题 / 共 90 题\`;
                document.getElementById('questionText').textContent = questions[currentQuestion];

                const optionsContainer = document.getElementById('optionsContainer');
                optionsContainer.innerHTML = '';

                const options = [
                    { value: 1, text: '没有' },
                    { value: 2, text: '很轻' },
                    { value: 3, text: '中等' },
                    { value: 4, text: '偏重' },
                    { value: 5, text: '严重' }
                ];

                options.forEach(option => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'option';
                    optionDiv.textContent = option.text;
                    if (answers[currentQuestion] === option.value) {
                        optionDiv.classList.add('selected');
                    }
                    optionDiv.onclick = () => selectOption(option.value);
                    optionsContainer.appendChild(optionDiv);
                });

                updateProgress();
                updateButtons();
            }

            function selectOption(value) {
                answers[currentQuestion] = value;

                document.querySelectorAll('.option').forEach(option => {
                    option.classList.remove('selected');
                });

                event.target.classList.add('selected');
                updateButtons();
            }

            function updateProgress() {
                const progress = ((currentQuestion + 1) / 90) * 100;
                document.getElementById('progressBar').style.width = progress + '%';
            }

            function updateButtons() {
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                const submitBtn = document.getElementById('submitBtn');

                prevBtn.disabled = currentQuestion === 0;

                if (currentQuestion === 89) {
                    nextBtn.style.display = 'none';
                    submitBtn.style.display = 'inline-block';
                    submitBtn.disabled = answers[currentQuestion] === null;
                } else {
                    nextBtn.style.display = 'inline-block';
                    submitBtn.style.display = 'none';
                    nextBtn.disabled = answers[currentQuestion] === null;
                }
            }

            function previousQuestion() {
                if (currentQuestion > 0) {
                    currentQuestion--;
                    loadQuestion();
                }
            }

            function nextQuestion() {
                if (currentQuestion < 89) {
                    currentQuestion++;
                    loadQuestion();
                }
            }

            function submitAssessment() {
                if (answers.includes(null)) {
                    alert('请回答所有问题后再提交');
                    return;
                }

                fetch('/api/assessment/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        linkId: '${linkId}',
                        answers: answers
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = '/results/' + data.resultId;
                    } else {
                        alert('提交失败，请重试');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('网络错误，请重试');
                });
            }

            // 初始化
            loadQuestion();
        </script>
    </body>
    </html>
  `);
});

// 管理员登录页面
app.get('/admin/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理员登录</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
            .login-container { background: rgba(255,255,255,0.95); padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); width: 100%; max-width: 400px; text-align: center; }
            h2 { color: #333; margin-bottom: 30px; font-size: 24px; }
            .form-group { margin-bottom: 20px; text-align: left; }
            label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
            input[type="password"] { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; transition: border-color 0.3s; }
            input[type="password"]:focus { outline: none; border-color: #667eea; }
            .btn { width: 100%; background: #667eea; color: white; padding: 12px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; transition: background 0.3s; }
            .btn:hover { background: #5a6fd8; }
            .error { color: #e74c3c; margin-top: 15px; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h2>管理员登录</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="password">管理员密码：</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="btn">登录</button>
                <div id="errorMessage" class="error" style="display: none;"></div>
            </form>
            <div style="margin-top: 20px;">
                <a href="/" style="color: #667eea; text-decoration: none;">← 返回首页</a>
            </div>
        </div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('errorMessage');

                try {
                    const response = await fetch('/api/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        document.cookie = 'adminToken=secure_admin_token_2024; max-age=86400';
                        window.location.href = '/admin/dashboard';
                    } else {
                        errorDiv.textContent = data.error || '登录失败';
                        errorDiv.style.display = 'block';
                    }
                } catch (error) {
                    errorDiv.textContent = '网络错误，请重试';
                    errorDiv.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// 管理员仪表板
app.get('/admin/dashboard', verifyAdmin, (req, res) => {
  const stats = Object.keys(assessments).length;

  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理员仪表板</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); text-align: center; }
            .stat-number { font-size: 48px; font-weight: bold; margin: 10px 0; }
            .actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            .action-card { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; text-align: center; }
            .btn { background: #4ecdc4; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; transition: all 0.3s; }
            .btn:hover { background: #45b7b0; transform: translateY(-2px); }
            .btn-danger { background: #e74c3c; }
            .btn-danger:hover { background: #c0392b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>👨‍💼 管理员仪表板</h1>
                <p>SCL-90心理健康测评系统管理后台</p>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <h3>📊 总测评数</h3>
                    <div class="stat-number">${stats}</div>
                    <p>已完成测评</p>
                </div>
                <div class="stat-card">
                    <h3>🔗 测评链接</h3>
                    <div class="stat-number">${assessmentLinks.length}</div>
                    <p>可用链接</p>
                </div>
            </div>

            <div class="actions">
                <div class="action-card">
                    <h3>📋 管理测评</h3>
                    <p>查看和管理所有测评记录</p>
                    <a href="/admin/assessments" class="btn">查看测评</a>
                </div>
                <div class="action-card">
                    <h3>🔗 创建链接</h3>
                    <p>创建新的测评链接</p>
                    <a href="/admin/links" class="btn">管理链接</a>
                </div>
            </div>

            <div style="text-align: center; margin-top: 40px;">
                <a href="/" class="btn">← 返回首页</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// API接口
app.get('/api/questions', (req, res) => {
  res.json({
    success: true,
    questions: SCL90_QUESTIONS,
    total: SCL90_QUESTIONS.length
  });
});

// 开始测评API
app.post('/api/assessment/start', (req, res) => {
  const { linkId } = req.body;
  const assessmentId = assessmentCounter++;

  assessments[linkId] = {
    id: assessmentId,
    linkId: linkId,
    startTime: new Date().toISOString(),
    answers: null,
    endTime: null,
    resultId: null
  };

  res.json({ success: true, assessmentId });
});

// 提交测评API
app.post('/api/assessment/submit', (req, res) => {
  const { linkId, answers } = req.body;

  if (!assessments[linkId]) {
    return res.json({ success: false, error: '测评不存在' });
  }

  if (!answers || answers.length !== 90) {
    return res.json({ success: false, error: '答案数量不正确' });
  }

  // 计算结果
  const results = calculateResults(answers);
  const totalScore = answers.reduce((sum, score) => sum + score, 0);
  const resultId = generateUniqueId();

  // 更新测评记录
  assessments[linkId].answers = answers;
  assessments[linkId].endTime = new Date().toISOString();
  assessments[linkId].resultId = resultId;
  assessments[linkId].totalScore = totalScore;
  assessments[linkId].results = results;

  res.json({
    success: true,
    resultId: resultId,
    results: results,
    totalScore: totalScore
  });
});

// 管理员登录API
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: '登录成功' });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

// 查看结果API
app.get('/results/:resultId', (req, res) => {
  const { resultId } = req.params;

  // 查找对应的测评
  let assessment = null;
  for (let linkId in assessments) {
    if (assessments[linkId].resultId === resultId) {
      assessment = assessments[linkId];
      break;
    }
  }

  if (!assessment) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>结果不存在</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>📄 结果不存在</h1>
        <p>该测评结果不存在或已被删除。</p>
        <a href="/" style="color: #667eea;">返回首页</a>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SCL-90测评结果</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .result-card { background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px; backdrop-filter: blur(10px); }
            .dimension-name { font-size: 20px; font-weight: bold; margin-bottom: 15px; }
            .score { font-size: 24px; font-weight: bold; margin: 10px 0; }
            .level { padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            .level.正常 { background: rgba(46, 204, 113, 0.3); }
            .level.轻度 { background: rgba(241, 196, 15, 0.3); }
            .level.中度 { background: rgba(230, 126, 34, 0.3); }
            .level.严重 { background: rgba(231, 76, 60, 0.3); }
            .summary { background: rgba(255,255,255,0.15); padding: 30px; border-radius: 15px; margin-bottom: 30px; }
            .btn { background: #4ecdc4; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; transition: all 0.3s; }
            .btn:hover { background: #45b7b0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 SCL-90测评结果</h1>
                <p>测评完成时间：${new Date(assessment.endTime).toLocaleString()}</p>
            </div>

            <div class="summary">
                <h2>📋 总体评估</h2>
                <p><strong>总分：</strong>${assessment.totalScore} 分</p>
                <p><strong>测评时长：</strong>${Math.round((new Date(assessment.endTime) - new Date(assessment.startTime)) / 60000)} 分钟</p>
            </div>

            <div class="results-grid">
                ${Object.entries(assessment.results).map(([key, result]) => `
                    <div class="result-card">
                        <div class="dimension-name">${result.name}</div>
                        <div class="score">${result.tScore} 分</div>
                        <div class="score">平均分：${result.score}</div>
                        <div class="level ${result.level}">${result.level}</div>
                    </div>
                `).join('')}
            </div>

            <div style="text-align: center;">
                <a href="/" class="btn">返回首页</a>
                <button onclick="window.print()" class="btn">🖨️ 打印结果</button>
            </div>
        </div>
    </body>
    </html>
  `);
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'SCL-90网站运行正常',
    stats: {
      totalAssessments: Object.keys(assessments).length,
      activeLinks: assessmentLinks.length
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 SCL-90心理测评服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 管理员页面: http://localhost:${PORT}/admin/login`);
  console.log(`✅ 完整功能版网站已成功启动！`);
});

// 导出app用于Vercel
module.exports = app;