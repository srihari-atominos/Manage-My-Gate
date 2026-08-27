export const exportRawTabularData = <T extends Record<string, any>>(
  data: T[],
  columns: (keyof T)[]
): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Generate header row
  const header = columns.map(String).join(',');

  // Generate data rows
  const rows = data.map((item) => {
    return columns.map((col) => {
      const value = item[col];
      // Basic escaping for CSV format
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
};
