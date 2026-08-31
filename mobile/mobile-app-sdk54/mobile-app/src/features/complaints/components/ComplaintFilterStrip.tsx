import React from 'react';
import { View, ScrollView } from 'react-native';
import { SearchBar } from '@/components/forms/SearchBar';
import { Chip } from '@/components/common/Chip';

export interface ComplaintFilterStripProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  placeholder?: string;
  className?: string;
}

export const ComplaintFilterStrip: React.FC<ComplaintFilterStripProps> = ({
  searchValue,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  placeholder = 'Search ticket #, resident, location...',
  className = '',
}) => {
  return (
    <View className={`px-4 py-2.5 bg-card/60 border-b border-border gap-2 ${className}`}>
      <SearchBar
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder={placeholder}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row gap-1.5 pe-4"
        className="pt-0.5"
      >
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            selected={selectedCategory === cat}
            onPress={() => onSelectCategory(cat)}
            className="me-1"
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default ComplaintFilterStrip;
