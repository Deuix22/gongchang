# 出勤记录存储修正要求（追加存储，不覆盖历史）

## 背景
- 现有 `POST /api/leaders/{leaderId}/attendance` 后端实现以成员为唯一键覆盖旧记录，导致同一成员新提交覆盖了旧日期的数据，数据库中仅剩少量记录（如图示仅 507 行）。
- 需求：**每天的出勤提交都必须被保存**，不能因为新提交而丢失历史。

## 接口要求调整
1. **唯一键**：以 `leaderId + memberId + recordDate` 作为唯一键。
2. **写入策略**：
   - 不同 `recordDate`：始终追加新记录，不覆盖历史。
   - 相同 `recordDate` 同一成员：保留最新一次提交（按 `submittedAt` 或 `_id` 新者覆盖旧者）。
3. **请求体字段**：
   - `recordDate`（必填）：`YYYY-MM-DD`，由前端在提交时传入（已上线）。
   - 其余字段与现有一致：`startTime`, `endTime`, `duration`, `shiftType`, `department`, `memberName`, `leaderId`, `submittedAt`。

## 数据库层建议
- 建立唯一索引：`uniq_leader_member_date (leaderId, memberId, recordDate) UNIQUE`。
- 写入逻辑：`insert ... on conflict (leaderId, memberId, recordDate) do update set <fields by latest submittedAt>`。
- 历史保留：不要按 `memberId` 全量覆盖；仅在同一 `recordDate` 时覆盖为当日最新。

## 兼容与迁移
- 旧数据无需变更；如已有覆盖，可保留现状，但后续写入应按新规则执行。
- 确认后端已接受并使用前端传入的 `recordDate` 字段；如缺失需快速热修。

## 验证要点
- 连续多日提交同一成员，数据库应新增多行（按 `recordDate` 区分）。
- 同一天多次提交同一成员，最终只保留当日最后一次记录。

