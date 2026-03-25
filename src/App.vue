<template>
  <CameraCapture />
</template>

<script setup>
import CameraCapture from './components/CameraCapture.vue'
</script>

<style>
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f4f8;
}
#app {
  width: 100%;
  min-height: 100vh;
}
</style>
