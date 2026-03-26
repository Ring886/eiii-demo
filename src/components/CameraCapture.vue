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
  <div class="status">
    <div class="status-title">脚本运行状态</div>
    <div class="status-array">{{ runStatusesText }}</div>
    <div class="status-list">
      <div 
        v-for="i in 5" 
        :key="i" 
        class="status-item" 
        :class="statusClass(i - 1)"
      >
        {{ displayStatus(i - 1) }}
      </div>
    </div>
  </div>
  <div ref="chartRef" class="chart"></div>
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
import { ref, onUnmounted, computed, onMounted, watch } from 'vue';
import * as echarts from 'echarts';

const videoRef = ref(null);
const canvasRef = ref(null);
const isCapturing = ref(false);
const capturedCount = ref(0);
const photos = ref([]);
const runStatuses = ref([]);
let mediaStream = null;
let captureInterval = null;
const runStatusesText = computed(() => {
  const arr = Array.from({ length: 5 }, (_, idx) => {
    const v = runStatuses.value[idx];
    if (v && typeof v === 'object') {
      const t = typeof v.time === 'number' ? v.time : '-';
      const s = v.state === 0 || v.state === 1 ? v.state : '-';
      return `{time:${t}, state:${s}}`;
    }
    return '-';
  });
  return `[${arr.join(', ')}]`;
});
const displayStatus = (idx) => {
  const v = runStatuses.value[idx];
  const s = v && typeof v === 'object' ? v.state : undefined;
  if (s === 1) return '1';
  if (s === 0) return '0';
  return '-';
};
const statusClass = (idx) => {
  const v = runStatuses.value[idx];
  const s = v && typeof v === 'object' ? v.state : undefined;
  if (s === 1) return 'ok';
  if (s === 0) return 'fail';
  return 'pending';
};

const chartRef = ref(null);
let chartInst = null;
const fmtTime = (ts) => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};
const updateChart = () => {
  if (!chartInst) return;
  const items = runStatuses.value.filter(v => v && typeof v === 'object' && (v.state === 0 || v.state === 1));
  const categories = items.map(v => fmtTime(v.time));
  const data = items.map(v => String(v.state));
  const option = {
    title: { text: '状态折线图' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'category', data: ['0', '1'] },
    series: [{ type: 'line', data, smooth: false, step: true }]
  };
  chartInst.setOption(option);
};
onMounted(() => {
  if (chartRef.value) {
    chartInst = echarts.init(chartRef.value);
    updateChart();
    window.addEventListener('resize', () => chartInst && chartInst.resize());
  }
});
watch(runStatuses, () => updateChart(), { deep: true });

const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
};

const startCameraAndCapture = async () => {
  if (isCapturing.value) return;
  try {
    try {
      await fetch('/api/clear-results', { method: 'POST' });
    } catch (_) {}
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.value.srcObject = mediaStream;
    await new Promise(resolve => {
      videoRef.value.onloadedmetadata = () => {
        videoRef.value.play();
        resolve();
      };
    });
    await new Promise(resolve => {
      if (videoRef.value.readyState >= 3) {
        resolve();
      } else {
        videoRef.value.addEventListener('canplay', resolve, { once: true });
      }
    });
    isCapturing.value = true;
    capturedCount.value = 0;
    photos.value = [];
    runStatuses.value = [];
    setTimeout(() => {
      takeSnapshot();
      capturedCount.value++;
      captureInterval = setInterval(() => {
        takeSnapshot();
        capturedCount.value++;
        if (capturedCount.value >= 5) {
          clearInterval(captureInterval);
          isCapturing.value = false;
          stopCamera();
        }
      }, 1000);
    }, 300);
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
    const resp = await fetch('/api/save-pic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl })
    });
    const json = await resp.json();
    if (json && Array.isArray(json.runStatuses)) {
      runStatuses.value = json.runStatuses;
    }
  } catch (error) {
    console.error('保存照片失败:', error);
  }
};

onUnmounted(() => {
  stopCamera();
  if (captureInterval) {
    clearInterval(captureInterval);
  }
  if (chartInst) {
    chartInst.dispose();
    chartInst = null;
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
  overflow: auto;
  background: #ffffff;
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
.chart {
  width: 100%;
  height: 300px;
  margin: 1rem 0 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}
.status {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}
.status-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #1a202c;
}
.status-array {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  margin-bottom: 0.75rem;
  color: #2d3748;
}
.status-list {
  display: grid;
  grid-template-columns: repeat(5, 48px);
  gap: 0.5rem;
}
.status-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 8px;
  font-weight: 700;
  border: 1px solid #e2e8f0;
}
.status-item.ok {
  background: #def7ec;
  color: #03543f;
  border-color: #84e1bc;
}
.status-item.fail {
  background: #fde8e8;
  color: #9b1c1c;
  border-color: #f8b4b4;
}
.status-item.pending {
  background: #edf2f7;
  color: #4a5568;
  border-color: #e2e8f0;
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
