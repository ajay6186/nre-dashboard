import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material'
import DashboardIcon  from '@mui/icons-material/Dashboard'
import DevicesIcon    from '@mui/icons-material/Devices'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BarChartIcon   from '@mui/icons-material/BarChart'
import HubIcon        from '@mui/icons-material/Hub'
import { SIDEBAR_W, K8S_BLUE, SIDEBAR_BG, BORDER } from '../../constants/theme'

const NAV_ITEMS = [
  { key: 'overview',  label: 'Overview',  icon: <DashboardIcon  fontSize="small" /> },
  { key: 'devices',   label: 'Devices',   icon: <DevicesIcon    fontSize="small" /> },
  { key: 'locations', label: 'Locations', icon: <LocationOnIcon fontSize="small" /> },
  { key: 'metrics',   label: 'Metrics',   icon: <BarChartIcon   fontSize="small" /> },
]

export default function Sidebar({ activeNav, onNav, wsStatus, sseStatus, downCount }) {
  return (
    <Box sx={{
      width: SIDEBAR_W, flexShrink: 0, bgcolor: SIDEBAR_BG,
      borderRight: `1px solid ${BORDER}`, display: 'flex',
      flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>

      {/* Logo */}
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${BORDER}` }}>
        <Box display="flex" alignItems="center" gap={1.2}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%', bgcolor: K8S_BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 14px ${K8S_BLUE}55`,
          }}>
            <HubIcon sx={{ fontSize: 20, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={800} color="white" lineHeight={1.2}>
              NetCluster
            </Typography>
            <Typography sx={{ color: '#4a9eff', fontSize: '0.62rem', fontWeight: 600 }}>
              NRE Dashboard
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Cluster info */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
        <Typography variant="caption" color="text.disabled" display="block" mb={0.5}
          fontSize="0.6rem" letterSpacing={0.8} fontWeight={700}>
          CLUSTER
        </Typography>
        <Box display="flex" alignItems="center" gap={0.8}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 5px #4caf50' }} />
          <Typography variant="caption" color="text.secondary" fontFamily="monospace" fontSize="0.72rem">
            network-prod-01
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ px: 1.5, pt: 2, flex: 1 }}>
        <Typography variant="caption" color="text.disabled"
          sx={{ px: 1, mb: 1, display: 'block', fontSize: '0.6rem', letterSpacing: 0.8, fontWeight: 700 }}>
          WORKLOADS
        </Typography>
        <List dense disablePadding>
          {NAV_ITEMS.map((item) => (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                selected={activeNav === item.key}
                onClick={() => onNav(item.key)}
                sx={{
                  borderRadius: 1.5, py: 0.8, px: 1.2,
                  '&.Mui-selected': {
                    bgcolor: `${K8S_BLUE}22`,
                    borderLeft: `3px solid ${K8S_BLUE}`,
                    pl: '10px',
                    '& .MuiListItemIcon-root': { color: '#4a9eff' },
                  },
                  '&:hover:not(.Mui-selected)': { bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: activeNav === item.key ? '#4a9eff' : 'text.disabled' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.83rem',
                    fontWeight: activeNav === item.key ? 700 : 400,
                    color: activeNav === item.key ? 'white' : 'text.secondary',
                  }}
                />
                {item.key === 'devices' && downCount > 0 && (
                  <Box sx={{
                    bgcolor: '#f44336', color: 'white', borderRadius: '10px',
                    px: 0.8, fontSize: '0.6rem', fontWeight: 800, lineHeight: '18px',
                  }}>
                    {downCount}
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Connection status */}
      <Box sx={{ p: 2, borderTop: `1px solid ${BORDER}` }}>
        <Typography variant="caption" color="text.disabled" display="block" mb={1}
          fontSize="0.6rem" letterSpacing={0.8} fontWeight={700}>
          CONNECTIONS
        </Typography>
        {[{ label: 'WebSocket', status: wsStatus }, { label: 'SSE', status: sseStatus }].map(({ label, status }) => (
          <Box key={label} display="flex" alignItems="center" gap={0.8} mb={0.6}>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              bgcolor: status === 'connected' ? '#4caf50' : '#444',
              boxShadow: status === 'connected' ? '0 0 5px #4caf50' : 'none',
            }} />
            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
              {label} · {status === 'connected' ? 'Live' : status}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
