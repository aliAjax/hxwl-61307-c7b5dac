import { useState, useRef, useMemo, useCallback } from 'react';
import { parseCSV, escapeCSVField } from './csvParser';
import { buildFieldMapping, getMissingRequiredFields } from './fieldMatcher';
import { categorizeRows } from './rowValidator';
import { createImportTypeConfigs } from './importConfigDefinitions';

export function useBatchImport({
  appConfig,
  inventoryConfig,
  templateConfig,
  today,
  uid,
  wasDispatched,
  records,
  inventory,
  templates,
  persist,
  persistInventory,
  setTemplates,
  AUDIT_EVENT_TYPES,
  logAuditEvent,
  operatorName,
  setActiveTab,
  onImportSuccess,
}) {
  const [importType, setImportType] = useState('application');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importTab, setImportTab] = useState('paste');
  const [importPreviewTab, setImportPreviewTab] = useState('valid');
  const fileInputRef = useRef(null);

  const importTypeConfigs = useMemo(() => createImportTypeConfigs({
    appConfig,
    inventoryConfig,
    templateConfig,
    today,
    uid,
    wasDispatched,
    getRecords: () => records,
    getInventory: () => inventory,
    getTemplates: () => templates,
    persistRecords: persist,
    persistInventory,
    persistTemplates: (next) => { setTemplates(next); localStorage.setItem(templateConfig.storage, JSON.stringify(next)); },
  }), [appConfig, inventoryConfig, templateConfig, today, uid, wasDispatched, records, inventory, templates, persist, persistInventory, setTemplates]);

  const currentImportConfig = useCallback(() => {
    return importTypeConfigs[importType];
  }, [importTypeConfigs, importType]);

  const auditEventTypeMap = useMemo(() => ({
    application: AUDIT_EVENT_TYPES.IMPORT,
    inventory: AUDIT_EVENT_TYPES.INVENTORY_IMPORT,
    template: AUDIT_EVENT_TYPES.TEMPLATE_IMPORT,
  }), [AUDIT_EVENT_TYPES]);

  const analyzeImport = useCallback((text) => {
    if (!text.trim()) {
      setImportPreview(null);
      return;
    }

    setImportPreviewTab('valid');

    const typeConfig = importTypeConfigs[importType];

    try {
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0 || rows.length === 0) {
        setImportPreview({ error: '无法解析CSV数据，请检查格式是否正确' });
        return;
      }

      const { fieldMapping, recognizedFields, unrecognizedFields } = buildFieldMapping(
        headers,
        typeConfig.fieldAliasMap,
        typeConfig.config.fields
      );

      const missingRequired = getMissingRequiredFields(
        typeConfig.requiredFields,
        recognizedFields,
        typeConfig.config.fields
      );

      const existingRecords = typeConfig.getExistingRecords();
      const { validRows, errorRows, duplicateRows } = categorizeRows(
        rows,
        fieldMapping,
        existingRecords,
        typeConfig
      );

      setImportPreview({
        headers,
        fieldMapping,
        recognizedFields,
        unrecognizedFields,
        missingRequired,
        totalRows: rows.length,
        validRows,
        errorRows,
        duplicateRows,
        canImport: errorRows.length < rows.length && missingRequired.length === 0
      });
    } catch (e) {
      setImportPreview({ error: '解析CSV时发生错误：' + e.message });
    }
  }, [importTypeConfigs, importType]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setImportText(text);
        analyzeImport(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [analyzeImport]);

  const handlePaste = useCallback((event) => {
    const text = event.target.value;
    setImportText(text);
    analyzeImport(text);
  }, [analyzeImport]);

  const executeImport = useCallback(() => {
    if (!importPreview || !importPreview.canImport) return;

    const typeConfig = importTypeConfigs[importType];
    const auditEventType = auditEventTypeMap[importType];

    const newRecords = importPreview.validRows.map(item => typeConfig.buildNewRecord(item));

    const existingRecords = typeConfig.getExistingRecords();
    const nextRecords = [...newRecords, ...existingRecords];
    typeConfig.persistFn(nextRecords);

    newRecords.forEach((record) => {
      logAuditEvent({
        eventType: auditEventType,
        targetType: typeConfig.targetType,
        targetId: record.id,
        afterData: record,
        metadata: typeConfig.auditMetadata(record),
        operator: operatorName,
      });
    });

    const successCount = newRecords.length;
    const errorCount = importPreview.errorRows.length;
    const duplicateCount = importPreview.duplicateRows.length;

    alert(`导入完成！\n\n成功导入：${successCount} 条\n错误行：${errorCount} 条（未导入）\n重复提示：${duplicateCount} 条（已导入但存在重复风险）`);

    setImportText('');
    setImportPreview(null);

    if (importType === 'application') setActiveTab('application');
    else if (importType === 'inventory') setActiveTab('inventory');
    else if (importType === 'template') setActiveTab('templates');

    if (onImportSuccess) {
      onImportSuccess({ importType, successCount, errorCount, duplicateCount });
    }
  }, [importPreview, importTypeConfigs, importType, auditEventTypeMap, logAuditEvent, operatorName, setActiveTab, onImportSuccess]);

  const getSampleCSV = useCallback((typeKey) => {
    const cfg = importTypeConfigs[typeKey || importType];
    const delimiter = ',';
    const headers = cfg.config.fields.map(f => escapeCSVField(f.label, delimiter)).join(delimiter);
    const sampleRow = cfg.config.fields.map(f => {
      const value = f.type === 'select' ? (f.options[0] || '') : (f.placeholder || '');
      return escapeCSVField(value, delimiter);
    }).join(delimiter);
    return `${headers}\n${sampleRow}`;
  }, [importTypeConfigs, importType]);

  const copySampleCSV = useCallback(() => {
    navigator.clipboard.writeText(getSampleCSV()).then(() => {
      alert('示例CSV格式已复制到剪贴板！');
    });
  }, [getSampleCSV]);

  const downloadSampleCSV = useCallback(() => {
    const typeConfig = importTypeConfigs[importType];
    const csv = getSampleCSV();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = typeConfig.sampleFilename;
    link.click();
    URL.revokeObjectURL(url);
  }, [importTypeConfigs, importType, getSampleCSV]);

  const resetImportState = useCallback(() => {
    setImportText('');
    setImportPreview(null);
    setImportPreviewTab('valid');
  }, []);

  const switchImportType = useCallback((type) => {
    setImportType(type);
    setImportText('');
    setImportPreview(null);
    setImportPreviewTab('valid');
  }, []);

  return {
    importType,
    setImportType,
    importText,
    setImportText,
    importPreview,
    setImportPreview,
    importTab,
    setImportTab,
    importPreviewTab,
    setImportPreviewTab,
    fileInputRef,
    importTypeConfigs,
    currentImportConfig,
    analyzeImport,
    handleFileUpload,
    handlePaste,
    executeImport,
    getSampleCSV,
    copySampleCSV,
    downloadSampleCSV,
    resetImportState,
    switchImportType,
  };
}
