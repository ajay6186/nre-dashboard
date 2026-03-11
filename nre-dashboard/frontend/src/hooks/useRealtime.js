/**
 * useRealtime — manages WebSocket + SSE connections for live device updates.
 *
 * Priority for device-table updates:
 *   1. WebSocket (ws://host/ws/devices/) — bidirectional, instant webhook push
 *   2. SSE       (/devices/stream)        — fallback when WS is unavailable
 *
 * onEvent(source, trigger, deviceCount) is called for EVERY arriving event
 * from every transport — regardless of priority — so callers can build a
 * complete live event log showing all three channels firing simultaneously.
 *
 * Both connections auto-reconnect on failure.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDevices } from '../services/api'

const WS_URL =
  (window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
  '//' +
  window.location.host +
  '/ws/devices/'

const SSE_URL = '/devices/stream'

const RECONNECT_DELAY_MS = 3000
const POLL_INTERVAL_MS   = 1000

export function useRealtime(onUpdate, onEvent) {
  const [wsStatus, setWsStatus] = useState('connecting') // 'connected' | 'disconnected' | 'connecting'
  const [sseStatus, setSseStatus] = useState('connecting')

  const wsRef = useRef(null)
  const sseRef = useRef(null)
  const wsActiveRef = useRef(false) // true once WS is connected; suppresses SSE device-table updates

  // --------------------------------------------------------------------------
  // WebSocket
  // --------------------------------------------------------------------------

  const connectWS = useCallback(() => {
    if (wsRef.current) wsRef.current.close()

    setWsStatus('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setWsStatus('connected')
      wsActiveRef.current = true
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'devices_update') {
          // Log the raw event first (always)
          onEvent?.('websocket', msg.trigger, msg.devices?.length ?? 0)
          // Then update the device table
          onUpdate(msg.devices, 'websocket', msg.trigger)
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setWsStatus('disconnected')
      wsActiveRef.current = false
      setTimeout(connectWS, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => ws.close()
  }, [onUpdate, onEvent])

  // --------------------------------------------------------------------------
  // SSE
  // --------------------------------------------------------------------------

  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close()

    setSseStatus('connecting')
    const sse = new EventSource(SSE_URL)
    sseRef.current = sse

    sse.onopen = () => setSseStatus('connected')

    sse.onmessage = (event) => {
      try {
        const devices = JSON.parse(event.data)
        if (Array.isArray(devices)) {
          // Always log the raw SSE event so the event log shows it arriving
          onEvent?.('sse', 'push', devices.length)
          // Only update the device table when WebSocket is not active
          if (!wsActiveRef.current) {
            onUpdate(devices, 'sse', 'push')
          }
        }
      } catch {
        // ignore malformed events
      }
    }

    sse.onerror = () => {
      setSseStatus('disconnected')
      // EventSource reconnects automatically; status updates on re-open
    }
  }, [onUpdate, onEvent])

  // --------------------------------------------------------------------------
  // Send a refresh command over WebSocket (used by the Refresh button)
  // --------------------------------------------------------------------------

  const sendRefresh = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'refresh' }))
    }
  }, [])

  // --------------------------------------------------------------------------
  // REST polling — fetch every second regardless of WS/SSE state
  // --------------------------------------------------------------------------

  const startPolling = useCallback(() => {
    const id = setInterval(async () => {
      try {
        const devices = await fetchDevices()
        onUpdate(devices, 'rest', 'poll')
      } catch {
        // silently ignore — WS/SSE still active
      }
    }, POLL_INTERVAL_MS)
    return id
  }, [onUpdate])

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  useEffect(() => {
    connectWS()
    connectSSE()
    const pollId = startPolling()

    return () => {
      wsRef.current?.close()
      sseRef.current?.close()
      clearInterval(pollId)
    }
  }, [connectWS, connectSSE, startPolling])

  return { wsStatus, sseStatus, sendRefresh }
}
