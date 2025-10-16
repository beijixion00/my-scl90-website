// 增强版交互功能脚本
class EnhancedUI {
    constructor() {
        this.init();
        this.bindEvents();
        this.initAnimations();
    }

    init() {
        console.log('🚀 SCL-90专业测评系统初始化完成');

        // 检测设备类型
        this.isMobile = window.innerWidth <= 768;
        this.isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;

        // 设置初始状态
        this.setInitialState();

        // 初始化工具提示
        this.initTooltips();
    }

    setInitialState() {
        // 设置导航栏状态
        this.navbar = document.querySelector('.navbar');
        this.lastScrollTop = 0;

        // 设置动画观察器
        this.setupIntersectionObserver();
    }

    bindEvents() {
        // 导航栏滚动效果
        window.addEventListener('scroll', this.handleScroll.bind(this));

        // 移动端菜单切换
        const navToggle = document.getElementById('navToggle');
        if (navToggle) {
            navToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }

        // 平滑滚动到锚点
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', this.handleSmoothScroll.bind(this));
        });

        // 返回顶部按钮
        this.setupBackToTop();

        // 导航链接激活状态
        this.setupActiveNavigation();

        // 添加加载动画
        this.addLoadingAnimations();
    }

    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // 导航栏隐藏/显示
        if (scrollTop > this.lastScrollTop && scrollTop > 100) {
            this.navbar.style.transform = 'translateY(-100%)';
        } else {
            this.navbar.style.transform = 'translateY(0)';
        }

        // 导航栏背景透明度
        if (scrollTop > 50) {
            this.navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            this.navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            this.navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            this.navbar.style.boxShadow = 'none';
        }

        this.lastScrollTop = scrollTop;
    }

    toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        const navToggle = document.getElementById('navToggle');

        if (navLinks.style.display === 'flex') {
            navLinks.style.display = 'none';
            navToggle.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            navLinks.style.display = 'flex';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.right = '0';
            navLinks.style.background = 'white';
            navLinks.style.flexDirection = 'column';
            navLinks.style.padding = '20px';
            navLinks.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            navToggle.innerHTML = '<i class="fas fa-times"></i>';
        }
    }

    handleSmoothScroll(e) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    setupBackToTop() {
        const backToTopBtn = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    setupActiveNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

        const observerOptions = {
            rootMargin: '-50% 0px -50% 0px'
        };

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${entry.target.id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => sectionObserver.observe(section));
    }

    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // 观察所有需要动画的元素
        document.querySelectorAll('.feature-card, .dimension-card, .process-step, .user-group').forEach(el => {
            this.intersectionObserver.observe(el);
        });
    }

    initAnimations() {
        // 添加CSS动画类
        const style = document.createElement('style');
        style.textContent = `
            .feature-card,
            .dimension-card,
            .process-step,
            .user-group {
                opacity: 0;
                transform: translateY(30px);
                transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .animate-in {
                opacity: 1;
                transform: translateY(0);
            }

            .process-step:nth-child(1) { transition-delay: 0.1s; }
            .process-step:nth-child(2) { transition-delay: 0.2s; }
            .process-step:nth-child(3) { transition-delay: 0.3s; }
            .process-step:nth-child(4) { transition-delay: 0.4s; }

            .feature-card:nth-child(1) { transition-delay: 0.1s; }
            .feature-card:nth-child(2) { transition-delay: 0.2s; }
            .feature-card:nth-child(3) { transition-delay: 0.3s; }
            .feature-card:nth-child(4) { transition-delay: 0.4s; }
            .feature-card:nth-child(5) { transition-delay: 0.5s; }
            .feature-card:nth-child(6) { transition-delay: 0.6s; }

            .floating-elements {
                animation: floatContainer 20s ease-in-out infinite;
            }

            @keyframes floatContainer {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                25% { transform: translateY(-10px) rotate(1deg); }
                50% { transform: translateY(5px) rotate(-1deg); }
                75% { transform: translateY(-5px) rotate(2deg); }
            }

            .hero-title {
                animation: fadeInUp 1s ease-out;
            }

            .hero-subtitle {
                animation: fadeInUp 1s ease-out 0.2s both;
            }

            .hero-stats {
                animation: fadeInUp 1s ease-out 0.4s both;
            }

            .hero-actions {
                animation: fadeInUp 1s ease-out 0.6s both;
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    initTooltips() {
        // 为技术特点添加悬停提示
        const techItems = document.querySelectorAll('.tech-item');
        techItems.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target);
            });

            item.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    showTooltip(element) {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = '点击了解更多技术细节';
        tooltip.style.cssText = `
            position: absolute;
            background: var(--gray-800);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';

        // 显示提示
        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 10);

        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.style.opacity = '0';
            setTimeout(() => {
                if (this.currentTooltip && this.currentTooltip.parentNode) {
                    this.currentTooltip.parentNode.removeChild(this.currentTooltip);
                }
                this.currentTooltip = null;
            }, 300);
        }
    }

    addLoadingAnimations() {
        // 为按钮添加加载状态
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!btn.classList.contains('btn-loading')) {
                    this.showButtonLoading(btn);
                }
            });
        });
    }

    showButtonLoading(button) {
        const originalContent = button.innerHTML;
        button.classList.add('btn-loading');
        button.innerHTML = '<span class="loading"></span> 加载中...';
        button.disabled = true;

        // 模拟加载过程
        setTimeout(() => {
            button.classList.remove('btn-loading');
            button.innerHTML = originalContent;
            button.disabled = false;
        }, 1500);
    }

    // 性能优化：防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 性能优化：节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 统计数字动画
class CounterAnimation {
    constructor() {
        this.counters = document.querySelectorAll('.stat-number');
        this.animated = false;
        this.init();
    }

    init() {
        if (this.counters.length > 0) {
            this.setupObserver();
        }
    }

    setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    this.animateCounters();
                    this.animated = true;
                }
            });
        });

        const heroStats = document.querySelector('.hero-stats');
        if (heroStats) {
            observer.observe(heroStats);
        }
    }

    animateCounters() {
        this.counters.forEach(counter => {
            const target = parseInt(counter.textContent);
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += step;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };

            updateCounter();
        });
    }
}

// 鼠标跟随效果
class MouseFollowEffect {
    constructor() {
        this.init();
    }

    init() {
        if (!this.isMobile()) {
            this.createCursor();
            this.bindEvents();
        }
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    createCursor() {
        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        this.cursor.style.cssText = `
            width: 20px;
            height: 20px;
            border: 2px solid var(--primary-color);
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transition: all 0.1s ease;
            transform: translate(-50%, -50%);
            opacity: 0.7;
        `;
        document.body.appendChild(this.cursor);
    }

    bindEvents() {
        document.addEventListener('mousemove', (e) => {
            if (this.cursor) {
                this.cursor.style.left = e.clientX + 'px';
                this.cursor.style.top = e.clientY + 'px';
            }
        });

        document.addEventListener('mousedown', () => {
            if (this.cursor) {
                this.cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.cursor) {
                this.cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            }
        });
    }
}

// 错误处理
class ErrorHandler {
    constructor() {
        this.init();
    }

    init() {
        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    }

    handleError(event) {
        console.error('页面错误:', event.error);
        this.showErrorMessage('页面出现了一些问题，请刷新重试');
    }

    handlePromiseRejection(event) {
        console.error('Promise 错误:', event.reason);
        this.showErrorMessage('网络请求失败，请检查网络连接');
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-color);
            color: white;
            padding: 15px 20px;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow-lg);
            z-index: 10000;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.style.opacity = '1';
            errorDiv.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 300);
        }, 5000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化主要功能
    const enhancedUI = new EnhancedUI();
    const counterAnimation = new CounterAnimation();
    const mouseFollowEffect = new MouseFollowEffect();
    const errorHandler = new ErrorHandler();

    // 页面加载完成动画
    document.body.classList.add('page-loaded');

    console.log('✨ SCL-90专业测评系统已准备就绪');

    // 添加页面加载完成的样式
    const loadingStyle = document.createElement('style');
    loadingStyle.textContent = `
        body {
            opacity: 0;
            transition: opacity 0.5s ease;
        }

        body.page-loaded {
            opacity: 1;
        }

        .nav-link.active {
            color: var(--primary-color) !important;
        }

        .nav-link.active::after {
            width: 100% !important;
        }

        .custom-cursor {
            display: none;
        }

        @media (min-width: 769px) {
            .custom-cursor {
                display: block;
            }
        }

        .error-toast {
            font-family: var(--font-family);
            font-size: 14px;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(loadingStyle);
});

// 导出功能供外部使用
window.SCL90Enhanced = {
    EnhancedUI,
    CounterAnimation,
    MouseFollowEffect,
    ErrorHandler
};