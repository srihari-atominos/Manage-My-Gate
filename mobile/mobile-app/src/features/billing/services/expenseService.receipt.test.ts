jest.mock('../../../services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getApiBaseUrl: jest.fn(() => 'http://localhost:5006/api/v1'),
}));

jest.mock('../../../utils/storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));

import { receiptFormData } from './expenseService';

class CapturingFormData {
  parts: unknown[][] = [];
  append(...parts: unknown[]) { this.parts.push(parts); }
}

describe('expense receipt uploads', () => {
  const originalFormData = global.FormData;

  beforeEach(() => {
    (global as any).FormData = CapturingFormData;
  });

  afterEach(() => {
    (global as any).FormData = originalFormData;
  });

  it('sends the browser File instead of a React Native URI object on web', async () => {
    const browserFile = { name: 'receipt.png', type: 'image/png' };
    const form: any = await receiptFormData('receipt', {
      uri: 'blob:receipt',
      name: 'receipt.png',
      type: 'image/png',
      file: browserFile,
    }, 'web');

    expect(form.parts).toEqual([['receipt', browserFile, 'receipt.png']]);
  });

  it('uses the React Native URI descriptor on native platforms', async () => {
    const form: any = await receiptFormData('attachment', {
      uri: 'file:///receipt.jpg',
      name: 'receipt.jpg',
      type: 'image/jpeg',
    }, 'android');

    expect(form.parts).toEqual([['attachment', {
      uri: 'file:///receipt.jpg',
      name: 'receipt.jpg',
      type: 'image/jpeg',
    }]]);
  });
});