import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { normalizeBulletText } from '../../utils/hrJdBuilder';

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
  width: min(920px, 100%);
  max-height: 92vh;
  overflow: auto;
  background: #111318;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 24px;
  color: #fff;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Input = styled.input`
  background: #0a0a0a;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
`;

const Select = styled.select`
  background: #0a0a0a;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
`;

const Textarea = styled.textarea`
  background: #0a0a0a;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
  min-height: 140px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
`;

const Button = styled.button`
  border: 1px solid ${({ $primary }) => ($primary ? '#4F8EF7' : 'rgba(255,255,255,0.12)')};
  background: ${({ $primary }) => ($primary ? '#4F8EF7' : 'transparent')};
  color: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
`;

const AdminJDComposer = ({
  open,
  templates,
  initialDraft,
  initialTemplateId,
  onClose,
  onTemplateChange,
  onSend,
  loading
}) => {
  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  if (!open || !draft) return null;

  return (
    <Overlay>
      <Modal>
        <h2>Create JD Draft</h2>
        <Grid>
          <Field>
            Template
            <Select value={initialTemplateId || ''} onChange={(event) => onTemplateChange(event.target.value)}>
              <option value="">Select Template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.specialization} - {template.employment_type}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            Employment Type
            <Select value={draft.employmentType} onChange={(event) => setDraft((current) => ({ ...current, employmentType: event.target.value }))}>
              <option>Full-time</option>
              <option>Part-time</option>
            </Select>
          </Field>
          <Field>
            Position Title
            <Input value={draft.positionTitle} onChange={(event) => setDraft((current) => ({ ...current, positionTitle: event.target.value }))} />
          </Field>
          <Field>
            Working Hours
            <Input value={draft.workingHours} onChange={(event) => setDraft((current) => ({ ...current, workingHours: event.target.value }))} />
          </Field>
          <Field>
            Department
            <Input value={draft.department} onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))} />
          </Field>
          <Field>
            Reporting To
            <Input value={draft.reportingTo} onChange={(event) => setDraft((current) => ({ ...current, reportingTo: event.target.value }))} />
          </Field>
          <Field style={{ gridColumn: '1 / -1' }}>
            Responsibilities
            <Textarea value={normalizeBulletText(draft.responsibilities)} onChange={(event) => setDraft((current) => ({ ...current, responsibilities: event.target.value.split('\n').filter(Boolean) }))} />
          </Field>
          <Field style={{ gridColumn: '1 / -1' }}>
            Requirements
            <Textarea value={normalizeBulletText(draft.requirements)} onChange={(event) => setDraft((current) => ({ ...current, requirements: event.target.value.split('\n').filter(Boolean) }))} />
          </Field>
          <Field style={{ gridColumn: '1 / -1' }}>
            What We Offer
            <Textarea value={normalizeBulletText(draft.whatWeOffer)} onChange={(event) => setDraft((current) => ({ ...current, whatWeOffer: event.target.value.split('\n').filter(Boolean) }))} />
          </Field>
        </Grid>
        <Actions>
          <Button type="button" onClick={onClose}>Close</Button>
          <Button type="button" $primary onClick={() => onSend(draft)} disabled={loading}>Send JD to Teacher</Button>
        </Actions>
      </Modal>
    </Overlay>
  );
};

export default AdminJDComposer;
