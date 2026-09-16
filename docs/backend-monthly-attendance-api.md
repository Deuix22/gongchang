# 月度统计表后端接口文档

## 概述

月度统计表用于记录每个组长每天最后一次提交的出勤数据。每个月从1号开始，当组长每天提交了出勤时间统计，当日最后一次提交的数据会自动记录在月度统计表中。

## 数据存储要求

### 数据结构

月度统计表数据按以下结构存储：

```json
{
  "yearMonth": "2024-01",  // 年月（YYYY-MM格式）
  "leaderId": "leader_001",
  "date": "2024-01-15",    // 日期（YYYY-MM-DD格式）
  "records": [
    {
      "memberId": "member_001",
      "memberName": "白班组员1",
      "startTime": "2024-01-15T08:00:00.000Z",
      "endTime": "2024-01-15T17:00:00.000Z",
      "duration": 540,      // 出勤时长（分钟）
      "shiftType": "day",   // 班次类型：day（白班）或 night（夜班）
      "department": "SMT"
    }
  ],
  "submittedAt": "2024-01-15T17:10:00.000Z"  // 提交时间（系统时间）
}
```

### 存储逻辑

1. **唯一键**：`yearMonth + leaderId + date` 作为唯一键
2. **覆盖策略**：同一天多次提交时，只保留最后一次提交的数据（覆盖当日之前的记录）
3. **数据保留**：建议至少保留 2 个月（60 天）的数据

---

## 1. 保存月度统计表数据

### 1.1 接口信息

**接口**: `POST /api/leaders/{leaderId}/monthly-attendance`

**权限**: `leader`, `admin`

**请求头**: `Authorization: Bearer <token>`

**路径参数**:
- `leaderId`: 组长ID

**请求体**:
```json
{
  "date": "2024-01-15",
  "records": [
    {
      "memberId": "member_001",
      "memberName": "白班组员1",
      "startTime": "2024-01-15T08:00:00.000Z",
      "endTime": "2024-01-15T17:00:00.000Z",
      "duration": 540,
      "shiftType": "day",
      "department": "SMT"
    },
    {
      "memberId": "member_002",
      "memberName": "白班组员2",
      "startTime": "2024-01-15T08:00:00.000Z",
      "endTime": "2024-01-15T17:00:00.000Z",
      "duration": 540,
      "shiftType": "day",
      "department": "SMT"
    }
  ],
  "submittedAt": "2024-01-15T17:10:00.000Z"
}
```

**字段说明**:
- `date` (必填): 日期，格式：`YYYY-MM-DD`
- `records` (必填): 出勤记录数组，不能为空
  - `memberId` (必填): 组员ID
  - `memberName` (必填): 组员姓名
  - `startTime` (必填): 上班时间，ISO 8601格式（UTC）
  - `endTime` (必填): 下班时间，ISO 8601格式（UTC）
  - `duration` (必填): 出勤时长，单位：分钟
  - `shiftType` (必填): 班次类型，`day`（白班）或 `night`（夜班）
  - `department` (可选): 部门名称
- `submittedAt` (必填): 提交时间，ISO 8601格式（UTC）

**实现要求**:
1. 从 `date` 字段提取年月（`YYYY-MM`）作为 `yearMonth`
2. 以 `yearMonth + leaderId + date` 作为唯一键
3. 如果该日期已有数据，**覆盖**旧数据（实现"当日最后一次提交"）
4. 如果该日期没有数据，**新增**数据
5. 验证 `leaderId` 与 token 中的身份一致，或当前用户为 `admin`
6. 验证所有必填字段是否存在
7. 验证 `records` 数组不能为空

**成功响应** (200):
```json
{
  "success": true,
  "yearMonth": "2024-01",
  "date": "2024-01-15",
  "recordCount": 2
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "日期格式不正确",
    "details": {}
  }
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "无权操作其他组的月度统计表",
    "details": {}
  }
}
```

---

## 2. 查询月度统计表

### 2.1 接口信息

**接口**: `GET /api/monthly-attendance`

**权限**: `admin`, `manager`

**请求头**: `Authorization: Bearer <token>`

**查询参数**:
- `yearMonth` (必填): 年月，格式：`YYYY-MM`，例如：`2024-01`
- `leaderId` (可选): 组长ID，如果不提供，返回所有组长的数据（仅管理员可用）

**实现要求**:
1. 如果提供了 `leaderId`，只返回该组长的数据
2. 如果不提供 `leaderId`：
   - `admin` 角色：返回所有组长的数据
   - `manager` 角色：返回所有组长的数据
   - 其他角色：返回 403 错误
3. 返回该月从第1天到最后一天的所有日期
4. 如果某天没有数据，该日期对应的 `records` 为空数组
5. 数据按日期排序（从1号到最后一天）

**成功响应** (200):
```json
{
  "yearMonth": "2024-01",
  "data": [
    {
      "date": "2024-01-01",
      "leaderId": "leader_001",
      "leaderName": "张三",
      "department": "SMT",
      "records": [
        {
          "memberId": "member_001",
          "memberName": "白班组员1",
          "startTime": "2024-01-01T08:00:00.000Z",
          "endTime": "2024-01-01T17:00:00.000Z",
          "duration": 540,
          "shiftType": "day",
          "department": "SMT"
        }
      ],
      "submittedAt": "2024-01-01T17:10:00.000Z"
    },
    {
      "date": "2024-01-02",
      "leaderId": "leader_001",
      "leaderName": "张三",
      "department": "SMT",
      "records": [],
      "submittedAt": null
    },
    // ... 该月所有日期（1号到最后一天）
    {
      "date": "2024-01-31",
      "leaderId": "leader_001",
      "leaderName": "张三",
      "department": "SMT",
      "records": [
        {
          "memberId": "member_001",
          "memberName": "白班组员1",
          "startTime": "2024-01-31T08:00:00.000Z",
          "endTime": "2024-01-31T17:00:00.000Z",
          "duration": 540,
          "shiftType": "day",
          "department": "SMT"
        }
      ],
      "submittedAt": "2024-01-31T17:10:00.000Z"
    }
  ]
}
```

**字段说明**:
- `yearMonth`: 查询的年月
- `data`: 该月所有日期的数据数组
  - `date`: 日期（YYYY-MM-DD格式）
  - `leaderId`: 组长ID
  - `leaderName`: 组长姓名（从用户表关联获取）
  - `department`: 部门名称
  - `records`: 该日的出勤记录数组（如果没有数据则为空数组）
  - `submittedAt`: 提交时间（如果没有数据则为 null）

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "yearMonth 参数格式不正确，应为 YYYY-MM 格式",
    "details": {}
  }
}
```

**失败响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足，仅管理员和管理员可以查询月度统计表",
    "details": {}
  }
}
```

---

## 3. 数据库设计建议

### 3.1 表结构

建议创建 `monthly_attendance` 表：

```sql
CREATE TABLE monthly_attendance (
  id VARCHAR(255) PRIMARY KEY,              -- 主键：yearMonth_leaderId_date
  year_month VARCHAR(7) NOT NULL,           -- 年月：YYYY-MM
  leader_id VARCHAR(255) NOT NULL,          -- 组长ID
  date DATE NOT NULL,                       -- 日期：YYYY-MM-DD
  records JSON NOT NULL,                    -- 出勤记录数组（JSON格式）
  submitted_at TIMESTAMP NOT NULL,          -- 提交时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year_month_leader (year_month, leader_id),
  INDEX idx_date (date),
  UNIQUE KEY uk_year_month_leader_date (year_month, leader_id, date)
);
```

### 3.2 索引建议

- `year_month + leader_id`: 用于按年月和组长查询
- `date`: 用于按日期查询
- `year_month + leader_id + date`: 唯一索引，确保同一天只有一条记录

---

## 4. 前端调用时机

### 4.1 保存数据

前端在以下时机调用保存接口：

1. **出勤时间统计提交成功后**：
   - 组长在"出勤时间统计"页面提交数据
   - 调用 `POST /api/leaders/{leaderId}/attendance` 成功后
   - 立即调用 `POST /api/leaders/{leaderId}/monthly-attendance` 保存月度统计表数据

2. **数据格式转换**：
   - 前端需要将出勤记录转换为月度统计表格式
   - 提取当前日期作为 `date`
   - 将 `records` 数组中的每条记录转换为月度统计表格式

### 4.2 查询数据

前端在以下时机调用查询接口：

1. **管理员查看月度统计表**：
   - 在设置页面点击"月度统计表"按钮
   - 选择月份后，调用 `GET /api/monthly-attendance?yearMonth=YYYY-MM`
   - 显示该月从1号到最后一天的所有数据

---

## 5. 注意事项

1. **数据覆盖**：同一天多次提交时，只保留最后一次提交的数据
2. **数据完整性**：返回数据时，必须包含该月所有日期（1号到最后一天），即使某天没有数据
3. **权限控制**：
   - 保存接口：只有组长本人或 admin 可以保存
   - 查询接口：只有 admin 和 manager 可以查询
4. **数据保留**：建议至少保留 2 个月（60 天）的数据
5. **时区处理**：所有时间字段使用 ISO 8601 格式（UTC），前端负责转换为本地时间显示

---

## 6. 错误处理

### 6.1 常见错误码

- `INVALID_PARAMS` (400): 参数格式不正确或缺少必填字段
- `FORBIDDEN` (403): 权限不足
- `NOT_FOUND` (404): 资源不存在（查询时如果该月没有数据，应返回空数组，而不是 404）
- `INTERNAL_ERROR` (500): 服务器内部错误

### 6.2 错误响应格式

所有错误响应统一格式：

```json
{
  "error": {
    "code": "错误码",
    "message": "错误描述",
    "details": {}
  }
}
```

