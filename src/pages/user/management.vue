<template>
  <view class="user-management-container">
    <!-- 顶部Header -->
    <view class="header">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="header-title">用户管理</view>
      <view class="header-actions">
        <view class="create-btn" @tap="handleShowCreateUser" hover-class="btn-hover">
          <text class="create-icon">+</text>
          <text class="create-text">创建账号</text>
        </view>
      </view>
    </view>

    <!-- 用户列表 -->
    <scroll-view class="content-list" scroll-y="true">
      <view 
        v-for="(user, index) in userList" 
        :key="user.userId || index"
        class="user-item"
      >
        <view class="user-info">
          <view class="user-name">{{ user.nickName || '未知用户' }}</view>
          <view class="user-meta">
            <text class="user-id">ID: {{ user.userId }}</text>
            <text class="user-role" :class="getRoleClass(user.role)">
              {{ getRoleText(user.role) }}
            </text>
          </view>
          <view v-if="user.department" class="user-department">
            部门: {{ user.department }}
          </view>
          <view v-if="user.lastLoginAt" class="user-login-time">
            最后登录: {{ formatTime(user.lastLoginAt) }}
          </view>
        </view>
        <view class="user-actions">
          <view 
            v-if="user.role === 'leader' || user.role === '组长'"
            class="action-btn promote-btn"
            @tap="handlePromote(user)"
            hover-class="btn-hover"
          >
            <text class="action-text">升级为管理员</text>
          </view>
          <view 
            v-if="user.role === 'manager' || user.role === '管理员'"
            class="action-btn demote-btn"
            @tap="handleDemote(user)"
            hover-class="btn-hover"
          >
            <text class="action-text">降级为组长</text>
          </view>
          <view 
            v-if="user.role !== 'admin'"
            class="action-btn delete-btn"
            @tap="handleDelete(user)"
            hover-class="btn-hover"
          >
            <text class="action-text">删除用户</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="userList.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无用户数据</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
    </scroll-view>

    <!-- 创建用户弹窗 -->
    <view v-if="showCreateModal" class="modal-overlay" @tap="handleCloseCreateModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">创建新账号</text>
          <text class="modal-close" @tap="handleCloseCreateModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-group">
            <text class="form-label">账号</text>
            <input
              v-model="newUser.username"
              class="form-input"
              placeholder="请输入账号（必填）"
              placeholder-class="placeholder"
            />
          </view>
          <view class="form-group">
            <text class="form-label">密码</text>
            <input
              v-model="newUser.password"
              class="form-input"
              type="password"
              placeholder="请输入密码（必填）"
              placeholder-class="placeholder"
            />
          </view>
          <view class="form-group">
            <text class="form-label">昵称</text>
            <input
              v-model="newUser.nickName"
              class="form-input"
              placeholder="请输入昵称（可选）"
              placeholder-class="placeholder"
            />
          </view>
          <view class="form-group">
            <text class="form-label">角色</text>
            <picker
              :value="roleIndex"
              :range="roleOptions"
              range-key="label"
              @change="handleRoleChange"
            >
              <view class="picker-view">
                <text class="picker-text">{{ roleOptions[roleIndex].label }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-group">
            <text class="form-label">部门</text>
            <input
              v-model="newUser.department"
              class="form-input"
              placeholder="请输入部门（可选）"
              placeholder-class="placeholder"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @tap="handleCloseCreateModal">取消</button>
          <button class="modal-btn confirm-btn" @tap="handleCreateUser">创建</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAllUsers, promoteUser, demoteUser, deleteUser, createUser } from '@/utils/api/user.js'

// 用户列表
const userList = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const newUser = ref({
  username: '',
  password: '',
  nickName: '',
  role: 'leader',
  department: ''
})
const roleOptions = [
  { label: '组长', value: 'leader' },
  { label: '管理员', value: 'manager' }
]
const roleIndex = ref(0)

// 页面加载
onMounted(() => {
  checkPermission()
  loadUserList()
})

// 检查权限
const checkPermission = () => {
  const userRole = uni.getStorageSync('userRole') || ''
  if (userRole !== 'admin') {
    uni.showToast({
      title: '无权限访问',
      icon: 'none',
      duration: 2000
    })
    setTimeout(() => {
      handleBack()
    }, 2000)
  }
}

// 加载用户列表
const loadUserList = async () => {
  loading.value = true
  try {
    // 优先从API获取
    try {
      const users = await getAllUsers()
      console.log('✅ 从API获取用户列表成功:', users)
      userList.value = Array.isArray(users) ? users : []
    } catch (apiError) {
      console.error('❌ API获取用户列表失败:', apiError)
      // API失败时，显示空列表
      userList.value = []
      uni.showToast({
        title: '加载用户列表失败: ' + (apiError.message || '未知错误'),
        icon: 'none',
        duration: 3000
      })
    }
  } catch (error) {
    console.error('❌ 加载用户列表异常:', error)
    userList.value = []
    uni.showToast({
      title: '加载失败，请稍后重试',
      icon: 'none',
      duration: 2000
    })
  } finally {
    loading.value = false
  }
}

// 获取角色文本
const getRoleText = (role) => {
  switch (role) {
    case 'leader':
    case '组长':
      return '组长'
    case 'manager':
    case '管理员':
      return '管理员'
    case 'admin':
      return '平台管理员'
    default:
      return role || '未知'
  }
}

// 获取角色样式类
const getRoleClass = (role) => {
  switch (role) {
    case 'leader':
    case '组长':
      return 'role-leader'
    case 'manager':
    case '管理员':
      return 'role-manager'
    case 'admin':
      return 'role-admin'
    default:
      return ''
  }
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '未知'
  try {
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch (e) {
    return timeStr
  }
}

// 升级为管理员
const handlePromote = async (user) => {
  uni.showModal({
    title: '确认升级',
    content: `确定要将"${user.nickName || user.userId}"升级为管理员吗？`,
    confirmText: '确定',
    cancelText: '取消',
    confirmColor: '#07c160',
    success: async (res) => {
      if (res.confirm) {
        try {
          await promoteUser(user.userId)
          uni.showToast({
            title: '升级成功',
            icon: 'success',
            duration: 2000
          })
          // 重新加载用户列表
          setTimeout(() => {
            loadUserList()
          }, 500)
        } catch (error) {
          console.error('❌ 升级失败:', error)
          uni.showToast({
            title: '升级失败: ' + (error.message || '未知错误'),
            icon: 'none',
            duration: 3000
          })
        }
      }
    }
  })
}

// 降级为组长
const handleDemote = async (user) => {
  uni.showModal({
    title: '确认降级',
    content: `确定要将"${user.nickName || user.userId}"降级为组长吗？`,
    confirmText: '确定',
    cancelText: '取消',
    confirmColor: '#ff6b6b',
    success: async (res) => {
      if (res.confirm) {
        try {
          await demoteUser(user.userId)
          uni.showToast({
            title: '降级成功',
            icon: 'success',
            duration: 2000
          })
          // 重新加载用户列表
          setTimeout(() => {
            loadUserList()
          }, 500)
        } catch (error) {
          console.error('❌ 降级失败:', error)
          uni.showToast({
            title: '降级失败: ' + (error.message || '未知错误'),
            icon: 'none',
            duration: 3000
          })
        }
      }
    }
  })
}

// 删除用户
const handleDelete = async (user) => {
  // 防止删除平台管理员
  if (user.role === 'admin') {
    uni.showToast({
      title: '不能删除平台管理员',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除用户"${user.nickName || user.userId}"吗？\n此操作不可恢复！`,
    confirmText: '删除',
    cancelText: '取消',
    confirmColor: '#ff4757',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteUser(user.userId)
          uni.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 2000
          })
          // 重新加载用户列表
          setTimeout(() => {
            loadUserList()
          }, 500)
        } catch (error) {
          console.error('❌ 删除失败:', error)
          // 如果是 404 错误，说明后端接口未实现
          if (error.code === 'NOT_FOUND' || error.message?.includes('404') || error.message?.includes('资源不存在')) {
            uni.showModal({
              title: '功能暂未开放',
              content: '删除用户功能需要后端支持，请联系管理员实现该接口。',
              showCancel: false,
              confirmText: '知道了'
            })
          } else {
            uni.showToast({
              title: '删除失败: ' + (error.message || '未知错误'),
              icon: 'none',
              duration: 3000
            })
          }
        }
      }
    }
  })
}

// 显示创建用户弹窗
const handleShowCreateUser = () => {
  newUser.value = {
    username: '',
    password: '',
    nickName: '',
    role: 'leader',
    department: ''
  }
  roleIndex.value = 0
  showCreateModal.value = true
}

// 关闭创建用户弹窗
const handleCloseCreateModal = () => {
  showCreateModal.value = false
}

// 角色选择变化
const handleRoleChange = (e) => {
  roleIndex.value = e.detail.value
  newUser.value.role = roleOptions[e.detail.value].value
}

// 创建用户
const handleCreateUser = async () => {
  const user = newUser.value
  
  // 验证必填项
  if (!user.username || !user.password) {
    uni.showToast({
      title: '账号和密码不能为空',
      icon: 'none',
      duration: 2000
    })
    return
  }

  // 验证账号格式（至少3个字符）
  if (user.username.length < 3) {
    uni.showToast({
      title: '账号至少需要3个字符',
      icon: 'none',
      duration: 2000
    })
    return
  }

  // 验证密码格式（至少6个字符）
  if (user.password.length < 6) {
    uni.showToast({
      title: '密码至少需要6个字符',
      icon: 'none',
      duration: 2000
    })
    return
  }

  try {
    const userData = {
      username: user.username.trim(),
      password: user.password,
      role: user.role || 'leader'
    }
    
    // 可选字段
    if (user.nickName && user.nickName.trim()) {
      userData.nickName = user.nickName.trim()
    }
    if (user.department && user.department.trim()) {
      userData.department = user.department.trim()
    }

    await createUser(userData)
    uni.showToast({
      title: '创建成功',
      icon: 'success',
      duration: 2000
    })
    
    // 关闭弹窗并刷新列表
    showCreateModal.value = false
    setTimeout(() => {
      loadUserList()
    }, 500)
  } catch (error) {
    console.error('❌ 创建用户失败:', error)
    uni.showToast({
      title: '创建失败: ' + (error.message || '未知错误'),
      icon: 'none',
      duration: 3000
    })
  }
}

// 返回
const handleBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.user-management-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%);
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 60rpx 40rpx 40rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  box-shadow: 0 4rpx 20rpx rgba(7, 193, 96, 0.3);
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.back-icon {
  color: white;
  font-size: 48rpx;
  font-weight: bold;
}

.header-title {
  flex: 1;
  text-align: center;
  color: white;
  font-size: 36rpx;
  font-weight: 600;
}

.header-placeholder {
  width: 80rpx;
}

.header-actions {
  width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  transition: all 0.3s ease;
}

.create-btn.btn-hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.create-icon {
  color: white;
  font-size: 32rpx;
  font-weight: bold;
}

.create-text {
  color: white;
  font-size: 24rpx;
  font-weight: 500;
}

/* 内容列表 */
.content-list {
  flex: 1;
  padding: 40rpx 30rpx;
}

.user-item {
  background: white;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex-wrap: wrap;
}

.user-id {
  font-size: 24rpx;
  color: #8c8c8c;
}

.user-role {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-weight: 500;
}

.role-leader {
  background: #e3f2fd;
  color: #1976d2;
}

.role-manager {
  background: #fff3e0;
  color: #f57c00;
}

.role-admin {
  background: #f3e5f5;
  color: #7b1fa2;
}

.user-department,
.user-login-time {
  font-size: 24rpx;
  color: #666;
}

.user-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 10rpx;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 160rpx;
  height: 70rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.delete-btn {
  flex: 0 0 auto;
  min-width: 140rpx;
}

.promote-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.3);
}

.demote-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.3);
}

.delete-btn {
  background: linear-gradient(135deg, #ff4757 0%, #ee2d3d 100%);
  box-shadow: 0 4rpx 12rpx rgba(255, 71, 87, 0.3);
}

.action-btn.btn-hover {
  transform: scale(0.95);
  opacity: 0.9;
}

.action-text {
  color: white;
  font-size: 26rpx;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #07c160;
}

/* 创建用户弹窗 */
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
}

.modal-content {
  width: 90%;
  max-width: 600rpx;
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 36rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:active {
  background: #f0f0f0;
}

.modal-body {
  padding: 40rpx 36rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  border-radius: 16rpx;
  border: 2rpx solid #e5e5e5;
  background: #fdfdfd;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1a1a1a;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: #07c160;
}

.picker-view {
  width: 100%;
  height: 80rpx;
  border-radius: 16rpx;
  border: 2rpx solid #e5e5e5;
  background: #fdfdfd;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  font-size: 28rpx;
  color: #1a1a1a;
}

.picker-arrow {
  font-size: 24rpx;
  color: #999;
}

.modal-footer {
  display: flex;
  gap: 24rpx;
  padding: 32rpx 36rpx;
  border-top: 2rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.modal-btn::after {
  border: none;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:active {
  background: #e5e5e5;
}

.confirm-btn {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.3);
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>

