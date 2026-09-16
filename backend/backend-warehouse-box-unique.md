# 仓储出货比对：箱单号唯一校验（后端配合）

> **背景**：同一箱单号（如 `HFSYHFYZBU2607041401H000035`）被重复扫描时，不应再次扣减库存。  
> 前端已有本地去重，但换设备 / 清缓存 / 多人同时扫仍会漏拦，**必须以服务端唯一校验为准**。  
> **前端页面**：`pages/warehouse/scan-compare`  
> **接口**：`POST /api/warehouse/scan-compare/ship`  
> **日期**：2026-08-13

---

## 1. 结论（请后端实现）

| 项 | 要求 |
|----|------|
| 唯一键 | 完整 `boxNo`（含前缀、批次、可选后缀、流水号） |
| 校验时机 | 写入出货记录**之前**（建议事务 + 唯一索引） |
| 已存在时 | **拒绝出货**，返回明确业务错误，**不得**扣减余量 |
| 空箱单号 | 若请求未带 `boxNo`（仅批号手输），可不做箱单唯一校验，但仍须校验余量 |

---

## 2. 业务规则

1. 每一箱物理箱对应一个唯一 `boxNo`，一生只允许成功出货 **1 次**。  
2. 无论中间是否扫过其它箱，再次提交相同 `boxNo` 都必须失败。  
3. 比较时建议规范化后再判重：
   - 去空格、转大写
   - 去掉多余连字符（若有）
   - 例：`HFSYHFYZBU2607041401H000035`  
4. `batchKey` / `productionBatchNo` 用于余量与批次匹配；**唯一性只针对 `boxNo`**，不要用 `batchKey` 当唯一键。

---

## 3. 接口行为

### 3.1 请求（现有，不变）

`POST /api/warehouse/scan-compare/ship`

```json
{
  "boxNo": "HFSYHFYZBU2607041401H000035",
  "batchKey": "26070414",
  "productionBatchNo": "GR-HFYZBU2607041401H",
  "quantityPcs": 10
}
```

### 3.2 处理顺序（推荐）

1. 鉴权  
2. 参数校验（`quantityPcs` > 0；有 `boxNo` 或 `batchKey`）  
3. 规范化 `boxNo`  
4. **若 `boxNo` 非空：查询出货表是否已存在该箱单**  
   - 已存在 → 直接返回错误（见下），结束  
5. 按 `batchKey` 校验送货单登记存在、余量充足  
6. **事务内**插入出货记录（依赖唯一索引防并发双写）并更新汇总  
7. 返回成功余量  

### 3.3 重复出货错误响应（请统一）

HTTP：**409 Conflict**（也可用 400，但推荐 409）

```json
{
  "error": {
    "code": "BOX_ALREADY_SHIPPED",
    "message": "该箱单已出货，不能重复扫描",
    "details": {
      "boxNo": "HFSYHFYZBU2607041401H000035",
      "shippedAt": "2026-08-13T10:21:00.000Z",
      "quantityPcs": 10,
      "operatorId": "user_xxx"
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `code` | 固定 `BOX_ALREADY_SHIPPED`，便于前端识别 |
| `message` | 中文提示，可直接展示 |
| `details.shippedAt` | 首次成功出货时间（可选，建议有） |
| `details.quantityPcs` | 首次出货数量（可选） |

### 3.4 成功响应（不变）

```json
{
  "success": true,
  "shippedQuantityPcs": 2000,
  "remainingQuantityPcs": 2500
}
```

---

## 4. 数据库建议

### 4.1 出货表 `warehouse_shipments`

| 字段 | 说明 |
|------|------|
| id | 主键 |
| box_no | **完整箱单号**（规范化后存储） |
| batch_key | 8 位匹配码 |
| production_batch_no | 完整生产批号（可含后缀） |
| quantity_pcs | 本次出货数量 |
| operator_id | 操作人 |
| created_at | 出货时间 |

### 4.2 唯一索引（必须）

```sql
-- box_no 非空时全局唯一
CREATE UNIQUE INDEX uk_warehouse_shipments_box_no
  ON warehouse_shipments (box_no);
```

说明：

- 若历史数据允许 `box_no` 为空（仅批号出货），唯一索引需兼容空值策略（MySQL 多 NULL 通常不冲突；PostgreSQL 可用部分唯一索引 `WHERE box_no IS NOT NULL`）。  
- 有 `boxNo` 的扫码出货路径：**必须写入非空 box_no**。  

### 4.3 并发

仅靠「先查后插」仍可能双请求同时通过。请：

1. 表上建唯一索引；  
2. 插入捕获唯一冲突 → 转成 `BOX_ALREADY_SHIPPED`；  
3. 整段「校验余量 + 插入」放同一事务（必要时对批次行加锁）。  

---

## 5. 可选增强

### 5.1 lookup 提前提示

`GET /api/warehouse/scan-compare/lookup?boxNo=...`

若该 `boxNo` 已出货，可在匹配成功时额外返回：

```json
{
  "matched": true,
  "batchKey": "26070414",
  "remainingQuantityPcs": 100,
  "boxAlreadyShipped": true,
  "boxShippedAt": "2026-08-13T10:21:00.000Z"
}
```

前端可据此直接提示，不必等到 ship。  
（非必须；**ship 唯一校验仍是硬要求**。）

### 5.2 管理端纠错

若误扫需要作废重出，建议单独提供「作废出货记录」管理接口，而不是允许同一 `boxNo` 再次 ship。

---

## 6. 前端现状（供对齐）

- 出货前会本地记录已出货 `boxNo`，重复扫会拦截。  
- 换机 / 清缓存无法依赖前端。  
- 后端返回 `BOX_ALREADY_SHIPPED`（或 message 含「已出货」「重复」）时，前端会弹窗提示，不扣本地记忆外的库存。  

---

## 7. 后端自检清单

- [ ] `warehouse_shipments.box_no` 有唯一索引  
- [ ] `POST .../ship` 在写入前检查箱单是否已出货  
- [ ] 重复时返回 `code: BOX_ALREADY_SHIPPED`，且**不扣余量**  
- [ ] 并发双请求只有一笔成功，另一笔收到唯一冲突错误  
- [ ] 存储的 `box_no` 为规范化完整串（与扫码原文一致语义）  

---

## 8. 相关文档

- 出货比对接口：[`backend-warehouse-scan-compare-api.md`](./backend-warehouse-scan-compare-api.md)  
- 仓储总览：[`backend-warehouse-api.md`](./backend-warehouse-api.md)  
