# 仓储系统 - 管理查询 API

> **汇总文档（推荐后端阅读）**：[`backend-warehouse-api.md`](./backend-warehouse-api.md)

前端页面：`pages/warehouse/manage-query`

## 功能

按**生产批号**、**机型（销售型号）**追溯出入库情况，支持单独或组合查询。

## 查询接口

`GET /api/warehouse/manage-query/trace`

### 查询参数

| 参数 | 说明 |
|------|------|
| `productionBatchNo` | 完整生产批号，如 `GR-HFYZBU26040149` |
| `batchKey` | 8 位批次匹配码，如 `26040149` |
| `salesModel` | 机型 / 销售型号，支持模糊匹配 |

至少传 `productionBatchNo`、`batchKey`、`salesModel` 之一；可组合使用（AND）。

### 响应示例

```json
{
  "list": [
    {
      "id": "trace_001",
      "batchKey": "26040149",
      "productionBatchNo": "GR-HFYZBU26040149",
      "salesModel": "S.XG01Z BCW.6",
      "productCode": "002.027.0004083",
      "customerName": "创维电器股份有限公司",
      "customerOrderNo": "N032402-000494-001",
      "deliveryNoteNo": "HFYD260519023630",
      "todayInboundQuantityPcs": 500,
      "todayOutboundQuantityPcs": 200,
      "cumulativeInboundQuantityPcs": 4500,
      "cumulativeOutboundQuantityPcs": 1500,
      "cumulativeRemainingQuantityPcs": 3000
    }
  ],
  "summary": {
    "todayInboundQuantityPcs": 500,
    "todayOutboundQuantityPcs": 200,
    "cumulativeInboundQuantityPcs": 4500,
    "cumulativeOutboundQuantityPcs": 1500,
    "cumulativeRemainingQuantityPcs": 3000
  }
}
```

`summary` 可选；未返回时前端按 `list` 自动汇总。

### 字段说明

| 字段 | 说明 |
|------|------|
| `todayInboundQuantityPcs` | 今日入库数量（当日送货单登记等） |
| `todayOutboundQuantityPcs` | 今日出库数量（当日出货比对确认） |
| `cumulativeInboundQuantityPcs` | 累计入库数量 |
| `cumulativeOutboundQuantityPcs` | 累计出库数量 |
| `cumulativeRemainingQuantityPcs` | 累计剩余可出 = 累计入库 - 累计出库 |

### 统计口径建议

- **入库**：来源于送货单明细 `quantityPcs`，按 `productionBatchNo` + `salesModel` 分组
- **出库**：来源于出货记录表（出货比对 `scan-compare/ship`）
- **今日**：按服务器当日 0:00–24:00（或业务时区）过滤
- **剩余**：`cumulativeInboundQuantityPcs - cumulativeOutboundQuantityPcs`

### 无数据

```json
{
  "list": [],
  "summary": null
}
```

## 权限

- Bearer Token，与送货单、出货比对接口一致
