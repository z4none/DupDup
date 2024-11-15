<template>
  <div>
    <div class="flex flex-col p-2">
      <div class="flex flex-col mb-2">
        <div class="flex items-center mb-2">
            <span class="mr-2">包含文件夹</span>
            <n-button @click="selectIncludeDirs" size="tiny">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="12" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"></path></svg>
            </n-button>
        </div>
        <div class="border border-gray-300 min-h-20 max-h-36 overflow-x-hidden overflow-y-scroll">
          <DirectoryItem v-for="dir in store.includeDirs" :key="dir" :path="dir" @delete="store.removeIncludeDir(dir)" />
        </div>
      </div>
      <div class="flex flex-col mb-2">
        <div class="flex items-center mb-2">
            <span class="mr-2">排除文件夹</span>
            <n-button @click="selectExcludeDirs" size="tiny">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12" height="12" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"></path></svg>
            </n-button>
        </div>
        <div class="border border-gray-300 min-h-20 max-h-36 overflow-x-hidden overflow-y-scroll">
          <DirectoryItem v-for="dir in store.excludeDirs" :key="dir" :path="dir" @delete="store.removeExcludeDir(dir)" />
        </div>
      </div>      
    </div>    
    <div class="p-2">
      <div>
        {{ store.files.length }} 
      </div>
      <div>
        {{ lastFile }}
      </div>
      <n-button @click="process">处理</n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { NButton } from 'naive-ui'
import { open } from '@tauri-apps/plugin-dialog';
import useStore from '../store';
import DirectoryItem from '../components/DirectoryItem.vue';

const store = useStore();

const lastFile = computed(() => {
  if(store.files.length > 0) {
    return store.files[store.files.length - 1];
  }
  return '';
})

const selectIncludeDirs = async () => {
  const dirs = await open({
    multiple: true,
    directory: true,
  });
  if (dirs && dirs.length > 0) {
    store.addIncludeDirs(dirs);
  }
};

const selectExcludeDirs = async () => {
  const dirs = await open({
    multiple: true,
    directory: true,
  });
  if (dirs && dirs.length > 0) {
    store.addExcludeDirs(dirs);
  }
};

const process = () => {
  store.process();
}

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
</style>

