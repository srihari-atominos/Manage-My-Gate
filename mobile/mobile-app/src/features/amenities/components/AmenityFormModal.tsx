import React from 'react';
import {
  AmenityCreationWizard,
  AmenityCreationWizardProps,
} from './creation-wizard/AmenityCreationWizard';

export type AmenityFormModalProps = AmenityCreationWizardProps;

/**
 * AmenityFormModal (Modernized Adapter)
 * Delegates directly to the modular AmenityCreationWizard modeled after Visitor Management.
 */
export const AmenityFormModal: React.FC<AmenityFormModalProps> = (props) => {
  return <AmenityCreationWizard {...props} />;
};

export default AmenityFormModal;
