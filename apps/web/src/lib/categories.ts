export const CATEGORIES = [
  { id: 'tech', label: 'Tech', dot: 'bg-accent' },
  { id: 'music', label: 'Music', dot: 'bg-violet' },
  { id: 'food', label: 'Food & drink', dot: 'bg-wait' },
  { id: 'sports', label: 'Sports', dot: 'bg-going' },
  { id: 'arts', label: 'Arts', dot: 'bg-danger' },
  { id: 'networking', label: 'Networking', dot: 'bg-accent' },
  { id: 'outdoors', label: 'Outdoors', dot: 'bg-going' },
  { id: 'other', label: 'Other', dot: 'bg-muted' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

/** Small "● Tech" label used on cards and headers. */
export function categoryLabel(id: string) {
  return categoryOf(id).label;
}
