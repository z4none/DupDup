<template>
  <div class="p-2">
    <div class="flex justify-between items-center mb-2">
      <n-button size="small" @click="router.push('/config')" class="mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 12 12" class="mr-1">
          <g fill="none"><path d="M10.5 6a.75.75 0 0 0-.75-.75H3.81l1.97-1.97a.75.75 0 0 0-1.06-1.06L1.47 5.47a.75.75 0 0 0 0 1.06l3.25 3.25a.75.75 0 0 0 1.06-1.06L3.81 6.75h5.94A.75.75 0 0 0 10.5 6z" fill="currentColor"></path></g>
        </svg>
        <span>返回</span>
      </n-button>
      <h2 class="text-lg flex-1">查找到 {{ store.duplicateGroups.length }} 组重复文件</h2>      
    </div>
    <div class="flex w-full">
      <div class="bg-gray-50 p-2 w-60">
        <div class="text-sm font-medium mb-1">文件统计</div>
        <div class="space-y-2">
          <div v-for="(stat, type) in store.fileStats" :key="type" 
            class="bg-white p-1.5 rounded flex justify-between text-sm"            
          >
            <div class="font-medium">{{ typeNames[type] || type }}</div>
            <div class="text-gray-600">
              {{ stat.count / 2 }} 个文件，{{ formatFileSize(stat.size / 2).formatted }}
            </div>
          </div>
        </div>
      </div>
      <div class="flex-1">
        <div class="flex space-x-2 mb-2">      
          <n-button size="small" @click="selectFirstInGroups">保留每组第一个</n-button>
          <n-button size="small" @click="selectLastInGroups">保留每组最后一个</n-button>
          <span class="flex-1"></span>
          <n-button 
            size="small" 
            type="primary" 
            @click="deleteFiles(true)" 
            :disabled="!hasAnySelection"
          >移到回收站</n-button>
          <n-button 
            size="small" 
            type="error" 
            @click="deleteFiles(false)" 
            :disabled="!hasAnySelection"
          >直接删除</n-button>
        </div>
    
        <TransitionGroup 
          name="list" 
          tag="div" 
          class="space-y-2"
        >
          <div v-for="(group, index) in store.duplicateGroups" 
            :key="group.files[0]" 
            class="border rounded p-2 list-item"
          >
            <div class="flex justify-between items-center bg-gray-50 p-1.5">
              <div class="flex items-center gap-2">
                <span>组 {{ index + 1 }} ({{ group.files.length }} 个文件)</span>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <span class="text-gray-600">({{ formatFileSize(group.size).formatted }})</span>
                  </template>
                  {{ formatFileSize(group.size).bytes }} 字节
                </n-tooltip>
              </div>
            </div>
            <div class="space-y-1" v-if="selections[index]" id="items">   
              <div v-for="(file, fileIndex) in group.files" :key="file" class="flex items-center gap-4">
                <n-image
                  lazy
                  v-if="isImageFile(file) && thumbnails.has(file)"
                  :src="thumbnails.get(file)"
                  :alt="file"
                  class="w-8 h-8 object-cover flex-shrink-0"
                  preview-disabled
                />
                <n-checkbox v-model:checked="selections[index][fileIndex]">
                  <span :class="{ 'line-through text-gray-400': !selections[index][fileIndex] }">
                    {{ file }}
                  </span>
                </n-checkbox>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCheckbox, NTooltip, NImage } from 'naive-ui';
import { remove, readFile } from '@tauri-apps/plugin-fs';
import useStore from '../store';
import { useDialog } from 'naive-ui';

const router = useRouter();
const store = useStore();
const dialog = useDialog();
const thumbnails = ref(new Map());

const isImageFile = (filePath) => {
  return store.isFileType(filePath, 'image');
};

const loadThumbnail = async (filePath) => {
  try {
    const fileContent = await readFile(filePath);
    const blob = new Blob([fileContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    thumbnails.value.set(filePath, url);
  } catch (error) {
    console.error(`Error loading thumbnail for ${filePath}:`, error);
  }
};

const loadThumbnails = async (group) => {
  for (const file of group.files) {
    if (isImageFile(file) && !thumbnails.value.has(file)) {
      await loadThumbnail(file);
    }
  }
};

const formatFileSize = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return {
    formatted: `${size.toFixed(1)}${units[unitIndex]}`,
    bytes: bytes.toLocaleString()
  };
};

// 初始化选择状态
const selections = ref([]);

const typeNames = {
  total: '总计',
  video: '视频',
  audio: '音频',
  image: '图片',
  document: '文档',
  archive: '压缩包',
  other: '其他'
}

const init = () => {
  // 如果没有重复文件组，返回配置页面
  if (store.duplicateGroups.length === 0) {
    router.push('/config');
    return;
  }
  
  // 初始化选择状态
  selections.value = store.duplicateGroups.map(group => {
      let arr = Array(group.files.length).fill(false);
      arr[0] = true;
      return arr;
    }
  );

  // 加载所有组的缩略图
  store.duplicateGroups.forEach(loadThumbnails);
}

onMounted(init);

onUnmounted(() => {
  // 清理创建的 URL
  for (const url of thumbnails.value.values()) {
    URL.revokeObjectURL(url);
  }
});

const hasSelection = (groupIndex) => {
  return selections.value[groupIndex]?.some(selected => selected) || false;
};

const hasAnySelection = computed(() => {
  return selections.value.some((groupSelections, index) => hasSelection(index));
});


const deleteFiles = async (recycle) => {
  try {    
    dialog.warning({
      title: '警告',
      content: recycle ? '将重复文件移动到回收站，确定要继续吗？' : '直接删除文件将无法恢复，确定要继续吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        await store.deleteFiles(selections, recycle);
      }
    });
  } catch (error) {
    console.error('Failed to delete files:', error);
  }
};

const selectFirstInGroups = () => {
  store.duplicateGroups.forEach((group, groupIndex) => {
    if (!selections.value[groupIndex]) {
      selections.value[groupIndex] = new Array(group.files.length).fill(false);
    }
    // 选择每组的第一个文件，取消选择其他文件
    selections.value[groupIndex] = selections.value[groupIndex].map((_, index) => index === 0);
  });
};

const selectLastInGroups = () => {
  store.duplicateGroups.forEach((group, groupIndex) => {
    if (!selections.value[groupIndex]) {
      selections.value[groupIndex] = new Array(group.files.length).fill(false);
    }
    // 如果组内至少有两个文件，选择最后一个，取消选择其他文件
    selections.value[groupIndex] = selections.value[groupIndex].map((_, index) => index === group.files.length - 1 && group.files.length > 1);
  });
};
</script>

<style scoped>
.list-item {
  transition: all 0.3s ease;
  list-style: none;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.list-leave-active {
  position: absolute; 
  width: 100%;
}

.list-move {
  transition: transform 0.3s ease;
}
</style>
