const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// 管理员访问控制配置
const ADMIN_PASSWORD = '1234love';
const ADMIN_TOKEN = 'secure_admin_token_2024';

// MongoDB连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/scl90?retryWrites=true&w=majority';

// 连接到MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB连接成功');
}).catch((error) => {
  console.log('❌ MongoDB连接失败:', error);
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

// 数据模型
const AssessmentLinkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  created_at: { type: Date, default: Date.now },
  expires_at: Date,
  max_uses: { type: Number, default: 1 },
  current_uses: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
});

const AssessmentSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  link_id: { type: String, required: true },
  result_id: { type: String, unique: true },
  start_time: { type: Date, default: Date.now },
  end_time: Date,
  total_score: Number,
  answers: [{
    question_number: Number,
    score: { type: Number, min: 1, max: 5 }
  }]
});

const ResultSchema = new mongoose.Schema({
  assessment_id: { type: Number, required: true },
  dimension: { type: String, required: true },
  dimension_score: Number,
  t_score: Number,
  level: String
});

// 创建模型
const AssessmentLink = mongoose.model('AssessmentLink', AssessmentLinkSchema);
const Assessment = mongoose.model('Assessment', AssessmentSchema);
const Result = mongoose.model('Result', ResultSchema);

// SCL-90题目和维度映射
const SCL90_QUESTIONS = {
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

const SCL90_QUESTION_TEXT = [
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

// 生成简短唯一ID (6位字符)
function generateUniqueId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 初始化示例数据
async function initSampleData() {
  const count = await AssessmentLink.countDocuments();
  if (count === 0) {
    const sampleLink = new AssessmentLink({
      id: 'DEMO01',
      name: '示例测评链接',
      description: '这是一个示例测评链接，可以直接使用'
    });
    await sampleLink.save();
    console.log('✅ 示例数据初始化完成');
  }
}

// 初始化示例数据
initSampleData();

// 首页
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
            .demo-link { background: rgba(46, 204, 113, 0.2); border: 2px solid #2ecc71; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .demo-link a { color: #2ecc71; text-decoration: none; font-weight: bold; }
            .demo-link a:hover { text-decoration: underline; }
            .cloud-status { background: rgba(52, 152, 219, 0.2); border: 2px solid #3498db; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>SCL-90心理健康测评</h1>
            <p>请使用您收到的测评链接进行测试</p>

            <div class="demo-link">
                <strong>🚀 快速体验：</strong><br>
                <a href="/assessment/DEMO01">点击这里开始示例测评</a>
            </div>

            <div class="cloud-status">
                <strong>☁️ 云数据库状态：</strong><br>
                数据持久化存储 | 支持大量用户 | 自动备份
            </div>

            <div class="info">
                <strong>如果您是管理员：</strong><br>
                请访问管理后台登录页面
            </div>
        </div>
    </body>
    </html>
  `);
});

// 管理员登录页面
app.get('/admin', (req, res) => {
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

// 管理员登录API
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    res.cookie('adminToken', ADMIN_TOKEN, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: false
    });

    res.json({ success: true, message: '登录成功' });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

// 管理员验证中间件
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization || req.headers['x-admin-token'] || req.cookies.adminToken;

  if (token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: '未授权访问' });
  }
}

// 管理员仪表板
app.get('/admin/dashboard', verifyAdmin, async (req, res) => {
  try {
    const stats = {
      totalLinks: await AssessmentLink.countDocuments(),
      totalAssessments: await Assessment.countDocuments(),
      completedAssessments: await Assessment.countDocuments({ end_time: { $exists: true } })
    };

    res.send(createAdminDashboard(stats));
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 创建测评链接
app.post('/api/admin/links', verifyAdmin, async (req, res) => {
  try {
    const { name, description, maxUses = 1 } = req.body;
    const linkId = generateUniqueId();

    const newLink = new AssessmentLink({
      id: linkId,
      name: name,
      description: description,
      max_uses: maxUses
    });

    await newLink.save();

    res.json({
      linkId: linkId,
      name: name,
      description: description,
      maxUses: maxUses,
      url: `${req.protocol}://${req.get('host')}/assessment/${linkId}`
    });
  } catch (error) {
    res.status(500).json({ error: '创建链接失败' });
  }
});

// 获取所有测评链接
app.get('/api/admin/links', verifyAdmin, async (req, res) => {
  try {
    const links = await AssessmentLink.find().sort({ created_at: -1 });
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: '获取链接失败' });
  }
});

// 验证链接
async function validateLink(linkId) {
  const link = await AssessmentLink.findOne({ id: linkId, is_active: true });

  if (!link) {
    return null;
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return null;
  }

  return link;
}

// 测评页面
app.get('/assessment/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;

    // 检查是否有已完成的结果
    const completedAssessment = await Assessment.findOne({
      link_id: linkId,
      end_time: { $exists: true },
      result_id: { $exists: true }
    });

    if (completedAssessment && completedAssessment.result_id) {
      return res.redirect(`/results/${completedAssessment.result_id}`);
    }

    // 检查链接是否有效
    const link = await validateLink(linkId);
    if (!link) {
      return res.status(404).send(createErrorPage('链接无效或已过期'));
    }

    res.send(createAssessmentPage(linkId));
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 开始测评
app.post('/api/assessment/start', async (req, res) => {
  try {
    const { linkId } = req.body;

    const link = await validateLink(linkId);
    if (!link) {
      return res.status(400).json({ error: '链接无效或已过期' });
    }

    // 获取下一个ID
    const lastAssessment = await Assessment.findOne().sort({ id: -1 });
    const assessmentId = lastAssessment ? lastAssessment.id + 1 : 1;

    const newAssessment = new Assessment({
      id: assessmentId,
      link_id: linkId
    });

    await newAssessment.save();
    res.json({ assessmentId });
  } catch (error) {
    res.status(500).json({ error: '开始测评失败' });
  }
});

// 提交测评
app.post('/api/assessment/submit', async (req, res) => {
  try {
    const { assessmentId, answers } = req.body;

    if (!assessmentId || !answers || answers.length !== 90) {
      return res.status(400).json({ error: '无效的提交数据' });
    }

    const assessment = await Assessment.findOne({ id: assessmentId });
    if (!assessment) {
      return res.status(403).json({ error: '无效的测评ID' });
    }

    // 保存答案
    assessment.answers = answers.map((score, index) => ({
      question_number: index + 1,
      score: score
    }));

    // 计算结果
    const results = calculateResults(answers);
    const totalScore = answers.reduce((sum, score) => sum + score, 0);
    const resultId = generateUniqueId();

    // 保存结果
    for (const [dimension, data] of Object.entries(results)) {
      const newResult = new Result({
        assessment_id: assessmentId,
        dimension: dimension,
        dimension_score: data.score,
        t_score: data.tScore,
        level: data.level
      });
      await newResult.save();
    }

    // 更新测评状态
    assessment.end_time = new Date();
    assessment.total_score = totalScore;
    assessment.result_id = resultId;
    await assessment.save();

    res.json({ results, totalScore, resultId });
  } catch (error) {
    res.status(500).json({ error: '提交失败' });
  }
});

// 获取题目
app.get('/api/questions', (req, res) => {
  res.json({
    questions: SCL90_QUESTION_TEXT,
    total: SCL90_QUESTION_TEXT.length
  });
});

// 查看结果
app.get('/api/results/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;

    const assessment = await Assessment.findOne({ result_id: resultId, end_time: { $exists: true } });
    if (!assessment) {
      return res.status(404).json({ error: '结果不存在' });
    }

    const assessmentResults = await Result.find({ assessment_id: assessment.id });

    const formattedResults = {};
    assessmentResults.forEach(result => {
      formattedResults[result.dimension] = {
        name: getDimensionName(result.dimension),
        tScore: result.t_score,
        level: result.level,
        score: result.dimension_score
      };
    });

    res.json({
      assessment,
      results: formattedResults,
      totalScore: assessment.total_score
    });
  } catch (error) {
    res.status(500).json({ error: '获取结果失败' });
  }
});

// 结果页面
app.get('/results/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;

    const assessment = await Assessment.findOne({ result_id: resultId, end_time: { $exists: true } });
    if (!assessment) {
      return res.status(404).send(createErrorPage('结果不存在'));
    }

    const assessmentResults = await Result.find({ assessment_id: assessment.id });

    const formattedResults = {};
    assessmentResults.forEach(result => {
      formattedResults[result.dimension] = {
        name: getDimensionName(result.dimension),
        tScore: result.t_score,
        level: result.level,
        score: result.dimension_score
      };
    });

    const data = {
      assessment,
      results: formattedResults,
      totalScore: assessment.total_score
    };

    res.send(createResultsPage(data));
  } catch (error) {
    res.status(500).send(createErrorPage('获取结果失败'));
  }
});

// 维度名称
function getDimensionName(dimension) {
  const names = {
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
  return names[dimension] || dimension;
}

// 计算结果
function calculateResults(answers) {
  const dimensions = {
    somatization: { name: '躯体化', questions: SCL90_QUESTIONS.somatization },
    obsessive_compulsive: { name: '强迫症状', questions: SCL90_QUESTIONS.obsessive_compulsive },
    interpersonal_sensitivity: { name: '人际关系敏感', questions: SCL90_QUESTIONS.interpersonal_sensitivity },
    depression: { name: '抑郁', questions: SCL90_QUESTIONS.depression },
    anxiety: { name: '焦虑', questions: SCL90_QUESTIONS.anxiety },
    hostility: { name: '敌对', questions: SCL90_QUESTIONS.hostility },
    phobic_anxiety: { name: '恐怖', questions: SCL90_QUESTIONS.phobic_anxiety },
    paranoid_ideation: { name: '偏执', questions: SCL90_QUESTIONS.paranoid_ideation },
    psychoticism: { name: '精神病性', questions: SCL90_QUESTIONS.psychoticism },
    additional: { name: '其他', questions: SCL90_QUESTIONS.additional }
  };

  const results = {};

  Object.entries(dimensions).forEach(([key, dimension]) => {
    const scores = dimension.questions.map(q => answers[q - 1]);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const tScore = 50 + (averageScore - 2.5) * 10;

    let level = '正常';
    if (tScore >= 70) level = '严重';
    else if (tScore >= 60) level = '中度';
    else if (tScore >= 40) level = '轻度';

    results[key] = {
      name: dimension.name,
      score: parseFloat(averageScore.toFixed(2)),
      tScore: parseFloat(tScore.toFixed(2)),
      level
    };
  });

  return results;
}

// 创建页面HTML的辅助函数
function createErrorPage(message) {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>错误</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; }
            .btn { background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>❌ ${message}</h1>
            <p>请联系管理员获取新的测试链接。</p>
            <a href="/" class="btn">返回首页</a>
        </div>
    </body>
    </html>
  `;
}

function createAssessmentPage(linkId) {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SCL-90心理健康测评</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #333; }
            .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; color: white; margin-bottom: 30px; }
            .progress-container { background: rgba(255,255,255,0.2); border-radius: 10px; padding: 5px; margin-bottom: 30px; }
            .progress-bar { background: #4ecdc4; height: 20px; border-radius: 5px; transition: width 0.3s; }
            .question-card { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 20px; }
            .question-number { color: #667eea; font-weight: bold; margin-bottom: 10px; }
            .question-text { font-size: 18px; line-height: 1.6; margin-bottom: 25px; }
            .options { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
            .option { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 10px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.3s; }
            .option:hover { background: #e9ecef; transform: translateY(-2px); }
            .option.selected { background: #667eea; color: white; border-color: #5a6fd8; }
            .navigation { text-align: center; margin-top: 30px; }
            .btn { background: #667eea; color: white; padding: 12px 30px; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; margin: 0 10px; transition: all 0.3s; }
            .btn:hover { background: #5a6fd8; transform: translateY(-2px); }
            .btn:disabled { background: #95a5a6; cursor: not-allowed; transform: none; }
            .btn-success { background: #27ae60; }
            .btn-success:hover { background: #229954; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>SCL-90心理健康测评</h1>
                <p>请根据最近一周的实际感受，选择最符合您情况的选项</p>
            </div>

            <div class="progress-container">
                <div class="progress-bar" id="progressBar" style="width: 0%"></div>
            </div>

            <div class="question-card">
                <div class="question-number" id="questionNumber">第 1 题 / 共 90 题</div>
                <div class="question-text" id="questionText">加载中...</div>
                <div class="options" id="optionsContainer"></div>
                <div class="navigation">
                    <button class="btn" id="prevBtn" onclick="previousQuestion()" disabled>上一题</button>
                    <button class="btn" id="nextBtn" onclick="nextQuestion()" disabled>下一题</button>
                    <button class="btn btn-success" id="submitBtn" onclick="submitAssessment()" style="display: none;">提交测评</button>
                </div>
            </div>
        </div>

        <script>
            const questions = ${JSON.stringify(SCL90_QUESTION_TEXT)};
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

            async function submitAssessment() {
                if (answers.includes(null)) {
                    alert('请回答所有问题后再提交');
                    return;
                }

                try {
                    const response = await fetch('/api/assessment/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ linkId: '${linkId}' })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        const submitResponse = await fetch('/api/assessment/submit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                assessmentId: data.assessmentId,
                                answers: answers
                            })
                        });

                        const submitData = await submitResponse.json();
                        if (submitResponse.ok) {
                            window.location.href = '/results/' + submitData.resultId;
                        } else {
                            alert('提交失败：' + submitData.error);
                        }
                    } else {
                        alert('开始测评失败：' + data.error);
                    }
                } catch (error) {
                    alert('网络错误，请重试');
                }
            }

            // 初始化
            loadQuestion();
        </script>
    </body>
    </html>
  `;
}

function createAdminDashboard(stats) {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SCL-90管理员后台</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .header { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 20px; text-align: center; color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
            .stat-number { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
            .card { background: rgba(255,255,255,0.95); border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 20px; }
            .btn { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; transition: background 0.3s; }
            .btn:hover { background: #5a6fd8; }
            .btn-success { background: #27ae60; }
            .btn-success:hover { background: #229954; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .form-group input, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>SCL-90管理员后台</h1>
            <p>心理健康测评系统管理控制台 | ☁️ 云数据库版本</p>
        </div>

        <div class="container">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${stats.totalLinks}</div>
                    <div>测评链接</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.totalAssessments}</div>
                    <div>总测评数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.completedAssessments}</div>
                    <div>已完成</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">512MB</div>
                    <div>云存储</div>
                </div>
            </div>

            <div class="card">
                <h3>创建测评链接</h3>
                <form id="linkForm">
                    <div class="form-group">
                        <label>链接名称：</label>
                        <input type="text" id="linkName" required>
                    </div>
                    <div class="form-group">
                        <label>描述：</label>
                        <textarea id="linkDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>最大使用次数：</label>
                        <input type="number" id="maxUses" value="1" min="1">
                    </div>
                    <button type="submit" class="btn btn-success">创建链接</button>
                </form>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="/" class="btn">返回首页</a>
            </div>
        </div>

        <script>
            document.getElementById('linkForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const name = document.getElementById('linkName').value;
                const description = document.getElementById('linkDescription').value;
                const maxUses = parseInt(document.getElementById('maxUses').value);

                try {
                    const response = await fetch('/api/admin/links', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, description, maxUses })
                    });

                    const data = await response.json();
                    if (response.ok) {
                        alert('链接创建成功！链接ID：' + data.linkId);
                        document.getElementById('linkForm').reset();
                    } else {
                        alert('创建失败：' + data.error);
                    }
                } catch (error) {
                    alert('网络错误');
                }
            });
        </script>
    </body>
    </html>
  `;
}

function createResultsPage(data) {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SCL-90测评结果</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #333; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; color: white; margin-bottom: 40px; }
            .summary { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 30px; }
            .results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .result-card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .dimension-name { font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; }
            .score-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .score { font-size: 24px; font-weight: bold; }
            .level { padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; }
            .level.正常 { background: #27ae60; }
            .level.轻度 { background: #f39c12; }
            .level.中度 { background: #e67e22; }
            .level.严重 { background: #e74c3c; }
            .description { color: #7f8c8d; line-height: 1.6; margin-bottom: 15px; }
            .cloud-info { background: rgba(52, 152, 219, 0.1); border: 2px solid #3498db; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .actions { text-align: center; }
            .btn { background: #667eea; color: white; padding: 12px 30px; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; margin: 0 10px; text-decoration: none; display: inline-block; transition: all 0.3s; }
            .btn:hover { background: #5a6fd8; transform: translateY(-2px); }
            @media print {
              body { background: white; }
              .btn { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>SCL-90心理健康测评结果</h1>
                <p>测评完成时间：${new Date(data.assessment.end_time).toLocaleString()}</p>
            </div>

            <div class="summary">
                <h2>📊 总体评估</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div>
                        <h3>总分</h3>
                        <p style="font-size: 28px; font-weight: bold; color: #667eea;">${data.totalScore} 分</p>
                    </div>
                    <div>
                        <h3>测评时长</h3>
                        <p style="font-size: 20px;">${Math.round((new Date(data.assessment.end_time) - new Date(data.assessment.start_time)) / 60000)} 分钟</p>
                    </div>
                </div>
                <div class="cloud-info">
                    <strong>☁️ 数据已安全存储在云数据库</strong>
                </div>
            </div>

            <div class="results-grid">
                ${Object.entries(data.results).map(([key, result]) => `
                    <div class="result-card">
                        <div class="dimension-name">${result.name}</div>
                        <div class="score-info">
                            <div class="score">T分数：${result.tScore}</div>
                            <div class="level ${result.level}">${result.level}</div>
                        </div>
                        <div class="score-info">
                            <div>平均分：${result.score}</div>
                        </div>
                        <div class="description">
                            该维度反映了您在${result.name}方面的心理健康状况。
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="actions">
                <a href="/" class="btn">返回首页</a>
                <button onclick="window.print()" class="btn">打印结果</button>
            </div>
        </div>
    </body>
    </html>
  `;
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 SCL-90心理测评服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 管理员页面: http://localhost:${PORT}/admin`);
  console.log(`☁️ 云数据库版本已启动！`);
});

// 导出app用于Vercel
module.exports = app;