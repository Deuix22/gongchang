# 仓储系统 - 出货比对 API

> **汇总文档（推荐后端阅读）**：[`backend-warehouse-api.md`](./backend-warehouse-api.md)

前端页面：`pages/warehouse/scan-compare`

## 编码规则

| 类型 | 格式 | 示例 |
|------|------|------|
| 生产批号 | `GR-HFYZBU` + 8位数字 + **可选后缀** | `GR-HFYZBU26040149`、`GR-HFYZBU2603014502B` |
| 箱单号 | `HFSYHFYZBU` + 8位数字 + **可选后缀** + 6位流水 | `HFSYHFYZBU26040149000001`、`HFSYHFYZBU2607055201H000001` |

**批号/箱单后缀（正常情况）**：均可带 `01H` / `02H` / `01B` / `02B` 等（2 位数字 + 1 位字母）。  
**箱单结构注意**：后缀在 **6 位流水号之前**（`…26070552` + `01H` + `000001`），不是缀在整串末尾。

**匹配规则**：一律取 **8 位 `batchKey`**。流水号与后缀均不参与匹配，但出货记录应保存完整 `boxNo`。

## 1. 查询比对

`GET /api/warehouse/scan-compare/lookup`

### 查询参数（二选一或同时传）

| 参数 | 说明 |
|------|------|
| `boxNo` | 完整箱单号 |
| `batchKey` | 8 位批次匹配码（可由箱单号或批号解析） |

### 逻辑

1. 从 `boxNo` 或 `batchKey` 得到 8 位 `batchKey`
2. 在送货单明细中查找 `productionBatchNo` 含该 8 位的记录（建议规范为 `GR-HFYZBU{batchKey}`）
3. **未找到** → HTTP 404 或 `{ "matched": false, "message": "..." }`
4. **找到** → 汇总该批次登记数量、已出货数量、剩余可出数量

### 响应示例（matched）

```json
{
  "matched": true,
  "batchKey": "26040149",
  "productionBatchNo": "GR-HFYZBU26040149",
  "customerName": "创维电器股份有限公司",
  "shippingDate": "2026-05-19",
  "customerOrderNo": "N032402-000494-001",
  "salesModel": "S.XG01Z BCW.6",
  "productCode": "002.027.0004083",
  "deliveryNoteNo": "HFYD260519023630",
  "totalQuantityPcs": 4500,
  "shippedQuantityPcs": 1500,
  "remainingQuantityPcs": 3000
}
```

### 响应示例（未登记）

```json
{
  "matched": false,
  "message": "该箱单对应批次未在送货单中登记"
}
```

**余量计算**：

- `totalQuantityPcs`：同一 `batchKey` 下送货单明细 `quantityPcs` 之和
- `shippedQuantityPcs`：出货记录表累计
- `remainingQuantityPcs` = total - shipped

## 2. 确认出货

`POST /api/warehouse/scan-compare/ship`

### 请求体

```json
{
  "boxNo": "HFSYHFYZBU26040149000001",
  "batchKey": "26040149",
  "productionBatchNo": "GR-HFYZBU26040149",
  "quantityPcs": 500
}
```

### 逻辑

1. 再次校验该 `batchKey` 在送货单中存在
2. 校验 `quantityPcs` ≤ `remainingQuantityPcs`
3. **若带 `boxNo`：校验该箱单未出过货（全局唯一）**；已出货则拒绝，见专项文档
4. 写入出货记录（含箱单号、批次、数量、操作人、时间）
5. 返回更新后的余量

> **箱单唯一校验（必须）**：[`backend-warehouse-box-unique.md`](./backend-warehouse-box-unique.md)  
> 重复出货建议返回 HTTP 409，`error.code = BOX_ALREADY_SHIPPED`。

### 响应示例

```json
{
  "success": true,
  "shippedQuantityPcs": 2000,
  "remainingQuantityPcs": 2500
}
```

### 重复箱单错误示例

```json
{
  "error": {
    "code": "BOX_ALREADY_SHIPPED",
    "message": "该箱单已出货，不能重复扫描",
    "details": {
      "boxNo": "HFSYHFYZBU2607041401H000035",
      "shippedAt": "2026-08-13T10:21:00.000Z",
      "quantityPcs": 10
    }
  }
}
```

## 3. 数据表建议

### 出货记录 `warehouse_shipments`

| 字段 | 说明 |
|------|------|
| id | 主键 |
| box_no | 箱单号（**建议唯一索引**） |
| batch_key | 8 位匹配码 |
| production_batch_no | 生产批号 |
| quantity_pcs | 本次出货数量 |
| delivery_note_item_id | 可选，关联送货单明细 |
| operator_id | 操作人 |
| created_at | 时间 |

```sql
CREATE UNIQUE INDEX uk_warehouse_shipments_box_no ON warehouse_shipments (box_no);
```

## 4. 权限

- Bearer Token，与送货单录入接口一致
