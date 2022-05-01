import { ComponentChildren, h } from 'preact'
import './style.css'

/* 
    Re-implementation of https://github.com/DeepDoge/svelte-responsive-row
*/

export function Row(params: {
    children: ComponentChildren
    type?: "fit" | "fill",
    idealSize?: string,
    gap?: string,
    maxColumnCount?: number,
    justifyItems?: "center" | "start" | "end" | "stretch"
}) {
    if (!params.type) params.type = 'fill'
    if (!params.gap) params.gap = '0'
    if (!params.idealSize) params.idealSize = '100%'
    if (!params.maxColumnCount) params.maxColumnCount = Number.MAX_SAFE_INTEGER
    if (!params.justifyItems) params.justifyItems = 'center'

    return <div className='responsive-row'
        style={{
            '--ideal-size': params.idealSize,
            '--gap': params.gap === "0" ? "0px" : params.gap,
            '--type': `auto-${params.type}`,
            '--max-column-count': params.maxColumnCount,
            '--justify-items': params.justifyItems
        }}
    >
        {params.children}
    </div>
}
