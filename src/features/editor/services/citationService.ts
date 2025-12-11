import type { Editor } from '@tiptap/core'

/**
 * Updates citation numbers in the document based on their order.
 * @param editor Tiptap editor instance
 */
export const updateCitationNumbers = (editor: Editor) => {
    if (!editor || !editor.state) return

    const { doc } = editor.state
    const transactions: { pos: number; attrs: any }[] = []
    let citationIndex = 1

    // Traverse the document to find citation nodes
    doc.descendants((node, pos) => {
        if (node.type.name === 'citation') {
            const currentNumber = Number(node.attrs.citationNumber)

            // If the number doesn't match the current index, schedule an update
            if (currentNumber !== citationIndex) {
                transactions.push({
                    pos,
                    attrs: {
                        ...node.attrs,
                        citationNumber: citationIndex
                    }
                })
            }

            citationIndex++
        }
        return true
    })

    // Apply updates if needed
    if (transactions.length > 0) {
        editor.commands.command(({ tr }) => {
            transactions.forEach(({ pos, attrs }) => {
                tr.setNodeMarkup(pos, undefined, attrs)
            })
            return true
        })
    }
}

/**
 * Returns the ordered list of citation keys in the document.
 * @param editor Tiptap editor instance
 */
export const getOrderedCitationKeys = (editor: Editor): string[] => {
    if (!editor || !editor.state) return []

    const keys: string[] = []
    const { doc } = editor.state

    doc.descendants((node) => {
        if (node.type.name === 'citation' && node.attrs.citationKey) {
            keys.push(node.attrs.citationKey)
        }
        return true
    })

    return keys
}
