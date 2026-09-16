<template>
  <view class="team-container">
    <!-- 顶部Header -->
    <view class="header">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="header-title">组员管理</view>
      <view class="header-placeholder"></view>
    </view>

    <!-- 组长名字设置区域 -->
    <view class="leader-name-section">
      <view class="leader-name-display">
        <view class="leader-name-info">
          <text class="leader-name-label">我的名字：</text>
          <text class="leader-name-value">{{ currentUser?.nickName || '未设置' }}</text>
        </view>
        <view class="edit-name-btn" @tap="handleEditName" hover-class="btn-hover">
          <text class="edit-text">{{ currentUser?.nickName ? '编辑' : '设置' }}</text>
        </view>
      </view>
    </view>

    <!-- 部门管理区域 -->
    <view class="department-section">
      <view v-if="departmentName" class="department-display">
        <view class="department-info">
          <text class="department-label">当前部门：</text>
          <text class="department-name">{{ departmentName }}</text>
        </view>
        <view class="department-actions">
          <view class="edit-department-btn" @tap="handleEditDepartment" hover-class="btn-hover">
            <text class="edit-text">编辑</text>
          </view>
          <view class="delete-department-btn" @tap="handleDeleteDepartment" hover-class="btn-hover">
            <text class="delete-text">删除</text>
          </view>
        </view>
      </view>
      <view v-else class="add-department-btn" @tap="handleAddDepartment" hover-class="btn-hover">
        <text class="add-icon">+</text>
        <text class="add-text">添加部门</text>
      </view>
    </view>

    <!-- 当前组员数量 -->
    <view class="member-count-section">
      <view class="member-count-card">
        <text class="member-count-label">当前组员数量：</text>
        <text class="member-count-value">{{ memberList.length }}</text>
      </view>
    </view>

    <!-- 新增组员按钮 -->
    <view class="add-section">
      <view class="add-btn" @tap="handleAddMember" hover-class="btn-hover">
        <text class="add-icon">+</text>
        <text class="add-text">新增组员</text>
      </view>
    </view>

    <!-- 组员列表 -->
    <scroll-view class="member-list" scroll-y="true">
      <view 
        v-for="(member, index) in memberList" 
        :key="index"
        class="member-item"
      >
        <view class="member-info">
          <view class="member-name-wrap">
            <text class="member-name">{{ member.name }}</text>
            <view class="edit-member-btn" @tap.stop="handleEditMember(index)" hover-class="btn-hover">
              <text class="edit-member-text">编辑</text>
            </view>
          </view>
          <view class="shift-badge" :class="member.shiftType === 'night' ? 'night-shift' : 'day-shift'">
            <text class="shift-text">{{ member.shiftType === 'night' ? '夜班' : '白班' }}</text>
          </view>
        </view>
        <view class="member-actions">
          <view class="shift-btn" @tap="handleToggleShift(index)" hover-class="btn-hover">
            <text class="shift-btn-text">{{ (member.shiftType || 'day') === 'night' ? '改为白班' : '改为夜班' }}</text>
          </view>
          <view class="delete-btn" @tap="handleDeleteMember(index)" hover-class="delete-hover">
            <text class="delete-text">删除</text>
          </view>
        </view>
      </view>
      <view v-if="memberList.length === 0" class="empty-tip">
        <text class="empty-text">暂无组员，点击上方按钮添加</text>
      </view>
    </scroll-view>

    <!-- 新增组员弹窗 -->
    <view v-if="showAddModal" class="modal-overlay" @tap="handleCloseModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">新增组员</text>
          <view class="modal-close" @tap="handleCloseModal">×</view>
        </view>
        <view class="modal-body">
          <input 
            v-model="newMemberName"
            class="name-input"
            placeholder="请输入组员姓名"
            maxlength="20"
            @confirm="handleConfirmAdd"
          />
          <view class="shift-selector">
            <text class="shift-label">班次类型：</text>
            <view class="shift-options">
              <view 
                class="shift-option" 
                :class="{ active: newMemberShiftType === 'day' }"
                @tap="newMemberShiftType = 'day'"
              >
                <text class="shift-option-text">白班</text>
              </view>
              <view 
                class="shift-option" 
                :class="{ active: newMemberShiftType === 'night' }"
                @tap="newMemberShiftType = 'night'"
              >
                <text class="shift-option-text">夜班</text>
              </view>
            </view>
          </view>
          <view v-if="errorMessage" class="error-tip">
            <text class="error-text">{{ errorMessage }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel-btn" @tap="handleCloseModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @tap="handleConfirmAdd">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑组员名字弹窗 -->
    <view v-if="showEditMemberModal" class="modal-overlay" @tap="handleCloseEditMemberModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">编辑组员姓名</text>
          <view class="modal-close" @tap="handleCloseEditMemberModal">×</view>
        </view>
        <view class="modal-body">
          <input 
            v-model="editMemberName"
            class="name-input"
            placeholder="请输入新的组员姓名"
            maxlength="20"
            @confirm="handleConfirmEditMember"
          />
          <view v-if="editMemberErrorMessage" class="error-tip">
            <text class="error-text">{{ editMemberErrorMessage }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel-btn" @tap="handleCloseEditMemberModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @tap="handleConfirmEditMember">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 组长名字设置弹窗 -->
    <view v-if="showNameModal" class="modal-overlay" @tap="handleCloseNameModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">设置我的名字</text>
          <view class="modal-close" @tap="handleCloseNameModal">×</view>
        </view>
        <view class="modal-body">
          <input 
            v-model="newLeaderName"
            class="name-input"
            placeholder="请输入您的名字"
            maxlength="20"
            @confirm="handleConfirmName"
          />
          <view v-if="nameErrorMessage" class="error-tip">
            <text class="error-text">{{ nameErrorMessage }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel-btn" @tap="handleCloseNameModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @tap="handleConfirmName">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 部门管理弹窗 -->
    <view v-if="showDepartmentModal" class="modal-overlay" @tap="handleCloseDepartmentModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ departmentName ? '编辑部门' : '添加部门' }}</text>
          <view class="modal-close" @tap="handleCloseDepartmentModal">×</view>
        </view>
        <view class="modal-body">
          <input 
            v-model="newDepartmentName"
            class="name-input"
            placeholder="请输入部门名称"
            maxlength="20"
            @confirm="handleConfirmDepartment"
          />
          <view v-if="departmentErrorMessage" class="error-tip">
            <text class="error-text">{{ departmentErrorMessage }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn cancel-btn" @tap="handleCloseDepartmentModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @tap="handleConfirmDepartment">
            <text class="btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMembers, createMember, updateMember, deleteMember } from '@/utils/api/member.js'
import { getCurrentUser, updateLeaderDepartment, deleteLeaderDepartment, updateCurrentUser } from '@/utils/api/user.js'
import { createHistory } from '@/utils/api/history.js'

// 组员列表
const memberList = ref([])
// 是否显示新增弹窗
const showAddModal = ref(false)
// 新组员姓名
const newMemberName = ref('')
// 新组员班次类型（默认白班）
const newMemberShiftType = ref('day')
// 错误提示
const errorMessage = ref('')
// 部门名称
const departmentName = ref('')
// 是否显示部门弹窗
const showDepartmentModal = ref(false)
// 新部门名称
const newDepartmentName = ref('')
// 部门错误提示
const departmentErrorMessage = ref('')
// 是否显示名字设置弹窗
const showNameModal = ref(false)
// 新组长名字
const newLeaderName = ref('')
// 名字错误提示
const nameErrorMessage = ref('')

// 是否显示编辑组员名字弹窗
const showEditMemberModal = ref(false)
// 当前编辑的组员索引
const editingMemberIndex = ref(-1)
// 编辑后的组员名字
const editMemberName = ref('')
// 编辑组员错误提示
const editMemberErrorMessage = ref('')

// 当前用户信息
const currentUser = ref(null)
const leaderId = ref('')

// 页面加载时从后端获取组员列表和部门信息
onMounted(async () => {
  await loadUserInfo()
  await loadMemberList()
  await loadDepartment()
})

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const user = await getCurrentUser()
    currentUser.value = user
    leaderId.value = user.userId
  } catch (error) {
    console.error('获取用户信息失败:', error)
    // 如果API失败，从本地存储获取
    const userInfo = uni.getStorageSync('userInfo') || {}
    currentUser.value = userInfo
    leaderId.value = userInfo.userId || ''
  }
}

// 加载组员列表
const loadMemberList = async () => {
  if (!leaderId.value) {
    // 如果还没有leaderId，从本地存储读取
    const savedList = uni.getStorageSync('teamMembers')
    if (savedList && Array.isArray(savedList)) {
      memberList.value = savedList.map(member => ({
        ...member,
        shiftType: member.shiftType || 'day'
      }))
    }
    return
  }
  
  try {
    const members = await getMembers(leaderId.value)
    // 转换后端数据格式为前端格式
    memberList.value = members.map(member => ({
      id: member.memberId,
      name: member.name,
      shiftType: member.shiftType || 'day'
    }))
    // 同时保存到本地存储（作为缓存）
    uni.setStorageSync('teamMembers', memberList.value)
  } catch (error) {
    console.error('获取组员列表失败:', error)
    // 如果API失败，从本地存储读取
    const savedList = uni.getStorageSync('teamMembers')
    if (savedList && Array.isArray(savedList)) {
      memberList.value = savedList.map(member => ({
        ...member,
        shiftType: member.shiftType || 'day'
      }))
    }
  }
}

// 保存组员列表到本地存储（作为缓存）
const saveMemberList = () => {
  uni.setStorageSync('teamMembers', memberList.value)
}

const getLeaderDisplayLabel = () => {
  return currentUser.value?.nickName || currentUser.value?.name || currentUser.value?.username || '未命名组长'
}

const recordMemberChangeHistory = async ({ memberId = '', memberName = '', shiftType = 'day', changeType = '' }) => {
  if (!leaderId.value || !memberName || !changeType) {
    return
  }
  try {
    const department = departmentName.value || currentUser.value?.department || currentUser.value?.deptName || ''
    await createHistory({
      leaderId: leaderId.value,
      department,
      memberId: memberId || undefined,
      memberName,
      field: 'member_change',
      oldValue: changeType,
      newValue: JSON.stringify({
        changeType,
        memberName,
        shiftType,
        leaderName: getLeaderDisplayLabel(),
        department,
        timestamp: new Date().toISOString()
      }),
      changedBy: leaderId.value,
      changedAt: new Date().toISOString()
    })
  } catch (error) {
    console.warn('记录组员变动历史失败:', error)
  }
}

// 返回上一级
const handleBack = () => {
  // 直接跳转到首页
  uni.redirectTo({
    url: '/pages/index/index'
  })
}

// 打开新增组员弹窗
const handleAddMember = () => {
  newMemberName.value = ''
  newMemberShiftType.value = 'day' // 重置为白班
  errorMessage.value = ''
  showAddModal.value = true
}

// 关闭弹窗
const handleCloseModal = () => {
  showAddModal.value = false
  newMemberName.value = ''
  newMemberShiftType.value = 'day'
  errorMessage.value = ''
}

// 切换组员班次
const handleToggleShift = async (index) => {
  const member = memberList.value[index]
  const newShiftType = member.shiftType === 'day' ? 'night' : 'day'
  
  if (!leaderId.value || !member.id) {
    // 如果没有leaderId或memberId，只更新本地
    member.shiftType = newShiftType
    saveMemberList()
    uni.showToast({
      title: `已改为${newShiftType === 'day' ? '白班' : '夜班'}`,
      icon: 'success',
      duration: 1500
    })
    return
  }
  
  try {
    await updateMember(leaderId.value, member.id, {
      name: member.name,
      shiftType: newShiftType
    })
    member.shiftType = newShiftType
    saveMemberList()
    uni.showToast({
      title: `已改为${newShiftType === 'day' ? '白班' : '夜班'}`,
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('更新组员班次失败:', error)
    // 即使API失败，也更新本地显示
    member.shiftType = newShiftType
    saveMemberList()
    uni.showToast({
      title: `已改为${newShiftType === 'day' ? '白班' : '夜班'}`,
      icon: 'success',
      duration: 1500
    })
  }
}

// 确认添加组员
const handleConfirmAdd = async () => {
  const name = newMemberName.value.trim()
  
  // 验证姓名
  if (!name) {
    errorMessage.value = '请输入组员姓名'
    return
  }
  
  if (name.length > 20) {
    errorMessage.value = '姓名不能超过20个字符'
    return
  }
  
  // 检查姓名是否已存在
  const exists = memberList.value.some(member => member.name === name)
  if (exists) {
    errorMessage.value = '该组员已存在，请勿重复添加'
    return
  }
  
  if (!leaderId.value) {
    // 如果没有leaderId，只添加到本地
    memberList.value.push({
      name: name,
      id: Date.now(),
      shiftType: newMemberShiftType.value || 'day'
    })
    saveMemberList()
    handleCloseModal()
    uni.showToast({
      title: '添加成功',
      icon: 'success',
      duration: 1500
    })
    return
  }
  
  try {
    const newMember = await createMember(leaderId.value, {
      name: name,
      shiftType: newMemberShiftType.value || 'day'
    })
    
    // 添加到列表
    memberList.value.push({
      id: newMember.memberId,
      name: newMember.name,
      shiftType: newMember.shiftType || 'day'
    })

    await recordMemberChangeHistory({
      memberId: newMember.memberId,
      memberName: newMember.name,
      shiftType: newMember.shiftType || newMemberShiftType.value || 'day',
      changeType: '新增组员'
    })
    
    // 保存到本地存储
    saveMemberList()
    
    // 关闭弹窗
    handleCloseModal()
    
    // 显示成功提示
    uni.showToast({
      title: '添加成功',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('添加组员失败:', error)
    errorMessage.value = error.message || '添加失败，请稍后重试'
  }
}

// 打开编辑组员名字弹窗
const handleEditMember = (index) => {
  const member = memberList.value[index]
  if (!member) return
  editingMemberIndex.value = index
  editMemberName.value = member.name || ''
  editMemberErrorMessage.value = ''
  showEditMemberModal.value = true
}

// 关闭编辑组员名字弹窗
const handleCloseEditMemberModal = () => {
  showEditMemberModal.value = false
  editingMemberIndex.value = -1
  editMemberName.value = ''
  editMemberErrorMessage.value = ''
}

// 确认编辑组员名字（删除旧的并新增新的，避免数据库同时存在旧名/新名）
const handleConfirmEditMember = async () => {
  const index = editingMemberIndex.value
  const member = memberList.value[index]
  if (!member) {
    handleCloseEditMemberModal()
    return
  }

  const newName = editMemberName.value.trim()
  const oldName = (member.name || '').trim()

  if (!newName) {
    editMemberErrorMessage.value = '请输入组员姓名'
    return
  }

  if (newName.length > 20) {
    editMemberErrorMessage.value = '姓名不能超过20个字符'
    return
  }

  if (newName === oldName) {
    handleCloseEditMemberModal()
    return
  }

  // 检查新名字是否已存在（排除当前成员）
  const exists = memberList.value.some((m, i) => i !== index && m.name === newName)
  if (exists) {
    editMemberErrorMessage.value = '该姓名已存在，请换一个'
    return
  }

  // 无后端时，仅更新本地
  if (!leaderId.value || !member.id) {
    memberList.value[index].name = newName
    saveMemberList()
    handleCloseEditMemberModal()
    uni.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500
    })
    return
  }

  try {
    uni.showLoading({ title: '保存中...', mask: true })

    // 先删旧记录，再新增新记录，保证数据库不会同时存在旧名和新名
    await deleteMember(leaderId.value, member.id, { showLoading: false, showError: true })
    const recreated = await createMember(leaderId.value, {
      name: newName,
      shiftType: member.shiftType || 'day'
    }, { showLoading: false, showError: true })

    memberList.value[index] = {
      id: recreated.memberId,
      name: recreated.name,
      shiftType: recreated.shiftType || member.shiftType || 'day'
    }

    await recordMemberChangeHistory({
      memberId: recreated.memberId,
      memberName: recreated.name,
      shiftType: recreated.shiftType || member.shiftType || 'day',
      changeType: `编辑姓名(${oldName}→${newName})`
    })

    saveMemberList()
    handleCloseEditMemberModal()

    uni.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('编辑组员姓名失败:', error)
    editMemberErrorMessage.value = error.message || '保存失败，请稍后重试'
  } finally {
    try {
      uni.hideLoading()
    } catch (e) {}
  }
}

// 删除组员
const handleDeleteMember = (index) => {
  const member = memberList.value[index]
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除组员"${member.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        if (!leaderId.value || !member.id) {
          // 如果没有leaderId或memberId，只从本地删除
          memberList.value.splice(index, 1)
          saveMemberList()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          })
          return
        }
        
        try {
          await deleteMember(leaderId.value, member.id)
          await recordMemberChangeHistory({
            memberId: member.id,
            memberName: member.name,
            shiftType: member.shiftType || 'day',
            changeType: '删除组员'
          })
          memberList.value.splice(index, 1)
          saveMemberList()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          })
        } catch (error) {
          console.error('删除组员失败:', error)
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none',
            duration: 2000
          })
        }
      }
    }
  })
}

// 加载部门信息
const loadDepartment = async () => {
  if (!leaderId.value) {
    // 如果还没有leaderId，从本地存储读取
    const savedDepartment = uni.getStorageSync('leaderDepartment')
    if (savedDepartment) {
      departmentName.value = savedDepartment
    }
    return
  }
  
  try {
    const user = currentUser.value || await getCurrentUser()
    if (user.department) {
      departmentName.value = user.department
      // 同时保存到本地存储（作为缓存）
      uni.setStorageSync('leaderDepartment', user.department)
    } else {
      // 从本地存储读取
      const savedDepartment = uni.getStorageSync('leaderDepartment')
      if (savedDepartment) {
        departmentName.value = savedDepartment
      }
    }
  } catch (error) {
    console.error('获取部门信息失败:', error)
    // 如果API失败，从本地存储读取
    const savedDepartment = uni.getStorageSync('leaderDepartment')
    if (savedDepartment) {
      departmentName.value = savedDepartment
    }
  }
}

// 保存部门信息到本地存储（作为缓存）
const saveDepartment = () => {
  if (departmentName.value) {
    uni.setStorageSync('leaderDepartment', departmentName.value)
  } else {
    uni.removeStorageSync('leaderDepartment')
  }
}

// 打开添加部门弹窗
const handleAddDepartment = () => {
  newDepartmentName.value = ''
  departmentErrorMessage.value = ''
  showDepartmentModal.value = true
}

// 打开编辑部门弹窗
const handleEditDepartment = () => {
  newDepartmentName.value = departmentName.value
  departmentErrorMessage.value = ''
  showDepartmentModal.value = true
}

// 关闭部门弹窗
const handleCloseDepartmentModal = () => {
  showDepartmentModal.value = false
  newDepartmentName.value = ''
  departmentErrorMessage.value = ''
}

// 确认添加/编辑部门
const handleConfirmDepartment = async () => {
  const name = newDepartmentName.value.trim()
  
  // 验证部门名称
  if (!name) {
    departmentErrorMessage.value = '请输入部门名称'
    return
  }
  
  if (name.length > 20) {
    departmentErrorMessage.value = '部门名称不能超过20个字符'
    return
  }
  
  if (!leaderId.value) {
    // 如果没有leaderId，只保存到本地
    departmentName.value = name
    saveDepartment()
    handleCloseDepartmentModal()
    uni.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500
    })
    return
  }
  
  try {
    await updateLeaderDepartment(leaderId.value, name)
    departmentName.value = name
    saveDepartment()
    handleCloseDepartmentModal()
    uni.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('保存部门失败:', error)
    departmentErrorMessage.value = error.message || '保存失败，请稍后重试'
  }
}

// 删除部门
const handleDeleteDepartment = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除部门"${departmentName.value}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        if (!leaderId.value) {
          // 如果没有leaderId，只从本地删除
          departmentName.value = ''
          saveDepartment()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          })
          return
        }
        
        try {
          await deleteLeaderDepartment(leaderId.value)
          departmentName.value = ''
          saveDepartment()
          uni.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          })
        } catch (error) {
          console.error('删除部门失败:', error)
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none',
            duration: 2000
          })
        }
      }
    }
  })
}

// 打开编辑名字弹窗
const handleEditName = () => {
  newLeaderName.value = currentUser.value?.nickName || ''
  nameErrorMessage.value = ''
  showNameModal.value = true
}

// 关闭名字弹窗
const handleCloseNameModal = () => {
  showNameModal.value = false
  newLeaderName.value = ''
  nameErrorMessage.value = ''
}

// 确认设置名字
const handleConfirmName = async () => {
  const name = newLeaderName.value.trim()
  
  // 验证名字
  if (!name) {
    nameErrorMessage.value = '请输入您的名字'
    return
  }
  
  if (name.length > 20) {
    nameErrorMessage.value = '名字不能超过20个字符'
    return
  }
  
  try {
    // 调用API更新用户信息
    await updateCurrentUser({
      nickName: name
    })
    
    // 更新本地用户信息
    if (currentUser.value) {
      currentUser.value.nickName = name
    }
    uni.setStorageSync('userInfo', currentUser.value)
    
    // 关闭弹窗
    handleCloseNameModal()
    
    // 显示成功提示
    uni.showToast({
      title: '设置成功',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('设置名字失败:', error)
    // 如果是 404 错误，说明后端接口未实现
    if (error.code === 'NOT_FOUND' || error.message?.includes('404') || error.message?.includes('资源不存在')) {
      nameErrorMessage.value = '后端接口未实现，请联系管理员'
      uni.showToast({
        title: '功能暂未开放',
        icon: 'none',
        duration: 2000
      })
    } else {
      nameErrorMessage.value = error.message || '设置失败，请稍后重试'
    }
  }
}
</script>

<style lang="scss" scoped>
.team-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 60%, #7dd3fc 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 装饰元素 */
.team-container::before {
  content: '';
  position: absolute;
  width: 500rpx;
  height: 500rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50%;
  top: -250rpx;
  right: -250rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

.team-container::after {
  content: '';
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  background: linear-gradient(135deg, #06ad56 0%, #07c160 100%);
  border-radius: 50%;
  bottom: -200rpx;
  left: -200rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

/* Header区域 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 60rpx 40rpx 40rpx;
  position: relative;
  z-index: 1;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(7, 193, 96, 0.3);
  transition: all 0.3s ease;
}

.back-btn:active {
  transform: scale(0.95);
}

.back-icon {
  color: white;
  font-size: 40rpx;
  font-weight: bold;
}

.header-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.header-placeholder {
  width: 80rpx;
}

/* 组长名字设置区域 */
.leader-name-section {
  padding: 40rpx 40rpx 20rpx;
  position: relative;
  z-index: 1;
}

.leader-name-display {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1),
              0 2rpx 6rpx rgba(0, 0, 0, 0.05);
}

.leader-name-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.leader-name-label {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.leader-name-value {
  font-size: 32rpx;
  color: #07c160;
  font-weight: 700;
}

.edit-name-btn {
  height: 64rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(7, 193, 96, 0.3);
  transition: all 0.3s ease;
}

.edit-name-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.2);
}

.edit-name-btn .edit-text {
  color: white;
  font-size: 26rpx;
  font-weight: 600;
}

/* 部门管理区域 */
.department-section {
  padding: 20rpx 40rpx 20rpx;
  position: relative;
  z-index: 1;
}

/* 当前组员数量 */
.member-count-section {
  padding: 0rpx 40rpx 20rpx;
  position: relative;
  z-index: 1;
}

.member-count-card {
  background: white;
  border-radius: 24rpx;
  padding: 28rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1),
              0 2rpx 6rpx rgba(0, 0, 0, 0.05);
}

.member-count-label {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.member-count-value {
  font-size: 34rpx;
  color: #07c160;
  font-weight: 800;
}

.department-display {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1),
              0 2rpx 6rpx rgba(0, 0, 0, 0.05);
}

.department-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.department-label {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.department-name {
  font-size: 32rpx;
  color: #07c160;
  font-weight: 700;
}

.department-actions {
  display: flex;
  gap: 16rpx;
}

.edit-department-btn {
  height: 64rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.edit-department-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.2);
}

.edit-text {
  color: white;
  font-size: 26rpx;
  font-weight: 600;
}

.delete-department-btn {
  height: 64rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(245, 87, 108, 0.3);
  transition: all 0.3s ease;
}

.delete-department-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(245, 87, 108, 0.2);
}

.delete-department-btn .delete-text {
  color: white;
  font-size: 26rpx;
  font-weight: 600;
}

.add-department-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 8rpx 25rpx rgba(7, 193, 96, 0.4),
              0 4rpx 12rpx rgba(7, 193, 96, 0.2);
  transition: all 0.3s ease;
}

.add-department-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.3),
              0 2rpx 8rpx rgba(7, 193, 96, 0.15);
}

.add-department-btn .add-icon {
  color: white;
  font-size: 48rpx;
  font-weight: bold;
  line-height: 1;
}

.add-department-btn .add-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

/* 新增组员按钮区域 */
.add-section {
  padding: 20rpx 40rpx 40rpx;
  position: relative;
  z-index: 1;
}

.add-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.4),
              0 4rpx 12rpx rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
}

.add-btn.btn-hover {
  transform: scale(0.98) translateY(-2rpx);
  box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, 0.3),
              0 2rpx 8rpx rgba(102, 126, 234, 0.15);
}

.add-icon {
  color: white;
  font-size: 48rpx;
  font-weight: bold;
  line-height: 1;
}

.add-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}

/* 组员列表 */
.member-list {
  flex: 1;
  padding: 0 40rpx 40rpx;
  position: relative;
  z-index: 1;
}

.member-item {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx 40rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1),
              0 2rpx 6rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.member-item:active {
  transform: scale(0.98);
}

.member-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.member-name-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.member-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.edit-member-btn {
  height: 52rpx;
  padding: 0 20rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.25);
  transition: all 0.3s ease;
}

.edit-member-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.18);
}

.edit-member-text {
  color: white;
  font-size: 22rpx;
  font-weight: 700;
}

.shift-badge {
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.day-shift {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.night-shift {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
}

.shift-text {
  color: white;
  font-size: 24rpx;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.shift-btn {
  height: 64rpx;
  padding: 0 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.shift-btn.btn-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.2);
}

.shift-btn-text {
  color: white;
  font-size: 24rpx;
  font-weight: 600;
}

.delete-btn {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(245, 87, 108, 0.3);
  transition: all 0.3s ease;
}

.delete-btn.delete-hover {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(245, 87, 108, 0.2);
}

.delete-text {
  color: white;
  font-size: 24rpx;
  font-weight: 600;
}

.empty-tip {
  padding: 100rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 弹窗遮罩 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 弹窗内容 */
.modal-content {
  width: 600rpx;
  background: white;
  border-radius: 32rpx;
  overflow: hidden;
  animation: slideUp 0.3s ease;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

@keyframes slideUp {
  from {
    transform: translateY(100rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.modal-close {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #999;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:active {
  background: #f0f0f0;
  color: #666;
}

.modal-body {
  padding: 40rpx;
}

.name-input {
  width: 100%;
  height: 88rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #1a1a1a;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.name-input:focus {
  background: white;
  border-color: #07c160;
}

.shift-selector {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.shift-label {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.shift-options {
  display: flex;
  gap: 16rpx;
}

.shift-option {
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
  background: #f0f0f0;
  transition: all 0.3s ease;
}

.shift-option.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4rpx 15rpx rgba(102, 126, 234, 0.3);
}

.shift-option-text {
  font-size: 28rpx;
  color: #666;
  font-weight: 600;
}

.shift-option.active .shift-option-text {
  color: white;
}

.error-tip {
  margin-top: 20rpx;
  padding: 16rpx;
  background: #fff3cd;
  border: 2rpx solid #ffc107;
  border-radius: 12rpx;
}

.error-text {
  font-size: 24rpx;
  color: #856404;
}

.modal-footer {
  display: flex;
  border-top: 2rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.modal-btn:active {
  opacity: 0.8;
}

.cancel-btn {
  border-right: 1rpx solid #f0f0f0;
}

.cancel-btn .btn-text {
  color: #666;
  font-size: 32rpx;
  font-weight: 600;
}

.confirm-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
}

.confirm-btn .btn-text {
  color: white;
  font-size: 32rpx;
  font-weight: 600;
}
</style>
