import React from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Rating } from '@/components/common/Rating';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Star } from 'lucide-react-native';
import { Complaint } from '../types';

interface ResidentFeedbackSheetProps {
  visible: boolean;
  complaints: Complaint[];
  onClose: () => void;
}

export const ResidentFeedbackSheet: React.FC<ResidentFeedbackSheetProps> = ({
  visible,
  complaints,
  onClose,
}) => {
  const ratedComplaints = complaints.filter(
    (c) => c.feedback?.overallRating || (c.feedback as any)?.rating || c.feedback?.remarks
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Resident Service Feedback">
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 50 }}>
        {ratedComplaints.length === 0 ? (
          <View className="py-6">
            <EmptyState
              icon={Star}
              title="No Feedback Submitted Yet"
              description="Residents will leave star ratings and service reviews upon work completion."
            />
          </View>
        ) : (
          ratedComplaints.map((c) => (
            <View key={c._id} className="bg-card border border-border/70 rounded-2xl p-4 mb-3 shadow-xs gap-2">
              <View className="flex-row items-center justify-between">
                <View className="bg-primary/10 px-2 py-0.5 rounded-md">
                  <Text className="text-xs font-bold text-primary">{c.complaintNumber}</Text>
                </View>
                <Rating rating={c.feedback?.overallRating || (c.feedback as any)?.rating || 5} size={18} />
              </View>

              <Text className="text-sm font-bold text-foreground">{c.title}</Text>

              <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
                <Text className="text-xs text-muted-foreground">
                  By {c.residentName || 'Resident'}{c.location?.flat ? ` (Flat ${c.location.flat})` : ''}
                </Text>
                <Text className="text-[10px] font-medium text-muted-foreground">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                </Text>
              </View>

              {c.feedback?.remarks ? (
                <View className="bg-muted/40 border-l-2 border-primary p-2.5 rounded-r-xl mt-1">
                  <Text className="text-xs italic text-foreground leading-relaxed">
                    "{c.feedback.remarks}"
                  </Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  );
};

export default ResidentFeedbackSheet;
