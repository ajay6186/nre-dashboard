import { Typography } from '@mui/material'

export default function SectionLabel({ children }) {
  return (
    <Typography variant="caption" color="text.disabled" display="block"
      fontWeight={700} textTransform="uppercase" letterSpacing={0.8} fontSize="0.6rem">
      {children}
    </Typography>
  )
}
