import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) => {
  return (
    <View className={cn('flex-row items-center justify-center space-x-4', className)}>
      <Pressable
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'p-2 rounded-full',
          currentPage === 1 ? 'opacity-50' : 'bg-slate-100 active:bg-slate-200 dark:bg-slate-800'
        )}
      >
        <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
      </Pressable>
      
      <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Page {currentPage} of {totalPages}
      </Text>
      
      <Pressable
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'p-2 rounded-full',
          currentPage === totalPages ? 'opacity-50' : 'bg-slate-100 active:bg-slate-200 dark:bg-slate-800'
        )}
      >
        <ChevronRight size={20} className="text-slate-700 dark:text-slate-300" />
      </Pressable>
    </View>
  );
};
