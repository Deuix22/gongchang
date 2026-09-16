<template>
  <view />
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  uni.redirectTo({
    url: '/pages/deli/attendance/daily'
  })
})
</script>
