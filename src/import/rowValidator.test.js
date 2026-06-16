import { describe, it, expect } from 'vitest';
import { validateRow, categorizeRows } from './rowValidator';

function makeTypeConfig(overrides = {}) {
  return {
    requiredFields: ['ship', 'partName', 'qty'],
    config: {
      fields: [
        { key: 'ship', label: '所属船舶' },
        { key: 'partName', label: '备件名称' },
        { key: 'qty', label: '需求数量' },
      ],
    },
    extraValidate: () => {},
    internalDuplicateCheck: (a, b) => a.ship === b.ship && a.partName === b.partName,
    duplicateCheck: () => false,
    duplicateLabel: '同一船舶、同一备件',
    existingDuplicateLabel: '与现有记录重复',
    ...overrides,
  };
}

describe('rowValidator', () => {
  describe('validateRow', () => {
    it('合法行应无错误', () => {
      const fieldMapping = { '船舶': 'ship', '备件名称': 'partName', '数量': 'qty' };
      const row = { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '2' };
      const config = makeTypeConfig();

      const result = validateRow(row, fieldMapping, 0, [], [], config);
      expect(result.errors).toEqual([]);
      expect(result.record.ship).toBe('远洋一号');
      expect(result.record.partName).toBe('密封圈');
    });

    it('缺少必填字段应报错', () => {
      const fieldMapping = { '船舶': 'ship' };
      const row = { '船舶': '远洋一号' };
      const config = makeTypeConfig();

      const result = validateRow(row, fieldMapping, 0, [], [], config);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('备件名称'))).toBe(true);
    });

    it('extraValidate 自定义校验应生效', () => {
      const fieldMapping = { '船舶': 'ship', '备件名称': 'partName', '数量': 'qty' };
      const row = { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '-1' };
      const config = makeTypeConfig({
        extraValidate: (record, errors) => {
          if (Number(record.qty) < 0) errors.push('数量不能为负数');
        },
      });

      const result = validateRow(row, fieldMapping, 0, [], [], config);
      expect(result.errors).toContain('数量不能为负数');
    });

    it('与已有记录重复应报错', () => {
      const fieldMapping = { '船舶': 'ship', '备件名称': 'partName', '数量': 'qty' };
      const row = { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '2' };
      const existing = [{ ship: '远洋一号', partName: '密封圈' }];
      const config = makeTypeConfig({
        duplicateCheck: (record, ex) => ex.some(e => e.ship === record.ship && e.partName === record.partName),
      });

      const result = validateRow(row, fieldMapping, 0, existing, [], config);
      expect(result.errors).toContain('与现有记录重复');
    });

    it('导入文件内部重复应报错', () => {
      const fieldMapping = { '船舶': 'ship', '备件名称': 'partName', '数量': 'qty' };
      const row1 = { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '2' };
      const row2 = { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '3' };
      const config = makeTypeConfig();

      const parsedRows = [{ ship: '远洋一号', partName: '密封圈' }];
      const result = validateRow(row2, fieldMapping, 1, [], parsedRows, config);
      expect(result.errors.some(e => e.includes('重复'))).toBe(true);
    });

    it('未映射的列应被忽略', () => {
      const fieldMapping = { '船舶': 'ship', '备件名称': 'partName', '数量': 'qty' };
      const row = { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '2', '备注列': '额外信息' };
      const config = makeTypeConfig();

      const result = validateRow(row, fieldMapping, 0, [], [], config);
      expect(result.errors).toEqual([]);
      expect(result.record['备注列']).toBeUndefined();
    });
  });

  describe('categorizeRows', () => {
    it('应将行分为有效、错误和重复三类', () => {
      const fieldMapping = { '船舶': 'ship', '备件名称': 'partName', '数量': 'qty' };
      const rows = [
        { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '2' },
        { '船舶': '海运之星', '备件名称': '垫片', '数量': '3' },
        { '船舶': '远洋一号', '备件名称': '密封圈', '数量': '5' },
      ];
      const config = makeTypeConfig();

      const result = categorizeRows(rows, fieldMapping, [], config);
      expect(result.validRows.length).toBe(3);
      expect(result.duplicateRows.length).toBe(1);
      expect(result.errorRows.length).toBe(0);
    });

    it('仅有其他错误（非重复）的行应归入 errorRows', () => {
      const fieldMapping = { '船舶': 'ship' };
      const rows = [
        { '船舶': '远洋一号' },
      ];
      const config = makeTypeConfig();

      const result = categorizeRows(rows, fieldMapping, [], config);
      expect(result.errorRows.length).toBe(1);
      expect(result.validRows.length).toBe(0);
    });

    it('空行列表应返回空分类', () => {
      const result = categorizeRows([], {}, [], makeTypeConfig());
      expect(result.validRows).toEqual([]);
      expect(result.errorRows).toEqual([]);
      expect(result.duplicateRows).toEqual([]);
    });
  });
});
