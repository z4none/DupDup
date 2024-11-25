<template>
  <div>     
    <div class="p-1">
      <div class="mb-2 border bg-gray-50 p-3">
        <div class="text-lg mb-2">要扫描的目录</div>
        <n-space vertical>
          <div v-for="dir in store.includeDirs" :key="dir" class="flex items-center hover:bg-gray-100 p-1 -ml-1 -mr-1">
            <div class="flex-1 text-ellipsis">{{ dir }}</div>
            <n-button circle tertiary type="error" size="small" @click="store.removeIncludeDir(dir)">
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34z" /></svg>
            </n-button>
          </div>
        </n-space>
        <n-button class="mt-2" @click="selectDir">添加目录</n-button>
      </div>
      
      
      
      <div class="mb-2 border bg-gray-50 p-3">
        <div class="text-lg mb-2">要扫描的文件类型</div>
        <n-space>
          <n-checkbox v-model:checked="allTypesSelected" @update:checked="toggleAllTypes">所有</n-checkbox>
          <n-checkbox v-model:checked="store.selectedTypes.video">视频</n-checkbox>
          <n-checkbox v-model:checked="store.selectedTypes.audio">音频</n-checkbox>
          <n-checkbox v-model:checked="store.selectedTypes.image">图片</n-checkbox>
          <n-checkbox v-model:checked="store.selectedTypes.document">文档</n-checkbox>
          <n-checkbox v-model:checked="store.selectedTypes.archive">压缩包</n-checkbox>
          <n-checkbox v-model:checked="store.selectedTypes.other">其他</n-checkbox>
        </n-space>
      </div>
      <div class="mb-2 border bg-gray-50 p-3">
        <div class="text-lg mb-2">排除的路径关键词</div>
        <div class="border bg-gray-100 p-2 mb-2">
          <div v-for="pattern in store.excludePatterns" :key="pattern" class="inline-flex items-center hover:bg-white p-1 m-1 transition-colors duration-200">
            <div class="flex-1">{{ pattern }}</div>
            <n-button circle tertiary type="error" size="small" @click="store.removeExcludePattern(pattern)">
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34z" /></svg>
            </n-button>
          </div>
        </div>
        <n-button type="primary" @click="showAddPatternDialog">添加</n-button>
        <n-modal v-model:show="showAddPatternDialogVisible">
          <n-card
            title="添加要排除的路径关键词"
            :bordered="false"
            size="small"
            style="width: 500px;"
          >
            <n-input v-model:value="newPattern" placeholder="输入要排除的路径关键词" />
            <template #action>
              <n-button type="primary" @click="addPattern" :disabled="!newPattern">添加</n-button>
            </template>
          </n-card>
        </n-modal>
      </div>

      <div v-if="store.processing" class="mb-2 border bg-gray-50 p-3">
        <div class="mb-2">已扫描 {{ store.files.length }} 个文件</div>
        <div class="mb-2 text-ellipsis">正在处理: {{ store.currentFile }}</div>
        <n-progress type="line" :percentage="store.progress" :indicator-placement="'inside'" />
      </div>   

      <n-space class="p-2">
        <n-button 
          @click="process" 
          :loading="store.processing"
          :disabled="store.includeDirs.length === 0 || !hasSelectedFileTypes"
          type="primary"
        >
          开始扫描
        </n-button>
        <n-button 
          v-if="store.processing"
          @click="store.stopProcess"
          type="warning"
        >
          停止扫描
        </n-button>
      </n-space>

    </div>

    
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NSpace, NCheckbox, NProgress, NInput, NModal, NCard } from 'naive-ui'
import { open } from '@tauri-apps/plugin-dialog';
import useStore from '../store';

const router = useRouter();
const store = useStore();

const showAddPatternDialogVisible = ref(false);
const newPattern = ref('');

const showAddPatternDialog = () => {
  newPattern.value = '';
  showAddPatternDialogVisible.value = true;
};

const addPattern = () => {
  if (newPattern.value) {
    store.addExcludePattern(newPattern.value);
    showAddPatternDialogVisible.value = false;
    newPattern.value = '';
  }
};

const allTypesSelected = computed({
  get: () => {   
    return Object.values(store.selectedTypes).every(v => v === true);
  },
  set: (value) => {
    toggleAllTypes(value);
  }
});

const hasSelectedFileTypes = computed(() => {
  return Object.values(store.selectedTypes).some(v => v)
})

const toggleAllTypes = (checked) => {
  Object.keys(store.selectedTypes).forEach(key => {
    store.selectedTypes[key] = checked;
  });
};

const lastFile = computed(() => {
  if(store.files.length > 0) {
    return store.files[store.files.length - 1];
  }
  return ''
})

const selectDir = async () => {
  const dirs = await open({
    multiple: true,
    directory: true,
  });
  if (dirs && dirs.length > 0) {
    store.addIncludeDirs(dirs);
  }
};

const process = async () => {
  if (store.includeDirs.length === 0) return;

  try {
    // 过滤文件时考虑选中的文件类型
    await store.process(store.selectedTypes);
    if (store.duplicateGroups.length > 0) {
      router.push('/preview');
    }
  } catch (error) {
    console.error('Error processing files:', error);
  }
};
</script>

<style scoped>
.config-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.config-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.config-label {
  width: 100px;
}

.config-input {
  flex: 1;
}

.config-btn {
  margin-top: 20px;
  text-align: center;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
