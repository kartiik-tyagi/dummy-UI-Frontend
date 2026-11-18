function write(level, event, fields = {}) {
  const record = { time: new Date().toISOString(), level, event, ...fields }
  const line = `[gis-warplan] ${event}`
  if (level === 'error') console.error(line, record)
  else if (level === 'warn') console.warn(line, record)
  else console.info(line, record)
}

export const logger = {
  info(event, fields) {
    write('info', event, fields)
  },
  warn(event, fields) {
    write('warn', event, fields)
  },
  error(event, fields) {
    write('error', event, fields)
  },
}
