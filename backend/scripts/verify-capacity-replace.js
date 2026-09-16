#!/usr/bin/env node
/**
 * 产能提报整单覆盖 + 自定义时段 联调验证
 * 用法：node scripts/verify-capacity-replace.js
 */
import mongoose from 'mongoose';
import config from '../src/config/env.js';
import CapacityReport from '../src/models/CapacityReport.js';

const BASE = `http://127.0.0.1:${config.port}`;
const TEST_DATE = '2026-05-28';
const TEST_PREFIX = `verify_${Date.now()}`;
const BUSINESS = {
  reportDate: TEST_DATE,
  productionLine: 'DIP6线',
  teamLeader: `${TEST_PREFIX}_组长`,
  submitter: `${TEST_PREFIX}_提交人`
};

let passed = 0;
let failed = 0;
let token = '';
let recordId = '';

function assert (cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✅ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${msg}`);
  }
}

async function api (method, path, body, { auth = true, expectStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (expectStatus != null && res.status !== expectStatus) {
    throw new Error(`${method} ${path} 期望 ${expectStatus} 实际 ${res.status}: ${text}`);
  }
  return { status: res.status, json };
}

function slot (startTime, endTime, overrides = {}) {
  return {
    timeRange: `${startTime}-${endTime}`,
    startTime,
    endTime,
    machineModel: '机型-A',
    productionMinutes: 120,
    productionHours: 2,
    standardCapacity: 600,
    actualCapacity: 1000,
    standardManpower: 10,
    actualManpower: 10,
    ...overrides
  };
}

async function ensureMeta () {
  const { json } = await api('GET', '/api/performance/capacity/meta', null, { auth: false });
  const lines = json?.lines ?? [];
  const models = json?.models ?? [];
  const processes = json?.processes ?? [];
  const modelConfigs = json?.modelConfigs ?? {};
  const nextProcesses = [...new Set([...processes, '包装段', '插件段'])];
  const nextModelConfigs = {
    ...modelConfigs,
    '机型-A': {
      ...(modelConfigs['机型-A'] ?? {}),
      包装段: modelConfigs['机型-A']?.包装段 ?? { singleWorkHours: 1.1, standardCapacity: 600, standardManpower: 10 },
      插件段: modelConfigs['机型-A']?.插件段 ?? { singleWorkHours: 1.1, standardCapacity: 600, standardManpower: 10 }
    },
    '机型-B': {
      ...(modelConfigs['机型-B'] ?? {}),
      包装段: modelConfigs['机型-B']?.包装段 ?? { singleWorkHours: 1.3, standardCapacity: 480, standardManpower: 8 },
      插件段: modelConfigs['机型-B']?.插件段 ?? { singleWorkHours: 1.3, standardCapacity: 480, standardManpower: 8 }
    }
  };
  const needsUpdate =
    !lines.includes('DIP6线') ||
    models.length === 0 ||
    nextProcesses.length > processes.length ||
    !modelConfigs['机型-A']?.插件段;
  if (needsUpdate) {
    await api('PUT', '/api/performance/capacity/meta', {
      lines: [...new Set([...lines, 'DIP1线', 'DIP6线'])],
      models: [...new Set([...models, '机型-A', '机型-B'])],
      processes: nextProcesses,
      modelConfigs: nextModelConfigs
    });
  }
}

async function cleanup () {
  await CapacityReport.deleteMany({
    format: 'v2',
    teamLeader: BUSINESS.teamLeader
  });
}

async function login () {
  const { status, json } = await api('POST', '/api/auth/login-admin', {
    username: 'admin',
    password: '030426'
  }, { auth: false });
  if (status !== 200 || !json?.token) {
    throw new Error(`登录失败: ${JSON.stringify(json)}`);
  }
  token = json.token;
  console.log('已登录 admin');
}

async function submit (payload) {
  return api('POST', '/api/performance/capacity', {
    replaceExisting: true,
    processSegment: '包装段',
    machineModel: '机型-A',
    personInCharge: '负责人',
    reasonRemark: '',
    singleWorkHours: 1.1,
    ...BUSINESS,
    ...payload
  });
}

async function listByBusinessKey () {
  const q = new URLSearchParams({
    reportDate: BUSINESS.reportDate,
    productionLine: BUSINESS.productionLine,
    teamLeader: BUSINESS.teamLeader,
    submitter: BUSINESS.submitter,
    pageSize: '20'
  });
  return api('GET', `/api/performance/capacity?${q}`);
}

async function countDbRecords (processSegment) {
  const filter = {
    format: 'v2',
    reportDate: BUSINESS.reportDate,
    productionLine: BUSINESS.productionLine,
    teamLeader: BUSINESS.teamLeader,
    submitter: BUSINESS.submitter
  };
  if (processSegment) {
    filter.processSegment = processSegment;
  }
  return CapacityReport.countDocuments(filter);
}

async function runTests () {
  console.log('\n=== 1. 首次提交 2 个时段 ===');
  const r1 = await submit({
    timeSlots: [
      slot('08:00', '10:30'),
      slot('10:30', '12:00', { machineModel: '机型-B', actualCapacity: 580 })
    ]
  });
  assert(r1.status === 200, '提交成功 200');
  assert(r1.json?.success === true, 'success=true');
  assert(!!r1.json?.id, '响应含 id');
  recordId = r1.json.id;
  assert(r1.json?.data?.timeSlots?.length === 2, '返回 2 个时段');
  const db1 = await countDbRecords();
  assert(db1 === 1, `库中仅 1 条记录（实际 ${db1}）`);

  console.log('\n=== 2. 带 id 修改第 1 时段产量 ===');
  const r2 = await submit({
    id: recordId,
    timeSlots: [
      slot('08:00', '10:30', { actualCapacity: 980 }),
      slot('10:30', '12:00', { machineModel: '机型-B', actualCapacity: 580 })
    ]
  });
  assert(r2.status === 200, '覆盖提交成功');
  assert(r2.json.id === recordId, '仍为同一条记录 id');
  assert(r2.json?.data?.timeSlots?.[0]?.actualCapacity === 980, '产量已更新为 980');
  const db2 = await countDbRecords();
  assert(db2 === 1, '库中仍仅 1 条');

  console.log('\n=== 3. 删除第 2 时段后提交 ===');
  const r3 = await submit({
    id: recordId,
    timeSlots: [slot('08:00', '10:30', { actualCapacity: 980 })]
  });
  assert(r3.status === 200, '删除后提交成功');
  assert(r3.json?.data?.timeSlots?.length === 1, '仅剩 1 个时段');
  const doc3 = await CapacityReport.findOne({ reportId: recordId }).lean();
  assert(doc3?.timeSlots?.length === 1, '库中 timeSlots 仅 1 个');
  assert(!doc3?.timeSlots?.some(s => s.endTime === '12:00'), '10:30-12:00 已删除');

  console.log('\n=== 4. 修改主表 reasonRemark ===');
  const r4 = await submit({
    id: recordId,
    reasonRemark: '修正产量',
    timeSlots: [slot('08:00', '10:30', { actualCapacity: 980 })]
  });
  assert(r4.json?.data?.reasonRemark === '修正产量', 'reasonRemark 已更新');

  console.log('\n=== 5. GET 四元组精确查询回显 ===');
  const r5 = await listByBusinessKey();
  assert(r5.status === 200, 'GET 200');
  assert(r5.json?.total >= 1, 'total >= 1');
  const item = r5.json?.list?.[0];
  assert(!!item?.id, '列表含 id');
  assert(!!item?.updatedAt, '列表含 updatedAt');
  assert(item?.timeSlots?.[0]?.startTime === '08:00', 'timeSlots 含 startTime');
  assert(item?.timeSlots?.[0]?.endTime === '10:30', 'timeSlots 含 endTime');
  assert(item?.timeSlots?.[0]?.machineModel === '机型-A', 'timeSlots 含 machineModel');

  console.log('\n=== 6. 同一主键连续提交 3 次 ===');
  for (let i = 0; i < 3; i++) {
    await submit({
      id: recordId,
      timeSlots: [slot('08:00', '10:30', { actualCapacity: 900 + i })]
    });
  }
  const db6 = await countDbRecords();
  assert(db6 === 1, `连续 3 次后库中仍 1 条（实际 ${db6}）`);
  const latest = await CapacityReport.findOne({ reportId: recordId }).lean();
  assert(latest?.timeSlots?.[0]?.actualCapacity === 902, '最后一次产量为 902');

  console.log('\n=== 7. replaceExisting: false 拒绝 ===');
  try {
    await api('POST', '/api/performance/capacity', {
      replaceExisting: false,
      ...BUSINESS,
      processSegment: '包装段',
      machineModel: '机型-A',
      personInCharge: '负责人',
      timeSlots: [slot('08:00', '10:30')]
    }, { expectStatus: 400 });
    assert(true, 'replaceExisting:false 返回 400');
  } catch (e) {
    assert(false, e.message);
  }

  console.log('\n=== 8. 同请求内重复时段拒绝 ===');
  const r8 = await submit({
    timeSlots: [
      slot('08:00', '09:30'),
      slot('08:00', '09:30')
    ]
  });
  assert(r8.status === 400, `重复时段返回 400（实际 ${r8.status}）`);
  assert(r8.json?.error?.message?.includes('重复'), '错误信息含「重复」');

  console.log('\n=== 9. 自定义半小时时段 08:30-11:00 ===');
  const customBiz = { ...BUSINESS, teamLeader: `${TEST_PREFIX}_custom`, submitter: `${TEST_PREFIX}_custom` };
  const r9 = await api('POST', '/api/performance/capacity', {
    replaceExisting: true,
    ...customBiz,
    processSegment: '包装段',
    machineModel: '机型-A',
    personInCharge: '负责人',
    timeSlots: [slot('08:30', '11:00')]
  });
  assert(r9.status === 200, '自定义时段提交成功');
  assert(r9.json?.data?.timeSlots?.[0]?.startTime === '08:30', 'startTime=08:30');
  assert(r9.json?.data?.timeSlots?.[0]?.endTime === '11:00', 'endTime=11:00');
  await CapacityReport.deleteMany({ teamLeader: customBiz.teamLeader });

  console.log('\n=== 10. 无 id 按业务主键覆盖（非新建） ===');
  const r10 = await submit({
    timeSlots: [slot('08:00', '10:30', { actualCapacity: 777 })]
  });
  assert(r10.json.id === recordId, '无 id 仍命中同记录');
  assert(r10.json?.data?.timeSlots?.[0]?.actualCapacity === 777, '产量覆盖为 777');

  console.log('\n=== 11. 人力总达成率：08:00-22:00 重叠时段纳入 ===');
  const rateBiz = { ...BUSINESS, teamLeader: `${TEST_PREFIX}_rate`, submitter: `${TEST_PREFIX}_rate` };
  await api('POST', '/api/performance/capacity', {
    replaceExisting: true,
    ...rateBiz,
    processSegment: '包装段',
    machineModel: '机型-A',
    personInCharge: '负责人',
    timeSlots: [
      { ...slot('08:00', '10:00'), outputHours: 10, attendanceHours: 20 },
      { ...slot('22:00', '23:30'), outputHours: 100, attendanceHours: 100 }
    ]
  });
  const r11 = await api('GET', `/api/performance/capacity?${new URLSearchParams({
    reportDate: rateBiz.reportDate,
    productionLine: rateBiz.productionLine,
    teamLeader: rateBiz.teamLeader,
    submitter: rateBiz.submitter,
    pageSize: '5'
  })}`);
  const rate = r11.json?.list?.[0]?.manpowerTotalAchievementRate;
  assert(rate === 50, `人力总达成率=50%（08:00-10:00 纳入，22:00-23:30 排除，实际 ${rate}）`);
  await CapacityReport.deleteMany({ teamLeader: rateBiz.teamLeader });

  console.log('\n=== 12. 同一组长同日多制程段独立存储 ===');
  const multiBiz = { ...BUSINESS, teamLeader: `${TEST_PREFIX}_multi`, submitter: `${TEST_PREFIX}_multi` };
  const recordKeyPack = `${multiBiz.reportDate}__${multiBiz.productionLine}__${multiBiz.teamLeader}__包装段`;
  const recordKeyPlugin = `${multiBiz.reportDate}__${multiBiz.productionLine}__${multiBiz.teamLeader}__插件段`;

  const r12a = await api('POST', '/api/performance/capacity', {
    replaceExisting: true,
    ...multiBiz,
    recordKey: recordKeyPack,
    processSegment: '包装段',
    machineModel: '机型-A',
    personInCharge: '负责人',
    timeSlots: [slot('08:00', '10:30', { actualCapacity: 500 })]
  });
  assert(r12a.status === 200, '包装段提交成功');
  const packId = r12a.json.id;

  const r12b = await api('POST', '/api/performance/capacity', {
    replaceExisting: true,
    ...multiBiz,
    recordKey: recordKeyPlugin,
    processSegment: '插件段',
    machineModel: '机型-A',
    personInCharge: '负责人',
    timeSlots: [slot('10:30', '12:00', { actualCapacity: 600 })]
  });
  assert(r12b.status === 200, '插件段提交成功');
  assert(r12b.json.id !== packId, '插件段为独立记录 id');

  const db12 = await CapacityReport.countDocuments({
    format: 'v2',
    reportDate: multiBiz.reportDate,
    productionLine: multiBiz.productionLine,
    teamLeader: multiBiz.teamLeader,
    submitter: multiBiz.submitter
  });
  assert(db12 === 2, `同日同组长两制程段库中 2 条（实际 ${db12}）`);

  const r12c = await api('GET', `/api/performance/capacity?${new URLSearchParams({
    reportDate: multiBiz.reportDate,
    productionLine: multiBiz.productionLine,
    teamLeader: multiBiz.teamLeader,
    submitter: multiBiz.submitter,
    pageSize: '20'
  })}`);
  assert(r12c.json?.total === 2, `列表返回 2 条（实际 ${r12c.json?.total}）`);
  const segments = (r12c.json?.list ?? []).map(item => item.processSegment).sort();
  assert(segments.join(',') === '包装段,插件段', `列表含 processSegment（实际 ${segments.join(',')}）`);

  const r12d = await api('POST', '/api/performance/capacity', {
    replaceExisting: true,
    ...multiBiz,
    recordKey: recordKeyPack,
    processSegment: '包装段',
    machineModel: '机型-A',
    personInCharge: '负责人',
    timeSlots: [slot('08:00', '10:30', { actualCapacity: 888 })]
  });
  assert(r12d.json.id === packId, 'recordKey 命中包装段记录');
  assert(r12d.json?.data?.timeSlots?.[0]?.actualCapacity === 888, '包装段整单覆盖成功');
  const db12After = await CapacityReport.countDocuments({
    format: 'v2',
    reportDate: multiBiz.reportDate,
    productionLine: multiBiz.productionLine,
    teamLeader: multiBiz.teamLeader,
    submitter: multiBiz.submitter
  });
  assert(db12After === 2, `覆盖后仍为 2 条（实际 ${db12After}）`);
  await CapacityReport.deleteMany({ teamLeader: multiBiz.teamLeader });
}

async function main () {
  console.log('连接数据库...');
  await mongoose.connect(config.mongodbUri, { dbName: config.mongodbDbName });

  await cleanup();

  console.log(`启动验证（服务须已在 ${BASE} 运行）...`);
  try {
    await fetch(`${BASE}/api/performance/capacity/meta`);
  } catch {
    console.error(`无法连接 ${BASE}，请先运行: npm start`);
    process.exit(1);
  }

  await login();
  await ensureMeta();
  await runTests();
  await cleanup();

  await mongoose.disconnect();

  console.log(`\n========== 结果: ${passed} 通过, ${failed} 失败 ==========`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async err => {
  console.error('验证异常:', err);
  try {
    await mongoose.disconnect();
  } catch { /* ignore */ }
  process.exit(1);
});
