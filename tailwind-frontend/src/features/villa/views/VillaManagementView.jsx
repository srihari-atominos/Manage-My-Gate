import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Grid } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Alert, AlertDescription } from 'src/components/ui/alert';
import PageHeader from 'src/components/common/PageHeader';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useVilla from '../hooks/useVilla';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useVillaSocket from '../hooks/useVillaSocket';
import VillaGrid from '../components/VillaGrid';
import VillaDetailsModal from '../components/VillaDetailsModal';
import BatchGenerateModal from '../components/BatchGenerateModal';
import BulkUploadVillasModal from '../components/BulkUploadVillasModal';
import VillaFormModal from '../components/VillaFormModal';
import '../styles/_villa.scss';

export const VillaManagementView = () => {
  const { t } = useTranslation();

  const {
    villas,
    stats,
    searchQuery,
    blockFilter,
    statusFilter,
    currentPage,
    totalPages,
    loading,
    error,
    orgId,

    // Modal Control Flags
    detailsVisible,
    selectedVillaId,
    formVisible,
    editingVilla,
    batchVisible,
    bulkUploadVisible,

    // Actions
    openDetails,
    closeDetails,
    openForm,
    closeForm,
    openBatch,
    closeBatch,
    openBulkUpload,
    closeBulkUpload,
    handleSearch,
    handleBlockChange,
    handleStatusChange,
    handlePageChange,
    createVilla,
    updateVilla,
    bulkUploadVillas
  } = useVilla();

  // Mount silent socket listener for real-time state sync
  useVillaSocket(orgId);

  const handleFormSubmit = async (formData) => {
    if (editingVilla) {
      await updateVilla(editingVilla._id, formData);
    } else {
      await createVilla(formData);
    }
  };

  const headerActions = (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={openBulkUpload}
        className="text-xs font-semibold flex items-center gap-1 bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
      >
        <Plus className="h-4 w-4" />
        <span>{t('villas.bulkUpload', 'Bulk Upload')}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openForm()}
        className="text-xs font-semibold flex items-center gap-1 bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
      >
        <Plus className="h-4 w-4" />
        <span>{t('villas.createUnit', 'Create Unit')}</span>
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={openBatch}
        className="text-xs font-semibold flex items-center gap-1"
      >
        <Plus className="h-4 w-4" />
        <span>{t('villas.batchGenerate', 'Batch Generate')}</span>
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 villa-manager-view">
      <PageHeader
        title="Villa Management"
        subtitle="Orchestrate apartment/villa units directory, resident directory and batch setup."
        actionButtons={headerActions}
      />

      {/* Statistics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark text-center hover:scale-[1.01] transition-transform duration-200">
          <div className="text-gray-500 dark:text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1">
            {t('villas.totalUnits', 'TOTAL UNITS')}
          </div>
          <div className="text-2xl font-bold text-primary">{stats.total || 0}</div>
        </div>
        <div className="rounded-xl border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark text-center hover:scale-[1.01] transition-transform duration-200">
          <div className="text-gray-500 dark:text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1">
            {t('villas.occupiedUnits', 'OCCUPIED UNITS')}
          </div>
          <div className="text-2xl font-bold text-success">{stats.occupied || 0}</div>
        </div>
        <div className="rounded-xl border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark text-center hover:scale-[1.01] transition-transform duration-200">
          <div className="text-gray-500 dark:text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1">
            {t('villas.vacantUnits', 'VACANT UNITS')}
          </div>
          <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{stats.vacant || 0}</div>
        </div>
        <div className="rounded-xl border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark text-center hover:scale-[1.01] transition-transform duration-200">
          <div className="text-gray-500 dark:text-gray-400 text-3xs font-semibold uppercase tracking-wider mb-1">
            {t('villas.maintenanceUnits', 'UNDER MAINTENANCE')}
          </div>
          <div className="text-2xl font-bold text-warning">{stats.maintenance || 0}</div>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="rounded-xl border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <Input
              type="text"
              placeholder={t('villas.searchPlaceholder', 'Search unit number...')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="text-sm bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>
          <div>
            <select
              value={blockFilter}
              onChange={(e) => handleBlockChange(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              <option value="" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.allBlocks', 'All Blocks')}</option>
              <option value="Block A" className="bg-white dark:bg-boxdark text-black dark:text-white">Block A</option>
              <option value="Block B" className="bg-white dark:bg-boxdark text-black dark:text-white">Block B</option>
              <option value="Block C" className="bg-white dark:bg-boxdark text-black dark:text-white">Block C</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              <option value="" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.allStatuses', 'All Statuses')}</option>
              <option value="Vacant" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.statusTypes.Vacant', 'Vacant')}</option>
              <option value="Occupied" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.statusTypes.Occupied', 'Occupied')}</option>
              <option value="Under Maintenance" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.statusTypes.UnderMaintenance', 'Under Maintenance')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Grid Area */}
      {loading && villas.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center justify-center gap-2 bg-white dark:bg-boxdark rounded-xl border border-stroke dark:border-strokedark">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
          <div className="text-gray-500 dark:text-gray-400 text-sm">{t('villas.loading', 'Loading units directory...')}</div>
        </div>
      ) : villas.length === 0 ? (
        <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark text-center py-12 flex flex-col items-center">
          <Grid className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3 opacity-40" />
          <h4 className="text-lg font-bold text-black dark:text-white">{t('villas.noVillas', 'No Units Configured')}</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mt-1 mb-6">
            {t('villas.noVillasDesc', 'You can manually create or batch generate the community units grid.')}
          </p>
          <Button variant="default" size="sm" onClick={openBatch} className="text-xs font-semibold px-4 py-2">
            {t('villas.generateVillas', 'Generate 54 Units')}
          </Button>
        </div>
      ) : (
        <>
          <VillaGrid villas={villas} onCardClick={openDetails} />

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center gap-1" aria-label="Villa pages navigation">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="inline-flex items-center justify-center rounded border border-stroke px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
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
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center justify-center rounded border border-stroke px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}

      {/* Details Dialog */}
      <VillaDetailsModal
        visible={detailsVisible}
        onClose={closeDetails}
        villaId={selectedVillaId}
      />

      {/* Form Dialog (Create / Edit) */}
      <VillaFormModal
        visible={formVisible}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        editingVilla={editingVilla}
      />

      {/* Batch Dialog */}
      <BatchGenerateModal
        visible={batchVisible}
        onClose={closeBatch}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadVillasModal
        visible={bulkUploadVisible}
        onClose={closeBulkUpload}
        onBulkUpload={bulkUploadVillas}
      />
    </div>
  );
};

export default VillaManagementView;
