import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DatePicker } from '@/components/common/DatePicker';
import { UserCheck, Users, ShieldAlert, Check, Phone, Wrench, Building2, Clock, Send } from 'lucide-react-native';
import apiClient from '../../../services/apiClient';
import { Complaint, AssignTechnicianPayload } from '../types';

interface StaffMember {
  _id: string;
  name: string;
  phone?: string;
  department?: string;
  specialization?: string;
  status?: string;
  activeJobsCount?: number;
}

interface AssignTechnicianSheetProps {
  visible: boolean;
  complaint: Complaint | null;
  onClose: () => void;
  onAssign: (id: string, payload: AssignTechnicianPayload) => Promise<any>;
}

const DEFAULT_STAFF_LIST: StaffMember[] = [
  { _id: 'tech_1', name: 'Ravi Kumar', department: 'Plumbing & Water', specialization: 'Plumber', phone: '+91 98765 43210', activeJobsCount: 0 },
  { _id: 'tech_2', name: 'Suresh Verma', department: 'Electrical & Lighting', specialization: 'Electrician', phone: '+91 98765 43211', activeJobsCount: 1 },
  { _id: 'tech_3', name: 'Amit Carpenter', department: 'Carpentry & Woodwork', specialization: 'Carpenter', phone: '+91 98765 43212', activeJobsCount: 0 },
  { _id: 'tech_4', name: 'Rajesh Elevator Tech', department: 'Elevator & Lifts', specialization: 'Elevator Specialist', phone: '+91 98765 43213', activeJobsCount: 2 },
];

export const AssignTechnicianSheet: React.FC<AssignTechnicianSheetProps> = ({
  visible,
  complaint,
  onClose,
  onAssign,
}) => {
  const [assignmentType, setAssignmentType] = useState<'direct' | 'broadcast' | 'vendor'>('direct');
  
  // Staff Selection State
  const [staffList, setStaffList] = useState<StaffMember[]>(DEFAULT_STAFF_LIST);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [broadcastStaffIds, setBroadcastStaffIds] = useState<string[]>([]);

  // External Vendor Pass State
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorCompany, setVendorCompany] = useState('');
  const [vendorSpecialization, setVendorSpecialization] = useState('');
  const [visitTiming, setVisitTiming] = useState('Immediately');
  const [customVisitDate, setCustomVisitDate] = useState<Date | null>(null);

  // Common Fields
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsLoadingStaff(true);
      apiClient
        .get('/technicians')
        .then((res: any) => {
          const list = res?.data || res || [];
          if (Array.isArray(list) && list.length > 0) {
            setStaffList(list);
          } else {
            setStaffList(DEFAULT_STAFF_LIST);
          }
        })
        .catch((err) => {
          console.log('[AssignSheet] Technician fetch fallback:', err);
          setStaffList(DEFAULT_STAFF_LIST);
        })
        .finally(() => {
          setIsLoadingStaff(false);
        });
    }
  }, [visible]);

  if (!complaint) return null;

  const toggleBroadcastStaff = (id: string) => {
    setBroadcastStaffIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAssignSubmit = async () => {
    try {
      setIsSubmitting(true);
      let payload: AssignTechnicianPayload = {
        assignmentType,
        instructions: instructions || undefined,
      };

      if (assignmentType === 'direct') {
        if (!selectedStaffId) {
          Alert.alert('Selection Required', 'Please select a staff member to assign.');
          return;
        }
        const selected = staffList.find((s) => s._id === selectedStaffId);
        payload.technicianId = selectedStaffId;
        payload.assignedTechnicianId = selectedStaffId;
        payload.technicianName = selected ? selected.name : '';
        payload.vendor = 'In-House';
      } else if (assignmentType === 'broadcast') {
        if (broadcastStaffIds.length === 0) {
          Alert.alert('Selection Required', 'Please select at least one staff member for broadcast dispatch.');
          return;
        }
        payload.technicianIds = broadcastStaffIds;
        payload.vendor = 'In-House';
      } else if (assignmentType === 'vendor') {
        if (!vendorName.trim()) {
          Alert.alert('Required Field', 'Please enter the External Vendor Name.');
          return;
        }
        if (!vendorPhone.trim()) {
          Alert.alert('Required Field', 'Please enter the Vendor Phone Number.');
          return;
        }
        payload.technicianName = vendorName.trim();
        payload.vendor = vendorCompany.trim() || 'External Vendor';
        
        const extraVendorNotes = `\n[External Vendor Pass Details]\nPhone: ${vendorPhone}\nCompany: ${vendorCompany || 'N/A'}\nSpecialization: ${vendorSpecialization || 'N/A'}\nVisit Schedule: ${visitTiming}${customVisitDate ? ` (${customVisitDate.toLocaleDateString()})` : ''}`;
        payload.instructions = (instructions || '') + extraVendorNotes;
        payload.preferredVisitDate = customVisitDate ? customVisitDate.toISOString() : undefined;
        payload.preferredVisitTime = visitTiming;
      }

      await onAssign(complaint._id, payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to assign technician:', err);
      Alert.alert('Assignment Error', err?.message || 'Failed to dispatch technician');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Assign Ticket #${complaint.complaintNumber}`}>
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* TICKET SUMMARY BANNER */}
        <View className="bg-muted/40 border border-border/50 rounded-xl p-3 mb-3 flex-row items-center justify-between">
          <View className="flex-1 me-2">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">Target Issue</Text>
            <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
              {complaint.title}
            </Text>
          </View>
          <StatusBadge label={complaint.category} variant="info" />
        </View>

        {/* 1-TAP SEGMENTED STRATEGY CHIPS */}
        <View className="mb-3 gap-1">
          <Text className="text-xs font-bold text-muted-foreground uppercase">Assignment Strategy</Text>
          <View className="flex-row gap-2 py-1">
            {[
              { id: 'direct', label: 'Direct Staff' },
              { id: 'broadcast', label: 'Broadcast Pool' },
              { id: 'vendor', label: 'External Vendor' },
            ].map((strat) => {
              const isCurrent = assignmentType === strat.id;
              return (
                <TouchableOpacity
                  key={strat.id}
                  activeOpacity={0.8}
                  onPress={() => setAssignmentType(strat.id as any)}
                  style={{
                    backgroundColor: isCurrent ? '#2563eb' : '#f1f5f9',
                    borderColor: isCurrent ? '#2563eb' : '#cbd5e1',
                    borderWidth: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: isCurrent ? '#ffffff' : '#0f172a', fontWeight: 'bold', fontSize: 11 }}>
                    {strat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 1. DIRECT INTERNAL STAFF SELECTION LIST */}
        {assignmentType === 'direct' && (
          <View className="my-2 gap-2">
            <Text className="text-xs font-bold text-muted-foreground uppercase">
              Select Staff Member ({complaint.category})
            </Text>
            {staffList.map((staff) => {
              const isSelected = selectedStaffId === staff._id;
              const isBusy = (staff.activeJobsCount || 0) > 0;

              return (
                <TouchableOpacity
                  key={staff._id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedStaffId(staff._id)}
                  style={{
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                    borderWidth: isSelected ? 2 : 1,
                    padding: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View className="flex-row items-center flex-1 me-2">
                    <View
                      style={{
                        backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      <Icon as={UserCheck} size={18} color={isSelected ? '#ffffff' : '#64748b'} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-foreground">{staff.name}</Text>
                      <Text className="text-[11px] text-muted-foreground">
                        {staff.specialization || staff.department || 'Maintenance Staff'} • {staff.phone || 'No phone'}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <StatusBadge
                      label={isBusy ? `Busy (${staff.activeJobsCount})` : 'Available'}
                      variant={isBusy ? 'warning' : 'success'}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 2. BROADCAST MULTI-STAFF SELECTION LIST */}
        {assignmentType === 'broadcast' && (
          <View className="my-2 gap-2">
            <Text className="text-xs font-bold text-muted-foreground uppercase">
              Select Staff Pool to Broadcast
            </Text>
            {staffList.map((staff) => {
              const isChecked = broadcastStaffIds.includes(staff._id);

              return (
                <TouchableOpacity
                  key={staff._id}
                  activeOpacity={0.8}
                  onPress={() => toggleBroadcastStaff(staff._id)}
                  style={{
                    backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                    borderColor: isChecked ? '#2563eb' : '#e2e8f0',
                    borderWidth: isChecked ? 2 : 1,
                    padding: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View className="flex-row items-center flex-1 me-2">
                    <View
                      style={{
                        backgroundColor: isChecked ? '#2563eb' : '#ffffff',
                        borderColor: isChecked ? '#2563eb' : '#cbd5e1',
                        borderWidth: 1,
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      {isChecked && <Icon as={Check} size={12} color="#ffffff" />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-foreground">{staff.name}</Text>
                      <Text className="text-[11px] text-muted-foreground">{staff.department || 'Staff Pool'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 3. EXTERNAL VENDOR PASS DETAILS */}
        {assignmentType === 'vendor' && (
          <View className="my-2 gap-3 bg-muted/30 border border-border/60 rounded-2xl p-3.5">
            <Text className="text-xs font-bold text-muted-foreground uppercase">
              External Vendor Gate Pass Details
            </Text>

            <TextInput
              label="Vendor Technician Name *"
              placeholder="e.g. Ramesh Kumar (QuickFix Co.)"
              value={vendorName}
              onChangeText={setVendorName}
            />

            <TextInput
              label="Vendor Contact Phone *"
              placeholder="e.g. +91 98765 43210"
              keyboardType="phone-pad"
              value={vendorPhone}
              onChangeText={setVendorPhone}
            />

            <TextInput
              label="Agency / Company Name"
              placeholder="e.g. QuickFix Plumbing & Sanitation Ltd"
              value={vendorCompany}
              onChangeText={setVendorCompany}
            />

            <DropdownSelect
              label="Expected Visit Timing"
              value={visitTiming}
              options={[
                { label: 'Immediately (Urgent Dispatch)', value: 'Immediately' },
                { label: 'Today (Standard Shift)', value: 'Today' },
                { label: 'Tomorrow', value: 'Tomorrow' },
                { label: 'Custom Schedule', value: 'Custom Schedule' },
              ]}
              onValueChange={(val) => setVisitTiming(val)}
            />

            {visitTiming === 'Custom Schedule' && (
              <DatePicker
                label="Custom Visit Date"
                value={customVisitDate}
                onChange={(d) => setCustomVisitDate(d)}
              />
            )}
          </View>
        )}

        {/* OPTIONAL SCOPE INSTRUCTIONS */}
        <TextInput
          label="Special Instructions / Scope of Work"
          placeholder="Enter instructions for the assigned technician..."
          value={instructions}
          onChangeText={setInstructions}
        />

        {/* SOLID BLUE DISPATCH CTA BUTTON */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAssignSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#2563eb', // solid bright blue
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16,
          }}
        >
          <Icon as={Send} size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
            {isSubmitting ? 'Dispatching...' : 'Confirm & Dispatch Technician'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
};

export default AssignTechnicianSheet;
