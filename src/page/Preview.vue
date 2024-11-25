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
              {{ stat.count }} 个文件，{{ formatFileSize(stat.size).formatted }}
            </div>
          </div>
        </div>
      </div>
      <div class="flex-1">
        <div class="flex space-x-2 mb-2">      
          <n-button size="small" @click="selectFirstInGroups">选择每组第一个</n-button>
          <n-button size="small" @click="selectSecondInGroups">选择每组第二个</n-button>
          <span class="flex-1"></span>
          <n-button 
            size="small" 
            type="primary" 
            @click="keepAllSelected" 
            :disabled="!hasAnySelection"
          >仅保留选中项</n-button>
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

const router = useRouter();
const store = useStore();
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
  selections.value = store.duplicateGroups.map(group =>
    Array(group.files.length).fill(false)
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

const keepSelected = async (groupIndex) => {
  const group = store.duplicateGroups[groupIndex];
  const toDelete = group.files.filter((_, i) => !selections.value[groupIndex][i]);
  
  try {
    // 删除未选中的文件
    for (const file of toDelete) {
      await remove(file);
    }
    
    // 更新重复文件组
    const remainingFiles = group.files.filter((_, i) => selections.value[groupIndex][i]);
    if (remainingFiles.length > 1) {
      store.duplicateGroups[groupIndex].files = remainingFiles;
    } else {
      // 如果组内只剩一个文件，删除整个组
      store.duplicateGroups.splice(groupIndex, 1);
    }
    
    // 更新选择状态
    if (store.duplicateGroups.length > 0) {
      // selections.value = store.duplicateGroups.map(group => 
      //   Array(group.files.length).fill(false)
      // );
    } else {
      // 如果没有重复文件组了，返回配置页面
      router.push('/config');
    }
  } catch (error) {
    console.error('Error processing files:', error);
  }
};

const keepAllSelected = async () => {
  // 从最后一组开始处理，这样不会影响前面组的索引
  for (let i = store.duplicateGroups.length - 1; i >= 0; i--) {
    if (hasSelection(i)) {
      await keepSelected(i);
    }
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

const selectSecondInGroups = () => {
  store.duplicateGroups.forEach((group, groupIndex) => {
    if (!selections.value[groupIndex]) {
      selections.value[groupIndex] = new Array(group.files.length).fill(false);
    }
    // 如果组内至少有两个文件，选择第二个文件，取消选择其他文件
    selections.value[groupIndex] = selections.value[groupIndex].map((_, index) => index === 1 && group.files.length > 1);
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
