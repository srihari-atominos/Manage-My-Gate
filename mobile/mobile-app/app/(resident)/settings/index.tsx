import React from 'react';
import { View, ScrollView, Modal, Pressable } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { ThemeToggleSwitch } from '@/components/settings/ThemeToggleSwitch';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { StorageCleanerWidget } from '@/components/settings/StorageCleanerWidget';
import { PermissionRequestCard } from '@/components/settings/PermissionRequestCard';
import { AppVersionFooter } from '@/components/settings/AppVersionFooter';
import { SettingToggleRow } from '@/src/features/settings/components/SettingToggleRow';
import { useSettings } from '@/src/features/settings/hooks/useSettings';
import {
  Bell,
  Wrench,
  Vote,
  AlertTriangle,
  Fingerprint,
  Lock,
  Check,
} from 'lucide-react-native';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English (US)' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'fr', label: 'Français (French)' },
];

export default function SettingsScreen() {
  const {
    isDark,
    toggleTheme,
    preferences,
    updatePreference,
    currentLanguage,
    setCurrentLanguage,
    languageModalOpen,
    setLanguageModalOpen,
    usedSpace,
    totalSpace,
    pushStatus,
    handleClearCache,
    handleRequestPush,
  } = useSettings();

  return (
    <ScreenShell
      title="App Settings & Preferences"
      subtitle="Configure notifications, security & theme localization"
      iconName="Settings"
      showBackButton={true}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-5 pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance & Localization */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            Appearance & Localization
          </Text>

          <ThemeToggleSwitch isDark={isDark} onToggle={toggleTheme} />

          <LanguageSelector
            currentLanguage={currentLanguage}
            onPress={() => setLanguageModalOpen(true)}
          />
        </View>

        {/* Notifications & Alerts */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            Notifications & Alerts
          </Text>

          <View className="bg-card border border-border rounded-2xl px-4 py-1 shadow-xs">
            <SettingToggleRow
              label="Gate Entry Alerts"
              description="Push notifications when visitors or couriers arrive at the gate"
              icon={Bell}
              value={preferences.gateAlerts}
              onValueChange={(val) => updatePreference('gateAlerts', val)}
            />

            <SettingToggleRow
              label="Maintenance & Billing Notices"
              description="Invoices, scheduled facility downtime, and work order progress"
              icon={Wrench}
              value={preferences.maintenanceNotices}
              onValueChange={(val) => updatePreference('maintenanceNotices', val)}
            />

            <SettingToggleRow
              label="Community Poll Announcements"
              description="Voting reminders and community survey broadcasts"
              icon={Vote}
              value={preferences.communityPolls}
              onValueChange={(val) => updatePreference('communityPolls', val)}
            />

            <SettingToggleRow
              label="Emergency Broadcasts"
              description="Critical security alarms and community management advisories"
              icon={AlertTriangle}
              iconBgColor="bg-destructive/10 border border-destructive/20"
              iconColor="#ef4444"
              value={preferences.emergencyBroadcasts}
              onValueChange={(val) => updatePreference('emergencyBroadcasts', val)}
              isLastItem={true}
            />
          </View>
        </View>

        {/* Security & Access */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            Security & Hardware
          </Text>

          <View className="bg-card border border-border rounded-2xl px-4 py-1 shadow-xs">
            <SettingToggleRow
              label="Biometric Quick Unlock"
              description="Use Touch ID or Face ID for fast authentication"
              icon={Fingerprint}
              value={preferences.biometricUnlock}
              onValueChange={(val) => updatePreference('biometricUnlock', val)}
            />

            <SettingToggleRow
              label="Require PIN for Gate Approvals"
              description="Prompt for 4-digit security PIN before opening gate for walk-ins"
              icon={Lock}
              value={preferences.requireGateApprovalPin}
              onValueChange={(val) => updatePreference('requireGateApprovalPin', val)}
              isLastItem={true}
            />
          </View>
        </View>

        {/* Storage & Diagnostics */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            Storage & System Permissions
          </Text>

          <StorageCleanerWidget
            usedSpace={usedSpace}
            totalSpace={totalSpace}
            onClearCache={handleClearCache}
          />

          <PermissionRequestCard
            title="Push Notifications"
            description="System permission to deliver instant gate arrival & security alerts"
            status={pushStatus}
            onRequest={handleRequestPush}
          />
        </View>

        {/* App Version & Telemetry Footer */}
        <AppVersionFooter />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable
            className="absolute inset-0"
            onPress={() => setLanguageModalOpen(false)}
          />
          <View className="bg-card border-t border-border rounded-t-3xl p-5 gap-3 max-h-[60%]">
            <Text className="text-base font-extrabold text-foreground text-center mb-1">
              Select Language
            </Text>

            {LANGUAGE_OPTIONS.map((item) => {
              const isSelected = item.label === currentLanguage;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => {
                    setCurrentLanguage(item.label);
                    setLanguageModalOpen(false);
                  }}
                  className={`flex-row items-center justify-between p-3.5 rounded-xl border ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isSelected
                        ? 'font-bold text-primary'
                        : 'font-medium text-foreground'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {isSelected && <Check size={18} className="text-primary" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}
