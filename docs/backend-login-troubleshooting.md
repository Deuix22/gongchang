# 登录问题排查指南

## 问题现象

使用账号 `admin` 和密码 `030426` 登录时，返回 401 错误："账号或密码不正确"。

## 可能原因

### 1. admin用户的 `username` 字段问题

**问题**: 后端已实现统一登录接口 `POST /api/auth/login`，但admin用户的 `username` 字段可能：
- 不存在（字段为空）
- 不是 "admin"（可能是其他值，如 `userId` 是 "admin" 但 `username` 是空的）

**解决方案**:

检查数据库中的admin用户数据：

```javascript
// MongoDB 查询示例
db.users.findOne({ role: "admin" })
```

**如果 `username` 字段不存在或为空**，需要更新：

```javascript
// 更新admin用户的username字段
db.users.updateOne(
  { role: "admin" },
  { 
    $set: { 
      username: "admin",
      // 如果password字段也不存在，需要设置密码
      // password: "$2b$10$..." // bcrypt加密后的密码
    } 
  }
)
```

### 2. admin用户的密码问题

**问题**: admin用户的密码可能：
- 不是 "030426"
- 密码格式不正确（未加密或加密方式不对）

**解决方案**:

**方法1：重置密码（推荐）**

使用 bcrypt 生成新密码：

```javascript
const bcrypt = require('bcrypt');

// 生成密码哈希
const password = "030426";
const hashedPassword = await bcrypt.hash(password, 10);
console.log('加密后的密码:', hashedPassword);

// 更新数据库
db.users.updateOne(
  { role: "admin" },
  { 
    $set: { 
      password: hashedPassword
    } 
  }
)
```

**方法2：检查现有密码**

如果密码已存在，验证是否正确：

```javascript
const bcrypt = require('bcrypt');
const user = db.users.findOne({ role: "admin" });
const isValid = await bcrypt.compare("030426", user.password);
console.log('密码是否正确:', isValid);
```

### 3. 后端验证逻辑问题

**问题**: 后端登录接口的验证逻辑可能有问题

**检查点**:

1. **账号查找逻辑**:
   ```javascript
   // 应该根据 username 查找，而不是 userId
   const user = await User.findOne({ username: req.body.username });
   ```

2. **密码验证逻辑**:
   ```javascript
   // 应该使用 bcrypt.compare 验证密码
   const isValid = await bcrypt.compare(password, user.password);
   ```

3. **角色验证**:
   ```javascript
   // 应该支持所有角色（admin、manager、leader）
   // 不应该限制只有admin可以登录
   ```

### 4. 数据库数据丢失

**问题**: admin用户数据可能被删除

**解决方案**:

重新创建admin用户：

```javascript
const bcrypt = require('bcrypt');

// 生成密码哈希
const hashedPassword = await bcrypt.hash("030426", 10);

// 创建admin用户
db.users.insertOne({
  userId: "admin",
  username: "admin",
  password: hashedPassword,
  nickName: "超级管理员",
  role: "admin",
  createdAt: new Date(),
  lastLoginAt: null
})
```

## 快速检查步骤

### 步骤1：检查admin用户是否存在

```javascript
// MongoDB
db.users.findOne({ role: "admin" })

// 或
db.users.findOne({ username: "admin" })
```

### 步骤2：检查username字段

```javascript
const admin = db.users.findOne({ role: "admin" });
console.log('username:', admin.username);
console.log('userId:', admin.userId);
```

### 步骤3：检查password字段

```javascript
const admin = db.users.findOne({ role: "admin" });
console.log('password存在:', !!admin.password);
console.log('password长度:', admin.password?.length);
```

### 步骤4：验证密码

```javascript
const bcrypt = require('bcrypt');
const admin = db.users.findOne({ role: "admin" });
const isValid = await bcrypt.compare("030426", admin.password);
console.log('密码验证结果:', isValid);
```

## 临时解决方案

如果后端还没有实现统一登录接口，前端已添加兼容方案：

- 如果新接口返回 404（接口不存在），会自动降级到旧的 `login-admin` 接口
- 如果返回 401（认证失败），说明接口存在但账号密码错误，需要检查数据库

## 推荐操作

1. **检查数据库**:
   ```bash
   # 连接MongoDB
   mongo
   
   # 切换到数据库
   use your_database_name
   
   # 查询admin用户
   db.users.findOne({ role: "admin" })
   ```

2. **更新admin用户**:
   ```javascript
   // 确保username字段存在且值为"admin"
   // 确保password字段存在且是bcrypt加密后的密码
   ```

3. **测试登录**:
   ```bash
   curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"030426"}'
   ```

## 常见错误

### 错误1：username字段不存在

**错误信息**: "账号或密码不正确"

**原因**: admin用户的 `username` 字段为空或不存在

**解决**: 更新admin用户，设置 `username: "admin"`

### 错误2：password字段不存在

**错误信息**: "账号或密码不正确"

**原因**: admin用户的 `password` 字段为空或不存在

**解决**: 更新admin用户，设置加密后的密码

### 错误3：密码未加密

**错误信息**: "账号或密码不正确"

**原因**: admin用户的密码是明文，但后端使用bcrypt验证

**解决**: 使用bcrypt加密密码后更新数据库

---

**文档版本**: v1.0  
**最后更新**: 2024-01-05

