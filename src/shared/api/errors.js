export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {{ status?: number, fieldErrors?: Record<string, string>, requestId?: string }} [extra]
   */
  constructor(message, code, extra = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = extra.status ?? null
    this.fieldErrors = extra.fieldErrors ?? {}
    this.requestId = extra.requestId ?? ''
  }
}
