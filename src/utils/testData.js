// 测试数据初始化脚本
// 用于创建多个组长、部门、组员和出勤记录，验证自动分组功能

export const initTestData = () => {
  console.log('开始初始化测试数据...')
  
  // 1. 创建多个组长的用户信息（分别绑定SMT和DIP部门）
  const leaders = [
    {
      nickName: '张三',
      userId: 'leader_001',
      openid: 'openid_001',
      role: 'leader',
      token: 'token_leader_001',
      department: 'SMT' // SMT部门
    },
    {
      nickName: '李四',
      userId: 'leader_002',
      openid: 'openid_002',
      role: 'leader',
      token: 'token_leader_002',
      department: 'SMT' // SMT部门
    },
    {
      nickName: '王五',
      userId: 'leader_003',
      openid: 'openid_003',
      role: 'leader',
      token: 'token_leader_003',
      department: 'SMT' // SMT部门
    },
    {
      nickName: '赵六',
      userId: 'leader_004',
      openid: 'openid_004',
      role: 'leader',
      token: 'token_leader_004',
      department: 'DIP' // DIP部门
    },
    {
      nickName: '孙七',
      userId: 'leader_005',
      openid: 'openid_005',
      role: 'leader',
      token: 'token_leader_005',
      department: 'DIP' // DIP部门
    }
  ]
  
  // 2. 为每个组长创建组员列表
  const teamMembersData = {
    leader_001: [
      { name: '张组员1', id: Date.now() + 1 },
      { name: '张组员2', id: Date.now() + 2 },
      { name: '张组员3', id: Date.now() + 3 }
    ],
    leader_002: [
      { name: '李组员1', id: Date.now() + 4 },
      { name: '李组员2', id: Date.now() + 5 },
      { name: '李组员3', id: Date.now() + 6 }
    ],
    leader_003: [
      { name: '王组员1', id: Date.now() + 7 },
      { name: '王组员2', id: Date.now() + 8 },
      { name: '王组员3', id: Date.now() + 9 }
    ],
    leader_004: [
      { name: '赵组员1', id: Date.now() + 10 },
      { name: '赵组员2', id: Date.now() + 11 },
      { name: '赵组员3', id: Date.now() + 12 }
    ],
    leader_005: [
      { name: '孙组员1', id: Date.now() + 13 },
      { name: '孙组员2', id: Date.now() + 14 },
      { name: '孙组员3', id: Date.now() + 15 }
    ]
  }
  
  // 合并所有组员
  const allTeamMembers = [
    ...teamMembersData.leader_001,
    ...teamMembersData.leader_002,
    ...teamMembersData.leader_003,
    ...teamMembersData.leader_004,
    ...teamMembersData.leader_005
  ]
  uni.setStorageSync('teamMembers', allTeamMembers)
  
  // 3. 创建出勤记录（每个组长都有不同的组员出勤记录，绑定对应部门）
  const attendanceRecords = {}
  
  // SMT部门的组长1（张三）
  teamMembersData.leader_001.forEach((member, index) => {
    const startHour = 8 + index
    const endHour = 17 + index
    attendanceRecords[member.name] = {
      name: member.name,
      startTime: `${String(startHour).padStart(2, '0')}:00`,
      endTime: `${String(endHour).padStart(2, '0')}:00`,
      duration: `${9 + index}小时`,
      department: 'SMT',
      leaderId: '张三'
    }
  })
  
  // SMT部门的组长2（李四）
  teamMembersData.leader_002.forEach((member, index) => {
    const startHour = 7 + index
    const endHour = 16 + index
    attendanceRecords[member.name] = {
      name: member.name,
      startTime: `${String(startHour).padStart(2, '0')}:30`,
      endTime: `${String(endHour).padStart(2, '0')}:30`,
      duration: `${9 + index}小时`,
      department: 'SMT',
      leaderId: '李四'
    }
  })
  
  // SMT部门的组长3（王五）
  teamMembersData.leader_003.forEach((member, index) => {
    const startHour = 9 + index
    const endHour = 18 + index
    attendanceRecords[member.name] = {
      name: member.name,
      startTime: `${String(startHour).padStart(2, '0')}:00`,
      endTime: `${String(endHour).padStart(2, '0')}:00`,
      duration: `${9 + index}小时`,
      department: 'SMT',
      leaderId: '王五'
    }
  })
  
  // DIP部门的组长1（赵六）
  teamMembersData.leader_004.forEach((member, index) => {
    const startHour = 8 + index
    const endHour = 17 + index
    attendanceRecords[member.name] = {
      name: member.name,
      startTime: `${String(startHour).padStart(2, '0')}:00`,
      endTime: `${String(endHour).padStart(2, '0')}:00`,
      duration: `${9 + index}小时`,
      department: 'DIP',
      leaderId: '赵六'
    }
  })
  
  // DIP部门的组长2（孙七）
  teamMembersData.leader_005.forEach((member, index) => {
    const startHour = 7 + index
    const endHour = 16 + index
    attendanceRecords[member.name] = {
      name: member.name,
      startTime: `${String(startHour).padStart(2, '0')}:30`,
      endTime: `${String(endHour).padStart(2, '0')}:30`,
      duration: `${9 + index}小时`,
      department: 'DIP',
      leaderId: '孙七'
    }
  })
  
  // 保存出勤记录
  uni.setStorageSync('attendanceRecords', attendanceRecords)
  
  console.log('✅ 测试数据初始化完成！')
  console.log('创建的组长:', leaders.map(l => `${l.nickName}(${l.department})`).join(', '))
  console.log('创建的组员数量:', allTeamMembers.length)
  console.log('创建的出勤记录数量:', Object.keys(attendanceRecords).length)
  console.log('')
  console.log('部门分布：')
  console.log('- SMT部门：3个组长（张三、李四、王五），9个组员')
  console.log('- DIP部门：2个组长（赵六、孙七），6个组员')
  console.log('')
  console.log('请在设置页面查看，应该能看到：')
  console.log('SMT部门：')
  console.log('  - SMT-1组（对应组长：张三）')
  console.log('  - SMT-2组（对应组长：李四）')
  console.log('  - SMT-3组（对应组长：王五）')
  console.log('DIP部门：')
  console.log('  - DIP-1组（对应组长：赵六）')
  console.log('  - DIP-2组（对应组长：孙七）')
  
  return {
    leaders,
    teamMembers: allTeamMembers,
    attendanceRecords
  }
}

// 模拟修改出勤时间，触发历史记录
export const simulateTimeChanges = () => {
  console.log('开始模拟修改出勤时间，触发历史记录...')
  
  const records = uni.getStorageSync('attendanceRecords') || {}
  const history = []
  
  // 修改几个组员的出勤时间，创建历史记录（包含SMT和DIP部门）
  const changes = [
    // SMT部门的修改
    {
      name: '张组员1',
      field: '上班时间',
      oldValue: '08:00',
      newValue: '09:00',
      department: 'SMT',
      leaderId: '张三'
    },
    {
      name: '张组员1',
      field: '下班时间',
      oldValue: '17:00',
      newValue: '18:00',
      department: 'SMT',
      leaderId: '张三'
    },
    {
      name: '李组员2',
      field: '上班时间',
      oldValue: '08:30',
      newValue: '07:30',
      department: 'SMT',
      leaderId: '李四'
    },
    {
      name: '王组员3',
      field: '下班时间',
      oldValue: '21:00',
      newValue: '20:00',
      department: 'SMT',
      leaderId: '王五'
    },
    {
      name: '张组员2',
      field: '上班时间',
      oldValue: '09:00',
      newValue: '08:30',
      department: 'SMT',
      leaderId: '张三'
    },
    // DIP部门的修改
    {
      name: '赵组员1',
      field: '上班时间',
      oldValue: '08:00',
      newValue: '08:30',
      department: 'DIP',
      leaderId: '赵六'
    },
    {
      name: '孙组员2',
      field: '下班时间',
      oldValue: '18:30',
      newValue: '19:00',
      department: 'DIP',
      leaderId: '孙七'
    }
  ]
  
  // 创建历史记录
  changes.forEach((change, index) => {
    const historyRecord = {
      timestamp: new Date(Date.now() - (changes.length - index) * 60000).toISOString(), // 每条记录间隔1分钟
      group: change.department,
      memberName: change.name,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue
    }
    history.push(historyRecord)
    
    // 同时更新出勤记录
    if (records[change.name]) {
      if (change.field === '上班时间') {
        records[change.name].startTime = change.newValue
      } else if (change.field === '下班时间') {
        records[change.name].endTime = change.newValue
      }
      // 重新计算时长
      const startTime = records[change.name].startTime
      const endTime = records[change.name].endTime
      if (startTime && endTime) {
        const startParts = startTime.split(':')
        const endParts = endTime.split(':')
        const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
        const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
        let durationMinutes = endMinutes - startMinutes
        if (durationMinutes < 0) {
          durationMinutes += 24 * 60 // 夜班
        }
        const hours = Math.floor(durationMinutes / 60)
        const minutes = durationMinutes % 60
        records[change.name].duration = minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
      }
    }
  })
  
  // 保存更新后的出勤记录
  uni.setStorageSync('attendanceRecords', records)
  
  // 保存历史记录（新记录放在前面）
  const existingHistory = uni.getStorageSync('attendanceHistory') || []
  const allHistory = Array.isArray(existingHistory) 
    ? [...history, ...existingHistory]  // 新记录放在前面
    : history
  
  try {
    uni.setStorageSync('attendanceHistory', allHistory)
    console.log(`✅ 已保存 ${allHistory.length} 条历史记录到本地存储`)
    
    // 验证保存是否成功
    const verifyHistory = uni.getStorageSync('attendanceHistory')
    if (Array.isArray(verifyHistory) && verifyHistory.length > 0) {
      console.log('✅ 历史记录保存验证成功')
      console.log('最新3条历史记录：', verifyHistory.slice(0, 3))
    } else {
      console.error('❌ 历史记录保存验证失败')
    }
  } catch (error) {
    console.error('❌ 保存历史记录失败:', error)
  }
  
  console.log(`已创建 ${changes.length} 条历史记录`)
  console.log('修改详情：')
  changes.forEach(change => {
    console.log(`- ${change.name} 的${change.field}：${change.oldValue} → ${change.newValue}`)
  })
  
  return history
}

// 清除测试数据
export const clearTestData = () => {
  console.log('清除测试数据...')
  uni.removeStorageSync('teamMembers')
  uni.removeStorageSync('attendanceRecords')
  uni.removeStorageSync('attendanceHistory')
  console.log('测试数据已清除')
}

