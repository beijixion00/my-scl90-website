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
if (process.env.NODE_ENV === 'production') {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('✅ MongoDB连接成功');
    }).catch((error) => {
        console.log('❌ MongoDB连接失败，使用内存存储:', error);
        useMemoryStorage();
    });
} else {
    console.log('🔧 开发模式：使用内存存储');
    useMemoryStorage();
}

function useMemoryStorage() {
    app.locals.useMemoryStorage = true;
    app.locals.assessmentLinks = [];
    app.locals.assessments = [];
    app.locals.results = [];
    app.locals.linkCounter = 1;
    app.locals.assessmentCounter = 1;
    app.locals.resultCounter = 1;

    // 初始化示例数据
    initSampleData();
}

// 初始化示例数据
function initSampleData() {
    if (app.locals.useMemoryStorage && app.locals.assessmentLinks.length === 0) {
        const sampleLink = {
            id: 'DEMO01',
            name: '示例测评链接',
            description: '这是一个示例测评链接，可以直接使用',
            created_at: new Date().toISOString(),
            expires_at: null,
            max_uses: 100,
            current_uses: 0,
            is_active: true
        };
        app.locals.assessmentLinks.push(sampleLink);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

// 数据模型（仅在数据库连接成功时使用）
let AssessmentLink, Assessment, Result;

if (!app.locals.useMemoryStorage) {
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

    AssessmentLink = mongoose.model('AssessmentLink', AssessmentLinkSchema);
    Assessment = mongoose.model('Assessment', AssessmentSchema);
    Result = mongoose.model('Result', ResultSchema);
}

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
    "别人在您的背后议论您", "单独与人相处时感到不自在", "感到应该容易成功", "感到烦躁易怒", "感到要很快把事情做完"
];

const DIMENSION_NAMES = {
    somatization: "躯体化",
    obsessive_compulsive: "强迫症状",
    interpersonal_sensitivity: "人际敏感",
    depression: "抑郁",
    anxiety: "焦虑",
    hostility: "敌对",
    phobic_anxiety: "恐怖",
    paranoid_ideation: "偏执",
    psychoticism: "精神病性",
    additional: "附加项目"
};

// 辅助函数
function isAdminAuthenticated(req, res) {
    const token = req.cookies.admin_token;
    return token === ADMIN_TOKEN;
}

function generateLinkId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function calculateTScore(rawScore, dimension) {
    const means = {
        somatization: 1.37, obsessive_compulsive: 1.62, interpersonal_sensitivity: 1.65,
        depression: 1.57, anxiety: 1.39, hostility: 1.46, phobic_anxiety: 1.23,
        paranoid_ideation: 1.43, psychoticism: 1.29, additional: 1.42
    };

    const sds = {
        somatization: 0.52, obsessive_compulsive: 0.58, interpersonal_sensitivity: 0.61,
        depression: 0.61, anxiety: 0.43, hostility: 0.55, phobic_anxiety: 0.41,
        paranoid_ideation: 0.59, psychoticism: 0.42, additional: 0.43
    };

    const mean = means[dimension] || 1.5;
    const sd = sds[dimension] || 0.5;
    const rawScoreAvg = rawScore / (SCL90_QUESTIONS[dimension].length);

    return Math.round(50 + 10 * ((rawScoreAvg - mean) / sd));
}

function getSeverityLevel(tScore) {
    if (tScore < 60) return { level: '正常', class: 'normal', color: '#48bb78' };
    if (tScore < 70) return { level: '轻度', class: 'mild', color: '#ed8936' };
    if (tScore < 80) return { level: '中度', class: 'moderate', color: '#e53e3e' };
    return { level: '重度', class: 'severe', color: '#c53030' };
}

// 数据库操作辅助函数
async function createAssessmentLink(linkData) {
    if (app.locals.useMemoryStorage) {
        linkData.id = linkData.id || generateLinkId();
        app.locals.assessmentLinks.push(linkData);
        return linkData;
    } else {
        return await AssessmentLink.create(linkData);
    }
}

async function getAssessmentLink(linkId) {
    if (app.locals.useMemoryStorage) {
        return app.locals.assessmentLinks.find(link => link.id === linkId);
    } else {
        return await AssessmentLink.findOne({ id: linkId });
    }
}

async function createAssessment(assessmentData) {
    if (app.locals.useMemoryStorage) {
        assessmentData.id = app.locals.assessmentCounter++;
        app.locals.assessments.push(assessmentData);
        return assessmentData;
    } else {
        return await Assessment.create(assessmentData);
    }
}

async function createResults(resultsData) {
    if (app.locals.useMemoryStorage) {
        const results = [];
        resultsData.forEach(result => {
            result.id = app.locals.resultCounter++;
            app.locals.results.push(result);
            results.push(result);
        });
        return results;
    } else {
        return await Result.insertMany(resultsData);
    }
}

async function getResults(resultId) {
    if (app.locals.useMemoryStorage) {
        return app.locals.results.filter(r => r.assessment_id.toString() === resultId);
    } else {
        return await Result.find({ assessment_id: resultId });
    }
}

// 路由定义
app.get('/', (req, res) => {
    // 根据环境选择主页
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'public', 'index-enhanced.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index-enhanced.html'));
    }
});

// API路由
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        res.cookie('admin_token', ADMIN_TOKEN, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true
        });
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: '密码错误' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
});

app.get('/api/links', async (req, res) => {
    if (!isAdminAuthenticated(req, res)) {
        return res.status(401).json({ error: '未授权访问' });
    }

    try {
        if (app.locals.useMemoryStorage) {
            res.json(app.locals.assessmentLinks);
        } else {
            const links = await AssessmentLink.find().sort({ created_at: -1 });
            res.json(links);
        }
    } catch (error) {
        res.status(500).json({ error: '获取链接失败' });
    }
});

app.post('/api/links', async (req, res) => {
    if (!isAdminAuthenticated(req, res)) {
        return res.status(401).json({ error: '未授权访问' });
    }

    try {
        const { name, description, max_uses, expires_at } = req.body;

        if (!name) {
            return res.status(400).json({ error: '链接名称不能为空' });
        }

        const linkData = {
            id: generateLinkId(),
            name: name.trim(),
            description: description?.trim() || '',
            max_uses: parseInt(max_uses) || 1,
            current_uses: 0,
            is_active: true,
            created_at: new Date().toISOString(),
            expires_at: expires_at || null
        };

        const link = await createAssessmentLink(linkData);
        res.json(link);
    } catch (error) {
        res.status(500).json({ error: '创建链接失败' });
    }
});

app.delete('/api/links/:id', async (req, res) => {
    if (!isAdminAuthenticated(req, res)) {
        return res.status(401).json({ error: '未授权访问' });
    }

    try {
        const { id } = req.params;

        if (app.locals.useMemoryStorage) {
            const index = app.locals.assessmentLinks.findIndex(link => link.id === id);
            if (index !== -1) {
                app.locals.assessmentLinks.splice(index, 1);
                res.json({ success: true });
            } else {
                res.status(404).json({ error: '链接不存在' });
            }
        } else {
            const result = await AssessmentLink.deleteOne({ id });
            if (result.deletedCount > 0) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: '链接不存在' });
            }
        }
    } catch (error) {
        res.status(500).json({ error: '删除链接失败' });
    }
});

app.get('/api/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const link = await getAssessmentLink(id);

        if (!link) {
            return res.status(404).json({ error: '测评链接不存在' });
        }

        // 检查链接是否有效
        if (!link.is_active) {
            return res.status(400).json({ error: '测评链接已失效' });
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return res.status(400).json({ error: '测评链接已过期' });
        }

        if (link.max_uses && link.current_uses >= link.max_uses) {
            return res.status(400).json({ error: '测评链接使用次数已达上限' });
        }

        res.json(link);
    } catch (error) {
        res.status(500).json({ error: '获取链接信息失败' });
    }
});

app.post('/api/assessments', async (req, res) => {
    try {
        const { link_id } = req.body;

        if (!link_id) {
            return res.status(400).json({ error: '缺少链接ID' });
        }

        const link = await getAssessmentLink(link_id);
        if (!link) {
            return res.status(404).json({ error: '测评链接不存在' });
        }

        // 增加使用次数
        if (app.locals.useMemoryStorage) {
            link.current_uses++;
        } else {
            await AssessmentLink.updateOne({ id: link_id }, { $inc: { current_uses: 1 } });
        }

        const resultId = crypto.randomBytes(8).toString('hex');

        const assessmentData = {
            link_id,
            result_id: resultId,
            start_time: new Date()
        };

        const assessment = await createAssessment(assessmentData);
        res.json({ assessment_id: assessment.id, result_id: resultId });
    } catch (error) {
        res.status(500).json({ error: '创建测评失败' });
    }
});

app.post('/api/assessments/:id/submit', async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;

        if (!answers || answers.length !== 90) {
            return res.status(400).json({ error: '答案数量不正确' });
        }

        // 计算总分
        const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);

        // 更新测评
        if (app.locals.useMemoryStorage) {
            const assessment = app.locals.assessments.find(a => a.id == id);
            if (assessment) {
                assessment.answers = answers;
                assessment.end_time = new Date();
                assessment.total_score = totalScore;
            }
        } else {
            await Assessment.updateOne(
                { id: parseInt(id) },
                {
                    answers,
                    end_time: new Date(),
                    total_score: totalScore
                }
            );
        }

        // 计算各维度得分
        const results = [];

        for (const [dimension, questions] of Object.entries(SCL90_QUESTIONS)) {
            const dimensionScore = questions.reduce((sum, qNum) => {
                const answer = answers.find(a => a.question_number === qNum);
                return sum + (answer ? answer.score : 0);
            }, 0);

            const tScore = calculateTScore(dimensionScore, dimension);
            const severity = getSeverityLevel(tScore);

            results.push({
                assessment_id: parseInt(id),
                dimension,
                dimension_score: dimensionScore,
                t_score: tScore,
                level: severity.level
            });
        }

        await createResults(results);

        // 获取result_id
        let resultId;
        if (app.locals.useMemoryStorage) {
            const assessment = app.locals.assessments.find(a => a.id == id);
            resultId = assessment?.result_id;
        } else {
            const assessment = await Assessment.findOne({ id: parseInt(id) });
            resultId = assessment?.result_id;
        }

        res.json({ result_id: resultId });
    } catch (error) {
        res.status(500).json({ error: '提交测评失败' });
    }
});

app.get('/api/results/:resultId', async (req, res) => {
    try {
        const { resultId } = req.params;
        const results = await getResults(resultId);

        if (results.length === 0) {
            return res.status(404).json({ error: '测评结果不存在' });
        }

        // 计算总分
        const totalScore = results.reduce((sum, result) => sum + result.dimension_score, 0);

        // 格式化结果
        const formattedResults = results.map(result => {
            const severity = getSeverityLevel(result.t_score);
            return {
                dimension: DIMENSION_NAMES[result.dimension] || result.dimension,
                dimension_key: result.dimension,
                dimension_score: result.dimension_score,
                t_score: result.t_score,
                level: severity.level,
                level_class: severity.class,
                color: severity.color
            };
        });

        // 按T分数排序
        formattedResults.sort((a, b) => b.t_score - a.t_score);

        res.json({
            total_score: totalScore,
            results: formattedResults,
            assessment_date: results[0]?.created_at || new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: '获取结果失败' });
    }
});

// 获取SCL-90题目
app.get('/api/questions', (req, res) => {
    const questions = SCL90_QUESTION_TEXT.map((text, index) => ({
        number: index + 1,
        text: text
    }));
    res.json(questions);
});

// 管理员页面路由
app.get('/admin', (req, res) => {
    if (!isAdminAuthenticated(req, res)) {
        res.redirect('/admin/login');
        return;
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// 测评页面路由
app.get('/assessment/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;
        const link = await getAssessmentLink(linkId);

        if (!link) {
            return res.status(404).send('测评链接不存在');
        }

        res.sendFile(path.join(__dirname, 'public', 'assessment.html'));
    } catch (error) {
        res.status(500).send('服务器错误');
    }
});

// 结果页面路由
app.get('/results/:resultId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        storage: app.locals.useMemoryStorage ? 'memory' : 'mongodb'
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '页面不存在' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 SCL-90专业心理测评服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 管理员页面: http://localhost:${PORT}/admin`);
    console.log(`💾 存储模式: ${app.locals.useMemoryStorage ? '内存存储' : 'MongoDB云数据库'}`);
    console.log(`🌐 环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;