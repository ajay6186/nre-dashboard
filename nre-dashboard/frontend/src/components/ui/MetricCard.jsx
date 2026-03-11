import React from 'react'
import { Box, LinearProgress, Paper, Typography } from '@mui/material'
import { CARD_BG, BORDER } from '../../constants/theme'

export default function MetricCard({ title, value, subtitle, color, icon, progress }) {
  return (
    <Paper elevation={0} sx={{
      p: 2, bgcolor: CARD_BG, borderRadius: 2,
      border: `1px solid ${BORDER}`, borderTop: `3px solid ${color}`,
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: `0 0 16px ${color}22` },
    }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}
            fontWeight={700} textTransform="uppercase" letterSpacing={0.8} fontSize="0.62rem">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} color={color} lineHeight={1.1}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">{subtitle}</Typography>
        </Box>
        <Box sx={{ color, opacity: 0.2 }}>{React.cloneElement(icon, { sx: { fontSize: 40 } })}</Box>
      </Box>
      {progress !== undefined && (
        <LinearProgress variant="determinate" value={progress}
          sx={{ mt: 1.5, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }} />
      )}
    </Paper>
  )
}
