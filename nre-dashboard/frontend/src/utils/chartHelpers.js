// ─── Chart data helpers ───────────────────────────────────────────────────────
export function seededRand(seed) {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

export function genHistory(base, seed, variance = 0.3, n = 20) {
  const r = seededRand(seed)
  const b = base ?? 0
  return Array.from({ length: n }, (_, i) => ({
    t: `${i + 1}`,
    value: Math.max(0, parseFloat((b + (r() - 0.5) * Math.max(b, 1) * variance).toFixed(1))),
  }))
}
