import React from 'react';
import {
  Copy,
  Trash2,
  Ban,
  QrCode,
  ListTodo,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Badge } from 'src/components/ui/badge';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import toast from 'react-hot-toast';

export const ActiveInvitesTable = ({
  passes,
  inviteMethod,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  handleCopyPass,
  handleRevokePass,
  setGeneratedPass
}) => {
  const formatPassId = (id) => {
    if (!id || id.length <= 10) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  // Filter and Paginate Passes
  const filteredPasses = (passes || []).filter(pass => {
    if (!pass) return false;
    const passMethod = pass.method || (
      (pass.passType === 'CAB' || pass.passType === 'DELIVERY') ? 'cab_delivery' :
      pass.passType === 'SERVICE' ? 'service' :
      pass.passType === 'GUEST' && (pass.usageLimit?.maxUses > 5) ? 'group' : 'guest'
    );
    const matchesMethod = passMethod === inviteMethod;

    const name = pass.visitorName || pass.visitorDetails?.name || '';
    const passId = pass.id || pass._id || '';

    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          passId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPasses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPasses = filteredPasses.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col min-h-[430px]">
      <div className="flex-grow">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-base font-bold flex items-center gap-2 text-black dark:text-white">
            <ListTodo className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>Active Invites</span>
          </h3>
          
          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <Input 
              type="text" 
              placeholder="Search by name or code..."
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

        {currentPasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] text-gray-400 dark:text-gray-500 gap-1.5 text-center">
            <ListTodo className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-1" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">No active invitations found.</span>
          </div>
        ) : (
          <div className="relative rounded-md border border-stroke dark:border-strokedark overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Pass Code & Guest</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Validity</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Status / Uses</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {currentPasses.map(pass => {
                  const passId = pass.id || pass._id;
                  const displayPassCode = pass.shortKey || passId;
                  const name = pass.visitorName || pass.visitorDetails?.name || '—';
                  const details = pass.details || (
                    pass.visitorDetails?.idProofType && pass.visitorDetails.idProofType !== 'None'
                      ? `${pass.visitorDetails.idProofType}: ${pass.visitorDetails.idProofNumber || ''}`
                      : 'Pre-approved entry'
                  );
                  
                  let validityText = pass.validity;
                  if (pass.validity?.startDate && pass.validity?.endDate) {
                    const start = new Date(pass.validity.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                    const end = new Date(pass.validity.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                    validityText = `${start} - ${end}`;
                  }

                  const isActive = pass.status === 'ACTIVE' || pass.status === 'PENDING';
                  const usesText = pass.usageLimit 
                    ? `Entries: ${pass.usageLimit.currentUses || 0} / ${pass.usageLimit.maxUses}`
                    : pass.uses;

                  return (
                    <tr key={passId} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                      <td className="py-3 px-4">
                        <div className="font-bold text-xs text-black dark:text-white">{name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span 
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                              pass.isIdProofPass 
                                ? 'bg-gray-100 text-gray-500 dark:bg-meta-4 dark:text-gray-400' 
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                            onClick={() => {
                              if (!pass.isIdProofPass && setGeneratedPass) {
                                setGeneratedPass(pass);
                              }
                            }}
                            title={pass.isIdProofPass ? `Pass ID: ${displayPassCode} (ID-Proof Pass)` : `Pass ID: ${displayPassCode} | Click to view QR Code`}
                          >
                            {formatPassId(displayPassCode)}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{details}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {validityText}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={isActive ? 'lightSuccess' : 'lightError'}>
                          {pass.status}
                        </Badge>
                        {usesText && <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">{usesText}</div>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {pass.isIdProofPass ? (
                            <button 
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-meta-4 text-gray-300 dark:text-gray-700 cursor-not-allowed" 
                              disabled
                              title="No QR Code for ID-Proof Passes"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          ) : (
                            <button 
                              className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors" 
                              onClick={() => setGeneratedPass && setGeneratedPass(pass)}
                              title="View QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          )}
                          <button 
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-meta-4 text-gray-600 dark:text-gray-400 transition-colors" 
                            onClick={() => {
                              handleCopyPass(pass);
                              toast.success('Pass ID copied to clipboard!');
                            }}
                            title="Copy Pass ID"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {isActive ? (
                            <button 
                              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-danger transition-colors" 
                              onClick={() => handleRevokePass(passId)}
                              title="Revoke Invite"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button 
                              className="p-1.5 rounded-md text-gray-300 dark:text-gray-700 cursor-not-allowed" 
                              disabled
                              title="Pass already inactive"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
            Page {currentPage} of {totalPages} ({filteredPasses.length} total entries)
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

export default ActiveInvitesTable;
