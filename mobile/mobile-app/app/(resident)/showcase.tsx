import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ListCard } from '@/components/ui/ListCard';
import { KPICard } from '@/components/ui/KPICard';
import { Skeleton } from '@/components/ui/Skeleton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

// Visitor Feature Components for Showcase
import { VisitorPassStepIndicator } from '@/src/features/visitor/components/shared/VisitorPassStepIndicator';
import { VisitorPassCode } from '@/src/features/visitor/components/shared/VisitorPassCode';
import { VisitorQRCode } from '@/src/features/visitor/components/shared/VisitorQRCode';
import { WalkInApprovalCard } from '@/src/features/visitor/components/walkin/WalkInApprovalCard';
import { WalkInApprovalItem } from '@/src/features/visitor/mocks/visitorMocks';

const SHOWCASE_WALK_IN: WalkInApprovalItem = {
  id: 'showcase-walkin-1',
  visitorName: 'Sample Visitor',
  phone: '+91 98989 12345',
  purpose: 'Visiting Unit #101',
  passType: 'GUEST',
  gateName: 'Main Gate 1',
  waitingDurationMinutes: 3,
  requestTimestamp: new Date().toISOString(),
  status: 'PENDING',
};

import { Mail, Search, Sparkles, Shield, User, Heart } from 'lucide-react-native';

export default function ComponentShowcaseScreen() {
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');

  return (
    <ScreenShell title="UI Component Showcase" subtitle="Development & Design System Reference">
      <ScrollView className="flex-1 p-4">
        <View className="gap-6 pb-16 max-w-md mx-auto w-full">
          {/* Header Banner */}
          <View className="bg-primary/10 border border-primary/20 p-4 rounded-2xl gap-1">
            <View className="flex-row items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <Text variant="large" className="font-extrabold text-foreground">
                Design System Catalog
              </Text>
            </View>
            <Text variant="muted" className="text-xs">
              Live interactive showcase of standard mobile primitives and shared composite components.
            </Text>
          </View>

          {/* Section 1: Typography */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              1. Typography Variants
            </Text>
            <View className="gap-2 pt-1 border-t border-border">
              <Text variant="h1">Heading 1 (h1)</Text>
              <Text variant="h2">Heading 2 (h2)</Text>
              <Text variant="h3">Heading 3 (h3)</Text>
              <Text variant="h4">Heading 4 (h4)</Text>
              <Text variant="lead">Lead paragraph subtitle text.</Text>
              <Text variant="large">Large semibold text</Text>
              <Text variant="p">Standard body paragraph text (p).</Text>
              <Text variant="small">Small medium text caption</Text>
              <Text variant="muted">Muted text description</Text>
              <Text variant="code">Code snippet variant</Text>
            </View>
          </View>

          {/* Section 2: Buttons */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              2. Button Variants & Sizes
            </Text>
            <View className="gap-2.5 pt-1 border-t border-border">
              <Button variant="default">
                <Text>Primary Default</Text>
              </Button>
              <Button variant="secondary">
                <Text>Secondary Action</Text>
              </Button>
              <Button variant="outline">
                <Text>Outline Variant</Text>
              </Button>
              <Button variant="destructive">
                <Text>Destructive Action</Text>
              </Button>
              <Button variant="ghost">
                <Text>Ghost Button</Text>
              </Button>
              <Button variant="link">
                <Text>Link Button</Text>
              </Button>
              <Button variant="default" disabled>
                <Text>Disabled Button State</Text>
              </Button>
            </View>
          </View>

          {/* Section 3: Inputs */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              3. Form Inputs
            </Text>
            <View className="gap-3 pt-1 border-t border-border">
              <Input
                label="Standard Text Input"
                placeholder="Enter text..."
                value={inputText}
                onChangeText={setInputText}
                leftIcon={<Mail size={18} color="#888" />}
              />
              <Input
                label="Password Field"
                placeholder="Enter secret password"
                isPassword
              />
              <Input
                label="Input with Error Validation"
                placeholder="Invalid entry"
                error="This field is required"
              />
            </View>
          </View>

          {/* Section 4: Status Badges */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              4. Status Badges
            </Text>
            <View className="flex-row flex-wrap gap-2 pt-1 border-t border-border">
              <StatusBadge label="Success (ACTIVE)" variant="success" dot />
              <StatusBadge label="Warning (PENDING)" variant="warning" dot />
              <StatusBadge label="Danger (REVOKED)" variant="danger" dot />
              <StatusBadge label="Info (Open)" variant="info" dot />
              <StatusBadge label="Neutral (EXPIRED)" variant="neutral" />
              <StatusBadge label="Critical (OVERDUE)" variant="critical" dot />
            </View>
          </View>

          {/* Section 5: Cards */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              5. Composite Cards
            </Text>
            <View className="gap-3 pt-1 border-t border-border">
              <View className="flex-row gap-3">
                <KPICard
                  title="Active Visitors"
                  value="12"
                  iconName="Users"
                  iconColor="#2563eb"
                  trend={{ direction: 'up', value: '+3 today' }}
                />
                <KPICard
                  title="Pending Passes"
                  value="4"
                  iconName="Clock"
                  iconColor="#ea580c"
                  trend={{ direction: 'down', value: '-1' }}
                />
              </View>

              <ListCard
                title="John Doe (Guest Pass)"
                subtitle="Valid: Today, 2:00 PM - 8:00 PM"
                leftIcon="QrCode"
                timestamp={new Date().toISOString()}
                status={{ label: 'ACTIVE', variant: 'success' }}
              />
            </View>
          </View>

          {/* Section 6: Loading Skeletons */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              6. Skeleton Loader Variants
            </Text>
            <View className="gap-3 pt-1 border-t border-border">
              <Skeleton variant="listItem" count={2} />
            </View>
          </View>

          {/* Section 7: Overlays */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              7. Overlay Triggers
            </Text>
            <View className="gap-2.5 pt-1 border-t border-border">
              <Button variant="outline" onPress={() => setBottomSheetOpen(true)}>
                <Text>Open Bottom Sheet</Text>
              </Button>
              <Button variant="destructive" onPress={() => setConfirmModalOpen(true)}>
                <Text>Open Confirmation Modal</Text>
              </Button>
            </View>
          </View>

          {/* Section 8: Visitor Management UI Components */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <Text variant="h3" className="text-foreground">
              8. Visitor Feature Components
            </Text>
            <View className="gap-4 pt-2 border-t border-border">
              <View className="gap-1">
                <Text variant="small" className="font-semibold text-foreground">
                  Step Indicator Progress Bar
                </Text>
                <VisitorPassStepIndicator
                  steps={[
                    { key: 's1', title: 'Details' },
                    { key: 's2', title: 'Schedule' },
                    { key: 's3', title: 'Options' },
                    { key: 's4', title: 'Review' },
                  ]}
                  currentStepIndex={1}
                />
              </View>

              <View className="gap-1">
                <Text variant="small" className="font-semibold text-foreground">
                  6-Digit Pass Code Component
                </Text>
                <VisitorPassCode code="849201" />
              </View>

              <View className="gap-1">
                <Text variant="small" className="font-semibold text-foreground">
                  QR Code Digital Ticket
                </Text>
                <VisitorQRCode code="849201" size={120} />
              </View>

              <View className="gap-1">
                <Text variant="small" className="font-semibold text-foreground">
                  Walk-In Gate Approval Card
                </Text>
                <WalkInApprovalCard
                  item={SHOWCASE_WALK_IN}
                  onApprove={() => {}}
                  onReject={() => {}}
                  onPressDetails={() => {}}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Demo Bottom Sheet */}
      <BottomSheet
        visible={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        title="Sample Bottom Sheet"
      >
        <View className="p-4 gap-4">
          <Text variant="p">This is a standardized Gorhom bottom sheet overlay.</Text>
          <Button variant="default" onPress={() => setBottomSheetOpen(false)}>
            <Text>Close Sheet</Text>
          </Button>
        </View>
      </BottomSheet>

      {/* Demo Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModalOpen}
        title="Revoke Visitor Pass?"
        message="Are you sure you want to revoke this visitor pass? This action cannot be undone."
        variant="danger"
        confirmLabel="Revoke Pass"
        onConfirm={() => setConfirmModalOpen(false)}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </ScreenShell>
  );
}
