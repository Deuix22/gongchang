# 产能基础数据维护接口（产线 / 型号 / 工序）

## 1. 背景与目标

绩效系统的「产能提报」和「工时统计」页面需要选择/使用以下基础数据：

- 产线（`productionLine`）
- 型号（`model`）
- 生产工序（`process`）
- 按型号配置的**单台工时**（`modelWorktimes`，即某型号标准生产一台产品所需工时）

目前这些数据需要在前端手动维护，且不同设备之间无法共享。为了解决「多设备共享同一套配置」的问题，本接口用于将上述基础数据统一保存在后端，由 admin 用户维护，所有登录用户均可在相关页面通过下拉框和默认值选择。

---

## 2. 鉴权与通用约定

- 所有接口路径均在绩效前缀下，例如：`/api/performance/...`。  
  前端调用时使用 `/performance/...`，由网关或服务统一加上 `/api` 前缀。
- 所有请求必须携带：
  - `Authorization: Bearer <token>`
  - 其中 `<token>` 为登录接口下发的 JWT 访问令牌。
- 仅 **admin / 管理员角色** 允许修改配置（保存接口）；普通用户只可读取。
- 错误响应建议沿用项目统一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息",
    "details": {}
  }
}
```

---

## 3. 获取产能基础数据

- **方法**：`GET`
- **路径**：`/api/performance/capacity/meta`
- **说明**：返回当前可选的产线 / 型号 / 工序列表，以及按型号维护的单台工时，供前端下拉选择和默认值使用。

### 3.1 请求参数

无额外 Query 参数，仅依赖登录用户信息做权限判断。

### 3.2 成功响应

```json
{
  "lines": ["DIP1线", "DIP2线", "DIP3线"],
  "models": ["ABC-01", "XYZ-02"],
  "processes": ["贴片", "插件", "测试"],
  "modelWorktimes": {
    "ABC-01": 1.5,
    "XYZ-02": 2
  }
}
```

**字段说明**：

- `lines`：产线列表（字符串数组），给前端 `productionLine` 下拉使用。
- `models`：型号列表（字符串数组），给前端 `model` 下拉使用。
- `processes`：生产工序列表（字符串数组），给前端 `process` 下拉使用。
- `modelWorktimes`：按型号维护的单台工时映射，键为型号字符串，值为该型号的标准单台工时（单位：小时，支持小数，例如 `1.5` 小时）。  
  - 若某型号暂未配置单台工时，可以在此字段中不出现该 key，前端会视为「未设置默认值」。
- 若某一数组项暂未维护，建议返回空数组 `[]`，而不是 `null`；`modelWorktimes` 建议返回对象（即便为空 `{}`）。

### 3.3 错误响应

- `401 UNAUTHORIZED`：未登录或 Token 过期。
- 其他错误码按统一错误格式返回。

前端行为：

- 调用失败时，前端会退回到默认产线（DIP1～DIP7）+ 空制程段，不会阻塞页面使用。
- **重要**：`POST /performance/capacity` 的 `productionLine` 校验必须与本文 `lines` 一致，完整说明见 `backend-capacity-frontend-changes-checklist.md`。

---

## 4. 保存产能基础数据（仅 admin）

- **方法**：`PUT`
- **路径**：`/api/performance/capacity/meta`
- **说明**：保存一整套「产线 / 型号 / 工序」配置，覆盖旧值。
- **权限**：仅 admin / 管理员可调用（后端需在中间件或控制器上做角色校验）。

### 4.1 请求体（Body）

```json
{
  "lines": ["DIP1线", "DIP2线", "DIP3线"],
  "models": ["ABC-01", "XYZ-02"],
  "processes": ["贴片", "插件", "测试"],
  "modelWorktimes": {
    "ABC-01": 1.5,
    "XYZ-02": 2
  }
}
```

#### 字段说明

| 字段            | 类型                 | 必填 | 说明                                                |
|-----------------|----------------------|------|-----------------------------------------------------|
| `lines`         | string[]             | 否   | 产线列表，字符串数组                                |
| `models`        | string[]             | 否   | 型号列表，字符串数组                                |
| `processes`     | string[]             | 否   | 生产工序列表，字符串数组                            |
| `modelWorktimes` | object (map)       | 否   | 单台工时映射：key 为型号，value 为小时数（number） |

- 为空或缺省时，后端可按照「空数组 / 空对象」处理，例如：
  - 未传 `lines` 表示不修改产线，或整体覆盖为空，由后端自行约定。
  - 前端当前实现总是会同时传三项（都为数组），可按整体覆盖实现。

### 4.2 校验建议

- 鉴权：
  - 必须验证调用者为 admin / 管理员，否则返回 `403 FORBIDDEN`。
- 数据校验：
  - 每个数组元素为非空字符串（去首尾空格后长度 > 0）。
  - `modelWorktimes` 中的 key 应当存在于 `models` 数组中，多余的 key 后端可忽略或报错，由实现约定。
  - `modelWorktimes` 中的 value 为非负数字（`>= 0`，单位小时，支持小数）。
  - 可选：限制单项长度（如 1～50 字符），以及列表长度上限（如每类最多 200 条）。
  - 可选：对产线做统一格式限制，如必须以 `DIP` 开头。

### 4.3 成功响应

返回简单成功结果即可，例如：

```json
{
  "success": true
}
```

或：

```json
{
  "success": true,
  "data": {
    "lines": ["DIP1线", "DIP2线"],
    "models": ["ABC-01"],
    "processes": ["贴片"]
  }
}
```

前端对 `PUT /capacity/meta` 的成功条件仅为 **2xx 不抛错**，不依赖具体字段。

### 4.4 错误响应

示例：

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "仅管理员可修改产能基础数据"
  }
}
```

---

## 5. 前端调用约定（实现说明）

### 5.1 维护页面：`/pages/performance/capacity-config`

- 入口：仅 `admin` 在「产能提报」页看到「产能基础数据维护」入口。
- 打开页面后：
  - 先校验本地 `userRole`（非 admin 直接提示并返回）。
  - 调用 `GET /performance/capacity/meta` 拉取当前配置。
- 用户在页面上可以：
  - 新增 / 删除 产线、型号、生产工序；
  - 每次新增或删除后，前端立即调用 `PUT /performance/capacity/meta` 写回。

前端保存逻辑（伪代码）：

```ts
await saveCapacityMeta({
  lines,          // 产线数组
  models,         // 型号数组
  processes,      // 工序数组
  modelWorktimes, // 按型号的单台工时映射，如 { 'ABC-01': 1.5 }
})
```

### 5.2 产能提报页面：`/pages/performance/capacity`

- 页面加载时：
  1. 从本地 `userRole` 判断当前用户是否 admin，用于决定是否显示维护入口；
  2. 调用 `GET /performance/capacity/meta` 获取：
     - `lines`：若非空，用作产线下拉选项；
     - `models`：型号下拉选项；
     - `processes`：工序下拉选项。
  3. 如果 `lines` 为空，则继续调用旧接口 `GET /performance/capacity/lines` 兜底。

- 所有用户（包括非 admin）在提报时：
  - 只能从后端返回的列表中选择「产线 / 型号 / 工序」，不能手填自由文本。

---

## 6. 与现有接口的关系

- 原有接口保持不变：
  - `POST /api/performance/capacity`：提交单条产能记录；
  - `GET /api/performance/capacity`：产能列表查询；
  - `GET /api/performance/capacity/lines`：原有产线枚举接口（作为兜底）。
- 新增本次接口：
  - `GET /api/performance/capacity/meta`：获取产能基础数据（产线 / 型号 / 工序）；
  - `PUT /api/performance/capacity/meta`：保存产能基础数据（仅 admin）。

通过上述两个新接口，产线、型号、工序的可选项可以在 **后端统一维护并持久化**，前端所有设备与用户共享同一份配置。前端已完成对接，后端只需按本文档实现即可联调。

