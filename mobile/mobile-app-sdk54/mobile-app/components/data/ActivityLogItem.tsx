import React from 'react';
import { View } from 'react-native';
import { AlertTriangle, Info } from 'lucide-react-native';
import { Text } from '../ui/text';

interface ActivityLogItemProps {
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string | Date;
  isLastItem?: boolean;
}

export const ActivityLogItem = ({
  title,
  category,
  priority,
  status,
  createdAt,
  isLastItem = false,
}: ActivityLogItemProps) => {
  const isEmergency = category === 'Emergency' || priority === 'High' || priority === 'Critical';

  return (
    <View
      className={`flex-row items-start gap-3 py-3 ${
        !isLastItem ? 'border-b border-border/40' : ''
      }`}
    >
      <View
        className={`size-8 rounded-full items-center justify-center border ${
          isEmergency
            ? 'bg-destructive/10 border-destructive/20'
            : 'bg-primary/10 border-primary/20'
        }`}
      >
        {isEmergency ? (
          <AlertTriangle size={14} className="text-destructive" />
        ) : (
          <Info size={14} className="text-primary" />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground mb-0.5">{title}</Text>
        <Text className="text-xs font-semibold text-muted-foreground">
          {category} • {priority} Priority • {status}
        </Text>
      </View>
      <Text className="text-[10px] font-medium text-muted-foreground/60 shrink-0 ml-2">
        {new Date(createdAt).toLocaleDateString()}
      </Text>
    </View>
  );
};
