import React, { useState } from 'react';
import styled from 'styled-components';

const Card = styled.div`
  background: #111318;
  border-radius: 16px;
  padding: 28px;
  border: 1px solid rgba(255,255,255,0.06);
  color: #fff;
`;

const Waiting = styled(Card)`
  text-align: center;
`;

const Title = styled.h2`
  margin: 0 0 12px;
`;

const Section = styled.div`
  margin-top: 18px;
`;

const List = styled.ul`
  margin: 10px 0 0 18px;
  color: #dbe2ee;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
`;

const Button = styled.button`
  background: ${({ $secondary }) => ($secondary ? 'transparent' : '#2ecc71')};
  color: #fff;
  border: 1px solid ${({ $secondary }) => ($secondary ? 'rgba(255,255,255,0.16)' : '#2ecc71')};
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 700;
`;

const Textarea = styled.textarea`
  width: 100%;
  background: #0a0a0a;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 14px;
  min-height: 100px;
`;

const HRJDReviewStep = ({ jd, loading, onApprove, onRequestChanges }) => {
  const [changeRequest, setChangeRequest] = useState('');
  const [showRequestBox, setShowRequestBox] = useState(false);

  if (!jd || !jd.is_sent_to_teacher) {
    return (
      <Waiting>
        <Title>Your profile is being reviewed</Title>
        <p>Our team is preparing your personalized Job Description based on your submitted profile and documents.</p>
        <p>You&apos;ll see it here once it is ready.</p>
        {jd?.teacher_status === 'changes_requested' && <p>Change request submitted. We&apos;ll send you an updated draft soon.</p>}
      </Waiting>
    );
  }

  return (
    <Card>
      <Title>Job Description</Title>
      <p><strong>Position:</strong> {jd.position_title}</p>
      <p><strong>Department:</strong> {jd.department}</p>
      <p><strong>Reporting To:</strong> {jd.reporting_to}</p>
      <p><strong>Employment Type:</strong> {jd.employment_type}</p>
      <p><strong>Location:</strong> {jd.location}</p>
      <p><strong>Working Hours:</strong> {jd.working_hours || 'To be shared by administration'}</p>
      <p><strong>Compensation:</strong> {jd.compensation_text}</p>

      <Section>
        <h3>Responsibilities</h3>
        <List>{(jd.responsibilities || []).map((item, index) => <li key={index}>{item}</li>)}</List>
      </Section>
      <Section>
        <h3>Requirements</h3>
        <List>{(jd.requirements || []).map((item, index) => <li key={index}>{item}</li>)}</List>
      </Section>
      <Section>
        <h3>What We Offer</h3>
        <List>{(jd.what_we_offer || []).map((item, index) => <li key={index}>{item}</li>)}</List>
      </Section>

      {showRequestBox && (
        <Textarea
          placeholder="Describe what you'd like changed"
          value={changeRequest}
          onChange={(event) => setChangeRequest(event.target.value)}
        />
      )}

      <ActionRow>
        <Button type="button" onClick={onApprove} disabled={loading}>Approve JD</Button>
        {!showRequestBox ? (
          <Button type="button" $secondary onClick={() => setShowRequestBox(true)} disabled={loading}>Request Changes</Button>
        ) : (
          <Button type="button" $secondary onClick={() => onRequestChanges(changeRequest)} disabled={!changeRequest.trim() || loading}>
            Submit Change Request
          </Button>
        )}
      </ActionRow>
    </Card>
  );
};

export default HRJDReviewStep;
