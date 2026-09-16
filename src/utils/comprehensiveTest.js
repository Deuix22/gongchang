// 综合测试脚本
// 用于创建完整的测试数据，验证所有功能

export const runComprehensiveTest = () => {
  console.log('🧪 开始综合测试...')
  
  // 1. 创建多个组长（包含不同部门）
  const leaders = [
    { nickName: '测试组长1', userId: 'test_leader_001', role: 'leader', department: 'SMT' },
    { nickName: '测试组长2', userId: 'test_leader_002', role: 'leader', department: 'SMT' },
    { nickName: '测试组长3', userId: 'test_leader_003', role: 'leader', department: 'DIP' }
  ]
  
  // 2. 创建组员（包含白班和夜班）
  const teamMembers = [
    // 白班组员
    { name: '白班组员1', id: Date.now() + 1, shiftType: 'day' },
    { name: '白班组员2', id: Date.now() + 2, shiftType: 'day' },
    { name: '白班组员3', id: Date.now() + 3, shiftType: 'day' },
    // 夜班组员
    { name: '夜班组员1', id: Date.now() + 4, shiftType: 'night' },
    { name: '夜班组员2', id: Date.now() + 5, shiftType: 'night' },
    { name: '夜班组员3', id: Date.now() + 6, shiftType: 'night' },
    // 混合测试
    { name: '混合组员1', id: Date.now() + 7, shiftType: 'day' },
    { name: '混合组员2', id: Date.now() + 8, shiftType: 'night' }
  ]
  
  // 保存组员
  uni.setStorageSync('teamMembers', teamMembers)
  console.log('✅ 已创建组员数据，包含白班和夜班')
  
  // 3. 创建出勤记录（包含白班和夜班，部分会触发异常）
  const attendanceRecords = {
    // 白班组员 - 正常
    '白班组员1': {
      name: '白班组员1',
      startTime: '08:00',
      endTime: '17:00',
      duration: '9小时',
      department: 'SMT',
      leaderId: '测试组长1'
    },
    // 白班组员 - 会触发"上班时间晚于8:00"异常
    '白班组员2': {
      name: '白班组员2',
      startTime: '09:00',
      endTime: '18:00',
      duration: '9小时',
      department: 'SMT',
      leaderId: '测试组长1'
    },
    // 白班组员 - 正常
    '白班组员3': {
      name: '白班组员3',
      startTime: '07:30',
      endTime: '16:30',
      duration: '9小时',
      department: 'SMT',
      leaderId: '测试组长2'
    },
    // 夜班组员 - 正常（不会触发8:00检查）
    '夜班组员1': {
      name: '夜班组员1',
      startTime: '20:00',
      endTime: '08:00',
      duration: '12小时',
      department: 'SMT',
      leaderId: '测试组长1'
    },
    // 夜班组员 - 正常（不会触发8:00检查，即使上班时间是9:00）
    '夜班组员2': {
      name: '夜班组员2',
      startTime: '21:00',
      endTime: '09:00',
      duration: '12小时',
      department: 'DIP',
      leaderId: '测试组长3'
    },
    // 混合组员
    '混合组员1': {
      name: '混合组员1',
      startTime: '08:00',
      endTime: '17:00',
      duration: '9小时',
      department: 'SMT',
      leaderId: '测试组长2'
    },
    '混合组员2': {
      name: '混合组员2',
      startTime: '22:00',
      endTime: '10:00',
      duration: '12小时',
      department: 'DIP',
      leaderId: '测试组长3'
    }
  }
  
  // 保存出勤记录
  uni.setStorageSync('attendanceRecords', attendanceRecords)
  console.log('✅ 已创建出勤记录，包含白班和夜班数据')
  
  // 4. 创建历史记录
  const history = [
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      group: 'SMT',
      memberName: '白班组员1',
      field: '上班时间',
      oldValue: '07:00',
      newValue: '08:00'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      group: 'SMT',
      memberName: '白班组员2',
      field: '下班时间',
      oldValue: '17:00',
      newValue: '18:00'
    },
    {
      timestamp: new Date(Date.now() - 180000).toISOString(),
      group: 'DIP',
      memberName: '夜班组员2',
      field: '上班时间',
      oldValue: '20:00',
      newValue: '21:00'
    }
  ]
  
  uni.setStorageSync('attendanceHistory', history)
  console.log('✅ 已创建历史记录')
  
  // 5. 创建部门信息
  uni.setStorageSync('leaderDepartment', 'SMT')
  console.log('✅ 已创建部门信息')
  
  console.log('')
  console.log('📊 测试数据统计：')
  console.log(`- 组员数量: ${teamMembers.length} (白班: ${teamMembers.filter(m => m.shiftType === 'day').length}, 夜班: ${teamMembers.filter(m => m.shiftType === 'night').length})`)
  console.log(`- 出勤记录: ${Object.keys(attendanceRecords).length} 条`)
  console.log(`- 历史记录: ${history.length} 条`)
  console.log(`- 部门: SMT, DIP`)
  console.log('')
  console.log('✅ 综合测试数据创建完成！')
  console.log('')
  console.log('🔍 预期测试结果：')
  console.log('1. 组员管理页面应显示白班/夜班标签')
  console.log('2. 出勤时间统计页面应显示白班/夜班标签')
  console.log('3. 设置页面应正确分组（SMT-1组、SMT-2组、DIP-1组）')
  console.log('4. 上传Excel时，白班组员"白班组员2"应触发"上班时间晚于8:00"异常')
  console.log('5. 上传Excel时，夜班组员即使上班时间晚于8:00也不应触发该异常')
  console.log('6. 历史记录应正常显示')
  
  return {
    leaders,
    teamMembers,
    attendanceRecords,
    history
  }
}

// 清除所有测试数据
export const clearAllTestData = () => {
  console.log('🧹 清除所有测试数据...')
  uni.removeStorageSync('teamMembers')
  uni.removeStorageSync('attendanceRecords')
  uni.removeStorageSync('attendanceHistory')
  uni.removeStorageSync('leaderDepartment')
  console.log('✅ 所有测试数据已清除')
}

