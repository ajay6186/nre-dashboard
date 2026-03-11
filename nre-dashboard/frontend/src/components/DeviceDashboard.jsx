import { useState, useCallback, useRef } from 'react'
import { Alert, Box, CircularProgress } from '@mui/material'
import { fetchDevices, triggerWebhookChange } from '../services/api'
import { useRealtime } from '../hooks/useRealtime'
import { K8S_BLUE } from '../constants/theme'
import Sidebar  from './layout/Sidebar'
import TopBar   from './layout/TopBar'
import OverviewSection  from './views/OverviewSection'
import DevicesSection   from './views/DevicesSection'
import LocationsSection from './views/LocationsSection'
import MetricsSection   from './views/MetricsSection'
import DeviceHoverPopover from './device/DeviceHoverPopover'
import DeviceDetailDialog from './device/DeviceDetailDialog'

export default function DeviceDashboard() {
  const [devices,        setDevices]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [lastUpdated,    setLastUpdated]    = useState(null)
  const [lastSource,     setLastSource]     = useState(null)
  const [restBusy,       setRestBusy]       = useState(false)
  const [webhookBusy,    setWebhookBusy]    = useState(false)
  const [activeNav,      setActiveNav]      = useState('overview')
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [hoverDevice,    setHoverDevice]    = useState(null)
  const [hoverAnchor,    setHoverAnchor]    = useState(null)
  const hoverTimer = useRef(null)

  const handleRealtimeUpdate = useCallback((newDevices, source, trigger) => {
    setDevices(newDevices)
    setLastUpdated(new Date())
    setLastSource(`${source} (${trigger})`)
    setLoading(false)
    setError(null)
  }, [])

  const { wsStatus, sseStatus, sendRefresh } = useRealtime(handleRealtimeUpdate)

  const handleRestClick = async () => {
    setRestBusy(true); setError(null)
    try {
      const data = await fetchDevices()
      setDevices(data); setLastUpdated(new Date()); setLastSource('rest (manual)'); setLoading(false)
    } catch (err) {
      setError(err.message?.includes('503')
        ? 'FastAPI service offline. Run: uvicorn app:app --port 5001'
        : 'Cannot reach Django backend on port 8000.')
    } finally { setRestBusy(false) }
  }

  const handleWebhookClick = async () => {
    setWebhookBusy(true); setError(null)
    try { await triggerWebhookChange() }
    catch (err) { setError(err.message?.includes('503') ? 'FastAPI offline.' : 'Webhook failed.') }
    finally { setWebhookBusy(false) }
  }

  const handleRowHover = (e, device) => {
    hoverTimer.current = setTimeout(() => { setHoverDevice(device); setHoverAnchor(e.currentTarget) }, 400)
  }
  const handleRowLeave = () => {
    clearTimeout(hoverTimer.current); setHoverDevice(null); setHoverAnchor(null)
  }
  const handleRowClick = (device) => {
    clearTimeout(hoverTimer.current); setHoverDevice(null); setHoverAnchor(null)
    setSelectedDevice(device)
  }

  const downCount   = devices.filter(d => d.status === 'Down').length
  const rowHandlers = { onRowClick: handleRowClick, onRowHover: handleRowHover, onRowLeave: handleRowLeave }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar activeNav={activeNav} onNav={setActiveNav}
        wsStatus={wsStatus} sseStatus={sseStatus} downCount={downCount} />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar activeNav={activeNav} restBusy={restBusy} webhookBusy={webhookBusy} wsStatus={wsStatus}
          onRest={handleRestClick} onWs={sendRefresh} onWebhook={handleWebhookClick}
          lastUpdated={lastUpdated} lastSource={lastSource} />

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
              <CircularProgress size={48} thickness={3} sx={{ color: K8S_BLUE }} />
            </Box>
          )}

          {!loading && error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)' }}>
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <>
              {activeNav === 'overview'   && <OverviewSection  devices={devices} {...rowHandlers} />}
              {activeNav === 'devices'    && <DevicesSection   devices={devices} {...rowHandlers} />}
              {activeNav === 'locations'  && <LocationsSection devices={devices} {...rowHandlers} />}
              {activeNav === 'metrics'    && <MetricsSection   devices={devices} />}
            </>
          )}
        </Box>
      </Box>

      <DeviceHoverPopover device={hoverDevice} anchorEl={hoverAnchor}
        onClose={() => { setHoverDevice(null); setHoverAnchor(null) }} />
      <DeviceDetailDialog device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </Box>
  )
}
