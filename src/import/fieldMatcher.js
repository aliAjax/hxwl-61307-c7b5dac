export function matchField(header, aliasMap) {
  const lowerHeader = header.trim().toLowerCase();
  for (const [fieldKey, aliases] of Object.entries(aliasMap)) {
    for (const alias of aliases) {
      if (lowerHeader === alias.toLowerCase()) {
        return fieldKey;
      }
    }
  }
  return null;
}

export function buildFieldMapping(headers, aliasMap, configFields) {
  const fieldMapping = {};
  const recognizedFields = [];
  const unrecognizedFields = [];

  headers.forEach(header => {
    const matched = matchField(header, aliasMap);
    fieldMapping[header] = matched;
    if (matched) {
      recognizedFields.push({
        csv: header,
        field: matched,
        label: configFields.find(f => f.key === matched)?.label || matched
      });
    } else {
      unrecognizedFields.push(header);
    }
  });

  return { fieldMapping, recognizedFields, unrecognizedFields };
}

export function getMissingRequiredFields(requiredFields, recognizedFields, configFields) {
  return requiredFields
    .filter(key => !recognizedFields.some(f => f.field === key))
    .map(key => configFields.find(f => f.key === key)?.label || key);
}
