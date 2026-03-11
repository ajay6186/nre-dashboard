import { useMemo } from 'react'
import { Box, Grid, LinearProgress, Paper, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import StatusDot     from '../ui/StatusDot'
import LatencyBar    from '../ui/LatencyBar'
import PacketLossBar from '../ui/PacketLossBar'
import DeviceTypeIcon from '../device/DeviceTypeIcon'
import { CARD_BG, BORDER, LOC_COLOR } from '../../constants/theme'

export default function LocationsSection({ devices, onRowClick, onRowHover, onRowLeave }) {
  const grouped = useMemo(() => {
    const g = {}
    devices.forEach(d => { if (!g[d.location]) g[d.location] = []; g[d.location].push(d) })
    return g
  }, [devices])

  return (
    <Grid container spacing={2}>
      {Object.entries(grouped).map(([loc, devs]) => {
        const up     = devs.filter(d => d.status === 'Up').length
        const health = Math.round((up / devs.length) * 100)
        const color  = LOC_COLOR[loc] ?? '#4a9eff'
        return (
          <Grid item xs={12} md={6} key={loc}>
            <Paper elevation={0} sx={{
              bgcolor: CARD_BG, borderRadius: 2,
              border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`,
            }}>
              {/* Location header */}
              <Box px={2} py={1.5} borderBottom={`1px solid ${BORDER}`} display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationOnIcon sx={{ fontSize: 15, color }} />
                  <Typography fontWeight={700} fontSize="0.88rem" color="white">{loc}</Typography>
                  <Box sx={{ px: 0.8, bgcolor: `${color}22`, borderRadius: 1, border: `1px solid ${color}44` }}>
                    <Typography variant="caption" color={color} fontSize="0.62rem" fontWeight={700}>
                      {devs.length} pods
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <LinearProgress variant="determinate" value={health} sx={{
                    width: 60, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)',
                    '& .MuiLinearProgress-bar': { bgcolor: health >= 80 ? '#4caf50' : health >= 50 ? '#ff9800' : '#f44336', borderRadius: 2 },
                  }} />
                  <Typography variant="caption" fontWeight={700} fontSize="0.72rem"
                    color={health >= 80 ? '#4caf50' : health >= 50 ? '#ff9800' : '#f44336'}>
                    {health}%
                  </Typography>
                </Box>
              </Box>

              {/* Location device rows */}
              <Table size="small">
                <TableBody>
                  {devs.map(d => (
                    <TableRow key={d.id} hover onClick={() => onRowClick(d)}
                      onMouseEnter={e => onRowHover(e, d)} onMouseLeave={onRowLeave}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: `${color}0d` }, '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ borderColor: BORDER, py: 0.9 }}>
                        <Box display="flex" alignItems="center" gap={0.8}>
                          <DeviceTypeIcon type={d.device_type} />
                          <Typography fontSize="0.82rem" fontWeight={500}>{d.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: BORDER }}><StatusDot status={d.status} /></TableCell>
                      <TableCell sx={{ borderColor: BORDER }}><LatencyBar ms={d.response_time_ms} /></TableCell>
                      <TableCell sx={{ borderColor: BORDER }}><PacketLossBar value={d.packet_loss_percent} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )
      })}
    </Grid>
  )
}
