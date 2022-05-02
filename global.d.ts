declare module '*.md' {
    var _: string
    export default _
}

declare namespace chrome
{
    export const action = chrome.browserAction
}