// Cloudflare Pages Functions API路由
// 这个文件处理所有API请求

// 内存存储
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

memoryStorage.initSampleData();

// SCL-90数据
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

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

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
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
  }

  // 获取题目
  if (path === '/api/questions' && method === 'GET') {
    const questions = SCL90_QUESTION_TEXT.map((text, index) => ({
      number: index + 1,
      text: text
    }));

    return new Response(JSON.stringify(questions), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // 获取链接列表
  if (path === '/api/links' && method === 'GET') {
    return new Response(JSON.stringify(memoryStorage.assessmentLinks), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // 创建链接
  if (path === '/api/links' && method === 'POST') {
    const { name, description, max_uses } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: '链接名称不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const linkData = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      name: name.trim(),
      description: description?.trim() || '',
      max_uses: parseInt(max_uses) || 1,
      current_uses: 0,
      is_active: true,
      created_at: new Date().toISOString()
    };

    memoryStorage.assessmentLinks.push(linkData);
    return new Response(JSON.stringify(linkData), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // 获取特定链接
  if (path.startsWith('/api/links/') && method === 'GET') {
    const id = path.split('/').pop();
    const link = memoryStorage.assessmentLinks.find(link => link.id === id);

    if (!link) {
      return new Response(JSON.stringify({ error: '测评链接不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify(link), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // 管理员登录
  if (path === '/api/admin/login' && method === 'POST') {
    const { password } = body;
    if (password === '1234love') {
      return new Response(JSON.stringify({ success: true }), {
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

  // 默认响应
  return new Response(JSON.stringify({ error: 'API端点不存在' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}