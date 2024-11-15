import { ref } from 'vue';
import { defineStore } from 'pinia';
import { readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

export default defineStore('main', () => {
  const includeDirs = ref([]);
  const excludeDirs = ref([]);
  const files = ref([]);

  function addIncludeDirs(dirs) {
    includeDirs.value = Array.from(new Set([...includeDirs.value, ...dirs]));
  }

  function removeIncludeDir(dir) {
    includeDirs.value = includeDirs.value.filter(item => item !== dir);
  }

  function addExcludeDirs(dirs) {
    excludeDirs.value = Array.from(new Set([...excludeDirs.value, ...dirs]));
  }

  function removeExcludeDir(dir) {
    excludeDirs.value = excludeDirs.value.filter(item => item !== dir);
  }

  async function processDir(dir) {
    console.log(dir);    
    const entries = await readDir(dir);
    for(let entry of entries) {
      const path = await join(dir, entry.name);
      if(entry.isDirectory) {
        console.log(entry);   
        processDir(path);
      } else {
        files.value.push(path);
      }
    }
  }

  async function process() {
    files.value = [];
    let dirs = [...includeDirs.value];
    while(dirs.length > 0) {
      const dir = dirs.shift();
      const entries = await readDir(dir);
      for(let entry of entries) {
        const path = await join(dir, entry.name);
        if(entry.isDirectory) {
          dirs.push(path);
        }
        else {
          files.value.push(path);
        }
      }
    }   
  }

  return { 
    includeDirs, 
    excludeDirs,
    files,
    addIncludeDirs,
    removeIncludeDir, 
    addExcludeDirs,
    removeExcludeDir,
    addExcludeDirs,
    removeExcludeDir,
    process,    
  };
});
