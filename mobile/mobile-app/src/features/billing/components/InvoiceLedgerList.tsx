import React from 'react';
import { PaginatedList, ListCard } from '@/components/ui';
import { Invoice } from '../store/billingSlice';
import { StatusVariant } from '@/components/ui/StatusBadge';

interface InvoiceLedgerListProps {
  invoices: Invoice[];
  pagination?: { currentPage: number; totalPages: number; totalRecords: number; limit: number };
  loading?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const InvoiceLedgerList: React.FC<InvoiceLedgerListProps> = ({
  invoices = [],
  pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
  loading = false,
  onRefresh = () => {},
  onEndReached = () => {},
  onSelectInvoice,
}) => {
  const renderItem = (item: Invoice) => {
    const isPaid = item.status === 'PAID';
    const isOverdue = item.status === 'OVERDUE';
    const badgeVariant: StatusVariant = isPaid
      ? 'success'
      : isOverdue
      ? 'danger'
      : item.status === 'VERIFICATION_PENDING'
      ? 'warning'
      : 'neutral';

    return (
      <ListCard
        title={item.invoiceNumber || `Invoice #${item._id.slice(-6)}`}
        subtitle={`${item.date || 'Period Bill'} • ${item.unitNumber ? `Unit ${item.unitNumber}` : 'General'}`}
        leftIcon="FileText"
        leftIconBgColor="#dbeafe"
        leftIconColor="#2563eb"
        status={{
          label: item.status.replace('_', ' '),
          variant: badgeVariant,
        }}
        onPress={() => onSelectInvoice(item)}
      />
    );
  };

  return (
    <PaginatedList
      data={invoices}
      renderItem={(item: Invoice) => renderItem(item)}
      pagination={pagination}
      onLoadMore={onEndReached}
      onRefresh={onRefresh}
      loading={loading}
      emptyIcon="FileText"
      emptyTitle="No Invoices Found"
      emptySubtitle="There are no billing invoices recorded for the selected filter or period."
    />
  );
};

export default InvoiceLedgerList;
