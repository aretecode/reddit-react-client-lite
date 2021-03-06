import { Request as ExpressRequest } from 'express'
import { URL } from './url'

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL
 */
export function fromReqToUrl(req: ExpressRequest): typeof URL {
  if (req === undefined) {
    if (process.browser) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[fromReqToUrl] missing url, falling back to url from window'
        )
      }
      return new URL(window.location.href)
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('[fromReqToUrl] missing url in request!')
      }
    }
  }

  const urlPath = req.url || ''
  /**
   * enforcing https only
   */
  const urlHost = req.headers.host
  const urlOrigin = 'https://' + urlHost
  const urlFull = urlOrigin + urlPath

  const url = new URL(urlFull)

  return url
}
