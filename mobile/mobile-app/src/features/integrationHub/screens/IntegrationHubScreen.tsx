import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, Hash, X } from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { FAB } from '@/components/ui/FAB';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import useIntegrationHub from '../hooks/useIntegrationHub';
import ProviderCard from '../components/ProviderCard';
import ConnectionCard from '../components/ConnectionCard';
import ConnectModal from '../components/ConnectModal';

export const IntegrationHubScreen: React.FC = () => {
  const {
    catalog = [],
    connections = [],
    selectedProvider = 'all',
    isLoading = false,
    isSubmitting = false,
    error = null,
    pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, rowsPerPage: 10 },
    connectModalVisible = false,
    deleteModalVisible = false,
    targetConnection = null,
    selectedCatalogItem = null,
    setSelectedCatalogItem,
    handleSelectProvider,
    handleRefresh,
    handlePageChange,
    openConnectModal,
    closeConnectModal,
    handleConnectSubmit,
    promptDelete,
    closeDeleteModal,
    confirmDelete,
  } = useIntegrationHub();

  const [searchQuery, setSearchQuery] = useState('');
  const [showPageJumpModal, setShowPageJumpModal] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState('');
  const [rowsPerPage, setRowsPerPageState] = useState<number>(pagination.rowsPerPage || 10);

  // Compute category statistics for filter chip counts
  const stats = useMemo(() => {
    const list = connections || [];
    return {
      total: list.length,
      smtp: list.filter((c) => c.provider === 'smtp').length,
      twilio: list.filter((c) => c.provider === 'twilio').length,
      openai: list.filter((c) => c.provider === 'openai').length,
      resend: list.filter((c) => c.provider === 'resend').length,
    };
  }, [connections]);

  // Dynamic list of filter chips matching User Management UI
  const filterChips = useMemo(() => {
    const base = [
      { id: 'all', label: 'All Connections', count: stats.total },
    ];
    catalog.forEach((cat) => {
      const count = (connections || []).filter((c) => c.provider === cat.id).length;
      base.push({
        id: cat.id,
        label: cat.name,
        count,
      });
    });
    return base;
  }, [catalog, connections, stats.total]);

  // Filter connections by selected provider and search query
  const filteredConnections = useMemo(() => {
    let result = connections || [];
    if (selectedProvider && selectedProvider !== 'all') {
      result = result.filter((c) => c.provider === selectedProvider);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.accountLabel?.toLowerCase().includes(q) ||
          c.provider?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [connections, selectedProvider, searchQuery]);

  const currentPage = pagination.currentPage || 1;
  const totalPages = pagination.totalPages || 1;
  const totalRecords = filteredConnections.length;

  const handleExecutePageJump = () => {
    const pageNum = parseInt(targetPageInput.trim(), 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
      setShowPageJumpModal(false);
      setTargetPageInput('');
    } else {
      Alert.alert('Invalid Page', `Please enter a valid page number between 1 and ${totalPages}.`);
    }
  };

  // Record Range Calculations
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

  // List Header Component matching User Management UI
  const renderListHeader = useCallback(() => {
    return (
      <View className="gap-2.5 mb-2">
        {/* Error Alert Banner */}
        {error ? (
          <ErrorBanner
            title="Integration Error"
            message={error}
            onRetry={handleRefresh}
          />
        ) : null}

        {/* User Management Search Filter Bar */}
        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search connections by name or provider..."
        />

        {/* Filter Chips Bar */}
        <View className="mt-0.5 mb-1">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-center gap-1.5">
              {filterChips.map((chip) => {
                const isActive = selectedProvider === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => handleSelectProvider(chip.id)}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary border-primary shadow-xs'
                        : 'bg-card border-border/80'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isActive ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {chip.label}
                    </Text>
                    <View
                      className={`px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted-foreground/15'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          isActive
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {chip.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Summary & Rows Per Page Top Toolbar matching User Management */}
        <View className="px-3 py-1.5 flex-row items-center justify-between border-y border-border/40 bg-muted/20 rounded-lg">
          <Text className="text-[11px] font-semibold text-muted-foreground text-start">
            Showing <Text className="font-bold text-foreground">{startRecord}-{endRecord}</Text> of <Text className="font-bold text-foreground">{totalRecords}</Text> Connections
          </Text>

          <View className="flex-row items-center gap-1">
            <Text className="text-[10px] font-semibold text-muted-foreground me-0.5">
              Rows:
            </Text>
            {[10, 20, 50, 100].map((limit) => (
              <TouchableOpacity
                key={limit}
                onPress={() => setRowsPerPageState(limit)}
                className={`px-1.5 py-0.5 rounded-md border active:opacity-70 ${
                  rowsPerPage === limit
                    ? 'bg-primary border-primary'
                    : 'bg-background border-border/60'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    rowsPerPage === limit ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {limit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Horizontal Available Provider Catalog Carousel */}
        {catalog.length > 0 && (
          <View className="mt-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
                Available Provider Catalog
              </Text>
              <Text className="text-[11px] font-bold text-primary">
                {catalog.length} Available
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
              {catalog.map((item) => {
                const activeCount = connections.filter((c) => c.provider === item.id).length;
                return (
                  <ProviderCard
                    key={item.id}
                    provider={item}
                    activeCount={activeCount}
                    onConnect={openConnectModal}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Section Header for Connections List */}
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
            Active Provider Connections
          </Text>
          <Text className="text-[11px] font-bold text-primary">
            {filteredConnections.length} Connected
          </Text>
        </View>
      </View>
    );
  }, [
    error,
    handleRefresh,
    searchQuery,
    selectedProvider,
    filterChips,
    startRecord,
    endRecord,
    totalRecords,
    rowsPerPage,
    catalog,
    connections,
    handleSelectProvider,
    openConnectModal,
  ]);

  // Pagination Footer Component matching User Management UI
  const renderPaginationFooter = () => {
    if (totalRecords === 0) return null;

    return (
      <View className="mt-3 pt-2.5 border-t border-border/40">
        <View className="flex-row items-center justify-between bg-card border border-border/60 p-2 rounded-xl shadow-xs">
          <TouchableOpacity
            onPress={() => {
              if (currentPage > 1) handlePageChange(currentPage - 1);
            }}
            disabled={currentPage <= 1 || isLoading}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
              currentPage <= 1 || isLoading
                ? 'bg-muted/40 border-border/40 opacity-40'
                : 'bg-primary/10 border-primary/20 active:opacity-70'
            }`}
          >
            <ChevronLeft size={16} color={currentPage <= 1 || isLoading ? '#9ca3af' : '#6366f1'} className="me-1" />
            <Text className={`text-xs font-bold ${currentPage <= 1 || isLoading ? 'text-muted-foreground' : 'text-primary'}`}>
              Prev
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (totalPages > 1) {
                setTargetPageInput(String(currentPage));
                setShowPageJumpModal(true);
              }
            }}
            disabled={totalPages <= 1}
            className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60 flex-row items-center"
          >
            <Text className="text-xs font-bold text-foreground">
              Page {currentPage} of {totalPages}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentPage < totalPages) handlePageChange(currentPage + 1);
            }}
            disabled={currentPage >= totalPages || isLoading}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
              currentPage >= totalPages || isLoading
                ? 'bg-muted/40 border-border/40 opacity-40'
                : 'bg-primary/10 border-primary/20 active:opacity-70'
            }`}
          >
            <Text className={`text-xs font-bold me-1 ${currentPage >= totalPages || isLoading ? 'text-muted-foreground' : 'text-primary'}`}>
              Next
            </Text>
            <ChevronRight size={16} color={currentPage >= totalPages || isLoading ? '#9ca3af' : '#6366f1'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenShell
      title="Integration Hub"
      subtitle="Third-Party API & IoT Gateways"
      iconName="Layers"
      domainName="Administration & Security"
      sharedSlice="integrationHubSlice.ts"
      headerRight={
        <TouchableOpacity
          onPress={() => openConnectModal()}
          activeOpacity={0.8}
          className="w-8 h-8 rounded-xl bg-primary items-center justify-center shadow-xs"
        >
          <Icon as={Plus} size={18} className="text-primary-foreground" />
        </TouchableOpacity>
      }
    >
      <View className="flex-1 bg-background">
        <PaginatedList
          data={filteredConnections}
          loading={isLoading}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          onLoadMore={() => {
            if (currentPage < totalPages) {
              handlePageChange(currentPage + 1);
            }
          }}
          pagination={{
            currentPage,
            totalPages,
            totalRecords: filteredConnections.length,
            limit: rowsPerPage,
          }}
          keyExtractor={(item: any) => item.id || String(Math.random())}
          ListHeaderComponent={renderListHeader()}
          contentContainerClassName="px-3.5 pt-3 pb-28"
          renderItem={(item: any) => (
            <View className="mb-2.5">
              <ConnectionCard connection={item} onDisconnect={promptDelete} />
            </View>
          )}
          emptyTitle={searchQuery ? 'No Matching Connections' : 'No Connections Configured'}
          emptySubtitle={
            searchQuery
              ? `No connections found matching "${searchQuery}".`
              : 'Tap the + button below or select a provider above to set up your first integration.'
          }
        />

        {renderPaginationFooter()}
      </View>

      {/* Floating Action Button */}
      <FAB iconName="Plus" onPress={() => openConnectModal()} />

      {/* Create / Connect Sheet Modal */}
      <ConnectModal
        visible={connectModalVisible}
        catalog={catalog}
        selectedCatalogItem={selectedCatalogItem}
        onSelectCatalogItem={setSelectedCatalogItem}
        onClose={closeConnectModal}
        onSubmit={handleConnectSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />

      {/* Delete / Disconnect Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Disconnect Integration"
        message={`Are you sure you want to disconnect ${targetConnection?.accountLabel || 'this integration'}? Active role bindings using this connection will stop functioning.`}
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="danger"
        loading={isLoading}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />

      {/* Direct Page Jump Modal matching User Management */}
      <Modal
        visible={showPageJumpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPageJumpModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPageJumpModal(false)}
          className="flex-1 bg-black/60 items-center justify-center p-4"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-card border border-border rounded-2xl p-5 shadow-xl"
          >
            <View className="flex-row items-center justify-between mb-3 border-b border-border/60 pb-2">
              <View className="flex-row items-center">
                <Hash size={18} color="#6366f1" className="me-2" />
                <Text className="text-base font-bold text-foreground">Jump to Page</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPageJumpModal(false)}>
                <X size={18} className="text-muted-foreground" />
              </TouchableOpacity>
            </View>

            <TextInput
              label={`Target Page Number (1-${totalPages})`}
              value={targetPageInput}
              onChangeText={setTargetPageInput}
              keyboardType="number-pad"
              placeholder={`Enter 1-${totalPages}`}
              autoFocus
            />

            <View className="flex-row items-center gap-2 mt-4">
              <Button
                variant="outline"
                onPress={() => setShowPageJumpModal(false)}
                className="flex-1 rounded-xl"
              >
                <Text className="text-xs font-semibold text-foreground">Cancel</Text>
              </Button>
              <Button
                variant="default"
                onPress={handleExecutePageJump}
                className="flex-1 rounded-xl"
              >
                <Text className="text-xs font-bold text-primary-foreground">Jump</Text>
              </Button>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenShell>
  );
};

export default IntegrationHubScreen;
