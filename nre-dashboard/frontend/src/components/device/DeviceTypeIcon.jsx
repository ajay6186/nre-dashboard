import RouterIcon              from '@mui/icons-material/Router'
import DeviceHubIcon           from '@mui/icons-material/DeviceHub'
import SecurityIcon            from '@mui/icons-material/Security'
import StorageIcon             from '@mui/icons-material/Storage'
import SwitchAccessShortcutIcon from '@mui/icons-material/SwitchAccessShortcut'
import BalanceIcon             from '@mui/icons-material/Balance'
import AccessPointIcon         from '@mui/icons-material/SettingsInputAntenna'
import { K8S_BLUE } from '../../constants/theme'

export default function DeviceTypeIcon({ type, sx: extraSx }) {
  const props = { fontSize: 'small', sx: { color: K8S_BLUE, ...extraSx } }
  switch (type) {
    case 'router':        return <RouterIcon {...props} />
    case 'switch':        return <SwitchAccessShortcutIcon {...props} />
    case 'firewall':      return <SecurityIcon {...props} />
    case 'access-point':  return <AccessPointIcon {...props} />
    case 'server':        return <StorageIcon {...props} />
    case 'load-balancer': return <BalanceIcon {...props} />
    default:              return <DeviceHubIcon {...props} />
  }
}
