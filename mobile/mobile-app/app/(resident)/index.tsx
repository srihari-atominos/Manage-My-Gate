import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaWrapper } from '../../components/layout/SafeAreaWrapper';
import { Typography } from '../../components/layout/Typography';
import { SectionDivider } from '../../components/layout/SectionDivider';
import { OptimizedDataGrid } from '../../components/data/OptimizedDataGrid';
import { AgenticStateTracker } from '../../components/data/AgenticStateTracker';

export default function ResidentDashboard() {
  return (
    <SafeAreaWrapper className="bg-slate-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-4">
        <Typography variant="h3" weight="bold" className="mt-6 mb-2">
          Resident Dashboard
        </Typography>
        <Typography variant="body2" color="secondary" className="mb-6">
          Welcome back. Here's what's happening today.
        </Typography>

        <SectionDivider label="Automation Status" />
        
        <AgenticStateTracker 
          state="running"
          agentName="Visitor Orchestrator"
          lastActive="Just now"
          logs={['Detecting incoming vehicle', 'Matching with pre-approvals']}
          className="mb-4"
        />

        <SectionDivider label="Recent Activity" />
        
        <View className="h-64 mb-6">
          <OptimizedDataGrid 
            data={[
              { id: '1', type: 'Delivery', status: 'Arrived', time: '10:45 AM' },
              { id: '2', type: 'Guest', status: 'Pre-approved', time: '02:00 PM' }
            ]}
            columns={[
              { key: 'type', header: 'Type' },
              { key: 'status', header: 'Status' },
              { key: 'time', header: 'Time' },
            ]}
            keyExtractor={(item) => item.id}
          />
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
