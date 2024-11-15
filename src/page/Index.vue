<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
    router.push('/config');
});
</script>

<template>
  <div>
    <h1>Index</h1>
  </div>
</template>

<style scoped>
</style>
