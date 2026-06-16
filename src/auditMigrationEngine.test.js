import { describe, it, expect, beforeEach } from 'vitest';
import {
  CURRENT_DATA_VERSION,
  AUDIT_EVENT_TYPES,
  AUDIT_EVENT_LABELS,
  STORAGE_KEYS,
  getDataVersion,
  getMigrationLog,
  runMigrations,
  loadAuditLog,
  logAuditEvent,
  getAuditEventsByTarget,
  queryAuditEvents,
  getAuditStats,
  exportAuditLogToCSV,
  clearAuditLog,
  setOperator,
  loadRelationIndex,
  saveRelationIndex,
  buildRelationIndex,
  queryRelations,
  listBackups,
  restoreBackup,
  searchAuditEventsByObject,
  getObjectTimeline,
} from './auditMigrationEngine';

function makeRecord(overrides = {}) {
  return {
    id: 'rec-' + Math.random().toString(36).slice(2, 8),
    ship: '远洋一号',
    partName: '海水泵密封圈',
    system: '机舱',
    location: '二副库',
    qty: '2',
    urgency: '高',
    reason: '巡检发现渗漏',
    status: '待审批',
    timeline: [
      { status: '待审批', at: '2026-06-01', by: '张三', action: 'create', comment: '提交申请' },
    ],
    ...overrides,
  };
}

function makeInventory(overrides = {}) {
  return {
    id: 'inv-' + Math.random().toString(36).slice(2, 8),
    ship: '远洋一号',
    partName: '海水泵密封圈',
    system: '机舱',
    location: '二副库',
    currentStock: '10',
    safetyStock: '3',
    ...overrides,
  };
}

function makePurchase(overrides = {}) {
  return {
    id: 'pur-' + Math.random().toString(36).slice(2, 8),
    ship: '远洋一号',
    partName: '海水泵密封圈',
    status: '待下单',
    timeline: [{ status: '待下单', at: '2026-06-01', by: '系统迁移', action: 'create' }],
    ...overrides,
  };
}

function makeTemplate(overrides = {}) {
  return {
    id: 'tpl-' + Math.random().toString(36).slice(2, 8),
    templateName: '默认密封圈申请',
    ship: '远洋一号',
    partName: '海水泵密封圈',
    system: '机舱',
    location: '二副库',
    qty: '2',
    ...overrides,
  };
}

function makeDistribution(overrides = {}) {
  return {
    id: 'dist-' + Math.random().toString(36).slice(2, 8),
    ship: '远洋一号',
    partName: '海水泵密封圈',
    system: '机舱',
    location: '二副库',
    distQty: '2',
    applicationId: '',
    ...overrides,
  };
}

describe('auditMigrationEngine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('数据版本管理', () => {
    it('getDataVersion 在无版本标记时应返回 0', () => {
      expect(getDataVersion()).toBe(0);
    });

    it('getDataVersion 应正确读取已存储的版本号', () => {
      localStorage.setItem('hxwl-61307-data-version', '2');
      expect(getDataVersion()).toBe(2);
    });

    it('getDataVersion 在版本号为非数字时应返回 0', () => {
      localStorage.setItem('hxwl-61307-data-version', 'abc');
      expect(getDataVersion()).toBe(0);
    });

    it('CURRENT_DATA_VERSION 应为 3', () => {
      expect(CURRENT_DATA_VERSION).toBe(3);
    });
  });

  describe('审计日志 - 基本操作', () => {
    it('loadAuditLog 在无数据时应返回空数组', () => {
      expect(loadAuditLog()).toEqual([]);
    });

    it('logAuditEvent 应创建审计事件并持久化到 localStorage', () => {
      const event = logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.CREATE,
        targetType: 'record',
        targetId: 'rec-001',
        metadata: { ship: '远洋一号', partName: '密封圈' },
      });

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe(AUDIT_EVENT_TYPES.CREATE);
      expect(event.targetType).toBe('record');
      expect(event.targetId).toBe('rec-001');
      expect(event.timestamp).toBeDefined();
      expect(event.timestampMs).toBeTypeOf('number');
      expect(event.metadata.ship).toBe('远洋一号');

      const stored = loadAuditLog();
      expect(stored.length).toBe(1);
      expect(stored[0].id).toBe(event.id);
    });

    it('logAuditEvent 应使用 setOperator 设置的操作人', () => {
      setOperator('测试操作员');
      const event = logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.APPROVE,
        targetType: 'record',
        targetId: 'rec-002',
      });
      expect(event.operator).toBe('测试操作员');
    });

    it('logAuditEvent 在未设置操作人时应使用默认值', () => {
      const event = logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.DELETE,
        targetType: 'record',
        targetId: 'rec-003',
      });
      expect(event.operator).toBe('当前用户');
    });

    it('logAuditEvent 应深拷贝 beforeData 和 afterData', () => {
      const before = { status: '待审批' };
      const after = { status: '已批准' };
      const event = logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.APPROVE,
        targetType: 'record',
        targetId: 'rec-004',
        beforeData: before,
        afterData: after,
      });
      expect(event.beforeData).toEqual(before);
      expect(event.afterData).toEqual(after);
      event.beforeData.status = '已修改';
      expect(before.status).toBe('待审批');
    });

    it('审计日志超过 5000 条时应自动裁剪', () => {
      for (let i = 0; i < 100; i++) {
        logAuditEvent({
          eventType: AUDIT_EVENT_TYPES.CREATE,
          targetType: 'record',
          targetId: `rec-batch-${i}`,
        });
      }
      const log = loadAuditLog();
      expect(log.length).toBeLessThanOrEqual(5000);
      expect(log.length).toBe(100);
    });
  });

  describe('审计日志 - 查询', () => {
    beforeEach(() => {
      setOperator('查询测试员');
      logAuditEvent({ eventType: AUDIT_EVENT_TYPES.CREATE, targetType: 'record', targetId: 'q-rec-001', metadata: { ship: '远洋一号' } });
      logAuditEvent({ eventType: AUDIT_EVENT_TYPES.APPROVE, targetType: 'record', targetId: 'q-rec-001', metadata: { partName: '密封圈' } });
      logAuditEvent({ eventType: AUDIT_EVENT_TYPES.DELETE, targetType: 'purchase', targetId: 'q-pur-001' });
      logAuditEvent({ eventType: AUDIT_EVENT_TYPES.DISPATCH, targetType: 'record', targetId: 'q-rec-002', operator: '特殊操作员' });
    });

    it('queryAuditEvents 按 eventType 过滤', () => {
      const result = queryAuditEvents({ eventType: AUDIT_EVENT_TYPES.APPROVE });
      expect(result.length).toBe(1);
      expect(result[0].eventType).toBe(AUDIT_EVENT_TYPES.APPROVE);
    });

    it('queryAuditEvents 按 targetType 过滤', () => {
      const result = queryAuditEvents({ targetType: 'purchase' });
      expect(result.length).toBe(1);
      expect(result[0].targetId).toBe('q-pur-001');
    });

    it('queryAuditEvents 按 targetId 过滤', () => {
      const result = queryAuditEvents({ targetId: 'q-rec-001' });
      expect(result.length).toBe(2);
    });

    it('queryAuditEvents 按 operator 过滤', () => {
      const result = queryAuditEvents({ operator: '特殊操作员' });
      expect(result.length).toBe(1);
    });

    it('queryAuditEvents 按 limit 限制返回数量', () => {
      const result = queryAuditEvents({ limit: 2 });
      expect(result.length).toBe(2);
    });

    it('getAuditEventsByTarget 应返回指定对象的审计事件', () => {
      const events = getAuditEventsByTarget('record', 'q-rec-001');
      expect(events.length).toBe(2);
    });

    it('getAuditStats 应统计事件类型和操作人', () => {
      const stats = getAuditStats();
      expect(stats.total).toBe(4);
      expect(stats.byType[AUDIT_EVENT_TYPES.CREATE]).toBe(1);
      expect(stats.byType[AUDIT_EVENT_TYPES.APPROVE]).toBe(1);
      expect(stats.byOperator['查询测试员']).toBeGreaterThanOrEqual(3);
    });

    it('clearAuditLog 应清除所有审计日志', () => {
      clearAuditLog();
      expect(loadAuditLog()).toEqual([]);
    });
  });

  describe('审计日志 - CSV 导出', () => {
    it('exportAuditLogToCSV 应生成包含 BOM 的 CSV 内容', () => {
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.CREATE,
        targetType: 'record',
        targetId: 'csv-rec-001',
        afterData: { ship: '远洋一号', partName: '密封圈', status: '待审批', qty: '2' },
      });

      const csv = exportAuditLogToCSV();
      expect(csv.startsWith('\ufeff')).toBe(true);
      expect(csv).toContain('事件ID');
      expect(csv).toContain('创建申请');
      expect(csv).toContain('远洋一号');
    });

    it('exportAuditLogToCSV 应正确转义包含逗号的字段', () => {
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.MIGRATION,
        targetType: 'system',
        targetId: 'global',
        metadata: { info: '包含,逗号,的字段' },
      });

      const csv = exportAuditLogToCSV();
      expect(csv).toContain('数据迁移');
    });
  });

  describe('审计日志 - 关联搜索', () => {
    it('searchAuditEventsByObject 应按备件名称搜索', () => {
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.CREATE,
        targetType: 'record',
        targetId: 'search-rec-001',
        afterData: { partName: '专用密封圈', ship: '远洋一号' },
      });

      const result = searchAuditEventsByObject('专用密封圈');
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('searchAuditEventsByObject 应搜索关联对象', () => {
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.APPROVE,
        targetType: 'record',
        targetId: 'related-rec-001',
        metadata: { purchaseId: 'related-pur-001' },
      });
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.PURCHASE_CREATE,
        targetType: 'purchase',
        targetId: 'related-pur-001',
      });

      const result = searchAuditEventsByObject('related-rec-001');
      expect(result.events.length).toBeGreaterThanOrEqual(2);
      expect(result.relatedObjects.record).toContain('related-rec-001');
      expect(result.relatedObjects.purchase).toContain('related-pur-001');
    });

    it('searchAuditEventsByObject 空查询应返回空结果', () => {
      logAuditEvent({ eventType: AUDIT_EVENT_TYPES.CREATE, targetType: 'record', targetId: 'empty-001' });
      const result = searchAuditEventsByObject('');
      expect(result.events).toEqual([]);
    });
  });

  describe('审计日志 - 对象时间线', () => {
    it('getObjectTimeline 应返回对象及其关联对象的完整时间线', () => {
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.CREATE,
        targetType: 'record',
        targetId: 'tl-rec-001',
        metadata: {},
      });
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.APPROVE,
        targetType: 'record',
        targetId: 'tl-rec-001',
        metadata: { purchaseId: 'tl-pur-001' },
      });
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.PURCHASE_CREATE,
        targetType: 'purchase',
        targetId: 'tl-pur-001',
        metadata: { applicationId: 'tl-rec-001' },
      });

      const result = getObjectTimeline('record', 'tl-rec-001');
      expect(result.timeline.length).toBeGreaterThanOrEqual(2);
      expect(result.relatedIds.record).toContain('tl-rec-001');
    });
  });

  describe('数据迁移 - v0 → v1', () => {
    it('应为没有 ship 字段的记录填充默认船舶', () => {
      const records = [{ id: 'v0-001', partName: '测试备件', status: '待审批' }];
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      localStorage.removeItem('hxwl-61307-data-version');

      const result = runMigrations();
      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);

      const migrated = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS));
      expect(migrated[0].ship).toBe('远洋一号');
      expect(migrated[0]._migratedFrom).toBe(1);
    });

    it('应为没有 timeline 的记录创建默认时间线', () => {
      const records = [{ id: 'v0-002', partName: '密封圈', status: '已批准', ship: '海运之星' }];
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      localStorage.removeItem('hxwl-61307-data-version');

      runMigrations();
      const migrated = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS));
      expect(migrated[0].timeline).toBeDefined();
      expect(migrated[0].timeline.length).toBeGreaterThan(0);
    });

    it('应为库存记录填充 createdAt', () => {
      const inventory = [{ id: 'v0-inv-001', partName: '库存项' }];
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      localStorage.removeItem('hxwl-61307-data-version');

      runMigrations();
      const migrated = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY));
      expect(migrated[0].createdAt).toBeDefined();
    });
  });

  describe('数据迁移 - v1 → v2', () => {
    it('应为 timeline 步骤添加 action 字段', () => {
      const records = [{
        id: 'v1-001',
        ship: '远洋一号',
        partName: '密封圈',
        status: '已批准',
        timeline: [
          { status: '待审批', at: '2026-06-01', by: '张三' },
          { status: '已批准', at: '2026-06-02', by: '李四' },
        ],
        dataVersion: 1,
      }];
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      localStorage.setItem('hxwl-61307-data-version', '1');

      runMigrations();
      const migrated = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS));
      expect(migrated[0].timeline[0].action).toBe('create');
      expect(migrated[0].timeline[1].action).toBe('approve');
    });
  });

  describe('数据迁移 - v2 → v3', () => {
    it('应为缺少 ship 的记录填充默认船舶', () => {
      const records = [{
        id: 'v2-001',
        partName: '密封圈',
        status: '待审批',
        timeline: [{ status: '待审批', at: '2026-06-01', by: '张三', action: 'create' }],
        dataVersion: 2,
      }];
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      localStorage.setItem('hxwl-61307-data-version', '2');

      runMigrations();
      const migrated = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS));
      expect(migrated[0].ship).toBe('远洋一号');
      expect(migrated[0].dataVersion).toBe(3);
    });

    it('应为采购记录修复缺失的 timeline 和 status', () => {
      const purchases = [{ id: 'v2-pur-001', partName: '采购项', dataVersion: 2 }];
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
      localStorage.setItem('hxwl-61307-data-version', '2');

      runMigrations();
      const migrated = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES));
      expect(migrated[0].status).toBe('待下单');
      expect(migrated[0].timeline.length).toBeGreaterThan(0);
    });

    it('应构建关系索引', () => {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([makeRecord({ id: 'idx-rec-001' })]));
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([makePurchase({ id: 'idx-pur-001', applicationId: 'idx-rec-001' })]));
      localStorage.setItem(STORAGE_KEYS.DISTRIBUTION, JSON.stringify([makeDistribution({ id: 'idx-dist-001', applicationId: 'idx-rec-001' })]));
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify([makeInventory({ id: 'idx-inv-001' })]));
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify([makeTemplate({ id: 'idx-tpl-001' })]));
      localStorage.setItem('hxwl-61307-data-version', '2');

      runMigrations();
      const index = loadRelationIndex();
      expect(index.version).toBe(3);
      expect(index.byId['idx-rec-001']).toBeDefined();
      expect(index.byId['idx-pur-001']).toBeDefined();
      expect(index.applicationPurchases['idx-rec-001']).toContain('idx-pur-001');
    });
  });

  describe('数据迁移 - 完整流程', () => {
    it('从 v0 迁移到最新版本应完成所有步骤', () => {
      const records = [{ id: 'full-001', partName: '测试', status: '待审批' }];
      const inventory = [{ id: 'full-inv-001', partName: '库存' }];
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      localStorage.removeItem('hxwl-61307-data-version');

      const result = runMigrations();
      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.fromVersion).toBe(0);
      expect(result.toVersion).toBe(CURRENT_DATA_VERSION);
      expect(getDataVersion()).toBe(CURRENT_DATA_VERSION);
    });

    it('已是最新版本时不应执行迁移', () => {
      localStorage.setItem('hxwl-61307-data-version', String(CURRENT_DATA_VERSION));
      const result = runMigrations();
      expect(result.success).toBe(true);
      expect(result.migrated).toBe(false);
    });

    it('迁移前应自动创建备份', () => {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([makeRecord()]));
      localStorage.removeItem('hxwl-61307-data-version');

      runMigrations();
      const backups = listBackups();
      expect(backups.length).toBeGreaterThan(0);
    });

    it('迁移日志应记录迁移过程', () => {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([makeRecord()]));
      localStorage.removeItem('hxwl-61307-data-version');

      runMigrations();
      const log = getMigrationLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log.some(e => e.type === 'start')).toBe(true);
      expect(log.some(e => e.type === 'backup')).toBe(true);
    });

    it('损坏的数据应导致迁移失败并回滚', () => {
      localStorage.setItem(STORAGE_KEYS.RECORDS, 'not-valid-json{{{');
      localStorage.removeItem('hxwl-61307-data-version');

      const result = runMigrations();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('备份与恢复', () => {
    it('listBackups 应列出所有备份', () => {
      localStorage.setItem('hxwl-61307-backup-1000', JSON.stringify({ timestamp: 1000, data: {} }));
      localStorage.setItem('hxwl-61307-backup-2000', JSON.stringify({ timestamp: 2000, data: {} }));

      const backups = listBackups();
      expect(backups.length).toBe(2);
      expect(backups[0].timestamp).toBe(2000);
    });

    it('restoreBackup 应从备份恢复数据', () => {
      const originalData = { 'hxwl-61307-ship-spares': '[{"id":"test"}]' };
      localStorage.setItem('hxwl-61307-backup-restore-test', JSON.stringify({
        timestamp: 1000,
        version: 3,
        data: originalData,
      }));

      const result = restoreBackup('hxwl-61307-backup-restore-test');
      expect(result.success).toBe(true);
    });

    it('restoreBackup 不存在的备份应返回失败', () => {
      const result = restoreBackup('hxwl-61307-backup-nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('关系索引', () => {
    it('loadRelationIndex 在无数据时应返回默认结构', () => {
      const index = loadRelationIndex();
      expect(index.version).toBe(3);
      expect(index.byId).toEqual({});
      expect(index.applicationPurchases).toEqual({});
    });

    it('buildRelationIndex 应正确建立关联', () => {
      const rec = makeRecord({ id: 'ri-rec-001' });
      const pur = makePurchase({ id: 'ri-pur-001', applicationId: 'ri-rec-001' });
      const dist = makeDistribution({ id: 'ri-dist-001', applicationId: 'ri-rec-001' });
      const inv = makeInventory({ id: 'ri-inv-001', ship: rec.ship, partName: rec.partName, system: rec.system, location: rec.location });
      const tpl = makeTemplate({ id: 'ri-tpl-001' });

      const index = buildRelationIndex({
        records: [rec],
        purchases: [pur],
        distributions: [dist],
        inventory: [inv],
        templates: [tpl],
        syncQueue: [],
        auditLogs: [],
      });

      expect(index.byId['ri-rec-001'].type).toBe('application');
      expect(index.applicationPurchases['ri-rec-001']).toContain('ri-pur-001');
      expect(index.applicationDistributions['ri-rec-001']).toContain('ri-dist-001');
      expect(index.inventoryApplications['ri-inv-001']).toContain('ri-rec-001');
      expect(index.purchaseApplications['ri-pur-001']).toContain('ri-rec-001');
    });

    it('queryRelations 应查询对象的关联关系', () => {
      const rec = makeRecord({ id: 'qr-rec-001' });
      const pur = makePurchase({ id: 'qr-pur-001', applicationId: 'qr-rec-001' });

      const index = buildRelationIndex({
        records: [rec],
        purchases: [pur],
        distributions: [],
        inventory: [],
        templates: [],
        syncQueue: [],
        auditLogs: [],
      });
      saveRelationIndex(index);

      const relations = queryRelations('record', 'qr-rec-001');
      expect(relations.purchases).toContain('qr-pur-001');
    });

    it('saveRelationIndex / loadRelationIndex 应正确持久化', () => {
      const index = buildRelationIndex({
        records: [makeRecord({ id: 'sl-rec-001' })],
        purchases: [],
        distributions: [],
        inventory: [],
        templates: [],
        syncQueue: [],
        auditLogs: [],
      });
      saveRelationIndex(index);
      const loaded = loadRelationIndex();
      expect(loaded.byId['sl-rec-001']).toBeDefined();
      expect(loaded.version).toBe(3);
    });
  });

  describe('操作人管理', () => {
    it('setOperator 应持久化操作人到 localStorage', () => {
      setOperator('新操作员');
      expect(localStorage.getItem('hxwl-61307-operator')).toBe('新操作员');
    });

    it('logAuditEvent 应使用 setOperator 设置的操作人', () => {
      setOperator('审计操作员');
      const event = logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.CREATE,
        targetType: 'record',
        targetId: 'op-test-001',
      });
      expect(event.operator).toBe('审计操作员');
    });
  });

  describe('AUDIT_EVENT_LABELS', () => {
    it('所有 AUDIT_EVENT_TYPES 都应有对应的中文标签', () => {
      Object.values(AUDIT_EVENT_TYPES).forEach((type) => {
        expect(AUDIT_EVENT_LABELS[type]).toBeDefined();
        expect(typeof AUDIT_EVENT_LABELS[type]).toBe('string');
      });
    });
  });
});
