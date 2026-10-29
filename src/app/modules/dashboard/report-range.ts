export type ReportRange = '7d' | '30d' | 'month'
export const getReportWindow = (
  range: ReportRange = '7d',
  now = new Date(),
) => {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )
  const start =
    range === 'month'
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      : new Date(end.getTime() - (range === '30d' ? 30 : 7) * 86400000)
  return {
    start,
    end,
    label:
      range === 'month'
        ? 'This month (UTC)'
        : range === '30d'
          ? 'Last 30 days (UTC)'
          : 'Last 7 days (UTC)',
  }
}
