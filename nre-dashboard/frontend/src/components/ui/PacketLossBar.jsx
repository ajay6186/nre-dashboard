import { Box, LinearProgress, Typography } from '@mui/material'

export default function PacketLossBar({ value }) {
  if (value == null) return <Typography variant="caption" color="text.disabled">—</Typography>
  const c = value === 0 ? '#4caf50' : value < 5 ? '#ff9800' : '#f44336'
  return (
    <Box display="flex" alignItems="center" gap={0.7}>
      <Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={700} color={c}>{value.toFixed(1)}%</Typography>
      <LinearProgress variant="determinate" value={Math.min(100, value * 10)}
        sx={{ width: 36, height: 3, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 1 } }} />
    </Box>
  )
}
