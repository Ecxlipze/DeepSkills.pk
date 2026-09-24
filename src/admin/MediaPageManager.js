import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { requestRevalidate } from '../utils/revalidatePublic';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { getAuthHeaders } from '../utils/adminAccessApi';
import {
  FormField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminButton,
  FormGrid
} from '../components/portal';
import {
  validateRequired,
  validateUrl,
  validateForm
} from '../utils/formValidation';

const Container = styled.div`
  padding: 10px 0;
  color: #fff;
  background: transparent;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;

  h1 {
    font-size: 1.8rem;
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: 10px;
  }

  button {
    padding: 8px 16px;
    background: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    &:hover { background: #3a3a3a; }
  }
`;

const Form = styled.form`
  background: #1a1a1a;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
  margin: 0;
  grid-column: 1 / -1;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: #ccc;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 0.95rem;

  &:focus {
    border-color: #7B1F2E;
    outline: none;
  }
`;

const Select = styled.select`
  padding: 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 0.95rem;

  &:focus {
    border-color: #7B1F2E;
    outline: none;
  }
`;

const TextArea = styled.textarea`
  padding: 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  grid-column: 1 / -1;
  min-height: 80px;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;

  &:focus {
    border-color: #7B1F2E;
    outline: none;
  }
`;

const PreviewBox = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 15px;

  .preview-wrapper {
    width: 120px;
    height: 70px;
    background: #2a2a2a;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #555;

    img, video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  span {
    font-size: 0.85rem;
    color: #888;
  }
`;

const ButtonRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
`;

const Button = styled.button`
  padding: 12px 24px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: background 0.2s;

  &:hover { background: #a0283a; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SectionTitle = styled.h2`
  margin: 40px 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;

  span.count {
    font-size: 0.9rem;
    color: #888;
    font-weight: normal;
  }
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const Card = styled.div`
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    border-color: rgba(123, 31, 46, 0.4);
  }
`;

const MediaOverlay = styled.div`
  width: 100%;
  height: 180px;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Info = styled.div`
  padding: 15px;
  flex: 1;

  h4 {
    margin: 0 0 6px;
    font-size: 1rem;
  }

  p {
    font-size: 0.85rem;
    color: #888;
    margin: 0;
    line-height: 1.4;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const EditBtn = styled.button`
  flex: 1;
  padding: 10px;
  background: transparent;
  color: #60a5fa;
  border: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;

  &:hover { background: rgba(96, 165, 250, 0.1); }
`;

const DeleteBtn = styled.button`
  flex: 1;
  padding: 10px;
  background: transparent;
  color: #f87171;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;

  &:hover { background: rgba(248, 113, 113, 0.1); }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 30px 20px;
  background: #141414;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  color: #777;
  font-size: 0.9rem;
`;

const emptyFormData = {
  title: '',
  description: '',
  media_url: '',
  type: 'project'
};

const getYouTubeId = (url) => {
  if (typeof url !== 'string') return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
};

const isDirectVideo = (url = '') => Boolean(url && typeof url === 'string' && url.match(/\.(mp4|webm|ogg)(\?.*)?$/i));

const renderAdminMedia = (url, title = 'Media') => {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return <div style={{ color: '#777', fontSize: '0.85rem' }}>No media</div>;

  const ytId = getYouTubeId(cleanUrl);
  if (ytId) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(230, 57, 70, 0.95)',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}>
          YouTube
        </div>
      </div>
    );
  }

  if (isDirectVideo(cleanUrl)) {
    return (
      <video
        src={cleanUrl}
        muted
        autoPlay
        loop
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <img
      src={cleanUrl}
      alt={title}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.style.display = 'none';
        if (e.currentTarget.parentElement) {
          e.currentTarget.parentElement.style.display = 'flex';
          e.currentTarget.parentElement.style.alignItems = 'center';
          e.currentTarget.parentElement.style.justifyContent = 'center';
          e.currentTarget.parentElement.innerText = 'Image unavailable';
        }
      }}
    />
  );
};

const MediaPageManager = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = Boolean(
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'superadmin' ||
    canAccess(user?.permissions || {}, 'settings', 'full') ||
    user?.permissions?.settings === 'full'
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/media/');
      if (response.ok) {
        const body = await response.json();
        if (body.status === 'success' && Array.isArray(body.data)) {
          setItems(body.data);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load media items:', error);
      toast.error('Failed to load media items');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to modify media items.');
      return;
    }

    const { isValid, errors: valErrors } = validateForm(formData, {
      title: [(v) => validateRequired(v, 'Title')],
      media_url: [(v) => validateRequired(v, 'Media URL'), (v) => validateUrl(v, 'Media URL')]
    });

    if (!isValid) {
      setFormErrors(valErrors);
      toast.error('Please resolve highlighted errors in the form.');
      return;
    }
    setFormErrors({});

    setSubmitting(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/admin/media/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          id: editingId || undefined,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          media_url: formData.media_url.trim(),
          type: formData.type
        })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.status === 'error') {
        throw new Error(body.message || 'Failed to save media item');
      }

      toast.success(editingId ? 'Media item updated successfully.' : 'Media item added successfully.');
      setFormData(emptyFormData);
      setFormErrors({});
      setEditingId(null);
      await requestRevalidate(['/media']);
      await fetchItems();
    } catch (err) {
      console.error('Error saving media item:', err);
      toast.error(err.message || 'Failed to save media item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    if (!canMutate) {
      toast.error('You do not have permission to edit media items.');
      return;
    }
    setEditingId(item.id);
    setFormErrors({});
    setFormData({
      title: item.title || '',
      description: item.description || '',
      media_url: item.media_url || '',
      type: item.type || 'project'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (item) => {
    if (!canMutate) {
      toast.error('You do not have permission to delete media items.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/admin/media/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ id: item.id })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.status === 'error') {
        throw new Error(body.message || 'Failed to delete media item');
      }

      toast.success('Media item deleted.');
      if (editingId === item.id) {
        setEditingId(null);
        setFormData(emptyFormData);
        setFormErrors({});
      }
      await requestRevalidate(['/media']);
      await fetchItems();
    } catch (err) {
      console.error('Error deleting media item:', err);
      toast.error(err.message || 'Failed to delete media item');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(emptyFormData);
    setFormErrors({});
  };

  const groupByType = (type) => items.filter((i) => i.type === type);

  const sections = [
    { key: 'project', label: 'Featured Projects' },
    { key: 'award', label: 'Awards' },
    { key: 'stay_updated', label: 'Stay Updated Items' },
    { key: 'learn', label: 'Learn Through Videos' }
  ];

  return (
    <Container>
      <Header>
        <div>
          <h1>Public Media Showcase Manager</h1>
          <p style={{ color: '#888', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Manage the projects, awards, updates, and video tutorials shown on the public /media page.
          </p>
        </div>
        <div className="actions">
          <button onClick={() => router.push('/admin/management')}>Management Hub</button>
          <button onClick={() => router.push('/admin/management/media')}>Media Library</button>
          <button onClick={() => router.push('/media')}>View Live Page</button>
        </div>
      </Header>

      {canMutate && (
        <Form onSubmit={handleSubmit} noValidate>
          <FormTitle>{editingId ? 'Edit Media Item' : 'Add New Media Item'}</FormTitle>
          <FormField label="Title" required error={formErrors.title}>
            <AdminInput
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (formErrors.title) setFormErrors(prev => ({ ...prev, title: null }));
              }}
              hasError={Boolean(formErrors.title)}
              placeholder="e.g. Full Stack Student Showcase"
              required
            />
          </FormField>
          <FormField label="Category" required>
            <AdminSelect
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="project">Featured Project</option>
              <option value="award">Award</option>
              <option value="stay_updated">Stay Updated Item</option>
              <option value="learn">Learn Through Video</option>
            </AdminSelect>
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Media URL" required error={formErrors.media_url} hint="Image, SVG, or Video from Media Library or CDN">
              <AdminInput
                value={formData.media_url}
                onChange={(e) => {
                  setFormData({ ...formData, media_url: e.target.value });
                  if (formErrors.media_url) setFormErrors(prev => ({ ...prev, media_url: null }));
                }}
                hasError={Boolean(formErrors.media_url)}
                placeholder="e.g. https://.../media/sample.mp4 or https://.../image.png"
                required
              />
            </FormField>
          </div>

          {formData.media_url && (
            <PreviewBox>
              <div className="preview-wrapper">
                {renderAdminMedia(formData.media_url, 'Preview')}
              </div>
              <span>
                Media Preview ({getYouTubeId(formData.media_url) ? 'YouTube Video' : isDirectVideo(formData.media_url) ? 'Direct Video' : 'Image'})
              </span>
            </PreviewBox>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Description (Optional)">
              <AdminTextarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description or notes (optional)..."
                rows={3}
              />
            </FormField>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <ButtonRow>
              <AdminButton variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update Item' : 'Add Media Item'}
              </AdminButton>
              {editingId && (
                <AdminButton variant="secondary" type="button" onClick={handleCancelEdit}>
                  Cancel
                </AdminButton>
              )}
            </ButtonRow>
          </div>
        </Form>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Loading media items...</p>
      ) : (
        sections.map(({ key, label }) => {
          const group = groupByType(key);
          return (
            <div key={key}>
              <SectionTitle>
                <span>{label}</span>
                <span className="count">({group.length})</span>
              </SectionTitle>
              {group.length === 0 ? (
                <EmptyState>No items added in this category yet.</EmptyState>
              ) : (
                <MediaGrid>
                  {group.map((item) => {
                    const url = String(item.media_url || '').trim();
                    return (
                      <Card key={item.id}>
                        <MediaOverlay>
                          {renderAdminMedia(url, item.title)}
                        </MediaOverlay>
                        <Info>
                          <h4>{item.title}</h4>
                          {item.description && <p>{item.description}</p>}
                        </Info>
                        {canMutate && (
                          <ButtonGroup>
                            <EditBtn type="button" onClick={() => handleEdit(item)}>
                              Edit
                            </EditBtn>
                            <DeleteBtn type="button" onClick={() => handleDelete(item)}>
                              Delete
                            </DeleteBtn>
                          </ButtonGroup>
                        )}
                      </Card>
                    );
                  })}
                </MediaGrid>
              )}
            </div>
          );
        })
      )}
    </Container>
  );
};

const MediaPageManagerPage = () => (
  <AdminLayout>
    <MediaPageManager />
  </AdminLayout>
);

export { MediaPageManager };
export default MediaPageManagerPage;
