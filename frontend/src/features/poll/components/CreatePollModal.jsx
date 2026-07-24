import React, { useState } from 'react';
import { 
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, 
  CButton, CForm, CFormInput, CFormTextarea, CFormLabel, CFormSelect 
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilTrash } from '@coreui/icons';
import dayjs from 'dayjs';

const CreatePollModal = ({ visible, setVisible, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endDate, setEndDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DDTHH:mm'));
  const [visibility, setVisibility] = useState('Everyone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOpts = [...options];
      newOpts.splice(index, 1);
      setOptions(newOpts);
    }
  };

  const handleOptionChange = (index, val) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (question.trim().length < 5) return setError('Question must be at least 5 characters');
    
    for (let i = 0; i < options.length; i++) {
      if (!options[i].trim()) {
        return setError(`Option ${i + 1} cannot be empty`);
      }
    }

    const filledOptions = options.map(o => o.trim());
    if (filledOptions.length < 2) return setError('Please provide at least 2 valid options');
    if (filledOptions.length > 5) return setError('You can only have up to 5 options');
    
    const uniqueOpts = new Set(filledOptions.map(o => o.toLowerCase()));
    if (uniqueOpts.size !== filledOptions.length) return setError('Options must be unique');
    
    if (dayjs(endDate).isBefore(dayjs())) return setError('End date must be in the future');

    setLoading(true);
    try {
      await onSubmit({
        question,
        description,
        visibility,
        options: filledOptions.map(text => ({ text })),
        endDate
      });
      // Reset form
      setQuestion('');
      setDescription('');
      setVisibility('Everyone');
      setOptions(['', '']);
      setEndDate(dayjs().add(7, 'day').format('YYYY-MM-DDTHH:mm'));
      setVisible(false);
    } catch (err) {
      setError(err?.message || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CModal visible={visible} onClose={() => setVisible(false)} className="create-poll-modal">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader onClose={() => setVisible(false)}>
          <CModalTitle>Create New Poll</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          
          <div className="mb-3">
            <CFormLabel>Poll Question *</CFormLabel>
            <CFormInput 
              placeholder="e.g., Should we install CCTV near the clubhouse?" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="mb-3">
            <CFormLabel>Description (Optional)</CFormLabel>
            <CFormTextarea 
              rows={2}
              placeholder="Provide more context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div className="mb-3">
            <CFormLabel>Visibility *</CFormLabel>
            <CFormSelect 
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              required
            >
              <option value="Everyone">Everyone</option>
              <option value="Community Admin Only">Community Admin Only</option>
              <option value="Residents Only">Residents Only</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <CFormLabel>Options (2 - 5) *</CFormLabel>
            {options.map((opt, i) => (
              <div key={i} className="option-input-group">
                <CFormInput
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  required
                />
                {options.length > 2 && (
                  <button type="button" className="remove-btn" onClick={() => handleRemoveOption(i)}>
                    <CIcon icon={cilTrash} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <button type="button" className="add-option-btn mt-2" onClick={handleAddOption}>
                <CIcon icon={cilPlus} /> Add Option
              </button>
            )}
          </div>

          <div className="mb-3">
            <CFormLabel>End Date & Time *</CFormLabel>
            <CFormInput 
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setVisible(false)}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Poll'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
};

export default CreatePollModal;
