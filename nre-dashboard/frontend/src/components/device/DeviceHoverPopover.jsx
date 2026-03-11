import { Box, Popover, Typography } from '@mui/material'
import {
  AreaChart, Area, YAxis,
  Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import DeviceTypeIcon from './DeviceTypeIcon'
import StatusDot from '../ui/StatusDot'
import { CARD_BG, SIDEBAR_BG, BORDER } from '../../constants/theme'
import { genHistory } from '../../utils/chartHelpers'

export default function DeviceHoverPopover({ device, anchorEl, onClose }) {
  if (!device) return null
  const rtH = genHistory(device.response_time_ms,    device.id * 7,  0.35, 14)
  const plH = genHistory(device.packet_loss_percent, device.id * 13, 0.5,  14)
  const tt  = { contentStyle: { background: SIDEBAR_BG, border: 'none', fontSize: 10, borderRadius: 4 } }

  return (
    <Popover open={Boolean(anchorEl) && Boolean(device)} anchorEl={anchorEl} onClose={onClose}
      anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
      transformOrigin={{ vertical: 'center', horizontal: 'left' }}
      disableRestoreFocus sx={{ pointerEvents: 'none', ml: 1 }}
      PaperProps={{ sx: { p: 2, width: 300, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', borderRadius: 2 } }}>

      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Box display="flex" alignItems="center" gap={0.8}>
          <DeviceTypeIcon type={device.device_type} />
          <Typography fontWeight={700} fontSize="0.88rem" color="white">{device.name}</Typography>
        </Box>
        <StatusDot status={device.status} />
      </Box>

      <Typography variant="caption" color="primary.main" display="block" fontWeight={600} mb={0.5}>
        Response Time (ms)
      </Typography>
      <ResponsiveContainer width="100%" height={72}>
        <AreaChart data={rtH} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="hRt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196f3" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis tick={{ fontSize: 9, fill: '#666' }} />
          <Area type="monotone" dataKey="value" stroke="#2196f3" fill="url(#hRt)" strokeWidth={1.5} dot={false} />
          <ReTooltip {...tt} formatter={v => [`${v} ms`, '']} labelFormatter={() => ''} />
        </AreaChart>
      </ResponsiveContainer>

      <Typography variant="caption" color="warning.main" display="block" fontWeight={600} mt={1} mb={0.5}>
        Packet Loss (%)
      </Typography>
      <ResponsiveContainer width="100%" height={54}>
        <AreaChart data={plH} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="hPl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff9800" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis tick={{ fontSize: 9, fill: '#666' }} />
          <Area type="monotone" dataKey="value" stroke="#ff9800" fill="url(#hPl)" strokeWidth={1.5} dot={false} />
          <ReTooltip {...tt} formatter={v => [`${v}%`, '']} labelFormatter={() => ''} />
        </AreaChart>
      </ResponsiveContainer>

      <Typography variant="caption" color="text.disabled" display="block" mt={1.5} textAlign="center" fontSize="0.67rem">
        Click row for full details
      </Typography>
    </Popover>
  )
}
