/**
 * @param file to load
 * @returns a promise with the file as a string
 */
export function getFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.addEventListener('load', event => resolve(event.target?.result as string || ''))
        reader.addEventListener('error', () => {
            reader.abort()
            reject(new DOMException(`Could not read ${file.name}`))
        })
        reader.readAsText(file)
    })
}