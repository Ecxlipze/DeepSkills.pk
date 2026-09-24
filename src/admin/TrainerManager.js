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
import SmartCoverImage from '../../components/next/SmartCoverImage';
import traineeImg from '../assets/trainee.svg';
import {
  FormField,
  AdminInput,
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
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FormTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
  margin: 0;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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

const TextArea = styled.textarea`
  padding: 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 0.95rem;
  min-height: 100px;
  font-family: inherit;
  resize: vertical;

  &:focus {
    border-color: #7B1F2E;
    outline: none;
  }
`;

const ImagePreviewArea = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 5px;

  .preview-box {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    background: #333;
    overflow: hidden;
    position: relative;
    border: 1px solid #555;
  }

  span {
    font-size: 0.85rem;
    color: #888;
  }
`;

const ButtonRow = styled.div`
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

const List = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    background: #2a2a2a;
    position: relative;
    flex-shrink: 0;
    border: 2px solid #7B1F2E;
  }

  .info {
    overflow: hidden;
    h3 {
      font-size: 1.1rem;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    p {
      margin: 0;
      color: #7B1F2E;
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
`;

const CardBody = styled.div`
  padding: 16px;
  flex: 1;

  p {
    font-size: 0.88rem;
    color: #bbb;
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const CardFooter = styled.div`
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  button {
    padding: 6px 14px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .edit-btn {
    background: #333;
    color: #fff;
    &:hover { background: #444; }
  }

  .delete-btn {
    background: rgba(220, 38, 38, 0.2);
    color: #f87171;
    &:hover { background: rgba(220, 38, 38, 0.4); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  background: #1a1a1a;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: #888;
  grid-column: 1 / -1;

  h3 {
    color: #ccc;
    margin-bottom: 8px;
  }
`;

const emptyFormData = {
  name: '',
  role: '',
  image_url: '',
  bio: ''
};

const TrainerManager = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = Boolean(
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'superadmin' ||
    canAccess(user?.permissions || {}, 'settings', 'full') ||
    canAccess(user?.permissions || {}, 'teachers', 'full') ||
    user?.permissions?.settings === 'full' ||
    user?.permissions?.teachers === 'full'
  );

  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/instructors/');
      if (response.ok) {
        const body = await response.json();
        if (body.status === 'success' && Array.isArray(body.data)) {
          setTrainers(body.data);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to fetch instructors:', error);
      toast.error('Failed to load instructors');
    } else {
      setTrainers(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to modify trainers.');
      return;
    }

    const { isValid, errors: valErrors } = validateForm(formData, {
      name: [(v) => validateRequired(v, 'Full Name')],
      image_url: [(v) => v ? validateUrl(v, 'Profile Image URL') : null]
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
      const response = await fetch('/api/admin/instructors/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          id: editingId || undefined,
          name: formData.name.trim(),
          role: formData.role.trim() || 'Instructor',
          image_url: formData.image_url.trim() || null,
          bio: formData.bio.trim() || null
        })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.status === 'error') {
        throw new Error(body.message || 'Failed to save trainer');
      }

      toast.success(editingId ? 'Trainer updated successfully.' : 'Trainer added successfully.');
      setFormData(emptyFormData);
      setFormErrors({});
      setEditingId(null);
      await requestRevalidate(['/trainers']);
      await fetchTrainers();
    } catch (err) {
      console.error('Error saving trainer:', err);
      toast.error(err.message || 'Failed to save trainer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (trainer) => {
    if (!canMutate) {
      toast.error('You do not have permission to edit trainers.');
      return;
    }
    setEditingId(trainer.id);
    setFormErrors({});
    setFormData({
      name: trainer.name || '',
      role: trainer.role || '',
      image_url: trainer.image_url || '',
      bio: trainer.bio || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (trainer) => {
    if (!canMutate) {
      toast.error('You do not have permission to delete trainers.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${trainer.name}?`)) {
      return;
    }

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/admin/instructors/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ id: trainer.id })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.status === 'error') {
        throw new Error(body.message || 'Failed to delete trainer');
      }

      toast.success(`${trainer.name} deleted.`);
      if (editingId === trainer.id) {
        setEditingId(null);
        setFormData(emptyFormData);
        setFormErrors({});
      }
      await requestRevalidate(['/trainers']);
      await fetchTrainers();
    } catch (err) {
      console.error('Error deleting trainer:', err);
      toast.error(err.message || 'Failed to delete trainer');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(emptyFormData);
    setFormErrors({});
  };

  return (
    <Container>
      <Header>
        <div>
          <h1>Public Trainers & Instructors</h1>
          <p style={{ color: '#888', margin: '4px 0 0', fontSize: '0.9rem' }}>
            Manage the instructor profiles displayed on the public /trainers page.
          </p>
        </div>
        <div className="actions">
          <button onClick={() => router.push('/admin/management')}>Management Hub</button>
          <button onClick={() => router.push('/trainers')}>View Live Page</button>
        </div>
      </Header>

      {canMutate && (
        <Form onSubmit={handleSubmit} noValidate>
          <FormTitle>{editingId ? 'Edit Trainer Profile' : 'Add New Trainer Profile'}</FormTitle>
          <FormGrid columns="1fr 1fr" gap="20px">
            <FormField label="Full Name" required error={formErrors.name}>
              <AdminInput
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors(prev => ({ ...prev, name: null }));
                }}
                hasError={Boolean(formErrors.name)}
                placeholder="e.g. John Doe"
                required
              />
            </FormField>
            <FormField label="Role / Specialization">
              <AdminInput
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g. Senior Full Stack Developer"
              />
            </FormField>
          </FormGrid>

          <FormField label="Profile Image URL" error={formErrors.image_url} hint="From Media Library or public CDN">
            <AdminInput
              value={formData.image_url}
              onChange={(e) => {
                setFormData({ ...formData, image_url: e.target.value });
                if (formErrors.image_url) setFormErrors(prev => ({ ...prev, image_url: null }));
              }}
              hasError={Boolean(formErrors.image_url)}
              placeholder="e.g. https://.../media/photo.png"
            />
            {formData.image_url && (
              <ImagePreviewArea>
                <div className="preview-box">
                  <SmartCoverImage
                    src={formData.image_url}
                    alt="Preview"
                    sizes="60px"
                  />
                </div>
                <span>Image Preview</span>
              </ImagePreviewArea>
            )}
          </FormField>

          <FormField label="Biography & Professional Experience">
            <AdminTextarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Describe their industry background, skills, and mentoring approach..."
              rows={4}
            />
          </FormField>

          <ButtonRow>
            <AdminButton variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update Trainer' : 'Add Trainer'}
            </AdminButton>
            {editingId && (
              <AdminButton
                variant="secondary"
                type="button"
                onClick={handleCancelEdit}
              >
                Cancel
              </AdminButton>
            )}
          </ButtonRow>
        </Form>
      )}

      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
        Current Instructors ({trainers.length})
      </h2>

      {loading ? (
        <p style={{ color: '#888' }}>Loading instructors...</p>
      ) : trainers.length === 0 ? (
        <List>
          <EmptyState>
            <h3>No instructors configured</h3>
            <p>Use the form above to add an instructor to the public website.</p>
          </EmptyState>
        </List>
      ) : (
        <List>
          {trainers.map((trainer) => (
            <Card key={trainer.id}>
              <CardHeader>
                <div className="avatar">
                  <SmartCoverImage
                    src={trainer.image_url || traineeImg}
                    alt={trainer.name}
                    sizes="56px"
                  />
                </div>
                <div className="info">
                  <h3>{trainer.name}</h3>
                  <p>{trainer.role || 'Instructor'}</p>
                </div>
              </CardHeader>
              <CardBody>
                <p>{trainer.bio || 'No bio provided.'}</p>
              </CardBody>
              {canMutate && (
                <CardFooter>
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => handleEdit(trainer)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDelete(trainer)}
                  >
                    Delete
                  </button>
                </CardFooter>
              )}
            </Card>
          ))}
        </List>
      )}
    </Container>
  );
};

const TrainerManagerPage = () => (
  <AdminLayout>
    <TrainerManager />
  </AdminLayout>
);

export { TrainerManager };
export default TrainerManagerPage;
