import React from 'react';
import PropTypes from 'prop-types';
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';

export const SampleList = ({ items, onEdit, onDelete }) => {
  const getBadge = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'pending':
      default:
        return 'warning';
    }
  };

  if (!items || items.length === 0) {
    return <div className="text-center py-4 text-muted">No sample records found. Add one to get started!</div>;
  }

  return (
    <CTable align="middle" className="mb-0 border" hover responsive>
      <CTableHead className="text-nowrap" color="light">
        <CTableRow>
          <CTableHeaderCell>Title</CTableHeaderCell>
          <CTableHeaderCell>Description</CTableHeaderCell>
          <CTableHeaderCell>Status</CTableHeaderCell>
          <CTableHeaderCell>Created At</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {items.map((item) => (
          <CTableRow key={item._id}>
            <CTableDataCell className="fw-semibold">
              {item.title}
            </CTableDataCell>
            <CTableDataCell>
              {item.description || <span className="text-muted fs-7 italic">No description</span>}
            </CTableDataCell>
            <CTableDataCell>
              <CBadge color={getBadge(item.status)}>{item.status}</CBadge>
            </CTableDataCell>
            <CTableDataCell>
              {new Date(item.createdAt).toLocaleDateString()}
            </CTableDataCell>
            <CTableDataCell className="text-center">
              <CButton
                color="info"
                variant="outline"
                size="sm"
                className="me-2"
                onClick={() => onEdit(item)}
              >
                <CIcon icon={cilPencil} />
              </CButton>
              <CButton
                color="danger"
                variant="outline"
                size="sm"
                onClick={() => onDelete(item._id)}
              >
                <CIcon icon={cilTrash} />
              </CButton>
            </CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  );
};

SampleList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      status: PropTypes.string,
      createdAt: PropTypes.string.isRequired,
    })
  ).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default SampleList;
