import { useMemo, useState } from 'react';
import { Ship, Plus, Search, Trash2, AlertTriangle, ClipboardList, CalendarDays, CheckCircle2, Package, ListTodo, Truck, UserCheck, FileText, Bookmark, ArrowRightLeft, Gavel, CheckCircle, XCircle, MessageSquare, Edit3, Clock, Shield, Lock, ShoppingCart, Factory, ArrowRight, RefreshCw } from 'lucide-react';
import './App.css';

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

  const [approvalSubTab, setApprovalSubTab] = useState('urgent');
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalShip, setApprovalShip] = useState('全部');
  const [approvalSystem, setApprovalSystem] = useState('全部');
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalQty, setApprovalQty] = useState('');
  const [approvalRole, setApprovalRole] = useState('轮机长');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalError, setApprovalError] = useState('');

  function persist(next) {
    setRecords(next);
    localStorage.setItem(appConfig.storage, JSON.stringify(next));
  }

  function persistInventory(next) {
    setInventory(next);
    localStorage.setItem(inventoryConfig.storage, JSON.stringify(next));
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

    persist([nextRecord, ...records]);
    setForm(appConfig.defaultValues);
    setSelected(nextRecord);
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

  function updateStatus(id, status) {
    const item = records.find((r) => r.id === id);
    if (!item) return;
    if (wasDispatched(item)) {
      return;
    }
    const next = records.map((item) => item.id === id ? {
      ...item,
      status,
      timeline: [...(item.timeline || []), { status, at: today, by: '操作员' }]
    } : item);
    persist(next);
    if (selected?.id === id) setSelected(next.find((item) => item.id === id));
  }

  function removeRecord(id) {
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
    const nextPurchases = purchases.map((p) => p.id === id ? {
      ...p,
      status,
      arrivalDate: status === '已到货' ? (extraData.arrivalDate || today) : p.arrivalDate,
      timeline: [...(p.timeline || []), timelineEntry]
    } : p);
    persistPurchases(nextPurchases);
    if (selectedPurchase?.id === id) {
      setSelectedPurchase(nextPurchases.find((p) => p.id === id));
    }
    if (purchase.applicationId) {
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
      persist(updatedRecords);
      if (selected?.id === purchase.applicationId) {
        setSelected(updatedRecords.find((item) => item.id === purchase.applicationId));
      }
    }
  }

  function removePurchase(id) {
    const purchase = purchases.find((p) => p.id === id);
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
    const timelineEntry = {
      status: '已批准',
      at: new Date().toISOString().slice(0, 10),
      by: approvalRole,
      comment: approvalComment || '',
      approvedQty: String(approvedQty),
      action: 'approve'
    };
    const next = records.map((r) => r.id === id ? {
      ...r,
      status: '已批准',
      approvedQty: String(approvedQty),
      approvalComment: approvalComment || '',
      timeline: [...(r.timeline || []), timelineEntry]
    } : r);
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
    const timelineEntry = {
      status: '已驳回',
      at: new Date().toISOString().slice(0, 10),
      by: approvalRole,
      comment: approvalComment,
      action: 'reject'
    };
    const next = records.map((r) => r.id === id ? {
      ...r,
      status: '已驳回',
      approvalComment: approvalComment,
      timeline: [...(r.timeline || []), timelineEntry]
    } : r);
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
    const updatedRecords = records.map((item) => item.id === distForm.applicationId ? {
      ...item,
      status: '已发放',
      hasBeenDispatched: true,
      distribution: distRecord,
      timeline: [...(item.timeline || []), { 
        status: '已发放', 
        at: today, 
        by: distForm.distributor || '操作员',
        distQty: distForm.distQty,
        receiver: distForm.receiver || '',
        comment: distForm.distNote || '',
        action: 'dispatch'
      }]
    } : item);
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

  return (
    <main className="shell" style={{ '--accent': activeTab === 'approval' ? '#ea580c' : activeTab === 'inventory' ? inventoryConfig.accent : activeTab === 'distribution' ? distConfig.accent : activeTab === 'templates' ? templateConfig.accent : activeTab === 'purchase' ? purchaseConfig.accent : appConfig.accent }}>
      <section className="hero">
        <div>
          <div className="eyebrow">
            {activeTab === 'approval' ? <Gavel size={18} /> : activeTab === 'purchase' ? <ShoppingCart size={18} /> : <Ship size={18} />}
            {activeTab === 'approval' ? '审批管理' : activeTab === 'inventory' ? inventoryConfig.domain : activeTab === 'distribution' ? distConfig.domain : activeTab === 'templates' ? templateConfig.domain : activeTab === 'purchase' ? purchaseConfig.domain : appConfig.domain}
          </div>
          <h1>{activeTab === 'approval' ? '审批工作台' : activeTab === 'inventory' ? inventoryConfig.title : activeTab === 'distribution' ? distConfig.title : activeTab === 'templates' ? templateConfig.title : activeTab === 'purchase' ? purchaseConfig.title : appConfig.title}</h1>
          <p>{activeTab === 'approval' ? '集中处理待审批备件申请，支持批准、驳回与调整批准数量' : activeTab === 'inventory' ? inventoryConfig.subtitle : activeTab === 'distribution' ? distConfig.subtitle : activeTab === 'templates' ? templateConfig.subtitle : activeTab === 'purchase' ? purchaseConfig.subtitle : appConfig.subtitle}</p>
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
                  <div className="timeline">
                    {(selected.timeline || []).map((step, index) => (
                      <span key={index}>{step.at} · {step.status} · {step.by}</span>
                    ))}
                  </div>
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

                        {!showCreatePurchaseFromApp
                          ? (selected.status === '已批准' && !wasDispatched(selected) && (
                            <div className="purchase-create-entry">
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
                            </div>
                          ))
                          : (
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
                                <button className="primary" type="submit" disabled={!purchaseForm.supplier}>
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
                          )
                        }
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
                      .filter((item) => item.status === '已批准' && !wasDispatched(item))
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.partName} - {item.ship} - {item.system} - 需求{item.qty}
                        </option>
                      ))}
                  </select>
                </label>
                {purchaseForm.applicationId && (() => {
                  const app = records.find((item) => item.id === purchaseForm.applicationId);
                  return app ? (
                    <div className="wide dist-app-preview purchase-app-preview">
                      <span className="dist-app-label">申请信息</span>
                      <span>{app.partName} | {app.ship} · {app.system} · {app.location} | 需求{app.qty} | {app.urgency}紧急</span>
                    </div>
                  ) : null;
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
    </main>
  );
}

export default App;
