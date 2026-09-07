import React, { useState } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1050;
`;

const Drawer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: min(720px, 100%);
  max-width: 100%;
  box-sizing: border-box;
  height: 100vh;
  background: #111318;
  z-index: 1060;
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  color: #fff;
  border-left: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 600px) {
    padding: 20px 16px;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 18px 0;
`;

const Tab = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#4F8EF7' : 'rgba(255,255,255,0.1)')};
  background: ${({ $active }) => ($active ? 'rgba(79, 142, 247, 0.16)' : 'transparent')};
  color: #fff;
  cursor: pointer;
`;

const Section = styled.div`
  background: #0a0a0a;
  border-radius: 14px;
  padding: 18px;
  border: 1px solid rgba(255,255,255,0.06);
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
`;

const AdminHRDrawer = ({ open, application, onClose }) => {
  const [tab, setTab] = useState('Personal Info');
  if (!open || !application) return null;
  const { teacher, profile, documents, jd, signature, files } = application;

  return (
    <>
      <Overlay onClick={onClose} />
      <Drawer>
        <h2>{teacher?.name || profile.full_name}</h2>
        <p>{profile.specialization || teacher?.specialization || 'Specialization not set'}</p>
        <Tabs>
          {['Personal Info', 'Documents', 'JD', 'Signature', 'Hiring Files'].map((item) => (
            <Tab key={item} $active={tab === item} onClick={() => setTab(item)}>{item}</Tab>
          ))}
        </Tabs>

        {tab === 'Personal Info' && (
          <Section>
            {[
              ['CNIC', profile.cnic],
              ['Email', profile.personal_email || teacher?.email],
              ['Phone', profile.personal_phone || teacher?.phone],
              ['Current Address', profile.current_address],
              ['Permanent Address', profile.permanent_address],
              ['Years Experience', profile.years_experience],
              ['Expected Salary', profile.expected_salary],
              ['Teaching Mode', profile.teaching_mode]
            ].map(([label, value]) => (
              <Row key={label}><strong>{label}</strong><span>{value || '-'}</span></Row>
            ))}
          </Section>
        )}

        {tab === 'Documents' && (
          <Section>
            {documents.map((document) => (
              <Row key={document.id}>
                <strong>{document.doc_type}</strong>
                <a href={document.file_url || document.link_url} target="_blank" rel="noreferrer">{document.file_name || document.link_url || 'Open'}</a>
              </Row>
            ))}
          </Section>
        )}

        {tab === 'JD' && (
          <Section>
            {jd ? (
              <>
                <p><strong>{jd.position_title}</strong></p>
                <p>{jd.compensation_text}</p>
              </>
            ) : (
              <p>No JD drafted yet.</p>
            )}
          </Section>
        )}

        {tab === 'Signature' && (
          <Section>
            {signature ? (
              signature.signature_type === 'drawn' && signature.signature_data?.startsWith('data:image') ? (
                <img src={signature.signature_data} alt="Teacher signature" style={{ maxWidth: '220px', background: '#fff', padding: '8px', borderRadius: '8px' }} />
              ) : (
                <p>{signature.signature_data}</p>
              )
            ) : (
              <p>No signature submitted yet.</p>
            )}
          </Section>
        )}

        {tab === 'Hiring Files' && (
          <Section>
            {files.map((file) => (
              <Row key={file.id}>
                <strong>{file.file_type}</strong>
                <a href={file.file_url} target="_blank" rel="noreferrer">{file.file_name || 'Download'}</a>
              </Row>
            ))}
          </Section>
        )}
      </Drawer>
    </>
  );
};

export default AdminHRDrawer;
