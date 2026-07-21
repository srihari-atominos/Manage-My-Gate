import React, { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';

export const ScopeSelectorTable = memo(({
  rows,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  searchPlaceholder,
  search,
  onSearchChange,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  
  const currentSearch = onSearchChange !== undefined ? search : localSearch;

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  const filtered = useMemo(
    () => {
      if (onSearchChange !== undefined) return rows;
      return rows.filter(r => (r.label || '').toLowerCase().includes(localSearch.toLowerCase()));
    },
    [rows, localSearch, onSearchChange]
  );
  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.includes(r._id));

  return (
    <div className="scope-table-wrap">
      <div className="scope-table-header">
        <div className="position-relative flex-fill">
          <i className="fa-solid fa-magnifying-glass scope-table-search-icon" />
          <input
            type="text"
            className="form-control form-control-sm ps-4 rounded-2 fs-7"
            value={currentSearch}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>
        {selectedIds.length > 0 && (
          <span className="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 small">
            {selectedIds.length} selected
          </span>
        )}
        <button
          type="button"
          className={`btn btn-sm ${allSelected ? 'btn-outline-danger' : 'btn-outline-secondary'} rounded-2 px-2 py-1 small`}
          onClick={() => allSelected ? onDeselectAll(filtered.map(r => r._id)) : onSelectAll(filtered.map(r => r._id))}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="scope-table-body">
        {filtered.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center p-4 text-muted gap-2">
            <i className="fa-solid fa-magnifying-glass fs-5" />
            <span className="small">No results for "{currentSearch}"</span>
          </div>
        ) : filtered.map((row, idx) => {
          const isChecked = selectedIds.includes(row._id);
          return (
            <label
              key={row._id || idx}
              className={`d-flex align-items-center gap-2 p-2 px-3 border-bottom cursor-pointer ${isChecked ? 'bg-primary-subtle' : 'bg-white'}`}
            >
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={isChecked}
                onChange={() => onToggle(row._id)}
              />
              <div className="flex-fill">
                <div className="fw-semibold small text-dark">{row.label}</div>
                {row.sub && <div className="text-muted extra-small">{row.sub}</div>}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
});

ScopeSelectorTable.displayName = 'ScopeSelectorTable';

ScopeSelectorTable.propTypes = {
  rows: PropTypes.array.isRequired,
  selectedIds: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
  onSelectAll: PropTypes.func.isRequired,
  onDeselectAll: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string,
  search: PropTypes.string,
  onSearchChange: PropTypes.func,
};

export default ScopeSelectorTable;
