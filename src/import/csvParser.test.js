import { describe, it, expect } from 'vitest';
import { trimField, parseCSV, escapeCSVField } from './csvParser';

describe('csvParser', () => {
  describe('trimField', () => {
    it('应去除首尾空白字符', () => {
      expect(trimField('  hello  ')).toBe('hello');
    });

    it('应去除 BOM 和特殊空白', () => {
      expect(trimField('\uFEFF\u00A0测试\u00A0')).toBe('测试');
    });

    it('null 或 undefined 应返回空字符串', () => {
      expect(trimField(null)).toBe('');
      expect(trimField(undefined)).toBe('');
    });

    it('数字类型应转为字符串', () => {
      expect(trimField(123)).toBe('123');
    });
  });

  describe('parseCSV', () => {
    it('应解析基本的逗号分隔 CSV', () => {
      const result = parseCSV('姓名,数量,状态\n密封圈,2,待审批\n垫片,3,已批准');
      expect(result.headers).toEqual(['姓名', '数量', '状态']);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0]['姓名']).toBe('密封圈');
      expect(result.rows[0]['数量']).toBe('2');
    });

    it('应自动检测制表符分隔', () => {
      const result = parseCSV('姓名\t数量\n密封圈\t2');
      expect(result.headers).toEqual(['姓名', '数量']);
      expect(result.rows[0]['姓名']).toBe('密封圈');
    });

    it('应自动检测分号分隔', () => {
      const result = parseCSV('姓名;数量\n密封圈;2');
      expect(result.headers).toEqual(['姓名', '数量']);
    });

    it('应处理引号包裹的字段', () => {
      const result = parseCSV('名称,备注\n密封圈,"包含逗号,的内容"');
      expect(result.rows[0]['备注']).toBe('包含逗号,的内容');
    });

    it('应处理字段内的双引号转义', () => {
      const result = parseCSV('名称,备注\n密封圈,"含""引号""内容"');
      expect(result.rows[0]['备注']).toBe('含"引号"内容');
    });

    it('应处理 BOM 开头的文件', () => {
      const result = parseCSV('\ufeff姓名,数量\n密封圈,2');
      expect(result.headers).toEqual(['姓名', '数量']);
    });

    it('应处理 CRLF 换行', () => {
      const result = parseCSV('姓名,数量\r\n密封圈,2');
      expect(result.rows.length).toBe(1);
    });

    it('空内容应返回空结果', () => {
      const result = parseCSV('');
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('仅标题行应返回空结果', () => {
      const result = parseCSV('姓名,数量');
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('应忽略全空行', () => {
      const result = parseCSV('姓名,数量\n密封圈,2\n\n\n垫片,3');
      expect(result.rows.length).toBe(2);
    });

    it('短行缺失字段应填充空字符串', () => {
      const result = parseCSV('姓名,数量,状态\n密封圈,2');
      expect(result.rows[0]['状态']).toBe('');
    });

    it('应去除字段首尾空白', () => {
      const result = parseCSV('姓名, 数量\n 密封圈 , 2 ');
      expect(result.rows[0]['姓名']).toBe('密封圈');
      expect(result.rows[0]['数量']).toBe('2');
    });
  });

  describe('escapeCSVField', () => {
    it('不含特殊字符的字段应原样返回', () => {
      expect(escapeCSVField('hello')).toBe('hello');
    });

    it('包含逗号的字段应用引号包裹', () => {
      expect(escapeCSVField('a,b')).toBe('"a,b"');
    });

    it('包含双引号的字段应转义并包裹', () => {
      expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""');
    });

    it('包含换行的字段应用引号包裹', () => {
      expect(escapeCSVField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('null 或 undefined 应返回空字符串', () => {
      expect(escapeCSVField(null)).toBe('');
      expect(escapeCSVField(undefined)).toBe('');
    });

    it('数字应转为字符串', () => {
      expect(escapeCSVField(42)).toBe('42');
    });
  });
});
