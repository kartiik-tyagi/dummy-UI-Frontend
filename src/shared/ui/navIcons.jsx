import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import GestureOutlinedIcon from '@mui/icons-material/GestureOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import PentagonOutlinedIcon from '@mui/icons-material/PentagonOutlined'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import FiberManualRecordOutlinedIcon from '@mui/icons-material/FiberManualRecordOutlined'
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined'
import CropSquareOutlinedIcon from '@mui/icons-material/CropSquareOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import AnchorOutlinedIcon from '@mui/icons-material/AnchorOutlined'
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'

const ICONS = {
  layers: LayersOutlinedIcon,
  extent: MyLocationOutlinedIcon,
  resources: Inventory2OutlinedIcon,
  plans: AssignmentOutlinedIcon,
  control: TuneOutlinedIcon,
  table: TableRowsOutlinedIcon,
  info: InfoOutlinedIcon,
  draw: GestureOutlinedIcon,
  sides: GroupsOutlinedIcon,
  settings: SettingsOutlinedIcon,
  plan: PentagonOutlinedIcon,
  alerts: NotificationsActiveOutlinedIcon,
  sessions: FiberManualRecordOutlinedIcon,
  playback: PlayCircleOutlinedIcon,
  simulation: SpeedOutlinedIcon,
  stream: SensorsOutlinedIcon,
  zones: CropSquareOutlinedIcon,
  routes: TimelineOutlinedIcon,
  directory: GroupsOutlinedIcon,
  teams: GroupsOutlinedIcon,
  users: PersonOutlinedIcon,
  roles: BadgeOutlinedIcon,
  themes: PaletteOutlinedIcon,
  flags: ToggleOnOutlinedIcon,
  shield: ShieldOutlinedIcon,
  flag: FlagOutlinedIcon,
  anchor: AnchorOutlinedIcon,
  flight: FlightOutlinedIcon,
  orbat: AccountTreeOutlinedIcon,
}

export function NavIcon({ name }) {
  const Icon = ICONS[name] || LayersOutlinedIcon
  return <Icon fontSize="small" />
}
