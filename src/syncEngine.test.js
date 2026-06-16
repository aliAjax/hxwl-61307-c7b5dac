import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectConflicts,
  autoResolveConflict,
  applyConflictResolution,
  CONFLICT_TYPES,
  RESOLUTION_STRATEGIES,
  OP_TYPES,
  OBJECT_TYPES,
  loadSyncQueue,
  saveSyncQueue,
  loadConflicts,
  saveConflicts,
  loadBaseline,
  saveBaseline,
  enqueueOperation,
  removeFromQueue,
  clearQueue,
  getPendingOperations,
  getCompletedOperations,
  getPendingOperationsByType,
  takeBaseline,
  clearAllSyncData,
} from './syncEngine';

function makeOp(overrides = {}) {
  return {
    id: 'op_' + Math.random().toString(36).slice(2, 8),
    timestamp: Date.now(),
    synced: false,
    syncAttempts: 0,
    error: null,
    objectType: OBJECT_TYPES.APPLICATION,
    type: OP_TYPES.UPDATE_STATUS,
    targetId: 'app-001',
    payload: {},
    ...overrides,
  };
}

function makeApplication(overrides = {}) {
  return {
    id: 'app-001',
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

function makeBaseline(records) {
  const baseline = {};
  records.forEach((r) => {
    baseline[r.id] = JSON.parse(JSON.stringify(r));
  });
  return baseline;
}

function markQueueOpsRemovedByConflict(opsToRemove, syncedAt = Date.now()) {
  const removeIds = new Set(opsToRemove);
  const updated = loadSyncQueue().map((op) =>
    removeIds.has(op.id)
      ? { ...op, synced: true, removedByConflict: true, syncedAt }
      : op
  );
  saveSyncQueue(updated);
  return updated;
}

describe('syncEngine - 离线同步冲突逻辑', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('detectConflicts - 冲突检测', () => {
    describe('同一申请多次状态变更 (MULTIPLE_STATUS_CHANGES)', () => {
      it('应检测到同一记录的多次状态变更操作并标记为 MULTIPLE_STATUS_CHANGES 类型', () => {
        const record = makeApplication({ id: 'app-001', status: '待审批' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-001',
            type: OP_TYPES.APPROVE,
            timestamp: 1000,
            payload: { fromStatus: '待审批', toStatus: '已批准', approvedQty: '2', by: '李主管', comment: '同意' },
          }),
          makeOp({
            targetId: 'app-001',
            type: OP_TYPES.DISPATCH,
            timestamp: 2000,
            payload: { fromStatus: '已批准', toStatus: '已发放', by: '仓库管理员', comment: '已出库' },
          }),
        ];

        const remoteRecords = [makeApplication({ id: 'app-001', status: '待审批' })];
        const conflicts = detectConflicts(ops, baseline, remoteRecords);

        expect(conflicts.length).toBe(1);
        expect(conflicts[0].type).toBe(CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES);
        expect(conflicts[0].targetId).toBe('app-001');
        expect(conflicts[0].severity).toBe('warning');
        expect(conflicts[0].localOperations.length).toBe(2);
      });

      it('推荐策略应为 KEEP_LOCAL，且标记为可自动解决', () => {
        const record = makeApplication({ id: 'app-002', status: '待审批' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-002',
            type: OP_TYPES.APPROVE,
            timestamp: 1000,
            payload: { fromStatus: '待审批', toStatus: '已批准', by: 'A' },
          }),
          makeOp({
            targetId: 'app-002',
            type: OP_TYPES.REJECT,
            timestamp: 2000,
            payload: { fromStatus: '已批准', toStatus: '已驳回', by: 'B', comment: '数量不符' },
          }),
        ];

        const remoteRecords = [makeApplication({ id: 'app-002', status: '待审批' })];
        const conflicts = detectConflicts(ops, baseline, remoteRecords);

        expect(conflicts[0].autoResolvable).toBe(true);
        expect(conflicts[0].recommendedStrategy).toBe(RESOLUTION_STRATEGIES.KEEP_LOCAL);
        expect(conflicts[0].localFinalState.status).toBe('已驳回');
      });

      it('affectedOps 应包含所有状态变更操作的 ID', () => {
        const record = makeApplication({ id: 'app-003' });
        const baseline = makeBaseline([record]);

        const op1 = makeOp({
          targetId: 'app-003',
          type: OP_TYPES.UPDATE_STATUS,
          timestamp: 1000,
          payload: { toStatus: '已批准', by: 'X' },
        });
        const op2 = makeOp({
          targetId: 'app-003',
          type: OP_TYPES.UPDATE_STATUS,
          timestamp: 2000,
          payload: { toStatus: '已发放', by: 'Y' },
        });
        const op3 = makeOp({
          targetId: 'app-003',
          type: OP_TYPES.UPDATE_STATUS,
          timestamp: 3000,
          payload: { toStatus: '已完成', by: 'Z' },
        });

        const remoteRecords = [makeApplication({ id: 'app-003' })];
        const conflicts = detectConflicts([op1, op2, op3], baseline, remoteRecords);

        expect(conflicts[0].affectedOps).toEqual([op1.id, op2.id, op3.id]);
        expect(conflicts[0].localOperations.length).toBe(3);
      });

      it('单次状态变更不应触发多次状态变更冲突', () => {
        const record = makeApplication({ id: 'app-004', status: '待审批' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-004',
            type: OP_TYPES.APPROVE,
            payload: { toStatus: '已批准', by: '审批员' },
          }),
        ];

        const remoteRecords = [makeApplication({ id: 'app-004', status: '待审批' })];
        const conflicts = detectConflicts(ops, baseline, remoteRecords);

        const multiStatusConflicts = conflicts.filter(
          (c) => c.type === CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES
        );
        expect(multiStatusConflicts.length).toBe(0);
      });
    });

    describe('删除后审批 (DELETE_THEN_APPROVE)', () => {
      it('应检测到删除后又审批的冲突', () => {
        const record = makeApplication({ id: 'app-010', status: '待审批' });
        const baseline = makeBaseline([record]);

        const deleteOp = makeOp({
          id: 'op-delete-01',
          targetId: 'app-010',
          type: OP_TYPES.DELETE,
          timestamp: 1000,
          payload: { originalRecord: record },
        });
        const approveOp = makeOp({
          id: 'op-approve-01',
          targetId: 'app-010',
          type: OP_TYPES.APPROVE,
          timestamp: 2000,
          payload: { toStatus: '已批准', by: '张经理', comment: '紧急备件', approvedQty: '2' },
        });

        const remoteRecords = [makeApplication({ id: 'app-010', status: '待审批' })];
        const conflicts = detectConflicts([deleteOp, approveOp], baseline, remoteRecords);

        expect(conflicts.length).toBe(1);
        expect(conflicts[0].type).toBe(CONFLICT_TYPES.DELETE_THEN_APPROVE);
        expect(conflicts[0].severity).toBe('error');
        expect(conflicts[0].approveType).toBe(OP_TYPES.APPROVE);
      });

      it('删除后驳回也应检测为同类冲突', () => {
        const record = makeApplication({ id: 'app-011' });
        const baseline = makeBaseline([record]);

        const deleteOp = makeOp({
          targetId: 'app-011',
          type: OP_TYPES.DELETE,
          timestamp: 1000,
          payload: { originalRecord: record },
        });
        const rejectOp = makeOp({
          targetId: 'app-011',
          type: OP_TYPES.REJECT,
          timestamp: 2000,
          payload: { toStatus: '已驳回', by: '王主管', comment: '规格不符' },
        });

        const remoteRecords = [makeApplication({ id: 'app-011' })];
        const conflicts = detectConflicts([deleteOp, rejectOp], baseline, remoteRecords);

        expect(conflicts[0].type).toBe(CONFLICT_TYPES.DELETE_THEN_APPROVE);
        expect(conflicts[0].approveType).toBe(OP_TYPES.REJECT);
      });

      it('应为不可自动解决且无推荐策略', () => {
        const record = makeApplication({ id: 'app-012' });
        const baseline = makeBaseline([record]);

        const deleteOp = makeOp({
          targetId: 'app-012',
          type: OP_TYPES.DELETE,
          timestamp: 1000,
          payload: { originalRecord: record },
        });
        const approveOp = makeOp({
          targetId: 'app-012',
          type: OP_TYPES.APPROVE,
          timestamp: 2000,
          payload: { toStatus: '已批准', by: '审批员' },
        });

        const remoteRecords = [makeApplication({ id: 'app-012' })];
        const conflicts = detectConflicts([deleteOp, approveOp], baseline, remoteRecords);

        expect(conflicts[0].autoResolvable).toBe(false);
        expect(conflicts[0].recommendedStrategy).toBeNull();
        expect(conflicts[0].options.length).toBe(2);
      });

      it('审批在删除之前不应触发该冲突', () => {
        const record = makeApplication({ id: 'app-013' });
        const baseline = makeBaseline([record]);

        const approveOp = makeOp({
          targetId: 'app-013',
          type: OP_TYPES.APPROVE,
          timestamp: 1000,
          payload: { toStatus: '已批准' },
        });
        const deleteOp = makeOp({
          targetId: 'app-013',
          type: OP_TYPES.DELETE,
          timestamp: 2000,
          payload: { originalRecord: record },
        });

        const remoteRecords = [makeApplication({ id: 'app-013' })];
        const conflicts = detectConflicts([approveOp, deleteOp], baseline, remoteRecords);

        const deleteThenApprove = conflicts.filter(
          (c) => c.type === CONFLICT_TYPES.DELETE_THEN_APPROVE
        );
        expect(deleteThenApprove.length).toBe(0);
      });

      it('应在 options 中提供 KEEP_LOCAL 和 KEEP_REMOTE 两种策略选项', () => {
        const record = makeApplication({ id: 'app-014' });
        const baseline = makeBaseline([record]);

        const deleteOp = makeOp({
          targetId: 'app-014',
          type: OP_TYPES.DELETE,
          timestamp: 1000,
          payload: { originalRecord: record },
        });
        const approveOp = makeOp({
          targetId: 'app-014',
          type: OP_TYPES.APPROVE,
          timestamp: 2000,
          payload: { toStatus: '已批准' },
        });

        const remoteRecords = [makeApplication({ id: 'app-014' })];
        const conflicts = detectConflicts([deleteOp, approveOp], baseline, remoteRecords);
        const strategies = conflicts[0].options.map((o) => o.strategy);

        expect(strategies).toContain(RESOLUTION_STRATEGIES.KEEP_LOCAL);
        expect(strategies).toContain(RESOLUTION_STRATEGIES.KEEP_REMOTE);
      });
    });

    describe('远端已删除 (REMOTE_DELETED)', () => {
      it('应检测到本地有修改但远端已删除的冲突', () => {
        const record = makeApplication({ id: 'app-020', status: '待审批' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-020',
            type: OP_TYPES.UPDATE,
            timestamp: 1000,
            payload: { qty: '5', reason: '数量调整' },
          }),
        ];

        const remoteRecords = [];
        const conflicts = detectConflicts(ops, baseline, remoteRecords);

        expect(conflicts.length).toBe(1);
        expect(conflicts[0].type).toBe(CONFLICT_TYPES.REMOTE_DELETED);
        expect(conflicts[0].severity).toBe('error');
        expect(conflicts[0].targetId).toBe('app-020');
      });

      it('应为不可自动解决且无推荐策略', () => {
        const record = makeApplication({ id: 'app-021' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-021',
            type: OP_TYPES.UPDATE,
            payload: { qty: '3' },
          }),
        ];

        const conflicts = detectConflicts(ops, baseline, []);

        expect(conflicts[0].autoResolvable).toBe(false);
        expect(conflicts[0].recommendedStrategy).toBeNull();
      });

      it('baseline 中不存在的记录不应触发远端已删除冲突', () => {
        const baseline = {};
        const ops = [
          makeOp({
            targetId: 'app-022',
            type: OP_TYPES.UPDATE,
            payload: { qty: '1' },
          }),
        ];

        const conflicts = detectConflicts(ops, baseline, []);
        const remoteDeleted = conflicts.filter((c) => c.type === CONFLICT_TYPES.REMOTE_DELETED);
        expect(remoteDeleted.length).toBe(0);
      });

      it('本地是删除操作时不应触发远端已删除冲突', () => {
        const record = makeApplication({ id: 'app-023' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-023',
            type: OP_TYPES.DELETE,
            payload: { originalRecord: record },
          }),
        ];

        const conflicts = detectConflicts(ops, baseline, []);
        const remoteDeleted = conflicts.filter((c) => c.type === CONFLICT_TYPES.REMOTE_DELETED);
        expect(remoteDeleted.length).toBe(0);
      });

      it('affectedOps 应包含所有相关操作', () => {
        const record = makeApplication({ id: 'app-024' });
        const baseline = makeBaseline([record]);

        const op1 = makeOp({
          id: 'op-u1',
          targetId: 'app-024',
          type: OP_TYPES.UPDATE,
          timestamp: 1000,
          payload: { qty: '3' },
        });
        const op2 = makeOp({
          id: 'op-u2',
          targetId: 'app-024',
          type: OP_TYPES.UPDATE,
          timestamp: 2000,
          payload: { reason: '新原因' },
        });

        const conflicts = detectConflicts([op1, op2], baseline, []);

        expect(conflicts[0].affectedOps).toEqual([op1.id, op2.id]);
      });
    });

    describe('远端已修改 (REMOTE_MODIFIED)', () => {
      it('当本地和远端都修改了状态时应检测到冲突', () => {
        const record = makeApplication({ id: 'app-030', status: '待审批' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-030',
            type: OP_TYPES.APPROVE,
            payload: { toStatus: '已批准', by: '本地审批' },
          }),
        ];

        const remoteRecords = [makeApplication({ id: 'app-030', status: '已驳回' })];
        const conflicts = detectConflicts(ops, baseline, remoteRecords);

        const remoteModified = conflicts.filter(
          (c) => c.type === CONFLICT_TYPES.REMOTE_MODIFIED
        );
        expect(remoteModified.length).toBe(1);
        expect(remoteModified[0].severity).toBe('warning');
        expect(remoteModified[0].baselineStatus).toBe('待审批');
        expect(remoteModified[0].remoteStatus).toBe('已驳回');
        expect(remoteModified[0].localStatus).toBe('已批准');
      });

      it('推荐策略应为 KEEP_REMOTE 且可自动解决', () => {
        const record = makeApplication({ id: 'app-031', status: '待审批' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-031',
            type: OP_TYPES.APPROVE,
            payload: { toStatus: '已批准' },
          }),
        ];

        const remoteRecords = [makeApplication({ id: 'app-031', status: '已驳回' })];
        const conflicts = detectConflicts(ops, baseline, remoteRecords);
        const remoteModified = conflicts.find(
          (c) => c.type === CONFLICT_TYPES.REMOTE_MODIFIED
        );

        expect(remoteModified.autoResolvable).toBe(true);
        expect(remoteModified.recommendedStrategy).toBe(RESOLUTION_STRATEGIES.KEEP_REMOTE);
      });

      it('本地和远端状态相同则不应触发冲突', () => {
        const record = makeApplication({ id: 'app-032', status: '待审批' });
        const baseline = makeBaseline([record]);

        const ops = [
          makeOp({
            targetId: 'app-032',
            type: OP_TYPES.APPROVE,
            payload: { toStatus: '已批准' },
          }),
        ];

        const remoteRecords = [makeApplication({ id: 'app-032', status: '已批准' })];
        const conflicts = detectConflicts(ops, baseline, remoteRecords);
        const remoteModified = conflicts.filter(
          (c) => c.type === CONFLICT_TYPES.REMOTE_MODIFIED
        );

        expect(remoteModified.length).toBe(0);
      });
    });
  });

  describe('autoResolveConflict - 自动解决冲突', () => {
    it('可自动解决的冲突应返回 resolved=true 并标记解决结果', () => {
      const conflict = {
        id: 'conflict-test-001',
        type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
        targetId: 'app-100',
        autoResolvable: true,
        recommendedStrategy: RESOLUTION_STRATEGIES.KEEP_LOCAL,
        resolutionReason: '测试自动解决',
        resolved: false,
        resolution: null,
      };

      const result = autoResolveConflict(conflict);

      expect(result.resolved).toBe(true);
      expect(result.conflict.resolved).toBe(true);
      expect(result.conflict.resolution.strategy).toBe(RESOLUTION_STRATEGIES.KEEP_LOCAL);
      expect(result.conflict.resolution.by).toBe('system');
      expect(result.conflict.resolution.note).toBe('测试自动解决');
      expect(result.conflict.resolution.resolvedAt).toBeDefined();
    });

    it('不可自动解决的冲突应返回 resolved=false', () => {
      const conflict = {
        id: 'conflict-test-002',
        type: CONFLICT_TYPES.DELETE_THEN_APPROVE,
        autoResolvable: false,
        recommendedStrategy: null,
        resolved: false,
        resolution: null,
      };

      const result = autoResolveConflict(conflict);

      expect(result.resolved).toBe(false);
      expect(result.conflict.resolved).toBe(false);
      expect(result.conflict.resolution).toBeNull();
    });

    it('没有推荐策略的冲突应返回 resolved=false', () => {
      const conflict = {
        id: 'conflict-test-003',
        type: CONFLICT_TYPES.REMOTE_DELETED,
        autoResolvable: true,
        recommendedStrategy: null,
        resolved: false,
        resolution: null,
      };

      const result = autoResolveConflict(conflict);

      expect(result.resolved).toBe(false);
    });

    it('不会修改原始冲突对象（返回深拷贝）', () => {
      const conflict = {
        id: 'conflict-test-004',
        type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
        autoResolvable: true,
        recommendedStrategy: RESOLUTION_STRATEGIES.KEEP_LOCAL,
        resolved: false,
        resolution: null,
      };

      const result = autoResolveConflict(conflict);

      expect(conflict.resolved).toBe(false);
      expect(result.conflict).not.toBe(conflict);
    });
  });

  describe('applyConflictResolution - 应用冲突解决方案', () => {
    describe('MULTIPLE_STATUS_CHANGES + KEEP_LOCAL', () => {
      it('应保留最后一次本地状态并更新记录', () => {
        const record = makeApplication({ id: 'app-200', status: '待审批' });
        const conflict = {
          id: 'conflict-200',
          type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
          targetId: 'app-200',
          localFinalState: {
            status: '已发放',
            approvedQty: '3',
            comment: '最终审批',
          },
          affectedOps: ['op-1', 'op-2', 'op-3'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          [record]
        );

        expect(result.applied).toBe(true);
        expect(result.records.length).toBe(1);
        expect(result.records[0].status).toBe('已发放');
        expect(result.records[0].approvedQty).toBe('3');
      });

      it('应在 timeline 中添加同步合并记录', () => {
        const record = makeApplication({ id: 'app-201' });
        const conflict = {
          id: 'conflict-201',
          type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
          targetId: 'app-201',
          localFinalState: { status: '已批准', approvedQty: '2' },
          affectedOps: ['op-a', 'op-b'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          [record]
        );
        const timeline = result.records[0].timeline;
        const mergeEntry = timeline.find((t) => t.action === 'sync-merge');

        expect(mergeEntry).toBeDefined();
        expect(mergeEntry.status).toBe('已批准');
        expect(mergeEntry.by).toBe('同步合并');
      });

      it('应返回受影响的操作 ID 列表以便从队列移除', () => {
        const record = makeApplication({ id: 'app-202' });
        const affectedOps = ['op-x', 'op-y', 'op-z'];
        const conflict = {
          id: 'conflict-202',
          type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
          targetId: 'app-202',
          localFinalState: { status: '已驳回' },
          affectedOps,
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          [record]
        );

        expect(result.opsToRemove).toEqual(affectedOps);
        expect(result.note).toContain('已保留最后一次本地状态');
      });

      it('不会修改传入的原始记录数组', () => {
        const record = makeApplication({ id: 'app-203', status: '待审批' });
        const originalRecords = [record];
        const conflict = {
          id: 'conflict-203',
          type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
          targetId: 'app-203',
          localFinalState: { status: '已批准' },
          affectedOps: ['op-1'],
        };

        applyConflictResolution(conflict, RESOLUTION_STRATEGIES.KEEP_LOCAL, originalRecords);

        expect(originalRecords[0].status).toBe('待审批');
      });
    });

    describe('DELETE_THEN_APPROVE', () => {
      it('KEEP_LOCAL 策略应删除记录（保留删除）', () => {
        const record = makeApplication({ id: 'app-210', status: '待审批' });
        const conflict = {
          id: 'conflict-210',
          type: CONFLICT_TYPES.DELETE_THEN_APPROVE,
          targetId: 'app-210',
          affectedOps: ['op-del', 'op-approve'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          [record]
        );

        expect(result.applied).toBe(true);
        expect(result.records.length).toBe(0);
        expect(result.opsToRemove).toEqual(['op-del', 'op-approve']);
        expect(result.note).toContain('删除');
      });

      it('KEEP_REMOTE 策略应恢复记录并设置审批状态（记录存在时）', () => {
        const record = makeApplication({ id: 'app-211', status: '待审批' });
        const conflict = {
          id: 'conflict-211',
          type: CONFLICT_TYPES.DELETE_THEN_APPROVE,
          targetId: 'app-211',
          approveType: OP_TYPES.APPROVE,
          approveData: {
            toStatus: '已批准',
            by: '李主管',
            comment: '同意申请',
            approvedQty: '5',
          },
          affectedOps: ['op-del', 'op-approve'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_REMOTE,
          [record]
        );

        expect(result.records.length).toBe(1);
        expect(result.records[0].status).toBe('已批准');
        expect(result.records[0].approvedQty).toBe('5');
        expect(result.records[0]._wasRestored).toBe(true);
      });

      it('KEEP_REMOTE 策略应从 deletedRecord 恢复记录（记录不存在时）', () => {
        const deletedRecord = makeApplication({
          id: 'app-212',
          status: '待审批',
          qty: '3',
          partName: '测试备件',
        });
        const conflict = {
          id: 'conflict-212',
          type: CONFLICT_TYPES.DELETE_THEN_APPROVE,
          targetId: 'app-212',
          approveType: OP_TYPES.REJECT,
          approveData: {
            toStatus: '已驳回',
            by: '王经理',
            comment: '驳回原因',
          },
          deletedRecord,
          affectedOps: ['op-del', 'op-reject'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_REMOTE,
          []
        );

        expect(result.records.length).toBe(1);
        expect(result.records[0].id).toBe('app-212');
        expect(result.records[0].status).toBe('已驳回');
        expect(result.records[0]._wasRestored).toBe(true);
        expect(result.records[0].partName).toBe('测试备件');
      });

      it('KEEP_REMOTE 恢复记录时应添加 sync-restore 时间线记录', () => {
        const record = makeApplication({ id: 'app-213' });
        const conflict = {
          id: 'conflict-213',
          type: CONFLICT_TYPES.DELETE_THEN_APPROVE,
          targetId: 'app-213',
          approveType: OP_TYPES.APPROVE,
          approveData: { toStatus: '已批准', by: '审批员', comment: '通过' },
          affectedOps: ['op-del', 'op-approve'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_REMOTE,
          [record]
        );
        const timeline = result.records[0].timeline;
        const restoreEntry = timeline.find((t) => t.action === 'sync-restore');

        expect(restoreEntry).toBeDefined();
        expect(restoreEntry.by).toBe('审批员');
        expect(restoreEntry.comment).toBe('通过');
      });
    });

    describe('REMOTE_DELETED', () => {
      it('KEEP_REMOTE 策略应删除本地记录（接受远端删除）', () => {
        const record = makeApplication({ id: 'app-220', status: '待审批' });
        const conflict = {
          id: 'conflict-220',
          type: CONFLICT_TYPES.REMOTE_DELETED,
          targetId: 'app-220',
          affectedOps: ['op-update-1'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_REMOTE,
          [record]
        );

        expect(result.records.length).toBe(0);
        expect(result.opsToRemove).toEqual(['op-update-1']);
        expect(result.note).toContain('删除');
      });

      it('KEEP_LOCAL 策略应根据 baseline 重新创建记录', () => {
        const baselineRecord = makeApplication({
          id: 'app-221',
          status: '待审批',
          partName: '重建测试备件',
          qty: '4',
        });
        const conflict = {
          id: 'conflict-221',
          type: CONFLICT_TYPES.REMOTE_DELETED,
          targetId: 'app-221',
          baselineRecord,
          affectedOps: ['op-modify-1'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          []
        );

        expect(result.records.length).toBe(1);
        expect(result.records[0].id).toBe('app-221');
        expect(result.records[0].partName).toBe('重建测试备件');
        expect(result.records[0]._wasRecreated).toBe(true);
      });

      it('KEEP_LOCAL 重新创建时应添加 sync-recreate 时间线记录', () => {
        const baselineRecord = makeApplication({ id: 'app-222' });
        const conflict = {
          id: 'conflict-222',
          type: CONFLICT_TYPES.REMOTE_DELETED,
          targetId: 'app-222',
          baselineRecord,
          affectedOps: ['op-mod'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          []
        );
        const timeline = result.records[0].timeline;
        const recreateEntry = timeline.find((t) => t.action === 'sync-recreate');

        expect(recreateEntry).toBeDefined();
        expect(recreateEntry.by).toBe('同步恢复');
      });
    });

    describe('REMOTE_MODIFIED', () => {
      it('KEEP_REMOTE 策略应采用服务端状态', () => {
        const record = makeApplication({ id: 'app-230', status: '待审批' });
        const remoteRecord = makeApplication({
          id: 'app-230',
          status: '已驳回',
          timeline: [
            { status: '待审批', at: '2026-06-01', by: '提交人', action: 'create' },
            { status: '已驳回', at: '2026-06-02', by: '远端审批', action: 'reject', comment: '规格不对' },
          ],
        });
        const conflict = {
          id: 'conflict-230',
          type: CONFLICT_TYPES.REMOTE_MODIFIED,
          targetId: 'app-230',
          remoteStatus: '已驳回',
          remoteRecord,
          affectedOps: ['op-local-approve'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_REMOTE,
          [record]
        );

        expect(result.records[0].status).toBe('已驳回');
        expect(result.opsToRemove).toEqual(['op-local-approve']);
        expect(result.note).toContain('服务端状态');
      });

      it('KEEP_LOCAL 策略应保留本地状态', () => {
        const record = makeApplication({ id: 'app-231', status: '待审批' });
        const conflict = {
          id: 'conflict-231',
          type: CONFLICT_TYPES.REMOTE_MODIFIED,
          targetId: 'app-231',
          localStatus: '已批准',
          remoteStatus: '已驳回',
          affectedOps: ['op-local-approve'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          [record]
        );

        expect(result.opsToRemove).toEqual(['op-local-approve']);
        expect(result.note).toContain('本地状态');
      });
    });

    describe('未知冲突类型', () => {
      it('应返回 applied=false', () => {
        const conflict = {
          id: 'conflict-unknown',
          type: 'unknown_type',
          targetId: 'app-999',
          affectedOps: ['op-1'],
        };

        const result = applyConflictResolution(
          conflict,
          RESOLUTION_STRATEGIES.KEEP_LOCAL,
          [makeApplication()]
        );

        expect(result.applied).toBe(false);
        expect(result.note).toBe('未知冲突类型');
      });
    });
  });

  describe('端到端：检测 → 自动解决 → 应用', () => {
    it('多次状态变更：检测冲突 → 自动解决 → 应用后记录状态为最后一次本地状态', () => {
      const record = makeApplication({ id: 'app-e2e-001', status: '待审批', approvedQty: '1' });
      const baseline = makeBaseline([record]);

      const ops = [
        makeOp({
          id: 'op-approve',
          targetId: 'app-e2e-001',
          type: OP_TYPES.APPROVE,
          timestamp: 1000,
          payload: { fromStatus: '待审批', toStatus: '已批准', approvedQty: '3', by: '审批A' },
        }),
        makeOp({
          id: 'op-reject',
          targetId: 'app-e2e-001',
          type: OP_TYPES.REJECT,
          timestamp: 2000,
          payload: { fromStatus: '已批准', toStatus: '已驳回', by: '终审B', comment: '数量过大' },
        }),
      ];

      const remoteRecords = [makeApplication({ id: 'app-e2e-001', status: '待审批' })];
      const conflicts = detectConflicts(ops, baseline, remoteRecords);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe(CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES);
      expect(conflicts[0].localFinalState.status).toBe('已驳回');

      const autoResult = autoResolveConflict(conflicts[0]);
      expect(autoResult.resolved).toBe(true);
      expect(autoResult.conflict.resolution.strategy).toBe(RESOLUTION_STRATEGIES.KEEP_LOCAL);

      const applyResult = applyConflictResolution(
        autoResult.conflict,
        autoResult.conflict.resolution.strategy,
        [record]
      );

      expect(applyResult.applied).toBe(true);
      expect(applyResult.records[0].status).toBe('已驳回');
      expect(applyResult.records[0].approvedQty).toBe('1');
      expect(applyResult.opsToRemove).toEqual(['op-approve', 'op-reject']);

      const timeline = applyResult.records[0].timeline;
      const mergeEntry = timeline.find((t) => t.action === 'sync-merge');
      expect(mergeEntry).toBeDefined();
      expect(mergeEntry.status).toBe('已驳回');
    });

    it('删除后审批：检测冲突 → 不可自动解决 → 手动选择策略应用', () => {
      const record = makeApplication({ id: 'app-e2e-002', status: '待审批' });
      const baseline = makeBaseline([record]);

      const deleteOp = makeOp({
        id: 'op-del',
        targetId: 'app-e2e-002',
        type: OP_TYPES.DELETE,
        timestamp: 1000,
        payload: { originalRecord: record },
      });
      const approveOp = makeOp({
        id: 'op-approve',
        targetId: 'app-e2e-002',
        type: OP_TYPES.APPROVE,
        timestamp: 2000,
        payload: { toStatus: '已批准', by: '张经理', approvedQty: '3' },
      });

      const remoteRecords = [makeApplication({ id: 'app-e2e-002', status: '待审批' })];
      const conflicts = detectConflicts([deleteOp, approveOp], baseline, remoteRecords);

      expect(conflicts[0].type).toBe(CONFLICT_TYPES.DELETE_THEN_APPROVE);
      expect(conflicts[0].autoResolvable).toBe(false);

      const autoResult = autoResolveConflict(conflicts[0]);
      expect(autoResult.resolved).toBe(false);

      const applyResult = applyConflictResolution(
        conflicts[0],
        RESOLUTION_STRATEGIES.KEEP_REMOTE,
        []
      );

      expect(applyResult.applied).toBe(true);
      expect(applyResult.records.length).toBe(1);
      expect(applyResult.records[0].status).toBe('已批准');
      expect(applyResult.records[0]._wasRestored).toBe(true);
      expect(applyResult.opsToRemove).toEqual(['op-del', 'op-approve']);
    });

    it('远端已删除：检测冲突 → 不可自动解决 → 选择 KEEP_LOCAL 重新创建', () => {
      const record = makeApplication({
        id: 'app-e2e-003',
        status: '待审批',
        partName: '曲轴瓦',
        qty: '2',
      });
      const baseline = makeBaseline([record]);

      const ops = [
        makeOp({
          id: 'op-mod',
          targetId: 'app-e2e-003',
          type: OP_TYPES.UPDATE,
          payload: { qty: '5', reason: '增加数量' },
        }),
      ];

      const conflicts = detectConflicts(ops, baseline, []);

      expect(conflicts[0].type).toBe(CONFLICT_TYPES.REMOTE_DELETED);
      expect(conflicts[0].autoResolvable).toBe(false);

      const applyResult = applyConflictResolution(
        conflicts[0],
        RESOLUTION_STRATEGIES.KEEP_LOCAL,
        []
      );

      expect(applyResult.applied).toBe(true);
      expect(applyResult.records.length).toBe(1);
      expect(applyResult.records[0].id).toBe('app-e2e-003');
      expect(applyResult.records[0]._wasRecreated).toBe(true);
      expect(applyResult.opsToRemove).toEqual(['op-mod']);
    });
  });

  describe('localStorage 队列与存储标记', () => {
    describe('同步队列基本操作', () => {
      it('enqueueOperation 应将操作加入 localStorage 队列并标记为未同步', () => {
        const op = enqueueOperation({
          type: OP_TYPES.CREATE,
          targetId: 'app-queue-001',
          objectType: OBJECT_TYPES.APPLICATION,
          payload: { record: makeApplication({ id: 'app-queue-001' }) },
        });

        expect(op.id).toBeDefined();
        expect(op.synced).toBe(false);
        expect(op.syncAttempts).toBe(0);

        const queue = loadSyncQueue();
        expect(queue.length).toBe(1);
        expect(queue[0].id).toBe(op.id);
        expect(queue[0].synced).toBe(false);
        expect(queue[0].type).toBe(OP_TYPES.CREATE);
      });

      it('getPendingOperations 应只返回 synced=false 的操作', () => {
        const op1 = enqueueOperation({ type: OP_TYPES.CREATE, targetId: 'app-p1' });
        const op2 = enqueueOperation({ type: OP_TYPES.UPDATE, targetId: 'app-p2' });

        const queue = loadSyncQueue();
        queue[0].synced = true;
        saveSyncQueue(queue);

        const pending = getPendingOperations();
        expect(pending.length).toBe(1);
        expect(pending[0].id).toBe(op2.id);
        expect(pending[0].synced).toBe(false);
      });

      it('getCompletedOperations 应只返回 synced=true 的操作', () => {
        enqueueOperation({ type: OP_TYPES.CREATE, targetId: 'app-c1' });
        enqueueOperation({ type: OP_TYPES.DELETE, targetId: 'app-c2' });

        const queue = loadSyncQueue();
        queue[1].synced = true;
        saveSyncQueue(queue);

        const completed = getCompletedOperations();
        expect(completed.length).toBe(1);
        expect(completed[0].type).toBe(OP_TYPES.DELETE);
      });

      it('removeFromQueue 应从 localStorage 队列中移除指定操作', () => {
        const op1 = enqueueOperation({ type: OP_TYPES.CREATE, targetId: 'app-r1' });
        const op2 = enqueueOperation({ type: OP_TYPES.UPDATE, targetId: 'app-r2' });

        expect(loadSyncQueue().length).toBe(2);

        removeFromQueue(op1.id);

        const queue = loadSyncQueue();
        expect(queue.length).toBe(1);
        expect(queue[0].id).toBe(op2.id);
      });

      it('clearQueue 应清空 localStorage 中的同步队列', () => {
        enqueueOperation({ type: OP_TYPES.CREATE, targetId: 'app-cl1' });
        enqueueOperation({ type: OP_TYPES.APPROVE, targetId: 'app-cl2' });

        expect(loadSyncQueue().length).toBe(2);

        clearQueue();

        expect(loadSyncQueue().length).toBe(0);
        expect(getPendingOperations().length).toBe(0);
      });

      it('getPendingOperationsByType 应按对象类型分组待同步操作', () => {
        enqueueOperation({ type: OP_TYPES.CREATE, targetId: 'app-g1', objectType: OBJECT_TYPES.APPLICATION });
        enqueueOperation({ type: OP_TYPES.UPDATE, targetId: 'inv-g1', objectType: OBJECT_TYPES.INVENTORY });
        enqueueOperation({ type: OP_TYPES.CREATE, targetId: 'app-g2', objectType: OBJECT_TYPES.APPLICATION });

        const grouped = getPendingOperationsByType();

        expect(grouped[OBJECT_TYPES.APPLICATION].length).toBe(2);
        expect(grouped[OBJECT_TYPES.INVENTORY].length).toBe(1);
        expect(grouped[OBJECT_TYPES.PURCHASE].length).toBe(0);
      });
    });

    describe('冲突存储 (loadConflicts / saveConflicts)', () => {
      it('saveConflicts 应将冲突保存到 localStorage', () => {
        const conflict = {
          id: 'conflict-storage-001',
          type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
          targetId: 'app-s1',
          resolved: false,
        };

        saveConflicts([conflict]);

        const loaded = loadConflicts();
        expect(loaded.length).toBe(1);
        expect(loaded[0].id).toBe('conflict-storage-001');
        expect(loaded[0].type).toBe(CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES);
      });

      it('loadConflicts 在无数据时应返回空数组', () => {
        const loaded = loadConflicts();
        expect(Array.isArray(loaded)).toBe(true);
        expect(loaded.length).toBe(0);
      });

      it('冲突解决后应更新 resolved 标记并持久化', () => {
        const conflict = {
          id: 'conflict-resolve-001',
          type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
          targetId: 'app-s2',
          autoResolvable: true,
          recommendedStrategy: RESOLUTION_STRATEGIES.KEEP_LOCAL,
          resolved: false,
          resolution: null,
        };

        saveConflicts([conflict]);

        const autoResult = autoResolveConflict(conflict);
        const conflicts = loadConflicts();
        conflicts[0] = autoResult.conflict;
        saveConflicts(conflicts);

        const reloaded = loadConflicts();
        expect(reloaded[0].resolved).toBe(true);
        expect(reloaded[0].resolution.strategy).toBe(RESOLUTION_STRATEGIES.KEEP_LOCAL);
        expect(reloaded[0].resolution.by).toBe('system');
      });
    });

    describe('baseline 存储', () => {
      it('takeBaseline 应将当前记录快照保存到 localStorage', () => {
        const records = [
          makeApplication({ id: 'app-base-001', status: '待审批' }),
          makeApplication({ id: 'app-base-002', status: '已批准' }),
        ];

        const baseline = takeBaseline(records);

        expect(baseline['app-base-001']).toBeDefined();
        expect(baseline['app-base-002'].status).toBe('已批准');

        const stored = loadBaseline();
        expect(stored['app-base-001'].status).toBe('待审批');
        expect(stored['app-base-002'].partName).toBe('海水泵密封圈');
      });

      it('loadBaseline 在无数据时应返回空对象', () => {
        const baseline = loadBaseline();
        expect(typeof baseline).toBe('object');
        expect(Object.keys(baseline).length).toBe(0);
      });
    });

    describe('clearAllSyncData', () => {
      it('应清除所有同步相关的 localStorage 数据', () => {
        enqueueOperation({ type: OP_TYPES.CREATE, targetId: 'app-clear-1' });
        saveConflicts([{ id: 'c1', type: CONFLICT_TYPES.REMOTE_DELETED, targetId: 'x' }]);
        saveBaseline({ 'app-x': { id: 'app-x' } });

        expect(loadSyncQueue().length).toBeGreaterThan(0);
        expect(loadConflicts().length).toBeGreaterThan(0);
        expect(Object.keys(loadBaseline()).length).toBeGreaterThan(0);

        clearAllSyncData();

        expect(loadSyncQueue().length).toBe(0);
        expect(loadConflicts().length).toBe(0);
        expect(Object.keys(loadBaseline()).length).toBe(0);
      });
    });
  });

  describe('冲突与队列集成：检测 → 解决 → 队列标记', () => {
    it('MULTIPLE_STATUS_CHANGES 冲突解决后应标记所有关联操作为冲突移除', () => {
      const record = makeApplication({ id: 'app-int-001', status: '待审批' });
      takeBaseline([record]);

      const op1 = enqueueOperation({
        type: OP_TYPES.APPROVE,
        targetId: 'app-int-001',
        payload: { fromStatus: '待审批', toStatus: '已批准', approvedQty: '2', by: '审批员A' },
      });
      const op2 = enqueueOperation({
        type: OP_TYPES.REJECT,
        targetId: 'app-int-001',
        payload: { fromStatus: '已批准', toStatus: '已驳回', by: '审批员B', comment: '数量不对' },
      });

      expect(getPendingOperations().length).toBe(2);

      const baseline = loadBaseline();
      const pendingOps = getPendingOperations();
      const remoteRecords = [makeApplication({ id: 'app-int-001', status: '待审批' })];
      const conflicts = detectConflicts(pendingOps, baseline, remoteRecords);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe(CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES);
      expect(conflicts[0].affectedOps).toContain(op1.id);
      expect(conflicts[0].affectedOps).toContain(op2.id);

      const autoResult = autoResolveConflict(conflicts[0]);
      const applyResult = applyConflictResolution(
        autoResult.conflict,
        autoResult.conflict.resolution.strategy,
        [record]
      );

      const syncedAt = 1700000000000;
      const markedQueue = markQueueOpsRemovedByConflict(applyResult.opsToRemove, syncedAt);

      const remaining = getPendingOperations();
      expect(remaining.length).toBe(0);
      expect(markedQueue.length).toBe(2);
      markedQueue.forEach((op) => {
        expect(op.synced).toBe(true);
        expect(op.removedByConflict).toBe(true);
        expect(op.syncedAt).toBe(syncedAt);
      });
      expect(getCompletedOperations().map((op) => op.id)).toEqual([op1.id, op2.id]);
      expect(applyResult.records[0].status).toBe('已驳回');
    });

    it('DELETE_THEN_APPROVE 冲突选择 KEEP_LOCAL 后应标记删除和审批操作', () => {
      const record = makeApplication({ id: 'app-int-002', status: '待审批' });
      takeBaseline([record]);

      const deleteOp = enqueueOperation({
        type: OP_TYPES.DELETE,
        targetId: 'app-int-002',
        timestamp: 1000,
        payload: { originalRecord: record },
      });
      const approveOp = enqueueOperation({
        type: OP_TYPES.APPROVE,
        targetId: 'app-int-002',
        timestamp: 2000,
        payload: { toStatus: '已批准', by: '张经理', approvedQty: '3' },
      });

      expect(getPendingOperations().length).toBe(2);
      expect(approveOp.timestamp).toBeGreaterThan(deleteOp.timestamp);

      const baseline = loadBaseline();
      const pendingOps = getPendingOperations();
      const remoteRecords = [makeApplication({ id: 'app-int-002', status: '待审批' })];
      const conflicts = detectConflicts(pendingOps, baseline, remoteRecords);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe(CONFLICT_TYPES.DELETE_THEN_APPROVE);

      const applyResult = applyConflictResolution(
        conflicts[0],
        RESOLUTION_STRATEGIES.KEEP_LOCAL,
        [record]
      );

      const syncedAt = 1700000000100;
      const markedQueue = markQueueOpsRemovedByConflict(applyResult.opsToRemove, syncedAt);

      expect(getPendingOperations().length).toBe(0);
      expect(applyResult.records.length).toBe(0);
      expect(applyResult.opsToRemove).toContain(deleteOp.id);
      expect(applyResult.opsToRemove).toContain(approveOp.id);
      expect(markedQueue.length).toBe(2);
      markedQueue.forEach((op) => {
        expect(op.synced).toBe(true);
        expect(op.removedByConflict).toBe(true);
        expect(op.syncedAt).toBe(syncedAt);
      });
    });

    it('REMOTE_DELETED 冲突选择 KEEP_REMOTE 后应标记队列并接受删除', () => {
      const record = makeApplication({ id: 'app-int-003', status: '待审批' });
      takeBaseline([record]);

      const updateOp = enqueueOperation({
        type: OP_TYPES.UPDATE,
        targetId: 'app-int-003',
        payload: { qty: '5', reason: '增加数量' },
      });

      expect(getPendingOperations().length).toBe(1);

      const baseline = loadBaseline();
      const pendingOps = getPendingOperations();
      const conflicts = detectConflicts(pendingOps, baseline, []);

      expect(conflicts[0].type).toBe(CONFLICT_TYPES.REMOTE_DELETED);

      const applyResult = applyConflictResolution(
        conflicts[0],
        RESOLUTION_STRATEGIES.KEEP_REMOTE,
        [record]
      );

      const syncedAt = 1700000000200;
      const markedQueue = markQueueOpsRemovedByConflict(applyResult.opsToRemove, syncedAt);

      expect(getPendingOperations().length).toBe(0);
      expect(applyResult.records.length).toBe(0);
      expect(applyResult.opsToRemove).toContain(updateOp.id);
      expect(markedQueue).toHaveLength(1);
      expect(markedQueue[0]).toMatchObject({
        id: updateOp.id,
        synced: true,
        removedByConflict: true,
        syncedAt,
      });
    });

    it('多次冲突解决后待处理队列应只保留无冲突的操作', () => {
      const record1 = makeApplication({ id: 'app-int-010', status: '待审批' });
      const record2 = makeApplication({ id: 'app-int-011', status: '待审批' });
      takeBaseline([record1, record2]);

      enqueueOperation({
        type: OP_TYPES.APPROVE,
        targetId: 'app-int-010',
        payload: { toStatus: '已批准', by: 'A' },
      });
      enqueueOperation({
        type: OP_TYPES.REJECT,
        targetId: 'app-int-010',
        payload: { toStatus: '已驳回', by: 'B' },
      });
      const normalOp = enqueueOperation({
        type: OP_TYPES.APPROVE,
        targetId: 'app-int-011',
        payload: { toStatus: '已批准', by: 'C' },
      });

      expect(getPendingOperations().length).toBe(3);

      const baseline = loadBaseline();
      const pendingOps = getPendingOperations();
      const remoteRecords = [
        makeApplication({ id: 'app-int-010', status: '待审批' }),
        makeApplication({ id: 'app-int-011', status: '待审批' }),
      ];
      const conflicts = detectConflicts(pendingOps, baseline, remoteRecords);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].targetId).toBe('app-int-010');

      const autoResult = autoResolveConflict(conflicts[0]);
      const applyResult = applyConflictResolution(
        autoResult.conflict,
        autoResult.conflict.resolution.strategy,
        [record1, record2]
      );

      const syncedAt = 1700000000300;
      const markedQueue = markQueueOpsRemovedByConflict(applyResult.opsToRemove, syncedAt);

      const remaining = getPendingOperations();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(normalOp.id);
      expect(remaining[0].targetId).toBe('app-int-011');

      const conflictOps = markedQueue.filter((op) => applyResult.opsToRemove.includes(op.id));
      expect(conflictOps.length).toBe(2);
      conflictOps.forEach((op) => {
        expect(op.synced).toBe(true);
        expect(op.removedByConflict).toBe(true);
        expect(op.syncedAt).toBe(syncedAt);
      });
      const untouchedOp = markedQueue.find((op) => op.id === normalOp.id);
      expect(untouchedOp.synced).toBe(false);
      expect(untouchedOp).not.toHaveProperty('removedByConflict');
    });

    it('冲突记录应持久化到 localStorage 并在页面刷新后可恢复', () => {
      const record = makeApplication({ id: 'app-int-020', status: '待审批' });
      takeBaseline([record]);

      enqueueOperation({
        type: OP_TYPES.APPROVE,
        targetId: 'app-int-020',
        payload: { toStatus: '已批准', by: '审批员' },
      });
      enqueueOperation({
        type: OP_TYPES.DISPATCH,
        targetId: 'app-int-020',
        payload: { toStatus: '已发放', by: '仓库' },
      });

      const baseline = loadBaseline();
      const pendingOps = getPendingOperations();
      const remoteRecords = [makeApplication({ id: 'app-int-020', status: '待审批' })];
      const conflicts = detectConflicts(pendingOps, baseline, remoteRecords);

      saveConflicts(conflicts);

      const reloadedConflicts = loadConflicts();
      expect(reloadedConflicts.length).toBe(1);
      expect(reloadedConflicts[0].type).toBe(CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES);
      expect(reloadedConflicts[0].resolved).toBe(false);
      expect(reloadedConflicts[0].localOperations.length).toBe(2);
    });

    it('已解决的冲突应在 localStorage 中标记为 resolved=true', () => {
      const record = makeApplication({ id: 'app-int-030', status: '待审批' });
      takeBaseline([record]);

      enqueueOperation({
        type: OP_TYPES.APPROVE,
        targetId: 'app-int-030',
        payload: { toStatus: '已批准', by: 'A' },
      });
      enqueueOperation({
        type: OP_TYPES.REJECT,
        targetId: 'app-int-030',
        payload: { toStatus: '已驳回', by: 'B' },
      });

      const baseline = loadBaseline();
      const pendingOps = getPendingOperations();
      const remoteRecords = [makeApplication({ id: 'app-int-030', status: '待审批' })];
      let conflicts = detectConflicts(pendingOps, baseline, remoteRecords);

      saveConflicts(conflicts);

      const autoResult = autoResolveConflict(conflicts[0]);
      conflicts = loadConflicts();
      conflicts[0] = autoResult.conflict;
      saveConflicts(conflicts);

      const stored = loadConflicts();
      expect(stored[0].resolved).toBe(true);
      expect(stored[0].resolution).toBeDefined();
      expect(stored[0].resolution.strategy).toBe(RESOLUTION_STRATEGIES.KEEP_LOCAL);
      expect(stored[0].resolution.by).toBe('system');
    });
  });
});
