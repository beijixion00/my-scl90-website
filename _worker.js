// Cloudflare Pages Functions 适配文件
// 这个文件让您的SCL-90网站能够在Cloudflare Pages上运行

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 处理API请求
  if (path.startsWith('/api/')) {
    return handleAPIRequest(request, path, method, env);
  }

  // 处理静态文件请求
  return handleStaticRequest(request, path, env);
}

// 内存存储（替代MongoDB）
const memoryStorage = {
  assessmentLinks: [],
  assessments: [],
  results: [],
  linkCounter: 1,
  assessmentCounter: 1,
  resultCounter: 1,

  initSampleData() {
    if (this.assessmentLinks.length === 0) {
      this.assessmentLinks.push({
        id: 'DEMO01',
        name: '示例测评链接',
        description: '这是一个示例测评链接，可以直接使用',
        created_at: new Date().toISOString(),
        expires_at: null,
        max_uses: 100,
        current_uses: 0,
        is_active: true
      });
    }
  }
};

// 初始化示例数据
memoryStorage.initSampleData();

// SCL-90题目
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
function generateLinkId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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

function isAdminAuthenticated(request) {
  const cookies = request.headers.get('cookie') || '';
  return cookies.includes('admin_token=secure_admin_token_2024');
}

// 处理API请求
async function handleAPIRequest(request, path, method, env) {
  try {
    const url = new URL(request.url);

    // CORS处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    let body = {};
    if (method === 'POST' || method === 'PUT') {
      body = await request.json().catch(() => ({}));
    }

    // 路由处理
    if (path === '/api/questions' && method === 'GET') {
      const questions = SCL90_QUESTION_TEXT.map((text, index) => ({
        number: index + 1,
        text: text
      }));

      return new Response(JSON.stringify(questions), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (path === '/api/links' && method === 'GET') {
      if (!isAdminAuthenticated(request)) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify(memoryStorage.assessmentLinks), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (path === '/api/links' && method === 'POST') {
      if (!isAdminAuthenticated(request)) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const { name, description, max_uses, expires_at } = body;
      if (!name) {
        return new Response(JSON.stringify({ error: '链接名称不能为空' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
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

      memoryStorage.assessmentLinks.push(linkData);
      return new Response(JSON.stringify(linkData), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (path.startsWith('/api/links/') && method === 'GET') {
      const id = path.split('/').pop();
      const link = memoryStorage.assessmentLinks.find(link => link.id === id);

      if (!link) {
        return new Response(JSON.stringify({ error: '测评链接不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (!link.is_active) {
        return new Response(JSON.stringify({ error: '测评链接已失效' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: '测评链接已过期' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (link.max_uses && link.current_uses >= link.max_uses) {
        return new Response(JSON.stringify({ error: '测评链接使用次数已达上限' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify(link), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (path === '/api/assessments' && method === 'POST') {
      const { link_id } = body;
      if (!link_id) {
        return new Response(JSON.stringify({ error: '缺少链接ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const link = memoryStorage.assessmentLinks.find(l => l.id === link_id);
      if (!link) {
        return new Response(JSON.stringify({ error: '测评链接不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      link.current_uses++;
      const resultId = Math.random().toString(36).substring(2, 18);

      const assessmentData = {
        id: memoryStorage.assessmentCounter++,
        link_id,
        result_id: resultId,
        start_time: new Date().toISOString(),
        answers: [],
        end_time: null,
        total_score: 0
      };

      memoryStorage.assessments.push(assessmentData);

      return new Response(JSON.stringify({ assessment_id: assessmentData.id, result_id: resultId }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (path.startsWith('/api/assessments/') && path.endsWith('/submit') && method === 'POST') {
      const id = parseInt(path.split('/')[3]);
      const { answers } = body;

      if (!answers || answers.length !== 90) {
        return new Response(JSON.stringify({ error: '答案数量不正确' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const assessment = memoryStorage.assessments.find(a => a.id === id);
      if (!assessment) {
        return new Response(JSON.stringify({ error: '测评不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      assessment.answers = answers;
      assessment.end_time = new Date().toISOString();
      assessment.total_score = answers.reduce((sum, answer) => sum + answer.score, 0);

      // 计算各维度得分
      const results = [];
      for (const [dimension, questions] of Object.entries(SCL90_QUESTIONS)) {
        const dimensionScore = questions.reduce((sum, qNum) => {
          const answer = answers.find(a => a.question_number === qNum);
          return sum + (answer ? answer.score : 0);
        }, 0);

        const tScore = calculateTScore(dimensionScore, dimension);
        const severity = getSeverityLevel(tScore);

        const result = {
          id: memoryStorage.resultCounter++,
          assessment_id: assessment.id,
          dimension,
          dimension_score: dimensionScore,
          t_score: tScore,
          level: severity.level,
          created_at: new Date().toISOString()
        };

        memoryStorage.results.push(result);
        results.push(result);
      }

      return new Response(JSON.stringify({ result_id: assessment.result_id }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (path.startsWith('/api/results/') && method === 'GET') {
      const resultId = path.split('/').pop();
      const results = memoryStorage.results.filter(r => r.assessment_id.toString() === resultId);

      if (results.length === 0) {
        return new Response(JSON.stringify({ error: '测评结果不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const totalScore = results.reduce((sum, result) => sum + result.dimension_score, 0);

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

      formattedResults.sort((a, b) => b.t_score - a.t_score);

      return new Response(JSON.stringify({
        total_score: totalScore,
        results: formattedResults,
        assessment_date: results[0]?.created_at || new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (path === '/api/admin/login' && method === 'POST') {
      const { password } = body;
      if (password === '1234love') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'admin_token=secure_admin_token_2024; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400',
            ...corsHeaders
          }
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: '密码错误' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (path === '/api/admin/logout' && method === 'POST') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
          ...corsHeaders
        }
      });
    }

    // 404处理
    return new Response(JSON.stringify({ error: 'API端点不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('API错误:', error);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 处理静态文件请求
async function handleStaticRequest(request, path, env) {
  // 对于Cloudflare Pages，静态文件会自动处理
  // 这个函数主要用于特殊路由
  return new Response(null, { status: 404 });
}