// 全局变量
let currentUser = null;
let currentAssessmentId = null;
let currentQuestionIndex = 0;
let questions = [];
let answers = new Array(90).fill(null);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    checkAuthStatus();
    setupEventListeners();
}

// 检查用户认证状态
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // 验证token有效性
        fetch('/api/assessments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Token无效');
        })
        .then(data => {
            // Token有效，更新UI
            const user = JSON.parse(localStorage.getItem('user'));
            updateAuthUI(user);
        })
        .catch(() => {
            // Token无效，清除本地存储
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        });
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 导航按钮
    document.getElementById('loginBtn').addEventListener('click', showLoginModal);
    document.getElementById('registerBtn').addEventListener('click', showRegisterModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('startAssessment').addEventListener('click', startAssessment);

    // 模态框关闭按钮
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal();
        }
    });

    // 表单提交
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// 更新认证UI
function updateAuthUI(user) {
    currentUser = user;
    const authButtons = document.querySelector('.auth-buttons');
    const userInfo = document.querySelector('.user-info');
    const usernameSpan = document.getElementById('username');

    if (user) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        usernameSpan.textContent = `欢迎, ${user.username}`;
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

// 显示登录模态框
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('registerModal').style.display = 'none';
}

// 显示注册模态框
function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('loginModal').style.display = 'none';
}

// 关闭模态框
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// 处理登录
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            updateAuthUI(data.user);
            closeModal();
            showMessage('登录成功！', 'success');
        } else {
            showMessage(data.error || '登录失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 处理注册
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            updateAuthUI(data.user);
            closeModal();
            showMessage('注册成功！', 'success');
        } else {
            showMessage(data.error || '注册失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateAuthUI(null);
    showMessage('已退出登录', 'info');
}

// 开始测评
async function startAssessment() {
    if (!currentUser) {
        showMessage('请先登录后再开始测评', 'error');
        showLoginModal();
        return;
    }

    try {
        // 获取题目
        const questionsResponse = await fetch('/api/questions');
        const questionsData = await questionsResponse.json();
        questions = questionsData.questions;

        // 创建新的测评记录
        const token = localStorage.getItem('token');
        const assessmentResponse = await fetch('/api/assessment/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
        });

        const assessmentData = await assessmentResponse.json();

        if (assessmentResponse.ok) {
            currentAssessmentId = assessmentData.assessmentId;
            currentQuestionIndex = 0;
            answers = new Array(90).fill(null);
            showAssessmentPage();
        } else {
            showMessage('创建测评失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示测评页面
function showAssessmentPage() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="assessment-container">
            <div class="assessment-header">
                <h2>SCL-90心理测评</h2>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressBar" style="width: 1.11%">
                        1/90
                    </div>
                </div>
            </div>

            <div class="question-container" id="questionContainer">
                <!-- 题目将在这里动态加载 -->
            </div>

            <div class="nav-buttons">
                <button id="prevBtn" class="btn btn-outline" onclick="previousQuestion()" disabled>
                    <i class="fas fa-arrow-left"></i> 上一题
                </button>
                <button id="nextBtn" class="btn btn-primary" onclick="nextQuestion()" disabled>
                    下一题 <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;

    showQuestion();
}

// 显示当前题目
function showQuestion() {
    const questionContainer = document.getElementById('questionContainer');
    const question = questions[currentQuestionIndex];

    questionContainer.innerHTML = `
        <div class="question-number">第 ${currentQuestionIndex + 1} 题</div>
        <div class="question-text">${question}</div>
        <div class="options">
            <div class="option" data-score="1" onclick="selectOption(1)">
                <div class="option-text">没有</div>
                <div class="option-description">完全没有此症状</div>
            </div>
            <div class="option" data-score="2" onclick="selectOption(2)">
                <div class="option-text">很轻</div>
                <div class="option-description">症状很轻微</div>
            </div>
            <div class="option" data-score="3" onclick="selectOption(3)">
                <div class="option-text">中等</div>
                <div class="option-description">症状中等程度</div>
            </div>
            <div class="option" data-score="4" onclick="selectOption(4)">
                <div class="option-text">偏重</div>
                <div class="option-description">症状比较明显</div>
            </div>
            <div class="option" data-score="5" onclick="selectOption(5)">
                <div class="option-text">严重</div>
                <div class="option-description">症状非常严重</div>
            </div>
        </div>
    `;

    // 更新进度条
    updateProgressBar();

    // 更新导航按钮状态
    updateNavigationButtons();

    // 如果之前已经选择过答案，显示选中的选项
    if (answers[currentQuestionIndex] !== null) {
        selectOption(answers[currentQuestionIndex]);
    }
}

// 选择选项
function selectOption(score) {
    answers[currentQuestionIndex] = score;

    // 更新UI
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-score="${score}"]`).classList.add('selected');

    // 启用下一题按钮
    document.getElementById('nextBtn').disabled = false;
}

// 上一题
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion();
    }
}

// 下一题
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        // 最后一题，提交测评
        submitAssessment();
    }
}

// 更新进度条
function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentQuestionIndex === 0;

    if (currentQuestionIndex === questions.length - 1) {
        nextBtn.innerHTML = '<i class="fas fa-check"></i> 提交测评';
        nextBtn.disabled = answers[currentQuestionIndex] === null;
    } else {
        nextBtn.innerHTML = '下一题 <i class="fas fa-arrow-right"></i>';
        nextBtn.disabled = answers[currentQuestionIndex] === null;
    }
}

// 提交测评
async function submitAssessment() {
    if (!confirm('确定要提交测评吗？提交后将无法修改答案。')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/assessment/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                assessmentId: currentAssessmentId,
                answers: answers
            })
        });

        const data = await response.json();

        if (response.ok) {
            showResultsPage(data.results, data.totalScore);
        } else {
            showMessage(data.error || '提交失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示结果页面
function showResultsPage(results, totalScore) {
    const container = document.querySelector('.container');

    // 生成维度结果HTML
    const dimensionsHTML = Object.entries(results).map(([key, result]) => {
        const levelClass = getLevelClass(result.level);
        return `
            <div class="dimension-card">
                <div class="dimension-name">${result.name}</div>
                <div class="dimension-scores">
                    <span class="score-label">平均分:</span>
                    <span class="score-value">${result.score}</span>
                </div>
                <div class="dimension-scores">
                    <span class="score-label">T分数:</span>
                    <span class="score-value">${result.tScore}</span>
                </div>
                <div class="level-indicator ${levelClass}">${result.level}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="results-container">
            <div class="results-header">
                <h2>测评结果</h2>
                <div class="total-score">总分: ${totalScore}</div>
                <p>以下是您在各个心理维度的测评结果</p>
            </div>

            <div class="dimensions-grid">
                ${dimensionsHTML}
            </div>

            <div class="chart-container">
                <h3>维度得分雷达图</h3>
                <div class="canvas-container">
                    <canvas id="radarChart"></canvas>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" onclick="showHistory()">
                    <i class="fas fa-history"></i> 查看历史记录
                </button>
                <button class="btn btn-outline" onclick="location.reload()">
                    <i class="fas fa-redo"></i> 重新测评
                </button>
            </div>
        </div>
    `;

    // 绘制雷达图
    setTimeout(() => drawRadarChart(results), 100);
}

// 获取级别样式类
function getLevelClass(level) {
    switch (level) {
        case '正常': return 'level-normal';
        case '轻度': return 'level-mild';
        case '中度': return 'level-moderate';
        case '严重': return 'level-severe';
        default: return 'level-normal';
    }
}

// 绘制雷达图
function drawRadarChart(results) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    // 设置canvas尺寸
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;

    // 获取维度数据
    const dimensions = Object.values(results);
    const labels = dimensions.map(d => d.name);
    const scores = dimensions.map(d => (d.tScore / 100) * radius); // 归一化到半径

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景网格
    drawRadarGrid(ctx, centerX, centerY, radius, labels.length);

    // 绘制数据
    drawRadarData(ctx, centerX, centerY, scores, labels);
}

// 绘制雷达图背景网格
function drawRadarGrid(ctx, centerX, centerY, radius, numAxes) {
    const angleStep = (Math.PI * 2) / numAxes;

    // 绘制同心圆
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        for (let j = 0; j <= numAxes; j++) {
            const angle = j * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * i / 5);
            const y = centerY + Math.sin(angle) * (radius * i / 5);

            if (j === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }

    // 绘制轴线
    for (let i = 0; i < numAxes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius
        );
        ctx.stroke();
    }
}

// 绘制雷达图数据
function drawRadarData(ctx, centerX, centerY, scores, labels) {
    const numAxes = scores.length;
    const angleStep = (Math.PI * 2) / numAxes;

    // 绘制数据区域
    ctx.beginPath();
    ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;

    for (let i = 0; i <= numAxes; i++) {
        const angle = (i % numAxes) * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * scores[i % numAxes];
        const y = centerY + Math.sin(angle) * scores[i % numAxes];

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 绘制数据点
    for (let i = 0; i < numAxes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * scores[i];
        const y = centerY + Math.sin(angle) * scores[i];

        ctx.beginPath();
        ctx.fillStyle = '#4a90e2';
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 绘制标签
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < numAxes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const labelRadius = Math.max(...scores) + 30;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;

        ctx.fillText(labels[i], x, y);
    }
}

// 显示历史记录
async function showHistory() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/assessments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const assessments = await response.json();

        if (response.ok) {
            showHistoryPage(assessments);
        } else {
            showMessage('获取历史记录失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示历史记录页面
function showHistoryPage(assessments) {
    const container = document.querySelector('.container');

    const historyHTML = assessments.map(assessment => {
        const date = new Date(assessment.start_time).toLocaleDateString('zh-CN');
        const dimensions = assessment.dimensions ? assessment.dimensions.split(';') : [];
        const levels = assessment.levels ? assessment.levels.split(';') : [];

        return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-date">测评日期: ${date}</div>
                    <div class="history-score">总分: ${assessment.total_score || '未完成'}</div>
                    ${dimensions.length > 0 ? `<div class="history-score">主要维度: ${dimensions.slice(0, 3).join(', ')}</div>` : ''}
                </div>
                <div class="history-actions">
                    <button class="btn btn-small btn-primary" onclick="viewAssessmentDetails(${assessment.id})">
                        查看详情
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="history-container">
            <div class="history-header">
                <h2>测评历史记录</h2>
                <p>您的历史测评记录如下</p>
            </div>

            <div class="history-list">
                ${historyHTML || '<p>暂无测评记录</p>'}
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-plus"></i> 新的测评
                </button>
            </div>
        </div>
    `;
}

// 查看测评详情
async function viewAssessmentDetails(assessmentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/assessment/${assessmentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showAssessmentDetailsPage(data.assessment, data.results);
        } else {
            showMessage('获取测评详情失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示测评详情页面
function showAssessmentDetailsPage(assessment, results) {
    const container = document.querySelector('.container');

    const date = new Date(assessment.start_time).toLocaleString('zh-CN');

    // 生成维度结果HTML
    const dimensionsHTML = results.map(result => {
        const levelClass = getLevelClass(result.level);
        return `
            <div class="dimension-card">
                <div class="dimension-name">${result.dimension}</div>
                <div class="dimension-scores">
                    <span class="score-label">平均分:</span>
                    <span class="score-value">${result.dimension_score}</span>
                </div>
                <div class="dimension-scores">
                    <span class="score-label">T分数:</span>
                    <span class="score-value">${result.t_score}</span>
                </div>
                <div class="level-indicator ${levelClass}">${result.level}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="results-container">
            <div class="results-header">
                <h2>测评详情</h2>
                <div class="total-score">测评时间: ${date}</div>
                <div class="total-score">总分: ${assessment.total_score}</div>
            </div>

            <div class="dimensions-grid">
                ${dimensionsHTML}
            </div>

            <div class="action-buttons">
                <button class="btn btn-outline" onclick="showHistory()">
                    <i class="fas fa-arrow-left"></i> 返回历史记录
                </button>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> 重新测评
                </button>
            </div>
        </div>
    `;
}

// 显示消息
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '10000';
    messageDiv.style.maxWidth = '300px';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.padding = '12px';
    messageDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

    // 添加到页面
    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}