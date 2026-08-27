import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaWrapper } from '../../components/layout/SafeAreaWrapper';
import { Typography } from '../../components/layout/Typography';
import { WalkInApprovalCard } from '../../src/modules/visitor-management/WalkInApprovalCard';
import { QRScannerOverlay } from '../../components/hardware/QRScannerOverlay';
import { Button } from '../../components/ui/button';
import { ScanLine } from 'lucide-react-native';

export default function VisitorDashboard() {
  const [showScanner, setShowScanner] = React.useState(false);

  return (
    <SafeAreaWrapper className="bg-slate-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Typography variant="h3" weight="bold">Gate Management</Typography>
            <Typography variant="body2" color="secondary">Manage incoming visitors</Typography>
          </View>
          <Button variant="outline" size="icon" onPress={() => setShowScanner(true)}>
            <ScanLine size={20} className="text-slate-700 dark:text-slate-300" />
          </Button>
        </View>

        <Typography variant="h4" weight="semibold" className="mb-4">Pending Walk-ins</Typography>
        
        <View className="gap-4 mb-8">
          <WalkInApprovalCard 
            visitorName="John Smith"
            purpose="Plumbing Maintenance"
            arrivalTime="09:30 AM"
            onApprove={() => console.log('Approve')}
            onReject={() => console.log('Reject')}
          />
          <WalkInApprovalCard 
            visitorName="Sarah Jenkins"
            purpose="Delivery (Amazon)"
            arrivalTime="09:45 AM"
            onApprove={() => console.log('Approve')}
            onReject={() => console.log('Reject')}
          />
        </View>
      </ScrollView>

      {showScanner && (
        <View className="absolute inset-0 z-50">
          <QRScannerOverlay instruction="Scan Visitor QR Pass" />
          <Button 
            className="absolute bottom-10 left-10 right-10"
            variant="destructive"
            onPress={() => setShowScanner(false)}
          >
            <Typography color="inverse" weight="bold">Cancel Scan</Typography>
          </Button>
        </View>
      )}
    </SafeAreaWrapper>
  );
}
