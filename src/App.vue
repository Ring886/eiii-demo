<template>
  <CameraCapture />
</template>

<script setup>
import CameraCapture from './components/CameraCapture.vue'
</script>

<style lang="less">
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f4f8;
  overflow-y: auto;
}
#app {
  width: 100%;
  // height: 100%;
  min-height: 100svh;
  overflow: visible;
  padding: 0;
}
</style>
