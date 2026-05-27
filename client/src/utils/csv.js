export function sanitizeCSVCell(value) {
  const s = String(value ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `\t${s}` : s;
}

export function quoteCSVCell(value) {
  return `"${sanitizeCSVCell(value).replace(/"/g, '""')}"`;
}
