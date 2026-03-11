import { Typography } from '@mui/material'

export default function UptimeText({ hours }) {
  if (hours == null) return <Typography variant="caption" color="text.disabled">—</Typography>
  const d = Math.floor(hours / 24), h = hours % 24
  return (
    <Typography fontFamily="monospace" fontSize="0.8rem" color="text.secondary">
      {d > 0 ? `${d}d ${h}h` : `${hours}h`}
    </Typography>
  )
}
