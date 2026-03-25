<template>
  <div class="camera-container">
    <h1>摄像头连续拍照演示</h1>
    <div class="controls">
      <button 
        @click="startCameraAndCapture" 
        :disabled="isCapturing"
        class="capture-btn"
      >
        {{ isCapturing ? `正在拍照 (${capturedCount}/5)...` : '开始拍照' }}
      </button>
    </div>
    <video ref="videoRef" autoplay playsinline style="display: none;"></video>
    <canvas ref="canvasRef" style="display: none;"></canvas>
    <div class="gallery">
      <div v-for="(photo, index) in photos" :key="index" class="photo-item">
        <img :src="photo.url" :alt="'Photo ' + (index + 1)" />
        <div class="photo-label">照片 {{ index + 1 }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';

const videoRef = ref(null);
const canvasRef = ref(null);
const isCapturing = ref(false);
const capturedCount = ref(0);
const photos = ref([]);
let mediaStream = null;
let captureInterval = null;

const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
};

const startCameraAndCapture = async () => {
  if (isCapturing.value) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.value.srcObject = mediaStream;
    await new Promise(resolve => {
      videoRef.value.onloadedmetadata = () => {
        videoRef.value.play();
        resolve();
      };
    });
    isCapturing.value = true;
    capturedCount.value = 0;
    photos.value = [];
    captureInterval = setInterval(() => {
      takeSnapshot();
      capturedCount.value++;
      if (capturedCount.value >= 5) {
        clearInterval(captureInterval);
        isCapturing.value = false;
        stopCamera();
      }
    }, 1000);
  } catch (error) {
    console.error('无法访问摄像头:', error);
    alert('无法访问摄像头，请确保已授予权限。');
  }
};

const takeSnapshot = async () => {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageDataUrl = canvas.toDataURL('image/png');
  photos.value.push({ url: imageDataUrl });
  try {
    await fetch('/api/save-pic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl })
    });
  } catch (error) {
    console.error('保存照片失败:', error);
  }
};

onUnmounted(() => {
  stopCamera();
  if (captureInterval) {
    clearInterval(captureInterval);
  }
});
</script>

<style scoped>
.camera-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem 1rem;
  text-align: center;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #333;
}
h1 {
  font-size: 2.2rem;
  margin-bottom: 2.5rem;
  color: #1a202c;
  font-weight: 700;
  letter-spacing: -0.025em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.controls {
  margin-bottom: 3.5rem;
}
.capture-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 9999px;
  padding: 1rem 3rem;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 25px -5px rgba(118, 75, 162, 0.4), 0 8px 10px -6px rgba(118, 75, 162, 0.1);
}
.capture-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(118, 75, 162, 0.5), 0 10px 10px -5px rgba(118, 75, 162, 0.2);
}
.capture-btn:disabled {
  background: #cbd5e0;
  color: #718096;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2rem;
  padding: 1rem;
}
.photo-item {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}
.photo-item:nth-child(1) { animation-delay: 0.1s; }
.photo-item:nth-child(2) { animation-delay: 0.2s; }
.photo-item:nth-child(3) { animation-delay: 0.3s; }
.photo-item:nth-child(4) { animation-delay: 0.4s; }
.photo-item:nth-child(5) { animation-delay: 0.5s; }
.photo-item:hover {
  transform: translateY(-5px) scale(1.02) !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 10;
}
.photo-item img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
}
.photo-label {
  padding: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  background: #ffffff;
  color: #2d3748;
  border-top: 1px solid #edf2f7;
}
@keyframes fadeInDown {
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
