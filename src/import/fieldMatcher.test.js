import { describe, it, expect } from 'vitest';
import { matchField, buildFieldMapping, getMissingRequiredFields } from './fieldMatcher';

const sampleAliasMap = {
  ship: ['所属船舶', '船舶', '船名', 'ship', 'vessel'],
  partName: ['备件名称', '备件', 'partname', 'part'],
  qty: ['数量', '申请数量', 'qty'],
};

const sampleConfigFields = [
  { key: 'ship', label: '所属船舶' },
  { key: 'partName', label: '备件名称' },
  { key: 'qty', label: '需求数量' },
  { key: 'reason', label: '申请原因' },
];

describe('fieldMatcher', () => {
  describe('matchField', () => {
    it('应精确匹配别名', () => {
      expect(matchField('船舶', sampleAliasMap)).toBe('ship');
      expect(matchField('备件', sampleAliasMap)).toBe('partName');
    });

    it('应忽略大小写匹配英文别名', () => {
      expect(matchField('SHIP', sampleAliasMap)).toBe('ship');
      expect(matchField('PartName', sampleAliasMap)).toBe('partName');
    });

    it('不匹配的别名应返回 null', () => {
      expect(matchField('未知字段', sampleAliasMap)).toBeNull();
    });

    it('应忽略首尾空白', () => {
      expect(matchField('  船舶  ', sampleAliasMap)).toBe('ship');
    });
  });

  describe('buildFieldMapping', () => {
    it('应正确映射已知字段并标记未知字段', () => {
      const result = buildFieldMapping(['船舶', '备件名称', '备注列'], sampleAliasMap, sampleConfigFields);

      expect(result.fieldMapping['船舶']).toBe('ship');
      expect(result.fieldMapping['备件名称']).toBe('partName');
      expect(result.fieldMapping['备注列']).toBeNull();

      expect(result.recognizedFields.length).toBe(2);
      expect(result.unrecognizedFields).toEqual(['备注列']);
    });

    it('recognizedFields 应包含 label 信息', () => {
      const result = buildFieldMapping(['船舶'], sampleAliasMap, sampleConfigFields);
      expect(result.recognizedFields[0].label).toBe('所属船舶');
      expect(result.recognizedFields[0].csv).toBe('船舶');
      expect(result.recognizedFields[0].field).toBe('ship');
    });

    it('全部未知字段应返回空的 recognizedFields', () => {
      const result = buildFieldMapping(['AAA', 'BBB'], sampleAliasMap, sampleConfigFields);
      expect(result.recognizedFields.length).toBe(0);
      expect(result.unrecognizedFields.length).toBe(2);
    });
  });

  describe('getMissingRequiredFields', () => {
    it('应返回尚未映射的必填字段标签', () => {
      const recognized = [
        { field: 'ship', csv: '船舶', label: '所属船舶' },
        { field: 'partName', csv: '备件名称', label: '备件名称' },
      ];
      const missing = getMissingRequiredFields(['ship', 'partName', 'qty', 'reason'], recognized, sampleConfigFields);
      expect(missing).toEqual(['需求数量', '申请原因']);
    });

    it('所有必填字段都已映射应返回空数组', () => {
      const recognized = [
        { field: 'ship', csv: '船舶', label: '所属船舶' },
        { field: 'partName', csv: '备件名称', label: '备件名称' },
      ];
      const missing = getMissingRequiredFields(['ship', 'partName'], recognized, sampleConfigFields);
      expect(missing).toEqual([]);
    });
  });
});
