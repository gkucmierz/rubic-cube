
<script setup>
import { ref } from 'vue'
import { useInteractionLogger } from '../composables/useInteractionLogger'

const { logs, isRecording, clearLogs, getRecentLogsForAnalysis } = useInteractionLogger()
const isOpen = ref(false)
const copied = ref(false)

const toggle = () => isOpen.value = !isOpen.value

const copyReport = async () => {
  const report = getRecentLogsForAnalysis(50)
  const context = `
### User Interaction Report
Please analyze the following interaction logs to identify the issue.
Focus on: Drag direction, Active Layer, Rotation Mapping, and State changes.

\`\`\`json
${report}
\`\`\`
  `
  
  try {
    await navigator.clipboard.writeText(context)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('Failed to copy logs', err)
    alert('Failed to copy to clipboard. Check console.')
  }
}
</script>

<template>
  <div class="interaction-replay">
    <div class="header" @click="toggle" :class="{ recording: isRecording }">
      <span class="indicator">●</span>
      <span>Logger ({{ logs.length }})</span>
    </div>

    <div v-if="isOpen" class="panel">
      <div class="actions">
        <button @click="copyReport" :class="{ success: copied }">
          {{ copied ? 'Copied!' : '📋 Copy Report for AI' }}
        </button>
        <button @click="clearLogs" class="secondary">Clear</button>
        <label>
          <input type="checkbox" v-model="isRecording"> Rec
        </label>
      </div>
      
      <div class="log-list">
        <div v-for="log in logs.slice().reverse()" :key="log.id" class="log-item">
          <span class="time">{{ new Date(log.timestamp).toISOString().substr(14, 9) }}</span>
          <span class="type" :class="log.type">{{ log.type }}</span>
          <pre class="data">{{ log.data }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.interaction-replay {
  position: fixed;
  bottom: 10px;
  right: 10px;
  z-index: 10000;
  font-family: monospace;
  font-size: 12px;
}

.header {
  background: #222;
  color: #fff;
  padding: 8px 12px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  border: 1px solid #444;
}

.header.recording .indicator {
  color: #ff4444;
  animation: pulse 1.5s infinite;
}

.indicator {
  color: #666;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.panel {
  position: absolute;
  bottom: 40px;
  right: 0;
  width: 350px;
  height: 400px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  border: 1px solid #444;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.actions {
  padding: 10px;
  border-bottom: 1px solid #444;
  display: flex;
  gap: 8px;
  background: #1a1a1a;
  align-items: center;
}

button {
  flex: 1;
  padding: 6px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button.success {
  background: #28a745;
}

button.secondary {
  background: #444;
  flex: 0 0 60px;
}

label {
  color: #fff;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.log-item {
  margin-bottom: 8px;
  border-bottom: 1px solid #333;
  padding-bottom: 4px;
}

.time {
  color: #666;
  margin-right: 8px;
}

.type {
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 2px;
  margin-right: 8px;
}

.type.drag-start { color: #4fc3f7; }
.type.drag-update { color: #ffd54f; }
.type.drag-end { color: #81c784; }
.type.rotation { color: #ba68c8; }

.data {
  margin: 4px 0 0 0;
  color: #aaa;
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
