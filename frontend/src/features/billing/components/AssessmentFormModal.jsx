import React, { memo } from 'react';
import PropTypes from 'prop-types';
import AssessmentFormModalInner from './AssessmentFormModalInner.jsx';

/**
 * Outer guard — separates visibility from hook calls.
 * Rules of Hooks: hooks cannot be called conditionally.
 * The inner component is only mounted when visible=true, so its state
 * is automatically reset every time the modal is closed and reopened.
 */
export const AssessmentFormModal = memo(({ visible, onClose, onSuccess, assessment }) => {
  if (!visible) return null;

  return (
    <AssessmentFormModalInner
      onClose={onClose}
      onSuccess={onSuccess}
      assessment={assessment}
    />
  );
});

AssessmentFormModal.displayName = 'AssessmentFormModal';

AssessmentFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  assessment: PropTypes.object,
};

AssessmentFormModal.defaultProps = {
  onSuccess: null,
  assessment: null,
};

export default AssessmentFormModal;
