import { Box, Chip, Dialog, DialogContent, DialogTitle, Divider, Grid, IconButton, Paper, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis,
  Tooltip as ReTooltip, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from 'recharts'
import DeviceTypeIcon from './DeviceTypeIcon'
import StatusDot from '../ui/StatusDot'
import SectionLabel from '../ui/SectionLabel'
import { CARD_BG, BORDER } from '../../constants/theme'
import { genHistory } from '../../utils/chartHelpers'

export default function DeviceDetailDialog({ device, onClose }) {
  if (!device) return null

  const rtH = genHistory(device.response_time_ms,    device.id * 7,  0.35, 24)
  const plH = genHistory(device.packet_loss_percent, device.id * 13, 0.5,  24)

  const ss = device.status === 'Up' ? 100 : 0
  const ls = Math.round(Math.max(0, 100 - (device.response_time_ms ?? 0) / 2))
  const ps = Math.round(Math.max(0, 100 - (device.packet_loss_percent ?? 0) * 15))
  const us = Math.round(Math.min(100, ((device.uptime_hours ?? 0) / 720) * 100))
  const ov = Math.round(ss * 0.4 + ls * 0.2 + ps * 0.2 + us * 0.2)

  const radData = [
    { name: 'Status',      value: ss, fill: device.status === 'Up' ? '#4caf50' : '#f44336' },
    { name: 'Latency',     value: ls, fill: '#2196f3' },
    { name: 'Packet Loss', value: ps, fill: '#ff9800' },
    { name: 'Uptime',      value: us, fill: '#ab47bc' },
  ]

  const tt = { contentStyle: { background: '#071120', border: `1px solid ${BORDER}`, fontSize: 12, borderRadius: 4 } }

  return (
    <Dialog open={Boolean(device)} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#0a1929', borderRadius: 3, border: `1px solid ${BORDER}` } }}>
      <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${BORDER}` }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <DeviceTypeIcon type={device.device_type} sx={{ fontSize: 22 }} />
            <Box>
              <Typography fontWeight={700} variant="h6" color="white">{device.name}</Typography>
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                {device.ip_address} · {device.location} · {device.device_type}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <StatusDot status={device.status} />
            <Chip label={`Health: ${ov}%`} size="small"
              color={ov >= 80 ? 'success' : ov >= 50 ? 'warning' : 'error'}
              sx={{ fontWeight: 700 }} />
            <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          {/* Response Time chart */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
              <SectionLabel>Response Time Trend (ms)</SectionLabel>
              <Box mt={1}>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={rtH} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`dRt${device.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2196f3" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} />
                    <ReTooltip {...tt} formatter={v => [`${v} ms`, 'Response Time']} labelFormatter={l => `Reading ${l}`} />
                    <Area type="monotone" dataKey="value" stroke="#2196f3" fill={`url(#dRt${device.id})`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Packet Loss chart */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
              <SectionLabel>Packet Loss Trend (%)</SectionLabel>
              <Box mt={1}>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={plH} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`dPl${device.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff9800" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} />
                    <ReTooltip {...tt} formatter={v => [`${v}%`, 'Packet Loss']} labelFormatter={l => `Reading ${l}`} />
                    <Area type="monotone" dataKey="value" stroke="#ff9800" fill={`url(#dPl${device.id})`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Health breakdown */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
              <SectionLabel>Health Breakdown</SectionLabel>
              <Box display="flex" alignItems="center" gap={4} flexWrap="wrap" mt={1}>
                <ResponsiveContainer width={170} height={150}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="28%" outerRadius="88%"
                    data={radData} startAngle={90} endAngle={-270}>
                    <RadialBar minAngle={5} dataKey="value" background={{ fill: 'rgba(255,255,255,0.04)' }} cornerRadius={3} />
                    <ReTooltip {...tt} formatter={(v, n) => [`${v}%`, n]} />
                  </RadialBarChart>
                </ResponsiveContainer>

                <Box>
                  {radData.map(item => (
                    <Box key={item.name} display="flex" alignItems="center" gap={1.2} mb={0.8}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.fill, flexShrink: 0 }} />
                      <Typography fontSize="0.78rem" color="text.secondary" width={85}>{item.name}</Typography>
                      <Typography fontSize="0.78rem" fontWeight={700} fontFamily="monospace">{item.value}%</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1, borderColor: BORDER }} />
                  <Box display="flex" alignItems="center" gap={1.2}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: ov >= 80 ? '#4caf50' : ov >= 50 ? '#ff9800' : '#f44336' }} />
                    <Typography fontSize="0.78rem" color="text.secondary" width={85}>Overall</Typography>
                    <Typography fontSize="0.78rem" fontWeight={700} fontFamily="monospace">{ov}%</Typography>
                  </Box>
                </Box>

                <Box ml="auto">
                  {[
                    ['ID',       `#${device.id}`],
                    ['IP',       device.ip_address],
                    ['Location', device.location],
                    ['Type',     device.device_type],
                    ['Uptime',   (() => { const d = Math.floor((device.uptime_hours ?? 0) / 24); const h = (device.uptime_hours ?? 0) % 24; return d > 0 ? `${d}d ${h}h` : `${h}h` })()],
                  ].map(([l, v]) => (
                    <Box key={l} display="flex" gap={1} mb={0.5}>
                      <Typography fontSize="0.72rem" color="text.disabled" width={60}>{l}</Typography>
                      <Typography fontSize="0.72rem" fontFamily="monospace" color="text.secondary">{v}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  )
}
