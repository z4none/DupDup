<template>
    <div class="directory-item flex justify-between items-center p-1 text-xs hover:bg-slate-200">
      <span>{{ path }}</span>
      <button @click="emitDeleteEvent">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 512 512"><path d="M289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34z" fill="currentColor"></path></svg>
      </button>
    </div>
  </template>
  
  <script>
  export default {
    name: 'DirectoryItem',
    props: {
      path: {
        type: String,
        required: true
      }
    },
    methods: {
      emitDeleteEvent() {
        this.$emit('delete');
      }
    }
  }
  </script>
  
  <style scoped>
  .close-icon {
    background: none;
    border: none;
    cursor: pointer;
  }
  </style>
  