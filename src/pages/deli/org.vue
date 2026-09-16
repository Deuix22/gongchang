<template>
  <view class="org-page">
    <view class="top-bar">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">‹</text>
        <text class="back-text">返回</text>
      </view>
      <text class="page-title">人员与部门</text>
      <view class="refresh-btn" :class="{ disabled: loading }" @tap="loadAllData">
        <text>{{ loading ? '加载中' : '刷新' }}</text>
      </view>
    </view>

    <view v-if="errorMsg" class="error-banner">
      <text>{{ errorMsg }}</text>
    </view>

    <view class="main-body">
      <!-- 左侧部门树 -->
      <scroll-view class="dept-panel" scroll-y>
        <view class="dept-company">
          <text class="company-icon">🏢</text>
          <text class="company-name">组织架构</text>
        </view>
        <view
          v-for="dept in flatDeptList"
          :key="dept.id"
          class="dept-item"
          :class="{ active: selectedDeptId === dept.id }"
          :style="{ paddingLeft: `${24 + dept.level * 28}rpx` }"
          @tap="selectDepartment(dept.id)"
        >
          <text class="dept-folder">{{ dept.children?.length ? '📁' : '📂' }}</text>
          <text class="dept-name">{{ dept.name }}</text>
          <text class="dept-count">{{ getDeptEmployeeCount(dept.id) }}</text>
        </view>
        <view v-if="!loading && flatDeptList.length === 0" class="side-empty">
          <text>暂无部门</text>
        </view>
      </scroll-view>

      <!-- 右侧人员列表 -->
      <view class="employee-panel">
        <view class="panel-header">
          <text class="panel-title">{{ selectedDeptName }}</text>
          <text class="panel-count">共 {{ filteredEmployees.length }} 人</text>
        </view>

        <view class="search-bar">
          <input
            v-model="keyword"
            class="search-input"
            type="text"
            placeholder="搜索姓名"
            confirm-type="search"
          />
        </view>

        <scroll-view class="table-wrap" scroll-x scroll-y>
          <view class="data-table">
            <view class="table-row table-head">
              <text class="col col-name">姓名</text>
              <text class="col col-mobile">手机号</text>
              <text class="col col-title">职位</text>
              <text class="col col-num">工号</text>
              <text class="col col-ext">外部ID</text>
            </view>

            <view
              v-for="(item, index) in filteredEmployees"
              :key="item.id || index"
              class="table-row"
            >
              <text class="col col-name">{{ item.name || '-' }}</text>
              <text class="col col-mobile">{{ item.mobile || '-' }}</text>
              <text class="col col-title">{{ getEmployeeTitle(item) }}</text>
              <text class="col col-num">{{ item.employee_num || '-' }}</text>
              <text class="col col-ext">{{ item.ext_id || '-' }}</text>
            </view>

            <view v-if="!loading && filteredEmployees.length === 0" class="table-empty">
              <text>{{ keyword ? '未找到匹配人员' : '该部门暂无人员' }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { queryDepartments, queryEmployees } from '@/utils/api/delicloud.js'

const loading = ref(false)
const errorMsg = ref('')
const keyword = ref('')
const selectedDeptId = ref('')
const departmentList = ref([])
const employeeList = ref([])

const buildDeptTree = (departments) => {
  const map = new Map()
  departments.forEach((dept) => {
    map.set(dept.id, { ...dept, children: [] })
  })

  const roots = []
  departments.forEach((dept) => {
    const node = map.get(dept.id)
    if (!dept.pid || dept.pid === '0') {
      roots.push(node)
    } else if (map.has(dept.pid)) {
      map.get(dept.pid).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

const flattenDeptTree = (nodes, level = 0) => {
  const result = []
  nodes.forEach((node) => {
    result.push({ ...node, level })
    if (node.children?.length) {
      result.push(...flattenDeptTree(node.children, level + 1))
    }
  })
  return result
}

const flatDeptList = computed(() => flattenDeptTree(buildDeptTree(departmentList.value)))

const deptNameMap = computed(() => {
  const map = {}
  departmentList.value.forEach((dept) => {
    map[dept.id] = dept.name
  })
  return map
})

const selectedDeptName = computed(() => {
  if (!selectedDeptId.value) return '全部人员'
  return deptNameMap.value[selectedDeptId.value] || '全部人员'
})

const belongsToDepartment = (employee, deptId) => {
  return employee.department_infos?.some((info) => info.id === deptId)
}

const deptEmployees = computed(() => {
  if (!selectedDeptId.value) return employeeList.value
  return employeeList.value.filter((emp) => belongsToDepartment(emp, selectedDeptId.value))
})

const filteredEmployees = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return deptEmployees.value
  return deptEmployees.value.filter((emp) => (emp.name || '').includes(kw))
})

const getDeptEmployeeCount = (deptId) => {
  const count = employeeList.value.filter((emp) => belongsToDepartment(emp, deptId)).length
  return count > 0 ? count : ''
}

const getEmployeeTitle = (employee) => {
  const deptInfo = selectedDeptId.value
    ? employee.department_infos?.find((info) => info.id === selectedDeptId.value)
    : employee.department_infos?.[0]
  return deptInfo?.title || '-'
}

const selectDepartment = (deptId) => {
  selectedDeptId.value = deptId
  keyword.value = ''
}

const handleBack = () => {
  const pages = getCurrentPages && getCurrentPages()
  const canGoBack = Array.isArray(pages) && pages.length > 1

  if (canGoBack) {
    uni.navigateBack({
      fail: () => {
        uni.redirectTo({ url: '/pages/deli/index' })
      }
    })
  } else {
    uni.redirectTo({
      url: '/pages/deli/index',
      fail: () => {
        uni.reLaunch({ url: '/pages/deli/index' })
      }
    })
  }
}

const loadAllData = async () => {
  if (loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const [departments, employees] = await Promise.all([
      queryDepartments(),
      queryEmployees()
    ])
    departmentList.value = departments
    employeeList.value = employees

    if (!selectedDeptId.value && departments.length > 0) {
      const defaultDept = departments.find((d) => d.name === '综合部') || departments[0]
      selectedDeptId.value = defaultDept.id
    }
  } catch (error) {
    errorMsg.value = error.message || '加载失败'
    uni.showToast({
      title: errorMsg.value,
      icon: 'none',
      duration: 2500
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAllData()
})
</script>

<style lang="scss" scoped>
.org-page {
  min-height: 100vh;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 80rpx 24rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e8e8;
}

.back-btn {
  display: flex;
  align-items: center;
  min-width: 120rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
  line-height: 1;
}

.back-text {
  font-size: 28rpx;
  color: #333;
}

.page-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.refresh-btn {
  min-width: 120rpx;
  text-align: right;
  font-size: 28rpx;
  color: #1890ff;
}

.refresh-btn.disabled {
  opacity: 0.5;
}

.error-banner {
  padding: 16rpx 24rpx;
  background: #fff2f0;
  color: #ff4d4f;
  font-size: 26rpx;
}

.main-body {
  flex: 1;
  display: flex;
  min-height: 0;
  height: calc(100vh - 160rpx);
}

.dept-panel {
  width: 240rpx;
  flex-shrink: 0;
  background: #fff;
  border-right: 1rpx solid #e8e8e8;
  height: 100%;
}

.dept-company {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 16rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.company-icon {
  font-size: 28rpx;
}

.company-name {
  font-size: 24rpx;
  color: #333;
  font-weight: 600;
  line-height: 1.4;
}

.dept-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 16rpx 20rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.dept-item.active {
  background: #e6f7ff;
  border-right: 4rpx solid #1890ff;
}

.dept-folder {
  font-size: 24rpx;
  flex-shrink: 0;
}

.dept-name {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dept-count {
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
}

.side-empty {
  padding: 40rpx 16rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}

.employee-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx 12rpx;
}

.panel-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.panel-count {
  font-size: 24rpx;
  color: #999;
}

.search-bar {
  padding: 0 24rpx 16rpx;
}

.search-input {
  height: 64rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
}

.table-wrap {
  flex: 1;
  height: 0;
}

.data-table {
  min-width: 900rpx;
}

.table-row {
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f0f0f0;
  min-height: 80rpx;
}

.table-head {
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 1;
}

.table-head .col {
  font-weight: 600;
  color: #666;
}

.col {
  padding: 16rpx 12rpx;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-name {
  width: 160rpx;
  flex-shrink: 0;
}

.col-mobile {
  width: 200rpx;
  flex-shrink: 0;
}

.col-title {
  width: 140rpx;
  flex-shrink: 0;
}

.col-num {
  width: 120rpx;
  flex-shrink: 0;
}

.col-ext {
  width: 160rpx;
  flex-shrink: 0;
}

.table-empty {
  padding: 80rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
</style>
