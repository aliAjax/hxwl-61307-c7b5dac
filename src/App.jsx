import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Ship, Plus, Search, Trash2, AlertTriangle, ClipboardList, CalendarDays, CheckCircle2, Package, ListTodo, Truck, UserCheck, FileText, Bookmark, ArrowRightLeft, Gavel, CheckCircle, XCircle, MessageSquare, Edit3, Clock, Shield, Lock, ShoppingCart, Factory, ArrowRight, RefreshCw, BarChart3, TrendingUp, PieChart, Zap, Upload, FileSpreadsheet, X, Info, Copy, Download, Wifi, WifiOff, Database, Cloud, CloudOff, AlertOctagon, ChevronDown, ChevronRight, Server, UserX, Layers, Activity, Save, RotateCcw, Hand } from 'lucide-react';
import './App.css';
import {
  OP_TYPES,
  CONFLICT_TYPES,
  RESOLUTION_STRATEGIES,
  loadSyncQueue,
  saveSyncQueue,
  loadConflicts,
  saveConflicts,
  loadBaseline,
  saveBaseline,
  loadSyncMeta,
  saveSyncMeta,
  enqueueOperation,
  removeFromQueue,
  getPendingOperations,
  getCompletedOperations,
  takeBaseline,
  detectConflicts,
  autoResolveConflict,
  applyConflictResolution,
  generateRemoteSnapshot,
  simulateServerLatency,
  clearAllSyncData,
} from './syncEngine';
import {
  AUDIT_EVENT_TYPES,
  AUDIT_EVENT_LABELS,
  CURRENT_DATA_VERSION,
  runMigrations,
  getDataVersion,
  getMigrationLog,
  listBackups,
  restoreBackup,
  logAuditEvent,
  getAuditEventsByTarget,
  queryAuditEvents,
  getAuditStats,
  downloadAuditLogCSV,
  exportAuditLogToCSV,
  setOperator,
} from './auditMigrationEngine';

const appConfig = {
  "id": "hxwl-61307",
  "port": 61307,
  "title": "船舶备件申领",
  "subtitle": "船员备件申请、审批、发放与状态流转",
  "domain": "船舶备件",
  "icon": "Ship",
  "storage": "hxwl-61307-ship-spares",
  "accent": "#0891b2",
  "ships": [
    "远洋一号",
    "海运之星",
    "长江明珠",
    "南海先锋",
    "东方之珠"
  ],
  "statuses": [
    "待审批",
    "已批准",
    "已发放",
    "已驳回"
  ],
  "primaryStatus": "待审批",
  "fields": [
    {
      "key": "ship",
      "label": "所属船舶",
      "type": "select",
      "placeholder": "远洋一号",
      "options": [
        "远洋一号",
        "海运之星",
        "长江明珠",
        "南海先锋",
        "东方之珠"
      ]
    },
    {
      "key": "partName",
      "label": "备件名称",
      "type": "input",
      "placeholder": "海水泵密封圈",
      "options": []
    },
    {
      "key": "system",
      "label": "设备系统",
      "type": "select",
      "placeholder": "机舱",
      "options": [
        "机舱",
        "甲板",
        "电气",
        "消防",
        "导航"
      ]
    },
    {
      "key": "location",
      "label": "船舶位置",
      "type": "input",
      "placeholder": "二副库",
      "options": []
    },
    {
      "key": "qty",
      "label": "需求数量",
      "type": "number",
      "placeholder": "2",
      "options": []
    },
    {
      "key": "urgency",
      "label": "紧急程度",
      "type": "select",
      "placeholder": "高",
      "options": [
        "低",
        "中",
        "高"
      ]
    },
    {
      "key": "reason",
      "label": "申请原因",
      "type": "textarea",
      "placeholder": "巡检发现渗漏，需预防性更换",
      "options": []
    }
  ],
  "seed": [
    {
      "ship": "远洋一号",
      "partName": "海水泵密封圈",
      "system": "机舱",
      "location": "二副库",
      "qty": "2",
      "urgency": "高",
      "reason": "巡检发现渗漏，需预防性更换",
      "status": "待审批"
    },
    {
      "ship": "海运之星",
      "partName": "甲板照明灯泡",
      "system": "电气",
      "location": "甲板库",
      "qty": "12",
      "urgency": "中",
      "reason": "夜航照明备货",
      "status": "已批准"
    },
    {
      "ship": "长江明珠",
      "partName": "消防水带接口",
      "system": "消防",
      "location": "消防站",
      "qty": "4",
      "urgency": "高",
      "reason": "演练后发现老化",
      "status": "已发放"
    },
    {
      "ship": "远洋一号",
      "partName": "主机润滑油滤器",
      "system": "机舱",
      "location": "机舱油库",
      "qty": "3",
      "urgency": "中",
      "reason": "常规保养更换",
      "status": "待审批"
    },
    {
      "ship": "南海先锋",
      "partName": "GPS天线接头",
      "system": "导航",
      "location": "驾驶台",
      "qty": "1",
      "urgency": "高",
      "reason": "信号不稳定，影响导航精度",
      "status": "已批准"
    },
    {
      "ship": "东方之珠",
      "partName": "锚机液压油",
      "system": "甲板",
      "location": "首楼间",
      "qty": "6",
      "urgency": "低",
      "reason": "库存补充",
      "status": "已驳回"
    },
    {
      "ship": "海运之星",
      "partName": "应急发电机滤芯",
      "system": "电气",
      "location": "应急发电机室",
      "qty": "2",
      "urgency": "高",
      "reason": "月度保养到期",
      "status": "已发放"
    },
    {
      "ship": "长江明珠",
      "partName": "救生衣示位灯",
      "system": "消防",
      "location": "救生甲板",
      "qty": "15",
      "urgency": "中",
      "reason": "部分电池过期",
      "status": "待审批"
    }
  ],
  "metrics": [
    [
      "申请数",
      "records.length"
    ],
    [
      "高紧急",
      "records.filter((item) => item.urgency === '高').length"
    ],
    [
      "待审批",
      "records.filter((item) => item.status === '待审批').length"
    ]
  ],
  "filters": [
    {
      "key": "query",
      "label": "备件/系统/船舶",
      "type": "search",
      "match": "`${item.ship}${item.partName}${item.system}${item.location}`.includes(filters.query)"
    },
    {
      "key": "status",
      "label": "申请状态",
      "type": "status"
    }
  ],
  "cardTitle": "item.partName",
  "cardMeta": "`${item.ship} · ${item.system} · ${item.urgency}紧急`",
  "cardDetail": "`${item.location} · 数量${item.qty}｜${item.reason}`",
  "history": true,
  "note": "每条申请都能查看简化的状态流转记录。",
  "defaultValues": {
    "ship": "远洋一号",
    "partName": "海水泵密封圈",
    "system": "机舱",
    "location": "二副库",
    "qty": "2",
    "urgency": "高",
    "reason": "巡检发现渗漏，需预防性更换",
    "status": "待审批"
  }
};

const inventoryConfig = {
  storage: "hxwl-61307-spare-inventory",
  title: "备件库存台账",
  subtitle: "维护备件库存信息，低于安全库存及时预警",
  domain: "库存管理",
  accent: "#dc2626",
  systems: ["机舱", "甲板", "电气", "消防", "导航"],
  fields: [
    { key: "partName", label: "备件名称", type: "input", placeholder: "海水泵密封圈" },
    { key: "system", label: "设备系统", type: "select", placeholder: "机舱", options: ["机舱", "甲板", "电气", "消防", "导航"] },
    { key: "location", label: "船舶位置", type: "input", placeholder: "二副库" },
    { key: "currentStock", label: "当前库存", type: "number", placeholder: "10" },
    { key: "safetyStock", label: "安全库存", type: "number", placeholder: "5" },
    { key: "lastCheckDate", label: "最后盘点日期", type: "date", placeholder: "" }
  ],
  seed: [
    { partName: "海水泵密封圈", system: "机舱", location: "二副库", currentStock: "3", safetyStock: "5", lastCheckDate: "2026-06-01" },
    { partName: "甲板照明灯泡", system: "电气", location: "甲板库", currentStock: "20", safetyStock: "10", lastCheckDate: "2026-06-05" },
    { partName: "消防水带接口", system: "消防", location: "消防站", currentStock: "2", safetyStock: "4", lastCheckDate: "2026-05-28" },
    { partName: "主机润滑油", system: "机舱", location: "机舱油库", currentStock: "8", safetyStock: "6", lastCheckDate: "2026-06-10" }
  ],
  defaultValues: {
    partName: "海水泵密封圈",
    system: "机舱",
    location: "二副库",
    currentStock: "10",
    safetyStock: "5",
    lastCheckDate: new Date().toISOString().slice(0, 10)
  }
};

const distConfig = {
  storage: "hxwl-61307-distribution",
  title: "发放登记",
  subtitle: "已批准备件的实际出库登记与发放记录管理",
  domain: "发放管理",
  accent: "#16a34a",
  fields: [
    { key: "distQty", label: "发放数量", type: "number", placeholder: "1" },
    { key: "receiver", label: "领取人", type: "input", placeholder: "张三" },
    { key: "distributor", label: "发放人", type: "input", placeholder: "李四" },
    { key: "distNote", label: "备注", type: "textarea", placeholder: "发放备注信息" }
  ],
  defaultValues: {
    distQty: "",
    receiver: "",
    distributor: "",
    distNote: ""
  }
};

const templateConfig = {
  storage: "hxwl-61307-spare-templates",
  title: "常用备件模板",
  subtitle: "维护常用备件模板，申请时一键带入表单字段",
  domain: "模板管理",
  accent: "#7c3aed",
  fields: [
    { key: "templateName", label: "模板名称", type: "input", placeholder: "例如：海水泵日常维护" },
    { key: "ship", label: "默认船舶", type: "select", placeholder: "远洋一号", options: ["远洋一号", "海运之星", "长江明珠", "南海先锋", "东方之珠"] },
    { key: "partName", label: "备件名称", type: "input", placeholder: "海水泵密封圈" },
    { key: "system", label: "设备系统", type: "select", placeholder: "机舱", options: ["机舱", "甲板", "电气", "消防", "导航"] },
    { key: "location", label: "默认位置", type: "input", placeholder: "二副库" },
    { key: "qty", label: "默认数量", type: "number", placeholder: "2" },
    { key: "reason", label: "常用申请原因", type: "textarea", placeholder: "巡检发现渗漏，需预防性更换" }
  ],
  seed: [
    { templateName: "海水泵日常维护", ship: "远洋一号", partName: "海水泵密封圈", system: "机舱", location: "二副库", qty: "2", reason: "巡检发现渗漏，需预防性更换" },
    { templateName: "甲板照明维护", ship: "海运之星", partName: "甲板照明灯泡", system: "电气", location: "甲板库", qty: "12", reason: "夜航照明备货，定期更换" },
    { templateName: "消防设备检查", ship: "长江明珠", partName: "消防水带接口", system: "消防", location: "消防站", qty: "4", reason: "演练后发现老化，需更换" }
  ],
  defaultValues: {
    templateName: "",
    ship: "远洋一号",
    partName: "",
    system: "机舱",
    location: "",
    qty: "1",
    reason: ""
  }
};

const purchaseConfig = {
  storage: "hxwl-61307-purchase-orders",
  title: "采购跟踪",
  subtitle: "已批准但库存不足的备件转为采购任务，跟踪采购到货进度",
  domain: "采购管理",
  accent: "#7c3aed",
  statuses: ["待下单", "已下单", "运输中", "已到货"],
  suppliers: [
    "上海海事设备有限公司",
    "广州船用备件供应站",
    "天津远洋物资供应公司",
    "青岛港船舶服务有限公司",
    "宁波舟山海事装备"
  ],
  fields: [
    { key: "supplier", label: "供应商", type: "select", placeholder: "请选择供应商" },
    { key: "purchaseQty", label: "采购数量", type: "number", placeholder: "1" },
    { key: "etaDate", label: "预计到港日期", type: "date", placeholder: "" },
    { key: "arrivalDate", label: "实际到货日期", type: "date", placeholder: "" },
    { key: "purchaseNote", label: "采购备注", type: "textarea", placeholder: "采购备注信息" }
  ],
  defaultValues: {
    supplier: "",
    purchaseQty: "",
    etaDate: "",
    arrivalDate: "",
    purchaseNote: ""
  },
  seed: []
};

const trendConfig = {
  title: "备件需求趋势分析",
  subtitle: "基于历史申请记录统计备件使用频率、系统分布与紧急程度占比",
  domain: "数据分析",
  accent: "#0d9488",
  topN: 10
};

const today = new Date().toISOString().slice(0, 10);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function withIds(items) {
  return items.map((item) => ({ id: uid(), timeline: item.timeline || [{ status: item.status, at: today, by: '系统' }], ...item }));
}

function loadRecords() {
  const raw = localStorage.getItem(appConfig.storage);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed.map(item => {
        const dispatched = item.hasBeenDispatched || (item.timeline || []).some((step) => step.status === '已发放');
        return {
          ...item,
          ship: item.ship || appConfig.ships[0],
          timeline: item.timeline || [{ status: item.status, at: today, by: '系统' }],
          hasBeenDispatched: dispatched
        };
      });
    } catch {
      return withIds(appConfig.seed);
    }
  }
  return withIds(appConfig.seed);
}

function loadInventory() {
  const raw = localStorage.getItem(inventoryConfig.storage);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return inventoryConfig.seed.map(item => ({ id: uid(), ...item }));
    }
  }
  return inventoryConfig.seed.map(item => ({ id: uid(), ...item }));
}

function loadTemplates() {
  const raw = localStorage.getItem(templateConfig.storage);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed.map(item => ({
        ...item,
        ship: item.ship || appConfig.ships[0]
      }));
    } catch {
      return templateConfig.seed.map(item => ({ id: uid(), ...item }));
    }
  }
  return templateConfig.seed.map(item => ({ id: uid(), ...item }));
}

function loadPurchases() {
  const raw = localStorage.getItem(purchaseConfig.storage);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return purchaseConfig.seed.map(item => ({ id: uid(), ...item }));
    }
  }
  return purchaseConfig.seed.map(item => ({ id: uid(), ...item }));
}

function isLowStock(item) {
  const current = Number(item.currentStock);
  const safety = Number(item.safetyStock);
  return Number.isFinite(current) && Number.isFinite(safety) && current < safety;
}

function priorityRank(value) {
  return { 危急: 0, 加急: 1, 常规: 2, 高: 0, 中: 1, 低: 2 }[value] ?? 9;
}

function hasOverlap(target, records) {
  if (!target.bed || !target.date || !target.start || !target.end) return false;
  return records.some((item) => item.id !== target.id && item.bed === target.bed && item.date === target.date && target.start < item.end && target.end > item.start);
}

function wasDispatched(item) {
  return item.hasBeenDispatched || (item.timeline || []).some((step) => step.status === '已发放');
}

function purchaseStatusClass(status) {
  const map = {
    '待下单': 'purchase-status-pending',
    '已下单': 'purchase-status-ordered',
    '运输中': 'purchase-status-shipping',
    '已到货': 'purchase-status-arrived'
  };
  return map[status] || 'purchase-status-pending';
}

function isOverdue(etaDate) {
  if (!etaDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return etaDate < today;
}

function statusClass(status) {
  const index = appConfig.statuses.indexOf(status);
  return ['status-a', 'status-b', 'status-c', 'status-d'][index] || 'status-a';
}

function App() {
  const [activeTab, setActiveTab] = useState('application');

  const [records, setRecords] = useState(loadRecords);
  const [form, setForm] = useState(appConfig.defaultValues);
  const [filters, setFilters] = useState({ query: '', ship: '全部', system: '全部', urgency: '全部', status: '全部' });
  const [selected, setSelected] = useState(null);

  const [inventory, setInventory] = useState(loadInventory);
  const [invForm, setInvForm] = useState(inventoryConfig.defaultValues);
  const [invFilters, setInvFilters] = useState({ query: '', system: '全部', lowStockOnly: false });
  const [selectedInv, setSelectedInv] = useState(null);

  const [distRecords, setDistRecords] = useState(() => {
    const raw = localStorage.getItem(distConfig.storage);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.map(item => ({
          ...item,
          ship: item.ship || appConfig.ships[0]
        }));
      } catch { return []; }
    }
    return [];
  });
  const [distForm, setDistForm] = useState({ ...distConfig.defaultValues, applicationId: '' });
  const [selectedDist, setSelectedDist] = useState(null);

  const [templates, setTemplates] = useState(loadTemplates);
  const [templateForm, setTemplateForm] = useState(templateConfig.defaultValues);
  const [templateFilters, setTemplateFilters] = useState({ query: '', system: '全部' });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedApplyTemplate, setSelectedApplyTemplate] = useState('');

  const [purchases, setPurchases] = useState(loadPurchases);
  const [purchaseForm, setPurchaseForm] = useState({ ...purchaseConfig.defaultValues, applicationId: '' });
  const [purchaseFilters, setPurchaseFilters] = useState({ query: '', status: '全部', ship: '全部' });
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showCreatePurchaseFromApp, setShowCreatePurchaseFromApp] = useState(false);

  const [trendDateRange, setTrendDateRange] = useState({ start: '', end: '' });
  const [trendSystemFilter, setTrendSystemFilter] = useState('全部');

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importTab, setImportTab] = useState('paste');
  const [importPreviewTab, setImportPreviewTab] = useState('valid');
  const fileInputRef = useRef(null);

  const [approvalSubTab, setApprovalSubTab] = useState('urgent');
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalShip, setApprovalShip] = useState('全部');
  const [approvalSystem, setApprovalSystem] = useState('全部');
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalQty, setApprovalQty] = useState('');
  const [approvalRole, setApprovalRole] = useState('轮机长');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalError, setApprovalError] = useState('');

  const [isOnline, setIsOnline] = useState(() => {
    const meta = loadSyncMeta();
    if (meta.forcedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [forcedOffline, setForcedOffline] = useState(() => loadSyncMeta().forcedOffline);
  const [syncQueue, setSyncQueue] = useState(() => loadSyncQueue());
  const [conflicts, setConflicts] = useState(() => loadConflicts());
  const [syncMeta, setSyncMetaState] = useState(() => loadSyncMeta());
  const [baseline, setBaseline] = useState(() => {
    const b = loadBaseline();
    if (Object.keys(b).length === 0) {
      const fresh = takeBaseline(loadRecords());
      return fresh;
    }
    return b;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' });
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [syncTab, setSyncTab] = useState('queue');
  const [syncLog, setSyncLog] = useState([]);
  const [expandedConflicts, setExpandedConflicts] = useState({});

  const [migrationStatus, setMigrationStatus] = useState(null);
  const [showMigrationAlert, setShowMigrationAlert] = useState(false);
  const [dataVersion, setDataVersion] = useState(() => getDataVersion());
  const [auditTab, setAuditTab] = useState('overview');
  const [auditFilters, setAuditFilters] = useState({
    eventType: '全部',
    operator: '',
    startDate: '',
    endDate: '',
  });
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('hxwl-61307-operator') || '当前用户');
  const [showAuditExportModal, setShowAuditExportModal] = useState(false);
  const [expandedAuditEvents, setExpandedAuditEvents] = useState({});

  const pendingCount = getPendingOperations().length;
  const unresolvedConflictCount = conflicts.filter((c) => !c.resolved).length;

  const refreshSyncState = useCallback(() => {
    setSyncQueue(loadSyncQueue());
    setConflicts(loadConflicts());
    setSyncMetaState(loadSyncMeta());
    setBaseline(loadBaseline());
  }, []);

  const setSyncMeta = useCallback((next) => {
    const merged = { ...loadSyncMeta(), ...next };
    saveSyncMeta(merged);
    setSyncMetaState(merged);
  }, []);

  const toggleForceOffline = useCallback(() => {
    const next = !forcedOffline;
    setForcedOffline(next);
    setIsOnline(next ? false : (typeof navigator !== 'undefined' ? navigator.onLine : true));
    setSyncMeta({ forcedOffline: next });
  }, [forcedOffline, setSyncMeta]);

  const addLog = useCallback((type, message) => {
    setSyncLog((prev) => [
      { id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), type, message, at: Date.now() },
      ...prev.slice(0, 99),
    ]);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (!forcedOffline) {
        setIsOnline(true);
        addLog('info', '检测到网络恢复为在线状态');
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      addLog('warn', '检测到网络断开，进入离线模式');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forcedOffline, addLog]);

  useEffect(() => {
    const existing = loadBaseline();
    if (Object.keys(existing).length === 0) {
      const fresh = takeBaseline(records);
      setBaseline(fresh);
      addLog('info', '已创建初始数据基线（' + records.length + '条记录）');
    }
  }, []);

  useEffect(() => {
    const result = runMigrations();
    setMigrationStatus(result);
    setDataVersion(getDataVersion());
    if (result.migrated) {
      addLog(result.success ? 'success' : 'error', `数据迁移：${result.message}`);
      if (result.success) {
        setRecords(loadRecords());
        setInventory(loadInventory());
        setTemplates(loadTemplates());
        setPurchases(loadPurchases());
        const freshBaseline = takeBaseline(loadRecords());
        setBaseline(freshBaseline);
      }
      setShowMigrationAlert(true);
    } else if (!result.success) {
      addLog('error', `数据迁移失败：${result.message}`);
      setShowMigrationAlert(true);
    }
  }, []);

  const enqueueAndRefresh = useCallback((operation) => {
    const op = enqueueOperation(operation);
    refreshSyncState();
    addLog(
      operation.type === OP_TYPES.CREATE ? 'create' :
      operation.type === OP_TYPES.DELETE ? 'delete' : 'update',
      `已记录离线操作：${describeOperation(operation)}`
    );
    return op;
  }, [refreshSyncState, addLog]);

  function describeOperation(op) {
    const t = op.type;
    const payload = op.payload || {};
    switch (t) {
      case OP_TYPES.CREATE:
        return `创建申请「${payload.partName || payload.record?.partName || '未知'}」`;
      case OP_TYPES.UPDATE_STATUS:
        return `变更状态「${payload.fromStatus} → ${payload.toStatus}」`;
      case OP_TYPES.APPROVE:
        return `批准申请（数量${payload.approvedQty || '-'}）`;
      case OP_TYPES.REJECT:
        return `驳回申请`;
      case OP_TYPES.DELETE:
        return `删除申请记录`;
      case OP_TYPES.DISPATCH:
        return `发放出库`;
      default:
        return t;
    }
  }

  const safePersist = useCallback((next) => {
    persist(next);
  }, []);

  const performSync = useCallback(async () => {
    if (isSyncing) return;
    if (!isOnline) {
      addLog('error', '当前处于离线状态，无法同步');
      return;
    }
    setIsSyncing(true);
    addLog('info', '开始执行同步流程...');

    try {
      const pendingOps = getPendingOperations();
      const currentBaseline = loadBaseline();
      const currentRecords = records;

      addLog('info', `待同步操作：${pendingOps.length}条`);
      setSyncProgress({ current: 0, total: pendingOps.length + 3, message: '生成服务端快照（模拟）...' });
      await simulateServerLatency();

      const remoteSnapshot = generateRemoteSnapshot(currentRecords, currentBaseline);
      addLog('info', `服务端快照生成完成（${remoteSnapshot.length}条记录）`);
      setSyncProgress({ current: 1, total: pendingOps.length + 3, message: '检测数据冲突...' });

      const detectedConflicts = detectConflicts(pendingOps, currentBaseline, remoteSnapshot);
      addLog('warn', `检测到${detectedConflicts.length}个冲突，正在处理...`);

      const existingConflicts = loadConflicts();
      const existingConflictKeys = new Set(
        existingConflicts.map((c) => `${c.type}-${c.targetId}`)
      );
      let allConflicts = [...existingConflicts];
      detectedConflicts.forEach((dc) => {
        const matchKey = `${dc.type}-${dc.targetId}`;
        if (!existingConflictKeys.has(matchKey)) {
          allConflicts.push(dc);
          existingConflictKeys.add(matchKey);
        }
      });
      saveConflicts(allConflicts);
      setConflicts(allConflicts);

      setSyncProgress({ current: 2, total: pendingOps.length + 3, message: '自动解决可处理冲突...' });
      await simulateServerLatency();

      let workingRecords = [...currentRecords];
      let opsToRemoveIds = new Set();
      const conflictOpsIds = new Set();

      allConflicts.forEach((c) => {
        (c.affectedOps || []).forEach((id) => conflictOpsIds.add(id));
      });

      const unresolvedConfs = [];
      for (let i = 0; i < allConflicts.length; i++) {
        const c = allConflicts[i];
        if (c.resolved) continue;
        const autoRes = autoResolveConflict(c);
        if (autoRes.resolved) {
          allConflicts[i] = autoRes.conflict;
          const strat = autoRes.conflict.resolution.strategy;
          const applied = applyConflictResolution(autoRes.conflict, strat, workingRecords);
          if (applied.applied) {
            workingRecords = applied.records;
            applied.opsToRemove.forEach((id) => opsToRemoveIds.add(id));
            addLog('success', `自动解决冲突：${c.description} → ${applied.note}`);
          }
        } else {
          unresolvedConfs.push(c);
        }
      }
      saveConflicts(allConflicts);
      setConflicts(allConflicts);

      setSyncProgress({ current: 3, total: pendingOps.length + 3, message: '同步无冲突操作...' });
      let syncedCount = 0;
      const queue = loadSyncQueue();
      const updatedQueue = queue.map((op) => {
        if (op.synced) return op;
        if (opsToRemoveIds.has(op.id)) {
          syncedCount += 1;
          return { ...op, synced: true, syncAttempts: op.syncAttempts + 1, error: null, syncedAt: Date.now(), removedByConflict: true };
        }
        if (conflictOpsIds.has(op.id)) return op;
        syncedCount += 1;
        return { ...op, synced: true, syncAttempts: op.syncAttempts + 1, error: null, syncedAt: Date.now() };
      });
      saveSyncQueue(updatedQueue);
      setSyncQueue(updatedQueue);

      await simulateServerLatency();

      if (syncedCount > 0) {
        setSyncProgress({ current: pendingOps.length + 3, total: pendingOps.length + 3, message: '更新基线数据...' });
        const newBaseline = {};
        workingRecords.forEach((r) => { newBaseline[r.id] = JSON.parse(JSON.stringify(r)); });
        saveBaseline(newBaseline);
        setBaseline(newBaseline);
        safePersist(workingRecords);
      }

      setSyncMeta({
        lastSyncAt: Date.now(),
        lastSyncSuccess: unresolvedConfs.length === 0,
        syncCount: loadSyncMeta().syncCount + 1,
      });

      addLog(
        unresolvedConfs.length === 0 ? 'success' : 'warn',
        `同步完成：成功${syncedCount}条，剩余${unresolvedConfs.length}个冲突需手动处理`
      );

      if (unresolvedConfs.length > 0) {
        setSelectedConflict(unresolvedConfs[0]);
        setShowConflictModal(true);
      }

      refreshSyncState();
    } catch (e) {
      console.error(e);
      addLog('error', '同步失败：' + (e.message || String(e)));
      setSyncMeta({ lastSyncSuccess: false });
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0, message: '' });
    }
  }, [isSyncing, isOnline, records, addLog, safePersist, refreshSyncState, setSyncMeta]);

  const resolveConflictManually = useCallback((conflictId, strategy) => {
    const list = loadConflicts();
    const idx = list.findIndex((c) => c.id === conflictId);
    if (idx === -1) return;
    const conflict = list[idx];
    if (!conflict.deletedRecord && conflict.type === CONFLICT_TYPES.DELETE_THEN_APPROVE) {
      const bl = loadBaseline();
      if (bl[conflict.targetId]) {
        conflict.deletedRecord = JSON.parse(JSON.stringify(bl[conflict.targetId]));
      }
    }
    const resolved = {
      ...conflict,
      resolved: true,
      resolution: {
        strategy,
        resolvedAt: Date.now(),
        by: 'user',
        note: '用户手动解决',
      },
    };
    list[idx] = resolved;
    saveConflicts(list);
    setConflicts(list);

    const applied = applyConflictResolution(resolved, strategy, records);
    if (applied.applied) {
      safePersist(applied.records);
      const queue = loadSyncQueue();
      const updated = queue.map((op) =>
        applied.opsToRemove.includes(op.id)
          ? { ...op, synced: true, removedByConflict: true, syncedAt: Date.now() }
          : op
      );
      saveSyncQueue(updated);
      addLog('success', `手动解决冲突：${conflict.description} → ${applied.note}`);
    }

    const remainingUnresolved = list.filter((c) => !c.resolved);
    if (remainingUnresolved.length > 0) {
      setSelectedConflict(remainingUnresolved[0]);
    } else {
      setShowConflictModal(false);
      setSelectedConflict(null);
      performSync().catch(() => {});
    }
    refreshSyncState();
  }, [records, safePersist, addLog, refreshSyncState, performSync]);

  const resetSyncSystem = useCallback(() => {
    if (!confirm('确认重置整个同步系统？这会清空同步队列、冲突记录和基线，不会影响现有业务数据。')) return;
    clearAllSyncData();
    const fresh = takeBaseline(records);
    setBaseline(fresh);
    refreshSyncState();
    addLog('info', '同步系统已重置，已建立新的基线（' + records.length + '条）');
  }, [records, refreshSyncState, addLog]);

  function persist(next) {
    setRecords(next);
    localStorage.setItem(appConfig.storage, JSON.stringify(next));
  }

  function persistInventory(next) {
    setInventory(next);
    localStorage.setItem(inventoryConfig.storage, JSON.stringify(next));
  }

  function findInventoryItem(application) {
    if (!application) return null;
    return inventory.find((inv) =>
      inv.partName === application.partName &&
      inv.system === application.system &&
      inv.location === application.location
    );
  }

  function needsPurchase(application) {
    if (!application) return false;
    const inv = findInventoryItem(application);
    if (!inv) return true;
    const requiredQty = Number(application.approvedQty || application.qty || 0);
    const currentStock = Number(inv.currentStock || 0);
    const safetyStock = Number(inv.safetyStock || 0);
    return currentStock < requiredQty || currentStock < safetyStock;
  }

  function getInventoryStatus(application) {
    if (!application) return { lowStock: false, stockInfo: null };
    const inv = findInventoryItem(application);
    if (!inv) {
      return { lowStock: true, stockInfo: null, noRecord: true };
    }
    const requiredQty = Number(application.approvedQty || application.qty || 0);
    const currentStock = Number(inv.currentStock || 0);
    const safetyStock = Number(inv.safetyStock || 0);
    const lowStock = currentStock < requiredQty || currentStock < safetyStock;
    return { lowStock, stockInfo: inv, requiredQty, currentStock, safetyStock, noRecord: false };
  }

  function addRecord(event) {
    event.preventDefault();
    const nextRecord = {
      id: uid(),
      ...form,
      status: form.status || appConfig.primaryStatus,
      createdAt: new Date().toISOString(),
      timeline: [{ status: form.status || appConfig.primaryStatus, at: today, by: '录入' }]
    };

    if (appConfig.conflict === 'date-slot' && records.some((item) => item.date === nextRecord.date && item.slot === nextRecord.slot)) {
      nextRecord.conflict = true;
    }
    if (appConfig.conflict === 'bed-time' && hasOverlap(nextRecord, records)) {
      nextRecord.conflict = true;
    }
    if (appConfig.chart) {
      const temp = Number(nextRecord.temperature || 0);
      nextRecord.temps = [temp];
      if (temp > 2) nextRecord.status = '异常';
    }

    enqueueAndRefresh({
      type: OP_TYPES.CREATE,
      targetId: nextRecord.id,
      payload: { ...nextRecord, record: nextRecord },
    });

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.CREATE,
      targetType: 'record',
      targetId: nextRecord.id,
      afterData: nextRecord,
      metadata: {
        ship: nextRecord.ship,
        partName: nextRecord.partName,
        system: nextRecord.system,
        qty: nextRecord.qty,
        urgency: nextRecord.urgency,
      },
      operator: operatorName,
    });

    persist([nextRecord, ...records]);
    setForm(appConfig.defaultValues);
    setSelected(nextRecord);
  }

  const fieldAliasMap = {
    'ship': ['所属船舶', '船舶', '船名', 'ship', 'vessel'],
    'partName': ['备件名称', '备件', '配件名称', '配件', '零件名称', 'partname', 'part', 'name'],
    'system': ['设备系统', '系统', '所属系统', 'system'],
    'location': ['船舶位置', '位置', '存放位置', '库位', 'location', 'position'],
    'qty': ['需求数量', '数量', '申请数量', 'qty', 'quantity', 'count'],
    'urgency': ['紧急程度', '紧急', '优先级', 'urgency', 'priority'],
    'reason': ['申请原因', '原因', '备注', '说明', 'reason', 'remark', 'note'],
    'status': ['状态', '申请状态', 'status']
  };

  function matchField(header) {
    const lowerHeader = header.trim().toLowerCase();
    for (const [fieldKey, aliases] of Object.entries(fieldAliasMap)) {
      for (const alias of aliases) {
        if (lowerHeader === alias.toLowerCase()) {
          return fieldKey;
        }
      }
    }
    return null;
  }

  function trimField(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  }

  function parseCSV(text) {
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

  function validateRow(row, fieldMapping, rowIndex, existingRecords, parsedRows) {
    const errors = [];
    const record = {};
    const requiredFields = ['ship', 'partName', 'system', 'location', 'qty', 'urgency', 'reason'];

    for (const [csvHeader, fieldKey] of Object.entries(fieldMapping)) {
      if (fieldKey && row[csvHeader] !== undefined) {
        record[fieldKey] = row[csvHeader].trim();
      }
    }

    for (const field of requiredFields) {
      if (!record[field] || record[field].trim() === '') {
        const fieldConfig = appConfig.fields.find(f => f.key === field);
        errors.push(`缺少必填字段：${fieldConfig?.label || field}`);
      }
    }

    if (record.ship && !appConfig.ships.includes(record.ship)) {
      errors.push(`船舶"${record.ship}"不在允许列表中，可选：${appConfig.ships.join('、')}`);
    }

    if (record.system) {
      const systemOptions = appConfig.fields.find(f => f.key === 'system')?.options || [];
      if (!systemOptions.includes(record.system)) {
        errors.push(`设备系统"${record.system}"不在允许列表中，可选：${systemOptions.join('、')}`);
      }
    }

    if (record.urgency) {
      const urgencyOptions = appConfig.fields.find(f => f.key === 'urgency')?.options || [];
      if (!urgencyOptions.includes(record.urgency)) {
        errors.push(`紧急程度"${record.urgency}"不在允许列表中，可选：${urgencyOptions.join('、')}`);
      }
    }

    if (record.qty) {
      const qtyNum = Number(record.qty);
      if (!Number.isFinite(qtyNum) || qtyNum <= 0 || !Number.isInteger(qtyNum)) {
        errors.push(`需求数量必须是正整数，当前值：${record.qty}`);
      }
    }

    const duplicateInImport = parsedRows.findIndex((r, i) => {
      if (i >= rowIndex) return false;
      return r.ship === record.ship &&
             r.partName === record.partName &&
             r.system === record.system &&
             r.location === record.location;
    });
    if (duplicateInImport !== -1) {
      errors.push(`与导入文件中第${duplicateInImport + 2}行数据重复（同一船舶、同一备件、同一系统、同一位置）`);
    }

    const duplicateInExisting = existingRecords.some(r =>
      r.ship === record.ship &&
      r.partName === record.partName &&
      r.system === record.system &&
      r.location === record.location &&
      !wasDispatched(r)
    );
    if (duplicateInExisting) {
      errors.push(`与现有申请记录重复（同一船舶、同一备件、同一系统、同一位置且未发放）`);
    }

    if (record.status && !appConfig.statuses.includes(record.status)) {
      record.status = appConfig.primaryStatus;
    }

    return { record: { ...record, status: record.status || appConfig.primaryStatus }, errors };
  }

  function analyzeImport(text) {
    if (!text.trim()) {
      setImportPreview(null);
      return;
    }

    setImportPreviewTab('valid');

    try {
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0 || rows.length === 0) {
        setImportPreview({ error: '无法解析CSV数据，请检查格式是否正确' });
        return;
      }

      const fieldMapping = {};
      const recognizedFields = [];
      const unrecognizedFields = [];

      headers.forEach(header => {
        const matched = matchField(header);
        fieldMapping[header] = matched;
        if (matched) {
          recognizedFields.push({ csv: header, field: matched, label: appConfig.fields.find(f => f.key === matched)?.label || matched });
        } else {
          unrecognizedFields.push(header);
        }
      });

      const requiredFieldKeys = ['ship', 'partName', 'system', 'location', 'qty', 'urgency', 'reason'];
      const missingRequired = requiredFieldKeys.filter(key => !recognizedFields.some(f => f.field === key));

      const validRows = [];
      const errorRows = [];
      const duplicateRows = [];

      const parsedRows = [];
      rows.forEach((row, index) => {
        const { record, errors } = validateRow(row, fieldMapping, index, records, parsedRows);
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

      setImportPreview({
        headers,
        fieldMapping,
        recognizedFields,
        unrecognizedFields,
        missingRequired: missingRequired.map(key => appConfig.fields.find(f => f.key === key)?.label || key),
        totalRows: rows.length,
        validRows,
        errorRows,
        duplicateRows,
        canImport: errorRows.length < rows.length && missingRequired.length === 0
      });
    } catch (e) {
      setImportPreview({ error: '解析CSV时发生错误：' + e.message });
    }
  }

  function handleFileUpload(event) {
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
  }

  function handlePaste(event) {
    const text = event.target.value;
    setImportText(text);
    analyzeImport(text);
  }

  function executeImport() {
    if (!importPreview || !importPreview.canImport) return;

    const newRecords = importPreview.validRows.map(item => ({
      id: uid(),
      ...item.data,
      status: item.data.status || appConfig.primaryStatus,
      createdAt: new Date().toISOString(),
      timeline: [{ status: item.data.status || appConfig.primaryStatus, at: today, by: '批量导入' }]
    }));

    const nextRecords = [...newRecords, ...records];
    persist(nextRecords);

    newRecords.forEach((record) => {
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.IMPORT,
        targetType: 'record',
        targetId: record.id,
        afterData: record,
        metadata: {
          ship: record.ship,
          partName: record.partName,
          system: record.system,
          qty: record.qty,
          importBatch: true,
        },
        operator: operatorName,
      });
    });

    const successCount = newRecords.length;
    const errorCount = importPreview.errorRows.length;
    const duplicateCount = importPreview.duplicateRows.length;

    alert(`导入完成！\n\n成功导入：${successCount} 条\n错误行：${errorCount} 条（未导入）\n重复提示：${duplicateCount} 条（已导入但存在重复风险）`);

    setShowImportModal(false);
    setImportText('');
    setImportPreview(null);
    setActiveTab('application');
  }

  function escapeCSVField(field, delimiter = ',') {
    const str = String(field ?? '');
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function getSampleCSV() {
    const delimiter = ',';
    const headers = appConfig.fields.map(f => escapeCSVField(f.label, delimiter)).join(delimiter);
    const sampleRow = appConfig.fields.map(f => {
      const value = f.type === 'select' ? (f.options[0] || '') : (f.placeholder || '');
      return escapeCSVField(value, delimiter);
    }).join(delimiter);
    return `${headers}\n${sampleRow}`;
  }

  function copySampleCSV() {
    navigator.clipboard.writeText(getSampleCSV()).then(() => {
      alert('示例CSV格式已复制到剪贴板！');
    });
  }

  function downloadSampleCSV() {
    const csv = getSampleCSV();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '备件申请导入示例.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function addInventory(event) {
    event.preventDefault();
    const nextItem = {
      id: uid(),
      ...invForm,
      createdAt: new Date().toISOString()
    };
    persistInventory([nextItem, ...inventory]);
    setInvForm(inventoryConfig.defaultValues);
    setSelectedInv(nextItem);
  }

  function createRequestFromLowStock(invItem) {
    const current = Number(invItem.currentStock) || 0;
    const safety = Number(invItem.safetyStock) || 0;
    const suggestedQty = Math.max(safety - current, 1);
    const reason = `库存预警：当前库存${current}，低于安全库存${safety}，建议申请补货${suggestedQty}件`;
    setForm({
      ...appConfig.defaultValues,
      ship: appConfig.ships[0],
      partName: invItem.partName,
      system: invItem.system,
      location: invItem.location,
      qty: String(suggestedQty),
      urgency: '高',
      reason: reason,
      status: appConfig.primaryStatus
    });
    setSelectedApplyTemplate('');
    setActiveTab('application');
    setSelected(null);
  }

  function updateStatus(id, status) {
    const item = records.find((r) => r.id === id);
    if (!item) return;
    if (wasDispatched(item)) {
      return;
    }
    const fromStatus = item.status;
    enqueueAndRefresh({
      type: OP_TYPES.UPDATE_STATUS,
      targetId: id,
      payload: { fromStatus, toStatus: status, by: '操作员', partName: item.partName },
    });
    const updatedItem = {
      ...item,
      status,
      timeline: [...(item.timeline || []), { status, at: today, by: '操作员' }]
    };
    const next = records.map((r) => r.id === id ? updatedItem : r);

    logAuditEvent({
      eventType: status === '已批准' ? AUDIT_EVENT_TYPES.APPROVE : status === '已驳回' ? AUDIT_EVENT_TYPES.REJECT : AUDIT_EVENT_TYPES.UPDATE_STATUS,
      targetType: 'record',
      targetId: id,
      beforeData: item,
      afterData: updatedItem,
      metadata: {
        fromStatus,
        toStatus: status,
        ship: item.ship,
        partName: item.partName,
      },
      operator: operatorName,
    });

    persist(next);
    if (selected?.id === id) setSelected(next.find((item) => item.id === id));
  }

  function removeRecord(id) {
    const item = records.find((r) => r.id === id);
    if (item) {
      enqueueAndRefresh({
        type: OP_TYPES.DELETE,
        targetId: id,
        payload: { partName: item.partName, ship: item.ship, originalRecord: item },
      });

      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.DELETE,
        targetType: 'record',
        targetId: id,
        beforeData: item,
        metadata: {
          ship: item.ship,
          partName: item.partName,
          system: item.system,
          status: item.status,
        },
        operator: operatorName,
      });
    }
    const next = records.filter((item) => item.id !== id);
    persist(next);
    if (selected?.id === id) setSelected(null);
  }

  function removeInventory(id) {
    const next = inventory.filter((item) => item.id !== id);
    persistInventory(next);
    if (selectedInv?.id === id) setSelectedInv(null);
  }

  function persistTemplates(next) {
    setTemplates(next);
    localStorage.setItem(templateConfig.storage, JSON.stringify(next));
  }

  function persistPurchases(next) {
    setPurchases(next);
    localStorage.setItem(purchaseConfig.storage, JSON.stringify(next));
  }

  function addPurchase(event) {
    event.preventDefault();
    if (!purchaseForm.applicationId) return;
    const application = records.find((item) => item.id === purchaseForm.applicationId);
    if (!application) return;
    if (!needsPurchase(application)) {
      alert('该申请库存充足，无需创建采购任务。');
      return;
    }
    const purchaseRecord = {
      id: uid(),
      applicationId: purchaseForm.applicationId,
      ship: application.ship,
      partName: application.partName,
      system: application.system,
      location: application.location,
      qty: application.qty,
      urgency: application.urgency,
      supplier: purchaseForm.supplier,
      purchaseQty: purchaseForm.purchaseQty || application.approvedQty || application.qty,
      etaDate: purchaseForm.etaDate,
      arrivalDate: purchaseForm.arrivalDate || '',
      purchaseNote: purchaseForm.purchaseNote,
      status: purchaseForm.arrivalDate ? '已到货' : '待下单',
      createdAt: new Date().toISOString(),
      timeline: [{
        status: purchaseForm.arrivalDate ? '已到货' : '待下单',
        at: today,
        by: '操作员',
        comment: purchaseForm.purchaseNote || '',
        action: purchaseForm.arrivalDate ? 'arrive' : 'create'
      }]
    };
    persistPurchases([purchaseRecord, ...purchases]);
    const appBefore = records.find((item) => item.id === purchaseForm.applicationId);
    const updatedRecords = records.map((item) => item.id === purchaseForm.applicationId ? {
      ...item,
      hasPurchase: true,
      purchaseStatus: purchaseRecord.status,
      timeline: [...(item.timeline || []), {
        status: '采购中',
        at: today,
        by: '系统',
        comment: `已创建采购任务，供应商：${purchaseForm.supplier}，采购数量：${purchaseRecord.purchaseQty}`,
        action: 'purchase-create'
      }]
    } : item);

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.PURCHASE_CREATE,
      targetType: 'purchase',
      targetId: purchaseRecord.id,
      afterData: purchaseRecord,
      metadata: {
        applicationId: purchaseForm.applicationId,
        supplier: purchaseForm.supplier,
        purchaseQty: purchaseRecord.purchaseQty,
        etaDate: purchaseForm.etaDate,
        ship: application.ship,
        partName: application.partName,
      },
      operator: operatorName,
    });

    persist(updatedRecords);
    if (selected?.id === purchaseForm.applicationId) {
      setSelected(updatedRecords.find((item) => item.id === purchaseForm.applicationId));
    }
    setPurchaseForm({ ...purchaseConfig.defaultValues, applicationId: '' });
    setSelectedPurchase(purchaseRecord);
    setShowCreatePurchaseFromApp(false);
  }

  function updatePurchaseStatus(id, status, extraData = {}) {
    const purchase = purchases.find((p) => p.id === id);
    if (!purchase) return;
    const timelineEntry = {
      status,
      at: today,
      by: '操作员',
      comment: extraData.comment || '',
      action: status === '已到货' ? 'arrive' : 'update'
    };
    const updatedPurchase = {
      ...purchase,
      status,
      arrivalDate: status === '已到货' ? (extraData.arrivalDate || today) : purchase.arrivalDate,
      timeline: [...(purchase.timeline || []), timelineEntry]
    };
    const nextPurchases = purchases.map((p) => p.id === id ? updatedPurchase : p);

    const eventType = status === '已到货' ? AUDIT_EVENT_TYPES.PURCHASE_ARRIVE : AUDIT_EVENT_TYPES.PURCHASE_UPDATE;
    logAuditEvent({
      eventType,
      targetType: 'purchase',
      targetId: id,
      beforeData: purchase,
      afterData: updatedPurchase,
      metadata: {
        fromStatus: purchase.status,
        toStatus: status,
        arrivalDate: status === '已到货' ? (extraData.arrivalDate || today) : undefined,
        comment: extraData.comment || '',
        applicationId: purchase.applicationId,
        ship: purchase.ship,
        partName: purchase.partName,
      },
      operator: operatorName,
    });

    persistPurchases(nextPurchases);
    if (selectedPurchase?.id === id) {
      setSelectedPurchase(nextPurchases.find((p) => p.id === id));
    }
    if (purchase.applicationId) {
      const appBefore = records.find((item) => item.id === purchase.applicationId);
      const updatedRecords = records.map((item) => item.id === purchase.applicationId ? {
        ...item,
        purchaseStatus: status,
        timeline: [...(item.timeline || []), {
          status: status === '已到货' ? '已到货' : '采购中',
          at: today,
          by: '系统',
          comment: status === '已到货'
            ? `采购已到货，数量：${purchase.purchaseQty}，${extraData.comment || ''}`
            : `采购状态更新为：${status}`,
          action: status === '已到货' ? 'purchase-arrive' : 'purchase-update'
        }]
      } : item);

      if (eventType === AUDIT_EVENT_TYPES.PURCHASE_ARRIVE) {
        const appAfter = updatedRecords.find((r) => r.id === purchase.applicationId);
        logAuditEvent({
          eventType: AUDIT_EVENT_TYPES.PURCHASE_ARRIVE,
          targetType: 'record',
          targetId: purchase.applicationId,
          beforeData: appBefore,
          afterData: appAfter,
          metadata: {
            purchaseId: id,
            purchaseQty: purchase.purchaseQty,
            arrivalDate: status === '已到货' ? (extraData.arrivalDate || today) : undefined,
            comment: extraData.comment || '',
            ship: purchase.ship,
            partName: purchase.partName,
          },
          operator: operatorName,
        });
      }

      persist(updatedRecords);
      if (selected?.id === purchase.applicationId) {
        setSelected(updatedRecords.find((item) => item.id === purchase.applicationId));
      }
    }
  }

  function removePurchase(id) {
    const purchase = purchases.find((p) => p.id === id);
    if (purchase) {
      logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.PURCHASE_DELETE,
        targetType: 'purchase',
        targetId: id,
        beforeData: purchase,
        metadata: {
          applicationId: purchase.applicationId,
          supplier: purchase.supplier,
          purchaseQty: purchase.purchaseQty,
          status: purchase.status,
          ship: purchase.ship,
          partName: purchase.partName,
        },
        operator: operatorName,
      });
    }
    const next = purchases.filter((p) => p.id !== id);
    persistPurchases(next);
    if (selectedPurchase?.id === id) setSelectedPurchase(null);
    if (purchase?.applicationId) {
      const remainingPurchases = next.filter((p) => p.applicationId === purchase.applicationId);
      const updatedRecords = records.map((item) => item.id === purchase.applicationId ? {
        ...item,
        hasPurchase: remainingPurchases.length > 0,
        purchaseStatus: remainingPurchases.length > 0 ? remainingPurchases[0].status : undefined
      } : item);
      persist(updatedRecords);
      if (selected?.id === purchase.applicationId) {
        setSelected(updatedRecords.find((item) => item.id === purchase.applicationId));
      }
    }
  }

  function getPurchasesByApplicationId(applicationId) {
    return purchases.filter((p) => p.applicationId === applicationId);
  }

  function addTemplate(event) {
    event.preventDefault();
    const nextItem = {
      id: uid(),
      ...templateForm,
      createdAt: new Date().toISOString()
    };
    persistTemplates([nextItem, ...templates]);
    setTemplateForm(templateConfig.defaultValues);
    setSelectedTemplate(nextItem);
  }

  function removeTemplate(id) {
    const next = templates.filter((item) => item.id !== id);
    persistTemplates(next);
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
  }

  function applyTemplate(templateId) {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setForm({
        ...form,
        ship: template.ship || form.ship,
        partName: template.partName,
        system: template.system,
        location: template.location,
        qty: template.qty,
        reason: template.reason
      });
    }
    setSelectedApplyTemplate('');
  }

  function handleApprove(id) {
    const item = records.find((r) => r.id === id);
    if (!item) return;
    if (wasDispatched(item)) {
      setApprovalError('该备件已发放出库，不可重复审批');
      return;
    }
    if (item.status !== '待审批') {
      setApprovalError('该申请已处理，无法重复审批');
      return;
    }
    const approvedQty = approvalQty ? Number(approvalQty) : Number(item.qty);
    if (!Number.isFinite(approvedQty) || approvedQty <= 0) {
      setApprovalError('批准数量必须大于0');
      return;
    }

    enqueueAndRefresh({
      type: OP_TYPES.APPROVE,
      targetId: id,
      payload: {
        fromStatus: item.status,
        toStatus: '已批准',
        by: approvalRole,
        approvedQty: String(approvedQty),
        comment: approvalComment || '',
        partName: item.partName,
      },
    });

    const timelineEntry = {
      status: '已批准',
      at: new Date().toISOString().slice(0, 10),
      by: approvalRole,
      comment: approvalComment || '',
      approvedQty: String(approvedQty),
      action: 'approve'
    };
    const updatedItem = {
      ...item,
      status: '已批准',
      approvedQty: String(approvedQty),
      approvalComment: approvalComment || '',
      timeline: [...(item.timeline || []), timelineEntry]
    };
    const next = records.map((r) => r.id === id ? updatedItem : r);

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.APPROVE,
      targetType: 'record',
      targetId: id,
      beforeData: item,
      afterData: updatedItem,
      metadata: {
        approvedQty: String(approvedQty),
        originalQty: item.qty,
        comment: approvalComment || '',
        role: approvalRole,
        ship: item.ship,
        partName: item.partName,
      },
      operator: approvalRole,
    });

    persist(next);
    if (selectedApproval?.id === id) {
      setSelectedApproval(next.find((r) => r.id === id));
    }
    setApprovalComment('');
    setApprovalQty('');
    setApprovalError('');
  }

  function handleReject(id) {
    const item = records.find((r) => r.id === id);
    if (!item) return;
    if (wasDispatched(item)) {
      setApprovalError('该备件已发放出库，不可重复审批');
      return;
    }
    if (item.status !== '待审批') {
      setApprovalError('该申请已处理，无法重复审批');
      return;
    }
    if (!approvalComment.trim()) {
      setApprovalError('驳回时必须填写审批意见');
      return;
    }

    enqueueAndRefresh({
      type: OP_TYPES.REJECT,
      targetId: id,
      payload: {
        fromStatus: item.status,
        toStatus: '已驳回',
        by: approvalRole,
        comment: approvalComment,
        partName: item.partName,
      },
    });

    const timelineEntry = {
      status: '已驳回',
      at: new Date().toISOString().slice(0, 10),
      by: approvalRole,
      comment: approvalComment,
      action: 'reject'
    };
    const updatedItem = {
      ...item,
      status: '已驳回',
      approvalComment: approvalComment,
      timeline: [...(item.timeline || []), timelineEntry]
    };
    const next = records.map((r) => r.id === id ? updatedItem : r);

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.REJECT,
      targetType: 'record',
      targetId: id,
      beforeData: item,
      afterData: updatedItem,
      metadata: {
        comment: approvalComment,
        role: approvalRole,
        ship: item.ship,
        partName: item.partName,
      },
      operator: approvalRole,
    });

    persist(next);
    if (selectedApproval?.id === id) {
      setSelectedApproval(next.find((r) => r.id === id));
    }
    setApprovalComment('');
    setApprovalQty('');
    setApprovalError('');
  }

  function persistDist(next) {
    setDistRecords(next);
    localStorage.setItem(distConfig.storage, JSON.stringify(next));
  }

  function addDistribution(event) {
    event.preventDefault();
    if (!distForm.applicationId) return;
    const application = records.find((item) => item.id === distForm.applicationId);
    if (!application) return;
    if (wasDispatched(application)) return;
    if (application.status !== '已批准') return;
    const distRecord = {
      id: uid(),
      applicationId: distForm.applicationId,
      ship: application.ship,
      partName: application.partName,
      system: application.system,
      location: application.location,
      qty: application.qty,
      urgency: application.urgency,
      distQty: distForm.distQty,
      receiver: distForm.receiver,
      distributor: distForm.distributor,
      distNote: distForm.distNote,
      createdAt: new Date().toISOString()
    };
    persistDist([distRecord, ...distRecords]);
    const updatedItem = {
      ...application,
      status: '已发放',
      hasBeenDispatched: true,
      distribution: distRecord,
      timeline: [...(application.timeline || []), { 
        status: '已发放', 
        at: today, 
        by: distForm.distributor || '操作员',
        distQty: distForm.distQty,
        receiver: distForm.receiver || '',
        comment: distForm.distNote || '',
        action: 'dispatch'
      }]
    };
    const updatedRecords = records.map((item) => item.id === distForm.applicationId ? updatedItem : item);

    logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.DISPATCH,
      targetType: 'record',
      targetId: distForm.applicationId,
      beforeData: application,
      afterData: updatedItem,
      metadata: {
        distQty: distForm.distQty,
        receiver: distForm.receiver || '',
        distributor: distForm.distributor || '操作员',
        note: distForm.distNote || '',
        distRecordId: distRecord.id,
        ship: application.ship,
        partName: application.partName,
      },
      operator: distForm.distributor || operatorName,
    });

    persist(updatedRecords);
    if (selected?.id === distForm.applicationId) {
      setSelected(updatedRecords.find((item) => item.id === distForm.applicationId));
    }
    if (selectedApproval?.id === distForm.applicationId) {
      setSelectedApproval(updatedRecords.find((item) => item.id === distForm.applicationId));
    }
    setDistForm({ ...distConfig.defaultValues, applicationId: '' });
    setSelectedDist(distRecord);
  }

  const filteredRecords = useMemo(() => {
    return records
      .filter((item) => !filters.query || `${item.ship}${item.partName}${item.system}${item.location}`.includes(filters.query))
      .filter((item) => filters.ship === '全部' || item.ship === filters.ship)
      .filter((item) => filters.system === '全部' || item.system === filters.system)
      .filter((item) => filters.urgency === '全部' || item.urgency === filters.urgency)
      .filter((item) => filters.status === '全部' || item.status === filters.status)
      .sort((a, b) => {
        if (appConfig.sort === 'priority') {
          const rank = priorityRank(a.priority) - priorityRank(b.priority);
          if (rank !== 0) return rank;
        }
        const aDate = a[appConfig.dateKey] || a.sentAt || a.createdAt || '';
        const bDate = b[appConfig.dateKey] || b.sentAt || b.createdAt || '';
        return String(aDate).localeCompare(String(bDate));
      });
  }, [records, filters]);

  const filteredInventory = useMemo(() => {
    return inventory
      .filter((item) => !invFilters.query || `${item.partName}${item.system}${item.location}`.includes(invFilters.query))
      .filter((item) => invFilters.system === '全部' || item.system === invFilters.system)
      .filter((item) => !invFilters.lowStockOnly || isLowStock(item));
  }, [inventory, invFilters]);

  const shipMetrics = useMemo(() => {
    return appConfig.ships.map((ship) => {
      const shipRecords = records.filter((item) => item.ship === ship);
      return {
        ship,
        total: shipRecords.length,
        pending: shipRecords.filter((item) => item.status === '待审批').length,
        highUrgency: shipRecords.filter((item) => item.urgency === '高').length,
        issued: shipRecords.filter((item) => item.status === '已发放').length,
      };
    });
  }, [records]);

  const overallMetrics = [
    { label: "船舶总数", value: appConfig.ships.length },
    { label: "申请总数", value: records.length },
    { label: "待审批总数", value: records.filter((item) => item.status === '待审批').length },
    { label: "高紧急总数", value: records.filter((item) => item.urgency === '高').length },
    { label: "已发放总数", value: records.filter((item) => item.status === '已发放').length },
  ];

  const invMetrics = [
    { label: "库存种类", value: inventory.length },
    { label: "低库存预警", value: inventory.filter((item) => isLowStock(item)).length },
    { label: "总库存量", value: inventory.reduce((sum, item) => sum + (Number(item.currentStock) || 0), 0) },
  ];

  const groupedByDate = useMemo(() => {
    return filteredRecords.reduce((acc, item) => {
      const key = item[appConfig.dateKey] || item.date || item.enrollDate || '未排期';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredRecords]);

  const inventoryBySystem = useMemo(() => {
    return filteredInventory.reduce((acc, item) => {
      const key = item.system || '未分类';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredInventory]);

  const filteredTemplates = useMemo(() => {
    return templates
      .filter((item) => !templateFilters.query || `${item.templateName}${item.partName}${item.system}${item.location}`.includes(templateFilters.query))
      .filter((item) => templateFilters.system === '全部' || item.system === templateFilters.system);
  }, [templates, templateFilters]);

  const templateMetrics = [
    { label: "模板总数", value: templates.length },
    { label: "机舱系统", value: templates.filter((item) => item.system === '机舱').length },
    { label: "电气系统", value: templates.filter((item) => item.system === '电气').length },
  ];

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((item) => !purchaseFilters.query || `${item.ship}${item.partName}${item.system}${item.supplier || ''}`.includes(purchaseFilters.query))
      .filter((item) => purchaseFilters.status === '全部' || item.status === purchaseFilters.status)
      .filter((item) => purchaseFilters.ship === '全部' || item.ship === purchaseFilters.ship)
      .sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return String(dateB).localeCompare(String(dateA));
      });
  }, [purchases, purchaseFilters]);

  const purchaseMetrics = [
    { label: "采购任务总数", value: purchases.length },
    { label: "待下单", value: purchases.filter((item) => item.status === '待下单').length },
    { label: "已下单", value: purchases.filter((item) => item.status === '已下单').length },
    { label: "运输中", value: purchases.filter((item) => item.status === '运输中').length },
    { label: "已到货", value: purchases.filter((item) => item.status === '已到货').length },
  ];

  const purchasesByStatus = useMemo(() => {
    return filteredPurchases.reduce((acc, item) => {
      const key = item.status || '未分类';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredPurchases]);

  const templatesBySystem = useMemo(() => {
    return filteredTemplates.reduce((acc, item) => {
      const key = item.system || '未分类';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredTemplates]);

  const approvalPendingUrgent = useMemo(() => {
    return records
      .filter((item) => item.status === '待审批' && item.urgency === '高' && !wasDispatched(item))
      .filter((item) => !approvalSearch || `${item.ship}${item.partName}${item.system}${item.location}`.includes(approvalSearch))
      .filter((item) => approvalShip === '全部' || item.ship === approvalShip)
      .filter((item) => approvalSystem === '全部' || item.system === approvalSystem)
      .sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return String(dateB).localeCompare(String(dateA));
      });
  }, [records, approvalSearch, approvalShip, approvalSystem]);

  const approvalPendingNormal = useMemo(() => {
    return records
      .filter((item) => item.status === '待审批' && item.urgency !== '高' && !wasDispatched(item))
      .filter((item) => !approvalSearch || `${item.ship}${item.partName}${item.system}${item.location}`.includes(approvalSearch))
      .filter((item) => approvalShip === '全部' || item.ship === approvalShip)
      .filter((item) => approvalSystem === '全部' || item.system === approvalSystem)
      .sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return String(dateB).localeCompare(String(dateA));
      });
  }, [records, approvalSearch, approvalShip, approvalSystem]);

  const approvalProcessed = useMemo(() => {
    return records
      .filter((item) => item.status !== '待审批' || wasDispatched(item))
      .filter((item) => !approvalSearch || `${item.ship}${item.partName}${item.system}${item.location}`.includes(approvalSearch))
      .filter((item) => approvalShip === '全部' || item.ship === approvalShip)
      .filter((item) => approvalSystem === '全部' || item.system === approvalSystem)
      .sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return String(dateB).localeCompare(String(dateA));
      });
  }, [records, approvalSearch, approvalShip, approvalSystem]);

  const approvalMetrics = [
    { label: "待审批总数", value: records.filter((item) => item.status === '待审批' && !wasDispatched(item)).length },
    { label: "高紧急待审", value: records.filter((item) => item.status === '待审批' && item.urgency === '高' && !wasDispatched(item)).length },
    { label: "普通待审", value: records.filter((item) => item.status === '待审批' && item.urgency !== '高' && !wasDispatched(item)).length },
    { label: "已审批", value: records.filter((item) => item.status === '已批准').length },
    { label: "已驳回", value: records.filter((item) => item.status === '已驳回').length },
  ];

  const trendFilteredRecords = useMemo(() => {
    return records.filter((item) => {
      if (trendSystemFilter !== '全部' && item.system !== trendSystemFilter) {
        return false;
      }
      const createdAt = item.createdAt || '';
      const hasDate = !!createdAt;
      if (!hasDate) return true;
      const dateStr = createdAt.slice(0, 10);
      if (trendDateRange.start && dateStr < trendDateRange.start) return false;
      if (trendDateRange.end && dateStr > trendDateRange.end) return false;
      return true;
    });
  }, [records, trendDateRange, trendSystemFilter]);

  const trendNoDateCount = useMemo(() => {
    return trendFilteredRecords.filter((item) => !item.createdAt).length;
  }, [trendFilteredRecords]);

  const trendUniqueParts = useMemo(() => {
    const names = new Set(trendFilteredRecords.map((item) => item.partName).filter(Boolean));
    return names.size;
  }, [trendFilteredRecords]);

  const trendTotalQty = useMemo(() => {
    return trendFilteredRecords.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [trendFilteredRecords]);

  const trendHighUrgencyPct = useMemo(() => {
    if (trendFilteredRecords.length === 0) return 0;
    const highCount = trendFilteredRecords.filter((item) => item.urgency === '高').length;
    return Math.round((highCount / trendFilteredRecords.length) * 100);
  }, [trendFilteredRecords]);

  const trendTopParts = useMemo(() => {
    const map = {};
    trendFilteredRecords.forEach((item) => {
      const name = item.partName || '未命名备件';
      if (!map[name]) {
        map[name] = { name, system: item.system || '未分类', count: 0, totalQty: 0 };
      }
      map[name].count += 1;
      map[name].totalQty += Number(item.qty) || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, trendConfig.topN);
  }, [trendFilteredRecords]);

  const trendSystemStats = useMemo(() => {
    const total = trendFilteredRecords.length;
    if (total === 0) return [];
    const map = {};
    trendFilteredRecords.forEach((item) => {
      const sys = item.system || '未分类';
      if (!map[sys]) map[sys] = { name: sys, count: 0 };
      map[sys].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        pct: Math.round((item.count / total) * 100)
      }));
  }, [trendFilteredRecords]);

  const trendUrgencyStats = useMemo(() => {
    const total = trendFilteredRecords.length;
    if (total === 0) return [];
    const order = ['高', '中', '低'];
    const map = {};
    trendFilteredRecords.forEach((item) => {
      const urg = item.urgency || '中';
      if (!map[urg]) map[urg] = { name: urg, count: 0, level: urg === '高' ? 'high' : urg === '中' ? 'medium' : 'low' };
      map[urg].count += 1;
    });
    return order
      .filter((name) => map[name])
      .map((name) => ({
        ...map[name],
        pct: Math.round((map[name].count / total) * 100)
      }));
  }, [trendFilteredRecords]);

  const trendShipStats = useMemo(() => {
    const total = trendFilteredRecords.length;
    if (total === 0) return [];
    const map = {};
    trendFilteredRecords.forEach((item) => {
      const ship = item.ship || '未指定';
      if (!map[ship]) map[ship] = { name: ship, count: 0 };
      map[ship].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        pct: Math.round((item.count / total) * 100)
      }));
  }, [trendFilteredRecords]);

  return (
    <main className="shell" style={{ '--accent': activeTab === 'approval' ? '#ea580c' : activeTab === 'inventory' ? inventoryConfig.accent : activeTab === 'distribution' ? distConfig.accent : activeTab === 'templates' ? templateConfig.accent : activeTab === 'purchase' ? purchaseConfig.accent : activeTab === 'trend' ? trendConfig.accent : appConfig.accent }}>
      <section className="hero">
        <div>
          <div className="eyebrow">
            {activeTab === 'approval' ? <Gavel size={18} /> : activeTab === 'purchase' ? <ShoppingCart size={18} /> : activeTab === 'trend' ? <BarChart3 size={18} /> : <Ship size={18} />}
            {activeTab === 'approval' ? '审批管理' : activeTab === 'inventory' ? inventoryConfig.domain : activeTab === 'distribution' ? distConfig.domain : activeTab === 'templates' ? templateConfig.domain : activeTab === 'purchase' ? purchaseConfig.domain : activeTab === 'trend' ? trendConfig.domain : appConfig.domain}
          </div>
          <h1>{activeTab === 'approval' ? '审批工作台' : activeTab === 'inventory' ? inventoryConfig.title : activeTab === 'distribution' ? distConfig.title : activeTab === 'templates' ? templateConfig.title : activeTab === 'purchase' ? purchaseConfig.title : activeTab === 'trend' ? trendConfig.title : appConfig.title}</h1>
          <p>{activeTab === 'approval' ? '集中处理待审批备件申请，支持批准、驳回与调整批准数量' : activeTab === 'inventory' ? inventoryConfig.subtitle : activeTab === 'distribution' ? distConfig.subtitle : activeTab === 'templates' ? templateConfig.subtitle : activeTab === 'purchase' ? purchaseConfig.subtitle : activeTab === 'trend' ? trendConfig.subtitle : appConfig.subtitle}</p>
        </div>
        <div className="port-card">
          <span>Local Port</span>
          <strong>{appConfig.port}</strong>
        </div>
      </section>

      <div className="tabs">
        <button
          className={'tab ' + (activeTab === 'application' ? 'tab-active' : '')}
          onClick={() => setActiveTab('application')}
        >
          <ListTodo size={16} />
          申请列表
        </button>
        <button
          className={'tab ' + (activeTab === 'approval' ? 'tab-active' : '')}
          onClick={() => setActiveTab('approval')}
        >
          <Gavel size={16} />
          审批工作台
        </button>
        <button
          className={'tab ' + (activeTab === 'inventory' ? 'tab-active' : '')}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={16} />
          备件库存台账
        </button>
        <button
          className={'tab ' + (activeTab === 'distribution' ? 'tab-active' : '')}
          onClick={() => setActiveTab('distribution')}
        >
          <Truck size={16} />
          发放登记
        </button>
        <button
          className={'tab ' + (activeTab === 'templates' ? 'tab-active' : '')}
          onClick={() => setActiveTab('templates')}
        >
          <Bookmark size={16} />
          常用备件模板
        </button>
        <button
          className={'tab ' + (activeTab === 'purchase' ? 'tab-active' : '')}
          onClick={() => setActiveTab('purchase')}
        >
          <ShoppingCart size={16} />
          采购跟踪
        </button>
        <button
          className={'tab ' + (activeTab === 'trend' ? 'tab-active' : '')}
          onClick={() => setActiveTab('trend')}
        >
          <BarChart3 size={16} />
          需求趋势
        </button>
        <button
          className={'tab ' + (activeTab === 'sync' ? 'tab-active' : '')}
          onClick={() => setActiveTab('sync')}
        >
          <RefreshCw size={16} />
          同步管理
          {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </button>
        <button
          className={'tab ' + (activeTab === 'audit' ? 'tab-active' : '')}
          onClick={() => setActiveTab('audit')}
        >
          <Activity size={16} />
          审计与迁移
        </button>
      </div>

      {showMigrationAlert && migrationStatus && (
        <div className={'migration-alert ' + (migrationStatus.success ? 'migration-success' : 'migration-error')}>
          <div className="migration-alert-left">
            {migrationStatus.success ? <CheckCircle size={18} /> : <AlertOctagon size={18} />}
            <span>
              {migrationStatus.message}
              {migrationStatus.success && migrationStatus.migrated && `（已自动备份：v${migrationStatus.fromVersion}）`}
            </span>
          </div>
          <button className="migration-alert-close" onClick={() => setShowMigrationAlert(false)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="sync-status-bar">
        <div className="sync-status-left">
          <span className={'sync-indicator ' + (isOnline ? 'sync-online' : 'sync-offline')}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? '在线' : '离线'}
          </span>
          <span className="sync-status-divider">|</span>
          <span className="sync-status-text">
            待同步 <strong>{pendingCount}</strong> 条
            {unresolvedConflictCount > 0 && (
              <>
                <span className="sync-status-divider">|</span>
                <span className="sync-conflict-count">
                  <AlertTriangle size={12} /> 冲突 <strong>{unresolvedConflictCount}</strong> 个
                </span>
              </>
            )}
          </span>
          {syncMeta.lastSyncAt && (
            <>
              <span className="sync-status-divider">|</span>
              <span className="sync-last-sync">
                上次同步: {new Date(syncMeta.lastSyncAt).toLocaleString('zh-CN')}
              </span>
            </>
          )}
          <span className="sync-status-divider">|</span>
          <span className="sync-status-text">
            <Database size={12} /> 数据版本 <strong>v{dataVersion}</strong>
          </span>
        </div>
        <div className="sync-status-right">
          <span className="operator-label">
            <UserCheck size={12} /> 操作人:
          </span>
          <input
            type="text"
            className="operator-input"
            value={operatorName}
            onChange={(e) => {
              setOperatorName(e.target.value);
              setOperator(e.target.value);
            }}
            placeholder="输入操作人姓名"
            maxLength={20}
          />
          <button
            className="sync-toggle-btn"
            onClick={toggleForceOffline}
            title={forcedOffline ? '切换到在线模式' : '强制切换到离线模式'}
          >
            {forcedOffline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {forcedOffline ? '恢复在线' : '模拟离线'}
          </button>
          <button
            className="sync-now-btn"
            onClick={performSync}
            disabled={!isOnline || isSyncing || pendingCount === 0}
          >
            {isSyncing ? (
              <>
                <RefreshCw size={14} className="spin" />
                同步中...
              </>
            ) : (
              <>
                <Cloud size={14} />
                立即同步
              </>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'application' && (
        <>
          <section className="metrics">
            {overallMetrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="panel ship-dashboard">
            <div className="panel-title">
              <Ship size={18} />
              <h2>船舶申领看板</h2>
            </div>
            <div className="ship-grid">
              {shipMetrics.map((sm) => (
                <article
                  className={'ship-card ' + (filters.ship === sm.ship ? 'ship-card-active' : '')}
                  key={sm.ship}
                  onClick={() => setFilters({ ...filters, ship: filters.ship === sm.ship ? '全部' : sm.ship })}
                >
                  <div className="ship-card-head">
                    <Ship size={20} />
                    <h3>{sm.ship}</h3>
                  </div>
                  <div className="ship-stats">
                    <div className="ship-stat">
                      <span>申请总数</span>
                      <strong>{sm.total}</strong>
                    </div>
                    <div className="ship-stat ship-stat-pending">
                      <span>待审批</span>
                      <strong>{sm.pending}</strong>
                    </div>
                    <div className="ship-stat ship-stat-urgent">
                      <span>高紧急</span>
                      <strong>{sm.highUrgency}</strong>
                    </div>
                    <div className="ship-stat ship-stat-issued">
                      <span>已发放</span>
                      <strong>{sm.issued}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="workspace">
            <form className="panel form-panel" onSubmit={addRecord}>
              <div className="panel-title">
                <ClipboardList size={18} />
                <h2>新增记录</h2>
              </div>
              {templates.length > 0 && (
                <div className="template-apply-section">
                  <label className="wide">
                    <span>使用模板快速填充</span>
                    <div className="template-select-row">
                      <select
                        value={selectedApplyTemplate}
                        onChange={(event) => setSelectedApplyTemplate(event.target.value)}
                      >
                        <option value="">-- 选择模板 --</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.templateName} - {template.partName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="template-apply-btn"
                        onClick={() => selectedApplyTemplate && applyTemplate(selectedApplyTemplate)}
                        disabled={!selectedApplyTemplate}
                      >
                        <ArrowRightLeft size={14} />
                        套用
                      </button>
                    </div>
                  </label>
                </div>
              )}
              <div className="form-grid">
                {appConfig.fields.map((field) => (
                  <label key={field.key} className={field.type === 'textarea' ? 'wide' : ''}>
                    <span>{field.label}</span>
                    {field.type === 'textarea' ? (
                      <textarea value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} placeholder={field.placeholder} />
                    ) : field.type === 'select' ? (
                      <select value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}>
                        {field.options.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} placeholder={field.placeholder} />
                    )}
                  </label>
                ))}
                <label>
                  <span>当前状态</span>
                  <select value={form.status || appConfig.primaryStatus} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    {appConfig.statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              <button className="primary" type="submit"><Plus size={18} />新增</button>
              <button
                className="primary"
                type="button"
                style={{ background: '#0d9488', marginTop: '10px' }}
                onClick={() => { setShowImportModal(true); setImportText(''); setImportPreview(null); setImportTab('paste'); setImportPreviewTab('valid'); }}
              >
                <Upload size={18} />导入CSV
              </button>
              <p className="hint">{appConfig.note}</p>
            </form>

            <section className="panel list-panel">
              <div className="toolbar">
                <div className="search">
                  <Search size={16} />
                  <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="搜索备件/系统/船舶/位置" />
                </div>
                <select value={filters.ship} onChange={(event) => setFilters({ ...filters, ship: event.target.value })}>
                  <option value="全部">全部船舶</option>
                  {appConfig.ships.map((ship) => <option key={ship}>{ship}</option>)}
                </select>
                <select value={filters.system} onChange={(event) => setFilters({ ...filters, system: event.target.value })}>
                  <option value="全部">全部系统</option>
                  {appConfig.fields.find(f => f.key === 'system')?.options.map((sys) => <option key={sys}>{sys}</option>)}
                </select>
                <select value={filters.urgency} onChange={(event) => setFilters({ ...filters, urgency: event.target.value })}>
                  <option value="全部">全部紧急程度</option>
                  {appConfig.fields.find(f => f.key === 'urgency')?.options.map((u) => <option key={u}>{u}</option>)}
                </select>
                <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                  <option value="全部">全部状态</option>
                  {appConfig.statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>

              <div className="records">
                {filteredRecords.map((item) => (
                  <article className={'record record-ship ' + (item.conflict || hasOverlap(item, records) ? 'conflict' : '')} key={item.id} onClick={() => setSelected(item)}>
                    <div className="record-ship-tag">
                      <Ship size={13} />
                      <span>{item.ship}</span>
                    </div>
                    <div className="record-head">
                      <div>
                        <h3>{item.partName}</h3>
                        <p>{`${item.system} · ${item.location} · ${item.urgency}紧急`}</p>
                      </div>
                      <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                    </div>
                    <p className="record-detail">{`数量${item.qty}｜${item.reason}`}</p>
                    {(item.conflict || hasOverlap(item, records)) && <div className="warning"><AlertTriangle size={15} />发现冲突</div>}
                    {wasDispatched(item) && (
                      <div className="dispatched-lock">
                        <Lock size={14} />
                        <span>已发放出库，状态不可变更</span>
                      </div>
                    )}
                    <div className="actions" onClick={(event) => event.stopPropagation()}>
                      {appConfig.statuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={wasDispatched(item)}
                          onClick={() => updateStatus(item.id, status)}
                        >{status}</button>
                      ))}
                      <button
                        className="ghost-danger"
                        type="button"
                        disabled={wasDispatched(item)}
                        onClick={() => removeRecord(item.id)}
                      ><Trash2 size={14} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="insights">
            <div className="panel">
              <div className="panel-title">
                <CalendarDays size={18} />
                <h2>分组视图</h2>
              </div>
              <div className="date-groups">
                {Object.entries(groupedByDate).map(([date, items]) => (
                  <div key={date} className="date-group">
                    <strong>{date}</strong>
                    <span>{items.length}条记录</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="panel detail-panel">
              <div className="panel-title">
                <CheckCircle2 size={18} />
                <h2>详情</h2>
              </div>
              {selected ? (
                <div className="detail">
                  <div className="detail-ship-tag">
                    <Ship size={16} />
                    <span>{selected.ship}</span>
                  </div>
                  <h3>{selected.partName}</h3>
                  <p>{`${selected.system} · ${selected.location} · ${selected.urgency}紧急`}</p>
                  <p>{`数量${selected.qty}｜${selected.reason}`}</p>
                  <div className="detail-actions-bar">
                    <div className="detail-section-title">
                      <Activity size={16} />
                      <strong>完整操作历史</strong>
                    </div>
                    <button
                      type="button"
                      className="detail-export-btn"
                      onClick={() => {
                        const events = getAuditEventsByTarget('record', selected.id);
                        if (events.length === 0) {
                          alert('当前申请暂无审计日志记录。');
                          return;
                        }
                        const filterOptions = {
                          targetType: 'record',
                          targetId: selected.id,
                        };
                        const csv = exportAuditLogToCSV(filterOptions);
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const dateStr = new Date().toISOString().slice(0, 10);
                        const safePartName = (selected.partName || '申请').replace(/[\\/:*?"<>|]/g, '_');
                        link.download = `审计日志_${safePartName}_${selected.id.slice(-6)}_${dateStr}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download size={12} />
                      导出申请审计日志
                    </button>
                  </div>
                  {(() => {
                    const auditEvents = getAuditEventsByTarget('record', selected.id);
                    const timelineEvents = (selected.timeline || []).map((step, idx) => ({
                      id: `timeline_${idx}`,
                      source: 'timeline',
                      timestamp: step.at ? (step.at.includes('T') ? step.at : new Date(step.at).toISOString()) : new Date().toISOString(),
                      timestampMs: step.at ? new Date(step.at.includes('T') ? step.at : step.at).getTime() : Date.now(),
                      eventType: step.action || (
                        step.status === '已批准' ? 'approve' :
                        step.status === '已驳回' ? 'reject' :
                        step.status === '已发放' ? 'dispatch' :
                        step.status === '采购中' ? 'purchase-create' :
                        step.status === '已到货' ? 'purchase-arrive' :
                        step.status === '待审批' ? 'create' : 'update'
                      ),
                      operator: step.by || '系统',
                      status: step.status,
                      comment: step.comment,
                      approvedQty: step.approvedQty,
                      distQty: step.distQty,
                      receiver: step.receiver,
                    }));
                    const allEvents = [
                      ...timelineEvents,
                      ...auditEvents.map((e) => ({
                        ...e,
                        source: 'audit',
                        timestampMs: e.timestampMs || new Date(e.timestamp).getTime(),
                      })),
                    ].sort((a, b) => a.timestampMs - b.timestampMs);

                    const seen = new Set();
                    const mergedEvents = allEvents.filter((e) => {
                      const key = `${e.eventType}_${e.timestampMs}_${e.operator}`;
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });

                    const getEventIcon = (eventType) => {
                      switch (eventType) {
                        case 'create': return <Plus size={14} />;
                        case 'approve': return <CheckCircle size={14} />;
                        case 'reject': return <XCircle size={14} />;
                        case 'dispatch': return <Truck size={14} />;
                        case 'delete': return <Trash2 size={14} />;
                        case 'import': return <Upload size={14} />;
                        case 'purchase-create': return <ShoppingCart size={14} />;
                        case 'purchase-update': return <RefreshCw size={14} />;
                        case 'purchase-arrive': return <Package size={14} />;
                        case 'migration': return <Database size={14} />;
                        default: return <Activity size={14} />;
                      }
                    };

                    const getEventClass = (eventType) => {
                      switch (eventType) {
                        case 'create': return 'audit-ev-create';
                        case 'approve': return 'audit-ev-approve';
                        case 'reject': return 'audit-ev-reject';
                        case 'dispatch': return 'audit-ev-dispatch';
                        case 'delete': return 'audit-ev-delete';
                        case 'import': return 'audit-ev-import';
                        case 'purchase-create':
                        case 'purchase-update':
                        case 'purchase-arrive': return 'audit-ev-purchase';
                        case 'migration': return 'audit-ev-migration';
                        default: return '';
                      }
                    };

                    return (
                      <div className="audit-timeline">
                        {mergedEvents.length === 0 && <p className="empty">暂无操作记录</p>}
                        {mergedEvents.map((ev, idx) => (
                          <div key={ev.id || idx} className={'audit-timeline-item ' + getEventClass(ev.eventType)}>
                            <div className="audit-timeline-dot">
                              {getEventIcon(ev.eventType)}
                            </div>
                            <div className="audit-timeline-content">
                              <div className="audit-timeline-header">
                                <span className="audit-timeline-type">
                                  {AUDIT_EVENT_LABELS[ev.eventType] || ev.status || ev.eventType}
                                </span>
                                <span className="audit-timeline-meta">
                                  {new Date(ev.timestampMs).toLocaleString('zh-CN')} · {ev.operator}
                                </span>
                              </div>
                              {ev.status && <p className="audit-timeline-status">状态：{ev.status}</p>}
                              {ev.comment && <p className="audit-timeline-comment">意见：{ev.comment}</p>}
                              {ev.approvedQty && <p className="audit-timeline-detail">批准数量：{ev.approvedQty}</p>}
                              {ev.distQty && <p className="audit-timeline-detail">发放数量：{ev.distQty}</p>}
                              {ev.receiver && <p className="audit-timeline-detail">领取人：{ev.receiver}</p>}
                              {ev.metadata && typeof ev.metadata === 'object' && Object.keys(ev.metadata).length > 0 && ev.source === 'audit' && (
                                <div className="audit-timeline-meta-box">
                                  {Object.entries(ev.metadata).map(([k, v]) => (
                                    <span key={k} className="audit-meta-tag">
                                      {k}: {String(v).slice(0, 50)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {selected.distribution && (
                    <div className="dist-section">
                      <div className="dist-section-title">
                        <Truck size={15} />
                        <strong>发放信息</strong>
                      </div>
                      <div className="dist-field-list">
                        <div className="dist-field">
                          <span className="dist-field-label">发放数量</span>
                          <strong>{selected.distribution.distQty}</strong>
                        </div>
                        <div className="dist-field">
                          <span className="dist-field-label">领取人</span>
                          <strong>{selected.distribution.receiver || '-'}</strong>
                        </div>
                        <div className="dist-field">
                          <span className="dist-field-label">发放人</span>
                          <strong>{selected.distribution.distributor || '-'}</strong>
                        </div>
                        <div className="dist-field">
                          <span className="dist-field-label">备注</span>
                          <span>{selected.distribution.distNote || '无'}</span>
                        </div>
                        <div className="dist-field">
                          <span className="dist-field-label">发放时间</span>
                          <span>{selected.distribution.createdAt ? new Date(selected.distribution.createdAt).toLocaleString('zh-CN') : '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const relatedPurchases = getPurchasesByApplicationId(selected.id);
                    return (
                      <>
                        {relatedPurchases.length > 0 && (
                          <div className="purchase-section">
                            <div className="dist-section-title purchase-section-title">
                              <ShoppingCart size={15} />
                              <strong>关联采购任务</strong>
                            </div>
                            <div className="purchase-list">
                              {relatedPurchases.map((p) => (
                                <div key={p.id} className="purchase-item">
                                  <div className="purchase-item-head">
                                    <span className={'status purchase-status ' + purchaseStatusClass(p.status)}>{p.status}</span>
                                    <button
                                      type="button"
                                      className="purchase-item-view"
                                      onClick={() => {
                                        setSelectedPurchase(p);
                                        setActiveTab('purchase');
                                      }}
                                    >
                                      <ArrowRight size={12} />查看
                                    </button>
                                  </div>
                                  <div className="purchase-item-body">
                                    <p><Factory size={12} /> 供应商: {p.supplier || '-'}</p>
                                    <p><Package size={12} /> 采购数量: {p.purchaseQty}</p>
                                    {p.etaDate && <p><CalendarDays size={12} /> 预计到港: {p.etaDate}</p>}
                                    {p.arrivalDate && <p><Truck size={12} /> 实际到货: {p.arrivalDate}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(() => {
                          const invStatus = getInventoryStatus(selected);
                          const canCreatePurchase = selected.status === '已批准' && !wasDispatched(selected) && invStatus.lowStock;
                          if (!showCreatePurchaseFromApp) {
                            if (selected.status === '已批准' && !wasDispatched(selected)) {
                              return (
                                <>
                                  <div className="purchase-create-entry">
                                    <div className="dist-app-preview purchase-app-preview" style={{ borderColor: invStatus.lowStock ? '#f59e0b' : '#10b981', marginBottom: '10px' }}>
                                      <span className="dist-app-label">库存状态</span>
                                      {invStatus.noRecord ? (
                                        <span style={{ color: '#f59e0b' }}>⚠ 无库存记录，建议采购</span>
                                      ) : (
                                        <span>
                                          当前库存 <strong style={{ color: invStatus.lowStock ? '#f59e0b' : '#10b981' }}>{invStatus.currentStock}</strong>
                                          {invStatus.requiredQty > 0 && <> / 需求 {invStatus.requiredQty}</>}
                                          {invStatus.safetyStock > 0 && <> / 安全库存 {invStatus.safetyStock}</>}
                                          {invStatus.lowStock && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>⚠ 库存不足</span>}
                                          {!invStatus.lowStock && <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ 库存充足</span>}
                                        </span>
                                      )}
                                    </div>
                                    {canCreatePurchase && (
                                      <button
                                        className="primary"
                                        type="button"
                                        onClick={() => {
                                          setPurchaseForm({
                                            ...purchaseConfig.defaultValues,
                                            applicationId: selected.id,
                                            purchaseQty: selected.approvedQty || selected.qty
                                          });
                                          setShowCreatePurchaseFromApp(true);
                                        }}
                                      >
                                        <ShoppingCart size={14} />
                                        创建采购任务
                                      </button>
                                    )}
                                    {!canCreatePurchase && (
                                      <p className="hint" style={{ marginTop: '4px' }}>当前库存充足，可直接发放备件，无需采购。</p>
                                    )}
                                  </div>
                                </>
                              );
                            }
                            return null;
                          }
                          if (!invStatus.lowStock) {
                            return (
                              <div className="purchase-create-entry">
                                <div className="dist-app-preview purchase-app-preview" style={{ borderColor: '#10b981', marginBottom: '10px' }}>
                                  <span className="dist-app-label">库存状态</span>
                                  <span style={{ color: '#10b981' }}>✓ 当前库存充足，无需采购</span>
                                </div>
                                <button
                                  type="button"
                                  className="purchase-form-cancel"
                                  onClick={() => setShowCreatePurchaseFromApp(false)}
                                >
                                  返回
                                </button>
                              </div>
                            );
                          }
                          return (
                            <form className="purchase-create-form" onSubmit={addPurchase}>
                              <div className="dist-section-title purchase-section-title">
                                <ShoppingCart size={15} />
                                <strong>创建采购任务</strong>
                              </div>
                              <div className="form-grid">
                                <label className="wide">
                                  <span>供应商</span>
                                  <select
                                    value={purchaseForm.supplier}
                                    onChange={(event) => setPurchaseForm({ ...purchaseForm, supplier: event.target.value })}
                                  >
                                    <option value="">-- 请选择供应商 --</option>
                                    {purchaseConfig.suppliers.map((s) => (
                                      <option key={s}>{s}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  <span>采购数量</span>
                                  <input
                                    type="number"
                                    value={purchaseForm.purchaseQty}
                                    onChange={(event) => setPurchaseForm({ ...purchaseForm, purchaseQty: event.target.value })}
                                    placeholder="采购数量"
                                    min="1"
                                  />
                                </label>
                                <label>
                                  <span>预计到港日期</span>
                                  <input
                                    type="date"
                                    value={purchaseForm.etaDate}
                                    onChange={(event) => setPurchaseForm({ ...purchaseForm, etaDate: event.target.value })}
                                  />
                                </label>
                                <label className="wide">
                                  <span>采购备注</span>
                                  <textarea
                                    value={purchaseForm.purchaseNote}
                                    onChange={(event) => setPurchaseForm({ ...purchaseForm, purchaseNote: event.target.value })}
                                    placeholder="采购备注信息"
                                  />
                                </label>
                              </div>
                              <div className="purchase-form-actions">
                                <button className="primary" type="submit" disabled={!purchaseForm.supplier || !invStatus.lowStock}>
                                  <Plus size={14} />确认创建
                                </button>
                                <button
                                  type="button"
                                  className="purchase-form-cancel"
                                  onClick={() => {
                                    setPurchaseForm({ ...purchaseConfig.defaultValues, applicationId: '' });
                                    setShowCreatePurchaseFromApp(false);
                                  }}
                                >
                                  取消
                                </button>
                              </div>
                            </form>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="empty">点击任意记录查看详情和状态流转。</p>
              )}
            </aside>
          </section>
        </>
      )}

      {activeTab === 'approval' && (
        <>
          <section className="metrics">
            {approvalMetrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="workspace approval-workspace">
            <section className="panel approval-list-panel">
              <div className="toolbar">
                <div className="search">
                  <Search size={16} />
                  <input value={approvalSearch} onChange={(event) => setApprovalSearch(event.target.value)} placeholder="搜索备件/系统/船舶/位置" />
                </div>
                <select value={approvalShip} onChange={(event) => setApprovalShip(event.target.value)}>
                  <option value="全部">全部船舶</option>
                  {appConfig.ships.map((ship) => <option key={ship}>{ship}</option>)}
                </select>
                <select value={approvalSystem} onChange={(event) => setApprovalSystem(event.target.value)}>
                  <option value="全部">全部系统</option>
                  {appConfig.fields.find(f => f.key === 'system')?.options.map((sys) => <option key={sys}>{sys}</option>)}
                </select>
              </div>

              <div className="approval-sub-tabs">
                <button
                  className={'approval-sub-tab ' + (approvalSubTab === 'urgent' ? 'approval-sub-tab-active' : '')}
                  onClick={() => setApprovalSubTab('urgent')}
                >
                  <AlertTriangle size={14} />
                  高紧急待审
                  {approvalPendingUrgent.length > 0 && (
                    <span className="approval-badge approval-badge-urgent">{approvalPendingUrgent.length}</span>
                  )}
                </button>
                <button
                  className={'approval-sub-tab ' + (approvalSubTab === 'normal' ? 'approval-sub-tab-active' : '')}
                  onClick={() => setApprovalSubTab('normal')}
                >
                  <Clock size={14} />
                  普通待审
                  {approvalPendingNormal.length > 0 && (
                    <span className="approval-badge approval-badge-normal">{approvalPendingNormal.length}</span>
                  )}
                </button>
                <button
                  className={'approval-sub-tab ' + (approvalSubTab === 'processed' ? 'approval-sub-tab-active' : '')}
                  onClick={() => setApprovalSubTab('processed')}
                >
                  <Shield size={14} />
                  已处理
                </button>
              </div>

              <div className="records">
                {approvalSubTab === 'urgent' && approvalPendingUrgent.length === 0 && (
                  <p className="empty">暂无高紧急待审批申请。</p>
                )}
                {approvalSubTab === 'normal' && approvalPendingNormal.length === 0 && (
                  <p className="empty">暂无普通待审批申请。</p>
                )}
                {approvalSubTab === 'processed' && approvalProcessed.length === 0 && (
                  <p className="empty">暂无已处理记录。</p>
                )}
                {(approvalSubTab === 'urgent' ? approvalPendingUrgent : approvalSubTab === 'normal' ? approvalPendingNormal : approvalProcessed).map((item) => (
                  <article
                    className={'record approval-record ' + (item.urgency === '高' ? 'approval-record-urgent' : '') + (item.status === '已批准' ? ' approval-record-approved' : '') + (item.status === '已驳回' ? ' approval-record-rejected' : '') + (item.status === '已发放' ? ' approval-record-dispatched' : '')}
                    key={item.id}
                    onClick={() => { setSelectedApproval(item); setApprovalQty(''); setApprovalComment(''); setApprovalError(''); }}
                  >
                    <div className="record-ship-tag">
                      <Ship size={13} />
                      <span>{item.ship}</span>
                    </div>
                    <div className="record-head">
                      <div>
                        <h3>{item.partName}</h3>
                        <p>{`${item.system} · ${item.location} · ${item.urgency}紧急`}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        {item.urgency === '高' && (
                          <span className="urgency-tag urgency-high">
                            <AlertTriangle size={12} />
                            高紧急
                          </span>
                        )}
                        <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                      </div>
                    </div>
                    <p className="record-detail">{`需求数量${item.qty}` + (item.approvedQty && item.approvedQty !== item.qty ? ` → 批准数量${item.approvedQty}` : '') + `｜${item.reason}`}</p>
                    {wasDispatched(item) && (
                      <div className="approval-dispatched-tag">
                        <Truck size={14} />
                        <span>已发放，不可重复审批</span>
                      </div>
                    )}
                    {item.approvalComment && (
                      <div className="approval-comment-preview">
                        <MessageSquare size={13} />
                        <span>{item.approvalComment}</span>
                      </div>
                    )}
                    {item.status === '待审批' && !wasDispatched(item) && (
                      <div className="approval-actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="approval-btn-approve"
                          type="button"
                          onClick={() => handleApprove(item.id)}
                        >
                          <CheckCircle size={14} />
                          批准
                        </button>
                        <button
                          className="approval-btn-reject"
                          type="button"
                          onClick={() => handleReject(item.id)}
                        >
                          <XCircle size={14} />
                          驳回
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <aside className="panel approval-detail-panel">
              <div className="panel-title">
                <Gavel size={18} />
                <h2>审批操作</h2>
              </div>
              {selectedApproval ? (
                <div className="detail">
                  <div className="detail-ship-tag">
                    <Ship size={16} />
                    <span>{selectedApproval.ship}</span>
                  </div>
                  <h3>{selectedApproval.partName}</h3>
                  <p>{`${selectedApproval.system} · ${selectedApproval.location} · ${selectedApproval.urgency}紧急`}</p>
                  <div className="approval-info-grid">
                    <div className="stock-item">
                      <span>需求数量</span>
                      <strong>{selectedApproval.qty}</strong>
                    </div>
                    {selectedApproval.approvedQty && (
                      <div className="stock-item">
                        <span>批准数量</span>
                        <strong className="approval-qty-approved">{selectedApproval.approvedQty}</strong>
                      </div>
                    )}
                  </div>
                  <p>{`申请原因：${selectedApproval.reason}`}</p>

                  {selectedApproval.status === '待审批' && !wasDispatched(selectedApproval) ? (
                    <div className="approval-form-section">
                      <div className="approval-form-divider">
                        <Edit3 size={14} />
                        <span>审批操作</span>
                      </div>
                      {approvalError && (
                        <div className="approval-error">
                          <AlertTriangle size={14} />
                          <span>{approvalError}</span>
                        </div>
                      )}
                      <label className="approval-field">
                        <span>审批角色</span>
                        <select
                          value={approvalRole}
                          onChange={(event) => setApprovalRole(event.target.value)}
                        >
                          <option value="轮机长">轮机长</option>
                          <option value="物料管理员">物料管理员</option>
                        </select>
                      </label>
                      <label className="approval-field">
                        <span>调整批准数量</span>
                        <input
                          type="number"
                          value={approvalQty}
                          onChange={(event) => setApprovalQty(event.target.value)}
                          placeholder={`默认批准 ${selectedApproval.qty}`}
                          min="1"
                        />
                      </label>
                      <label className="approval-field">
                        <span>审批意见</span>
                        <textarea
                          value={approvalComment}
                          onChange={(event) => setApprovalComment(event.target.value)}
                          placeholder="填写审批意见（驳回时必填）"
                        />
                      </label>
                      <div className="approval-form-actions">
                        <button
                          className="approval-btn-approve-lg"
                          type="button"
                          onClick={() => handleApprove(selectedApproval.id)}
                        >
                          <CheckCircle size={16} />
                          批准
                        </button>
                        <button
                          className="approval-btn-reject-lg"
                          type="button"
                          onClick={() => handleReject(selectedApproval.id)}
                        >
                          <XCircle size={16} />
                          驳回
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="approval-processed-section">
                      <div className="approval-processed-tag">
                        {selectedApproval.status === '已批准' && !wasDispatched(selectedApproval) && <CheckCircle size={18} className="icon-approved" />}
                        {selectedApproval.status === '已驳回' && <XCircle size={18} className="icon-rejected" />}
                        {(selectedApproval.status === '已发放' || wasDispatched(selectedApproval)) && <Truck size={18} className="icon-dispatched" />}
                        <span>{wasDispatched(selectedApproval) ? '已发放' : selectedApproval.status}</span>
                      </div>
                      {wasDispatched(selectedApproval) && (
                        <div className="approval-dispatched-warning">
                          <Shield size={14} />
                          <span>该备件已发放出库，不可重复审批</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="approval-timeline-section">
                    <div className="approval-form-divider">
                      <Clock size={14} />
                      <span>状态流转时间线</span>
                    </div>
                    <div className="approval-timeline">
                      {(selectedApproval.timeline || []).map((step, index) => (
                        <div key={index} className={'approval-timeline-item ' + (step.action === 'approve' ? 'timeline-approved' : step.action === 'reject' ? 'timeline-rejected' : step.action === 'dispatch' ? 'timeline-dispatched' : '')}>
                          <div className="timeline-dot" />
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <strong>{step.status}</strong>
                              <span className="timeline-meta">{step.at} · {step.by}</span>
                            </div>
                            {step.approvedQty && (
                              <p className="timeline-detail">批准数量: {step.approvedQty}</p>
                            )}
                            {step.distQty && (
                              <p className="timeline-detail">发放数量: {step.distQty}</p>
                            )}
                            {step.receiver && (
                              <p className="timeline-detail">领取人: {step.receiver}</p>
                            )}
                            {step.comment && (
                              <p className="timeline-detail">意见: {step.comment}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty">点击左侧待审批申请，进行审批操作。</p>
              )}
            </aside>
          </section>
        </>
      )}

      {activeTab === 'inventory' && (
        <>
          <section className="metrics">
            {invMetrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="workspace">
            <form className="panel form-panel" onSubmit={addInventory}>
              <div className="panel-title">
                <ClipboardList size={18} />
                <h2>新增库存记录</h2>
              </div>
              <div className="form-grid">
                {inventoryConfig.fields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    {field.type === 'select' ? (
                      <select value={invForm[field.key] || ''} onChange={(event) => setInvForm({ ...invForm, [field.key]: event.target.value })}>
                        {field.options.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} value={invForm[field.key] || ''} onChange={(event) => setInvForm({ ...invForm, [field.key]: event.target.value })} placeholder={field.placeholder} />
                    )}
                  </label>
                ))}
              </div>
              <button className="primary" type="submit"><Plus size={18} />新增</button>
              <p className="hint">库存低于安全库存时将自动标记为预警状态。</p>
            </form>

            <section className="panel list-panel">
              <div className="toolbar">
                <div className="search">
                  <Search size={16} />
                  <input value={invFilters.query} onChange={(event) => setInvFilters({ ...invFilters, query: event.target.value })} placeholder="备件名称/系统/位置" />
                </div>
                <select value={invFilters.system} onChange={(event) => setInvFilters({ ...invFilters, system: event.target.value })}>
                  <option>全部</option>
                  {inventoryConfig.systems.map((sys) => <option key={sys}>{sys}</option>)}
                </select>
                <label className="filter-checkbox">
                  <input type="checkbox" checked={invFilters.lowStockOnly} onChange={(event) => setInvFilters({ ...invFilters, lowStockOnly: event.target.checked })} />
                  仅看低库存
                </label>
              </div>

              <div className="records">
                {filteredInventory.map((item) => {
                  const low = isLowStock(item);
                  return (
                    <article className={'record ' + (low ? 'low-stock' : '')} key={item.id} onClick={() => setSelectedInv(item)}>
                      <div className="record-head">
                        <div>
                          <h3>{item.partName}</h3>
                          <p>{`${item.system} · ${item.location}`}</p>
                        </div>
                        {low ? (
                          <span className="status status-low"><AlertTriangle size={12} />低库存</span>
                        ) : (
                          <span className="status status-ok">正常</span>
                        )}
                      </div>
                      <p className="record-detail">
                        {`当前库存: ${item.currentStock}｜安全库存: ${item.safetyStock}｜盘点日期: ${item.lastCheckDate || '未记录'}`}
                      </p>
                      {low && <div className="warning"><AlertTriangle size={15} />库存低于安全库存，请及时补货</div>}
                      <div className="actions" onClick={(event) => event.stopPropagation()}>
                        {low && (
                          <button
                            className="primary"
                            type="button"
                            style={{ background: '#ea580c', padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => createRequestFromLowStock(item)}
                          >
                            <ShoppingCart size={14} />
                            生成申请
                          </button>
                        )}
                        <button className="ghost-danger" type="button" onClick={() => removeInventory(item.id)}><Trash2 size={14} />删除</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>

          <section className="insights">
            <div className="panel">
              <div className="panel-title">
                <CalendarDays size={18} />
                <h2>按系统分类</h2>
              </div>
              <div className="date-groups">
                {Object.entries(inventoryBySystem).map(([system, items]) => {
                  const lowCount = items.filter(i => isLowStock(i)).length;
                  return (
                    <div key={system} className="date-group">
                      <strong>{system}</strong>
                      <span>{items.length}种备件</span>
                      {lowCount > 0 && <span className="low-count">{lowCount}项低库存</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="panel detail-panel">
              <div className="panel-title">
                <CheckCircle2 size={18} />
                <h2>库存详情</h2>
              </div>
              {selectedInv ? (
                <div className="detail">
                  <h3>{selectedInv.partName}</h3>
                  <p>{`${selectedInv.system} · ${selectedInv.location}`}</p>
                  <div className="stock-info">
                    <div className="stock-item">
                      <span>当前库存</span>
                      <strong className={isLowStock(selectedInv) ? 'stock-low' : 'stock-ok'}>{selectedInv.currentStock}</strong>
                    </div>
                    <div className="stock-item">
                      <span>安全库存</span>
                      <strong>{selectedInv.safetyStock}</strong>
                    </div>
                  </div>
                  {isLowStock(selectedInv) && (
                    <div className="stock-warning">
                      <AlertTriangle size={16} />
                      <span>库存不足，请尽快申请补货</span>
                    </div>
                  )}
                  <p>{`最后盘点日期: ${selectedInv.lastCheckDate || '未记录'}`}</p>
                  {isLowStock(selectedInv) && (
                    <button
                      className="primary"
                      type="button"
                      style={{ background: '#ea580c', marginTop: '16px', width: '100%' }}
                      onClick={() => createRequestFromLowStock(selectedInv)}
                    >
                      <ShoppingCart size={16} />
                      从此低库存生成申请
                    </button>
                  )}
                </div>
              ) : (
                <p className="empty">点击任意库存记录查看详情。</p>
              )}
            </aside>
          </section>
        </>
      )}

      {activeTab === 'distribution' && (
        <>
          <section className="metrics">
            <article className="metric">
              <span>待发放</span>
              <strong>{records.filter((item) => item.status === '已批准').length}</strong>
            </article>
            <article className="metric">
              <span>已发放</span>
              <strong>{distRecords.length}</strong>
            </article>
            <article className="metric">
              <span>本月发放</span>
              <strong>{distRecords.filter((item) => item.createdAt && item.createdAt.startsWith(new Date().toISOString().slice(0, 7))).length}</strong>
            </article>
          </section>

          <section className="workspace">
            <form className="panel form-panel" onSubmit={addDistribution}>
              <div className="panel-title">
                <Truck size={18} />
                <h2>发放登记</h2>
              </div>
              <div className="form-grid">
                <label className="wide">
                  <span>选择已批准申请</span>
                  <select
                    value={distForm.applicationId}
                    onChange={(event) => setDistForm({ ...distForm, applicationId: event.target.value })}
                  >
                    <option value="">-- 请选择 --</option>
                    {records
                      .filter((item) => item.status === '已批准' && !wasDispatched(item))
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.partName} - {item.system} - 需求{item.qty}
                        </option>
                      ))}
                  </select>
                </label>
                {distForm.applicationId && (() => {
                  const app = records.find((item) => item.id === distForm.applicationId);
                  return app ? (
                    <div className="wide dist-app-preview">
                      <span className="dist-app-label">申请信息</span>
                      <span>{app.partName} | {app.system} · {app.location} | 需求{app.qty} | {app.urgency}紧急</span>
                    </div>
                  ) : null;
                })()}
                {distConfig.fields.map((field) => (
                  <label key={field.key} className={field.type === 'textarea' ? 'wide' : ''}>
                    <span>{field.label}</span>
                    {field.type === 'textarea' ? (
                      <textarea value={distForm[field.key] || ''} onChange={(event) => setDistForm({ ...distForm, [field.key]: event.target.value })} placeholder={field.placeholder} />
                    ) : (
                      <input type={field.type} value={distForm[field.key] || ''} onChange={(event) => setDistForm({ ...distForm, [field.key]: event.target.value })} placeholder={field.placeholder} />
                    )}
                  </label>
                ))}
              </div>
              <button className="primary" type="submit" disabled={!distForm.applicationId}>
                <Truck size={18} />确认发放
              </button>
              <p className="hint">选择已批准的申请，填写发放信息后提交。提交后申请状态将变为"已发放"。</p>
            </form>

            <section className="panel list-panel">
              <div className="panel-title">
                <ClipboardList size={18} />
                <h2>发放记录</h2>
              </div>
              <div className="records">
                {distRecords.length === 0 ? (
                  <p className="empty">暂无发放记录。</p>
                ) : (
                  distRecords.map((item) => (
                    <article className="record dist-record" key={item.id} onClick={() => setSelectedDist(item)}>
                      <div className="record-head">
                        <div>
                          <h3>{item.partName}</h3>
                          <p>{`${item.system} · ${item.location}`}</p>
                        </div>
                        <span className="status status-dist">已发放</span>
                      </div>
                      <p className="record-detail">
                        {`发放${item.distQty}件 | 领取人: ${item.receiver || '-'} | 发放人: ${item.distributor || '-'}`}
                      </p>
                      {item.distNote && <p className="record-detail">{`备注: ${item.distNote}`}</p>}
                      <div className="actions" onClick={(event) => event.stopPropagation()}>
                        <button className="ghost-danger" type="button" onClick={() => {
                          const next = distRecords.filter((d) => d.id !== item.id);
                          persistDist(next);
                          if (selectedDist?.id === item.id) setSelectedDist(null);
                        }}><Trash2 size={14} />删除</button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="insights">
            <div className="panel">
              <div className="panel-title">
                <CalendarDays size={18} />
                <h2>发放统计</h2>
              </div>
              <div className="date-groups">
                {Object.entries(
                  distRecords.reduce((acc, item) => {
                    const key = item.system || '未分类';
                    (acc[key] ||= []).push(item);
                    return acc;
                  }, {})
                ).map(([system, items]) => (
                  <div key={system} className="date-group">
                    <strong>{system}</strong>
                    <span>{items.length}条发放</span>
                  </div>
                ))}
                {distRecords.length === 0 && <p className="empty">暂无发放统计数据。</p>}
              </div>
            </div>

            <aside className="panel detail-panel">
              <div className="panel-title">
                <CheckCircle2 size={18} />
                <h2>发放详情</h2>
              </div>
              {selectedDist ? (
                <div className="detail">
                  <h3>{selectedDist.partName}</h3>
                  <p>{`${selectedDist.system} · ${selectedDist.location}`}</p>
                  <div className="dist-info-grid">
                    <div className="stock-item">
                      <span>需求数量</span>
                      <strong>{selectedDist.qty}</strong>
                    </div>
                    <div className="stock-item">
                      <span>发放数量</span>
                      <strong className="dist-qty">{selectedDist.distQty}</strong>
                    </div>
                  </div>
                  <div className="dist-field-list">
                    <div className="dist-field">
                      <UserCheck size={15} />
                      <span className="dist-field-label">领取人</span>
                      <strong>{selectedDist.receiver || '-'}</strong>
                    </div>
                    <div className="dist-field">
                      <UserCheck size={15} />
                      <span className="dist-field-label">发放人</span>
                      <strong>{selectedDist.distributor || '-'}</strong>
                    </div>
                    <div className="dist-field">
                      <FileText size={15} />
                      <span className="dist-field-label">备注</span>
                      <span>{selectedDist.distNote || '无'}</span>
                    </div>
                    <div className="dist-field">
                      <CalendarDays size={15} />
                      <span className="dist-field-label">发放时间</span>
                      <span>{selectedDist.createdAt ? new Date(selectedDist.createdAt).toLocaleString('zh-CN') : '-'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty">点击任意发放记录查看详情。</p>
              )}
            </aside>
          </section>
        </>
      )}

      {activeTab === 'templates' && (
        <>
          <section className="metrics">
            {templateMetrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="workspace">
            <form className="panel form-panel" onSubmit={addTemplate}>
              <div className="panel-title">
                <Bookmark size={18} />
                <h2>新增模板</h2>
              </div>
              <div className="form-grid">
                {templateConfig.fields.map((field) => (
                  <label key={field.key} className={field.type === 'textarea' ? 'wide' : ''}>
                    <span>{field.label}</span>
                    {field.type === 'textarea' ? (
                      <textarea value={templateForm[field.key] || ''} onChange={(event) => setTemplateForm({ ...templateForm, [field.key]: event.target.value })} placeholder={field.placeholder} />
                    ) : field.type === 'select' ? (
                      <select value={templateForm[field.key] || ''} onChange={(event) => setTemplateForm({ ...templateForm, [field.key]: event.target.value })}>
                        {field.options.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} value={templateForm[field.key] || ''} onChange={(event) => setTemplateForm({ ...templateForm, [field.key]: event.target.value })} placeholder={field.placeholder} />
                    )}
                  </label>
                ))}
              </div>
              <button className="primary" type="submit"><Plus size={18} />保存模板</button>
              <p className="hint">保存常用备件模板后，在新增申请时可以一键套用模板字段。</p>
            </form>

            <section className="panel list-panel">
              <div className="toolbar">
                <div className="search">
                  <Search size={16} />
                  <input value={templateFilters.query} onChange={(event) => setTemplateFilters({ ...templateFilters, query: event.target.value })} placeholder="模板名称/备件/系统/位置" />
                </div>
                <select value={templateFilters.system} onChange={(event) => setTemplateFilters({ ...templateFilters, system: event.target.value })}>
                  <option>全部</option>
                  {templateConfig.fields.find(f => f.key === 'system')?.options.map((sys) => <option key={sys}>{sys}</option>)}
                </select>
              </div>

              <div className="records">
                {filteredTemplates.length === 0 ? (
                  <p className="empty">暂无模板。</p>
                ) : (
                  filteredTemplates.map((item) => (
                    <article className="record template-record" key={item.id} onClick={() => setSelectedTemplate(item)}>
                      <div className="record-head">
                        <div>
                          <h3>{item.templateName}</h3>
                          <p>{`${item.partName} · ${item.system}`}</p>
                        </div>
                        <span className="status status-template">{item.system}</span>
                      </div>
                      <p className="record-detail">{`位置: ${item.location}｜数量: ${item.qty}`}</p>
                      <p className="record-detail">{`原因: ${item.reason}`}</p>
                      <div className="actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="ghost-apply"
                          onClick={() => {
                            applyTemplate(item.id);
                            setActiveTab('application');
                          }}
                        >
                          <ArrowRightLeft size={14} />
                          申请套用
                        </button>
                        <button className="ghost-danger" type="button" onClick={() => removeTemplate(item.id)}><Trash2 size={14} />删除</button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="insights">
            <div className="panel">
              <div className="panel-title">
                <CalendarDays size={18} />
                <h2>按系统分类</h2>
              </div>
              <div className="date-groups">
                {Object.entries(templatesBySystem).map(([system, items]) => (
                  <div key={system} className="date-group">
                    <strong>{system}</strong>
                    <span>{items.length}个模板</span>
                  </div>
                ))}
                {filteredTemplates.length === 0 && <p className="empty">暂无模板分类数据。</p>}
              </div>
            </div>

            <aside className="panel detail-panel">
              <div className="panel-title">
                <CheckCircle2 size={18} />
                <h2>模板详情</h2>
              </div>
              {selectedTemplate ? (
                <div className="detail">
                  <h3>{selectedTemplate.templateName}</h3>
                  <p>{`${selectedTemplate.partName} · ${selectedTemplate.system}`}</p>
                  <div className="stock-info">
                    <div className="stock-item">
                      <span>默认位置</span>
                      <strong>{selectedTemplate.location}</strong>
                    </div>
                    <div className="stock-item">
                      <span>默认数量</span>
                      <strong>{selectedTemplate.qty}</strong>
                    </div>
                  </div>
                  <div className="template-reason">
                    <span className="dist-field-label">常用申请原因</span>
                    <p>{selectedTemplate.reason}</p>
                  </div>
                  <button
                    className="primary"
                    type="button"
                    onClick={() => {
                      applyTemplate(selectedTemplate.id);
                      setActiveTab('application');
                    }}
                  >
                    <ArrowRightLeft size={14} />
                    一键套用并新增申请
                  </button>
                </div>
              ) : (
                <p className="empty">点击任意模板查看详情，可一键套用创建申请。</p>
              )}
            </aside>
          </section>
        </>
      )}

      {activeTab === 'purchase' && (
        <>
          <section className="metrics">
            {purchaseMetrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="workspace">
            <form className="panel form-panel" onSubmit={addPurchase}>
              <div className="panel-title">
                <ShoppingCart size={18} />
                <h2>创建采购任务</h2>
              </div>
              <div className="form-grid">
                <label className="wide">
                  <span>关联申请（已批准）</span>
                  <select
                    value={purchaseForm.applicationId}
                    onChange={(event) => {
                      const appId = event.target.value;
                      const app = records.find((item) => item.id === appId);
                      setPurchaseForm({
                        ...purchaseForm,
                        applicationId: appId,
                        purchaseQty: app ? (app.approvedQty || app.qty) : ''
                      });
                    }}
                  >
                    <option value="">-- 请选择申请 --</option>
                    {records
                      .filter((item) => item.status === '已批准' && !wasDispatched(item) && needsPurchase(item))
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.partName} - {item.ship} - {item.system} - 需求{item.qty}
                        </option>
                      ))}
                  </select>
                </label>
                {(() => {
                  const approvedCount = records.filter((item) => item.status === '已批准' && !wasDispatched(item)).length;
                  const purchasableCount = records.filter((item) => item.status === '已批准' && !wasDispatched(item) && needsPurchase(item)).length;
                  if (approvedCount > purchasableCount) {
                    return <p className="hint wide" style={{ marginTop: '-6px' }}>共 {approvedCount} 条已批准申请，其中 {approvedCount - purchasableCount} 条库存充足暂不可创建采购。</p>;
                  }
                  return null;
                })()}
                {purchaseForm.applicationId && (() => {
                  const app = records.find((item) => item.id === purchaseForm.applicationId);
                  if (!app) return null;
                  const invStatus = getInventoryStatus(app);
                  return (
                    <>
                      <div className="wide dist-app-preview purchase-app-preview">
                        <span className="dist-app-label">申请信息</span>
                        <span>{app.partName} | {app.ship} · {app.system} · {app.location} | 需求{app.qty} | {app.urgency}紧急</span>
                      </div>
                      <div className="wide dist-app-preview purchase-app-preview" style={{ borderColor: invStatus.lowStock ? '#f59e0b' : '#10b981' }}>
                        <span className="dist-app-label">库存状态</span>
                        {invStatus.noRecord ? (
                          <span style={{ color: '#f59e0b' }}>⚠ 无库存记录，需采购</span>
                        ) : (
                          <span>
                            当前库存 <strong style={{ color: invStatus.lowStock ? '#f59e0b' : '#10b981' }}>{invStatus.currentStock}</strong>
                            {invStatus.requiredQty > 0 && <> / 需求 {invStatus.requiredQty}</>}
                            {invStatus.safetyStock > 0 && <> / 安全库存 {invStatus.safetyStock}</>}
                            {invStatus.lowStock && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>⚠ 库存不足</span>}
                            {!invStatus.lowStock && <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ 库存充足</span>}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
                <label className="wide">
                  <span>供应商</span>
                  <select
                    value={purchaseForm.supplier}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, supplier: event.target.value })}
                  >
                    <option value="">-- 请选择供应商 --</option>
                    {purchaseConfig.suppliers.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>采购数量</span>
                  <input
                    type="number"
                    value={purchaseForm.purchaseQty}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, purchaseQty: event.target.value })}
                    placeholder="采购数量"
                    min="1"
                  />
                </label>
                <label>
                  <span>预计到港日期</span>
                  <input
                    type="date"
                    value={purchaseForm.etaDate}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, etaDate: event.target.value })}
                  />
                </label>
                <label>
                  <span>实际到货日期（可选）</span>
                  <input
                    type="date"
                    value={purchaseForm.arrivalDate}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, arrivalDate: event.target.value })}
                  />
                </label>
                <label className="wide">
                  <span>采购备注</span>
                  <textarea
                    value={purchaseForm.purchaseNote}
                    onChange={(event) => setPurchaseForm({ ...purchaseForm, purchaseNote: event.target.value })}
                    placeholder="采购备注信息"
                  />
                </label>
              </div>
              <button className="primary" type="submit" disabled={!purchaseForm.applicationId || !purchaseForm.supplier}>
                <Plus size={18} />创建采购任务
              </button>
              <p className="hint">选择已批准的申请，填写采购信息后提交。到货后可在采购列表中更新状态。</p>
            </form>

            <section className="panel list-panel">
              <div className="toolbar">
                <div className="search">
                  <Search size={16} />
                  <input value={purchaseFilters.query} onChange={(event) => setPurchaseFilters({ ...purchaseFilters, query: event.target.value })} placeholder="搜索备件/供应商/船舶/系统" />
                </div>
                <select value={purchaseFilters.ship} onChange={(event) => setPurchaseFilters({ ...purchaseFilters, ship: event.target.value })}>
                  <option value="全部">全部船舶</option>
                  {appConfig.ships.map((ship) => <option key={ship}>{ship}</option>)}
                </select>
                <select value={purchaseFilters.status} onChange={(event) => setPurchaseFilters({ ...purchaseFilters, status: event.target.value })}>
                  <option value="全部">全部状态</option>
                  {purchaseConfig.statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="records">
                {filteredPurchases.length === 0 ? (
                  <p className="empty">暂无采购任务。</p>
                ) : (
                  filteredPurchases.map((item) => (
                    <article className="record purchase-record" key={item.id} onClick={() => setSelectedPurchase(item)}>
                      <div className="record-ship-tag purchase-ship-tag">
                        <Ship size={13} />
                        <span>{item.ship}</span>
                      </div>
                      <div className="record-head">
                        <div>
                          <h3>{item.partName}</h3>
                          <p>{`${item.system} · ${item.location}`}</p>
                        </div>
                        <span className={'status purchase-status ' + purchaseStatusClass(item.status)}>{item.status}</span>
                      </div>
                      <p className="record-detail">
                        {`采购${item.purchaseQty}件 | 供应商: ${item.supplier || '-'}`}
                      </p>
                      {item.etaDate && <p className="record-detail">{`预计到港: ${item.etaDate}${item.arrivalDate ? ` | 实际到货: ${item.arrivalDate}` : ''}`}</p>}
                      {item.purchaseNote && <p className="record-detail">{`备注: ${item.purchaseNote}`}</p>}
                      {item.status === '运输中' && isOverdue(item.etaDate) && (
                        <div className="warning"><AlertTriangle size={15} />已超过预计到港日期</div>
                      )}
                      <div className="actions" onClick={(event) => event.stopPropagation()}>
                        {purchaseConfig.statuses.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={item.status === '已到货'}
                            onClick={() => updatePurchaseStatus(item.id, status)}
                          >{status}</button>
                        ))}
                        <button className="ghost-danger" type="button" onClick={() => removePurchase(item.id)}><Trash2 size={14} /></button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="insights">
            <div className="panel">
              <div className="panel-title">
                <CalendarDays size={18} />
                <h2>按采购状态分组</h2>
              </div>
              <div className="date-groups">
                {Object.entries(purchasesByStatus).map(([status, items]) => (
                  <div key={status} className="date-group">
                    <strong>{status}</strong>
                    <span>{items.length}条采购</span>
                  </div>
                ))}
                {filteredPurchases.length === 0 && <p className="empty">暂无采购统计数据。</p>}
              </div>
            </div>

            <aside className="panel detail-panel">
              <div className="panel-title">
                <CheckCircle2 size={18} />
                <h2>采购详情</h2>
              </div>
              {selectedPurchase ? (
                <div className="detail">
                  <div className="detail-ship-tag">
                    <Ship size={16} />
                    <span>{selectedPurchase.ship}</span>
                  </div>
                  <h3>{selectedPurchase.partName}</h3>
                  <p>{`${selectedPurchase.system} · ${selectedPurchase.location} · ${selectedPurchase.urgency || '中'}紧急`}</p>
                  <div className="stock-info">
                    <div className="stock-item">
                      <span>需求数量</span>
                      <strong>{selectedPurchase.qty}</strong>
                    </div>
                    <div className="stock-item">
                      <span>采购数量</span>
                      <strong className="purchase-qty-display">{selectedPurchase.purchaseQty}</strong>
                    </div>
                  </div>
                  <div className="purchase-detail-section">
                    <div className="purchase-detail-item">
                      <Factory size={15} />
                      <span className="dist-field-label">供应商</span>
                      <strong>{selectedPurchase.supplier || '-'}</strong>
                    </div>
                    <div className="purchase-detail-item">
                      <CalendarDays size={15} />
                      <span className="dist-field-label">预计到港</span>
                      <span>{selectedPurchase.etaDate || '未设置'}</span>
                    </div>
                    <div className="purchase-detail-item">
                      <Truck size={15} />
                      <span className="dist-field-label">实际到货</span>
                      <span>{selectedPurchase.arrivalDate || '未到货'}</span>
                    </div>
                    <div className="purchase-detail-item">
                      <ShoppingCart size={15} />
                      <span className="dist-field-label">采购状态</span>
                      <span className={'status purchase-status ' + purchaseStatusClass(selectedPurchase.status)}>{selectedPurchase.status}</span>
                    </div>
                    {selectedPurchase.purchaseNote && (
                      <div className="purchase-detail-item">
                        <FileText size={15} />
                        <span className="dist-field-label">采购备注</span>
                        <span>{selectedPurchase.purchaseNote}</span>
                      </div>
                    )}
                    {selectedPurchase.applicationId && (() => {
                      const app = records.find((r) => r.id === selectedPurchase.applicationId);
                      return app ? (
                        <div className="purchase-related-section">
                          <div className="dist-section-title">
                            <ClipboardList size={15} />
                            <strong>关联申请</strong>
                          </div>
                          <div className="purchase-related-info">
                            <p><strong>{app.partName}</strong> · {app.ship}</p>
                            <p>{`${app.system} · ${app.location} | 需求${app.qty}`}</p>
                            <button
                              className="primary"
                              type="button"
                              style={{ marginTop: '8px' }}
                              onClick={() => {
                                setSelected(app);
                                setActiveTab('application');
                              }}
                            >
                              <ArrowRight size={14} />查看申请详情
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  {selectedPurchase.status !== '已到货' && (
                    <div className="purchase-actions">
                      <button
                        className="primary"
                        type="button"
                        onClick={() => updatePurchaseStatus(selectedPurchase.id, '已到货', { comment: '采购已入库' })}
                      >
                        <RefreshCw size={14} />标记为已到货
                      </button>
                    </div>
                  )}
                  <div className="approval-timeline-section">
                    <div className="approval-form-divider">
                      <Clock size={14} />
                      <span>采购进度时间线</span>
                    </div>
                    <div className="approval-timeline">
                      {(selectedPurchase.timeline || []).map((step, index) => (
                        <div key={index} className={'approval-timeline-item ' + (step.action === 'arrive' ? 'timeline-approved' : step.action === 'create' ? 'timeline-approved' : '')}>
                          <div className="timeline-dot" />
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <strong>{step.status}</strong>
                              <span className="timeline-meta">{step.at} · {step.by}</span>
                            </div>
                            {step.comment && (
                              <p className="timeline-detail">{step.comment}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty">点击任意采购任务查看详情。</p>
              )}
            </aside>
          </section>
        </>
      )}

      {activeTab === 'trend' && (
        <>
          <section className="metrics">
            <article className="metric">
              <span>申请总数</span>
              <strong>{trendFilteredRecords.length}</strong>
            </article>
            <article className="metric">
              <span>涉及备件种类</span>
              <strong>{trendUniqueParts}</strong>
            </article>
            <article className="metric">
              <span>高紧急占比</span>
              <strong>{trendHighUrgencyPct}%</strong>
            </article>
            <article className="metric">
              <span>需求总数量</span>
              <strong>{trendTotalQty}</strong>
            </article>
            <article className="metric">
              <span>无日期记录</span>
              <strong style={{ color: trendNoDateCount > 0 ? '#f59e0b' : '#10b981' }}>{trendNoDateCount}</strong>
            </article>
          </section>

          <section className="panel trend-filter-panel">
            <div className="panel-title">
              <CalendarDays size={18} />
              <h2>筛选条件</h2>
            </div>
            <div className="trend-filter-row">
              <div className="trend-filter-item">
                <label>开始日期</label>
                <input
                  type="date"
                  value={trendDateRange.start}
                  onChange={(e) => setTrendDateRange({ ...trendDateRange, start: e.target.value })}
                />
              </div>
              <div className="trend-filter-item">
                <label>结束日期</label>
                <input
                  type="date"
                  value={trendDateRange.end}
                  onChange={(e) => setTrendDateRange({ ...trendDateRange, end: e.target.value })}
                />
              </div>
              <div className="trend-filter-item">
                <label>设备系统</label>
                <select
                  value={trendSystemFilter}
                  onChange={(e) => setTrendSystemFilter(e.target.value)}
                >
                  <option value="全部">全部系统</option>
                  {appConfig.fields.find(f => f.key === 'system')?.options.map(sys => (
                    <option key={sys} value={sys}>{sys}</option>
                  ))}
                </select>
              </div>
              <div className="trend-filter-item trend-filter-actions">
                <button
                  className="primary"
                  style={{ marginTop: '22px', padding: '10px 20px' }}
                  onClick={() => {
                    setTrendDateRange({ start: '', end: '' });
                    setTrendSystemFilter('全部');
                  }}
                >
                  <RefreshCw size={14} />重置
                </button>
              </div>
            </div>
            {trendNoDateCount > 0 && (
              <p className="trend-date-hint">
                <AlertTriangle size={14} />
                检测到 {trendNoDateCount} 条历史记录无创建日期，已全部纳入统计。
              </p>
            )}
          </section>

          <section className="trend-grid">
            <div className="panel">
              <div className="panel-title">
                <TrendingUp size={18} />
                <h2>Top {trendConfig.topN} 备件申请排行</h2>
              </div>
              {trendTopParts.length === 0 ? (
                <p className="empty">暂无数据</p>
              ) : (
                <div className="trend-top-list">
                  {trendTopParts.map((item, index) => (
                    <div key={item.name} className="trend-top-item">
                      <span className={'trend-top-rank ' + (index < 3 ? 'trend-top-rank-high' : '')}>
                        {index + 1}
                      </span>
                      <div className="trend-top-info">
                        <div className="trend-top-name">{item.name}</div>
                        <div className="trend-top-meta">{item.system} · {item.count}次申请 · 共{item.totalQty}件</div>
                      </div>
                      <div className="trend-top-bar-wrap">
                        <div
                          className="trend-top-bar"
                          style={{ width: `${(item.count / trendTopParts[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-title">
                <PieChart size={18} />
                <h2>系统分布</h2>
              </div>
              {trendSystemStats.length === 0 ? (
                <p className="empty">暂无数据</p>
              ) : (
                <div className="trend-system-list">
                  {trendSystemStats.map((item) => (
                    <div key={item.name} className="trend-system-item">
                      <div className="trend-system-head">
                        <span className="trend-system-name">{item.name}</span>
                        <span className="trend-system-count">{item.count}次 ({item.pct}%)</span>
                      </div>
                      <div className="trend-system-bar-wrap">
                        <div
                          className="trend-system-bar"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="trend-grid">
            <div className="panel">
              <div className="panel-title">
                <Zap size={18} />
                <h2>紧急程度分布</h2>
              </div>
              {trendUrgencyStats.length === 0 ? (
                <p className="empty">暂无数据</p>
              ) : (
                <div className="trend-urgency-list">
                  {trendUrgencyStats.map((item) => (
                    <div key={item.name} className="trend-urgency-item">
                      <div className="trend-urgency-head">
                        <span className={'trend-urgency-dot trend-urgency-' + item.level} />
                        <span className="trend-urgency-name">{item.name}</span>
                        <span className="trend-urgency-count">{item.count}次 ({item.pct}%)</span>
                      </div>
                      <div className="trend-urgency-bar-wrap">
                        <div
                          className={'trend-urgency-bar trend-urgency-bar-' + item.level}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-title">
                <Ship size={18} />
                <h2>船舶申请分布</h2>
              </div>
              {trendShipStats.length === 0 ? (
                <p className="empty">暂无数据</p>
              ) : (
                <div className="trend-ship-list">
                  {trendShipStats.map((item) => (
                    <div key={item.name} className="trend-ship-item">
                      <div className="trend-ship-head">
                        <span className="trend-ship-name">{item.name}</span>
                        <span className="trend-ship-count">{item.count}次 ({item.pct}%)</span>
                      </div>
                      <div className="trend-ship-bar-wrap">
                        <div
                          className="trend-ship-bar"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'sync' && (
        <>
          <section className="metrics sync-metrics">
            <article className="metric">
              <span>待同步操作</span>
              <strong className="metric-pending">{pendingCount}</strong>
            </article>
            <article className="metric">
              <span>已同步操作</span>
              <strong className="metric-completed">{getCompletedOperations().length}</strong>
            </article>
            <article className="metric">
              <span>未解决冲突</span>
              <strong className="metric-conflict">{unresolvedConflictCount}</strong>
            </article>
            <article className="metric">
              <span>同步次数</span>
              <strong>{syncMeta.syncCount || 0}</strong>
            </article>
          </section>

          {isSyncing && (
            <section className="panel sync-progress-panel">
              <div className="sync-progress-bar-wrapper">
                <div
                  className="sync-progress-bar"
                  style={{
                    width: syncProgress.total > 0
                      ? `${(syncProgress.current / syncProgress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="sync-progress-text">
                <RefreshCw size={14} className="spin" />
                {syncProgress.message || '正在同步...'}
                {syncProgress.total > 0 && ` (${syncProgress.current}/${syncProgress.total})`}
              </p>
            </section>
          )}

          <section className="sync-tabs-section">
            <div className="sync-sub-tabs">
              <button
                className={'sync-sub-tab ' + (syncTab === 'queue' ? 'sync-sub-tab-active' : '')}
                onClick={() => setSyncTab('queue')}
              >
                <Database size={14} />
                同步队列
                {pendingCount > 0 && <span className="sync-tab-badge">{pendingCount}</span>}
              </button>
              <button
                className={'sync-sub-tab ' + (syncTab === 'conflicts' ? 'sync-sub-tab-active' : '')}
                onClick={() => setSyncTab('conflicts')}
              >
                <AlertOctagon size={14} />
                冲突管理
                {unresolvedConflictCount > 0 && (
                  <span className="sync-tab-badge conflict-badge">{unresolvedConflictCount}</span>
                )}
              </button>
              <button
                className={'sync-sub-tab ' + (syncTab === 'log' ? 'sync-sub-tab-active' : '')}
                onClick={() => setSyncTab('log')}
              >
                <Activity size={14} />
                同步日志
              </button>
              <button
                className={'sync-sub-tab ' + (syncTab === 'settings' ? 'sync-sub-tab-active' : '')}
                onClick={() => setSyncTab('settings')}
              >
                <Server size={14} />
                高级设置
              </button>
            </div>
          </section>

          {syncTab === 'queue' && (
            <section className="workspace sync-workspace">
              <section className="panel sync-queue-panel">
                <div className="panel-title">
                  <Clock size={18} />
                  <h2>待同步操作 ({pendingCount})</h2>
                </div>
                <div className="sync-queue-list">
                  {syncQueue.filter(op => !op.synced).length === 0 ? (
                    <p className="empty">暂无待同步操作。在离线状态下进行的操作会显示在这里。</p>
                  ) : (
                    syncQueue
                      .filter(op => !op.synced)
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((op) => (
                        <div key={op.id} className="sync-queue-item">
                          <div className="sync-queue-icon">
                            {op.type === OP_TYPES.CREATE && <Plus size={16} />}
                            {op.type === OP_TYPES.UPDATE_STATUS && <RefreshCw size={16} />}
                            {op.type === OP_TYPES.APPROVE && <CheckCircle size={16} />}
                            {op.type === OP_TYPES.REJECT && <XCircle size={16} />}
                            {op.type === OP_TYPES.DELETE && <Trash2 size={16} />}
                            {op.type === OP_TYPES.DISPATCH && <Truck size={16} />}
                          </div>
                          <div className="sync-queue-info">
                            <div className="sync-queue-title">
                              <span className="sync-op-type">{describeOperation(op)}</span>
                              <span className={'sync-op-status status-pending'}>待同步</span>
                            </div>
                            <p className="sync-queue-meta">
                              {op.payload?.partName || op.payload?.record?.partName || '未知备件'}
                              <span className="sync-meta-divider">·</span>
                              {new Date(op.timestamp).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>

              <section className="panel sync-queue-panel">
                <div className="panel-title">
                  <CheckCircle2 size={18} />
                  <h2>已同步操作 ({getCompletedOperations().length})</h2>
                </div>
                <div className="sync-queue-list">
                  {syncQueue.filter(op => op.synced && !op.removedByConflict).length === 0 ? (
                    <p className="empty">暂无已同步操作。</p>
                  ) : (
                    syncQueue
                      .filter(op => op.synced && !op.removedByConflict)
                      .sort((a, b) => (b.syncedAt || 0) - (a.syncedAt || 0))
                      .slice(0, 20)
                      .map((op) => (
                        <div key={op.id} className="sync-queue-item synced">
                          <div className="sync-queue-icon synced-icon">
                            {op.type === OP_TYPES.CREATE && <Plus size={16} />}
                            {op.type === OP_TYPES.UPDATE_STATUS && <RefreshCw size={16} />}
                            {op.type === OP_TYPES.APPROVE && <CheckCircle size={16} />}
                            {op.type === OP_TYPES.REJECT && <XCircle size={16} />}
                            {op.type === OP_TYPES.DELETE && <Trash2 size={16} />}
                            {op.type === OP_TYPES.DISPATCH && <Truck size={16} />}
                          </div>
                          <div className="sync-queue-info">
                            <div className="sync-queue-title">
                              <span className="sync-op-type">{describeOperation(op)}</span>
                              <span className={'sync-op-status status-synced'}>已同步</span>
                            </div>
                            <p className="sync-queue-meta">
                              {op.payload?.partName || op.payload?.record?.partName || '未知备件'}
                              <span className="sync-meta-divider">·</span>
                              {op.syncedAt ? new Date(op.syncedAt).toLocaleString('zh-CN') : '-'}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>
            </section>
          )}

          {syncTab === 'conflicts' && (
            <section className="workspace sync-workspace">
              <section className="panel sync-conflicts-panel">
                <div className="panel-title">
                  <AlertOctagon size={18} />
                  <h2>冲突列表</h2>
                </div>
                <div className="sync-conflicts-list">
                  {conflicts.length === 0 ? (
                    <p className="empty">暂无冲突记录。同步时如果检测到冲突会显示在这里。</p>
                  ) : (
                    conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className={'sync-conflict-item ' + (conflict.resolved ? 'resolved' : '') + ' severity-' + conflict.severity}
                      >
                        <div
                          className="sync-conflict-header"
                          onClick={() => {
                            setExpandedConflicts(prev => ({
                              ...prev,
                              [conflict.id]: !prev[conflict.id]
                            }));
                          }}
                        >
                          <div className="sync-conflict-icon">
                            {conflict.severity === 'error' ? (
                              <XCircle size={20} />
                            ) : (
                              <AlertTriangle size={20} />
                            )}
                          </div>
                          <div className="sync-conflict-info">
                            <h3 className="sync-conflict-title">{conflict.description}</h3>
                            <p className="sync-conflict-meta">
                              <span className={'conflict-type-tag'}>
                                {conflict.type === CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES && '多次状态变更'}
                                {conflict.type === CONFLICT_TYPES.DELETE_THEN_APPROVE && '删除后审批'}
                                {conflict.type === CONFLICT_TYPES.DUPLICATE_PART_NAME && '同名备件重复'}
                                {conflict.type === CONFLICT_TYPES.REMOTE_DELETED && '服务端已删除'}
                                {conflict.type === CONFLICT_TYPES.REMOTE_MODIFIED && '服务端已修改'}
                              </span>
                              <span className="sync-meta-divider">·</span>
                              检测于 {new Date(conflict.detectedAt).toLocaleString('zh-CN')}
                              <span className="sync-meta-divider">·</span>
                              {conflict.resolved ? (
                                <span className="conflict-resolved-badge">
                                  <CheckCircle size={12} />
                                  已解决
                                </span>
                              ) : (
                                <span className="conflict-unresolved-badge">
                                  <AlertTriangle size={12} />
                                  待处理
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="sync-conflict-expand">
                            {expandedConflicts[conflict.id] ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </div>
                        </div>

                        {expandedConflicts[conflict.id] && (
                          <div className="sync-conflict-detail">
                            <div className="conflict-detail-section">
                              <h4>本地操作</h4>
                              <div className="conflict-ops-list">
                                {(conflict.localOperations || []).map((op, idx) => (
                                  <div key={idx} className="conflict-op-item">
                                    <div className="conflict-op-icon">
                                      {op.type === OP_TYPES.CREATE && <Plus size={14} />}
                                      {op.type === OP_TYPES.UPDATE_STATUS && <RefreshCw size={14} />}
                                      {op.type === OP_TYPES.APPROVE && <CheckCircle size={14} />}
                                      {op.type === OP_TYPES.REJECT && <XCircle size={14} />}
                                      {op.type === OP_TYPES.DELETE && <Trash2 size={14} />}
                                    </div>
                                    <div className="conflict-op-info">
                                      <span className="conflict-op-type">
                                        {op.type === OP_TYPES.CREATE && '创建'}
                                        {op.type === OP_TYPES.UPDATE_STATUS && '更新状态'}
                                        {op.type === OP_TYPES.APPROVE && '批准'}
                                        {op.type === OP_TYPES.REJECT && '驳回'}
                                        {op.type === OP_TYPES.DELETE && '删除'}
                                      </span>
                                      {op.fromStatus && op.toStatus && (
                                        <span className="conflict-op-status-change">
                                          {op.fromStatus} → {op.toStatus}
                                        </span>
                                      )}
                                      <span className="conflict-op-time">
                                        {op.at ? new Date(op.at).toLocaleString('zh-CN') : ''}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {conflict.remoteRecord && (
                              <div className="conflict-detail-section">
                                <h4>服务端数据</h4>
                                <div className="conflict-remote-record">
                                  <p><strong>{conflict.remoteRecord.partName}</strong></p>
                                  <p>{conflict.remoteRecord.ship} · {conflict.remoteRecord.system}</p>
                                  <p>状态: {conflict.remoteRecord.status}</p>
                                  <p>数量: {conflict.remoteRecord.qty}</p>
                                </div>
                              </div>
                            )}

                            {conflict.resolution && (
                              <div className="conflict-detail-section">
                                <h4>解决方案</h4>
                                <div className="conflict-resolution-info">
                                  <p>
                                    策略: {
                                      conflict.resolution.strategy === RESOLUTION_STRATEGIES.KEEP_LOCAL ? '保留本地' :
                                      conflict.resolution.strategy === RESOLUTION_STRATEGIES.KEEP_REMOTE ? '保留服务端' :
                                      conflict.resolution.strategy === RESOLUTION_STRATEGIES.KEEP_BOTH ? '保留两者' :
                                      conflict.resolution.strategy === RESOLUTION_STRATEGIES.MERGE ? '合并' :
                                      conflict.resolution.strategy
                                    }
                                  </p>
                                  <p>解决者: {conflict.resolution.by === 'system' ? '系统自动' : '用户手动'}</p>
                                  <p>
                                    解决时间: {conflict.resolution.resolvedAt
                                      ? new Date(conflict.resolution.resolvedAt).toLocaleString('zh-CN')
                                      : '-'}
                                  </p>
                                  {conflict.resolution.note && (
                                    <p>备注: {conflict.resolution.note}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {!conflict.resolved && (
                              <div className="conflict-detail-section">
                                <h4>选择解决方案</h4>
                                <div className="conflict-resolution-options">
                                  {(conflict.options || []).length > 0 ? (
                                    conflict.options.map((option, idx) => (
                                      <button
                                        key={idx}
                                        className="conflict-resolution-btn"
                                        onClick={() => resolveConflictManually(conflict.id, option.strategy)}
                                      >
                                        <div className="resolution-option-title">{option.label}</div>
                                        <div className="resolution-option-desc">{option.description}</div>
                                      </button>
                                    ))
                                  ) : (
                                    <>
                                      <button
                                        className="conflict-resolution-btn"
                                        onClick={() => resolveConflictManually(conflict.id, RESOLUTION_STRATEGIES.KEEP_LOCAL)}
                                      >
                                        <div className="resolution-option-title">保留本地版本</div>
                                        <div className="resolution-option-desc">使用本地修改覆盖服务端数据</div>
                                      </button>
                                      <button
                                        className="conflict-resolution-btn"
                                        onClick={() => resolveConflictManually(conflict.id, RESOLUTION_STRATEGIES.KEEP_REMOTE)}
                                      >
                                        <div className="resolution-option-title">保留服务端版本</div>
                                        <div className="resolution-option-desc">丢弃本地修改，使用服务端数据</div>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </section>
          )}

          {syncTab === 'log' && (
            <section className="workspace sync-workspace">
              <section className="panel sync-log-panel">
                <div className="panel-title">
                  <Activity size={18} />
                  <h2>同步日志</h2>
                </div>
                <div className="sync-log-list">
                  {syncLog.length === 0 ? (
                    <p className="empty">暂无同步日志。</p>
                  ) : (
                    syncLog.map((log) => (
                      <div key={log.id} className={'sync-log-item log-' + log.type}>
                        <div className="sync-log-icon">
                          {log.type === 'info' && <Info size={14} />}
                          {log.type === 'success' && <CheckCircle size={14} />}
                          {log.type === 'warn' && <AlertTriangle size={14} />}
                          {log.type === 'error' && <XCircle size={14} />}
                          {log.type === 'create' && <Plus size={14} />}
                          {log.type === 'update' && <RefreshCw size={14} />}
                          {log.type === 'delete' && <Trash2 size={14} />}
                        </div>
                        <div className="sync-log-content">
                          <p className="sync-log-message">{log.message}</p>
                          <span className="sync-log-time">
                            {new Date(log.at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </section>
          )}

          {syncTab === 'settings' && (
            <section className="workspace sync-workspace">
              <section className="panel sync-settings-panel">
                <div className="panel-title">
                  <Server size={18} />
                  <h2>高级设置</h2>
                </div>
                <div className="sync-settings-list">
                  <div className="sync-setting-item">
                    <div className="sync-setting-info">
                      <h3>基线数据</h3>
                      <p>当前基线记录数: {Object.keys(baseline).length} 条</p>
                      <p className="setting-hint">基线是上一次同步时的数据快照，用于冲突检测</p>
                    </div>
                    <button
                      className="ghost"
                      onClick={() => {
                        const fresh = takeBaseline(records);
                        setBaseline(fresh);
                        addLog('info', '已重新建立数据基线（' + records.length + '条）');
                      }}
                    >
                      <Save size={14} />
                      重建基线
                    </button>
                  </div>

                  <div className="sync-setting-item">
                    <div className="sync-setting-info">
                      <h3>同步元数据</h3>
                      <p>同步次数: {syncMeta.syncCount || 0}</p>
                      <p>上次同步: {syncMeta.lastSyncAt ? new Date(syncMeta.lastSyncAt).toLocaleString('zh-CN') : '从未同步'}</p>
                      <p>上次同步状态: {syncMeta.lastSyncSuccess ? '成功' : '失败'}</p>
                    </div>
                  </div>

                  <div className="sync-setting-item danger-zone">
                    <div className="sync-setting-info">
                      <h3><Hand size={16} /> 危险操作</h3>
                      <p>重置同步系统会清空所有同步队列、冲突记录和基线数据，但不会影响业务数据。</p>
                    </div>
                    <button
                      className="ghost-danger"
                      onClick={resetSyncSystem}
                    >
                      <RotateCcw size={14} />
                      重置同步系统
                    </button>
                  </div>
                </div>
              </section>
            </section>
          )}
        </>
      )}

      {showConflictModal && selectedConflict && (
        <div className="conflict-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowConflictModal(false)}>
          <div className="conflict-modal">
            <div className="conflict-modal-header">
              <div className="conflict-modal-title">
                <AlertOctagon size={22} />
                <h2>冲突详情</h2>
              </div>
              <button
                className="conflict-modal-close"
                type="button"
                onClick={() => { setShowConflictModal(false); setSelectedConflict(null); }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="conflict-modal-body">
              <div className={'conflict-modal-severity severity-' + selectedConflict.severity}>
                {selectedConflict.severity === 'error' ? <XCircle size={24} /> : <AlertTriangle size={24} />}
                <div>
                  <h3>{selectedConflict.description}</h3>
                  <p>
                    冲突类型: {
                      selectedConflict.type === CONFLICT_TYPES.MULTIPLE_STATUS_CHANGES ? '多次状态变更' :
                      selectedConflict.type === CONFLICT_TYPES.DELETE_THEN_APPROVE ? '删除后审批' :
                      selectedConflict.type === CONFLICT_TYPES.DUPLICATE_PART_NAME ? '同名备件重复' :
                      selectedConflict.type === CONFLICT_TYPES.REMOTE_DELETED ? '服务端已删除' :
                      selectedConflict.type === CONFLICT_TYPES.REMOTE_MODIFIED ? '服务端已修改' :
                      selectedConflict.type
                    }
                  </p>
                </div>
              </div>

              <div className="conflict-modal-section">
                <h4>本地操作记录</h4>
                <div className="conflict-ops-list">
                  {(selectedConflict.localOperations || []).map((op, idx) => (
                    <div key={idx} className="conflict-op-item">
                      <div className="conflict-op-icon">
                        {op.type === OP_TYPES.CREATE && <Plus size={14} />}
                        {op.type === OP_TYPES.UPDATE_STATUS && <RefreshCw size={14} />}
                        {op.type === OP_TYPES.APPROVE && <CheckCircle size={14} />}
                        {op.type === OP_TYPES.REJECT && <XCircle size={14} />}
                        {op.type === OP_TYPES.DELETE && <Trash2 size={14} />}
                      </div>
                      <div className="conflict-op-info">
                        <span className="conflict-op-type">
                          {op.type === OP_TYPES.CREATE && '创建'}
                          {op.type === OP_TYPES.UPDATE_STATUS && '更新状态'}
                          {op.type === OP_TYPES.APPROVE && '批准'}
                          {op.type === OP_TYPES.REJECT && '驳回'}
                          {op.type === OP_TYPES.DELETE && '删除'}
                        </span>
                        {op.fromStatus && op.toStatus && (
                          <span className="conflict-op-status-change">
                            {op.fromStatus} → {op.toStatus}
                          </span>
                        )}
                        <span className="conflict-op-time">
                          {op.at ? new Date(op.at).toLocaleString('zh-CN') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedConflict.remoteRecord && (
                <div className="conflict-modal-section">
                  <h4>服务端数据</h4>
                  <div className="conflict-remote-record">
                    <p><strong>{selectedConflict.remoteRecord.partName}</strong></p>
                    <p>{selectedConflict.remoteRecord.ship} · {selectedConflict.remoteRecord.system} · {selectedConflict.remoteRecord.location}</p>
                    <p>状态: {selectedConflict.remoteRecord.status} · 数量: {selectedConflict.remoteRecord.qty}</p>
                  </div>
                </div>
              )}

              {selectedConflict.resolutionReason && (
                <div className="conflict-modal-section">
                  <h4>建议方案</h4>
                  <p className="conflict-recommendation">{selectedConflict.resolutionReason}</p>
                </div>
              )}

              <div className="conflict-modal-section">
                <h4>选择解决方案</h4>
                <div className="conflict-resolution-options">
                  {(selectedConflict.options || []).length > 0 ? (
                    selectedConflict.options.map((option, idx) => (
                      <button
                        key={idx}
                        className="conflict-resolution-btn"
                        onClick={() => {
                          resolveConflictManually(selectedConflict.id, option.strategy);
                        }}
                      >
                        <div className="resolution-option-title">{option.label}</div>
                        <div className="resolution-option-desc">{option.description}</div>
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        className="conflict-resolution-btn"
                        onClick={() => {
                          resolveConflictManually(selectedConflict.id, RESOLUTION_STRATEGIES.KEEP_LOCAL);
                        }}
                      >
                        <div className="resolution-option-title">保留本地版本</div>
                        <div className="resolution-option-desc">使用本地修改覆盖服务端数据</div>
                      </button>
                      <button
                        className="conflict-resolution-btn"
                        onClick={() => {
                          resolveConflictManually(selectedConflict.id, RESOLUTION_STRATEGIES.KEEP_REMOTE);
                        }}
                      >
                        <div className="resolution-option-title">保留服务端版本</div>
                        <div className="resolution-option-desc">丢弃本地修改，使用服务端数据</div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="conflict-modal-footer">
              <button
                type="button"
                className="conflict-cancel-btn"
                onClick={() => { setShowConflictModal(false); setSelectedConflict(null); }}
              >
                稍后处理
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="import-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="import-modal">
            <div className="import-modal-header">
              <div className="import-modal-title">
                <FileSpreadsheet size={22} />
                <h2>导入备件申请</h2>
              </div>
              <button
                className="import-modal-close"
                type="button"
                onClick={() => { setShowImportModal(false); setImportText(''); setImportPreview(null); setImportPreviewTab('valid'); }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="import-tabs">
              <button
                className={'import-tab ' + (importTab === 'paste' ? 'import-tab-active' : '')}
                type="button"
                onClick={() => setImportTab('paste')}
              >
                <ClipboardList size={16} />
                粘贴数据
              </button>
              <button
                className={'import-tab ' + (importTab === 'upload' ? 'import-tab-active' : '')}
                type="button"
                onClick={() => setImportTab('upload')}
              >
                <Upload size={16} />
                上传文件
              </button>
            </div>

            <div className="import-modal-body">
              {importTab === 'paste' && (
                <div className="import-paste-area">
                  <label className="import-label">
                    <span>粘贴CSV格式数据</span>
                    <textarea
                      className="import-textarea"
                      value={importText}
                      onChange={handlePaste}
                      placeholder="所属船舶,备件名称,设备系统,船舶位置,需求数量,紧急程度,申请原因&#10;远洋一号,海水泵密封圈,机舱,二副库,2,高,&quot;巡检发现渗漏,需预防性更换,立即处理&quot;&#10;海运之星,甲板照明灯泡,电气,甲板库,12,中,夜航照明备货"
                      rows={8}
                    />
                  </label>
                  <div className="import-sample-actions">
                    <button type="button" className="import-sample-btn" onClick={copySampleCSV}>
                      <Copy size={14} />复制示例
                    </button>
                    <button type="button" className="import-sample-btn" onClick={downloadSampleCSV}>
                      <Download size={14} />下载模板
                    </button>
                  </div>
                </div>
              )}

              {importTab === 'upload' && (
                <div className="import-upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <div
                    className="import-drop-zone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={48} style={{ color: '#0891b2', marginBottom: '12px' }} />
                    <p style={{ fontWeight: 700, color: '#101828', marginBottom: '4px' }}>点击选择CSV文件</p>
                    <p style={{ color: '#667085', fontSize: '13px' }}>支持 .csv、.txt 格式文件</p>
                  </div>
                  {importText && (
                    <div className="import-file-info">
                      <FileSpreadsheet size={16} />
                      <span>已加载数据，共 {importText.split(/\r?\n/).filter(l => l.trim()).length - 1} 行</span>
                    </div>
                  )}
                </div>
              )}

              {importPreview?.error && (
                <div className="import-error">
                  <AlertTriangle size={18} />
                  <span>{importPreview.error}</span>
                </div>
              )}

              {importPreview && !importPreview.error && (
                <div className="import-preview">
                  <div className="import-field-mapping">
                    <div className="import-section-title">
                      <Info size={16} />
                      <h3>字段识别结果</h3>
                    </div>
                    <div className="import-field-list">
                      {importPreview.recognizedFields.map((f, i) => (
                        <div key={i} className="import-field-item import-field-ok">
                          <CheckCircle size={14} />
                          <span className="import-field-csv">{f.csv}</span>
                          <ArrowRight size={14} />
                          <span className="import-field-target">{f.label}</span>
                        </div>
                      ))}
                      {importPreview.unrecognizedFields.map((f, i) => (
                        <div key={i} className="import-field-item import-field-ignore">
                          <XCircle size={14} />
                          <span className="import-field-csv">{f}</span>
                          <ArrowRight size={14} />
                          <span className="import-field-target">无法识别，将忽略</span>
                        </div>
                      ))}
                    </div>
                    {importPreview.missingRequired.length > 0 && (
                      <div className="import-missing-fields">
                        <AlertTriangle size={16} />
                        <span>缺少必填字段：{importPreview.missingRequired.join('、')}</span>
                      </div>
                    )}
                  </div>

                  <div className="import-stats">
                    <div className="import-stat-item import-stat-total">
                      <strong>{importPreview.totalRows}</strong>
                      <span>总行数</span>
                    </div>
                    <div className="import-stat-item import-stat-valid">
                      <strong>{importPreview.validRows.length}</strong>
                      <span>有效行</span>
                    </div>
                    <div className="import-stat-item import-stat-error">
                      <strong>{importPreview.errorRows.length}</strong>
                      <span>错误行</span>
                    </div>
                    <div className="import-stat-item import-stat-duplicate">
                      <strong>{importPreview.duplicateRows.length}</strong>
                      <span>重复提示</span>
                    </div>
                  </div>

                  <div className="import-preview-tabs">
                    <button
                      className={'import-preview-tab ' + (importPreviewTab === 'valid' ? 'import-preview-tab-active' : '')}
                      type="button"
                      onClick={() => setImportPreviewTab('valid')}
                    >
                      <CheckCircle2 size={14} />
                      有效行 ({importPreview.validRows.length})
                    </button>
                    <button
                      className={'import-preview-tab ' + (importPreviewTab === 'error' ? 'import-preview-tab-active' : '')}
                      type="button"
                      onClick={() => setImportPreviewTab('error')}
                    >
                      <XCircle size={14} />
                      错误行 ({importPreview.errorRows.length})
                    </button>
                    {importPreview.duplicateRows.length > 0 && (
                      <button
                        className={'import-preview-tab ' + (importPreviewTab === 'duplicate' ? 'import-preview-tab-active' : '')}
                        type="button"
                        onClick={() => setImportPreviewTab('duplicate')}
                      >
                        <AlertTriangle size={14} />
                        重复提示 ({importPreview.duplicateRows.length})
                      </button>
                    )}
                  </div>

                  <div className="import-preview-list">
                    {importPreviewTab === 'valid' && importPreview.validRows.length > 0 && (
                      <div className="import-preview-section">
                        {importPreview.validRows.map((item, i) => (
                          <div key={i} className={'import-preview-row ' + (item.warnings.length > 0 ? 'import-preview-row-warning' : '')}>
                            <div className="import-preview-row-head">
                              <span className="import-row-index">第 {item.rowIndex} 行</span>
                              {item.warnings.length > 0 && (
                                <span className="import-row-warning">
                                  <AlertTriangle size={12} />
                                  存在重复风险
                                </span>
                              )}
                            </div>
                            <div className="import-preview-row-data">
                              <span className="import-preview-ship">{item.data.ship}</span>
                              <span className="import-preview-part">{item.data.partName}</span>
                              <span className="import-preview-system">{item.data.system}</span>
                              <span className="import-preview-location">{item.data.location}</span>
                              <span className="import-preview-qty">x{item.data.qty}</span>
                              <span className={'import-preview-urgency urgency-' + (item.data.urgency === '高' ? 'high' : item.data.urgency === '中' ? 'medium' : 'low')}>
                                {item.data.urgency}
                              </span>
                            </div>
                            <div className="import-preview-row-reason">{item.data.reason}</div>
                            {item.warnings.length > 0 && (
                              <div className="import-row-warnings">
                                {item.warnings.map((w, wi) => (
                                  <div key={wi} className="import-row-warning-item">
                                    <AlertTriangle size={12} />
                                    {w}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {importPreviewTab === 'valid' && importPreview.validRows.length === 0 && (
                      <p className="empty">暂无有效行数据</p>
                    )}

                    {importPreviewTab === 'error' && importPreview.errorRows.length > 0 && (
                      <div className="import-preview-section">
                        {importPreview.errorRows.map((item, i) => (
                          <div key={i} className="import-preview-row import-preview-row-error">
                            <div className="import-preview-row-head">
                              <span className="import-row-index">第 {item.rowIndex} 行</span>
                              <span className="import-row-error-tag">
                                <XCircle size={12} />
                                错误
                              </span>
                            </div>
                            <div className="import-preview-row-data">
                              <span className="import-preview-ship">{item.data.ship || '-'}</span>
                              <span className="import-preview-part">{item.data.partName || '-'}</span>
                              <span className="import-preview-system">{item.data.system || '-'}</span>
                              <span className="import-preview-location">{item.data.location || '-'}</span>
                              <span className="import-preview-qty">x{item.data.qty || '-'}</span>
                              <span className="import-preview-urgency">{item.data.urgency || '-'}</span>
                            </div>
                            <div className="import-preview-row-reason">{item.data.reason || '-'}</div>
                            <div className="import-row-errors">
                              {item.errors.map((e, ei) => (
                                <div key={ei} className="import-row-error-item">
                                  <XCircle size={12} />
                                  {e}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {importPreviewTab === 'error' && importPreview.errorRows.length === 0 && (
                      <p className="empty">暂无错误行数据</p>
                    )}

                    {importPreviewTab === 'duplicate' && importPreview.duplicateRows.length > 0 && (
                      <div className="import-preview-section">
                        {importPreview.duplicateRows.map((item, i) => (
                          <div key={i} className="import-preview-row import-preview-row-warning">
                            <div className="import-preview-row-head">
                              <span className="import-row-index">第 {item.rowIndex} 行</span>
                              <span className="import-row-warning">
                                <AlertTriangle size={12} />
                                重复提示
                              </span>
                            </div>
                            <div className="import-preview-row-data">
                              <span className="import-preview-ship">{item.data.ship}</span>
                              <span className="import-preview-part">{item.data.partName}</span>
                              <span className="import-preview-system">{item.data.system}</span>
                              <span className="import-preview-location">{item.data.location}</span>
                              <span className="import-preview-qty">x{item.data.qty}</span>
                              <span className={'import-preview-urgency urgency-' + (item.data.urgency === '高' ? 'high' : item.data.urgency === '中' ? 'medium' : 'low')}>
                                {item.data.urgency}
                              </span>
                            </div>
                            <div className="import-preview-row-reason">{item.data.reason}</div>
                            <div className="import-row-warnings">
                              {item.errors.map((w, wi) => (
                                <div key={wi} className="import-row-warning-item">
                                  <AlertTriangle size={12} />
                                  {w}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {importPreviewTab === 'duplicate' && importPreview.duplicateRows.length === 0 && (
                      <p className="empty">暂无重复提示数据</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="import-modal-footer">
              <button
                type="button"
                className="import-cancel-btn"
                onClick={() => { setShowImportModal(false); setImportText(''); setImportPreview(null); setImportPreviewTab('valid'); }}
              >
                取消
              </button>
              <button
                type="button"
                className="import-confirm-btn"
                onClick={executeImport}
                disabled={!importPreview?.canImport}
              >
                <CheckCircle size={16} />
                确认导入 ({importPreview?.validRows.length || 0} 条)
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'audit' && (
        <>
          <section className="metrics">
            {(() => {
              const stats = getAuditStats();
              const auditMetrics = [
                { label: '审计事件总数', value: stats.total, icon: <Activity size={16} /> },
                { label: '近7天事件', value: stats.last7Days, icon: <Clock size={16} /> },
                { label: '数据版本', value: `v${dataVersion}/v${CURRENT_DATA_VERSION}`, icon: <Database size={16} /> },
                { label: '备份数量', value: listBackups().length, icon: <Save size={16} /> },
              ];
              return auditMetrics.map((metric) => (
                <article className="metric" key={metric.label}>
                  <span>{metric.icon} {metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              ));
            })()}
          </section>

          <section className="workspace">
            <section className="panel" style={{ flex: '0 0 280px' }}>
              <div className="panel-title">
                <Layers size={18} />
                <h2>功能导航</h2>
              </div>
              <div className="audit-sub-tabs">
                <button
                  className={'audit-sub-tab ' + (auditTab === 'overview' ? 'audit-sub-tab-active' : '')}
                  onClick={() => setAuditTab('overview')}
                >
                  <BarChart3 size={14} /> 审计总览
                </button>
                <button
                  className={'audit-sub-tab ' + (auditTab === 'logs' ? 'audit-sub-tab-active' : '')}
                  onClick={() => setAuditTab('logs')}
                >
                  <FileText size={14} /> 审计日志
                </button>
                <button
                  className={'audit-sub-tab ' + (auditTab === 'migration' ? 'audit-sub-tab-active' : '')}
                  onClick={() => setAuditTab('migration')}
                >
                  <Database size={14} /> 迁移与备份
                </button>
              </div>

              {auditTab === 'logs' && (
                <div className="audit-filters">
                  <h4>筛选条件</h4>
                  <label>
                    <span>事件类型</span>
                    <select
                      value={auditFilters.eventType}
                      onChange={(e) => setAuditFilters({ ...auditFilters, eventType: e.target.value })}
                    >
                      <option value="全部">全部类型</option>
                      {Object.entries(AUDIT_EVENT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>操作人</span>
                    <input
                      type="text"
                      value={auditFilters.operator}
                      onChange={(e) => setAuditFilters({ ...auditFilters, operator: e.target.value })}
                      placeholder="搜索操作人姓名"
                    />
                  </label>
                  <label>
                    <span>开始日期</span>
                    <input
                      type="date"
                      value={auditFilters.startDate}
                      onChange={(e) => setAuditFilters({ ...auditFilters, startDate: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>结束日期</span>
                    <input
                      type="date"
                      value={auditFilters.endDate}
                      onChange={(e) => setAuditFilters({ ...auditFilters, endDate: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="primary audit-export-btn"
                    onClick={() => downloadAuditLogCSV({
                      eventType: auditFilters.eventType === '全部' ? null : auditFilters.eventType,
                      operator: auditFilters.operator || null,
                      startDate: auditFilters.startDate || null,
                      endDate: auditFilters.endDate || null,
                    })}
                  >
                    <Download size={14} /> 导出筛选结果 (CSV)
                  </button>
                  <button
                    type="button"
                    className="audit-export-btn"
                    onClick={() => downloadAuditLogCSV({})}
                  >
                    <Download size={14} /> 导出全部审计日志
                  </button>
                </div>
              )}
            </section>

            {auditTab === 'overview' && (
              <section className="panel detail-panel">
                <div className="panel-title">
                  <BarChart3 size={18} />
                  <h2>审计数据总览</h2>
                </div>
                {(() => {
                  const stats = getAuditStats();
                  const typeLabels = AUDIT_EVENT_LABELS;
                  return (
                    <div className="audit-overview">
                      <div className="audit-overview-section">
                        <h3>事件类型分布</h3>
                        <div className="audit-type-stats">
                          {Object.entries(stats.byType).length === 0 && (
                            <p className="empty">暂无审计数据，请先进行一些操作</p>
                          )}
                          {Object.entries(stats.byType).map(([type, count]) => (
                            <div key={type} className="audit-type-stat-item">
                              <span className="audit-type-stat-label">
                                {typeLabels[type] || type}
                              </span>
                              <div className="audit-type-stat-bar-wrap">
                                <div
                                  className="audit-type-stat-bar"
                                  style={{ width: `${Math.min(100, (count / Math.max(...Object.values(stats.byType), 1)) * 100)}%` }}
                                />
                              </div>
                              <strong className="audit-type-stat-count">{count}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="audit-overview-section">
                        <h3>操作人排行</h3>
                        <div className="audit-operator-stats">
                          {Object.entries(stats.byOperator).length === 0 && (
                            <p className="empty">暂无操作数据</p>
                          )}
                          {Object.entries(stats.byOperator)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([op, count]) => (
                              <div key={op} className="audit-operator-stat-item">
                                <UserCheck size={14} />
                                <span className="audit-operator-name">{op || '未命名'}</span>
                                <strong>{count} 次</strong>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="audit-overview-section">
                        <h3>最近操作（20条）</h3>
                        <div className="audit-recent-list">
                          {(() => {
                            const recent = queryAuditEvents({ limit: 20 });
                            if (recent.length === 0) return <p className="empty">暂无操作记录</p>;
                            return recent.map((ev) => (
                              <div key={ev.id} className="audit-recent-item">
                                <span className={'audit-recent-type audit-recent-type-' + ev.eventType}>
                                  {typeLabels[ev.eventType] || ev.eventType}
                                </span>
                                <span className="audit-recent-target">
                                  {ev.targetType === 'record' ? '申请' : ev.targetType === 'purchase' ? '采购' : ev.targetType}
                                  :{ev.targetId.slice(0, 8)}
                                </span>
                                <span className="audit-recent-op">{ev.operator}</span>
                                <span className="audit-recent-time">
                                  {new Date(ev.timestampMs).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {auditTab === 'logs' && (
              <section className="panel detail-panel">
                <div className="panel-title">
                  <FileText size={18} />
                  <h2>审计日志明细</h2>
                </div>
                {(() => {
                  const events = queryAuditEvents({
                    eventType: auditFilters.eventType === '全部' ? null : auditFilters.eventType,
                    operator: auditFilters.operator || null,
                    startDate: auditFilters.startDate || null,
                    endDate: auditFilters.endDate || null,
                    limit: 500,
                  });
                  return (
                    <div className="audit-log-list">
                      {events.length === 0 && <p className="empty">无符合条件的审计日志</p>}
                      {events.map((ev) => {
                        const isExpanded = expandedAuditEvents[ev.id];
                        return (
                          <div key={ev.id} className={'audit-log-item ' + (isExpanded ? 'audit-log-expanded' : '')}>
                            <div
                              className="audit-log-header"
                              onClick={() => setExpandedAuditEvents({
                                ...expandedAuditEvents,
                                [ev.id]: !isExpanded,
                              })}
                            >
                              <span className="audit-log-toggle">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <span className={'audit-log-type audit-log-type-' + ev.eventType}>
                                {AUDIT_EVENT_LABELS[ev.eventType] || ev.eventType}
                              </span>
                              <span className="audit-log-target">
                                <strong>{ev.targetType === 'record' ? '备件申请' : ev.targetType === 'purchase' ? '采购任务' : ev.targetType === 'system' ? '系统' : ev.targetType}</strong>
                                <span className="audit-log-target-id">#{ev.targetId.slice(0, 12)}</span>
                              </span>
                              <span className="audit-log-operator">
                                <UserCheck size={12} /> {ev.operator || '系统'}
                              </span>
                              <span className="audit-log-time">
                                <Clock size={12} /> {new Date(ev.timestampMs).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            {isExpanded && (
                              <div className="audit-log-detail">
                                {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                  <div className="audit-log-meta-section">
                                    <h5>附加信息</h5>
                                    <div className="audit-log-meta-grid">
                                      {Object.entries(ev.metadata).map(([k, v]) => (
                                        <div key={k} className="audit-log-meta-item">
                                          <span className="audit-log-meta-key">{k}</span>
                                          <span className="audit-log-meta-value">
                                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {ev.beforeData && (
                                  <div className="audit-log-data-section">
                                    <h5>变更前</h5>
                                    <pre className="audit-log-data-pre">{JSON.stringify(ev.beforeData, null, 2)}</pre>
                                  </div>
                                )}
                                {ev.afterData && (
                                  <div className="audit-log-data-section">
                                    <h5>变更后</h5>
                                    <pre className="audit-log-data-pre">{JSON.stringify(ev.afterData, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>
            )}

            {auditTab === 'migration' && (
              <section className="panel detail-panel">
                <div className="panel-title">
                  <Database size={18} />
                  <h2>数据迁移与备份管理</h2>
                </div>
                <div className="migration-panel">
                  <div className="migration-section">
                    <div className="migration-section-head">
                      <h3>当前数据状态</h3>
                    </div>
                    <div className="migration-status-grid">
                      <div className="migration-status-item">
                        <span className="migration-status-label">当前数据版本</span>
                        <strong className="migration-status-value">v{dataVersion}</strong>
                      </div>
                      <div className="migration-status-item">
                        <span className="migration-status-label">最新系统版本</span>
                        <strong className="migration-status-value">v{CURRENT_DATA_VERSION}</strong>
                      </div>
                      <div className="migration-status-item">
                        <span className="migration-status-label">迁移状态</span>
                        <strong className={'migration-status-value ' + (dataVersion >= CURRENT_DATA_VERSION ? 'status-ok' : 'status-warn')}>
                          {dataVersion >= CURRENT_DATA_VERSION ? '已是最新' : '需要升级'}
                        </strong>
                      </div>
                      <div className="migration-status-item">
                        <span className="migration-status-label">申请记录数</span>
                        <strong className="migration-status-value">{records.length}</strong>
                      </div>
                    </div>
                    {dataVersion < CURRENT_DATA_VERSION && (
                      <button
                        type="button"
                        className="primary migration-run-btn"
                        onClick={() => {
                          const result = runMigrations();
                          setMigrationStatus(result);
                          setDataVersion(getDataVersion());
                          setShowMigrationAlert(true);
                          if (result.success) {
                            setRecords(loadRecords());
                            setInventory(loadInventory());
                            setTemplates(loadTemplates());
                            setPurchases(loadPurchases());
                          }
                        }}
                      >
                        <RefreshCw size={14} /> 立即执行数据迁移
                      </button>
                    )}
                  </div>

                  <div className="migration-section">
                    <div className="migration-section-head">
                      <h3>数据备份（最近10个）</h3>
                      <button
                        type="button"
                        className="migration-backup-btn"
                        onClick={() => {
                          const result = runMigrations();
                          if (!result.migrated && result.success) {
                            alert('手动备份：数据已在迁移时自动备份。当前无待迁移内容，您可以通过刷新触发迁移流程自动备份。');
                          }
                        }}
                      >
                        <Save size={14} /> 查看备份说明
                      </button>
                    </div>
                    <div className="backup-list">
                      {listBackups().length === 0 && <p className="empty">暂无备份记录，迁移时会自动创建备份</p>}
                      {listBackups().map((bk) => (
                        <div key={bk.key} className="backup-item">
                          <div className="backup-info">
                            <Save size={16} />
                            <span className="backup-time">
                              备份时间：{new Date(bk.timestamp).toLocaleString('zh-CN')}
                            </span>
                            <span className="backup-key">{bk.key.replace('hxwl-61307-backup-', '')}</span>
                          </div>
                          <button
                            type="button"
                            className="backup-restore-btn"
                            onClick={() => {
                              if (confirm('确认恢复此备份？这将覆盖当前所有业务数据！')) {
                                const result = restoreBackup(bk.key);
                                if (result.success) {
                                  alert('备份已成功恢复！页面将刷新以加载恢复后的数据。');
                                  setRecords(loadRecords());
                                  setInventory(loadInventory());
                                  setTemplates(loadTemplates());
                                  setPurchases(loadPurchases());
                                  setDataVersion(getDataVersion());
                                } else {
                                  alert('恢复失败：' + result.error);
                                }
                              }
                            }}
                          >
                            <RotateCcw size={14} /> 恢复此备份
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="migration-section">
                    <div className="migration-section-head">
                      <h3>迁移日志</h3>
                    </div>
                    <div className="migration-log-list">
                      {getMigrationLog().length === 0 && <p className="empty">暂无迁移日志</p>}
                      {getMigrationLog().slice(-20).reverse().map((log) => (
                        <div key={log.id} className={'migration-log-item ' + (log.success ? '' : 'migration-log-error')}>
                          <div className="migration-log-header">
                            {log.type === 'migration' ? (
                              log.success ? <CheckCircle size={16} /> : <XCircle size={16} />
                            ) : log.type === 'backup' ? (
                              <Save size={16} />
                            ) : log.type === 'restore' ? (
                              <RotateCcw size={16} />
                            ) : (
                              <Activity size={16} />
                            )}
                            <span className="migration-log-type">
                              {log.type === 'migration' ? '数据迁移' :
                               log.type === 'backup' ? '创建备份' :
                               log.type === 'restore' ? '恢复备份' : log.type}
                            </span>
                            <span className="migration-log-time">{new Date(log.timestamp).toLocaleString('zh-CN')}</span>
                          </div>
                          <div className="migration-log-body">
                            {log.fromVersion !== undefined && (
                              <span>v{log.fromVersion} → v{log.toVersion}</span>
                            )}
                            {log.error && <span className="migration-log-error-text">错误: {log.error}</span>}
                            {log.rollbackSuccess !== undefined && (
                              <span>回滚: {log.rollbackSuccess ? '成功' : '失败'}</span>
                            )}
                            {log.backupKey && <span>备份: {log.backupKey.replace('hxwl-61307-backup-', '')}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </section>
        </>
      )}

    </main>
  );
}

export default App;
