# MongoDB Atlas 云数据库配置完整指南

## 🚀 快速开始

MongoDB Atlas 提供免费的云数据库服务，非常适合您的SCL-90测评网站。

### 步骤1：注册MongoDB Atlas

1. **访问官网**
   - 打开浏览器，访问：https://www.mongodb.com/atlas
   - 点击 "Get Started Free" 或 "免费开始"

2. **创建账户**
   - 使用邮箱注册新账户
   - 或使用Google/GitHub账户快速登录
   - 完成邮箱验证

### 步骤2：创建数据库集群

1. **选择云服务商**
   ```
   推荐配置：
   - Cloud Provider: AWS
   - Region: Singapore (ap-southeast-1) 或 Mumbai (ap-south-1)
   - 原因：对中国用户访问速度较快
   ```

2. **选择集群层级**
   ```
   免费套餐 (M0 Sandbox)：
   - 512MB 存储空间
   - 无需费用
   - 适合个人项目和小规模使用
   ```

3. **集群设置**
   - 集群名称：Cluster0 (默认)
   - 保持默认设置
   - 点击 "Create Cluster"

### 步骤3：配置数据库用户

1. **创建数据库用户**
   ```
   用户信息：
   - Username: scl90admin
   - Password: 生成强密码 (建议保存到密码管理器)
   - 权限: Read and write to any database
   ```

2. **设置网络访问**
   ```
   IP白名单：
   - 选择: Allow Access from Anywhere (0.0.0.0/0)
   - 或者添加: 0.0.0.0/0 (允许所有IP访问)
   - 点击: Confirm
   ```

### 步骤4：获取连接字符串

1. **找到连接信息**
   - 集群创建完成后，点击 "Connect"
   - 选择 "Connect your application"

2. **获取连接字符串**
   ```
   Driver: Node.js
   Version: 4.1 or later

   连接字符串格式：
   mongodb+srv://scl90admin:<password>@cluster.mongodb.net/scl90?retryWrites=true&w=majority
   ```

3. **替换密码**
   - 将 `<password>` 替换为您设置的实际密码
   - 将连接字符串复制保存

### 步骤5：配置项目环境变量

1. **Vercel环境变量设置**
   ```
   登录 Vercel：
   - 进入项目设置页面
   - 选择 "Environment Variables"
   - 添加新变量：

   变量名: MONGODB_URI
   变量值: mongodb+srv://scl90admin:您的密码@cluster.mongodb.net/scl90?retryWrites=true&w=majority

   环境选择: Production, Preview, Development (全部勾选)
   ```

2. **本地环境变量**
   ```bash
   # 编辑 .env 文件
   MONGODB_URI=mongodb+srv://scl90admin:您的密码@cluster.mongodb.net/scl90?retryWrites=true&w=majority
   ```

### 步骤6：测试数据库连接

1. **本地测试**
   ```bash
   # 设置环境变量
   export MONGODB_URI="您的连接字符串"

   # 运行服务器
   npm run final
   ```

2. **检查连接状态**
   - 成功连接会显示：✅ MongoDB连接成功
   - 失败会显示：❌ MongoDB连接失败，使用内存存储

### 步骤7：部署到Vercel

1. **提交代码**
   ```bash
   git add .
   git commit -m "配置MongoDB Atlas云数据库"
   git push origin main
   ```

2. **Vercel自动部署**
   - Vercel会自动检测更新
   - 使用环境变量连接云数据库
   - 部署完成后测试所有功能

## 🔧 高级配置

### 数据库优化设置

1. **索引优化**
   ```javascript
   // 在MongoDB Atlas中创建索引
   db.assessmentlinks.createIndex({ "id": 1 }, { unique: true })
   db.assessments.createIndex({ "result_id": 1 })
   db.results.createIndex({ "assessment_id": 1 })
   ```

2. **性能监控**
   - 启用 Real Time Performance Panel
   - 监控查询性能
   - 设置慢查询警告

### 备份策略

1. **自动备份**
   ```
   免费版备份：
   - 每24小时自动备份
   - 保留7天历史
   - 手动快照功能
   ```

2. **手动备份**
   ```bash
   # 导出数据
   mongodump --uri="您的连接字符串" --out=./backup

   # 恢复数据
   mongorestore --uri="您的连接字符串" ./backup
   ```

## 📊 监控和维护

### 性能监控

1. **MongoDB Atlas仪表板**
   - 监控数据库使用量
   - 查看连接数
   - 分析查询性能

2. **Vercel Analytics**
   - 监控网站访问量
   - 查看API响应时间
   - 分析用户行为

### 扩容计划

1. **存储空间升级**
   ```
   免费版：512MB
   付费版：从10GB开始，按需扩展
   建议阈值：使用量达到80%时考虑升级
   ```

2. **性能升级**
   ```
   M0 (免费)：共享CPU，512MB内存
   M10 ($0.08/hour)：2vCPU，2GB内存
   M20 ($0.20/hour)：2vCPU，4GB内存
   ```

## 🔒 安全配置

### 访问控制

1. **用户权限管理**
   ```
   建议用户权限：
   - scl90admin: 读写权限 (应用使用)
   - scl90_readonly: 只读权限 (分析使用)
   - scl90_backup: 备份权限 (备份使用)
   ```

2. **网络访问限制**
   ```
   生产环境建议：
   - 限制IP访问范围
   - 使用VPC Peering
   - 启用加密传输
   ```

### 数据加密

1. **传输加密**
   - 所有连接使用TLS/SSL
   - 连接字符串中包含 `ssl=true`

2. **存储加密**
   - 默认启用静态加密
   - 密钥由MongoDB管理

## 🚨 故障排除

### 常见问题

1. **连接失败**
   ```
   检查项目：
   - 用户名密码是否正确
   - IP白名单是否包含当前IP
   - 网络连接是否正常
   - 防火墙设置
   ```

2. **性能问题**
   ```
   优化建议：
   - 添加适当的索引
   - 优化查询语句
   - 监控慢查询
   - 考虑数据归档
   ```

3. **存储空间不足**
   ```
   解决方案：
   - 清理过期数据
   - 数据压缩
   - 升级存储计划
   ```

### 错误代码解释

1. **MongoError: Authentication failed**
   - 检查用户名密码
   - 确认用户权限设置

2. **MongoNetworkTimeoutError**
   - 检查网络连接
   - 确认IP白名单设置

3. **MongoServerError: Too many connections**
   - 检查连接池设置
   - 优化应用连接管理

## 📈 最佳实践

### 开发建议

1. **环境管理**
   ```
   环境分离：
   - 开发环境：使用免费集群
   - 测试环境：独立数据库
   - 生产环境：高可用集群
   ```

2. **代码优化**
   ```javascript
   // 使用连接池
   const options = {
     maxPoolSize: 10,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
   };

   mongoose.connect(uri, options);
   ```

### 运维建议

1. **监控告警**
   - 设置磁盘使用率告警 (80%)
   - 设置连接数告警 (80%)
   - 设置错误率告警 (5%)

2. **定期维护**
   - 每月检查索引使用情况
   - 每季度进行性能评估
   - 定期更新数据库版本

## 🎯 总结

通过以上配置，您的SCL-90心理测评网站将获得：

✅ **可靠的数据存储**：99.99%可用性保证
✅ **自动备份功能**：数据安全有保障
✅ **全球CDN加速**：访问速度快
✅ **免费开始使用**：零成本启动
✅ **按需扩展**：灵活升级方案
✅ **专业监控**：实时性能监控

**配置完成后，您的网站将完全迁移到云端，享受企业级的数据库服务！**

---

## 📞 技术支持

如果在配置过程中遇到问题：

1. **MongoDB官方文档**：https://docs.mongodb.com/manual/
2. **MongoDB社区论坛**：https://community.mongodb.com/
3. **Vercel支持文档**：https://vercel.com/docs
4. **项目问题反馈**：创建GitHub Issue

---

*最后更新：2024年10月*