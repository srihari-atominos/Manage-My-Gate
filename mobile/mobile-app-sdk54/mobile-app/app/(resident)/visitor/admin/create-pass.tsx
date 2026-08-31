import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { VisitorPassWizard } from '@/src/features/visitor/components/wizard/VisitorPassWizard';
import { AdminVillaFilterSheet } from '@/src/features/visitor/components/admin/AdminVillaFilterSheet';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { selectActiveOrgId, selectAuthUser } from '@/src/features/auth/store/authSelectors';
import { Building2, Filter } from 'lucide-react-native';

export default function AdminCreatePassScreen() {
  const router = useRouter();
  const authUser = useSelector(selectAuthUser);
  const activeOrgId = useSelector(selectActiveOrgId);
  const { createAdminPass } = useAdminVisitor();

  const [targetVillaId, setTargetVillaId] = useState<string | undefined>(undefined);
  const [targetVillaName, setTargetVillaName] = useState<string>('Community Common Area');
  const [villaSheetOpen, setVillaSheetOpen] = useState(false);

  const roleContext = {
    role: 'ADMIN' as const,
    orgId: activeOrgId,
    createdById: authUser?.id || authUser?._id,
    villaId: targetVillaId,
  };

  return (
    <ScreenShell title="Admin Pass Creation" subtitle="Issue visitor pass on behalf of villa or community event">
      <View className="flex-1 bg-background">
        <VisitorPassWizard
          initialType="GUEST"
          roleContext={roleContext}
          onSubmitPass={async (payload) => {
            return await createAdminPass(payload);
          }}
          onClose={() => router.back()}
          renderExtraStepHeader={() => (
            <View className="px-4 py-2.5 bg-muted/40 border-b border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Building2 size={16} className="text-primary" />
                <Text className="text-xs font-semibold text-muted-foreground">Target Destination:</Text>
                <Text className="text-xs font-bold text-foreground">{targetVillaName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVillaSheetOpen(true)}
                activeOpacity={0.7}
                className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20"
                accessibilityRole="button"
                accessibilityLabel="Change target destination"
              >
                <Text className="text-xs font-bold text-primary">Change</Text>
                <Filter size={12} className="text-primary ms-0.5" />
              </TouchableOpacity>
            </View>
          )}
        />

        <AdminVillaFilterSheet
          visible={villaSheetOpen}
          selectedVillaId={targetVillaId}
          onClose={() => setVillaSheetOpen(false)}
          onSelectVilla={(vId, vName) => {
            setTargetVillaId(vId);
            setTargetVillaName(vName || 'Community Common Area');
          }}
        />
      </View>
    </ScreenShell>
  );
}
