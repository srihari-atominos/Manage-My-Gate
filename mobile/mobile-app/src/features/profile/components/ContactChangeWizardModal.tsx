import React, { useState } from 'react';
import { View, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { OtpInputField } from '@/components/auth/OtpInputField';
import { SheetGrabHandle } from '@/components/ui/SheetGrabHandle';
import { useTranslation } from '@/src/utils/i18n';
import authService from '@/src/features/auth/services/authService';

interface ContactChangeWizardModalProps {
  visible: boolean;
  type: 'email' | 'phone';
  onClose: () => void;
  onSuccess: (payload: { updateAuthToken: string; email?: string; emailOtp?: string; phone?: string; phoneOtp?: string }) => void;
}

export const ContactChangeWizardModal: React.FC<ContactChangeWizardModalProps> = ({
  visible,
  type,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentOtp, setCurrentOtp] = useState('');
  const [updateAuthToken, setUpdateAuthToken] = useState<string | null>(null);
  const [newContact, setNewContact] = useState('');
  const [newOtp, setNewOtp] = useState('');

  const resetState = () => {
    setStep(1);
    setCurrentOtp('');
    setUpdateAuthToken(null);
    setNewContact('');
    setNewOtp('');
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleRequestCurrentOtp = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await authService.requestCurrentContactOtp();
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCurrentOtp = async () => {
    if (!currentOtp || currentOtp.length < 6) {
      setErrorMsg('Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authService.verifyCurrentContactOtp(currentOtp);
      setUpdateAuthToken((res as any).data?.updateAuthToken || (res as any).updateAuthToken);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewOtp = async () => {
    if (!newContact.trim()) {
      setErrorMsg(`Please enter your new ${type}.`);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      if (type === 'email') {
        await authService.requestEmailChangeOtp(newContact);
      } else {
        await authService.requestPhoneChangeOtp(newContact);
      }
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!newOtp || newOtp.length < 6) {
      setErrorMsg('Please enter a valid 6-digit OTP.');
      return;
    }
    if (!updateAuthToken) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: any = { updateAuthToken };
      if (type === 'email') {
        payload.email = newContact;
        payload.emailOtp = newOtp;
      } else {
        payload.phone = newContact;
        payload.phoneOtp = newOtp;
      }
      
      await onSuccess(payload);
      resetState();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const isEmail = type === 'email';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/50">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="bg-card rounded-t-3xl pt-2 pb-8 px-6 shadow-xl max-h-[90%] min-h-[50%]">
            <SheetGrabHandle onClose={handleClose} />
            
            <View className="flex-row items-center justify-between mt-4 mb-2">
              <Text className="text-xl font-bold text-foreground">
                {isEmail ? 'Change Email Address' : 'Change Phone Number'}
              </Text>
            </View>

            {errorMsg && (
              <View className="bg-red-50 p-3 rounded-lg border border-red-100 mb-4">
                <Text className="text-red-600 text-sm">{errorMsg}</Text>
              </View>
            )}

            {step === 1 && (
              <View className="mt-4 gap-4">
                <Text className="text-base text-muted-foreground mb-4">
                  For security, we need to verify your current contact information before you can make changes.
                </Text>
                <Button variant="default" onPress={handleRequestCurrentOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : 'Send OTP to Current Contact'}
                </Button>
              </View>
            )}

            {step === 2 && (
              <View className="mt-4 gap-6">
                <Text className="text-base text-muted-foreground text-center">
                  Enter the OTP sent to your current {isEmail ? 'email address' : 'phone number'}.
                </Text>
                <OtpInputField value={currentOtp} onValueChange={setCurrentOtp} length={6}  />
                <Button variant="default" onPress={handleVerifyCurrentOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : 'Verify Current Contact'}
                </Button>
              </View>
            )}

            {step === 3 && (
              <View className="mt-4 gap-4">
                <Text className="text-base text-muted-foreground mb-2">
                  Enter your new {isEmail ? 'email address' : 'phone number'}.
                </Text>
                <TextInput
                  value={newContact}
                  onChangeText={setNewContact}
                  placeholder={isEmail ? 'New Email Address' : 'New Phone Number'}
                  keyboardType={isEmail ? 'email-address' : 'phone-pad'}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <Button variant="default" onPress={handleRequestNewOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : 'Send Verification OTP'}
                </Button>
              </View>
            )}

            {step === 4 && (
              <View className="mt-4 gap-6">
                <Text className="text-base text-muted-foreground text-center">
                  Enter the verification OTP sent to your NEW {isEmail ? 'email' : 'phone'}.
                </Text>
                <OtpInputField value={newOtp} onValueChange={setNewOtp} length={6}  />
                <Button variant="default" onPress={handleFinalSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : 'Update Profile'}
                </Button>
              </View>
            )}

            <Button variant="ghost" onPress={handleClose} disabled={loading} className="mt-2">
              Cancel
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
