/** Shared CSV serialisation for the report exports. */

/** Excel on Windows needs a BOM to read the file as UTF-8 rather than ANSI. */
const UTF8_BOM = '\uFEFF';

export function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildCsv(rows) {
  return UTF8_BOM + rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}
