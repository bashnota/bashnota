export const ADJECTIVES = [
  'Quick', 'New', 'Fresh', 'Brilliant', 'Random', 'Fleeting', 'Important', 'Creative', 'Urgent', 'Daily'
];

export const NOUNS = [
  'Idea', 'Note', 'Thought', 'Draft', 'Musings', 'Insight', 'Plan', 'Jotting', 'Memo', 'Log'
];

export function generateRandomTitle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
} 