import React, { useState } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
`;

const Modal = styled.div`
  width: min(620px, 100%);
  background: #111318;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 24px;
  color: #fff;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 150px;
  background: #0a0a0a;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 12px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
`;

const Button = styled.button`
  border: 1px solid ${({ $primary }) => ($primary ? '#2ecc71' : 'rgba(255,255,255,0.12)')};
  background: ${({ $primary }) => ($primary ? '#2ecc71' : 'transparent')};
  color: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
`;

const AdminFinalizeHiringModal = ({ open, onClose, onSubmit, loading }) => {
  const [note, setNote] = useState('');
  if (!open) return null;

  return (
    <Overlay>
      <Modal>
        <h2>Finalize Hiring</h2>
        <p>Add custom note to acceptance letter (optional)</p>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
        <Actions>
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" $primary onClick={() => onSubmit(note)} disabled={loading}>
            {loading ? 'Generating...' : 'Generate & Send Documents'}
          </Button>
        </Actions>
      </Modal>
    </Overlay>
  );
};

export default AdminFinalizeHiringModal;
