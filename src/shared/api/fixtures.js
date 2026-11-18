import { logger } from '../lib/logger'
import { loginPalette, paletteById, palettes } from '../theme/palettes'

let sideThemeId = () => null

export function registerSideThemes(lookup) {
  sideThemeId = lookup
}

function themeFor(user) {
  const fallback = paletteById('field-night')
  if (user.id === 'apex') {
    const theme = paletteById(user.themeId)
    if (theme) return theme
    logger.warn('theme.unassigned', { userId: user.id, themeId: user.themeId || null })
    return fallback
  }
  const themeId = user.sideId ? sideThemeId(user.sideId) : null
  const theme = paletteById(themeId)
  if (theme) return theme
  logger.warn('theme.unassigned', { userId: user.id, sideId: user.sideId || null, themeId: themeId || null })
  return fallback
}

export const DEMO_PASSWORD = '123'

const passwords = new Map()

export function checkPassword(userId, password) {
  if (!userId || !password) return false
  return password === (passwords.get(userId) || DEMO_PASSWORD)
}

export function changePassword(userId, currentPassword, nextPassword) {
  if (!checkPassword(userId, currentPassword)) return 'CURRENT'
  if (!nextPassword || nextPassword.length < 3) return 'SHORT'
  if (nextPassword === (passwords.get(userId) || DEMO_PASSWORD)) return 'SAME'
  passwords.set(userId, nextPassword)
  return 'OK'
}

export const mapFilters = [
  { id: 'countries', label: 'Countries', group: 'Base', layers: 'ne:countries', base: true, transparent: false },
  { id: 'places', label: 'Populated places', group: 'Reference', layers: 'ne:populated_places', base: false, transparent: true },
  { id: 'coast', label: 'Coastline', group: 'Reference', layers: 'ne:coastlines', base: false, transparent: true },
  { id: 'boundaries', label: 'Boundaries', group: 'Reference', layers: 'ne:boundary_lines', base: false, transparent: true },
  { id: 'disputed', label: 'Disputed areas', group: 'Reference', layers: 'ne:disputed_areas', base: false, transparent: true },
]

const resourceCatalog = [
  { id: 'fuel', name: 'Fuel', detail: 'Bulk fuel for the active game', status: 'Open' },
  { id: 'ammunition', name: 'Ammunition', detail: 'Holdings released to this role', status: 'Open' },
  { id: 'air-effort', name: 'Air effort', detail: 'Sortie allocation', status: 'Held' },
  { id: 'shipping', name: 'Shipping', detail: 'Sea lift for the active game', status: 'Open' },
  { id: 'medical', name: 'Medical', detail: 'Field medical cover', status: 'Open' },
]

const planCatalog = [
  { id: 'northern-plan', name: 'Northern Approach', detail: 'Plan for the active scenario', status: 'Active' },
  { id: 'southern-plan', name: 'Southern Approach', detail: 'Held plan', status: 'Held' },
  { id: 'air-plan', name: 'Air support', detail: 'Air tasking for Game Alpha', status: 'Active' },
  { id: 'maritime-plan', name: 'Sea control', detail: 'Maritime plan for Game Alpha', status: 'Active' },
]

const mapItems = [
  { id: 'filters', label: 'Map filters', icon: 'layers' },
  { id: 'extent', label: 'Home extent', icon: 'extent' },
]

const gameItems = {
  resources: { id: 'resources', label: 'Resources', icon: 'resources' },
  plans: { id: 'plans', label: 'Plans', icon: 'plans' },
  control: { id: 'exercise-control', label: 'Exercise control', icon: 'control' },
}

function navigation(includeControl) {
  const items = [gameItems.resources, gameItems.plans]
  if (includeControl) items.push(gameItems.control)
  return [
    { id: 'map', label: 'Map', items: mapItems },
    { id: 'game', label: 'Game', items },
  ]
}

const grants = {
  apex: {
    admin: true,
    canSelectScenario: true,
    canControlGame: true,
    filterIds: ['countries', 'places', 'coast', 'boundaries', 'disputed'],
    defaults: { countries: true, places: true, coast: false, boundaries: false, disputed: false },
    resourceIds: ['fuel', 'ammunition', 'air-effort', 'shipping', 'medical'],
    planIds: ['northern-plan', 'southern-plan', 'air-plan', 'maritime-plan'],
  },
  direction: {
    canSelectScenario: true,
    canControlGame: false,
    filterIds: ['countries', 'places', 'coast', 'boundaries'],
    defaults: { countries: true, places: true, coast: false, boundaries: true },
    resourceIds: ['fuel', 'ammunition', 'air-effort', 'medical'],
    planIds: ['northern-plan', 'southern-plan', 'air-plan'],
  },
  theatre: {
    canSelectScenario: false,
    canControlGame: false,
    filterIds: ['countries', 'places', 'coast'],
    defaults: { countries: true, places: true, coast: false },
    resourceIds: ['fuel', 'ammunition', 'medical'],
    planIds: ['northern-plan', 'southern-plan'],
  },
  air: {
    canSelectScenario: false,
    canControlGame: false,
    filterIds: ['countries', 'places', 'coast'],
    defaults: { countries: true, places: true, coast: false },
    resourceIds: ['fuel', 'air-effort'],
    planIds: ['air-plan', 'northern-plan'],
  },
  maritime: {
    canSelectScenario: false,
    canControlGame: false,
    filterIds: ['countries', 'coast', 'places'],
    defaults: { countries: true, places: false, coast: true },
    resourceIds: ['fuel', 'shipping'],
    planIds: ['maritime-plan'],
  },
}

export function accessFor(userId) {
  const user = users.find((item) => item.id === userId)
  if (!user) return null
  const grant = grants[user.grant] || grants.theatre
  return {
    userId: user.id,
    admin: Boolean(grant.admin),
    canControlGame: Boolean(grant.canControlGame),
    canSelectScenario: Boolean(grant.canSelectScenario),
  }
}

export function listDirectoryUsers() {
  return users.map(({ id, title, role, service, avatarUrl, sideId }) => ({
    id,
    title,
    role,
    service,
    avatarUrl,
    sideId: sideId || null,
  }))
}

export function appointmentRecord(userId) {
  const user = users.find((item) => item.id === userId)
  if (!user) return null
  return { id: user.id, themeId: user.themeId || null, sideId: user.sideId || null }
}

export function setAppointmentTheme(userId, themeId) {
  const user = users.find((item) => item.id === userId)
  if (!user || user.id !== 'apex') return false
  user.themeId = themeId
  try {
    sessionStorage.setItem('gis-warplan.apexTheme', themeId)
  } catch (error) {
    logger.warn('theme.storage_unavailable', { message: error?.message || 'storage unavailable' })
  }
  return true
}

export function setAppointmentSide(id, sideId) {
  const user = users.find((item) => item.id === id)
  if (!user) return 'MISSING'
  if (user.id === 'apex') return 'PROTECTED'
  user.sideId = sideId
  return 'OK'
}

export function addDirectoryUser(user) {
  if (!user?.id || !user.sideId || users.some((item) => item.id === user.id)) return false
  users.push({
    id: user.id,
    title: user.title,
    role: user.role,
    service: user.service,
    avatarUrl: '/avatars/corps.svg',
    sideId: user.sideId,
    grant: 'theatre',
  })
  return true
}

export function updateDirectoryUser(id, patch) {
  const user = users.find((item) => item.id === id)
  if (!user || id === 'apex') return false
  if (patch.title) user.title = patch.title
  if (patch.role) user.role = patch.role
  if (patch.service) user.service = patch.service
  return true
}

export function removeDirectoryUser(id) {
  if (id === 'apex') return 'PROTECTED'
  const index = users.findIndex((item) => item.id === id)
  if (index < 0) return 'MISSING'
  users.splice(index, 1)
  return 'OK'
}

const users = [
  { id: 'apex', title: 'APEX', role: 'Exercise control', service: 'Control', avatarUrl: '/avatars/apex.svg', themeId: 'watch-night', grant: 'apex' },
  { id: 'cosc', title: 'CoSC', role: 'Joint direction', service: 'Joint', avatarUrl: '/avatars/cosc.svg', sideId: 'blue', grant: 'direction' },
  { id: 'etc', title: 'Eastern Theatre Commander', role: 'Theatre picture', service: 'Joint', avatarUrl: '/avatars/east.svg', sideId: 'blue', grant: 'theatre' },
  { id: 'wtc', title: 'Western Theatre Commander', role: 'Theatre picture', service: 'Joint', avatarUrl: '/avatars/west.svg', sideId: 'blue', grant: 'theatre' },
  { id: 'ntc', title: 'Northern Theatre Commander', role: 'Theatre picture', service: 'Joint', avatarUrl: '/avatars/north.svg', sideId: 'blue', grant: 'theatre' },
  { id: 'esc', title: 'Eastern Strike Corps Commander', role: 'Corps picture', service: 'Army', avatarUrl: '/avatars/corps.svg', sideId: 'blue', grant: 'theatre' },
  { id: 'aoc', title: 'Eastern Air Command AoC', role: 'Air picture', service: 'Air', avatarUrl: '/avatars/air.svg', sideId: 'red', grant: 'air' },
  { id: 'foc', title: 'Western Naval Command FoC', role: 'Maritime picture', service: 'Navy', avatarUrl: '/avatars/navy.svg', sideId: 'red', grant: 'maritime' },
]

try {
  const remembered = sessionStorage.getItem('gis-warplan.apexTheme')
  const apex = users.find((item) => item.id === 'apex')
  if (apex && paletteById(remembered)) apex.themeId = remembered
} catch (error) {
  logger.warn('theme.storage_unreadable', { message: error?.message || 'storage unavailable' })
}

export const scenarios = [
  { id: 'northern', name: 'Northern Approach' },
  { id: 'southern', name: 'Southern Approach' },
]

export const games = [
  { id: 'alpha', name: 'Game Alpha', open: true },
  { id: 'bravo', name: 'Game Bravo', open: true },
  { id: 'charlie', name: 'Game Charlie', open: false },
]

let activeScenarioId = scenarios[0].id
let activeGameId = games[0].id

export function currentExercise() {
  const scenario = scenarios.find((item) => item.id === activeScenarioId) || scenarios[0]
  const game = games.find((item) => item.id === activeGameId) || games.find((item) => item.open) || games[0]
  return { scenario, game }
}

export function exerciseChoice() {
  const { scenario, game } = currentExercise()
  return { scenarioId: scenario.id, gameId: game.id }
}

export function adoptExercise(choice) {
  const rejected = {}
  if (!choice) return rejected
  if (choice.scenarioId) {
    if (scenarios.some((item) => item.id === choice.scenarioId)) activeScenarioId = choice.scenarioId
    else rejected.scenarioId = choice.scenarioId
  }
  if (choice.gameId) {
    const game = games.find((item) => item.id === choice.gameId)
    if (game?.open) activeGameId = game.id
    else rejected.game = { id: choice.gameId, code: game ? 'CLOSED' : 'UNKNOWN' }
  }
  return rejected
}

export function activateScenario(scenarioId) {
  const scenario = scenarios.find((item) => item.id === scenarioId)
  if (!scenario) return { ok: false, code: 'NOT_FOUND' }
  if (scenario.id === activeScenarioId) return { ok: true, unchanged: true, id: scenario.id, name: scenario.name }
  activeScenarioId = scenario.id
  return { ok: true, unchanged: false, id: scenario.id, name: scenario.name }
}

export function activateGame(gameId) {
  const game = games.find((item) => item.id === gameId)
  if (!game) return { ok: false, code: 'NOT_FOUND' }
  if (!game.open) return { ok: false, code: 'CLOSED' }
  if (game.id === activeGameId) return { ok: true, unchanged: true, id: game.id, name: game.name }
  activeGameId = game.id
  return { ok: true, unchanged: false, id: game.id, name: game.name }
}

export const phases = [
  { id: 'plan', label: 'Plan', filterIds: ['countries', 'boundaries', 'places'] },
  { id: 'conduct', label: 'Conduct', filterIds: ['countries', 'places', 'coast'] },
  { id: 'review', label: 'Review', filterIds: ['countries', 'coast', 'disputed'] },
]

export const mapView = {
  latitude: 24.5,
  longitude: 82,
  zoom: 5,
  minZoom: 3,
  maxZoom: 12,
}

export const plannedCenters = [
  { id: 'india', name: 'Indian subcontinent', latitude: 24.5, longitude: 82 },
  { id: 'northern-approach', name: 'Northern Approach', latitude: 26.4, longitude: 80.2 },
  { id: 'holding-area', name: 'Holding area', latitude: 26.35, longitude: 80.2 },
  { id: 'contact-box', name: 'Contact box', latitude: 24.8, longitude: 83.9 },
  { id: 'west-asia', name: 'West Asia', latitude: 28, longitude: 45 },
  { id: 'europe', name: 'Europe', latitude: 50, longitude: 10 },
  { id: 'north-africa', name: 'North Africa', latitude: 28, longitude: 10 },
  { id: 'south-africa', name: 'Southern Africa', latitude: -25, longitude: 25 },
  { id: 'east-asia', name: 'East Asia', latitude: 35, longitude: 115 },
  { id: 'southeast-asia', name: 'Southeast Asia', latitude: 5, longitude: 108 },
  { id: 'pacific', name: 'Pacific', latitude: 10, longitude: 170 },
  { id: 'north-america', name: 'North America', latitude: 40, longitude: -100 },
  { id: 'south-america', name: 'South America', latitude: -15, longitude: -60 },
  { id: 'australia', name: 'Australia', latitude: -25, longitude: 135 },
  { id: 'arctic', name: 'Arctic', latitude: 75, longitude: 40 },
]

export const mapService = 'http://127.0.0.1:8080/geoserver/wms'

export const osmService = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const sections = [
  { id: 'scenario', kicker: 'Exercise', label: 'Scenario management', icon: 'flag' },
  { id: 'game', kicker: 'Exercise', label: 'Game', icon: 'control' },
  { id: 'data', kicker: 'Records', label: 'Standard data', icon: 'table' },
  { id: 'users', kicker: 'Access', label: 'User management', icon: 'directory' },
]

export const clockStart = '2026-10-28T06:00:00'

const exerciseMeta = {
  exerciseTitle: 'Exercise GIS Warplan',
  systemName: 'GIS WARPLAN',
  classification: 'EXERCISE',
  purpose: 'Situation picture',
  accessNotice: 'Authorised users only',
  backgroundImage: '/login-background.png',
  passwordHint: 'Exercise access: 123',
  theme: loginPalette,
  users: users.map(({ id, title, role, service, avatarUrl }) => ({ id, title, role, service, avatarUrl })),
}

export function loginContext() {
  const { scenario, game } = currentExercise()
  return {
    ...exerciseMeta,
    activeScenarioName: scenario?.name || '',
    activeGameName: game?.open ? game.name : '',
    gameOpen: Boolean(game?.open),
  }
}

function pick(catalog, ids) {
  return catalog.filter((item) => ids.includes(item.id))
}

export function sessionFor(userId) {
  const user = users.find((item) => item.id === userId)
  if (!user) return null
  const grant = grants[user.grant]
  const theme = themeFor(user)
  const canSelectTheme = user.id === 'apex'
  const { scenario, game } = currentExercise()
  return {
    profile: {
      id: user.id,
      title: user.title,
      role: user.role,
      service: user.service,
      avatarUrl: user.avatarUrl,
    },
    theme,
    themes: canSelectTheme ? palettes : [theme],
    canSelectTheme,
    scenarios: scenarios.map((item) => ({ ...item, active: item.id === scenario.id })),
    selectedScenarioId: scenario.id,
    activeScenarioId: scenario.id,
    activeGame: { id: game.id, name: game.name },
    games: games.map(({ id, name, open }) => ({ id, name, open })),
    navigation: navigation(grant.canControlGame),
    sections,
    resources: pick(resourceCatalog, grant.resourceIds),
    plans: pick(planCatalog, grant.planIds),
    filters: mapFilters
      .filter((filter) => grant.filterIds.includes(filter.id))
      .map((filter) => ({ ...filter, visible: Boolean(grant.defaults[filter.id]) })),
    phases,
    canSelectScenario: grant.canSelectScenario,
    canSelectGame: grant.canControlGame,
    canControlGame: grant.canControlGame,
    mapView,
    plannedCenters,
    mapService,
    clockStart,
    exerciseTitle: exerciseMeta.exerciseTitle,
    classification: exerciseMeta.classification,
    demoMode: true,
  }
}
