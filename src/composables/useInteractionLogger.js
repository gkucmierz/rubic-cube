
import { ref, reactive } from 'vue'

// Global state for logs so it persists across component re-mounts
const logs = ref([])
const isRecording = ref(true)
const maxLogs = 500 // Limit history size

export function useInteractionLogger() {
  
  const addLog = (type, data) => {
    if (!isRecording.value) return

    const timestamp = Date.now()
    const logEntry = {
      id: timestamp + Math.random().toString(36).substr(2, 9),
      timestamp,
      type,
      data: JSON.parse(JSON.stringify(data)) // Deep copy to snapshot state
    }

    logs.value.push(logEntry)
    if (logs.value.length > maxLogs) {
      logs.value.shift()
    }
  }

  const clearLogs = () => {
    logs.value = []
  }

  const exportLogs = () => {
    return JSON.stringify(logs.value, null, 2)
  }

  // Helper to format logs for LLM analysis
  const getRecentLogsForAnalysis = (count = 50) => {
    const recent = logs.value.slice(-count)
    return JSON.stringify(recent, null, 2)
  }

  return {
    logs,
    isRecording,
    addLog,
    clearLogs,
    exportLogs,
    getRecentLogsForAnalysis
  }
}
