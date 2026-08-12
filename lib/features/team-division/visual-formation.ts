export function buildVisualFormationRows<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return [];
  if (items.length === 1) return [items.slice()];

  const goalkeeperRow = items.slice(0, 1);
  const outfield = items.slice(1);
  const lineCount = Math.min(4, Math.max(1, Math.ceil(outfield.length / 4)));
  const baseSize = Math.floor(outfield.length / lineCount);
  const extra = outfield.length % lineCount;
  const lines: T[][] = [];
  let offset = 0;

  for (let index = 0; index < lineCount; index += 1) {
    const size = baseSize + (index < extra ? 1 : 0);
    lines.push(outfield.slice(offset, offset + size));
    offset += size;
  }

  return [...lines.reverse(), goalkeeperRow];
}
