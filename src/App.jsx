import { useMemo, useState } from 'react';
import { Ship, Plus, Search, Trash2, AlertTriangle, ClipboardList, CalendarDays, CheckCircle2, Package, ListTodo } from 'lucide-react';
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

function isLowStock(item) {
  const current = Number(item.currentStock);
  const safety = Number(item.safetyStock);
  return Number.isFinite(current) && Number.isFinite(safety) && current <= safety;
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

  return (
    <main className="shell" style={{ '--accent': activeTab === 'inventory' ? inventoryConfig.accent : appConfig.accent }}>
      <section className="hero">
        <div>
          <div className="eyebrow">
            <Ship size={18} />
            {activeTab === 'inventory' ? inventoryConfig.domain : appConfig.domain}
          </div>
          <h1>{activeTab === 'inventory' ? inventoryConfig.title : appConfig.title}</h1>
          <p>{activeTab === 'inventory' ? inventoryConfig.subtitle : appConfig.subtitle}</p>
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
    </main>
  );
}

export default App;
