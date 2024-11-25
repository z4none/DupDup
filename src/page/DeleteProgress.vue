<template>
  <div class="flex items-center justify-center p-12" v-if="!done">
    <div class="text-center">
      <div class="text-lg mb-4">正在删除文件...</div>
      <n-progress
        type="circle"
        :percentage="progress"
        :indicator-placement="'inside'"
        processing
      />
      <div class="mt-4 text-sm text-gray-600">
        已处理: {{ processedCount }}/{{ totalCount }} 个文件
      </div>
    </div>
  </div>
  <div class="flex flex-col items-center justify-center p-12" v-else>
    <div class="text-lg mb-4">文件删除成功</div>    
    <n-button @click="router.push('/')" type="primary">确定</n-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import useStore from '../store';
import { NProgress, NButton} from 'naive-ui';

const router = useRouter();
const store = useStore();

const progress = ref(0);
const processedCount = ref(0);
const totalCount = ref(0);
const done = ref(false);


onMounted(async () => {
  const filesToDelete = store.getFilesToDelete();
  totalCount.value = filesToDelete.length;

  try {
    for (const [index, file] of filesToDelete.entries()) {
      try {
        await store.deleteFile(file);
        processedCount.value = index + 1;
        progress.value = Math.round((processedCount.value / totalCount.value) * 100);
      } catch (error) {
        console.error(`Failed to delete file: ${file}`, error);
      }
    }

    done.value = true;
  } catch (error) {
    console.error('Error during deletion:', error);
  }
});
</script>
