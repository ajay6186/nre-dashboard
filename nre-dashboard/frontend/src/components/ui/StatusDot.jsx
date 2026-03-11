import { Box, Typography } from '@mui/material'

export default function StatusDot({ status }) {
  const up = status === 'Up'
  return (
    <Box display="flex" alignItems="center" gap={0.8}>
      <Box sx={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        bgcolor: up ? '#4caf50' : '#f44336',
        boxShadow: `0 0 6px ${up ? '#4caf50' : '#f44336'}`,
      }} />
      <Typography variant="caption" fontWeight={600} color={up ? 'success.main' : 'error.main'}>
        {up ? 'Running' : 'Failed'}
      </Typography>
    </Box>
  )
}
