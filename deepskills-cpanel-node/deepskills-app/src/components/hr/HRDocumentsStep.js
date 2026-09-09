import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { HR_DOCUMENTS, groupDocumentsByCategory, hasRequiredDocuments, mapDocumentsByType } from '../../utils/hrDocuments';

const Wrap = styled.div`
  display: grid;
  gap: 20px;
`;

const CategoryCard = styled.div`
  background: #111318;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255,255,255,0.06);
`;

const CategoryTitle = styled.h3`
  margin: 0 0 18px;
  color: #fff;
  text-transform: capitalize;
`;

const ItemGrid = styled.div`
  display: grid;
  gap: 14px;
`;

const ItemCard = styled.div`
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 18px;
  background: #0b0e14;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #fff;
`;

const Muted = styled.span`
  color: #9ca3af;
  font-size: 0.9rem;
`;

const UploadInput = styled.input`
  color: #fff;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const Button = styled.button`
  padding: 11px 16px;
  border-radius: 10px;
  border: none;
  background: ${({ $primary }) => ($primary ? '#4F8EF7' : 'rgba(255,255,255,0.08)')};
  color: #fff;
  cursor: pointer;
  font-weight: 700;
`;

const LinkInput = styled.input`
  width: 100%;
  background: #0a0a0a;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 12px;
`;

const formatBytes = (value) => {
  if (!value) return '';
  const numericValue = Number(value);
  if (numericValue < 1024) return `${numericValue} B`;
  if (numericValue < 1024 * 1024) return `${(numericValue / 1024).toFixed(1)} KB`;
  return `${(numericValue / (1024 * 1024)).toFixed(1)} MB`;
};

const HRDocumentsStep = ({
  documents,
  loading,
  onUpload,
  onRemove,
  onSubmit
}) => {
  const [portfolioLink, setPortfolioLink] = useState('');
  const [submittingDocType, setSubmittingDocType] = useState('');
  const documentMap = useMemo(() => mapDocumentsByType(documents), [documents]);
  const canSubmit = hasRequiredDocuments(documents);
  const categories = groupDocumentsByCategory();

  const handleUpload = async (config, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSubmittingDocType(config.docType);
    try {
      await onUpload(config, { file });
    } finally {
      setSubmittingDocType('');
      event.target.value = '';
    }
  };

  const handlePortfolioLink = async () => {
    const config = HR_DOCUMENTS.find((item) => item.docType === 'portfolio_link');
    if (!portfolioLink.trim()) return;
    setSubmittingDocType(config.docType);
    try {
      await onUpload(config, { linkUrl: portfolioLink.trim() });
      setPortfolioLink('');
    } finally {
      setSubmittingDocType('');
    }
  };

  return (
    <Wrap>
      {categories.map(({ category, items }) => (
        <CategoryCard key={category}>
          <CategoryTitle>{category} Documents</CategoryTitle>
          <ItemGrid>
            {items.map((item) => {
              const uploaded = documentMap[item.docType] || [];
              return (
                <ItemCard key={item.docType}>
                  <Row>
                    <Meta>
                      <strong>{item.label}</strong>
                      <Muted>
                        {item.required ? 'Required' : 'Optional'} {uploaded.length > 0 ? '• Uploaded' : item.required ? '• Missing' : ''}
                      </Muted>
                      {uploaded.map((entry) => (
                        <Muted key={entry.id}>
                          {entry.file_name || entry.link_url || 'Uploaded'} {entry.file_size ? `(${formatBytes(entry.file_size)})` : ''}
                        </Muted>
                      ))}
                    </Meta>
                    {item.accepts !== 'link' && (
                      <UploadInput
                        type="file"
                        accept={item.accepts}
                        onChange={(event) => handleUpload(item, event)}
                        disabled={loading || submittingDocType === item.docType}
                      />
                    )}
                  </Row>
                  {item.docType === 'portfolio_link' && (
                    <>
                      <LinkInput
                        placeholder="https://your-portfolio-link"
                        value={portfolioLink}
                        onChange={(event) => setPortfolioLink(event.target.value)}
                      />
                      <ActionRow>
                        <Button type="button" onClick={handlePortfolioLink} disabled={submittingDocType === item.docType}>
                          Save Link
                        </Button>
                      </ActionRow>
                    </>
                  )}
                  {uploaded.length > 0 && (
                    <ActionRow>
                      {uploaded.map((entry) => (
                        <Button key={entry.id} type="button" onClick={() => onRemove(entry.id)}>
                          Remove {entry.file_name || entry.link_url || item.label}
                        </Button>
                      ))}
                    </ActionRow>
                  )}
                </ItemCard>
              );
            })}
          </ItemGrid>
        </CategoryCard>
      ))}
      <Button type="button" $primary onClick={onSubmit} disabled={!canSubmit || loading}>
        {loading ? 'Submitting...' : 'Submit Documents →'}
      </Button>
    </Wrap>
  );
};

export default HRDocumentsStep;
