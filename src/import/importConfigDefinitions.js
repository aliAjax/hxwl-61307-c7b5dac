export function createImportTypeConfigs({
  appConfig,
  inventoryConfig,
  templateConfig,
  today,
  uid,
  wasDispatched,
  getRecords,
  getInventory,
  getTemplates,
  persistRecords,
  persistInventory,
  persistTemplates,
}) {
  return {
    application: {
      label: '备件申请',
      config: appConfig,
      fieldAliasMap: {
        'ship': ['所属船舶', '船舶', '船名', 'ship', 'vessel'],
        'partName': ['备件名称', '备件', '配件名称', '配件', '零件名称', 'partname', 'part', 'name'],
        'system': ['设备系统', '系统', '所属系统', 'system'],
        'location': ['船舶位置', '位置', '存放位置', '库位', 'location', 'position'],
        'qty': ['需求数量', '数量', '申请数量', 'qty', 'quantity', 'count'],
        'urgency': ['紧急程度', '紧急', '优先级', 'urgency', 'priority'],
        'reason': ['申请原因', '原因', '备注', '说明', 'reason', 'remark', 'note'],
        'status': ['状态', '申请状态', 'status']
      },
      requiredFields: ['ship', 'partName', 'system', 'location', 'qty', 'urgency', 'reason'],
      sampleFilename: '备件申请导入示例.csv',
      targetType: 'record',
      getExistingRecords: getRecords,
      persistFn: persistRecords,
      duplicateCheck: (record, existing) => existing.some(r =>
        r.ship === record.ship && r.partName === record.partName &&
        r.system === record.system && r.location === record.location && !wasDispatched(r)
      ),
      internalDuplicateCheck: (a, b) =>
        a.ship === b.ship && a.partName === b.partName &&
        a.system === b.system && a.location === b.location,
      duplicateLabel: '同一船舶、同一备件、同一系统、同一位置',
      existingDuplicateLabel: '与现有申请记录重复（同一船舶、同一备件、同一系统、同一位置且未发放）',
      extraValidate: (record, errors) => {
        if (record.ship && !appConfig.ships.includes(record.ship)) {
          errors.push(`船舶"${record.ship}"不在允许列表中，可选：${appConfig.ships.join('、')}`);
        }
        if (record.system) {
          const opts = appConfig.fields.find(f => f.key === 'system')?.options || [];
          if (!opts.includes(record.system)) errors.push(`设备系统"${record.system}"不在允许列表中，可选：${opts.join('、')}`);
        }
        if (record.urgency) {
          const opts = appConfig.fields.find(f => f.key === 'urgency')?.options || [];
          if (!opts.includes(record.urgency)) errors.push(`紧急程度"${record.urgency}"不在允许列表中，可选：${opts.join('、')}`);
        }
        if (record.status) {
          if (!appConfig.statuses.includes(record.status)) errors.push(`状态"${record.status}"不在允许列表中，可选：${appConfig.statuses.join('、')}`);
        }
        if (record.qty) {
          const n = Number(record.qty);
          if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) errors.push(`需求数量必须是正整数，当前值：${record.qty}`);
        }
      },
      buildNewRecord: (item) => ({
        id: uid(),
        ...item.data,
        status: item.data.status || appConfig.primaryStatus,
        createdAt: new Date().toISOString(),
        timeline: [{ status: item.data.status || appConfig.primaryStatus, at: today, by: '批量导入' }]
      }),
      auditMetadata: (record) => ({ ship: record.ship, partName: record.partName, system: record.system, qty: record.qty, importBatch: true }),
      previewFields: (data) => [
        { cls: 'import-preview-ship', val: data.ship },
        { cls: 'import-preview-part', val: data.partName },
        { cls: 'import-preview-system', val: data.system },
        { cls: 'import-preview-location', val: data.location },
        { cls: 'import-preview-qty', val: `x${data.qty}` },
        { cls: 'import-preview-urgency urgency-' + (data.urgency === '高' ? 'high' : data.urgency === '中' ? 'medium' : 'low'), val: data.urgency },
      ],
      previewDetail: (data) => data.reason,
    },
    inventory: {
      label: '库存台账',
      config: inventoryConfig,
      fieldAliasMap: {
        'ship': ['所属船舶', '船舶', '船名', 'ship', 'vessel'],
        'partName': ['备件名称', '备件', '配件名称', '配件', '零件名称', 'partname', 'part', 'name'],
        'system': ['设备系统', '系统', '所属系统', 'system'],
        'location': ['船舶位置', '位置', '存放位置', '库位', 'location', 'position'],
        'currentStock': ['当前库存', '库存数量', '现有库存', 'currentstock', 'stock', 'current'],
        'safetyStock': ['安全库存', '最低库存', '预警库存', 'safetystock', 'safety', 'min'],
        'lastCheckDate': ['最后盘点日期', '盘点日期', '最近盘点', 'lastcheckdate', 'checkdate', 'lastcheck'],
      },
      requiredFields: ['ship', 'partName', 'system', 'location', 'currentStock', 'safetyStock'],
      sampleFilename: '库存台账导入示例.csv',
      targetType: 'inventory',
      getExistingRecords: getInventory,
      persistFn: persistInventory,
      duplicateCheck: (record, existing) => existing.some(r =>
        r.ship === record.ship && r.partName === record.partName &&
        r.system === record.system && r.location === record.location
      ),
      internalDuplicateCheck: (a, b) =>
        a.ship === b.ship && a.partName === b.partName &&
        a.system === b.system && a.location === b.location,
      duplicateLabel: '同一船舶、同一备件、同一系统、同一位置',
      existingDuplicateLabel: '与现有库存记录重复（同一船舶、同一备件、同一系统、同一位置）',
      extraValidate: (record, errors) => {
        if (record.ship && !appConfig.ships.includes(record.ship)) {
          errors.push(`船舶"${record.ship}"不在允许列表中，可选：${appConfig.ships.join('、')}`);
        }
        if (record.system) {
          const opts = inventoryConfig.fields.find(f => f.key === 'system')?.options || [];
          if (!opts.includes(record.system)) errors.push(`设备系统"${record.system}"不在允许列表中，可选：${opts.join('、')}`);
        }
        if (record.currentStock) {
          const n = Number(record.currentStock);
          if (!Number.isFinite(n) || n < 0) errors.push(`当前库存必须为非负数字，当前值：${record.currentStock}`);
        }
        if (record.safetyStock) {
          const n = Number(record.safetyStock);
          if (!Number.isFinite(n) || n < 0) errors.push(`安全库存必须为非负数字，当前值：${record.safetyStock}`);
        }
      },
      buildNewRecord: (item) => ({
        id: uid(),
        ...item.data,
        createdAt: new Date().toISOString()
      }),
      auditMetadata: (record) => ({ ship: record.ship, partName: record.partName, system: record.system, currentStock: record.currentStock, safetyStock: record.safetyStock, importBatch: true }),
      previewFields: (data) => [
        { cls: 'import-preview-ship', val: data.ship },
        { cls: 'import-preview-part', val: data.partName },
        { cls: 'import-preview-system', val: data.system },
        { cls: 'import-preview-location', val: data.location },
        { cls: 'import-preview-qty', val: `库存:${data.currentStock || '-'}` },
        { cls: 'import-preview-urgency urgency-low', val: `安全:${data.safetyStock || '-'}` },
      ],
      previewDetail: (data) => data.lastCheckDate ? `盘点日期：${data.lastCheckDate}` : '',
    },
    template: {
      label: '常用模板',
      config: templateConfig,
      fieldAliasMap: {
        'templateName': ['模板名称', '名称', '模板', 'templatename', 'template', 'tplname'],
        'ship': ['默认船舶', '所属船舶', '船舶', '船名', 'ship', 'vessel'],
        'partName': ['备件名称', '备件', '配件名称', '配件', '零件名称', 'partname', 'part', 'name'],
        'system': ['设备系统', '系统', '所属系统', 'system'],
        'location': ['默认位置', '船舶位置', '位置', '存放位置', '库位', 'location', 'position'],
        'qty': ['默认数量', '需求数量', '数量', '申请数量', 'qty', 'quantity', 'count'],
        'reason': ['常用申请原因', '申请原因', '原因', '备注', '说明', 'reason', 'remark', 'note'],
      },
      requiredFields: ['templateName', 'ship', 'partName', 'system', 'location'],
      sampleFilename: '常用模板导入示例.csv',
      targetType: 'template',
      getExistingRecords: getTemplates,
      persistFn: persistTemplates,
      duplicateCheck: (record, existing) => existing.some(r => r.templateName === record.templateName),
      internalDuplicateCheck: (a, b) => a.templateName === b.templateName,
      duplicateLabel: '同一模板名称',
      existingDuplicateLabel: '与现有模板记录重复（同一模板名称）',
      extraValidate: (record, errors) => {
        if (record.ship && !appConfig.ships.includes(record.ship)) {
          errors.push(`船舶"${record.ship}"不在允许列表中，可选：${appConfig.ships.join('、')}`);
        }
        if (record.system) {
          const opts = templateConfig.fields.find(f => f.key === 'system')?.options || [];
          if (!opts.includes(record.system)) errors.push(`设备系统"${record.system}"不在允许列表中，可选：${opts.join('、')}`);
        }
        if (record.qty) {
          const n = Number(record.qty);
          if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) errors.push(`默认数量必须是正整数，当前值：${record.qty}`);
        }
      },
      buildNewRecord: (item) => ({
        id: uid(),
        ...item.data,
        useCount: 0,
        lastUsedAt: null,
        createdAt: new Date().toISOString()
      }),
      auditMetadata: (record) => ({ templateName: record.templateName, ship: record.ship, partName: record.partName, importBatch: true }),
      previewFields: (data) => [
        { cls: 'import-preview-ship', val: data.templateName },
        { cls: 'import-preview-part', val: data.partName },
        { cls: 'import-preview-system', val: data.system },
        { cls: 'import-preview-location', val: data.location },
        { cls: 'import-preview-qty', val: `x${data.qty || '-'}` },
        { cls: 'import-preview-urgency urgency-medium', val: data.ship },
      ],
      previewDetail: (data) => data.reason || '',
    },
  };
}
