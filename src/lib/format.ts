export function formatCredits(value: number): string {
  return `${value.toLocaleString()} credits`
}

export function formatWon(value: number): string {
  return `₩${value.toLocaleString()}`
}

export function formatDateTime(value: Date | string | null): string {
  if (value === null) {
    return "-"
  }

  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)
}
