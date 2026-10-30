import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, TextInput, Platform, Clipboard } from 'react-native';
import { Text } from '@/components/ui/text';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Compass,
  ShieldCheck,
  Wrench,
  Bell,
  Landmark,
  Wallet,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Check,
  Users,
  Car,
  Vote,
  Copy,
  Pencil,
  CreditCard,
} from 'lucide-react-native';
import type { AssistantMessage } from '../store/voiceAssistantSlice';
import { AIInteractiveOptions } from './AIInteractiveOptions';

interface VoiceAssistantChatBubbleProps {
  message: AssistantMessage;
  onNavigate?: (route: string) => void;
  onRetry?: (prompt: string) => void;
  onConfirmAction?: (actionId: string, confirmationToken: string) => void;
  onCancelAction?: (actionId: string) => void;
  onSelectOption?: (option: string) => void;
  onDeselectOption?: (option: string) => void;
  onMultiSelectSubmit?: (selectedValues: string[]) => void;
  onEditPrompt?: (messageId: string, newText: string) => void;
  isActionExecuting?: boolean;
}

export const VoiceAssistantChatBubble: React.FC<VoiceAssistantChatBubbleProps> = ({
  message,
  onNavigate,
  onRetry,
  onConfirmAction,
  onCancelAction,
  onSelectOption,
  onDeselectOption,
  onMultiSelectSubmit,
  onEditPrompt,
  isActionExecuting,
}) => {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async (textToCopy: string) => {
    if (!textToCopy) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      } else if (Clipboard && typeof Clipboard.setString === 'function') {
        Clipboard.setString(textToCopy);
      }
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // safe fallback
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFeatureIcon = (category?: string, name?: string) => {
    const lower = (category || name || '').toLowerCase();
    if (lower.includes('visitor') || lower.includes('pass') || lower.includes('gate')) {
      return <ShieldCheck size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('booking') || lower.includes('amenit')) {
      return <Calendar size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('complaint') || lower.includes('ticket') || lower.includes('maintenance')) {
      return <Wrench size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('notice')) {
      return <Bell size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('staff') || lower.includes('maid') || lower.includes('cook') || lower.includes('household') || lower.includes('resident')) {
      return <Users size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('vehicle') || lower.includes('parking') || lower.includes('car')) {
      return <Car size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('poll') || lower.includes('vote') || lower.includes('survey')) {
      return <Vote size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('finance') || lower.includes('expense') || lower.includes('billing')) {
      return <Landmark size={18} className="text-primary me-2 shrink-0" />;
    }
    if (lower.includes('wallet')) {
      return <Wallet size={18} className="text-primary me-2 shrink-0" />;
    }
    return <Compass size={18} className="text-primary me-2 shrink-0" />;
  };

  if (isUser) {
    if (isEditing) {
      return (
        <View className="w-full items-end my-1.5 px-2">
          <View className="w-full max-w-[90%] bg-card border border-primary/50 rounded-2xl p-3 shadow-2xs">
            <Text className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              Edit Message
            </Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              className="text-sm text-foreground bg-secondary/30 rounded-xl p-2.5 min-h-[50px] max-h-[120px] border border-border/60"
              placeholder="Edit your message..."
              placeholderTextColor="#94a3b8"
              testID={`edit-textinput-${message.id}`}
            />
            <View className="flex-row items-center justify-end gap-2 mt-2.5 pt-2 border-t border-border/40">
              <Pressable
                onPress={() => {
                  setIsEditing(false);
                  setEditText(message.text);
                }}
                className="px-3 py-1.5 rounded-lg border border-border bg-card active:bg-secondary"
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
                testID={`cancel-edit-${message.id}`}
              >
                <Text className="text-xs font-semibold text-muted-foreground">Cancel</Text>
              </Pressable>

              <Pressable
                disabled={!editText.trim() || editText.trim() === message.text}
                onPress={() => {
                  const updated = editText.trim();
                  setIsEditing(false);
                  if (updated && updated !== message.text) {
                    onEditPrompt?.(message.id, updated);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${
                  !editText.trim() || editText.trim() === message.text
                    ? 'bg-primary/40'
                    : 'bg-primary active:bg-primary/90'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Save and update message"
                testID={`save-edit-${message.id}`}
              >
                <Check size={13} color="white" />
                <Text className="text-xs font-bold text-primary-foreground">Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View className="w-full items-end my-1.5 px-2">
        <View className="bg-primary px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] shadow-2xs">
          <Text className="text-sm font-medium text-primary-foreground leading-relaxed">
            {message.text}
          </Text>
        </View>

        {/* Action row with timestamp, Copy, and Edit buttons */}
        <View className="flex-row items-center gap-2 mt-1 pe-1">
          <Text className="text-[10px] text-muted-foreground">
            {formatTimestamp(message.timestamp)}
          </Text>

          {/* Copy Button */}
          <Pressable
            onPress={() => handleCopy(message.text)}
            hitSlop={6}
            className="flex-row items-center gap-1 py-0.5 px-1 rounded active:bg-secondary"
            accessibilityRole="button"
            accessibilityLabel="Copy message"
            testID={`copy-user-msg-${message.id}`}
          >
            {copied ? (
              <Check size={11} className="text-emerald-500" />
            ) : (
              <Copy size={11} className="text-muted-foreground" />
            )}
          </Pressable>

          {/* Edit Button */}
          {Boolean(onEditPrompt) && (
            <Pressable
              disabled={isActionExecuting}
              onPress={() => {
                setEditText(message.text);
                setIsEditing(true);
              }}
              hitSlop={6}
              className={`flex-row items-center gap-1 py-0.5 px-1 rounded active:bg-secondary ${
                isActionExecuting ? 'opacity-40' : ''
              }`}
              accessibilityRole="button"
              accessibilityLabel="Edit message"
              testID={`edit-user-msg-${message.id}`}
            >
              <Pencil size={11} className="text-muted-foreground" />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const structuredData = message.metadata?.data;
  const options = Array.isArray(message.metadata?.options)
    ? message.metadata.options
    : Array.isArray(structuredData?.options)
    ? structuredData.options
    : [];
  const interactiveConfig = message.metadata?.interactiveConfig || structuredData?.interactiveConfig;
  const topExpenseCategories = Array.isArray(structuredData?.topExpenseCategories)
    ? structuredData.topExpenseCategories
    : [];
  const recentInvoices = Array.isArray(structuredData?.recentInvoices)
    ? structuredData.recentInvoices
    : [];

  const actionCard = message?.metadata?.actionCard;

  if (!message) {
    return null;
  }

  // Suppress rendering if message text is completely empty and no actionable content is attached
  if (!message.text && !message.metadata?.targetRoute && !actionCard && !structuredData && !message.isError) {
    return null;
  }

  // Assistant bubble
  return (
    <View className="w-full items-start my-2 px-2">
      <View className="flex-row items-start max-w-[95%]">
        {/* Gemini Avatar Icon */}
        <View className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 items-center justify-center me-2 mt-0.5 shrink-0 shadow-2xs">
          <Sparkles size={14} className="text-primary" />
        </View>

        <View className="flex-1">
          <View className="bg-card border border-border/80 px-4 py-3 rounded-2xl rounded-tl-xs shadow-2xs">
            {/* Natural language response is always rendered as the primary text */}
            <Text className="text-sm font-normal text-foreground leading-relaxed">
              {message.text}
            </Text>

            {/* Universal Interactive Options (Cards & Chips) */}
            {options.length > 0 && (
              <AIInteractiveOptions
                messageId={message.id}
                options={options}
                interactiveConfig={interactiveConfig}
                disabled={isActionExecuting}
                onSelectOption={onSelectOption}
                onDeselectOption={onDeselectOption}
                onMultiSelectSubmit={onMultiSelectSubmit}
              />
            )}

            {/* Optional Structured Data Breakdown Pills */}
            {topExpenseCategories.length > 0 && (
              <View className="mt-2.5 pt-2 border-t border-border/40 gap-1.5">
                <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Expense Breakdown ({structuredData?.period || 'Current Month'})
                </Text>
                <View className="flex-row flex-wrap gap-1">
                  {topExpenseCategories.map((c: any, idx: number) => (
                    <View
                      key={idx}
                      className="bg-secondary/80 px-2 py-0.5 rounded-md border border-border/60 flex-row items-center gap-1"
                    >
                      <Text className="text-[11px] font-medium text-foreground">{c.category}:</Text>
                      <Text className="text-[11px] font-bold text-primary">
                        ₹{Number(c.amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {recentInvoices.length > 0 && (
              <View className="mt-2.5 pt-2 border-t border-border/40 gap-1.5">
                <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Invoices
                </Text>
                <View className="flex-row flex-wrap gap-1">
                  {recentInvoices.map((inv: any, idx: number) => (
                    <View
                      key={idx}
                      className="bg-secondary/80 px-2 py-0.5 rounded-md border border-border/60 flex-row items-center gap-1"
                    >
                      <Text className="text-[11px] font-medium text-foreground">
                        {inv.invoiceNumber} ({inv.status}):
                      </Text>
                      <Text className="text-[11px] font-bold text-primary">
                        ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Two-Phase Action Confirmation Proposal Card */}
            {actionCard?.type === 'confirmation' && (
              <View className="mt-3 p-3.5 bg-secondary/50 rounded-xl border border-primary/40 shadow-2xs">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-1.5 flex-1 me-2">
                    {actionCard.actionType?.includes('VISITOR') ? (
                      <ShieldCheck size={16} className="text-primary" />
                    ) : actionCard.actionType?.includes('EXPENSE') ? (
                      <Wallet size={16} className="text-primary" />
                    ) : actionCard.actionType?.includes('COMPLAINT') ? (
                      <Wrench size={16} className="text-primary" />
                    ) : (
                      <Calendar size={16} className="text-primary" />
                    )}
                    <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                      {actionCard.title || 'Action Confirmation'}
                    </Text>
                  </View>
                  <View className="bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <Text className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Pending Confirmation
                    </Text>
                  </View>
                </View>

                {/* Summary */}
                {actionCard.summary && (
                  <Text className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
                    {actionCard.summary}
                  </Text>
                )}

                {/* Key-Value Details */}
                {actionCard.details && typeof actionCard.details === 'object' && (
                  <View className="bg-card rounded-lg p-2.5 mb-3 gap-1.5 border border-border/60">
                    {Object.entries(actionCard.details).map(([key, val]) => (
                      <View key={key} className="flex-row justify-between items-center">
                        <Text className="text-[11px] text-muted-foreground font-medium">{key}</Text>
                        <Text className="text-[11px] text-foreground font-semibold">{String(val)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action CTA Row: Dual Payment Options OR Standard Pair */}
                {Array.isArray(actionCard.paymentOptions) && actionCard.paymentOptions.length > 0 ? (
                  <View className="gap-2 pt-2 border-t border-border/40">
                    <Text className="text-[11px] font-semibold text-muted-foreground mb-0.5">
                      Choose Payment Method:
                    </Text>

                    <View className="gap-1.5">
                      {actionCard.paymentOptions.map((opt: any) => {
                        const isWallet = opt.id === 'WALLET';
                        const isSufficient = opt.isSufficient !== false;
                        return (
                          <Pressable
                            key={opt.id}
                            disabled={isActionExecuting}
                            onPress={() => {
                              if (isWallet && isSufficient) {
                                onConfirmAction?.(actionCard.actionId, actionCard.confirmationToken);
                              } else if (opt.route && onNavigate) {
                                onNavigate(opt.route);
                              } else {
                                onConfirmAction?.(actionCard.actionId, actionCard.confirmationToken);
                              }
                            }}
                            className={`p-2.5 rounded-lg border flex-row items-center justify-between active:opacity-80 ${
                              isWallet
                                ? isSufficient
                                  ? 'bg-emerald-500/10 border-emerald-500/30'
                                  : 'bg-amber-500/10 border-amber-500/30'
                                : 'bg-primary/10 border-primary/30'
                            }`}
                            accessibilityRole="button"
                            accessibilityLabel={opt.actionLabel || opt.label}
                          >
                            <View className="flex-row items-center gap-2 flex-1 me-2">
                              {isWallet ? (
                                <Wallet size={16} className={isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
                              ) : (
                                <CreditCard size={16} className="text-primary" />
                              )}
                              <View className="flex-1">
                                <Text className="text-xs font-bold text-foreground">
                                  {opt.label}
                                </Text>
                                <Text className="text-[10px] text-muted-foreground mt-0.5">
                                  {isWallet
                                    ? isSufficient
                                      ? `Balance: ₹${opt.balance} available`
                                      : `Balance: ₹${opt.balance} (₹${opt.shortageAmount} short)`
                                    : 'Instant checkout (GPay, PhonePe, UPI, Cards)'}
                                </Text>
                              </View>
                            </View>

                            <View className="flex-row items-center gap-1 bg-card/80 px-2 py-1 rounded border border-border/80">
                              <Text className={`text-[11px] font-bold ${
                                isWallet
                                  ? isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                  : 'text-primary'
                              }`}>
                                {opt.actionLabel || (isWallet && !isSufficient ? 'Top Up' : 'Pay')}
                              </Text>
                              <ArrowRight size={11} className="text-muted-foreground" />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Pressable
                      disabled={isActionExecuting}
                      onPress={() => onCancelAction?.(actionCard.actionId)}
                      className="py-1.5 px-3 rounded-lg border border-border bg-card active:bg-secondary items-center justify-center mt-1"
                      accessibilityRole="button"
                      accessibilityLabel={actionCard.cancelLabel || 'Cancel'}
                    >
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {actionCard.cancelLabel || 'Cancel'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2 pt-1 border-t border-border/40">
                    <Pressable
                      disabled={isActionExecuting}
                      onPress={() => onCancelAction?.(actionCard.actionId)}
                      className="flex-1 py-2 px-3 rounded-lg border border-border bg-card active:bg-secondary items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={actionCard.cancelLabel || 'Cancel'}
                    >
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {actionCard.cancelLabel || 'Cancel'}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={isActionExecuting}
                      onPress={() => onConfirmAction?.(actionCard.actionId, actionCard.confirmationToken)}
                      className="flex-1 py-2 px-3 rounded-lg bg-primary active:bg-primary/90 items-center justify-center flex-row gap-1.5 shadow-2xs"
                      accessibilityRole="button"
                      accessibilityLabel={actionCard.confirmLabel || 'Confirm'}
                    >
                      {isActionExecuting ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Check size={14} color="white" />
                          <Text className="text-xs font-bold text-primary-foreground">
                            {actionCard.confirmLabel || 'Confirm'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Action Execution Result Card */}
            {actionCard?.type === 'action_result' && (
              <View
                className={`mt-3 p-3.5 rounded-xl border shadow-2xs ${
                  actionCard.status === 'failed'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-1.5 flex-1 me-2">
                    {actionCard.status === 'failed' ? (
                      <XCircle size={16} className="text-rose-500" />
                    ) : (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    )}
                    <Text className="text-xs font-bold text-foreground">
                      {actionCard.title || (actionCard.status === 'failed' ? 'Execution Failed' : 'Action Completed')}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded-full border ${
                      actionCard.status === 'failed'
                        ? 'bg-rose-500/15 border-rose-500/40'
                        : 'bg-emerald-500/15 border-emerald-500/40'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-semibold ${
                        actionCard.status === 'failed' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {actionCard.status === 'failed' ? 'Failed' : 'Success'}
                    </Text>
                  </View>
                </View>

                {actionCard.referenceId && (
                  <View className="bg-card/80 border border-border/80 rounded-lg p-2 my-1.5 flex-row items-center justify-between">
                    <Text className="text-[11px] text-muted-foreground font-medium">Reference Code</Text>
                    <Text className="text-xs font-mono font-bold text-primary">{actionCard.referenceId}</Text>
                  </View>
                )}

                {actionCard.route && onNavigate && (
                  <Pressable
                    onPress={() => onNavigate(actionCard.route)}
                    className="mt-2 py-1.5 px-3 rounded-lg bg-card/60 border border-border flex-row items-center justify-between active:bg-secondary"
                    accessibilityRole="button"
                    accessibilityLabel="View details"
                  >
                    <Text className="text-xs font-medium text-foreground">View in App</Text>
                    <ArrowRight size={13} className="text-muted-foreground" />
                  </Pressable>
                )}
              </View>
            )}

            {/* Interactive Navigation / Action Card (when no confirmation card exists) */}
            {message.metadata?.targetRoute && !actionCard && (
              <Pressable
                onPress={() => onNavigate?.(message.metadata!.targetRoute!)}
                className="mt-3 p-3 bg-secondary/70 active:bg-secondary rounded-xl border border-border flex-row items-center justify-between shadow-2xs"
                accessibilityRole="button"
                accessibilityLabel={`Open ${message.metadata?.targetName || 'feature'}`}
              >
                <View className="flex-row items-center flex-1 me-2">
                  {getFeatureIcon(message.metadata?.category, message.metadata?.targetName)}
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-foreground">
                      {message.metadata?.targetName || 'Open Feature'}
                    </Text>
                    <Text className="text-[11px] text-muted-foreground mt-0.5">
                      Tap to view details and options
                    </Text>
                  </View>
                </View>

                <View className="w-7 h-7 rounded-full bg-primary items-center justify-center shrink-0">
                  <ArrowRight size={14} color="white" />
                </View>
              </Pressable>
            )}

            {/* Error Retry CTA */}
            {message.isError && onRetry && message.failedPrompt && (
              <View className="mt-3 pt-2.5 border-t border-border/40 flex-row items-center justify-between">
                <Text className="text-xs text-rose-500 font-medium">Request failed</Text>
                <Pressable
                  onPress={() => onRetry(message.failedPrompt!)}
                  className="bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 flex-row items-center gap-1.5 active:bg-primary/20"
                  accessibilityRole="button"
                  accessibilityLabel="Retry sending message"
                >
                  <RefreshCw size={13} className="text-primary" />
                  <Text className="text-xs font-semibold text-primary">Retry</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View className="flex-row items-center justify-between mt-1 ps-1 pe-2">
            <Text className="text-[10px] text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </Text>
            {Boolean(message.text) && (
              <Pressable
                onPress={() => handleCopy(message.text)}
                hitSlop={8}
                className="flex-row items-center gap-1 py-0.5 px-1.5 rounded-md active:bg-secondary"
                accessibilityRole="button"
                accessibilityLabel="Copy response to clipboard"
                testID={`copy-assistant-msg-${message.id}`}
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <Text className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Copied
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={12} className="text-muted-foreground" />
                    <Text className="text-[10px] text-muted-foreground">Copy</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
