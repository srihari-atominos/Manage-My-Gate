import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react-native';
import { Inbox } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

export interface PaginatedListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  pagination: { currentPage: number; totalPages: number; totalRecords: number; limit: number };
  onLoadMore: () => void;
  onRefresh: () => void;
  loading: boolean;
  refreshing?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  ListHeaderComponent?: React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  contentContainerClassName?: string;
}

const getEmptyIconComponent = (iconName?: string): LucideIcons.LucideIcon => {
  if (iconName && iconName in LucideIcons) {
    const IconComp = (LucideIcons as Record<string, any>)[iconName];
    if (typeof IconComp === 'function' || typeof IconComp === 'object') {
      return IconComp as LucideIcons.LucideIcon;
    }
  }
  return Inbox;
};

export function PaginatedList<T>({
  data,
  renderItem: renderItemProp,
  pagination,
  onLoadMore,
  onRefresh,
  loading,
  refreshing = false,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptySubtitle = '',
  ListHeaderComponent,
  keyExtractor,
  contentContainerClassName,
}: PaginatedListProps<T>) {
  const onEndReachedCalledDuringMomentum = React.useRef(false);

  React.useEffect(() => {
    if (!loading) {
      onEndReachedCalledDuringMomentum.current = false;
    }
  }, [loading, pagination.currentPage]);

  const handleEndReached = () => {
    if (
      !onEndReachedCalledDuringMomentum.current &&
      !loading &&
      pagination.currentPage < pagination.totalPages
    ) {
      onEndReachedCalledDuringMomentum.current = true;
      onLoadMore();
    }
  };

  const handleMomentumScrollBegin = () => {
    onEndReachedCalledDuringMomentum.current = false;
  };

  const defaultKeyExtractor = (item: T, index: number): string => {
    if (item && typeof item === 'object') {
      const itemRecord = item as Record<string, any>;
      if (itemRecord._id != null) return String(itemRecord._id);
      if (itemRecord.id != null) return String(itemRecord.id);
    }
    return String(index);
  };

  const renderFooter = () => {
    if (loading && data.length > 0 && pagination.currentPage < pagination.totalPages) {
      return (
        <View className="py-4 items-center justify-center">
          <ActivityIndicator size="small" className="text-primary" />
        </View>
      );
    }
    return null;
  };

  const renderEmptyOrSkeleton = () => {
    if (loading && data.length === 0) {
      return (
        <View className="p-4">
          <Skeleton variant="listItem" count={5} />
        </View>
      );
    }

    if (!loading && data.length === 0) {
      const IconComponent = getEmptyIconComponent(emptyIcon);
      return (
        <View className="flex-1 justify-center items-center p-6">
          <Icon as={IconComponent} size={48} className="text-muted-foreground" />
          <Text variant="large" className="text-center mt-4 text-muted-foreground">
            {emptyTitle}
          </Text>
          {emptySubtitle ? (
            <Text variant="muted" className="text-center mt-2 text-muted-foreground">
              {emptySubtitle}
            </Text>
          ) : null}
        </View>
      );
    }

    return null;
  };

  return (
    <FlatList
      className="flex-1"
      data={data}
      renderItem={({ item, index }) => renderItemProp(item, index) as React.ReactElement | null}
      keyExtractor={keyExtractor || defaultKeyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      onMomentumScrollBegin={handleMomentumScrollBegin}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={ListHeaderComponent as React.ReactElement | undefined}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyOrSkeleton}
      contentContainerClassName={cn(
        data.length === 0 && 'flex-grow justify-center',
        contentContainerClassName
      )}
    />
  );
}

export default PaginatedList;
