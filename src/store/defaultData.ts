import type { Nutrient, Material, Formula } from '../types';

function genId(prefix: string, i: number) {
  return `${prefix}_default_${i}`;
}
const now = new Date().toISOString();

export const defaultNutrients: Nutrient[] = [
  { id: genId('nut', 1), name: '蛋白质', unit: 'g/100g', category: 'common', remark: '凯氏定氮法测定', status: 'active', sortOrder: 1, createdAt: now, updatedAt: now },
  { id: genId('nut', 2), name: '脂肪', unit: 'g/100g', category: 'common', remark: '索氏抽提法测定', status: 'active', sortOrder: 2, createdAt: now, updatedAt: now },
  { id: genId('nut', 3), name: '乳糖', unit: 'g/100g', category: 'common', status: 'active', sortOrder: 3, createdAt: now, updatedAt: now },
  { id: genId('nut', 4), name: '非脂乳固体', unit: 'g/100g', category: 'common', status: 'active', sortOrder: 4, createdAt: now, updatedAt: now },
  { id: genId('nut', 5), name: '总固形物', unit: 'g/100g', category: 'common', status: 'active', sortOrder: 5, createdAt: now, updatedAt: now },
  { id: genId('nut', 6), name: '水分', unit: 'g/100g', category: 'common', status: 'active', sortOrder: 6, createdAt: now, updatedAt: now },
  { id: genId('nut', 7), name: '灰分', unit: 'g/100g', category: 'common', status: 'active', sortOrder: 7, createdAt: now, updatedAt: now },
  { id: genId('nut', 8), name: '酸度', unit: '°T', category: 'physical', remark: '滴定酸度', status: 'active', sortOrder: 8, createdAt: now, updatedAt: now },
  { id: genId('nut', 9), name: '钙', unit: 'mg/100g', category: 'common', status: 'active', sortOrder: 9, createdAt: now, updatedAt: now },
];

export const defaultMaterials: Material[] = [
  {
    id: genId('mat', 1),
    name: '生牛乳',
    code: 'RM001',
    category: 'base',
    unit: 'kg',
    status: 'active',
    remark: '新鲜生牛乳，符合GB 6914标准',
    stock: 5000,
    safeStock: 1000,
    unitCost: 4.2,
    nutrients: [
      { nutrientId: genId('nut', 1), value: 3.0 },
      { nutrientId: genId('nut', 2), value: 3.7 },
      { nutrientId: genId('nut', 3), value: 4.5 },
      { nutrientId: genId('nut', 4), value: 8.5 },
      { nutrientId: genId('nut', 6), value: 88.5 },
      { nutrientId: genId('nut', 8), value: 16 },
      { nutrientId: genId('nut', 9), value: 104 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: genId('mat', 2),
    name: '脱脂乳粉',
    code: 'RM002',
    category: 'base',
    unit: 'kg',
    status: 'active',
    remark: '喷雾干燥脱脂乳粉，蛋白质≥34%',
    stock: 800,
    safeStock: 200,
    unitCost: 28.0,
    nutrients: [
      { nutrientId: genId('nut', 1), value: 35.0 },
      { nutrientId: genId('nut', 2), value: 1.0 },
      { nutrientId: genId('nut', 3), value: 52.0 },
      { nutrientId: genId('nut', 6), value: 4.0 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: genId('mat', 3),
    name: '稀奶油',
    code: 'RM003',
    category: 'base',
    unit: 'kg',
    status: 'active',
    remark: '稀奶油，脂肪含量35%',
    stock: 600,
    safeStock: 100,
    unitCost: 38.0,
    nutrients: [
      { nutrientId: genId('nut', 1), value: 2.5 },
      { nutrientId: genId('nut', 2), value: 35.0 },
      { nutrientId: genId('nut', 6), value: 60.5 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: genId('mat', 4),
    name: '白砂糖',
    code: 'RM004',
    category: 'sweetener',
    unit: 'kg',
    status: 'active',
    stock: 2000,
    safeStock: 500,
    unitCost: 6.5,
    nutrients: [
      { nutrientId: genId('nut', 5), value: 99.7 },
      { nutrientId: genId('nut', 6), value: 0.3 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: genId('mat', 5),
    name: '全脂乳粉',
    code: 'RM005',
    category: 'base',
    unit: 'kg',
    status: 'active',
    stock: 50,
    safeStock: 200,
    unitCost: 32.0,
    nutrients: [
      { nutrientId: genId('nut', 1), value: 25.0 },
      { nutrientId: genId('nut', 2), value: 28.0 },
      { nutrientId: genId('nut', 3), value: 38.0 },
      { nutrientId: genId('nut', 6), value: 3.0 },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

export const defaultFormulas: Formula[] = [
  {
    id: genId('form', 1),
    name: '常温纯牛奶',
    code: 'PD001',
    category: 'pure_milk',
    status: 'active',
    defaultYield: 1000,
    remark: '符合GB 25190-2022标准',
    ingredients: [
      { materialId: genId('mat', 1), minRatio: 0.90, maxRatio: 1.0 },
      { materialId: genId('mat', 2), minRatio: 0.0, maxRatio: 0.05 },
      { materialId: genId('mat', 3), minRatio: 0.0, maxRatio: 0.03 },
    ],
    nutrientConstraints: [
      { nutrientId: genId('nut', 1), min: 2.9, max: 4.5, target: 3.2, standard: 'GB 25190-2022' },
      { nutrientId: genId('nut', 2), min: 3.1, max: 5.0, target: 3.7 },
      { nutrientId: genId('nut', 4), min: 8.1, max: 12.0, target: 8.5 },
    ],
    currentVersion: 'V1.0',
    versions: [{
      version: 'V1.0',
      savedAt: now,
      changeSummary: '初始版本',
      snapshot: {
        name: '常温纯牛奶', code: 'PD001', category: 'pure_milk',
        status: 'active', defaultYield: 1000,
        ingredients: [
          { materialId: genId('mat', 1), minRatio: 0.90, maxRatio: 1.0 },
          { materialId: genId('mat', 2), minRatio: 0.0, maxRatio: 0.05 },
          { materialId: genId('mat', 3), minRatio: 0.0, maxRatio: 0.03 },
        ],
        nutrientConstraints: [
          { nutrientId: genId('nut', 1), min: 2.9, max: 4.5, target: 3.2 },
          { nutrientId: genId('nut', 2), min: 3.1, max: 5.0, target: 3.7 },
          { nutrientId: genId('nut', 4), min: 8.1, max: 12.0, target: 8.5 },
        ],
      }
    }],
    createdAt: now,
    updatedAt: now,
  },
];
