import { expect, it } from 'vitest'
import { detectPlatform } from './platform'

const UA = {
  safari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  safari17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_6; it_IT)',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  webviewAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  tabletAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
}

it('riconosce telefono, browser e browser interni', () => {
  expect(detectPlatform(UA.safari26)).toEqual({ os: 'ios', browser: 'safari', safariVersion: 26 })
  expect(detectPlatform(UA.safari17).safariVersion).toBe(17)
  expect(detectPlatform(UA.chromeIos)).toEqual({ os: 'ios', browser: 'chrome' })
  expect(detectPlatform(UA.instagramIos)).toMatchObject({ os: 'ios', inApp: 'Instagram' })
  expect(detectPlatform(UA.chromeAndroid)).toEqual({ os: 'android', browser: 'chrome' })
  expect(detectPlatform(UA.samsung).browser).toBe('samsung')
  expect(detectPlatform(UA.webviewAndroid).inApp).toBe("un'app")
})

it('iPad e tablet restano un sito normale', () => {
  expect(detectPlatform(UA.ipad).os).toBe('desktop')
  expect(detectPlatform(UA.tabletAndroid).os).toBe('desktop')
})
