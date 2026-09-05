import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { HelpCircle, CheckCircle2 } from 'lucide-react-native';
import { DailyQuestion } from '../types/communityPulseTypes';

export interface DailyQuestionCardProps {
  question: DailyQuestion | null;
  onVote: (optionId: string) => void;
}

export const DailyQuestionCard = ({ question, onVote }: DailyQuestionCardProps) => {
  if (!question) return null;

  const hasVoted = Boolean(question.userAnswerId);

  return (
    <View className="bg-card border border-border rounded-2xl p-4 gap-3 shadow-xs">
      {/* Header Badge */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 items-center justify-center">
            <HelpCircle size={16} className="text-amber-500" />
          </View>
          <View>
            <Text className="text-xs font-bold text-muted-foreground uppercase">Today's Question</Text>
            <Text className="text-sm font-bold text-foreground">{question.question}</Text>
          </View>
        </View>
      </View>

      {/* Options List */}
      <View className="gap-2 pt-1">
        {question.options.map((opt) => {
          const isMyAnswer = question.userAnswerId === opt.id;
          return (
            <Pressable
              key={opt.id}
              disabled={hasVoted}
              onPress={() => onVote(opt.id)}
              className={`relative overflow-hidden rounded-xl border p-3 flex-row items-center justify-between transition-all ${
                isMyAnswer
                  ? 'bg-primary/10 border-primary shadow-xs'
                  : hasVoted
                  ? 'bg-muted/20 border-border'
                  : 'bg-card border-border active:bg-muted/40 shadow-xs'
              }`}
            >
              {/* Percentage Progress Bar background overlay if voted */}
              {hasVoted ? (
                <View
                  style={{ width: `${opt.percentage}%` }}
                  className="absolute top-0 bottom-0 left-0 bg-primary/15 rounded-xl"
                />
              ) : null}

              <View className="flex-row items-center gap-2 relative z-10 flex-1 me-2">
                <Text className="text-xs font-semibold text-foreground">{opt.label}</Text>
                {isMyAnswer && <CheckCircle2 size={14} className="text-primary" />}
              </View>

              {hasVoted ? (
                <Text className="text-xs font-mono font-bold text-foreground relative z-10">
                  {opt.percentage}%
                </Text>
              ) : (
                <Text className="text-xs font-semibold text-primary">Vote</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Footer Stats */}
      <Text className="text-[11px] text-muted-foreground text-center pt-0.5">
        {question.totalVotes} residents answered today
      </Text>
    </View>
  );
};

export default DailyQuestionCard;
