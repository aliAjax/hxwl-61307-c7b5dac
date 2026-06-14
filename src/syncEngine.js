const SYNC_QUEUE_STORAGE = 'hxwl-61307-sync-queue';
const SYNC_CONFLICTS_STORAGE = 'hxwl-61307-sync-conflicts';
const SYNC_BASELINE_STORAGE = 'hxwl-61307-sync-baseline';
const SYNC_META_STORAGE = 'hxwl-61307-sync-meta';

export const OP_TYPES = {
  CREATE: 'create',
  UPDATE_STATUS: 'update_status',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  DISPATCH: 'dispatch',
};

export const CONFLICT_TYPES = {
  MULTIPLE_STATUS_CHANGES: 'multiple_status_changes',
  DELETE_THEN_APPROVE: 'delete_then_approve',
  DUPLICATE_PART_NAME: 'duplicate_part_name',
  REMOTE_DELETED: 'remote_deleted',
  REMOTE_MODIFIED: 'remote_modified',
};

export const RESOLUTION_STRATEGIES = {
  KEEP_LOCAL: 'keep_local',
  KEEP_REMOTE: 'keep_remote',
  KEEP_BOTH: 'keep_both',
  MERGE: 'merge',
  CUSTOM: 'custom',
};

function uid() {
  return 'op_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
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

export function loadSyncQueue() {
  return safeParse(localStorage.getItem(SYNC_QUEUE_STORAGE), []);
}

export function saveSyncQueue(queue) {
  localStorage.setItem(SYNC_QUEUE_STORAGE, JSON.stringify(queue));
}

export function loadConflicts() {
  return safeParse(localStorage.getItem(SYNC_CONFLICTS_STORAGE), []);
}

export function saveConflicts(conflicts) {
  localStorage.setItem(SYNC_CONFLICTS_STORAGE, JSON.stringify(conflicts));
}

export function loadBaseline() {
  return safeParse(localStorage.getItem(SYNC_BASELINE_STORAGE), {});
}

export function saveBaseline(baseline) {
  localStorage.setItem(SYNC_BASELINE_STORAGE, JSON.stringify(baseline));
}

export function loadSyncMeta() {
  return safeParse(localStorage.getItem(SYNC_META_STORAGE), {
    lastSyncAt: null,
    lastSyncSuccess: true,
    syncCount: 0,
    forcedOffline: false,
  });
}

export function saveSyncMeta(meta) {
  localStorage.setItem(SYNC_META_STORAGE, JSON.stringify(meta));
}

export function enqueueOperation(operation) {
  const queue = loadSyncQueue();
  const op = {
    id: uid(),
    timestamp: Date.now(),
    synced: false,
    syncAttempts: 0,
    error: null,
    ...operation,
  };
  queue.push(op);
  saveSyncQueue(queue);
  return op;
}

export function removeFromQueue(opId) {
  const queue = loadSyncQueue();
  const next = queue.filter((op) => op.id !== opId);
  saveSyncQueue(next);
  return next;
}

export function clearQueue() {
  saveSyncQueue([]);
}

export function getPendingOperations() {
  return loadSyncQueue().filter((op) => !op.synced);
}

export function getCompletedOperations() {
  return loadSyncQueue().filter((op) => op.synced);
}

function getRecordSignature(record) {
  return `${record.ship}|${record.partName}|${record.system}|${record.location}`;
}

export function takeBaseline(currentRecords) {
  const baseline = {};
  currentRecords.forEach((r) => {
    baseline[r.id] = deepClone(r);
  });
  saveBaseline(baseline);
  return baseline;
}

export function detectConflicts(localOps, baseline, remoteRecords) {
  const conflicts = [];
  const remoteMap = {};
  remoteRecords.forEach((r) => {
    remoteMap[r.id] = r;
  });

  const opsByRecord = {};
  localOps.forEach((op) => {
    if (!op.targetId) return;
    if (!opsByRecord[op.targetId]) opsByRecord[op.targetId] = [];
    opsByRecord[op.targetId].push(op);
  });

  Object.entries(opsByRecord).forEach(([recordId, ops]) => {
    const statusOps = ops.filter(
      (o) =>
        o.type === OP_TYPES.UPDATE_STATUS ||
        o.type === OP_TYPES.APPROVE ||
        o.type === OP_TYPES.REJECT ||
        o.type === OP_TYPES.DISPATCH
    );
    if (statusOps.length > 1) {
      const lastOp = statusOps[statusOps.length - 1];
      const firstOp = statusOps[0];
      const baselineRecord = baseline[recordId];
      let originalStatus = baselineRecord?.status || '待审批';
      conflicts.push({
        id: 'conflict_' + uid(),
        type: CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES,
        targetId: recordId,
        severity: 'warning',
        detectedAt: Date.now(),
        resolved: false,
        resolution: null,
        description: `同一条申请在离线期间被多次变更状态（${statusOps.length}次）`,
        localOperations: statusOps.map((o) => ({
          opId: o.id,
          type: o.type,
          fromStatus: o.payload?.fromStatus || originalStatus,
          toStatus: o.payload?.toStatus || o.payload?.status,
          by: o.payload?.by || '操作员',
          at: o.timestamp,
          comment: o.payload?.comment || '',
        })),
        localFinalState: {
          status: lastOp.payload?.toStatus || lastOp.payload?.status,
          approvedQty: lastOp.payload?.approvedQty,
          comment: lastOp.payload?.comment,
        },
        baselineState: baselineRecord
          ? { status: baselineRecord.status, id: baselineRecord.id }
          : null,
        affectedOps: statusOps.map((o) => o.id),
        autoResolvable: true,
        recommendedStrategy: RESOLUTION_STRATEGIES.KEEP_LOCAL,
        resolutionReason: '本地多次变更：推荐保留最后一次本地状态作为最终状态',
      });
      return;
    }

    const deleteOp = ops.find((o) => o.type === OP_TYPES.DELETE);
    const approveOrRejectOp = ops.find(
      (o) => o.type === OP_TYPES.APPROVE || o.type === OP_TYPES.REJECT
    );
    if (deleteOp && approveOrRejectOp && approveOrRejectOp.timestamp > deleteOp.timestamp) {
      const deletedRecord = deleteOp.payload?.originalRecord || baseline[recordId] || null;
      conflicts.push({
        id: 'conflict_' + uid(),
        type: CONFLICT_TYPES.DELETE_THEN_APPROVE,
        targetId: recordId,
        severity: 'error',
        detectedAt: Date.now(),
        resolved: false,
        resolution: null,
        description: '申请记录已被删除，但之后又被执行了审批操作',
        localOperations: [deleteOp, approveOrRejectOp].map((o) => ({
          opId: o.id,
          type: o.type,
          toStatus: o.payload?.toStatus || o.type,
          by: o.payload?.by || '操作员',
          at: o.timestamp,
          comment: o.payload?.comment || '',
        })),
        deleteAt: deleteOp.timestamp,
        approveAt: approveOrRejectOp.timestamp,
        approveType: approveOrRejectOp.type,
        approveData: approveOrRejectOp.payload,
        deletedRecord: deletedRecord ? deepClone(deletedRecord) : null,
        affectedOps: [deleteOp.id, approveOrRejectOp.id],
        autoResolvable: false,
        recommendedStrategy: null,
        options: [
          {
            strategy: RESOLUTION_STRATEGIES.KEEP_LOCAL,
            label: '保留删除（撤销审批）',
            description: '记录保持删除状态，审批操作被忽略',
          },
          {
            strategy: RESOLUTION_STRATEGIES.KEEP_REMOTE,
            label: '保留审批（恢复记录）',
            description: '撤销删除操作，保留审批后的记录状态',
          },
        ],
      });
      return;
    }

    const createOps = ops.filter((o) => o.type === OP_TYPES.CREATE);
    createOps.forEach((createOp) => {
      const payload = createOp.payload?.record || createOp.payload;
      if (!payload) return;
      const localSig = getRecordSignature(payload);
      const dupRemote = remoteRecords.find((r) => {
        if (r.id === payload.id) return false;
        return getRecordSignature(r) === localSig;
      });
      if (dupRemote) {
        conflicts.push({
          id: 'conflict_' + uid(),
          type: CONFLICT_TYPES.DUPLICATE_PART_NAME,
          targetId: payload.id,
          remoteTargetId: dupRemote.id,
          severity: 'warning',
          detectedAt: Date.now(),
          resolved: false,
          resolution: null,
          description: `同名备件"${payload.partName}"在服务端已存在（${payload.ship}/${payload.system}/${payload.location}）`,
          localOperations: [
            {
              opId: createOp.id,
              type: createOp.type,
              at: createOp.timestamp,
              record: payload,
            },
          ],
          localRecord: payload,
          remoteRecord: deepClone(dupRemote),
          affectedOps: [createOp.id],
          autoResolvable: true,
          recommendedStrategy: RESOLUTION_STRATEGIES.KEEP_REMOTE,
          options: [
            {
              strategy: RESOLUTION_STRATEGIES.KEEP_REMOTE,
              label: '使用服务端记录（丢弃本地创建）',
              description: '服务端已有相同备件，本地创建记录将被丢弃',
            },
            {
              strategy: RESOLUTION_STRATEGIES.KEEP_BOTH,
              label: '保留两条记录',
              description: '本地和服务端记录都保留，视为两次独立申请',
            },
            {
              strategy: RESOLUTION_STRATEGIES.MERGE,
              label: '合并数量（取较大值）',
              description: '合并到服务端记录，数量取两者较大值',
            },
          ],
        });
      }
    });

    if (deleteOp && !remoteMap[recordId]) {
      const baselineRecord = baseline[recordId];
      if (baselineRecord) {
        return;
      }
    }

    if (!deleteOp && !createOps.length && baseline[recordId] && !remoteMap[recordId]) {
      const modifyOp = ops[ops.length - 1];
      conflicts.push({
        id: 'conflict_' + uid(),
        type: CONFLICT_TYPES.REMOTE_DELETED,
        targetId: recordId,
        severity: 'error',
        detectedAt: Date.now(),
        resolved: false,
        resolution: null,
        description: '该记录在服务端已被删除，但本地仍对其做了修改',
        localOperations: ops.map((o) => ({
          opId: o.id,
          type: o.type,
          at: o.timestamp,
          payload: o.payload,
        })),
        baselineRecord: deepClone(baseline[recordId]),
        affectedOps: ops.map((o) => o.id),
        autoResolvable: false,
        recommendedStrategy: null,
        options: [
          {
            strategy: RESOLUTION_STRATEGIES.KEEP_REMOTE,
            label: '服务端优先（接受删除）',
            description: '记录保持删除，本地修改全部丢弃',
          },
          {
            strategy: RESOLUTION_STRATEGIES.KEEP_LOCAL,
            label: '本地优先（重新创建）',
            description: '根据本地修改重新创建该记录',
          },
        ],
      });
    }

    if (!createOps.length && !deleteOp && statusOps.length === 1 && remoteMap[recordId]) {
      const baselineStatus = baseline[recordId]?.status;
      const remoteStatus = remoteMap[recordId]?.status;
      const localOp = statusOps[0];
      const localToStatus = localOp.payload?.toStatus || localOp.payload?.status;

      if (baselineStatus && remoteStatus && baselineStatus !== remoteStatus && localToStatus !== remoteStatus) {
        conflicts.push({
          id: 'conflict_' + uid(),
          type: CONFLICT_TYPES.REMOTE_MODIFIED,
          targetId: recordId,
          severity: 'warning',
          detectedAt: Date.now(),
          resolved: false,
          resolution: null,
          description: `离线期间服务端状态也发生了变更（${baselineStatus} → ${remoteStatus}）`,
          localOperations: [
            {
              opId: localOp.id,
              type: localOp.type,
              fromStatus: baselineStatus,
              toStatus: localToStatus,
              at: localOp.timestamp,
              by: localOp.payload?.by,
              comment: localOp.payload?.comment,
            },
          ],
          baselineStatus,
          remoteStatus,
          localStatus: localToStatus,
          remoteRecord: deepClone(remoteMap[recordId]),
          affectedOps: [localOp.id],
          autoResolvable: true,
          recommendedStrategy: RESOLUTION_STRATEGIES.KEEP_REMOTE,
          options: [
            {
              strategy: RESOLUTION_STRATEGIES.KEEP_REMOTE,
              label: '服务端优先（推荐）',
              description: `采用服务端状态：${remoteStatus}`,
            },
            {
              strategy: RESOLUTION_STRATEGIES.KEEP_LOCAL,
              label: '本地优先',
              description: `覆盖为本地状态：${localToStatus}`,
            },
          ],
        });
      }
    }
  });

  return conflicts;
}

export function autoResolveConflict(conflict) {
  if (!conflict.autoResolvable || !conflict.recommendedStrategy) {
    return { resolved: false, conflict };
  }
  const resolved = deepClone(conflict);
  resolved.resolved = true;
  resolved.resolution = {
    strategy: conflict.recommendedStrategy,
    resolvedAt: Date.now(),
    by: 'system',
    note: conflict.resolutionReason || '自动解决',
  };
  return { resolved: true, conflict: resolved };
}

export function applyConflictResolution(conflict, strategy, currentRecords) {
  const result = {
    records: deepClone(currentRecords),
    opsToRemove: [],
    applied: true,
    note: '',
  };

  switch (conflict.type) {
    case CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES: {
      if (strategy === RESOLUTION_STRATEGIES.KEEP_LOCAL) {
        const finalState = conflict.localFinalState;
        result.records = result.records.map((r) => {
          if (r.id !== conflict.targetId) return r;
          const timeline = [...(r.timeline || [])];
          timeline.push({
            status: finalState.status,
            at: new Date().toISOString().slice(0, 10),
            by: '同步合并',
            comment: `离线多次状态变更合并，最终状态：${finalState.status}`,
            action: 'sync-merge',
          });
          return {
            ...r,
            status: finalState.status,
            approvedQty: finalState.approvedQty || r.approvedQty,
            timeline,
          };
        });
        result.opsToRemove = conflict.affectedOps;
        result.note = `已保留最后一次本地状态：${finalState.status}`;
      }
      break;
    }

    case CONFLICT_TYPES.DELETE_THEN_APPROVE: {
      if (strategy === RESOLUTION_STRATEGIES.KEEP_LOCAL) {
        result.records = result.records.filter((r) => r.id !== conflict.targetId);
        result.opsToRemove = conflict.affectedOps;
        result.note = '记录已删除，审批操作已撤销';
      } else if (strategy === RESOLUTION_STRATEGIES.KEEP_REMOTE) {
        const approveData = conflict.approveData || {};
        const newStatus = approveData.toStatus || (conflict.approveType === OP_TYPES.APPROVE ? '已批准' : '已驳回');
        const existingIdx = result.records.findIndex((r) => r.id === conflict.targetId);
        if (existingIdx !== -1) {
          const timeline = [...(result.records[existingIdx].timeline || [])];
          timeline.push({
            status: newStatus,
            at: new Date().toISOString().slice(0, 10),
            by: approveData.by || '操作员',
            comment: approveData.comment || '',
            action: 'sync-restore',
          });
          result.records[existingIdx] = {
            ...result.records[existingIdx],
            status: newStatus,
            approvedQty: approveData.approvedQty || result.records[existingIdx].approvedQty,
            _wasRestored: true,
            timeline,
          };
        } else if (conflict.deletedRecord) {
          const restored = deepClone(conflict.deletedRecord);
          const timeline = [...(restored.timeline || [])];
          timeline.push({
            status: newStatus,
            at: new Date().toISOString().slice(0, 10),
            by: approveData.by || '操作员',
            comment: approveData.comment || '',
            action: 'sync-restore',
          });
          restored.status = newStatus;
          restored.approvedQty = approveData.approvedQty || restored.approvedQty;
          restored._wasRestored = true;
          restored.timeline = timeline;
          result.records.push(restored);
        }
        result.opsToRemove = conflict.affectedOps;
        result.note = '记录已恢复并保留审批结果';
      }
      break;
    }

    case CONFLICT_TYPES.DUPLICATE_PART_NAME: {
      if (strategy === RESOLUTION_STRATEGIES.KEEP_REMOTE) {
        result.records = result.records.filter((r) => r.id !== conflict.targetId);
        result.opsToRemove = conflict.affectedOps;
        result.note = '本地创建记录已丢弃，使用服务端已有记录';
      } else if (strategy === RESOLUTION_STRATEGIES.KEEP_BOTH) {
        result.opsToRemove = conflict.affectedOps;
        result.note = '本地与服务端记录均保留';
      } else if (strategy === RESOLUTION_STRATEGIES.MERGE) {
        const localQty = Number(conflict.localRecord.qty) || 0;
        result.records = result.records.map((r) => {
          if (r.id === conflict.remoteTargetId) {
            const remoteQty = Number(r.qty) || 0;
            return {
              ...r,
              qty: String(Math.max(localQty, remoteQty)),
              _mergedFromDuplicate: conflict.targetId,
            };
          }
          if (r.id === conflict.targetId) {
            return null;
          }
          return r;
        }).filter(Boolean);
        result.opsToRemove = conflict.affectedOps;
        result.note = `已合并数量，采用较大值（原${conflict.remoteRecord.qty} → 新${Math.max(localQty, Number(conflict.remoteRecord.qty))}）`;
      }
      break;
    }

    case CONFLICT_TYPES.REMOTE_DELETED: {
      if (strategy === RESOLUTION_STRATEGIES.KEEP_REMOTE) {
        result.records = result.records.filter((r) => r.id !== conflict.targetId);
        result.opsToRemove = conflict.affectedOps;
        result.note = '记录已根据服务端状态删除';
      } else if (strategy === RESOLUTION_STRATEGIES.KEEP_LOCAL) {
        const existingIdx = result.records.findIndex((r) => r.id === conflict.targetId);
        if (existingIdx === -1 && conflict.baselineRecord) {
          const restored = deepClone(conflict.baselineRecord);
          const timeline = [...(restored.timeline || [])];
          timeline.push({
            status: restored.status,
            at: new Date().toISOString().slice(0, 10),
            by: '同步恢复',
            comment: '根据本地修改重新创建该记录',
            action: 'sync-recreate',
          });
          restored.timeline = timeline;
          restored._wasRecreated = true;
          result.records.push(restored);
        }
        result.opsToRemove = conflict.affectedOps;
        result.note = '记录根据本地修改重新创建';
      }
      break;
    }

    case CONFLICT_TYPES.REMOTE_MODIFIED: {
      if (strategy === RESOLUTION_STRATEGIES.KEEP_REMOTE) {
        result.records = result.records.map((r) => {
          if (r.id !== conflict.targetId) return r;
          const remote = conflict.remoteRecord || {};
          return {
            ...r,
            status: conflict.remoteStatus,
            timeline: remote.timeline || r.timeline,
          };
        });
        result.opsToRemove = conflict.affectedOps;
        result.note = `已采用服务端状态：${conflict.remoteStatus}`;
      } else if (strategy === RESOLUTION_STRATEGIES.KEEP_LOCAL) {
        result.opsToRemove = conflict.affectedOps;
        result.note = `已保留本地状态：${conflict.localStatus}`;
      }
      break;
    }

    default:
      result.applied = false;
      result.note = '未知冲突类型';
  }

  return result;
}

export function generateRemoteSnapshot(currentRecords, baseline) {
  const remote = deepClone(currentRecords);
  const pendingOps = getPendingOperations();

  pendingOps.forEach((op) => {
    switch (op.type) {
      case OP_TYPES.CREATE: {
        const idx = remote.findIndex((r) => r.id === op.targetId);
        if (idx !== -1) remote.splice(idx, 1);
        break;
      }
      case OP_TYPES.UPDATE_STATUS:
      case OP_TYPES.APPROVE:
      case OP_TYPES.REJECT:
      case OP_TYPES.DISPATCH: {
        const target = remote.find((r) => r.id === op.targetId);
        if (target && baseline[op.targetId]) {
          target.status = baseline[op.targetId].status;
          target.timeline = deepClone(baseline[op.targetId].timeline || []);
          if (baseline[op.targetId].approvedQty !== undefined) {
            target.approvedQty = baseline[op.targetId].approvedQty;
          }
        }
        break;
      }
      case OP_TYPES.DELETE: {
        if (baseline[op.targetId]) {
          remote.push(deepClone(baseline[op.targetId]));
        }
        break;
      }
    }
  });

  return remote;
}

export function simulateServerLatency() {
  return new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 600));
}

export function clearAllSyncData() {
  localStorage.removeItem(SYNC_QUEUE_STORAGE);
  localStorage.removeItem(SYNC_CONFLICTS_STORAGE);
  localStorage.removeItem(SYNC_BASELINE_STORAGE);
  localStorage.removeItem(SYNC_META_STORAGE);
}
