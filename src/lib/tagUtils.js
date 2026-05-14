export const TAG_COLORS = [
  '#e8f4e8', '#e8e8f4', '#f4e8e8', '#fef9e8', '#f4f0ff',
  '#e8f4f8', '#fde8f4', '#f0f4e8', '#fff0e8', '#e8fff0',
]

export function getTagColor(tag) {
  return tag.color || TAG_COLORS[0]
}

export function getTagWeight(tag, userId) {
  return (tag.weights && tag.weights[userId]) ?? 5
}
