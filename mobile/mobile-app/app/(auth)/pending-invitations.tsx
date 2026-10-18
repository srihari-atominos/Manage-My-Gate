import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, ImageBackground, Platform, ScrollView, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { respondToInvitationThunk } from '@/src/features/auth/store/authSlice';
import type { AppDispatch, RootState } from '@/src/store/store';

const invitationLabel = (invitation: any) => invitation?.communityName || invitation?.organizationName || invitation?.orgName || 'Community invitation';

export default function PendingInvitationsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { invitationSelection, loading, error } = useSelector((state: RootState) => state.auth);
  const invitations = invitationSelection?.pendingInvitations || [];
  const ticket = invitationSelection?.ticket || undefined;

  const accept = async (invitation: any) => {
    const result: any = await dispatch(respondToInvitationThunk({
      invitationId: invitation?.id || invitation?._id,
      inviteToken: invitation?.inviteToken,
      ticket,
    }));
    if (result?.meta?.requestStatus === 'fulfilled') router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Choose invitation' }} />
      <ImageBackground source={require('../../assets/images/auth-bg.jpg')} style={{ flex: 1 }} blurRadius={Platform.OS === 'ios' ? 3 : 2} resizeMode="cover">
        <View className="absolute inset-0 bg-white/40 dark:bg-[#0B0E14]/55" />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
          <View className="flex-1 justify-center max-w-sm mx-auto w-full gap-4">
            <View className="bg-white/80 dark:bg-[#1C1917]/80 border border-white/70 dark:border-white/15 rounded-3xl p-6 gap-4">
              <View className="items-center gap-3">
                <View className="bg-primary/10 p-4 rounded-full"><Building2 size={28} className="text-primary" /></View>
                <Text className="text-xl font-extrabold text-foreground text-center">Choose a community</Text>
                <Text className="text-sm text-muted-foreground text-center">Select the invitation you want to accept.</Text>
              </View>
              {error ? <Text className="text-destructive text-sm text-center">{error}</Text> : null}
              {invitations.length === 0 ? <Text className="text-sm text-muted-foreground text-center">No invitations are available to choose.</Text> : invitations.map((invitation: any) => (
                <View key={String(invitation?.id || invitation?._id || invitation?.orgId)} className="border border-border rounded-2xl p-4 gap-3">
                  <Text className="font-bold text-foreground">{invitationLabel(invitation)}</Text>
                  <Button disabled={loading} onPress={() => accept(invitation)}>{loading ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-primary-foreground">Accept</Text>}</Button>
                </View>
              ))}
              <Button variant="ghost" disabled={loading} onPress={() => router.replace('/(auth)/login')}><Text className="text-primary font-semibold">Back to sign in</Text></Button>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </>
  );
}