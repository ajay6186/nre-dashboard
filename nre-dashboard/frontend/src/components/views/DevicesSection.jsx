import { useState, useMemo } from 'react'
import {
  Box, Chip, InputAdornment, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import StatusDot     from '../ui/StatusDot'
import LatencyBar    from '../ui/LatencyBar'
import PacketLossBar from '../ui/PacketLossBar'
import UptimeText    from '../ui/UptimeText'
import SectionLabel  from '../ui/SectionLabel'
import DeviceTypeIcon from '../device/DeviceTypeIcon'
import { CARD_BG, BORDER, K8S_BLUE, LOC_COLOR } from '../../constants/theme'

const fmtTime = iso => { try { return new Date(iso).toLocaleTimeString() } catch { return iso ?? '—' } }

export default function DevicesSection({ devices, onRowClick, onRowHover, onRowLeave }) {
  const [search,    setSearch]    = useState('')
  const [locFilter, setLocFilter] = useState(null)

  const locCounts = useMemo(() => devices.reduce((a, d) => {
    a[d.location] = (a[d.location] || 0) + 1; return a
  }, {}), [devices])

  const filtered = useMemo(() => devices.filter(d => {
    const q = search.toLowerCase()
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.ip_address.includes(q) || d.device_type.includes(q)
    return matchQ && (locFilter === null || d.location === locFilter)
  }), [devices, search, locFilter])

  return (
    <Box>
      {/* Controls bar */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1.5}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="caption" color="text.disabled" fontSize="0.6rem" fontWeight={700} letterSpacing={0.8} mr={0.5}>
            NAMESPACE
          </Typography>
          <Chip label="All" size="small" onClick={() => setLocFilter(null)} sx={{
            bgcolor: locFilter === null ? K8S_BLUE : 'transparent', border: '1px solid',
            borderColor: locFilter === null ? K8S_BLUE : BORDER, color: 'white', fontWeight: 700, fontSize: '0.68rem', height: 20,
          }} />
          {Object.entries(locCounts).map(([loc, cnt]) => (
            <Chip key={loc} label={`${loc} (${cnt})`} size="small"
              onClick={() => setLocFilter(locFilter === loc ? null : loc)}
              sx={{
                bgcolor: locFilter === loc ? `${LOC_COLOR[loc]}28` : 'transparent',
                border: '1px solid', borderColor: locFilter === loc ? LOC_COLOR[loc] : BORDER,
                color: locFilter === loc ? LOC_COLOR[loc] : 'text.secondary',
                fontWeight: 600, fontSize: '0.67rem', height: 20,
                '&:hover': { bgcolor: `${LOC_COLOR[loc]}18` },
              }} />
          ))}
        </Box>

        <TextField size="small" placeholder="Search devices…" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
          sx={{ width: 240, '& .MuiOutlinedInput-root': {
            bgcolor: CARD_BG, borderRadius: 1.5, height: 32, fontSize: '0.82rem',
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: K8S_BLUE },
            '&.Mui-focused fieldset': { borderColor: K8S_BLUE },
          }}}
        />
      </Box>

      <Paper elevation={0} sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
        <Box px={2} py={1.5} borderBottom={`1px solid ${BORDER}`} display="flex" alignItems="center" justifyContent="space-between">
          <SectionLabel>Pods ({filtered.length})</SectionLabel>
          <Typography variant="caption" color="text.disabled" fontSize="0.65rem">
            hover row for quick chart · click for full details
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.015)' }}>
                {['Name', 'Status', 'Namespace', 'Node IP', 'Response', 'Packet Loss', 'Age', 'Last Polled'].map(h => (
                  <TableCell key={h} sx={{ borderColor: BORDER, py: 0.9, color: 'text.disabled', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.id} hover onClick={() => onRowClick(d)}
                  onMouseEnter={e => onRowHover(e, d)} onMouseLeave={onRowLeave}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: d.status === 'Down' ? 'rgba(244,67,54,0.04)' : 'inherit',
                    '&:hover': { bgcolor: `${K8S_BLUE}0d` },
                    '&:last-child td': { border: 0 },
                    transition: 'background-color 0.12s',
                  }}>
                  <TableCell sx={{ borderColor: BORDER, py: 1 }}>
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <DeviceTypeIcon type={d.device_type} />
                      <Box>
                        <Typography fontSize="0.82rem" fontWeight={600} lineHeight={1.2}>{d.name}</Typography>
                        <Typography fontSize="0.67rem" color="text.disabled" fontFamily="monospace">{d.device_type}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderColor: BORDER }}><StatusDot status={d.status} /></TableCell>
                  <TableCell sx={{ borderColor: BORDER }}>
                    <Chip label={d.location} size="small" sx={{
                      bgcolor: `${LOC_COLOR[d.location] ?? '#666'}1a`, color: LOC_COLOR[d.location] ?? '#aaa',
                      border: `1px solid ${LOC_COLOR[d.location] ?? '#666'}44`, fontSize: '0.67rem', fontWeight: 600, height: 18,
                    }} />
                  </TableCell>
                  <TableCell sx={{ borderColor: BORDER }}>
                    <Typography fontFamily="monospace" fontSize="0.79rem" color="text.secondary">{d.ip_address}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: BORDER }}><LatencyBar ms={d.response_time_ms} /></TableCell>
                  <TableCell sx={{ borderColor: BORDER }}><PacketLossBar value={d.packet_loss_percent} /></TableCell>
                  <TableCell sx={{ borderColor: BORDER }}><UptimeText hours={d.uptime_hours} /></TableCell>
                  <TableCell sx={{ borderColor: BORDER }}>
                    <Typography variant="caption" color="text.disabled" fontFamily="monospace">{fmtTime(d.last_checked)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.disabled', borderColor: BORDER }}>
                    No devices match the current filter
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
