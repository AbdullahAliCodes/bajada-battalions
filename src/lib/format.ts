export function formatRand(amount: number): string {
  const rounded = Math.round(amount);
  return `R${rounded.toLocaleString("en-ZA")}`;
}

export function parseRand(value: string): number | null {
  const cleaned = value.replace(/[R\s,]/gi, "").trim();
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}
