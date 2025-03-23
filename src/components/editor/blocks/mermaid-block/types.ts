export interface MermaidNode {
  attrs: {
    content: string;
  };
}

export interface MermaidBlockProps {
  node: MermaidNode;
  updateAttributes: (attrs: { content: string }) => void;
  editor: {
    isEditable: boolean;
  };
  selected?: boolean;
}

export type MermaidTheme = 'default' | 'forest' | 'dark' | 'neutral'; 