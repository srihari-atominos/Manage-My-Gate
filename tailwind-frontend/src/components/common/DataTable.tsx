import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'src/components/ui/table';
import { Card, CardContent } from 'src/components/ui/card';

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  toolbar?: React.ReactNode;
  renderRowActions?: (row: T) => React.ReactNode;
  currentPage?: number;
  totalPages?: number;
  rowsPerPage?: number;
  rowsPerPageOptions?: number[];
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  loading?: boolean;
}

export default function DataTable<T extends { id?: string | number; _id?: string | number }>({
  columns,
  data,
  toolbar,
  renderRowActions,
  currentPage = 1,
  totalPages = 1,
  rowsPerPage = 10,
  rowsPerPageOptions = [10, 20, 50],
  onPageChange = () => {},
  onRowsPerPageChange = () => {},
  loading = false,
}: DataTableProps<T>) {
  return (
    <Card className="mb-4 border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
      <CardContent className="p-0">
        {/* Responsive Toolbar */}
        {toolbar && <div className="flex flex-wrap items-center gap-3 mb-4">{toolbar}</div>}

        {/* Scrollable Container with sticky header support */}
        <div className="relative rounded-md border border-stroke dark:border-strokedark max-h-[50vh] overflow-y-auto">
          <Table className="w-full">
            <TableHeader className="bg-gray-2 dark:bg-meta-4 sticky top-0 z-10 border-b border-stroke dark:border-strokedark">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 py-3 px-4 sticky top-0 bg-gray-50 dark:bg-boxdark-2"
                  >
                    {col.label}
                  </TableHead>
                ))}
                {renderRowActions && (
                  <TableHead
                    className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 py-3 px-4 sticky top-0 bg-gray-50 dark:bg-boxdark-2"
                  >
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (renderRowActions ? 1 : 0)}
                    className="text-center py-12"
                  >
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Loading data...
                    </span>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (renderRowActions ? 1 : 0)}
                    className="text-center text-gray-500 dark:text-gray-400 py-12 text-sm"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow
                    key={row.id || row._id || index}
                    className="border-b border-stroke hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4/20"
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className="text-sm text-black dark:text-white py-3.5 px-4 whitespace-nowrap"
                      >
                        {col.render ? col.render(row[col.key as keyof T], row) : (row[col.key as keyof T] as unknown as React.ReactNode)}
                      </TableCell>
                    ))}
                    {renderRowActions && (
                      <TableCell className="text-sm py-3.5 px-4 whitespace-nowrap">
                        {renderRowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination & Sizer Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-stroke dark:border-strokedark">
          {/* Left: Rows Per Page Sizer */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              className="rounded border border-stroke bg-transparent py-1 px-2 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              {rowsPerPageOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-white dark:bg-boxdark text-black dark:text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Pagination Navigation */}
          {totalPages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Page navigation">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="inline-flex items-center justify-center rounded border border-stroke px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 disabled:opacity-50 disabled:pointer-events-none"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-primary text-white'
                      : 'border border-stroke hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 text-black'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="inline-flex items-center justify-center rounded border border-stroke px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 disabled:opacity-50 disabled:pointer-events-none"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
