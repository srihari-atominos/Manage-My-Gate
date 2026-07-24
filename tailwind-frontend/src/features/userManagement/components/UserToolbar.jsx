import React from 'react';
import { Input } from 'src/components/ui/input';
import MultiSelectFilter from 'src/components/common/MultiSelectFilter';

const UserToolbar = ({
  search,
  setSearch,
  selectedRoles,
  handleRoleToggle,
  setSelectedRoles,
  statusFilter,
  handleStatusToggle,
  ROLES,
  STATUS_OPTIONS,
}) => {
  return (
    <>
      {/* Search Bar - Responsive width */}
      <div className="w-full md:w-80 max-w-lg">
        <Input
          id="um-search-input"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white"
        />
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Role Filter */}
        <MultiSelectFilter
          label="Role"
          options={ROLES}
          selectedValues={selectedRoles}
          onToggle={handleRoleToggle}
          onClear={() => setSelectedRoles([])}
        />

        {/* Status Filter */}
        <MultiSelectFilter
          label="Status"
          options={STATUS_OPTIONS}
          selectedValues={statusFilter}
          onToggle={handleStatusToggle}
        />
      </div>
    </>
  );
};

export default UserToolbar;
