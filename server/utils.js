export function toCamel(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v instanceof Date ? v.getTime() : v;
  }
  return out;
}

export function toCamelArray(rows) {
  return rows.map(toCamel);
}
