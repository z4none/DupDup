<script setup>
import { ref, onMounted } from "vue";
import { NConfigProvider } from 'naive-ui'

/**
 * js 文件下使用这个做类型提示
 * @type import('naive-ui').GlobalThemeOverrides
 */
const themeOverrides = {
}
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <RouterView />
</n-config-provider>
</template>

<style scoped>

</style>
