export const suggestions = [
  {
    title: 'Mermaid Diagram',
    description: 'Insert a Mermaid diagram',
    icon: 'i-mdi-diagram-sankey',
    keywords: ['mermaid', 'diagram', 'flow', 'chart', 'graph'],
    command: ({ editor }) => {
      editor.commands.setMermaid(`graph TD
    A[Client] --> B[Load Balancer]
    B --> C[Server1]
    B --> D[Server2]`)
    },
  },
] as const

export type Suggestion = (typeof suggestions)[number] 