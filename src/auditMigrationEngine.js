const DATA_VERSION_KEY = 'hxwl-61307-data-version';
const DATA_BACKUP_PREFIX = 'hxwl-61307-backup-';
const AUDIT_LOG_KEY = 'hxwl-61307-audit-log';
const MIGRATION_LOG_KEY = 'hxwl-61307-migration-log';
const TOMBSTONE = '__TOMBSTONE__';


export const CURRENT_DATA_VERSION = 2;

export const AUDIT_EVENT_TYPES = {
  CREATE: 'create',
  APPROVE: 'approve',
  REJECT: 'reject',
  DISPATCH: 'dispatch',
  DELETE: 'delete',
  IMPORT: 'import',
  PURCHASE_CREATE: 'purchase_create',
  PURCHASE_UPDATE: 'purchase_update',
  PURCHASE_ARRIVE: 'purchase_arrive',
  PURCHASE_DELETE: 'purchase_delete',
  MIGRATION: 'migration',
  SYNC_CONFLICT_RESOLVE: 'sync_conflict_resolve',
  UPDATE_STATUS: 'update_status',
  INVENTORY_DEDUCT: 'inventory_deduct',
  INVENTORY_RESTORE: 'inventory_restore',
  INVENTORY_ADD: 'inventory_add',
  INVENTORY_IMPORT: 'inventory_import',
  TEMPLATE_IMPORT: 'template_import',
};

export const AUDIT_EVENT_LABELS = {
  create: '创建申请',
  approve: '审批通过',
  reject: '审批驳回',
  dispatch: '发放出库',
  delete: '删除记录',
  import: '批量导入',
  purchase_create: '创建采购任务',
  purchase_update: '更新采购状态',
  purchase_arrive: '采购到货回填',
  purchase_delete: '删除采购任务',
  migration: '数据迁移',
  sync_conflict_resolve: '同步冲突处理',
  update_status: '状态变更',
  inventory_deduct: '库存扣减',
  inventory_restore: '库存恢复',
  inventory_add: '采购入库',
  inventory_import: '批量导入库存',
  template_import: '批量导入模板',
};

export const STORAGE_KEYS = {
  RECORDS: 'hxwl-61307-ship-spares',
  INVENTORY: 'hxwl-61307-spare-inventory',
  DISTRIBUTION: 'hxwl-61307-distribution',
  TEMPLATES: 'hxwl-61307-spare-templates',
  PURCHASES: 'hxwl-61307-purchase-orders',
};

function uid() {
  return 'audit_' + Math.random().toString(36).slice(2, 12) + '_' + Date.now().toString(36);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function parseMigrationArray(raw, storageName) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`${storageName}不是数组格式`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`${storageName}数据解析失败：${error.message || String(error)}`);
  }
}

function getTimestamp() {
  return new Date().toISOString();
}

function getOperator() {
  const saved = localStorage.getItem('hxwl-61307-operator');
  return saved || '当前用户';
}

export function setOperator(name) {
  localStorage.setItem('hxwl-61307-operator', name);
}

export function getDataVersion() {
  const raw = localStorage.getItem(DATA_VERSION_KEY);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setDataVersion(version) {
  localStorage.setItem(DATA_VERSION_KEY, String(version));
}

export function getMigrationLog() {
  return safeParse(localStorage.getItem(MIGRATION_LOG_KEY), []);
}

function appendMigrationLog(entry) {
  const log = getMigrationLog();
  log.push({
    id: 'migration_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    timestamp: getTimestamp(),
    ...entry,
  });
  localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(log.slice(-100)));
}

function backupAllData() {
  const timestamp = Date.now();
  const backup = {};
  Object.values(STORAGE_KEYS).forEach((key) => {
    const raw = localStorage.getItem(key);
    backup[key] = raw === null ? TOMBSTONE : raw;
  });
  const backupKey = DATA_BACKUP_PREFIX + timestamp;
  try {
    localStorage.setItem(backupKey, JSON.stringify({
      timestamp,
      version: getDataVersion(),
      data: backup,
    }));
  } catch (e) {
    console.error('写入备份失败：', e);
    throw e;
  }
  const backups = listBackups();
  backups.push({ key: backupKey, timestamp });
  const sorted = backups.sort((a, b) => b.timestamp - a.timestamp);
  while (sorted.length > 10) {
    const oldest = sorted.pop();
    localStorage.removeItem(oldest.key);
  }
  return backupKey;
}

export function listBackups() {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(DATA_BACKUP_PREFIX)) {
      const ts = parseInt(key.replace(DATA_BACKUP_PREFIX, ''), 10);
      if (Number.isFinite(ts)) {
        result.push({ key, timestamp: ts });
      }
    }
  }
  return result.sort((a, b) => b.timestamp - a.timestamp);
}

export function restoreBackup(backupKey) {
  const raw = localStorage.getItem(backupKey);
  if (!raw) return { success: false, error: '备份不存在' };
  try {
    const backup = JSON.parse(raw);
    const backupData = backup.data || {};
    Object.values(STORAGE_KEYS).forEach((key) => {
      const savedValue = backupData[key];
      if (savedValue === undefined || savedValue === TOMBSTONE) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, savedValue);
      }
    });
    if (backup.version !== undefined) {
      setDataVersion(backup.version);
    }
    appendMigrationLog({
      type: 'restore',
      fromBackup: backupKey,
      version: backup.version,
      success: true,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

function rollbackFromBackup(backupKey) {
  const result = restoreBackup(backupKey);
  if (!result.success) {
    console.error('回滚失败：', result.error);
  }
  return result;
}

function migrateFromV0ToV1() {
  const today = new Date().toISOString().slice(0, 10);
  const recordsRaw = localStorage.getItem(STORAGE_KEYS.RECORDS);
  if (recordsRaw) {
    const records = parseMigrationArray(recordsRaw, '申请记录');
    const migrated = records.map((item) => {
      const dispatched = item.hasBeenDispatched || (item.timeline || []).some((step) => step.status === '已发放');
      return {
        ...item,
        ship: item.ship || '远洋一号',
        timeline: item.timeline || [{ status: item.status || '待审批', at: today, by: '系统迁移' }],
        hasBeenDispatched: dispatched,
        createdAt: item.createdAt || new Date().toISOString(),
        _migratedFrom: 0,
      };
    });
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(migrated));
  }

  const inventoryRaw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
  if (inventoryRaw) {
    const inventory = parseMigrationArray(inventoryRaw, '库存记录');
    const migrated = inventory.map((item) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      _migratedFrom: 0,
    }));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(migrated));
  }

  const templatesRaw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  if (templatesRaw) {
    const templates = parseMigrationArray(templatesRaw, '模板记录');
    const migrated = templates.map((item) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      _migratedFrom: 0,
    }));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(migrated));
  }

  const distRaw = localStorage.getItem(STORAGE_KEYS.DISTRIBUTION);
  if (distRaw) {
    const dist = parseMigrationArray(distRaw, '发放记录');
    const migrated = dist.map((item) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      _migratedFrom: 0,
    }));
    localStorage.setItem(STORAGE_KEYS.DISTRIBUTION, JSON.stringify(migrated));
  }

  const purchasesRaw = localStorage.getItem(STORAGE_KEYS.PURCHASES);
  if (purchasesRaw) {
    const purchases = parseMigrationArray(purchasesRaw, '采购记录');
    const migrated = purchases.map((item) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      timeline: item.timeline || [{ status: item.status || '待下单', at: today, by: '系统迁移', action: 'migrate' }],
      _migratedFrom: 0,
    }));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(migrated));
  }
}

function migrateFromV1ToV2() {
  const today = new Date().toISOString().slice(0, 10);
  const recordsRaw = localStorage.getItem(STORAGE_KEYS.RECORDS);
  if (recordsRaw) {
    const records = parseMigrationArray(recordsRaw, '申请记录');
    const migrated = records.map((item) => {
      const timeline = item.timeline || [];
      if (timeline.length > 0 && !timeline[0].action) {
        timeline[0].action = 'create';
      }
      const enrichedTimeline = timeline.map((step) => {
        if (!step.action) {
          if (step.status === '已批准') step.action = 'approve';
          else if (step.status === '已驳回') step.action = 'reject';
          else if (step.status === '已发放') step.action = 'dispatch';
          else if (step.status === '待审批') step.action = 'create';
          else if (step.status === '采购中') step.action = 'purchase-create';
          else if (step.status === '已到货') step.action = 'purchase-arrive';
          else step.action = 'update';
        }
        return step;
      });
      return {
        ...item,
        timeline: enrichedTimeline,
        dataVersion: 2,
        _migratedFrom: item._migratedFrom || 1,
      };
    });
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(migrated));

    migrated.forEach((record) => {
      if (record._migratedFrom !== undefined) {
        logAuditEvent({
          eventType: AUDIT_EVENT_TYPES.MIGRATION,
          targetType: 'record',
          targetId: record.id,
          metadata: {
            fromVersion: record._migratedFrom,
            toVersion: 2,
            recordSummary: {
              ship: record.ship,
              partName: record.partName,
              status: record.status,
            },
          },
          operator: '系统迁移',
        });
      }
    });
  }

  const purchasesRaw = localStorage.getItem(STORAGE_KEYS.PURCHASES);
  if (purchasesRaw) {
    const purchases = parseMigrationArray(purchasesRaw, '采购记录');
    const migrated = purchases.map((item) => ({
      ...item,
      dataVersion: 2,
    }));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(migrated));
  }
}

const MIGRATIONS = [
  { from: 0, to: 1, fn: migrateFromV0ToV1 },
  { from: 1, to: 2, fn: migrateFromV1ToV2 },
];

export function runMigrations() {
  const currentVersion = getDataVersion();
  if (currentVersion >= CURRENT_DATA_VERSION) {
    return {
      success: true,
      migrated: false,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      message: `数据已是最新版本（v${currentVersion}）`,
    };
  }

  let backupKey = null;
  appendMigrationLog({
    type: 'start',
    fromVersion: currentVersion,
    targetVersion: CURRENT_DATA_VERSION,
  });

  try {
    backupKey = backupAllData();
    appendMigrationLog({
      type: 'backup',
      backupKey,
      fromVersion: currentVersion,
      targetVersion: CURRENT_DATA_VERSION,
    });
  } catch (backupError) {
    appendMigrationLog({
      type: 'backup',
      fromVersion: currentVersion,
      targetVersion: CURRENT_DATA_VERSION,
      success: false,
      error: backupError.message || String(backupError),
    });
    return {
      success: false,
      migrated: false,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      error: backupError.message || String(backupError),
      message: `迁移备份失败，已中止迁移以保护数据。错误：${backupError.message || String(backupError)}`,
    };
  }

  let workingVersion = currentVersion;
  const appliedMigrations = [];

  try {
    for (const migration of MIGRATIONS) {
      if (migration.from === workingVersion) {
        migration.fn();
        workingVersion = migration.to;
        appliedMigrations.push({ from: migration.from, to: migration.to });
        appendMigrationLog({
          type: 'migration',
          fromVersion: migration.from,
          toVersion: migration.to,
          success: true,
        });
      }
    }

    setDataVersion(workingVersion);

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.MIGRATION,
      targetType: 'system',
      targetId: 'global',
      metadata: {
        fromVersion: currentVersion,
        toVersion: workingVersion,
        appliedMigrations,
        backupKey,
      },
      operator: '系统迁移',
    });

    return {
      success: true,
      migrated: true,
      fromVersion: currentVersion,
      toVersion: workingVersion,
      appliedMigrations,
      backupKey,
      message: `迁移完成：v${currentVersion} → v${workingVersion}`,
    };
  } catch (error) {
    console.error('数据迁移失败，正在回滚...', error);
    let rollbackResult = { success: false, error: '未执行回滚' };
    if (backupKey) {
      rollbackResult = rollbackFromBackup(backupKey);
    }
    appendMigrationLog({
      type: 'migration',
      fromVersion: currentVersion,
      toVersion: workingVersion,
      success: false,
      error: error.message || String(error),
      rollbackSuccess: rollbackResult.success,
      rollbackError: rollbackResult.error,
    });
    return {
      success: false,
      migrated: false,
      fromVersion: currentVersion,
      toVersion: currentVersion,
      error: error.message || String(error),
      rollbackSuccess: rollbackResult.success,
      backupKey,
      message: `迁移失败，已${rollbackResult.success ? '成功' : '尝试'}恢复到原始数据。错误：${error.message || String(error)}${rollbackResult.success ? '' : `（回滚异常：${rollbackResult.error || '未知'}）`}`,
    };
  }
}

export function loadAuditLog() {
  return safeParse(localStorage.getItem(AUDIT_LOG_KEY), []);
}

function saveAuditLog(log) {
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log));
}

export function logAuditEvent({
  eventType,
  targetType,
  targetId,
  beforeData = null,
  afterData = null,
  metadata = {},
  operator = null,
}) {
  const event = {
    id: uid(),
    eventType,
    targetType,
    targetId,
    timestamp: getTimestamp(),
    timestampMs: Date.now(),
    operator: operator || getOperator(),
    beforeData: beforeData ? deepClone(beforeData) : null,
    afterData: afterData ? deepClone(afterData) : null,
    metadata: deepClone(metadata),
  };

  const log = loadAuditLog();
  log.push(event);
  const trimmed = log.slice(-5000);
  saveAuditLog(trimmed);
  return event;
}

export function getAuditEventsByTarget(targetType, targetId) {
  const log = loadAuditLog();
  return log
    .filter((e) => e.targetType === targetType && e.targetId === targetId)
    .sort((a, b) => b.timestampMs - a.timestampMs);
}

export function queryAuditEvents({
  eventType = null,
  targetType = null,
  targetId = null,
  operator = null,
  startDate = null,
  endDate = null,
  limit = 500,
} = {}) {
  let log = loadAuditLog();

  if (eventType) {
    log = log.filter((e) => e.eventType === eventType);
  }
  if (targetType) {
    log = log.filter((e) => e.targetType === targetType);
  }
  if (targetId) {
    log = log.filter((e) => e.targetId === targetId);
  }
  if (operator) {
    log = log.filter((e) => (e.operator || '').includes(operator));
  }
  if (startDate) {
    const startMs = new Date(startDate).getTime();
    log = log.filter((e) => e.timestampMs >= startMs);
  }
  if (endDate) {
    const endMs = new Date(endDate).getTime() + 86400000;
    log = log.filter((e) => e.timestampMs < endMs);
  }

  return log
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, limit);
}

function escapeCSVField(field) {
  const str = String(field ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportAuditLogToCSV(filterOptions = {}) {
  const events = queryAuditEvents({ ...filterOptions, limit: 10000 });

  const headers = [
    '事件ID',
    '时间',
    '事件类型',
    '操作对象',
    '对象ID',
    '操作人',
    '变更前摘要',
    '变更后摘要',
    '附加信息',
  ];

  function summarizeData(data) {
    if (!data) return '';
    try {
      if (typeof data === 'object') {
        const parts = [];
        if (data.ship) parts.push(`船舶:${data.ship}`);
        if (data.partName) parts.push(`备件:${data.partName}`);
        if (data.status) parts.push(`状态:${data.status}`);
        if (data.qty !== undefined) parts.push(`数量:${data.qty}`);
        if (data.approvedQty !== undefined) parts.push(`批准数:${data.approvedQty}`);
        if (data.urgency) parts.push(`紧急:${data.urgency}`);
        if (data.supplier) parts.push(`供应商:${data.supplier}`);
        if (data.purchaseQty) parts.push(`采购数:${data.purchaseQty}`);
        if (data.currentStock !== undefined) parts.push(`当前库存:${data.currentStock}`);
        if (data.safetyStock !== undefined) parts.push(`安全库存:${data.safetyStock}`);
        if (data.system) parts.push(`系统:${data.system}`);
        if (data.location) parts.push(`位置:${data.location}`);
        if (parts.length === 0) {
          const keys = Object.keys(data).slice(0, 3);
          keys.forEach((k) => parts.push(`${k}:${String(data[k]).slice(0, 20)}`));
        }
        return parts.join(' | ');
      }
      return String(data).slice(0, 100);
    } catch {
      return '';
    }
  }

  const rows = events.map((e) => [
    e.id,
    e.timestamp,
    AUDIT_EVENT_LABELS[e.eventType] || e.eventType,
    e.targetType === 'record' ? '备件申请' : e.targetType === 'purchase' ? '采购任务' : e.targetType === 'system' ? '系统' : e.targetType,
    e.targetId,
    e.operator || '',
    summarizeData(e.beforeData),
    summarizeData(e.afterData),
    e.metadata && typeof e.metadata === 'object' && Object.keys(e.metadata).length > 0
      ? JSON.stringify(e.metadata).slice(0, 200)
      : '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSVField).join(','))
    .join('\n');

  return '\ufeff' + csv;
}

export function downloadAuditLogCSV(filterOptions = {}) {
  const csv = exportAuditLogToCSV(filterOptions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `审计日志_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getAuditStats() {
  const log = loadAuditLog();
  const stats = {
    total: log.length,
    byType: {},
    byOperator: {},
    last7Days: 0,
  };
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  log.forEach((e) => {
    stats.byType[e.eventType] = (stats.byType[e.eventType] || 0) + 1;
    if (e.operator) {
      stats.byOperator[e.operator] = (stats.byOperator[e.operator] || 0) + 1;
    }
    if (e.timestampMs >= sevenDaysAgo) {
      stats.last7Days += 1;
    }
  });

  return stats;
}

export function clearAuditLog() {
  saveAuditLog([]);
}

export function searchAuditEventsByObject(query) {
  const log = loadAuditLog();
  if (!query || !query.trim()) {
    return { events: [], relatedObjects: {} };
  }
  
  const q = query.trim().toLowerCase();
  const matchedEventIds = new Set();
  const relatedObjectIds = {
    record: new Set(),
    purchase: new Set(),
    inventory: new Set(),
    distribution: new Set(),
    template: new Set(),
    conflict: new Set(),
    migration: new Set(),
  };
  
  log.forEach((event) => {
    const metadata = event.metadata || {};
    const afterData = event.afterData || {};
    const beforeData = event.beforeData || {};
    
    const partName = (metadata.partName || afterData.partName || beforeData.partName || '').toLowerCase();
    const ship = (metadata.ship || afterData.ship || beforeData.ship || '').toLowerCase();
    const system = (metadata.system || afterData.system || beforeData.system || '').toLowerCase();
    
    if (
      event.targetId.toLowerCase().includes(q) ||
      partName.includes(q) ||
      ship.includes(q) ||
      system.includes(q) ||
      (metadata.purchaseId && String(metadata.purchaseId).toLowerCase().includes(q)) ||
      (metadata.applicationId && String(metadata.applicationId).toLowerCase().includes(q)) ||
      (metadata.inventoryId && String(metadata.inventoryId).toLowerCase().includes(q)) ||
      (metadata.distRecordId && String(metadata.distRecordId).toLowerCase().includes(q)) ||
      (metadata.conflictId && String(metadata.conflictId).toLowerCase().includes(q))
    ) {
      matchedEventIds.add(event.id);
      
      if (event.targetType === 'record') {
        relatedObjectIds.record.add(event.targetId);
      } else if (event.targetType === 'purchase') {
        relatedObjectIds.purchase.add(event.targetId);
      } else if (event.targetType === 'inventory') {
        relatedObjectIds.inventory.add(event.targetId);
      } else if (event.targetType === 'distribution') {
        relatedObjectIds.distribution.add(event.targetId);
      } else if (event.targetType === 'template') {
        relatedObjectIds.template.add(event.targetId);
      } else if (event.targetType === 'conflict') {
        relatedObjectIds.conflict.add(event.targetId);
      } else if (event.targetType === 'migration' || event.eventType === AUDIT_EVENT_TYPES.MIGRATION) {
        relatedObjectIds.migration.add(event.targetId);
      }
      
      if (metadata.applicationId) {
        relatedObjectIds.record.add(metadata.applicationId);
      }
      if (metadata.purchaseId) {
        relatedObjectIds.purchase.add(metadata.purchaseId);
      }
      if (metadata.inventoryId) {
        relatedObjectIds.inventory.add(metadata.inventoryId);
      }
      if (metadata.distRecordId) {
        relatedObjectIds.distribution.add(metadata.distRecordId);
      }
      if (metadata.conflictId) {
        relatedObjectIds.conflict.add(metadata.conflictId);
      }
      if (event.eventType === AUDIT_EVENT_TYPES.MIGRATION) {
        relatedObjectIds.migration.add(event.targetId);
      }
    }
  });
  
  log.forEach((event) => {
    if (matchedEventIds.has(event.id)) return;
    
    const metadata = event.metadata || {};
    const hasRelatedContext = Object.values(relatedObjectIds).some((ids) => ids.size > 0);
    
    if (
      relatedObjectIds.record.has(event.targetId) ||
      relatedObjectIds.purchase.has(event.targetId) ||
      relatedObjectIds.inventory.has(event.targetId) ||
      relatedObjectIds.distribution.has(event.targetId) ||
      relatedObjectIds.template.has(event.targetId) ||
      relatedObjectIds.conflict.has(event.targetId) ||
      relatedObjectIds.migration.has(event.targetId) ||
      (metadata.applicationId && relatedObjectIds.record.has(metadata.applicationId)) ||
      (metadata.purchaseId && relatedObjectIds.purchase.has(metadata.purchaseId)) ||
      (metadata.inventoryId && relatedObjectIds.inventory.has(metadata.inventoryId)) ||
      (metadata.distRecordId && relatedObjectIds.distribution.has(metadata.distRecordId)) ||
      (metadata.conflictId && relatedObjectIds.conflict.has(metadata.conflictId)) ||
      (event.eventType === AUDIT_EVENT_TYPES.MIGRATION && hasRelatedContext)
    ) {
      matchedEventIds.add(event.id);
      
      if (event.targetType === 'record') {
        relatedObjectIds.record.add(event.targetId);
      } else if (event.targetType === 'purchase') {
        relatedObjectIds.purchase.add(event.targetId);
      } else if (event.targetType === 'inventory') {
        relatedObjectIds.inventory.add(event.targetId);
      } else if (event.targetType === 'distribution') {
        relatedObjectIds.distribution.add(event.targetId);
      } else if (event.targetType === 'template') {
        relatedObjectIds.template.add(event.targetId);
      } else if (event.targetType === 'conflict') {
        relatedObjectIds.conflict.add(event.targetId);
      } else if (event.targetType === 'migration' || event.eventType === AUDIT_EVENT_TYPES.MIGRATION) {
        relatedObjectIds.migration.add(event.targetId);
      }
      
      if (metadata.applicationId) {
        relatedObjectIds.record.add(metadata.applicationId);
      }
      if (metadata.purchaseId) {
        relatedObjectIds.purchase.add(metadata.purchaseId);
      }
      if (metadata.inventoryId) {
        relatedObjectIds.inventory.add(metadata.inventoryId);
      }
      if (metadata.distRecordId) {
        relatedObjectIds.distribution.add(metadata.distRecordId);
      }
      if (metadata.conflictId) {
        relatedObjectIds.conflict.add(metadata.conflictId);
      }
      if (event.eventType === AUDIT_EVENT_TYPES.MIGRATION) {
        relatedObjectIds.migration.add(event.targetId);
      }
    }
  });
  
  const matchedEvents = log
    .filter((e) => matchedEventIds.has(e.id))
    .sort((a, b) => a.timestampMs - b.timestampMs);
  
  const relatedObjects = {
    record: Array.from(relatedObjectIds.record),
    purchase: Array.from(relatedObjectIds.purchase),
    inventory: Array.from(relatedObjectIds.inventory),
    distribution: Array.from(relatedObjectIds.distribution),
    template: Array.from(relatedObjectIds.template),
    conflict: Array.from(relatedObjectIds.conflict),
    migration: Array.from(relatedObjectIds.migration),
  };
  
  return { events: matchedEvents, relatedObjects };
}

export function getObjectTimeline(targetType, targetId) {
  const log = loadAuditLog();
  const relatedEventIds = new Set();
  const relatedIds = {
    record: new Set(),
    purchase: new Set(),
    inventory: new Set(),
    distribution: new Set(),
    template: new Set(),
    conflict: new Set(),
    migration: new Set(),
  };
  
  relatedIds[targetType]?.add(targetId);
  
  log.forEach((event) => {
    const metadata = event.metadata || {};
    
    if (event.targetType === targetType && event.targetId === targetId) {
      relatedEventIds.add(event.id);
      if (metadata.applicationId) relatedIds.record.add(metadata.applicationId);
      if (metadata.purchaseId) relatedIds.purchase.add(metadata.purchaseId);
      if (metadata.inventoryId) relatedIds.inventory.add(metadata.inventoryId);
      if (metadata.distRecordId) relatedIds.distribution.add(metadata.distRecordId);
      if (metadata.conflictId) relatedIds.conflict.add(metadata.conflictId);
      if (event.eventType === AUDIT_EVENT_TYPES.MIGRATION) relatedIds.migration.add(event.targetId);
    }
    
    if (
      (metadata.applicationId && relatedIds.record.has(metadata.applicationId)) ||
      (metadata.purchaseId && relatedIds.purchase.has(metadata.purchaseId)) ||
      (metadata.inventoryId && relatedIds.inventory.has(metadata.inventoryId)) ||
      (metadata.distRecordId && relatedIds.distribution.has(metadata.distRecordId)) ||
      (metadata.conflictId && relatedIds.conflict.has(metadata.conflictId)) ||
      event.eventType === AUDIT_EVENT_TYPES.MIGRATION
    ) {
      relatedEventIds.add(event.id);
      if (event.targetType === 'record') relatedIds.record.add(event.targetId);
      if (event.targetType === 'purchase') relatedIds.purchase.add(event.targetId);
      if (event.targetType === 'inventory') relatedIds.inventory.add(event.targetId);
      if (event.targetType === 'distribution') relatedIds.distribution.add(event.targetId);
      if (event.targetType === 'template') relatedIds.template.add(event.targetId);
      if (event.targetType === 'conflict') relatedIds.conflict.add(event.targetId);
      if (event.eventType === AUDIT_EVENT_TYPES.MIGRATION) relatedIds.migration.add(event.targetId);
    }
  });
  
  const timeline = log
    .filter((e) => relatedEventIds.has(e.id))
    .sort((a, b) => a.timestampMs - b.timestampMs);
  
  return {
    timeline,
    relatedIds: {
      record: Array.from(relatedIds.record),
      purchase: Array.from(relatedIds.purchase),
      inventory: Array.from(relatedIds.inventory),
      distribution: Array.from(relatedIds.distribution),
      template: Array.from(relatedIds.template),
      conflict: Array.from(relatedIds.conflict),
      migration: Array.from(relatedIds.migration),
    },
  };
}
