import { Box, Button, ButtonGroup, Tooltip, Typography } from '@mui/material'
import WifiIcon    from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import WebhookIcon from '@mui/icons-material/Webhook'
import HttpIcon    from '@mui/icons-material/Http'
import { SIDEBAR_BG, BORDER, K8S_BLUE } from '../../constants/theme'

const NAV_LABELS = { overview: 'Overview', devices: 'Devices', locations: 'Locations', metrics: 'Metrics' }

export default function TopBar({ activeNav, restBusy, webhookBusy, wsStatus, onRest, onWs, onWebhook, lastUpdated, lastSource }) {
  return (
    <Box sx={{
      height: 52, bgcolor: SIDEBAR_BG, borderBottom: `1px solid ${BORDER}`,
      px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="caption" color="text.disabled">Workloads</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mx: 0.3 }}>/</Typography>
        <Typography variant="caption" color="white" fontWeight={700}>{NAV_LABELS[activeNav]}</Typography>
        {lastUpdated && (
          <Typography variant="caption" color="text.disabled" sx={{ ml: 2, fontSize: '0.68rem' }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}
        {lastSource && (
          <Box sx={{ px: 0.9, py: 0.2, bgcolor: `${K8S_BLUE}22`, borderRadius: 1, border: `1px solid ${K8S_BLUE}44` }}>
            <Typography variant="caption" color="#4a9eff" fontSize="0.62rem" fontFamily="monospace">
              {lastSource}
            </Typography>
          </Box>
        )}
      </Box>

      <ButtonGroup variant="outlined" size="small" disableElevation>
        <Tooltip title="GET /devices — REST">
          <span>
            <Button startIcon={<HttpIcon fontSize="small" />} onClick={onRest} disabled={restBusy}
              sx={{ borderColor: BORDER, color: 'text.secondary', fontSize: '0.72rem',
                '&:hover': { borderColor: K8S_BLUE, color: '#4a9eff', bgcolor: `${K8S_BLUE}11` } }}>
              {restBusy ? '…' : 'REST'}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={wsStatus === 'connected' ? 'WebSocket refresh' : 'WS not connected'}>
          <span>
            <Button
              startIcon={wsStatus === 'connected' ? <WifiIcon fontSize="small" /> : <WifiOffIcon fontSize="small" />}
              onClick={onWs} disabled={wsStatus !== 'connected'}
              sx={{ borderColor: BORDER, color: wsStatus === 'connected' ? '#4a9eff' : 'text.disabled', fontSize: '0.72rem',
                '&:hover': { borderColor: K8S_BLUE, bgcolor: `${K8S_BLUE}11` } }}>
              WS
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="POST /devices/trigger — Webhook">
          <span>
            <Button startIcon={<WebhookIcon fontSize="small" />} onClick={onWebhook} disabled={webhookBusy}
              sx={{ borderColor: BORDER, color: 'text.secondary', fontSize: '0.72rem',
                '&:hover': { borderColor: '#ff9800', color: '#ff9800', bgcolor: 'rgba(255,152,0,0.08)' } }}>
              {webhookBusy ? '…' : 'Webhook'}
            </Button>
          </span>
        </Tooltip>
      </ButtonGroup>
    </Box>
  )
}
