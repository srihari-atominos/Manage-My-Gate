import React, { useState } from 'react';
import { Database, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from 'src/components/ui/badge';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';

export const VisitorLogsTable = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Let's set logs per page slightly higher than legacy 3 for better view

  // Filter logs based on search and drop-downs
  const filteredLogs = logs.filter(log => {
    const name = log.visitorName || log.snapshot?.visitorName || '';
    const destination = log.villa || (log.passId?.villaId?.villaNumber || '');
    const guardName = log.guard || log.guardId?.name || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guardName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const type = log.type || (log.entryType === 'PRE_APPROVED' ? 'guest' : 'walk_in');
    const matchesType = typeFilter === 'all' || type === typeFilter;

    const status = log.status || log.logStatus;
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col min-h-[430px]">
      
      {/* Top filter toolbar */}
      <div className="flex-grow">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white">
            <Database className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>Visitor Logs Database</span>
          </h3>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-[200px]">
              <Input 
                type="text" 
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white pr-8 py-1.5"
              />
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>

            {/* Type Selector */}
            <select 
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              <option value="all" className="bg-white dark:bg-boxdark">All Types</option>
              <option value="guest" className="bg-white dark:bg-boxdark">Guest</option>
              <option value="cab_delivery" className="bg-white dark:bg-boxdark">Cab & Delivery</option>
              <option value="service" className="bg-white dark:bg-boxdark">Service</option>
              <option value="walk_in" className="bg-white dark:bg-boxdark">Walk-in</option>
            </select>

            {/* Status Selector */}
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              <option value="all" className="bg-white dark:bg-boxdark">All Statuses</option>
              <option value="INSIDE" className="bg-white dark:bg-boxdark">Inside</option>
              <option value="COMPLETED" className="bg-white dark:bg-boxdark">Completed</option>
              <option value="REJECTED" className="bg-white dark:bg-boxdark">Rejected</option>
            </select>
          </div>
        </div>

        {currentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] text-gray-400 dark:text-gray-500 gap-1.5 text-center">
            <Database className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-1" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">No entry logs found matching filters.</span>
          </div>
        ) : (
          <div className="relative rounded-md border border-stroke dark:border-strokedark overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Visitor Name</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Destination</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Check-In Time</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Check-Out Time</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Guard Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {currentLogs.map(log => {
                  const logId = log.id || log._id;
                  const name = log.visitorName || log.snapshot?.visitorName || '—';
                  const type = log.type || (log.entryType === 'PRE_APPROVED' ? 'guest' : 'walk-in');
                  const villa = log.villa || (log.passId?.villaId?.villaNumber || 'Villa Gate');
                  const resident = log.resident || log.residentId?.name || '—';
                  
                  const checkIn = log.checkIn || (log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');
                  const checkOut = log.checkOut || (log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');
                  
                  const status = log.status || log.logStatus;
                  const guard = log.guard || log.guardId?.name || 'Gate Operator';

                  return (
                    <tr key={logId} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                      <td className="py-3 px-4">
                        <div className="font-bold text-xs text-black dark:text-white">{name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 text-capitalize mt-0.5">
                          Type: {type.replace('_', ' & ')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-xs text-black dark:text-white">{villa}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Host: {resident}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {checkIn}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {checkOut}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {status === 'INSIDE' && (
                          <Badge variant="lightSuccess" className="font-bold">
                            INSIDE
                          </Badge>
                        )}
                        {(status === 'COMPLETED' || status === 'RESOLVED') && (
                          <Badge variant="lightInfo" className="font-bold">
                            COMPLETED
                          </Badge>
                        )}
                        {(status === 'DENIED' || status === 'REJECTED') && (
                          <Badge variant="lightError" className="font-bold">
                            {status}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {guard}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination control */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-stroke dark:border-strokedark">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">
            Page {currentPage} of {totalPages} ({filteredLogs.length} total entries)
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="text-xs font-semibold px-3 py-1.5 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button 
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="text-xs font-semibold px-3 py-1.5 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorLogsTable;
