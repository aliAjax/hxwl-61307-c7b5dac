import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

function getTabButtons() {
  return document.querySelectorAll('.tabs .tab');
}

function getH1Text() {
  const h1 = document.querySelector('h1');
  return h1 ? h1.textContent : '';
}

describe('App 冒烟测试', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('hxwl-61307-data-version', '3');
    localStorage.setItem('hxwl-61307-operator', '测试用户');
  });

  it('应成功渲染主界面且不崩溃', () => {
    render(<App />);
    expect(getH1Text()).toContain('船舶备件申领');
  });

  it('默认应显示申请列表标签页', () => {
    render(<App />);
    const tabs = getTabButtons();
    expect(tabs.length).toBeGreaterThan(0);
    expect(tabs[0].classList.contains('tab-active')).toBe(true);
  });

  it('所有10个标签页按钮都应存在', () => {
    render(<App />);
    const tabs = getTabButtons();
    expect(tabs.length).toBe(10);
  });

  it('点击审批工作台标签应切换到审批页面', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /审批工作台/ }));
    await waitFor(() => {
      expect(getH1Text()).toContain('审批工作台');
    });
  });

  it('点击备件库存台账标签应切换到库存页面', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /备件库存台账/ }));
    await waitFor(() => {
      expect(getH1Text()).toContain('备件库存台账');
    });
  });

  it('点击采购跟踪标签应切换到采购页面', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /采购跟踪/ }));
    await waitFor(() => {
      expect(getH1Text()).toContain('采购跟踪');
    });
  });

  it('点击发放登记标签应切换到发放页面', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /发放登记/ }));
    await waitFor(() => {
      expect(getH1Text()).toContain('发放');
    });
  });

  it('点击常用备件模板标签应切换到模板页面', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /常用备件模板/ }));
    await waitFor(() => {
      expect(getH1Text()).toContain('模板');
    });
  });

  it('标签页切换后 activeTab 样式应更新', async () => {
    const user = userEvent.setup();
    render(<App />);

    const tabs = getTabButtons();
    expect(tabs[0].classList.contains('tab-active')).toBe(true);

    await user.click(screen.getByRole('button', { name: /备件库存台账/ }));
    await waitFor(() => {
      const updatedTabs = getTabButtons();
      expect(updatedTabs[2].classList.contains('tab-active')).toBe(true);
      expect(updatedTabs[0].classList.contains('tab-active')).toBe(false);
    });
  });

  it('应用配置端口号应正确显示', () => {
    render(<App />);
    expect(screen.getByText('61307')).toBeDefined();
  });
});

describe('App - localStorage 集成冒烟验证', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('hxwl-61307-data-version', '3');
    localStorage.setItem('hxwl-61307-operator', '集成测试用户');
  });

  it('应在 localStorage 中正确保留操作人设置', () => {
    render(<App />);
    expect(localStorage.getItem('hxwl-61307-operator')).toBe('集成测试用户');
  });

  it('同步管理标签按钮应存在且可点击', async () => {
    const user = userEvent.setup();
    render(<App />);

    const syncBtn = screen.getByRole('button', { name: /同步管理/ });
    expect(syncBtn).toBeDefined();
    await user.click(syncBtn);
  });

  it('审计与迁移标签按钮应存在且可点击', async () => {
    const user = userEvent.setup();
    render(<App />);

    const auditBtn = screen.getByRole('button', { name: /审计与迁移/ });
    expect(auditBtn).toBeDefined();
    await user.click(auditBtn);
  });
});
