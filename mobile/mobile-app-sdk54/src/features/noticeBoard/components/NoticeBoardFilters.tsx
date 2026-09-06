import React from 'react';
import {
  NoticeManagementFilterBar,
  NoticeManagementFilterBarProps,
  SORT_OPTIONS,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  NoticeFiltersState,
  NoticeSortState,
} from './NoticeManagementFilterBar';

export {
  SORT_OPTIONS,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  NoticeFiltersState,
  NoticeSortState,
  NoticeManagementFilterBarProps,
};

export const NoticeBoardFilters: React.FC<NoticeManagementFilterBarProps> = (props) => {
  return <NoticeManagementFilterBar {...props} />;
};

export default NoticeBoardFilters;
