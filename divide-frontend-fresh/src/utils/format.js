export function formatCurrency(value, decimals = 2) {
  const n = Number(value);
  if (!isFinite(n)) return (0).toFixed(decimals);
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export function formatNumber(value) {
  const n = Number(value);
  if (!isFinite(n)) return String(value);
  return new Intl.NumberFormat().format(n);
}
