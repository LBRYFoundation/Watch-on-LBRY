import { appRedirectUrl, parseProtocolUrl } from './lbry-url'

describe('web url parsing', () => {
  const testCases: [string, string | undefined][] = [
    ['https://lbry.tv/@test:7/foo-123:7', 'lbry://@test:7/foo-123:7'],
    ['https://lbry.tv/@test1:c/foo:8', 'lbry://@test1:c/foo:8'],
    ['https://lbry.tv/@test1:0/foo-bar-2-baz-7:e#adasasddasdas123', 'lbry://@test1:0/foo-bar-2-baz-7:e'],
    ['https://lbry.tv/@test:7', 'lbry://@test:7'],
    ['https://lbry.tv/@test:c', 'lbry://@test:c'],
    ['https://lbry.tv/$/discover?t=foo%20bar', undefined],
    ['https://lbry.tv/$/signup?redirect=/@test1:0/foo-bar-2-baz-7:e#adasasddasdas123', undefined],
  ]

  test.each(testCases)('redirect %s', (url, expected) => {
    expect(appRedirectUrl(url)).toEqual(expected)
  })
})

describe('app url parsing', () => {
  const testCases: Array<[string, string[]]> = [
    ['test', ['test']],
    ['@test', ['@test']],
    ['lbry://@test$1/stuff', ['@test$1', 'stuff']],
  ]

  test.each(testCases)('redirect %s', (url, expected) => {
    expect(parseProtocolUrl(url)).toEqual(expected)
  })
})
