export function trimField(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}

export function parseCSV(text) {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\ufeff/, '');
  if (!normalizedText.trim()) {
    return { headers: [], rows: [] };
  }

  const firstLineEnd = normalizedText.search(/\n/);
  const firstLine = firstLineEnd !== -1 ? normalizedText.slice(0, firstLineEnd) : normalizedText;
  const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');

  const allRows = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  let currentRow = [];
  let fieldStartInQuotes = false;

  while (i < normalizedText.length) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 2;
      } else if (char === '"') {
        inQuotes = false;
        i++;
        while (i < normalizedText.length && (normalizedText[i] === ' ' || normalizedText[i] === '\t')) {
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (!fieldStartInQuotes && currentField === '' && (char === ' ' || char === '\t')) {
        i++;
      } else if (char === '"' && currentField.trim() === '') {
        currentField = '';
        fieldStartInQuotes = true;
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        currentRow.push(fieldStartInQuotes ? currentField : trimField(currentField));
        currentField = '';
        fieldStartInQuotes = false;
        i++;
      } else if (char === '\n') {
        currentRow.push(fieldStartInQuotes ? currentField : trimField(currentField));
        allRows.push(currentRow);
        currentRow = [];
        currentField = '';
        fieldStartInQuotes = false;
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(fieldStartInQuotes ? currentField : trimField(currentField));
    allRows.push(currentRow);
  }

  const nonEmptyRows = allRows.filter(row => row.some(cell => trimField(cell) !== ''));
  if (nonEmptyRows.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = nonEmptyRows[0].map(h => trimField(h));
  const rows = nonEmptyRows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      const rawValue = row[idx] !== undefined ? row[idx] : '';
      obj[header] = trimField(rawValue);
    });
    return obj;
  });

  return { headers, rows };
}

export function escapeCSVField(field, delimiter = ',') {
  const str = String(field ?? '');
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
