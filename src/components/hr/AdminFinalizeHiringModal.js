import React, { useState } from 'react';
import { AdminModal, FormField, AdminTextarea, AdminButton } from '../portal';

const AdminFinalizeHiringModal = ({ open, onClose, onSubmit, loading }) => {
  const [note, setNote] = useState('');
  if (!open) return null;

  return (
    <AdminModal
      isOpen={open}
      onClose={onClose}
      title="Finalize Hiring"
      subtitle="Add custom note to acceptance letter (optional)"
      maxWidth="560px"
      footer={
        <>
          <AdminButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            variant="success"
            onClick={() => onSubmit(note)}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate & Send Documents'}
          </AdminButton>
        </>
      }
    >
      <FormField label="Acceptance Letter Note (Optional)" hint="Include custom terms, reporting instructions, or welcome greetings.">
        <AdminTextarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Please report to the campus coordinator on Monday at 9:00 AM..."
          rows={5}
        />
      </FormField>
    </AdminModal>
  );
};

export default AdminFinalizeHiringModal;
