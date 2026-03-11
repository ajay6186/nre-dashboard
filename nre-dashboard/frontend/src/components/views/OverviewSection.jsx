import { useMemo } from 'react'
import { Box, Chip, Divider, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon      from '@mui/icons-material/Cancel'
import DeviceHubIcon   from '@mui/icons-material/DeviceHub'
import SpeedIcon       from '@mui/icons-material/Speed'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import MetricCard    from '../ui/MetricCard'
import StatusDot     from '../ui/StatusDot'
import LatencyBar    from '../ui/LatencyBar'
import PacketLossBar from '../ui/PacketLossBar'
import DeviceTypeIcon from '../device/DeviceTypeIcon'
import SectionLabel  from '../ui/SectionLabel'
import { CARD_BG, BORDER, K8S_BLUE, LOC_COLOR } from '../../constants/theme'

const TT_STYLE = { contentStyle: { background: '#071120', border: `1px solid ${BORDER}`, fontSize: 11, borderRadius: 4 } }

export default function OverviewSection({ devices, onRowClick, onRowHover, onRowLeave }) {
  const total     = devices.length
  const up        = devices.filter(d => d.status === 'Up').length
  const down      = total - up
  const healthPct = total > 0 ? Math.round((up / total) * 100) : 0
  const avgRt     = total > 0 ? Math.round(devices.reduce((s, d) => s + (d.response_time_ms || 0), 0) / total) : 0
  const avgLoss   = total > 0 ? (devices.reduce((s, d) => s + (d.packet_loss_percent || 0), 0) / total).toFixed(1) : '0.0'

  const donutData = [
    { name: 'Running', value: up,   color: '#4caf50' },
    { name: 'Failed',  value: down, color: '#f44336' },
  ]

  const locData = useMemo(() => Object.entries(
    devices.reduce((a, d) => { a[d.location] = (a[d.location] || 0) + 1; return a }, {})
  ).map(([name, count]) => ({ name, count })), [devices])

  const typeData = useMemo(() => Object.entries(
    devices.reduce((a, d) => { a[d.device_type] = (a[d.device_type] || 0) + 1; return a }, {})
  ).map(([name, count]) => ({ name, count })), [devices])

  return (
    <Box>
      {/* Metric cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { title: 'Total Nodes', value: total,        subtitle: 'network devices',         color: '#4a9eff', icon: <DeviceHubIcon />,   progress: undefined },
          { title: 'Running',     value: up,           subtitle: `${healthPct}% fleet ok`,  color: '#4caf50', icon: <CheckCircleIcon />, progress: healthPct },
          { title: 'Failed',      value: down,         subtitle: down > 0 ? 'need attention' : 'all clear', color: down > 0 ? '#f44336' : '#4caf50', icon: <CancelIcon />, progress: undefined },
          { title: 'Avg Latency', value: `${avgRt}ms`, subtitle: `Avg Loss: ${avgLoss}%`,  color: '#ff9800', icon: <SpeedIcon />,        progress: undefined },
        ].map(c => (
          <Grid item xs={6} sm={3} key={c.title}>
            <MetricCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} mb={3}>

        {/* Fleet status donut */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2, height: 240 }}>
            <SectionLabel>Fleet Status</SectionLabel>
            <Box display="flex" alignItems="center" gap={2} mt={1}>
              <Box flexShrink={0}>
                <PieChart width={120} height={130}>
                  <Pie data={donutData} cx={60} cy={65} innerRadius={38} outerRadius={55}
                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {donutData.map(e => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <ReTooltip {...TT_STYLE} />
                </PieChart>
              </Box>
              <Box>
                {donutData.map(e => (
                  <Box key={e.name} display="flex" alignItems="center" gap={0.8} mb={0.7}>
                    <Box sx={{ width: 9, height: 9, borderRadius: 1, bgcolor: e.color, flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary" fontSize="0.72rem">{e.name}</Typography>
                    <Typography variant="caption" fontWeight={800} color="white" fontSize="0.82rem">{e.value}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 1, borderColor: BORDER }} />
                <Typography variant="h4" fontWeight={800} color={healthPct >= 80 ? '#4caf50' : '#ff9800'} lineHeight={1}>
                  {healthPct}%
                </Typography>
                <Typography variant="caption" color="text.disabled" fontSize="0.68rem">fleet health</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Location bar chart */}
        <Grid item xs={12} md={4.5}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2, height: 240 }}>
            <SectionLabel>By Location (Namespace)</SectionLabel>
            <Box mt={1}>
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={locData} layout="vertical" margin={{ top: 0, right: 20, left: 5, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#999' }} width={88} axisLine={false} tickLine={false} />
                  <ReTooltip {...TT_STYLE} />
                  <Bar dataKey="count" fill={K8S_BLUE} radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Device type bar chart */}
        <Grid item xs={12} md={4.5}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2, height: 240 }}>
            <SectionLabel>By Type (Workload)</SectionLabel>
            <Box mt={1}>
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 20, left: 5, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#999' }} width={95} axisLine={false} tickLine={false} />
                  <ReTooltip {...TT_STYLE} />
                  <Bar dataKey="count" fill="#4a9eff" radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent devices mini-table */}
      <Paper elevation={0} sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
        <Box px={2} py={1.5} borderBottom={`1px solid ${BORDER}`} display="flex" alignItems="center" justifyContent="space-between">
          <SectionLabel>Recent Device Activity</SectionLabel>
          <Typography variant="caption" color="text.disabled" fontSize="0.65rem">
            hover · click for details
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Name', 'Status', 'Namespace', 'Response', 'Packet Loss'].map(h => (
                <TableCell key={h} sx={{ borderColor: BORDER, py: 0.8, color: 'text.disabled', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.slice(0, 5).map(d => (
              <TableRow key={d.id} hover onClick={() => onRowClick(d)}
                onMouseEnter={e => onRowHover(e, d)} onMouseLeave={onRowLeave}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${K8S_BLUE}0d` }, '&:last-child td': { border: 0 } }}>
                <TableCell sx={{ borderColor: BORDER, py: 0.9 }}>
                  <Box display="flex" alignItems="center" gap={0.8}>
                    <DeviceTypeIcon type={d.device_type} />
                    <Typography fontSize="0.82rem" fontWeight={600}>{d.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ borderColor: BORDER }}><StatusDot status={d.status} /></TableCell>
                <TableCell sx={{ borderColor: BORDER }}>
                  <Chip label={d.location} size="small" sx={{
                    bgcolor: `${LOC_COLOR[d.location] ?? '#666'}1a`, color: LOC_COLOR[d.location] ?? '#aaa',
                    border: `1px solid ${LOC_COLOR[d.location] ?? '#666'}44`, fontSize: '0.67rem', fontWeight: 600, height: 18,
                  }} />
                </TableCell>
                <TableCell sx={{ borderColor: BORDER }}><LatencyBar ms={d.response_time_ms} /></TableCell>
                <TableCell sx={{ borderColor: BORDER }}><PacketLossBar value={d.packet_loss_percent} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
