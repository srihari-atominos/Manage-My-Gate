import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { X, Building2, Check, User, ChevronRight } from 'lucide-react-native';

import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';

export interface VillaResidentOption {
  id: string; // User ID
  name: string; // User Name
  type: string; // Residency Type e.g. Primary Resident, Owner, Tenant
  phone?: string;
}

export interface VillaOption {
  id: string; // Villa ID
  name: string; // e.g. "Villa 101 - Block A"
  primaryResidentId?: string;
  primaryResidentName?: string;
  residents: VillaResidentOption[];
}

interface AdminVillaFilterSheetProps {
  visible: boolean;
  selectedVillaId?: string;
  selectedResidentId?: string;
  onClose: () => void;
  onSelectVilla: (
    villaId: string | undefined,
    villaName?: string,
    residentId?: string,
    residentName?: string
  ) => void;
}

const MOCK_VILLAS: VillaOption[] = [
  {
    id: '67a5602d1840000000000101',
    name: 'Villa 101 - Block A',
    primaryResidentId: '67a5602d1840000000000099',
    primaryResidentName: 'Rajesh Sharma',
    residents: [
      { id: '67a5602d1840000000000099', name: 'Rajesh Sharma', type: 'Primary Resident', phone: '+91 9876543210' },
      { id: '67a5602d1840000000000098', name: 'Priya Sharma', type: 'Co-Resident', phone: '+91 9876543211' },
    ],
  },
  {
    id: '67a5602d1840000000000102',
    name: 'Villa 102 - Block A',
    primaryResidentId: '67a5602d1840000000000097',
    primaryResidentName: 'Amitav Ghosh',
    residents: [
      { id: '67a5602d1840000000000097', name: 'Amitav Ghosh', type: 'Tenant Resident', phone: '+91 9876543212' },
    ],
  },
  {
    id: '67a5602d1840000000000103',
    name: 'Villa 103 - Block B',
    primaryResidentId: '67a5602d1840000000000096',
    primaryResidentName: 'Vikramaditya Singh',
    residents: [
      { id: '67a5602d1840000000000096', name: 'Vikramaditya Singh', type: 'Owner Resident', phone: '+91 9876543213' },
    ],
  },
  {
    id: '67a5602d1840000000000104',
    name: 'Villa 104 - Block B',
    primaryResidentId: '67a5602d1840000000000095',
    primaryResidentName: 'Suresh Menon',
    residents: [
      { id: '67a5602d1840000000000095', name: 'Suresh Menon', type: 'Primary Resident', phone: '+91 9876543214' },
    ],
  },
  {
    id: '67a5602d1840000000000105',
    name: 'Villa 105 - Block C',
    primaryResidentId: '67a5602d1840000000000094',
    primaryResidentName: 'Ananya Roy',
    residents: [
      { id: '67a5602d1840000000000094', name: 'Ananya Roy', type: 'Primary Resident', phone: '+91 9876543215' },
    ],
  },
];

export const AdminVillaFilterSheet: React.FC<AdminVillaFilterSheetProps> = ({
  visible,
  selectedVillaId,
  selectedResidentId,
  onClose,
  onSelectVilla,
}) => {
  const [search, setSearch] = useState('');
  const [expandedVillaId, setExpandedVillaId] = useState<string | null>(null);

  const reduxVillas = useSelector((state: RootState) => (state as any).villa?.villas);

  const villaOptions: VillaOption[] = React.useMemo(() => {
    if (Array.isArray(reduxVillas) && reduxVillas.length > 0) {
      return reduxVillas.map((v: any) => {
        const villaId = v._id || v.id;
        const villaName = `Villa ${v.unitNumber || v.name}${v.blockOrBuilding ? ` - Block ${v.blockOrBuilding}` : ''}`;
        
        const primaryRes = v.primaryResidentId || (v.residents && v.residents[0]?.userId);
        const primaryResId = typeof primaryRes === 'object' ? (primaryRes._id || primaryRes.id) : primaryRes;
        const primaryResName = typeof primaryRes === 'object' ? (primaryRes.name || primaryRes.username) : 'Primary Resident';

        const residentsList: VillaResidentOption[] = [];

        if (Array.isArray(v.residents) && v.residents.length > 0) {
          v.residents.forEach((r: any) => {
            const userObj = typeof r.userId === 'object' ? r.userId : null;
            const rId = userObj?._id || userObj?.id || r.userId || r.id;
            const rName = userObj?.name || userObj?.username || userObj?.phone || 'Resident';
            if (rId) {
              residentsList.push({
                id: rId,
                name: rName,
                type: r.residencyType || (r.isPrimary ? 'Primary Resident' : 'Resident'),
                phone: userObj?.phone,
              });
            }
          });
        }

        if (residentsList.length === 0 && primaryResId) {
          residentsList.push({
            id: primaryResId,
            name: primaryResName,
            type: 'Primary Resident',
          });
        }

        return {
          id: villaId,
          name: villaName,
          primaryResidentId: primaryResId,
          primaryResidentName: primaryResName,
          residents: residentsList,
        };
      });
    }
    return MOCK_VILLAS;
  }, [reduxVillas]);

  const filteredVillas = villaOptions.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.residents.some((r) => r.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl p-4 pt-3 max-h-[85%] border-t border-border">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Building2 size={20} className="text-primary" />
              <Text className="text-base font-bold text-foreground">Select Villa & Resident Host</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-muted">
              <X size={18} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="py-3">
            <SearchFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search villa number or resident name..."
              variant="bordered"
            />
          </View>

          {/* Options */}
          <ScrollView className="flex-1 my-2" contentContainerClassName="gap-2">
            <TouchableOpacity
              onPress={() => {
                onSelectVilla(undefined, 'All Villas', undefined, undefined);
                onClose();
              }}
              className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                !selectedVillaId ? 'bg-primary/10 border-primary' : 'bg-card border-border'
              }`}
            >
              <Text className={`text-sm font-semibold ${!selectedVillaId ? 'text-primary' : 'text-foreground'}`}>
                All Villas & Common Areas
              </Text>
              {!selectedVillaId && <Check size={16} className="text-primary" />}
            </TouchableOpacity>

            {filteredVillas.map((villa) => {
              const isVillaSelected = selectedVillaId === villa.id;
              const isExpanded = expandedVillaId === villa.id || search.trim().length > 0;

              return (
                <View key={villa.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Villa Header Row */}
                  <TouchableOpacity
                    onPress={() => {
                      // Toggle expansion or select primary resident directly
                      setExpandedVillaId(expandedVillaId === villa.id ? null : villa.id);
                      const primaryRes = villa.residents[0] || {
                        id: villa.primaryResidentId || villa.id,
                        name: villa.primaryResidentName || 'Primary Resident',
                      };
                      onSelectVilla(villa.id, villa.name, primaryRes.id, `${primaryRes.name} (${villa.name})`);
                    }}
                    className={`p-3.5 flex-row items-center justify-between ${
                      isVillaSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-foreground">{villa.name}</Text>
                      {villa.residents.length > 0 && (
                        <Text className="text-xs text-muted-foreground mt-0.5">
                          {villa.residents.length} Resident occupant{villa.residents.length > 1 ? 's' : ''} tied to unit
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center gap-2">
                      {isVillaSelected && <Check size={16} className="text-primary" />}
                      <ChevronRight
                        size={16}
                        className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Residents Sub-List */}
                  {isExpanded && villa.residents.length > 0 && (
                    <View className="bg-muted/40 border-t border-border/50 p-2 gap-1.5">
                      <Text className="text-[10px] font-bold text-muted-foreground uppercase px-2 pt-1">
                        Select Resident Host for Walk-In Notification:
                      </Text>
                      {villa.residents.map((resident) => {
                        const isResSelected = selectedResidentId === resident.id;
                        return (
                          <TouchableOpacity
                            key={resident.id}
                            onPress={() => {
                              onSelectVilla(
                                villa.id,
                                villa.name,
                                resident.id,
                                `${resident.name} (${villa.name})`
                              );
                              onClose();
                            }}
                            className={`p-2.5 rounded-lg border flex-row items-center justify-between ${
                              isResSelected
                                ? 'bg-primary/10 border-primary'
                                : 'bg-background border-border/70'
                            }`}
                          >
                            <View className="flex-row items-center gap-2.5 flex-1">
                              <View className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
                                <User size={14} className="text-primary" />
                              </View>
                              <View className="flex-1">
                                <Text className={`text-xs font-semibold ${isResSelected ? 'text-primary' : 'text-foreground'}`}>
                                  {resident.name}
                                </Text>
                                <Text className="text-[10px] text-muted-foreground">
                                  {resident.type} {resident.phone ? `• ${resident.phone}` : ''}
                                </Text>
                              </View>
                            </View>
                            {isResSelected ? (
                              <Check size={14} className="text-primary" />
                            ) : (
                              <Text className="text-[10px] font-bold text-primary">Select Host</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <Button variant="outline" onPress={onClose} className="mt-2">
            <Text className="text-xs font-semibold">Cancel</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default AdminVillaFilterSheet;

