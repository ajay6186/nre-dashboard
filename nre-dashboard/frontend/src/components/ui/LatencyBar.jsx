import { Box, LinearProgress, Typography } from '@mui/material'

export default function LatencyBar({ ms }) {
  if (ms == null) return <Typography variant="caption" color="text.disabled">—</Typography>
  const c = ms < 20 ? '#4caf50' : ms < 100 ? '#ff9800' : '#f44336'
  return (
    <Box display="flex" alignItems="center" gap={0.7}>
      <Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={700} color={c}>{ms} ms</Typography>
      <LinearProgress variant="determinate" value={Math.min(100, (ms / 200) * 100)}
        sx={{ width: 36, height: 3, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 1 } }} />
    </Box>
  )
}
