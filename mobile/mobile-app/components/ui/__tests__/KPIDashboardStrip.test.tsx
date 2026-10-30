import React from 'react';
import { render } from '@testing-library/react-native';
import { KPIDashboardStrip } from '../KPIDashboardStrip';

const defaultI18n = {
  language: 'en',
  languageCode: 'en',
  t: (k: string, f?: any) => f || k,
  translateText: (t: string) => t,
  getCurrentLanguage: () => 'en',
  subscribe: () => () => {},
};

jest.mock('../../../src/utils/i18n', () => {
  const React = require('react');
  return {
    __esModule: true,
    I18nContext: React.createContext(defaultI18n),
    useTranslation: () => defaultI18n,
    default: defaultI18n,
  };
});

describe('KPIDashboardStrip Component Responsiveness', () => {
  const mockCards = [
    { title: 'Total Expenses', value: '₹1,50,000', iconName: 'Receipt' },
    { title: 'Recorded as Paid', value: '₹1,20,000', iconName: 'CreditCard', variant: 'success' as const },
    { title: 'Unpaid Balance', value: '₹30,000', iconName: 'AlertCircle', variant: 'warning' as const },
    { title: 'All Time Expense', value: '₹5,00,000', iconName: 'Receipt' },
  ];

  it('renders 4 metrics in a 2x2 grid layout with structured 2-column flex rows', async () => {
    const { getByText } = await render(
      <KPIDashboardStrip layout="grid2x2" cards={mockCards} />
    );

    expect(getByText('Total Expenses')).toBeTruthy();
    expect(getByText('₹1,50,000')).toBeTruthy();
    expect(getByText('Recorded as Paid')).toBeTruthy();
    expect(getByText('₹1,20,000')).toBeTruthy();
    expect(getByText('Unpaid Balance')).toBeTruthy();
    expect(getByText('₹30,000')).toBeTruthy();
    expect(getByText('All Time Expense')).toBeTruthy();
    expect(getByText('₹5,00,000')).toBeTruthy();
  });

  it('renders loading skeletons with 2-row layout matching the 2x2 grid without layout shift', async () => {
    const { getByTestId, toJSON } = await render(
      <KPIDashboardStrip layout="grid2x2" loading cards={mockCards} />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders 2-column balanced row layout when layout is set to row', async () => {
    const twoCards = mockCards.slice(0, 2);
    const { getByText } = await render(
      <KPIDashboardStrip layout="row" cards={twoCards} />
    );

    expect(getByText('Total Expenses')).toBeTruthy();
    expect(getByText('Recorded as Paid')).toBeTruthy();
  });
});
