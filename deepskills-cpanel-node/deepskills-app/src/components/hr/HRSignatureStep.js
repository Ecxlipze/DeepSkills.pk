import React, { useState } from 'react';
import styled from 'styled-components';
import SignatureCanvas from './SignatureCanvas';

const Wrap = styled.div`
  background: #111318;
  border-radius: 16px;
  padding: 28px;
  border: 1px solid rgba(255,255,255,0.06);
  color: #fff;
`;

const Tabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
`;

const Tab = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#4F8EF7' : 'rgba(255,255,255,0.1)')};
  background: ${({ $active }) => ($active ? 'rgba(79, 142, 247, 0.14)' : 'transparent')};
  color: #fff;
  cursor: pointer;
`;

const Input = styled.input`
  width: 100%;
  max-width: 400px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
  color: #fff;
`;

const Preview = styled.div`
  margin-top: 16px;
  color: #fff;
  font-size: 2rem;
  font-family: 'Dancing Script', cursive;
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 24px;
`;

const Button = styled.button`
  background: #4F8EF7;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
`;

const HRSignatureStep = ({ teacherName, loading, onSubmit }) => {
  const [activeTab, setActiveTab] = useState('draw');
  const [drawnSignature, setDrawnSignature] = useState('');
  const [typedSignature, setTypedSignature] = useState('');
  const date = new Date().toISOString().slice(0, 10);

  const handleSubmit = async () => {
    if (activeTab === 'draw' && drawnSignature) {
      await onSubmit({
        signatureType: 'drawn',
        signatureData: drawnSignature
      });
      return;
    }

    if (activeTab === 'type' && typedSignature.trim() === teacherName.trim()) {
      await onSubmit({
        signatureType: 'typed',
        signatureData: typedSignature.trim()
      });
    }
  };

  const isValid = activeTab === 'draw'
    ? Boolean(drawnSignature)
    : Boolean(typedSignature.trim()) && typedSignature.trim() === teacherName.trim();

  return (
    <Wrap>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');`}
      </style>
      <h2>Sign Your Job Description</h2>
      <p>By signing, you confirm that you have read and agree to the terms in your Job Description.</p>
      <Tabs>
        <Tab type="button" $active={activeTab === 'draw'} onClick={() => setActiveTab('draw')}>Draw Signature</Tab>
        <Tab type="button" $active={activeTab === 'type'} onClick={() => setActiveTab('type')}>Type Signature</Tab>
      </Tabs>

      {activeTab === 'draw' ? (
        <>
          <p>Sign in the box below using your mouse or finger.</p>
          <SignatureCanvas onChange={setDrawnSignature} />
        </>
      ) : (
        <>
          <Input
            placeholder="Type your full name"
            value={typedSignature}
            onChange={(event) => setTypedSignature(event.target.value)}
          />
          <Preview>{typedSignature || teacherName}</Preview>
          {typedSignature.trim() && typedSignature.trim() !== teacherName.trim() && (
            <p>Your typed signature must match your full name exactly.</p>
          )}
        </>
      )}

      <FooterRow>
        <span>Date: {date}</span>
        <Button type="button" onClick={handleSubmit} disabled={!isValid || loading}>
          {loading ? 'Submitting...' : 'Confirm & Submit Signature'}
        </Button>
      </FooterRow>
    </Wrap>
  );
};

export default HRSignatureStep;
