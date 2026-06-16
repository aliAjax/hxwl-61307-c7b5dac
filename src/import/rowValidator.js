export function validateRow(row, fieldMapping, rowIndex, existingRecords, parsedRows, typeConfig) {
  const errors = [];
  const record = {};

  for (const [csvHeader, fieldKey] of Object.entries(fieldMapping)) {
    if (fieldKey && row[csvHeader] !== undefined) {
      record[fieldKey] = row[csvHeader].trim();
    }
  }

  for (const field of typeConfig.requiredFields) {
    if (!record[field] || record[field].trim() === '') {
      const fieldConfig = typeConfig.config.fields.find(f => f.key === field);
      errors.push(`缺少必填字段：${fieldConfig?.label || field}`);
    }
  }

  typeConfig.extraValidate(record, errors);

  const duplicateInImport = parsedRows.findIndex((r, i) => {
    if (i >= rowIndex) return false;
    return typeConfig.internalDuplicateCheck(r, record);
  });
  if (duplicateInImport !== -1) {
    errors.push(`与导入文件中第${duplicateInImport + 2}行数据重复（${typeConfig.duplicateLabel}）`);
  }

  const duplicateInExisting = typeConfig.duplicateCheck(record, existingRecords);
  if (duplicateInExisting) {
    errors.push(typeConfig.existingDuplicateLabel);
  }

  return { record, errors };
}

export function categorizeRows(rows, fieldMapping, existingRecords, typeConfig) {
  const validRows = [];
  const errorRows = [];
  const duplicateRows = [];
  const parsedRows = [];

  rows.forEach((row, index) => {
    const { record, errors } = validateRow(row, fieldMapping, index, existingRecords, parsedRows, typeConfig);
    parsedRows.push(record);

    const hasDuplicateError = errors.some(e => e.includes('重复'));
    const hasOtherError = errors.some(e => !e.includes('重复'));

    if (hasOtherError) {
      errorRows.push({ rowIndex: index + 2, data: record, errors });
    } else if (hasDuplicateError) {
      duplicateRows.push({ rowIndex: index + 2, data: record, errors });
      validRows.push({ rowIndex: index + 2, data: record, warnings: errors });
    } else {
      validRows.push({ rowIndex: index + 2, data: record, warnings: [] });
    }
  });

  return { validRows, errorRows, duplicateRows, parsedRows };
}
