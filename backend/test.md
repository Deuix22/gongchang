# 出勤记录索引与写入策略操作指引（后端）

目标：保证出勤记录“按日追加、不覆盖历史”，避免重复键错误。

## 1. 数据库索引
1) 删除旧索引（仅示例，按实际索引名执行）：
   - MongoDB shell: `db.attendancerecords.dropIndex("leaderId_1_memberId_1")`
   - 若索引名不确定，可先执行 `db.attendancerecords.getIndexes()`

2) 创建新唯一索引：
   - `db.attendancerecords.createIndex({ leaderId: 1, memberId: 1, recordDate: 1 }, { unique: true, name: "uniq_leader_member_date" })`

## 2. 写入（upsert）策略
- 唯一键：`leaderId + memberId + recordDate`
- 逻辑：
  - 不同 `recordDate`：直接插入（追加历史）。
  - 同一 `recordDate` 同一成员：以最新提交覆盖当日旧记录（建议按 `submittedAt` 或服务器时间比较，若请求无 `submittedAt` 则直接覆盖）。
- 伪代码（Mongo 示例）：
```js
for (const r of records) {
  db.attendancerecords.updateOne(
    { leaderId, memberId: r.memberId, recordDate: r.recordDate },
    {
      $set: {
        startTime: r.startTime,
        endTime: r.endTime,
        duration: r.duration,
        shiftType: r.shiftType,
        department: r.department,
        memberName: r.memberName,
        submittedAt: r.submittedAt || new Date().toISOString(),
        lastUpdatedBy: leaderId,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  )
}
```

## 3. 请求体要求
- 必填：`recordDate`（YYYY-MM-DD），前端已传；缺失时直接返回 400。
- 其他字段与现有接口一致：`memberId, startTime, endTime, duration, shiftType, department, memberName, submittedAt`。

## 4. 验证用例
1) 同一成员跨两天提交 -> 数据表新增两条，不抛唯一键错误，`recordDate` 分别为两天。
2) 同一成员同一天多次提交 -> 最终仅保留当日最后一次（字段以最新提交为准）。
3) 不传 `recordDate` -> 返回 400 参数错误。
4) 查询/导出返回包含 `recordDate` 字段。

## 5. 回滚/安全
- 删除旧索引前可先导出 `getIndexes()` 结果备份。
- 若需回滚，只需删除新索引，重新创建旧索引（不推荐恢复旧逻辑）。

