export const isCompleteSurah = (
  rows: ReadonlyArray<{ ayah: number; arabicText?: string; text?: string }>,
  expected: number,
  requireTranslation = true,
) =>
  rows.length === expected &&
  new Set(rows.map(row => row.ayah)).size === expected &&
  rows.every(
    row =>
      row.ayah >= 1 &&
      row.ayah <= expected &&
      /[\u0600-\u06ff]/.test(row.arabicText || '') &&
      (!requireTranslation || !!row.text?.trim()),
  )
