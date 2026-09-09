const escapeValue = (value) => {
  const stringValue = value == null ? '' : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

export const buildCsv = (headers, rows) => {
  const headerLine = headers.map(escapeValue).join(',');
  const rowLines = rows.map((row) => row.map(escapeValue).join(','));
  return [headerLine, ...rowLines].join('\n');
};

export const downloadCsv = (filename, headers, rows) => {
  const csv = buildCsv(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
