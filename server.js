const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 管理员访问控制配置
const ADMIN_PASSWORD = '1234love';
const ADMIN_TOKEN = 'secure_admin_token_2024';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

// 内存数据库（替代SQLite）
let assessmentLinks = [];
let assessments = [];
let answers = [];
let results = [];
let linkCounter = 1;
let assessmentCounter = 1;
let answerCounter = 1;
let resultCounter = 1;

// 初始化一些示例数据
function initSampleData() {
  // 创建示例链接
  if (assessmentLinks.length === 0) {
    const sampleLink = {
      id: 'DEMO01',
      name: '示例测评链接',
      description: '这是一个示例测评链接，可以直接使用',
      created_at: new Date().toISOString(),
      expires_at: null,
      max_uses: 100,
      current_uses: 0,
      is_active: 1
    };
    assessmentLinks.push(sampleLink);
  }
}

initSampleData();

// SCL-90题目和维度映射
const SCL90_QUESTIONS = {
  // 躯体化 (1-12题)
  somatization: [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58],
  // 强迫症状 (13-22题)
  obsessive_compulsive: [3, 9, 10, 28, 38, 45, 46, 51, 55, 65],
  // 人际关系敏感 (23-31题)
  interpersonal_sensitivity: [6, 21, 34, 36, 37, 41, 61, 69, 73],
  // 抑郁 (32-44题)
  depression: [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79],
  // 焦虑 (45-54题)
  anxiety: [2, 17, 23, 33, 39, 57, 72, 78, 80, 86],
  // 敌对 (55-60题)
  hostility: [11, 24, 63, 67, 74, 81],
  // 恐怖 (61-67题)
  phobic_anxiety: [13, 25, 47, 50, 70, 75, 82],
  // 偏执 (68-73题)
  paranoid_ideation: [8, 18, 43, 68, 76, 83],
  // 精神病性 (74-83题)
  psychoticism: [7, 16, 35, 62, 77, 84, 85, 87, 88, 90],
  // 其他 (84-90题)
  additional: [19, 44, 59, 60, 64, 66, 89]
};

// SCL-90题目内容
const SCL90_QUESTION_TEXT = [
  "头痛",
  "神经过敏，心中不踏实",
  "头脑中有不必要的想法或字句盘旋",
  "头晕和昏倒",
  "对异性的兴趣减退",
  "对旁人责备求全",
  "感到别人能控制您的思想",
  "责怪别人制造麻烦",
  "忘记性大",
  "担心自己的衣饰整齐及仪态的端正",
  "容易烦恼和激动",
  "胸痛",
  "害怕空旷的场所或街道",
  "感到自己的精力下降，活动减慢",
  "想结束自己的生命",
  "听到旁人听不到的声音",
  "发抖",
  "感到大多数人都不可信任",
  "胃口不好",
  "容易哭泣",
  "同异性相处时感到害羞不自在",
  "感到受骗，中了圈套或有人想抓住您",
  "无缘无故地突然感到害怕",
  "自己不能控制地大发脾气",
  "怕单独出门",
  "经常责怪自己",
  "腰痛",
  "感到难以完成任务",
  "感到孤独",
  "感到苦闷",
  "过分担忧",
  "对事物不感兴趣",
  "感到害怕",
  "您的感情容易受到伤害",
  "旁人能知道您的私下想法",
  "感到别人不理解您，不同情您",
  "感到人们对你不友好，不喜欢您",
  "做事必须做得很慢以保证做得正确",
  "心跳得很厉害",
  "恶心或胃部不舒服",
  "感到比不上他人",
  "肌肉酸痛",
  "感到有人在监视您或谈论您",
  "难以入睡",
  "做事必须反复检查",
  "难以作出决定",
  "怕乘电车、公共汽车、地铁或火车",
  "呼吸有困难",
  "一阵阵发冷或发热",
  "因为感到害怕而避开某些东西、场合或活动",
  "脑子变空了",
  "身体发麻或刺痛",
  "喉咙有梗塞感",
  "感到前途没有希望",
  "不能集中注意",
  "感到身体的某一部分软弱无力",
  "感到紧张或容易紧张",
  "感到手或脚发重",
  "想到死亡的事",
  "吃得太多",
  "当别人看着您或谈论您时感到不自在",
  "有一些不属于您自己的想法",
  "有想打人或伤害他人的冲动",
  "醒得太早",
  "必须反复洗手、点数目或触摸某些东西",
  "睡得不稳不深",
  "有想摔坏或破坏东西的冲动",
  "有一些别人没有的想法或念头",
  "感到对别人神经过敏",
  "在商店或电影院等人多的地方感到不自在",
  "感到任何事情都很困难",
  "一阵阵恐惧或惊恐",
  "感到公共场合吃东西很不舒服",
  "经常与人争论",
  "单独一人时神经很紧张",
  "别人对您的成绩没有作出恰当的评价",
  "即使和别人在一起也感到孤单",
  "感到坐立不安心神不定",
  "感到自己没有什么价值",
  "感到熟悉的东西变成陌生或不像是真的",
  "大叫或摔东西",
  "害怕会在公共场合昏倒",
  "感到别人想占您的便宜",
  "为一些有关性方面的想法而很苦恼",
  "您认为应该因为自己的过错而受到惩罚",
  "感到要赶快把事情做完",
  "感到自己的身体有严重问题",
  "从未感到和其他人很亲近",
  "感到自己有罪",
  "感到自己的脑子有毛病"
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

// 首页重定向到错误页面（防止直接访问）
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
                        // 登录成功，跳转到管理后台
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
    // 设置Cookie
    res.cookie('adminToken', ADMIN_TOKEN, {
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      httpOnly: false,
      secure: false
    });

    res.json({
      success: true,
      message: '登录成功'
    });
  } else {
    res.status(401).json({
      success: false,
      error: '密码错误'
    });
  }
});

// 管理员验证API
app.get('/api/admin/verify', verifyAdmin, (req, res) => {
  res.json({ success: true, message: '令牌有效' });
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

// 管理员仪表板页面（内嵌HTML，避免文件依赖）
app.get('/admin/dashboard', verifyAdmin, (req, res) => {
  res.send(`
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
            .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: rgba(255,255,255,0.95); border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
            .stat-number { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
            .btn { background: #667eea; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; transition: background 0.3s; }
            .btn:hover { background: #5a6fd8; }
            .btn-danger { background: #e74c3c; }
            .btn-danger:hover { background: #c0392b; }
            .btn-success { background: #27ae60; }
            .btn-success:hover { background: #229954; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f8f9fa; font-weight: bold; }
            tr:hover { background: #f8f9fa; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .form-group input, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>SCL-90管理员后台</h1>
            <p>心理健康测评系统管理控制台</p>
        </div>

        <div class="container">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${assessments.filter(a => a.end_time).length}</div>
                    <div>已完成测评</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${assessmentLinks.length}</div>
                    <div>测评链接</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${assessments.filter(a => !a.end_time).length}</div>
                    <div>进行中测评</div>
                </div>
            </div>

            <div class="dashboard">
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

                <div class="card">
                    <h3>测评链接列表</h3>
                    <div id="linksList">
                        <table>
                            <thead>
                                <tr>
                                    <th>链接ID</th>
                                    <th>名称</th>
                                    <th>使用次数</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="linksTableBody">
                                <!-- 链接列表将在这里动态加载 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>最近测评记录</h3>
                <table>
                    <thead>
                        <tr>
                            <th>测评ID</th>
                            <th>链接</th>
                            <th>开始时间</th>
                            <th>完成时间</th>
                            <th>总分</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody id="assessmentsTableBody">
                        <!-- 测评记录将在这里动态加载 -->
                    </tbody>
                </table>
            </div>
        </div>

        <script>
            // 加载链接列表
            async function loadLinks() {
                try {
                    const response = await fetch('/api/admin/links');
                    const links = await response.json();

                    const tbody = document.getElementById('linksTableBody');
                    tbody.innerHTML = links.map(link => \`
                        <tr>
                            <td><code>\${link.id}</code></td>
                            <td>\${link.name}</td>
                            <td>\${link.current_uses}/\${link.max_uses}</td>
                            <td>
                                <button onclick="copyLink('\${link.id}')" class="btn">复制链接</button>
                                <button onclick="deleteLink('\${link.id}')" class="btn btn-danger">删除</button>
                            </td>
                        </tr>
                    \`).join('');
                } catch (error) {
                    console.error('加载链接失败:', error);
                }
            }

            // 加载测评记录
            async function loadAssessments() {
                try {
                    const response = await fetch('/api/admin/assessments');
                    const assessments = await response.json();

                    const tbody = document.getElementById('assessmentsTableBody');
                    tbody.innerHTML = assessments.slice(0, 10).map(assessment => \`
                        <tr>
                            <td>\${assessment.id}</td>
                            <td>\${assessment.link_name || 'N/A'}</td>
                            <td>\${new Date(assessment.start_time).toLocaleString()}</td>
                            <td>\${assessment.end_time ? new Date(assessment.end_time).toLocaleString() : '进行中'}</td>
                            <td>\${assessment.total_score || 'N/A'}</td>
                            <td>
                                <button onclick="deleteAssessment('\${assessment.id}')" class="btn btn-danger">删除</button>
                            </td>
                        </tr>
                    \`).join('');
                } catch (error) {
                    console.error('加载测评记录失败:', error);
                }
            }

            // 创建链接
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
                        loadLinks();
                    } else {
                        alert('创建失败：' + data.error);
                    }
                } catch (error) {
                    alert('网络错误');
                }
            });

            // 复制链接
            function copyLink(linkId) {
                const url = window.location.origin + '/assessment/' + linkId;
                navigator.clipboard.writeText(url);
                alert('链接已复制到剪贴板：' + url);
            }

            // 删除链接
            async function deleteLink(linkId) {
                if (confirm('确定要删除这个链接吗？')) {
                    try {
                        const response = await fetch('/api/admin/links/' + linkId, {
                            method: 'DELETE'
                        });
                        if (response.ok) {
                            alert('删除成功');
                            loadLinks();
                        } else {
                            alert('删除失败');
                        }
                    } catch (error) {
                        alert('网络错误');
                    }
                }
            }

            // 删除测评
            async function deleteAssessment(id) {
                if (confirm('确定要删除这个测评记录吗？')) {
                    try {
                        const response = await fetch('/api/admin/assessments/' + id, {
                            method: 'DELETE'
                        });
                        if (response.ok) {
                            alert('删除成功');
                            loadAssessments();
                        } else {
                            alert('删除失败');
                        }
                    } catch (error) {
                        alert('网络错误');
                    }
                }
            }

            // 页面加载时初始化
            loadLinks();
            loadAssessments();
        </script>
    </body>
    </html>
  `);
});

// 创建测评链接（需要管理员验证）
app.post('/api/admin/links', verifyAdmin, (req, res) => {
  const { name, description, maxUses = 1 } = req.body;

  const linkId = generateUniqueId();
  const newLink = {
    id: linkId,
    name: name,
    description: description,
    created_at: new Date().toISOString(),
    expires_at: null,
    max_uses: maxUses,
    current_uses: 0,
    is_active: 1
  };

  assessmentLinks.push(newLink);

  res.json({
    linkId: linkId,
    name: name,
    description: description,
    maxUses: maxUses,
    url: `${req.protocol}://${req.get('host')}/assessment/${linkId}`
  });
});

// 获取所有测评链接（需要管理员验证）
app.get('/api/admin/links', verifyAdmin, (req, res) => {
  res.json(assessmentLinks);
});

// 删除测评链接（需要管理员验证）
app.delete('/api/admin/links/:linkId', verifyAdmin, (req, res) => {
  const { linkId } = req.params;

  const index = assessmentLinks.findIndex(link => link.id === linkId);
  if (index !== -1) {
    assessmentLinks.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '链接不存在' });
  }
});

// 获取所有测评结果（需要管理员验证）
app.get('/api/admin/assessments', verifyAdmin, (req, res) => {
  const assessmentData = assessments.map(assessment => {
    const link = assessmentLinks.find(l => l.id === assessment.link_id);
    return {
      id: assessment.id,
      link_id: assessment.link_id,
      link_name: link ? link.name : null,
      start_time: assessment.start_time,
      end_time: assessment.end_time,
      total_score: assessment.total_score
    };
  });

  res.json(assessmentData);
});

// 删除测评记录（需要管理员验证）
app.delete('/api/admin/assessments/:id', verifyAdmin, (req, res) => {
  const { id } = parseInt(req.params);

  const index = assessments.findIndex(a => a.id === id);
  if (index !== -1) {
    // 删除相关的答案和结果
    const assessmentId = assessments[index].id;
    answers = answers.filter(a => a.assessment_id !== assessmentId);
    results = results.filter(r => r.assessment_id !== assessmentId);

    assessments.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '测评不存在' });
  }
});

// 验证链接是否有效
function validateLink(linkId) {
  const link = assessmentLinks.find(l => l.id === linkId && l.is_active === 1);

  if (!link) {
    return null;
  }

  // 检查是否过期
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return null;
  }

  return link;
}

// 统一链接页面 - 支持测试和结果查看
app.get('/assessment/:linkId', (req, res) => {
  const { linkId } = req.params;

  // 首先检查是否有已完成的结果
  const completedAssessment = assessments.find(a =>
    a.link_id === linkId && a.end_time && a.result_id
  );

  // 如果有已完成的结果，显示结果页面
  if (completedAssessment && completedAssessment.result_id) {
    return res.redirect(`/results/${completedAssessment.result_id}`);
  }

  // 检查链接是否有效且可以开始测试
  const link = validateLink(linkId);
  if (!link) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>链接无效</title>
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
              <h1>链接无效或已过期</h1>
              <p>此链接已过期、已用完或不存在。请联系管理员获取新的测试链接。</p>
              <a href="/" class="btn">返回首页</a>
          </div>
      </body>
      </html>
    `);
  }

  // 如果链接有效且未完成测试，提供测评页面
  res.send(createAssessmentPage());
});

// 创建测评页面HTML
function createAssessmentPage() {
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
                        body: JSON.stringify({ linkId: '${req.params.linkId}' })
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

// 获取SCL-90题目
app.get('/api/questions', (req, res) => {
  res.json({
    questions: SCL90_QUESTION_TEXT,
    total: SCL90_QUESTION_TEXT.length
  });
});

// 开始测评
app.post('/api/assessment/start', (req, res) => {
  const { linkId } = req.body;

  if (!linkId) {
    return res.status(400).json({ error: '缺少链接ID' });
  }

  const link = validateLink(linkId);
  if (!link) {
    return res.status(400).json({ error: '链接无效或已过期' });
  }

  // 创建测评记录
  const assessment = {
    id: assessmentCounter++,
    link_id: linkId,
    result_id: null,
    start_time: new Date().toISOString(),
    end_time: null,
    total_score: null
  };

  assessments.push(assessment);
  res.json({ assessmentId: assessment.id });
});

// 维度详细分析数据
const DIMENSION_ANALYSES = {
  somatization: {
    description: '躯体化维度反映个体身体不适感的程度，包括头痛、背痛、肌肉酸痛等身体症状。',
    symptoms: ['头痛', '头晕', '胸痛', '腰痛', '肌肉酸痛', '身体乏力'],
    causes: ['长期压力', '焦虑情绪', '睡眠问题', '缺乏运动', '不良姿势'],
    suggestions: {
      normal: '您的身体状况良好，继续保持健康的生活方式。',
      mild: '建议注意劳逸结合，适当进行体育锻炼，保证充足睡眠。',
      moderate: '建议进行全面身体检查，同时注意心理健康，必要时咨询医生。',
      severe: '强烈建议立即就医进行全面身体检查，排除器质性疾病，并寻求专业心理帮助。'
    },
    recommendations: ['规律作息', '适度运动', '放松训练', '保持良好姿势']
  },
  obsessive_compulsive: {
    description: '强迫症状维度反映个体强迫思维和强迫行为的程度，包括重复检查、清洗、计数等。',
    symptoms: ['反复检查', '强迫清洗', '重复计数', '强迫性思维', '完美主义倾向'],
    causes: ['遗传因素', '大脑神经递质失衡', '心理压力', '童年经历', '完美主义人格'],
    suggestions: {
      normal: '您的思维和行为模式正常，无明显的强迫症状。',
      mild: '建议学习放松技巧，适当减少对完美的追求，接受不完美。',
      moderate: '建议寻求专业心理咨询，学习认知行为疗法，逐步改变强迫模式。',
      severe: '强烈建议寻求精神科医生的专业治疗，可能需要药物结合心理治疗。'
    },
    recommendations: ['暴露疗法', '认知重建', '正念冥想', '药物治疗']
  },
  interpersonal_sensitivity: {
    description: '人际关系敏感维度反映个体在人际交往中的不适感和自卑感。',
    symptoms: ['社交恐惧', '自卑感', '过度在意他人评价', '回避社交', '敏感多疑'],
    causes: ['童年创伤', '负面评价经历', '低自尊', '社交技能缺乏', '完美主义'],
    suggestions: {
      normal: '您的人际交往能力良好，能够自然地与他人相处。',
      mild: '建议增加社交练习，提升自信心，学习有效的沟通技巧。',
      moderate: '建议寻求心理咨询，探索人际关系困难的深层原因，建立健康的交往模式。',
      severe: '强烈建议寻求专业心理治疗，可能需要系统的人际关系训练。'
    },
    recommendations: ['社交技能训练', '自信心建设', '认知疗法', '团体治疗']
  },
  depression: {
    description: '抑郁维度反映个体情绪低落、兴趣减退、精力不足等抑郁症状的程度。',
    symptoms: ['情绪低落', '兴趣丧失', '精力减退', '睡眠障碍', '食欲改变', '自我否定'],
    causes: ['遗传因素', '神经生化失衡', '心理创伤', '慢性压力', '缺乏社会支持'],
    suggestions: {
      normal: '您的情绪状态良好，生活积极乐观。',
      mild: '建议增加户外活动，保持规律作息，培养兴趣爱好，寻求亲友支持。',
      moderate: '建议寻求专业心理咨询，可能需要心理治疗结合生活方式调整。',
      severe: '强烈建议立即寻求精神科医生帮助，可能需要药物治疗结合心理治疗。'
    },
    recommendations: ['运动疗法', '认知行为疗法', '人际治疗', '药物治疗']
  },
  anxiety: {
    description: '焦虑维度反映个体紧张不安、担忧恐惧的程度。',
    symptoms: ['过度担忧', '紧张不安', '心慌气短', '出汗发抖', '睡眠困难'],
    causes: ['遗传倾向', '大脑神经递质失衡', '慢性压力', '创伤经历', '完美主义'],
    suggestions: {
      normal: '您的焦虑水平正常，能够较好地应对日常生活压力。',
      mild: '建议学习放松技巧，如深呼吸、冥想，保持规律运动。',
      moderate: '建议寻求专业心理咨询，学习焦虑管理技巧，必要时考虑药物治疗。',
      severe: '强烈建议寻求精神科医生治疗，可能需要药物结合心理治疗。'
    },
    recommendations: ['放松训练', '正念疗法', '暴露疗法', '药物治疗']
  },
  hostility: {
    description: '敌对维度反映个体的愤怒情绪和敌对行为的程度。',
    symptoms: ['易怒', '争吵', '攻击行为', '怨恨情绪', '不信任他人'],
    causes: ['童年创伤', '挫折经历', '压力过大', '沟通技巧缺乏', '情绪调节困难'],
    suggestions: {
      normal: '您能够很好地控制情绪，与他人和谐相处。',
      mild: '建议学习情绪管理技巧，练习非暴力沟通方式。',
      moderate: '建议寻求心理咨询，探索愤怒背后的原因，学习健康的情绪表达方式。',
      severe: '强烈建议寻求专业心理治疗，可能需要愤怒管理专项训练。'
    },
    recommendations: ['情绪管理', '沟通技巧训练', '认知疗法', '放松训练']
  },
  phobic_anxiety: {
    description: '恐怖维度反映个体对特定事物或情境的恐惧程度。',
    symptoms: ['特定恐惧', '回避行为', '恐慌发作', '过度焦虑', '生理反应'],
    causes: ['创伤经历', '习得性行为', '遗传因素', '认知偏差', '过度保护'],
    suggestions: {
      normal: '您对大多数情境都能正常适应，无明显的恐惧症状。',
      mild: '建议逐步面对恐惧对象，学习放松技巧，建立自信。',
      moderate: '建议寻求专业心理咨询，进行系统脱敏治疗，改变恐惧认知。',
      severe: '强烈建议寻求专业心理治疗，可能需要系统暴露疗法结合药物治疗。'
    },
    recommendations: ['暴露疗法', '系统脱敏', '认知重建', '放松训练']
  },
  paranoid_ideation: {
    description: '偏执维度反映个体的多疑、不信任和被害妄想的程度。',
    symptoms: ['多疑', '不信任他人', '被害感', '嫉妒心强', '固执己见'],
    causes: ['童年创伤', '负面经历', '低自尊', '认知偏差', '社会隔离'],
    suggestions: {
      normal: '您对他人有适当的信任，人际关系健康。',
      mild: '建议学习信任他人，培养开放的心态，改善沟通方式。',
      moderate: '建议寻求心理咨询，探索多疑心理的根源，重建信任模式。',
      severe: '强烈建议寻求专业心理治疗，可能需要长期的认知行为治疗。'
    },
    recommendations: ['认知疗法', '信任训练', '团体治疗', '社交技能训练']
  },
  psychoticism: {
    description: '精神病性维度反映个体的思维异常、感知异常等症状。',
    symptoms: ['思维异常', '感知异常', '情感淡漠', '行为怪异', '社会功能受损'],
    causes: ['遗传因素', '大脑结构异常', '神经递质失衡', '应激事件', '物质滥用'],
    suggestions: {
      normal: '您的思维和感知正常，无精神病性症状。',
      mild: '建议关注心理健康，保持良好作息，避免过度压力。',
      moderate: '建议寻求专业心理评估，排除潜在的心理问题。',
      severe: '强烈建议立即寻求精神科医生的专业诊断和治疗。'
    },
    recommendations: ['专业评估', '药物治疗', '心理治疗', '社会支持']
  },
  additional: {
    description: '其他维度反映个体的睡眠、食欲等日常功能的状况。',
    symptoms: ['睡眠问题', '食欲改变', '疲劳感', '注意力不集中', '日常功能受损'],
    causes: ['压力过大', '情绪问题', '生活习惯', '身体健康问题', '环境因素'],
    suggestions: {
      normal: '您的日常功能良好，生活作息规律。',
      mild: '建议调整生活习惯，保证充足睡眠，均衡饮食。',
      moderate: '建议全面评估生活方式，必要时寻求健康咨询。',
      severe: '建议进行全面的身体和心理检查，排除潜在的健康问题。'
    },
    recommendations: ['作息调整', '饮食管理', '运动锻炼', '压力管理']
  }
};

// 计算测评结果
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

    // 计算T分数 (简化版本)
    const tScore = 50 + (averageScore - 2.5) * 10;

    // 判断严重程度
    let level = '正常';
    if (tScore >= 70) level = '严重';
    else if (tScore >= 60) level = '中度';
    else if (tScore >= 40) level = '轻度';

    // 获取详细分析
    const analysis = DIMENSION_ANALYSES[key];

    results[key] = {
      name: dimension.name,
      score: parseFloat(averageScore.toFixed(2)),
      tScore: parseFloat(tScore.toFixed(2)),
      level,
      description: analysis.description,
      symptoms: analysis.symptoms,
      causes: analysis.causes,
      suggestion: analysis.suggestions[level.toLowerCase()],
      recommendations: analysis.recommendations
    };
  });

  return results;
}

// 提交答案
app.post('/api/assessment/submit', (req, res) => {
  const { assessmentId, answers } = req.body;

  if (!assessmentId || !answers || answers.length !== 90) {
    return res.status(400).json({ error: '无效的提交数据' });
  }

  // 验证测评ID存在
  const assessment = assessments.find(a => a.id === assessmentId);
  if (!assessment) {
    return res.status(403).json({ error: '无效的测评ID' });
  }

  // 保存答案
  answers.forEach((score, index) => {
    const answer = {
      id: answerCounter++,
      assessment_id: assessmentId,
      question_number: index + 1,
      score: score
    };
    answers.push(answer);
  });

  // 计算结果
  const results = calculateResults(answers);
  const totalScore = answers.reduce((sum, score) => sum + score, 0);
  const resultId = generateUniqueId();

  // 保存结果
  Object.entries(results).forEach(([dimension, data]) => {
    const result = {
      id: resultCounter++,
      assessment_id: assessmentId,
      dimension: dimension,
      dimension_score: data.score,
      t_score: data.tScore,
      level: data.level
    };
    results.push(result);
  });

  // 更新测评状态
  assessment.end_time = new Date().toISOString();
  assessment.total_score = totalScore;
  assessment.result_id = resultId;

  res.json({ results, totalScore, resultId });
});

// 通过结果ID查看测评结果
app.get('/api/results/:resultId', (req, res) => {
  const { resultId } = req.params;

  const assessment = assessments.find(a => a.result_id === resultId && a.end_time);
  if (!assessment) {
    return res.status(404).json({ error: '结果不存在' });
  }

  // 获取详细结果
  const assessmentResults = results.filter(r => r.assessment_id === assessment.id);

  // 转换结果格式
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
});

app.get('/results/:resultId', (req, res) => {
  const { resultId } = req.params;

  // 直接查找测评数据，无需网络调用 ✅
  const assessment = assessments.find(a => a.result_id === resultId && a.end_time);
  if (!assessment) {
    return res.status(404).send(/* 错误页面 */);
  }

  // 获取详细结果...
  const data = { assessment, results: formattedResults, totalScore: assessment.total_score };
  res.send(createResultsPage(data));
});

// 创建结果页面HTML
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
            .suggestions { background: #ecf0f1; padding: 15px; border-radius: 8px; margin-top: 15px; }
            .suggestions h4 { color: #2c3e50; margin-bottom: 10px; }
            .suggestions p { color: #34495e; line-height: 1.5; }
            .actions { text-align: center; }
            .btn { background: #667eea; color: white; padding: 12px 30px; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; margin: 0 10px; text-decoration: none; display: inline-block; transition: all 0.3s; }
            .btn:hover { background: #5a6fd8; transform: translateY(-2px); }
            .btn-secondary { background: #95a5a6; }
            .btn-secondary:hover { background: #7f8c8d; }
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
                        <div class="suggestions">
                            <h4>💡 建议</h4>
                            <p>建议您关注该维度的健康状况，如需要进一步了解或改善，可以咨询专业心理医生。</p>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="actions">
                <a href="/" class="btn">返回首页</a>
                <button onclick="window.print()" class="btn btn-secondary">打印结果</button>
            </div>
        </div>
    </body>
    </html>
  `;
}

// 获取维度名称
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`SCL-90心理测评服务器运行在 http://localhost:${PORT}`);
  console.log(`管理员页面: http://localhost:${PORT}/admin`);
});

// 导出app用于Vercel
module.exports = app;
