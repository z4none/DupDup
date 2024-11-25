import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { readDir, stat, remove } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';

// 默认文件类型配置
const defaultFileTypes = {
  // 图片文件
  image: [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', 
    '.tiff', '.svg', '.ico', '.raw', '.heic'
  ],
  // 文档文件
  document: [
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.pdf', '.txt', '.rtf', '.md', '.csv', '.json',
    '.xml', '.html', '.htm', '.epub', '.mobi'
  ],
  // 视频文件
  video: [
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv',
    '.webm', '.m4v', '.mpeg', '.mpg', '.3gp', '.rmvb'
  ],
  // 音频文件
  audio: [
    '.mp3', '.wav', '.flac', '.m4a', '.aac', '.wma',
    '.ogg', '.opus', '.mid', '.midi', '.aiff'
  ],
  // 压缩包文件
  archive: [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    '.xz', '.iso', '.cab', '.tgz', '.tbz2', '.txz'
  ]
};

export default defineStore('main', () => {
  const includeDirs = ref([]);
  const excludePatterns = ref(['$RECYCLE.BIN', 'System Volume Information', 'node_modules']); // 默认排除一些系统目录
  const files = ref([]);
  const duplicateGroups = ref([]);
  const currentFile = ref('');
  const progress = ref(0);
  const fileTypes = ref({ ...defaultFileTypes });
  const processing = ref(false);
  const stopFlag = ref(false);
  const selectedTypes = ref({
    video: true,
    audio: true,
    image: true,
    document: true,
    archive: true,
    other: false
  });
  const fileStats = ref({
    total: { count: 0, size: 0 },
    video: { count: 0, size: 0 },
    audio: { count: 0, size: 0 },
    image: { count: 0, size: 0 },
    document: { count: 0, size: 0 },
    archive: { count: 0, size: 0 },
    other: { count: 0, size: 0 }
  });
  const selections = ref({});

  // 停止处理
  const stopProcess = () => {
    stopFlag.value = true;
  };

  // 检查文件是否属于指定类型
  const isFileType = (filename, type) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return fileTypes.value[type]?.includes(ext) || false;
  };

  // 获取文件类型
  const getFileType = (filename) => {
    for (const type of Object.keys(fileTypes.value)) {
      if (isFileType(filename, type)) {
        return type;
      }
    }
    return 'other';
  };

  // 添加扩展名到指定类型
  const addExtension = (type, extension) => {
    if (!fileTypes.value[type]) return false;
    const ext = extension.startsWith('.') ? extension.toLowerCase() : '.' + extension.toLowerCase();
    if (!fileTypes.value[type].includes(ext)) {
      fileTypes.value[type].push(ext);
      return true;
    }
    return false;
  };

  // 从指定类型移除扩展名
  const removeExtension = (type, extension) => {
    if (!fileTypes.value[type]) return false;
    const ext = extension.startsWith('.') ? extension.toLowerCase() : '.' + extension.toLowerCase();
    const index = fileTypes.value[type].indexOf(ext);
    if (index > -1) {
      fileTypes.value[type].splice(index, 1);
      return true;
    }
    return false;
  };

  // 重置文件类型到默认值
  const resetFileTypes = () => {
    fileTypes.value = { ...defaultFileTypes };
  };

  // 获取所有文件类型
  const getAllFileTypes = computed(() => Object.keys(fileTypes.value));

  // 获取指定类型的所有扩展名
  const getExtensions = (type) => fileTypes.value[type] || [];

  function addExcludePattern(pattern) {
    if (!excludePatterns.value.includes(pattern)) {
      excludePatterns.value.push(pattern);
    }
  }

  function removeExcludePattern(pattern) {
    excludePatterns.value = excludePatterns.value.filter(p => p !== pattern);
  }

  // 检查路径是否应该被排除
  function shouldExcludePath(path) {
    return excludePatterns.value.some(pattern => 
      path.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  async function addIncludeDirs(dirs) {
    includeDirs.value = Array.from(new Set([...includeDirs.value, ...dirs]));
  }

  function removeIncludeDir(dir) {
    includeDirs.value = includeDirs.value.filter(item => item !== dir);
  }

  async function collectFiles(dir) {
    if (stopFlag.value) {
      return;
    }

    try {
      console.log('collecting files from', dir);      
      const entries = await readDir(dir);
      
      for(let i = 0; i < entries.length; i++) {
        if (stopFlag.value) {
          return;
        }
        
        const entry = entries[i];
        const path = await join(dir, entry.name);
        
        if (shouldExcludePath(path)) {
          console.log('排除路径:', path);
          continue;
        }

        if(entry.isDirectory) {
          // 每处理完一个目录，让出主线程控制权
          await new Promise(resolve => setTimeout(resolve, 0));
          await collectFiles(path);
        } else if(!entry.isDirectory) {
          files.value.push(path);
          currentFile.value = path;
          // 每处理10个文件，让出主线程控制权
          if (files.value.length % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    } catch (error) {
      console.warn(`无法读取目录 ${dir}:`, error);
    }
  }

  async function calculateFileHash(filePath) {
    try {
      const hash = await invoke('calculate_file_hash', { path: filePath });
      return { path: filePath, hash };
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return { path: filePath, hash: null };
    }
  }

  async function process() {
    if (processing.value) return;
    
    processing.value = true;
    progress.value = 0;
    currentFile.value = '';
    duplicateGroups.value = [];
    files.value = [];
    stopFlag.value = false;  // 重置停止标志

    try {
      // 1. 收集所有文件
      for (const dir of includeDirs.value) {
        if (stopFlag.value) {
          break;
        }
        await collectFiles(dir);
      }

      if (stopFlag.value) {
        processing.value = false;
        currentFile.value = '';
        return;
      }

      console.log('files before type filter:', files.value);
      
      if (Object.keys(selectedTypes.value).length > 0) {
        const filteredFiles = files.value.filter(filePath => {
          const type = getFileType(filePath);
          return selectedTypes.value[type];
        });
        files.value = filteredFiles;
      }

      console.log('files after type filter:', files.value);

      // 2. 按文件大小分组
      const sizeGroups = new Map();
      const totalFiles = files.value.length;
      
      for(let i = 0; i < files.value.length; i++) {
        const filePath = files.value[i];
        currentFile.value = filePath;
        progress.value = Math.floor((i / totalFiles) * 40); // 前40%进度用于文件大小统计
        
        const stats = await stat(filePath);
        const size = stats.size;
        
        if (!sizeGroups.has(size)) {
          sizeGroups.set(size, []);
        }
        sizeGroups.get(size).push(filePath);
      }

      // 3. 对相同大小的文件计算哈希值
      const potentialDuplicates = Array.from(sizeGroups.entries())
        .filter(([_, group]) => group.length > 1);
      
      const fileHashes = new Map();
      const totalPotentialDuplicates = potentialDuplicates.reduce((sum, [_, group]) => sum + group.length, 0);
      let processedFiles = 0;

      for (const [size, group] of potentialDuplicates) {
        for (const filePath of group) {
          currentFile.value = filePath;
          const { hash } = await calculateFileHash(filePath);
          
          if (hash) {
            if (!fileHashes.has(hash)) {
              fileHashes.set(hash, { size, files: [] });
            }
            fileHashes.get(hash).files.push(filePath);
          }

          processedFiles++;
          progress.value = Math.floor(40 + (processedFiles / totalPotentialDuplicates) * 60); // 后60%进度用于哈希计算
        }
      }

      // 4. 找出重复文件
      duplicateGroups.value = Array.from(fileHashes.values())
        .filter(group => group.files.length > 1)
        .map(({ size, files }) => ({ size, files }))
        .sort((a, b) => b.files.length - a.files.length);

      progress.value = 100;
      calculateFileStats();
    } catch (error) {
      console.error('Error during processing:', error);
    } finally {
      processing.value = false;
    }
  }

  const calculateFileStats = () => {
    // 重置统计
    Object.keys(fileStats.value).forEach(key => {
      fileStats.value[key] = { count: 0, size: 0 };
    });

    // 遍历所有重复文件组进行统计
    duplicateGroups.value.forEach(group => {
      group.files.forEach(file => {
        // 更新总计
        fileStats.value.total.count++;
        fileStats.value.total.size += group.size;

        // 根据文件类型更新分类统计
        let ext = file.split('.').pop()?.toLowerCase() || '';
        let type = 'other';

        if(ext.length) ext = '.' + ext;
        
        if (defaultFileTypes.video.includes(ext)) type = 'video';
        else if (defaultFileTypes.audio.includes(ext)) type = 'audio';
        else if (defaultFileTypes.image.includes(ext)) type = 'image';
        else if (defaultFileTypes.document.includes(ext)) type = 'document';
        else if (defaultFileTypes.archive.includes(ext)) type = 'archive';

        fileStats.value[type].count++;
        fileStats.value[type].size += group.size;
      });
    });
  }

  async function deleteFiles(selections, recycle = false) {
    try {
      console.log('Current selections:', selections);
      
      const filesToDelete = [];
      duplicateGroups.value.forEach((group, groupIndex) => {
        group.files.forEach((file, fileIndex) => {
          if (!selections.value[groupIndex]?.[fileIndex]) {
            filesToDelete.push(file);
          }
        });
      });    

      console.log('Files to delete:', filesToDelete);

      // 直接删除文件
      for (const file of filesToDelete) {
        try {
          if(recycle) {
            console.log('Moving to recycle bin:', file);
            await invoke('move_to_recycle_bin', { filePath: file });
          }
          else {
            console.log('Permanently deleting:', file);
            await remove(file);
          }
        } catch (error) {
          console.error(`Failed to delete file: ${file}`, error);
        }
      }
      
      // 重新扫描文件
      await process();
    } catch (error) {
      console.error('Error during deleting files:', error);
    }
  }

  return { 
    includeDirs, 
    excludePatterns,
    files,
    duplicateGroups,
    currentFile,
    progress,
    selectedTypes,
    fileTypes,
    processing,
    stopFlag,
    fileStats,
    stopProcess,
    isFileType,
    getFileType,
    addExtension,
    removeExtension,
    resetFileTypes,
    getAllFileTypes,
    getExtensions,
    addExcludePattern,
    removeExcludePattern,
    addIncludeDirs,
    removeIncludeDir,
    collectFiles,
    process,
    calculateFileStats,
    deleteFiles,
  };
});
