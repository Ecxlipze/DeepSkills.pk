import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import {
  FaFilePdf,
  FaFileImage,
  FaFileWord,
  FaFileArchive,
  FaFileAlt,
  FaLink,
  FaTrash,
  FaExternalLinkAlt,
  FaUpload,
  FaPlus,
  FaCheckCircle
} from 'react-icons/fa';
import {
  HR_DOCUMENTS,
  groupDocumentsByCategory,
  hasRequiredDocuments,
  mapDocumentsByType,
  validateHrFile,
  validateHrLink
} from '../../utils/hrDocuments';

const Wrap = styled.div`
  display: grid;
  gap: 20px;
`;

const CategoryCard = styled.div`
  background: #111318;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const CategoryTitle = styled.h3`
  margin: 0 0 18px;
  color: #fff;
  text-transform: capitalize;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
`;

const ItemGrid = styled.div`
  display: grid;
  gap: 16px;
`;

const ItemCard = styled.div`
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 18px;
  background: #0b0e14;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    color: #fff;
    font-size: 0.98rem;
  }
`;

const Badges = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
`;

const Badge = styled.span`
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${p => p.$variant === 'required' ? 'rgba(239, 68, 68, 0.15)' : p.$variant === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${p => p.$variant === 'required' ? '#fca5a5' : p.$variant === 'success' ? '#6ee7b7' : '#94a3b8'};
  border: 1px solid ${p => p.$variant === 'required' ? 'rgba(239, 68, 68, 0.3)' : p.$variant === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.12)'};
`;

const Hint = styled.div`
  font-size: 0.78rem;
  color: #94a3b8;
  line-height: 1.4;
`;

const UploadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const FileInputLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.$disabled ? 0.6 : 1};
  transition: all 0.2s;

  &:hover {
    background: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.12)'};
    border-color: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.25)'};
  }

  input {
    display: none;
  }
`;

const LinkInputWrap = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
  flex-wrap: wrap;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const LinkInput = styled.input`
  flex: 1;
  min-width: 240px;
  background: #0a0a0a;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.88rem;

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }
`;

const Button = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: ${({ $primary }) => ($primary ? '#4F8EF7' : 'rgba(255,255,255,0.08)')};
  color: #fff;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.disabled ? 0.6 : 1};
  font-weight: 700;
  font-size: 0.86rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${({ $primary }) => ($primary ? '#3b82f6' : 'rgba(255,255,255,0.14)')};
  }
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  flex-wrap: wrap;

  .file-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;

    .icon {
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    .file-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      .name {
        color: #f1f5f9;
        font-size: 0.86rem;
        font-weight: 600;
        word-break: break-all;
      }

      .name-link {
        color: #38bdf8;
        font-size: 0.86rem;
        font-weight: 600;
        word-break: break-all;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;

        &:hover {
          text-decoration: underline;
        }
      }

      .size {
        font-size: 0.74rem;
        color: #94a3b8;
      }
    }
  }

  .remove-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.25);
      color: #fff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const formatBytes = (value) => {
  if (!value) return '';
  const numericValue = Number(value);
  if (isNaN(numericValue) || numericValue === 0) return '';
  if (numericValue < 1024) return `${numericValue} B`;
  if (numericValue < 1024 * 1024) return `${(numericValue / 1024).toFixed(1)} KB`;
  return `${(numericValue / (1024 * 1024)).toFixed(1)} MB`;
};

const renderDocIcon = (entry) => {
  if (entry.link_url) {
    return <FaLink style={{ color: '#a78bfa' }} className="icon" />;
  }
  const name = (entry.file_name || '').toLowerCase();
  const mime = (entry.mime_type || '').toLowerCase();
  if (name.endsWith('.pdf') || mime.includes('pdf')) {
    return <FaFilePdf style={{ color: '#f87171' }} className="icon" />;
  }
  if (name.match(/\.(png|jpg|jpeg|webp)$/i) || mime.includes('image')) {
    return <FaFileImage style={{ color: '#38bdf8' }} className="icon" />;
  }
  if (name.match(/\.(docx|doc)$/i) || mime.includes('word')) {
    return <FaFileWord style={{ color: '#60a5fa' }} className="icon" />;
  }
  if (name.endsWith('.zip') || mime.includes('zip')) {
    return <FaFileArchive style={{ color: '#f59e0b' }} className="icon" />;
  }
  return <FaFileAlt style={{ color: '#94a3b8' }} className="icon" />;
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
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    for (const file of selectedFiles) {
      const result = validateHrFile(file, { isPhotoOnly: config.preview === 'image' });
      if (!result.valid) {
        toast.error(result.error);
        event.target.value = '';
        return;
      }
    }

    setSubmittingDocType(config.docType);
    try {
      if (selectedFiles.length === 1) {
        await onUpload(config, { file: selectedFiles[0] });
      } else {
        await onUpload(config, { files: selectedFiles });
      }
    } finally {
      setSubmittingDocType('');
      event.target.value = '';
    }
  };

  const handlePortfolioLink = async (config) => {
    const raw = portfolioLink.trim();
    if (!raw) return;

    const entries = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!entries.length) return;

    const validUrls = [];
    for (const entry of entries) {
      const res = validateHrLink(entry);
      if (!res.valid) {
        toast.error(`${res.error} ("${entry}")`);
        return;
      }
      validUrls.push(res.normalizedUrl);
    }

    setSubmittingDocType(config.docType);
    try {
      if (validUrls.length === 1) {
        await onUpload(config, { linkUrl: validUrls[0] });
      } else {
        await onUpload(config, { linkUrls: validUrls });
      }
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
              const isUploading = submittingDocType === item.docType;

              return (
                <ItemCard key={item.docType}>
                  <CardHeader>
                    <Meta>
                      <strong>{item.label}</strong>
                      <Badges>
                        <Badge $variant={item.required ? 'required' : 'optional'}>
                          {item.required ? 'Required' : 'Optional'}
                        </Badge>
                        {item.multiple && (
                          <Badge>
                            {item.accepts === 'link' ? 'Multiple Links Allowed' : 'Multiple Files Allowed'}
                          </Badge>
                        )}
                        {uploaded.length > 0 ? (
                          <Badge $variant="success">
                            <FaCheckCircle size={10} /> {uploaded.length} {uploaded.length === 1 ? 'Uploaded' : 'Files Uploaded'}
                          </Badge>
                        ) : item.required ? (
                          <Badge $variant="required">Missing</Badge>
                        ) : null}
                      </Badges>
                    </Meta>
                    <Hint>
                      {item.accepts === 'link'
                        ? 'Add one or multiple links (e.g., GitHub, Behance, Drive, or personal portfolio)'
                        : item.preview === 'image'
                        ? 'Max 10 MB • JPG, PNG, WebP only'
                        : 'Max 10 MB per file • Images, PDF, DOCX, ZIP only'}
                    </Hint>
                  </CardHeader>

                  {/* Render uploaded items list if any exist */}
                  {uploaded.length > 0 && (
                    <FileList>
                      {uploaded.map((entry) => (
                        <FileItem key={entry.id}>
                          <div className="file-left">
                            {renderDocIcon(entry)}
                            <div className="file-details">
                              {entry.link_url ? (
                                <a
                                  href={entry.link_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="name-link"
                                >
                                  {entry.link_url} <FaExternalLinkAlt size={10} />
                                </a>
                              ) : entry.file_url ? (
                                <a
                                  href={entry.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="name-link"
                                >
                                  {entry.file_name || 'Uploaded File'} <FaExternalLinkAlt size={10} />
                                </a>
                              ) : (
                                <span className="name">{entry.file_name || 'Uploaded Document'}</span>
                              )}
                              {entry.file_size && (
                                <span className="size">{formatBytes(entry.file_size)}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="remove-btn"
                            disabled={loading || isUploading}
                            onClick={() => onRemove(entry.id)}
                          >
                            <FaTrash size={11} /> Remove
                          </button>
                        </FileItem>
                      ))}
                    </FileList>
                  )}

                  {/* Upload controls */}
                  {item.accepts !== 'link' && (
                    <UploadRow>
                      <FileInputLabel $disabled={loading || isUploading}>
                        <FaUpload size={12} />
                        <span>
                          {isUploading
                            ? 'Uploading...'
                            : uploaded.length > 0 && item.multiple
                            ? '+ Upload More Files'
                            : uploaded.length > 0
                            ? 'Replace File'
                            : item.multiple
                            ? 'Choose Files'
                            : 'Choose File'}
                        </span>
                        <input
                          type="file"
                          multiple={Boolean(item.multiple)}
                          accept={item.accepts}
                          disabled={loading || isUploading}
                          onChange={(event) => handleUpload(item, event)}
                        />
                      </FileInputLabel>
                    </UploadRow>
                  )}

                  {/* Link input controls */}
                  {item.accepts === 'link' && (
                    <LinkInputWrap>
                      <LinkInput
                        type="url"
                        placeholder="https://your-portfolio-or-work-sample.com (separate multiple with commas)"
                        value={portfolioLink}
                        disabled={loading || isUploading}
                        onChange={(event) => setPortfolioLink(event.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePortfolioLink(item);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        disabled={loading || isUploading || !portfolioLink.trim()}
                        onClick={() => handlePortfolioLink(item)}
                      >
                        <FaPlus size={11} /> {isUploading ? 'Adding...' : '+ Add Link'}
                      </Button>
                    </LinkInputWrap>
                  )}
                </ItemCard>
              );
            })}
          </ItemGrid>
        </CategoryCard>
      ))}

      <Button
        type="button"
        $primary
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        style={{ padding: '14px 24px', fontSize: '1rem', justifyContent: 'center' }}
      >
        {loading ? 'Submitting...' : 'Submit Documents →'}
      </Button>
    </Wrap>
  );
};

export default HRDocumentsStep;
