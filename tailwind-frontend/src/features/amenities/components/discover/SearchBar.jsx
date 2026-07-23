import React, { memo } from 'react';
import { CInputGroup, CInputGroupText, CFormInput } from '@coreui/react';

const SearchBar = memo(({ value, onChange, placeholder = "Search amenities by name or location..." }) => {
  return (
    <CInputGroup className="mb-4 shadow-sm" size="lg">
      <CInputGroupText className="bg-white border-end-0">
        <i className="fa-solid fa-search text-muted"></i>
      </CInputGroupText>
      <CFormInput 
        type="text" 
        placeholder={placeholder} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-start-0 ps-0"
        aria-label={placeholder}
      />
    </CInputGroup>
  );
});

export default SearchBar;
