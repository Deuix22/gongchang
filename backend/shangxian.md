# 后端数据存储要求

## 概述

小程序上线后，不同账号会在不同手机上登录，因此**所有数据必须存储在后端**，不能依赖本地存储。管理员需要能够查看所有组长的数据。

## 1. 出勤记录存储

### 1.1 提交出勤记录
- **接口**: `POST /api/leaders/{leaderId}/attendance`
- **要求**: 
  - 所有出勤记录必须保存到后端数据库
  - 以 `memberId` 为唯一键，覆盖旧记录
  - 必须包含：`memberId`, `memberName`, `startTime`, `endTime`, `duration`, `department`, `leaderId`

### 1.2 查询出勤记录
- **接口**: `GET /api/leaders/{leaderId}/attendance`
- **要求**:
  - 组长只能查询自己的记录
  - **管理员可以查询所有组长的记录**（需要支持查询所有记录或按leaderId过滤）

## 2. 历史记录存储

### 2.1 保存历史记录
- **接口**: `POST /api/attendance/history`
- **要求**:
  - 所有历史记录必须保存到后端数据库
  - 必须包含：`leaderId`, `department`, `memberId`, `memberName`, `field`, `oldValue`, `newValue`, `changedBy`, `changedAt`
  - 前端已移除本地存储，完全依赖后端

### 2.2 查询历史记录
- **接口**: `GET /api/attendance/history`
- **查询参数**:
  - `leaderId` (可选): 如果提供，只返回该组长的记录
  - **如果不提供 `leaderId`，管理员应该能看到所有组长的历史记录**
  - `department` (可选): 按部门过滤
  - `memberName` (可选): 按组员姓名过滤
  - `start` (可选): 开始时间
  - `end` (可选): 结束时间
- **要求**:
  - 组长只能查询自己的历史记录（通过token中的leaderId自动过滤）
  - **管理员可以查询所有组长的历史记录**（不传leaderId时返回所有记录）

## 3. 缺勤汇总数据

### 3.1 数据来源
- 缺勤汇总数据来自历史记录中的 `daily_report` 类型记录
- **管理员需要能看到所有组长的缺勤汇总**

### 3.2 查询方式
- 使用 `GET /api/attendance/history` 接口
- 管理员不传 `leaderId` 参数，获取所有组长的 `daily_report` 记录
- 前端会过滤出 `field === 'daily_report'` 的记录并展示

## 4. 权限控制

### 4.1 组长权限
- 只能查看和修改自己的出勤记录
- 只能查看自己的历史记录（后端应自动过滤，只返回该组长的记录）

### 4.2 管理员权限
- 可以查看所有组长的出勤记录
- 可以查看所有组长的历史记录
- 可以查看所有组长的缺勤汇总
- 可以导出所有数据

## 5. 数据一致性要求

### 5.1 跨设备一致性
- 所有数据必须存储在后端
- 前端不再使用本地存储作为数据源（仅用于临时缓存）
- 确保不同设备登录同一账号时，看到的数据一致

### 5.2 数据完整性
- 出勤记录必须包含完整的字段：`memberId`, `memberName`, `department`, `leaderId`
- 历史记录必须包含完整的字段：`leaderId`, `department`, `memberId`, `memberName`, `field`, `oldValue`, `newValue`
- 确保管理员导出时能正确识别组别和组长

## 6. 前端已完成的改造

### 6.1 历史记录
- ✅ 已移除本地存储的保存逻辑
- ✅ 已移除本地存储的读取逻辑（不再作为fallback）
- ✅ 所有历史记录只保存到后端
- ✅ 所有历史记录只从后端获取

### 6.2 缺勤汇总
- ✅ 已移除本地存储的读取逻辑（不再作为fallback）
- ✅ 所有数据只从后端获取

### 6.3 出勤记录
- ✅ 已实现从后端获取原始记录（用于对比并记录历史）
- ✅ 提交时优先从后端获取原始记录，确保跨设备一致性

## 7. 后端需要确保的功能

### 7.1 必须实现
1. ✅ `POST /api/attendance/history` - 保存历史记录
2. ✅ `GET /api/attendance/history` - 查询历史记录（支持管理员查询所有记录）
3. ✅ `GET /api/leaders/{leaderId}/attendance` - 查询出勤记录（支持管理员查询所有记录）
4. ✅ `POST /api/leaders/{leaderId}/attendance` - 提交出勤记录

### 7.2 权限验证
- 组长只能访问自己的数据
- 管理员可以访问所有组长的数据
- 确保API正确识别用户角色并返回相应数据

### 7.3 数据查询
- 当管理员调用 `GET /api/attendance/history` 且不传 `leaderId` 时，应返回所有组长的历史记录
- 当管理员调用 `GET /api/leaders/{leaderId}/attendance` 时，应能查询任意组长的记录
- 确保返回的数据包含完整的字段，便于前端展示和导出

