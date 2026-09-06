import React from 'react';
import {
  FinancialTransactionCard,
  FinancialTransactionItem,
  FinancialTransactionCardProps,
} from './FinancialTransactionCard';

export type WalletTransactionItem = FinancialTransactionItem;
export type WalletTransactionCardProps = FinancialTransactionCardProps;

export function WalletTransactionCard(props: WalletTransactionCardProps) {
  return <FinancialTransactionCard {...props} />;
}

export default WalletTransactionCard;

