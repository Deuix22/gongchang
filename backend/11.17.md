# 后端改造清单：管理员导出 / 组长出勤同步

前端已实现以下逻辑：组长在小程序内批量填报后，调用 **POST `/api/leaders/{leaderId}/attendance`** 将数据写入后端；管理员在设置页点击 “提取表格 / 提取所有信息” 时，会优先拉取后端记录，没有数据才使用本地缓存。因此后端需补齐下列接口与数据格式，确保管理员能够导出真实的生产环境数据。

---

## 1. 组长出勤记录接口

### 1.1 新增 / 覆盖提交

- **Endpoint**: `POST /api/leaders/{leaderId}/attendance`
- **权限**: `leader`, `admin`
- **请求体示例**：
```json
{
  "records": [
    {
      "memberId": "member_001",
      "startTime": "2025-11-17T00:00:00.000Z",
      "endTime": "2025-11-17T10:00:00.000Z",
      "duration": 600,
      "shiftType": "day"
    }
  ],
  "submittedAt": "2025-11-17T06:36:54.839Z"
}
```
- **实现要求**：
  1. `leaderId` 为路径参数，需校验与 token 中身份一致或当前用户为 admin。
  2. 以 `memberId` 为唯一键覆盖旧记录，保证同一成员只保留最新一条。
  3. `startTime / endTime` 存储 ISO 字符串（UTC）；`duration` 单位分钟；`shiftType` 透传/day/night。
  4. 建议新增 `department` / `leaderName` 字段，便于管理员导出（可从用户表/组长信息填充）。
  5. 返回更新后的记录数量。

### 1.2 查询指定组长记录

- **Endpoint**: `GET /api/leaders/{leaderId}/attendance`
- **权限**: `leader`, `admin`, `manager`
- **响应示例**：
```json
{
  "records": [
    {
      "recordId": "att_001",
      "memberId": "member_001",
      "name": "组员名称",
      "department": "smt01线",
      "shiftType": "day",
      "startTime": "2025-11-17T00:00:00.000Z",
      "endTime": "2025-11-17T10:00:00.000Z",
      "duration": 600,
      "leaderId": "leader_8l3ute"
    }
  ]
}
```
- **实现要求**：
  1. 结果按成员或时间排序，方便前端直接过滤。
  2. 需保证列表包含 `name`、`department`、`leaderId`，否则管理员导出无法区分组别。
  3. 建议返回 `recordId` 便于后续删除或审计。

---

## 2. 管理员导出接口

虽然前端已能在本地拼装 Excel，但管理员仍应依赖后端数据，建议同步实现以下接口（若已存在请确认字段/权限一致）：

### 2.1 分组概览
- **Endpoint**: `GET /api/admin/attendance/groups`
- 返回部门、组名、`leaderId`、组长昵称等，用于设置页列表展示。

### 2.2 导出单组
- **Endpoint**: `POST /api/admin/attendance/export`
- 请求体含 `department`, `groupName`, `leaderId`, `startDate`, `endDate`。
- 后端执行查询并生成 Excel，返回下载链接或任务 ID。

### 2.3 导出全部
- **Endpoint**: `POST /api/admin/attendance/export/all`
- 请求体仅含日期范围，后端自行聚合所有组长记录。

> 如果短期内无法完成导出任务/下载链路，也至少需要确保 **GET `/api/leaders/{leaderId}/attendance`** 返回完整数据，这样前端即可直接生成 Excel。

---

## 3. 数据模型建议

| 字段          | 类型      | 说明                         |
|---------------|-----------|------------------------------|
| `leaderId`    | string    | 组长 ID（如 `leader_xxx`）    |
| `leaderName`  | string    | 组长昵称，导出时展示          |
| `department`  | string    | 部门 / 线别                  |
| `memberId`    | string    | 组员唯一 ID                  |
| `name`        | string    | 组员姓名                     |
| `shiftType`   | enum      | `day` / `night`              |
| `startTime`   | ISO string| UTC 时间                     |
| `endTime`     | ISO string| UTC 时间                     |
| `duration`    | number    | 单位：分钟                   |
| `submittedAt` | ISO string| 组长提交时间（可选）         |

---

## 4. 测试建议

1. 组长端在小程序提交批量出勤后，数据库应出现对应成员记录。
2. 调用 `GET /api/leaders/{leaderId}/attendance` 应能返回刚提交的数据。
3. 管理员端在设置页选择日期范围，点击 “提取表格”，能导出 Excel，且内容与后台数据库一致。
4. 校验权限：非本组长的 leader 不得读取/提交他人组的数据。

---

如需后端示例代码或 Mongoose Schema 模板，可进一步告知我使用的技术栈，我可以协助补充。祝开发顺利！

