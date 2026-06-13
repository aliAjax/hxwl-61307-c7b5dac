import { useMemo, useState } from 'react';
import { Ship, Plus, Search, Trash2, AlertTriangle, ClipboardList, CalendarDays, CheckCircle2, Package, ListTodo, Truck, UserCheck, FileText, Bookmark, ArrowRightLeft } from 'lucide-react';
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
  "statuses": [
    "待审批",
    "已批准",
    "已发放",
    "已驳回"
  ],
  "primaryStatus": "待审批",
  "fields": [
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
      "partName": "海水泵密封圈",
      "system": "机舱",
      "location": "二副库",
      "qty": "2",
      "urgency": "高",
      "reason": "巡检发现渗漏，需预防性更换",
      "status": "待审批"
    },
    {
      "partName": "甲板照明灯泡",
      "system": "电气",
      "location": "甲板库",
      "qty": "12",
      "urgency": "中",
      "reason": "夜航照明备货",
      "status": "已批准"
    },
    {
      "partName": "消防水带接口",
      "system": "消防",
      "location": "消防站",
      "qty": "4",
      "urgency": "高",
      "reason": "演练后发现老化",
      "status": "已发放"
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
      "label": "备件/系统",
      "type": "search",
      "match": "`${item.partName}${item.system}${item.location}`.includes(filters.query)"
    },
    {
      "key": "status",
      "label": "申请状态",
      "type": "status"
    }
  ],
  "cardTitle": "item.partName",
  "cardMeta": "`${item.system} · ${item.location} · ${item.urgency}紧急`",
  "cardDetail": "`数量${item.qty}｜${item.reason}`",
  "history": true,
  "note": "每条申请都能查看简化的状态流转记录。",
  "defaultValues": {
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
    { key: "partName", label: "备件名称", type: "input", placeholder: "海水泵密封圈" },
    { key: "system", label: "设备系统", type: "select", placeholder: "机舱", options: ["机舱", "甲板", "电气", "消防", "导航"] },
    { key: "location", label: "默认位置", type: "input", placeholder: "二副库" },
    { key: "qty", label: "默认数量", type: "number", placeholder: "2" },
    { key: "reason", label: "常用申请原因", type: "textarea", placeholder: "巡检发现渗漏，需预防性更换" }
  ],
  seed: [
    { templateName: "海水泵日常维护", partName: "海水泵密封圈", system: "机舱", location: "二副库", qty: "2", reason: "巡检发现渗漏，需预防性更换" },
    { templateName: "甲板照明维护", partName: "甲板照明灯泡", system: "电气", location: "甲板库", qty: "12", reason: "夜航照明备货，定期更换" },
    { templateName: "消防设备检查", partName: "消防水带接口", system: "消防", location: "消防站", qty: "4", reason: "演练后发现老化，需更换" }
  ],
  defaultValues: {
    templateName: "",
    partName: "",
    system: "机舱",
    location: "",
    qty: "1",
    reason: ""
  }
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
      return JSON.parse(raw);
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
      return JSON.parse(raw);
    } catch {
      return templateConfig.seed.map(item => ({ id: uid(), ...item }));
    }
  }
  return templateConfig.seed.map(item => ({ id: uid(), ...item }));
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

function statusClass(status) {
  const index = appConfig.statuses.indexOf(status);
  return ['status-a', 'status-b', 'status-c', 'status-d'][index] || 'status-a';
}

function App() {
  const [activeTab, setActiveTab] = useState('application');

  const [records, setRecords] = useState(loadRecords);
  const [form, setForm] = useState(appConfig.defaultValues);
  const [filters, setFilters] = useState({ query: '', status: '全部' });
  const [selected, setSelected] = useState(null);

  const [inventory, setInventory] = useState(loadInventory);
  const [invForm, setInvForm] = useState(inventoryConfig.defaultValues);
  const [invFilters, setInvFilters] = useState({ query: '', system: '全部', lowStockOnly: false });
  const [selectedInv, setSelectedInv] = useState(null);

  const [distRecords, setDistRecords] = useState(() => {
    const raw = localStorage.getItem(distConfig.storage);
    if (raw) {
      try { return JSON.parse(raw); } catch { return []; }
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
        partName: template.partName,
        system: template.system,
        location: template.location,
        qty: template.qty,
        reason: template.reason
      });
    }
    setSelectedApplyTemplate('');
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
    const distRecord = {
      id: uid(),
      applicationId: distForm.applicationId,
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
      distribution: distRecord,
      timeline: [...(item.timeline || []), { status: '已发放', at: today, by: distForm.distributor || '操作员' }]
    } : item);
    persist(updatedRecords);
    if (selected?.id === distForm.applicationId) {
      setSelected(updatedRecords.find((item) => item.id === distForm.applicationId));
    }
    setDistForm({ ...distConfig.defaultValues, applicationId: '' });
    setSelectedDist(distRecord);
  }

  const filteredRecords = useMemo(() => {
    return records
      .filter((item) => !filters.query || `${item.partName}${item.system}${item.location}`.includes(filters.query))
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

  const metrics = [
    { label: "申请数", value: records.length },
    { label: "高紧急", value: records.filter((item) => item.urgency === '高').length },
    { label: "待审批", value: records.filter((item) => item.status === '待审批').length },
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

  const templatesBySystem = useMemo(() => {
    return filteredTemplates.reduce((acc, item) => {
      const key = item.system || '未分类';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredTemplates]);

  return (
    <main className="shell" style={{ '--accent': activeTab === 'inventory' ? inventoryConfig.accent : activeTab === 'distribution' ? distConfig.accent : activeTab === 'templates' ? templateConfig.accent : appConfig.accent }}>
      <section className="hero">
        <div>
          <div className="eyebrow">
            <Ship size={18} />
            {activeTab === 'inventory' ? inventoryConfig.domain : activeTab === 'distribution' ? distConfig.domain : activeTab === 'templates' ? templateConfig.domain : appConfig.domain}
          </div>
          <h1>{activeTab === 'inventory' ? inventoryConfig.title : activeTab === 'distribution' ? distConfig.title : activeTab === 'templates' ? templateConfig.title : appConfig.title}</h1>
          <p>{activeTab === 'inventory' ? inventoryConfig.subtitle : activeTab === 'distribution' ? distConfig.subtitle : activeTab === 'templates' ? templateConfig.subtitle : appConfig.subtitle}</p>
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
      </div>

      {activeTab === 'application' && (
        <>
          <section className="metrics">
            {metrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
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
                  <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder={appConfig.filters[0]?.label || '搜索'} />
                </div>
                <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                  <option>全部</option>
                  {appConfig.statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>

              <div className="records">
                {filteredRecords.map((item) => (
                  <article className={'record ' + (item.conflict || hasOverlap(item, records) ? 'conflict' : '')} key={item.id} onClick={() => setSelected(item)}>
                    <div className="record-head">
                      <div>
                        <h3>{item.partName}</h3>
                        <p>{`${item.system} · ${item.location} · ${item.urgency}紧急`}</p>
                      </div>
                      <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                    </div>
                    <p className="record-detail">{`数量${item.qty}｜${item.reason}`}</p>
                    {(item.conflict || hasOverlap(item, records)) && <div className="warning"><AlertTriangle size={15} />发现冲突</div>}
                    <div className="actions" onClick={(event) => event.stopPropagation()}>
                      {appConfig.statuses.map((status) => (
                        <button key={status} type="button" onClick={() => updateStatus(item.id, status)}>{status}</button>
                      ))}
                      <button className="ghost-danger" type="button" onClick={() => removeRecord(item.id)}><Trash2 size={14} /></button>
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
                </div>
              ) : (
                <p className="empty">点击任意记录查看详情和状态流转。</p>
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
                      .filter((item) => item.status === '已批准')
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
    </main>
  );
}

export default App;
