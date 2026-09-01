import React from 'react';
import { View, ScrollView } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { DetailRow } from '@/components/ui/DetailRow';
import { TextInput } from '@/components/forms/TextInput';
import { SuccessToast } from '@/components/feedback/SuccessToast';
import { VillaSwitchModal } from '@/components/navigation/VillaSwitchModal';
import { OrgSwitchModal } from '@/components/navigation/OrgSwitchModal';
import { RoleSwitchModal } from '@/components/navigation/RoleSwitchModal';
import { ProfileHeaderCard } from '@/src/features/profile/components/ProfileHeaderCard';
import { useProfile } from '@/src/features/profile/hooks/useProfile';
import { useTranslation } from '@/src/utils/i18n';
import { LogOut, Save, Building2, Home, ShieldCheck } from 'lucide-react-native';

export default function ProfileScreen() {
  const { t, tRole } = useTranslation();
  const {
    user,
    dynamicUnit,
    dynamicCommunity,
    dynamicRole,
    emergencyContact,
    saving,
    successMessage,
    villaModalOpen,
    orgModalOpen,
    roleModalOpen,
    setVillaModalOpen,
    setOrgModalOpen,
    setRoleModalOpen,
    updateEmergencyContact,
    logout,
  } = useProfile();

  const [contactName, setContactName] = React.useState(emergencyContact.name);
  const [contactPhone, setContactPhone] = React.useState(emergencyContact.phone);

  const handleSaveContact = () => {
    updateEmergencyContact({
      name: contactName,
      phone: contactPhone,
    });
  };

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : t('logged_in_resident', 'Resident User'));

  return (
    <ScreenShell
      title={t('user_profile_account_title', 'User Profile & Account')}
      subtitle={t('user_profile_account_subtitle', 'Manage identity, unit binding & emergency contacts')}
      iconName="User"
      showBackButton={true}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-5 pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Header Card */}
        <ProfileHeaderCard
          name={displayName}
          email={user?.email}
          unitName={dynamicUnit}
          roleName={tRole(dynamicRole, dynamicRole)}
          communityName={dynamicCommunity}
          status={t('active_resident', 'Active Resident')}
        />

        {/* Identity & Account Details */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            {t('account_details_header', 'Account Details')}
          </Text>

          <View className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <DetailRow label={t('resident_name', 'Resident Name')} value={displayName} />
            <DetailRow label={t('email_address_label', 'Email Address')} value={user?.email || t('not_provided', 'Not Provided')} />
            <DetailRow label={t('active_unit_label', 'Active Unit')} value={dynamicUnit} />
            <DetailRow label={t('community_workspace_label', 'Community Workspace')} value={dynamicCommunity} />
            <DetailRow label={t('role_persona_label', 'Role Persona')} value={tRole(dynamicRole, dynamicRole)} />
          </View>
        </View>

        {/* Context Switchers Section */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            {t('context_switchers_header', 'Context Switchers')}
          </Text>

          <View className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <ListCard
              variant="row"
              title={t('switch_villa_unit_title', 'Switch Villa Unit')}
              subtitle={dynamicUnit}
              leftIcon={Home}
              showChevron={true}
              onPress={() => setVillaModalOpen(true)}
            />

            <ListCard
              variant="row"
              title={t('switch_community_org_title', 'Switch Community Org')}
              subtitle={dynamicCommunity}
              leftIcon={Building2}
              showChevron={true}
              onPress={() => setOrgModalOpen(true)}
            />

            <ListCard
              variant="row"
              title={t('switch_role_persona_title', 'Switch Role Persona')}
              subtitle={tRole(dynamicRole, dynamicRole)}
              leftIcon={ShieldCheck}
              showChevron={true}
              isLastItem={true}
              onPress={() => setRoleModalOpen(true)}
            />
          </View>
        </View>

        {/* Emergency Contacts Section */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            {t('emergency_contacts_header', 'Emergency Contacts')}
          </Text>

          <View className="bg-card border border-border rounded-2xl p-4 shadow-xs gap-3.5">
            <TextInput
              label={t('emergency_contact_name_label', 'Emergency Contact Name')}
              placeholder="e.g. Fatima Al-Mansoor"
              value={contactName}
              onChangeText={setContactName}
            />

            <TextInput
              label={t('emergency_contact_phone_label', 'Emergency Contact Phone')}
              placeholder="e.g. +971 50 987 6543"
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
            />

            {successMessage && <SuccessToast message={successMessage} />}

            <Button
              variant="secondary"
              size="sm"
              loading={saving}
              leftIcon={Save}
              onPress={handleSaveContact}
              className="mt-1 bg-primary/10 border border-primary/20"
              textClassName="text-primary font-semibold text-xs"
            >
              {t('save_emergency_contact_btn', 'Save Emergency Contact')}
            </Button>
          </View>
        </View>

        {/* Sign Out Action */}
        <Button
          variant="destructive"
          leftIcon={LogOut}
          onPress={logout}
          className="h-12 w-full mt-2 rounded-xl"
          textClassName="font-bold text-sm"
        >
          {t('sign_out', 'Sign Out')}
        </Button>
      </ScrollView>

      {/* Context Modals */}
      <VillaSwitchModal
        visible={villaModalOpen}
        onClose={() => setVillaModalOpen(false)}
        activeVilla={dynamicUnit}
        onSelectVilla={() => setVillaModalOpen(false)}
        communityName={dynamicCommunity}
      />

      <OrgSwitchModal
        visible={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        activeCommunity={dynamicCommunity}
        onSelectCommunity={() => setOrgModalOpen(false)}
      />

      <RoleSwitchModal
        visible={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />
    </ScreenShell>
  );
}
