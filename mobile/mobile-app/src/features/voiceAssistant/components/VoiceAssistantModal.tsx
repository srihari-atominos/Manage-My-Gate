import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TextInput, Platform, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/common/Chip';
import { useKeyboard } from '@/components/layout/useKeyboard';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Compass,
  RefreshCw,
  Send,
  Loader2,
  Square,
  MessageSquare,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { VoiceStateBadge } from './VoiceStateBadge';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceAssistantChatBubble } from './VoiceAssistantChatBubble';

export const VoiceAssistantModal: React.FC = () => {
  const {
    status,
    mode,
    isModalOpen,
    isMuted,
    isTtsEnabled,
    isGeneratingText,
    errorMessage,
    transcriptSnippet,
    elapsedSeconds,
    maxDurationSeconds,
    lastNavigatedScreen,
    messages,
    handleClose,
    toggleMute,
    toggleTts,
    retryPermission,
    startSession,
    sendTextMessage,
    confirmAction,
    cancelAction,
    clearChat,
    interruptAssistant,
    switchToVoiceMode,
    switchToChatMode,
    navigateToFeature,
    startListening,
    cancelListening,
  } = useVoiceAssistant();

  const { keyboardShown } = useKeyboard();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendText = async () => {
    if (!inputText || !inputText.trim() || isGeneratingText) return;
    const textToSend = inputText.trim();
    setInputText('');
    await sendTextMessage(textToSend);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendTextMessage(prompt);
  };

  // Automatically scroll down when new messages are added, status changes, or keyboard pops up
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length, status, isGeneratingText, keyboardShown]);

  const renderStatusHelperText = () => {
    switch (status) {
      case 'requesting_permission':
        return 'Requesting microphone access to enable real-time speech...';
      case 'permission_denied':
        return 'Microphone permission was denied. Please allow microphone access in device settings to use the voice assistant.';
      case 'connecting':
        return 'Establishing secure connection with NAHOM AI...';
      case 'listening':
        return 'Listening... speak naturally. You can interrupt anytime.';
      case 'transcribing':
        return 'Transcribing speech...';
      case 'processing':
        return 'NAHOM is processing your request...';
      case 'awaiting_confirmation':
        return 'Proposal prepared. Please review and tap Confirm or Cancel.';
      case 'thinking':
        return 'Processing your request...';
      case 'speaking':
        return 'NAHOM is speaking... (tap Stop to interrupt)';
      case 'muted':
        return 'Microphone is currently muted. Tap Unmute to speak.';
      case 'error':
        return errorMessage || 'An unexpected connection error occurred.';
      default:
        if (isGeneratingText) return 'NAHOM is generating a response...';
        return 'Ask anything about your community, amenities, bookings, or notices.';
    }
  };

  const isVoiceMode =
    mode === 'voice' ||
    status === 'permission_denied' ||
    status === 'connecting' ||
    status === 'listening' ||
    status === 'transcribing' ||
    status === 'speaking' ||
    status === 'muted';

  const isConnectedVoice =
    status === 'listening' ||
    status === 'transcribing' ||
    status === 'speaking' ||
    status === 'muted';

  return (
    <BottomSheet
      visible={isModalOpen}
      onClose={handleClose}
      title="NAHOM AI Assistant"
      testID="voice-assistant-modal"
    >
      <View className="w-full flex-col">
        {/* Top Header Row: Mode Switcher & Status Badge */}
        <View className="flex-row items-center justify-between w-full mb-2 px-3">
          {/* Segmented Mode Selector: Chat vs Live Voice */}
          <View className="flex-row items-center bg-secondary/80 p-0.5 rounded-full border border-border/60">
            <Pressable
              onPress={switchToChatMode}
              className={`flex-row items-center gap-1 px-3 py-1 rounded-full ${
                !isVoiceMode ? 'bg-primary shadow-2xs' : ''
              }`}
              accessibilityRole="button"
              accessibilityLabel="Switch to text chat mode"
            >
              <MessageSquare size={12} className={!isVoiceMode ? 'text-primary-foreground' : 'text-muted-foreground'} />
              <Text className={`text-xs font-semibold ${!isVoiceMode ? 'text-primary-foreground' : 'text-muted-foreground'}`}>Chat</Text>
            </Pressable>

            <Pressable
              onPress={switchToVoiceMode}
              className={`flex-row items-center gap-1 px-3 py-1 rounded-full ${
                isVoiceMode ? 'bg-primary shadow-2xs' : ''
              }`}
              accessibilityRole="button"
              accessibilityLabel="Switch to live voice mode"
            >
              <Mic size={12} className={isVoiceMode ? 'text-primary-foreground' : 'text-muted-foreground'} />
              <Text className={`text-xs font-semibold ${isVoiceMode ? 'text-primary-foreground' : 'text-muted-foreground'}`}>Live Voice</Text>
            </Pressable>
          </View>

          {/* Right Header Area: Clear Chat, Voice Speaker Toggle & Status Indicator */}
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={toggleTts}
              className={`p-1.5 rounded-full border ${
                isTtsEnabled
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-secondary/80 border-border/60'
              }`}
              accessibilityRole="button"
              accessibilityLabel={isTtsEnabled ? 'Mute voice audio output' : 'Enable voice audio output'}
              testID="toggle-tts-button"
            >
              {isTtsEnabled ? (
                <Volume2 size={12} className="text-primary" />
              ) : (
                <VolumeX size={12} className="text-muted-foreground" />
              )}
            </Pressable>

            {messages.length > 0 && (
              <Pressable
                onPress={clearChat}
                className="flex-row items-center gap-1 bg-secondary/80 px-2.5 py-1 rounded-full border border-border/60 active:bg-secondary"
                accessibilityRole="button"
                accessibilityLabel="Clear chat conversation"
                testID="clear-chat-button"
              >
                <Trash2 size={11} className="text-muted-foreground" />
                <Text className="text-xs font-medium text-muted-foreground">Clear Chat</Text>
              </Pressable>
            )}

            {isVoiceMode ? (
              <VoiceStateBadge status={status} testID="voice-status-badge" />
            ) : (
              <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {isGeneratingText ? 'Thinking...' : 'Ready'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Central Audio Waveform Bar (Active in Voice Mode when keyboard is closed) */}
        {isConnectedVoice && !keyboardShown && (
          <View className="w-full my-1 items-center justify-center bg-card/60 rounded-xl border border-border/40 py-2 shadow-2xs">
            <VoiceWaveform status={status} barCount={9} testID="voice-waveform" />
          </View>
        )}

        {/* Dynamic Status Guidance Text (Collapsed when typing with keyboard open) */}
        {!keyboardShown && (
          <View className="items-center px-4 my-1">
            <Text
              testID="voice-status-helper-text"
              className="text-xs text-center text-muted-foreground font-medium"
            >
              {renderStatusHelperText()}
            </Text>
          </View>
        )}

        {/* Navigation Feedback Banner */}
        {Boolean(lastNavigatedScreen) && (
          <View className="flex-row items-center justify-center gap-1.5 self-center my-1 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            <Compass size={13} className="text-primary" />
            <Text className="text-xs font-semibold text-primary">
              {lastNavigatedScreen}
            </Text>
          </View>
        )}

        {/* Live Transcript Snippet */}
        {Boolean(transcriptSnippet) && (
          <View className="mx-2 my-1 px-3 py-1.5 bg-card/80 rounded-xl border border-border/60">
            <Text className="text-xs text-foreground italic text-center">
              {transcriptSnippet}
            </Text>
          </View>
        )}

        {/* Conversational Stream: User & Assistant Chat Bubbles */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className={`w-full my-1 ${keyboardShown ? 'max-h-52 min-h-32' : 'max-h-72 min-h-40'}`}
          contentContainerClassName="pt-1 pb-3 px-1"
        >
          {messages.map((msg) => (
            <VoiceAssistantChatBubble
              key={msg.id}
              message={msg}
              onNavigate={navigateToFeature}
              onRetry={(prompt) => sendTextMessage(prompt)}
              onConfirmAction={confirmAction}
              onCancelAction={cancelAction}
              isActionExecuting={isGeneratingText}
            />
          ))}

          {/* Thinking / Transcribing / Generating Bubble */}
          {(status === 'thinking' || status === 'processing' || status === 'transcribing' || isGeneratingText) && (
            <View className="w-full items-start my-2 px-2">
              <View className="flex-row items-center bg-secondary/60 border border-border/80 px-3.5 py-2 rounded-2xl rounded-tl-xs shadow-2xs">
                <Loader2 size={14} className="text-primary animate-spin me-2" />
                <Text className="text-xs font-medium text-foreground">
                  {status === 'transcribing'
                    ? 'Transcribing speech...'
                    : status === 'processing' || isGeneratingText
                    ? 'NAHOM is processing your request...'
                    : 'NAHOM is thinking...'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Error / Permission Denied Recovery Actions */}
        {isVoiceMode && status === 'permission_denied' && (
          <View className="w-full mt-2 gap-2 px-2">
            <Button
              variant="default"
              onPress={retryPermission}
              className="w-full"
              accessibilityLabel="Grant microphone permission"
            >
              <Mic size={16} className="text-primary-foreground me-1" />
              <Text className="text-primary-foreground font-semibold">Grant Microphone Access</Text>
            </Button>
            <Button
              variant="outline"
              onPress={switchToChatMode}
              className="w-full"
              accessibilityLabel="Switch to text chat"
            >
              <Text className="text-foreground">Continue in Text Chat</Text>
            </Button>
          </View>
        )}

        {isVoiceMode && status === 'error' && (
          <View className="w-full mt-2 gap-2 px-2">
            <Button
              variant="default"
              onPress={startSession}
              className="w-full"
              accessibilityLabel="Retry voice connection"
            >
              <RefreshCw size={16} className="text-primary-foreground me-1" />
              <Text className="text-primary-foreground font-semibold">Retry Voice Connection</Text>
            </Button>
            <Button
              variant="outline"
              onPress={switchToChatMode}
              className="w-full"
              accessibilityLabel="Switch to text chat"
            >
              <Text className="text-foreground">Switch to Text Chat</Text>
            </Button>
          </View>
        )}

        {/* Quick Suggestion Chips (only shown on pristine chat start before any conversation) */}
        {messages.length === 0 && !keyboardShown && (
        <View className="w-full mt-1 mb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-1.5 px-2 flex-row items-center"
          >
            <Chip
              label="Community Expenses"
              onPress={() => handleQuickPrompt("What is my current month's community expense?")}
            />
            <Chip
              label="Check Amenities"
              onPress={() => handleQuickPrompt('Check Amenities')}
            />
            <Chip
              label="My Bookings"
              onPress={() => handleQuickPrompt('My Bookings')}
            />
            <Chip
              label="My Invoices"
              onPress={() => handleQuickPrompt('What are my maintenance charges and dues?')}
            />
            <Chip
              label="Visitor Passes"
              onPress={() => handleQuickPrompt('Visitor Passes')}
            />
            <Chip
              label="Helpdesk"
              onPress={() => handleQuickPrompt('Open Helpdesk Tickets')}
            />
          </ScrollView>
        </View>
        )}

        {/* Unified Input Dock: Mode-Aware Mic Button + Text Input + Send / Stop CTA */}
        <View className="w-full px-2 pt-1 pb-3">
          <View className="flex-row items-center gap-2 bg-secondary/50 p-1.5 rounded-2xl border border-border/80 shadow-2xs">
            {/* Mode-Aware Mic Button */}
            {isVoiceMode ? (
              <Pressable
                onPress={toggleMute}
                className={`w-10 h-10 rounded-xl items-center justify-center border shadow-2xs ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? (
                  <MicOff size={18} className="text-rose-500" />
                ) : (
                  <Mic size={18} className="text-emerald-600 dark:text-emerald-400" />
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={switchToVoiceMode}
                className="w-10 h-10 rounded-xl items-center justify-center border border-primary/20 bg-primary/10 shadow-2xs active:bg-primary/20"
                accessibilityRole="button"
                accessibilityLabel="Activate live voice mode"
              >
                <Mic size={18} className="text-primary" />
              </Pressable>
            )}

            {/* Text Input for Typing to AI */}
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendText}
              placeholder="Type a message or command..."
              placeholderTextColor="#94a3b8"
              className="flex-1 px-3 py-2 text-sm text-foreground"
              returnKeyType="send"
              blurOnSubmit={false}
              autoCapitalize="sentences"
              autoCorrect={true}
              keyboardType="default"
              editable={!isGeneratingText}
            />

            {/* Stop Generation or Send CTA Button */}
            {isGeneratingText || status === 'speaking' || status === 'processing' ? (
              <Button
                variant="destructive"
                size="icon"
                onPress={interruptAssistant}
                className="rounded-xl h-10 w-10 items-center justify-center shadow-2xs"
                accessibilityLabel="Stop response"
              >
                <Square size={14} color="white" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                onPress={handleSendText}
                disabled={!inputText.trim() || isGeneratingText}
                className="rounded-xl h-10 w-10 items-center justify-center shadow-2xs"
                accessibilityLabel="Send message"
              >
                <Send size={16} color="white" />
              </Button>
            )}
          </View>

          {/* Voice Mode Active Controls Row: End Voice Session / Switch to Text */}
          {isVoiceMode && (
            <View className="w-full mt-2.5 flex-row items-center justify-between px-1">
              <Pressable
                onPress={switchToChatMode}
                className="flex-row items-center gap-1.5 py-1 px-2 rounded-lg"
                accessibilityRole="button"
                accessibilityLabel="Switch to text mode"
              >
                <MessageSquare size={13} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground font-medium">Switch to Text</Text>
              </Pressable>

              <Button
                variant="destructive"
                size="sm"
                onPress={handleClose}
                className="rounded-xl px-4 h-9 flex-row items-center"
                accessibilityLabel="End voice assistant session"
              >
                <PhoneOff size={14} className="text-white me-1.5" />
                <Text className="text-white text-xs font-semibold">End Call</Text>
              </Button>
            </View>
          )}
        </View>
      </View>
    </BottomSheet>
  );
};

export default VoiceAssistantModal;
