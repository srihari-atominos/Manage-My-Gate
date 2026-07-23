import React, { useState } from 'react';
import { LogIn, LogOut, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';

export const LiveEntriesTable = ({ liveEntries, onCheckOutSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredEntries = liveEntries.filter(entry => 
    entry.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.villa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.resident.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.vehicleNumber && entry.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (entry.idProofNumber && entry.idProofNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col min-h-[430px]">
      
      <div className="flex-grow">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white">
            <Users className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>Active Visitors Inside ({liveEntries.length})</span>
          </h3>
          
          <div className="relative w-full sm:max-w-xs">
            <Input 
              type="text" 
              placeholder="Search active visitors..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white pr-8 py-1.5"
            />
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {currentEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[260px] text-gray-400 dark:text-gray-500 gap-1.5 text-center">
            <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-1" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">No active visitors inside community.</span>
            <span className="text-2xs text-gray-400">All entry log check-ins have checked-out.</span>
          </div>
        ) : (
          <div className="relative rounded-md border border-stroke dark:border-strokedark overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Visitor Name</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Villa Destination</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Check-In Time</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Processed By</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {currentEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                    <td className="py-3 px-4">
                      <div className="font-bold text-xs text-black dark:text-white">{entry.visitorName}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        Type: {entry.type.replace('_', ' & ')}
                        {entry.vehicleNumber && ` | Plate: ${entry.vehicleNumber}`}
                        {entry.idProofNumber && ` | ID: ${entry.idProofNumber}`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-xs text-black dark:text-white">{entry.villa}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Host: {entry.resident}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {entry.checkIn}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {entry.guard}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => onCheckOutSuccess(entry.id)}
                        className="h-8 text-[10px] font-semibold border-primary text-primary hover:bg-primary hover:text-white dark:hover:bg-primary flex items-center gap-1 ml-auto"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Check-Out
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-stroke dark:border-strokedark">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">
            Page {currentPage} of {totalPages} ({filteredEntries.length} total active)
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="text-xs font-semibold px-3 py-1.5 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button 
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
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

export default LiveEntriesTable;
