import { useMemo } from 'react'
import { Box, Grid, Paper } from '@mui/material'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import SectionLabel from '../ui/SectionLabel'
import { CARD_BG, BORDER } from '../../constants/theme'

const TT_STYLE = { contentStyle: { background: '#071120', border: `1px solid ${BORDER}`, fontSize: 11, borderRadius: 4 } }

const CHARTS = [
  { title: 'Response Time (ms)', key: 'rt',     color: '#2196f3', unit: 'ms' },
  { title: 'Packet Loss (%)',    key: 'loss',   color: '#ff9800', unit: '%'  },
  { title: 'Uptime (hours)',     key: 'uptime', color: '#4caf50', unit: 'h'  },
  { title: 'Health Score (%)',   key: 'health', color: '#ab47bc', unit: '%'  },
]

export default function MetricsSection({ devices }) {
  const byDevice = useMemo(() => devices.map(d => ({
    name: d.name.replace('Network ', ''),
    rt:     d.response_time_ms ?? 0,
    loss:   d.packet_loss_percent ?? 0,
    uptime: d.uptime_hours ?? 0,
    health: Math.round(
      (d.status === 'Up' ? 100 : 0) * 0.4 +
      Math.max(0, 100 - (d.response_time_ms ?? 0) / 2) * 0.2 +
      Math.max(0, 100 - (d.packet_loss_percent ?? 0) * 15) * 0.2 +
      Math.min(100, ((d.uptime_hours ?? 0) / 720) * 100) * 0.2
    ),
  })), [devices])

  return (
    <Grid container spacing={2}>
      {CHARTS.map(({ title, key, color, unit }) => (
        <Grid item xs={12} md={6} key={key}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <SectionLabel>{title}</SectionLabel>
            <Box mt={1.5}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={byDevice} layout="vertical" margin={{ top: 0, right: 45, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#999' }} width={95} axisLine={false} tickLine={false} />
                  <ReTooltip {...TT_STYLE} formatter={v => [`${v}${unit}`, title]} />
                  <Bar dataKey={key} fill={color} radius={[0, 4, 4, 0]} maxBarSize={13} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}
