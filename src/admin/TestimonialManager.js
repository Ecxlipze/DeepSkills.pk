import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { FaPlay } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { requestRevalidate } from '../utils/revalidatePublic';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { getAuthHeaders } from '../utils/adminAccessApi';
import TheaterVideoModal, { getYouTubeId, getYouTubeThumbnail, isDirectVideo } from '../components/TheaterVideoModal';

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

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: #ccc;
`;

const Input = styled.input`
  padding: 10px;
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
  padding: 10px;
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

const Button = styled.button`
  padding: 12px;
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Th = styled.th`
  text-align: left;
  padding: 14px 16px;
  border-bottom: 1px solid #333;
  color: #888;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Td = styled.td`
  padding: 14px 16px;
  border-bottom: 1px solid #262626;
  vertical-align: middle;
`;

const DeleteBtn = styled.button`
  background: none;
  border: 1px solid #ff4d4d;
  color: #ff4d4d;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  &:hover { background: #ff4d4d; color: #fff; }
`;

const EditBtn = styled.button`
  background: none;
  border: 1px solid #4da6ff;
  color: #4da6ff;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 8px;
  font-size: 0.85rem;
  transition: all 0.2s;
  &:hover { background: #4da6ff; color: #fff; }
`;

const ThumbContainer = styled.div`
  width: 110px;
  height: 65px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: #000;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, border-color 0.2s;

  &:hover {
    transform: scale(1.04);
    border-color: #7B1F2E;
  }

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-badge {
    position: absolute;
    width: 28px;
    height: 28px;
    background: rgba(123, 31, 46, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 0.75rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    padding-left: 2px;
    transition: transform 0.2s, background 0.2s;
  }

  &:hover .play-badge {
    transform: scale(1.15);
    background: #e62e4d;
  }
`;

const emptyFormData = {
  student_name: '',
  video_url: '',
  thumbnail_url: '',
  course_name: 'General'
};

const TestimonialManager = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = Boolean(
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'superadmin' ||
    canAccess(user?.permissions || {}, 'settings', 'full') ||
    user?.permissions?.settings === 'full'
  );

  const [testimonials, setTestimonials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [submitting, setSubmitting] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    fetchTestimonials();
    fetchCourses();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('/api/admin/testimonials/');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          setTestimonials(json.data);
          return;
        }
      }
    } catch (_) {}

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load testimonials:', error);
      toast.error('Failed to load testimonials');
    } else {
      setTestimonials(data || []);
    }
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('title');
    if (data) setCourses(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You do not have permission to edit testimonials.');
      return;
    }

    if (!formData.student_name.trim()) {
      toast.error('Student name is required.');
      return;
    }
    if (!formData.video_url.trim()) {
      toast.error('Video URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/admin/testimonials/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          id: editingId || undefined,
          student_name: formData.student_name.trim(),
          video_url: formData.video_url.trim(),
          thumbnail_url: formData.thumbnail_url?.trim() || null,
          course_name: formData.course_name?.trim() || 'General'
        })
      });

      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Failed to save testimonial.');
      }

      toast.success(body.message || (editingId ? 'Testimonial updated.' : 'Testimonial added.'));
      setFormData(emptyFormData);
      setEditingId(null);
      requestRevalidate(['/']);
      fetchTestimonials();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (testi) => {
    if (!canMutate) {
      toast.error('You have view-only access to settings.');
      return;
    }
    setEditingId(testi.id);
    setFormData({
      student_name: testi.student_name || '',
      video_url: testi.video_url || '',
      thumbnail_url: testi.thumbnail_url || '',
      course_name: testi.course_name || 'General'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!canMutate) {
      toast.error('You do not have permission to delete testimonials.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this testimonial?')) return;

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/admin/testimonials/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ id })
      });

      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Failed to delete testimonial.');
      }

      toast.success('Testimonial deleted.');
      requestRevalidate(['/']);
      fetchTestimonials();
    } catch (err) {
      toast.error(err.message || 'Failed to delete testimonial.');
    }
  };

  const renderThumbnail = (t) => {
    const ytId = getYouTubeId(t.video_url);
    const ytThumb = ytId ? getYouTubeThumbnail(t.video_url) : null;
    const thumbUrl = t.thumbnail_url || ytThumb;
    const isDirect = isDirectVideo(t.video_url);

    return (
      <ThumbContainer 
        onClick={() => setActiveVideo(t)} 
        title="Click to preview video in theater modal"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveVideo(t); }}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt={t.student_name} />
        ) : isDirect ? (
          <video src={t.video_url} preload="metadata" muted />
        ) : (
          <div style={{ color: '#888', fontSize: '0.75rem', textAlign: 'center', padding: '4px' }}>Video</div>
        )}
        <div className="play-badge">
          <FaPlay />
        </div>
      </ThumbContainer>
    );
  };

  return (
    <Container>
      <Header>
        <div>
          <h1 style={{ margin: 0 }}>Student Testimonials Manager</h1>
          <p style={{ margin: '6px 0 0', color: '#888', fontSize: '0.9rem' }}>
            Manage video testimonials and student reviews displayed on the homepage and across course pages.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/admin/management')}>Management Hub</button>
          <button onClick={() => router.push('/admin/dashboard')}>Dashboard</button>
        </div>
      </Header>

      {canMutate && (
        <Form onSubmit={handleSubmit}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
            {editingId ? 'Edit Student Testimonial' : 'Add New Student Testimonial'}
          </h3>
          <InputGroup>
            <Label>Student Name *</Label>
            <Input 
              value={formData.student_name} 
              onChange={e => setFormData({...formData, student_name: e.target.value})} 
              placeholder="e.g. Ali Khan" 
              required 
            />
          </InputGroup>

          <InputGroup>
            <Label>Video URL * (YouTube or direct MP4/WebM)</Label>
            <Input 
              value={formData.video_url} 
              onChange={e => setFormData({...formData, video_url: e.target.value})} 
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://...video.mp4" 
              required 
            />
          </InputGroup>

          <InputGroup>
            <Label>Custom Thumbnail URL (Optional - YouTube thumbnails are automatic)</Label>
            <Input 
              value={formData.thumbnail_url} 
              onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} 
              placeholder="https://images.unsplash.com/..." 
            />
          </InputGroup>

          <InputGroup>
            <Label>Course Name</Label>
            <Select 
              value={formData.course_name} 
              onChange={e => setFormData({...formData, course_name: e.target.value})}
            >
              <option value="General">General / Academy</option>
              {courses.map((c, i) => (
                <option key={i} value={c.title}>{c.title}</option>
              ))}
              <option value="Graphic Design Mastery">Graphic Design Mastery</option>
              <option value="Full Stack React JS">Full Stack React JS</option>
              <option value="Laravel PHP Development">Laravel PHP Development</option>
              <option value="WordPress Mastery">WordPress Mastery</option>
            </Select>
          </InputGroup>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update Testimonial' : 'Add Testimonial'}
            </Button>
            {editingId && (
              <Button 
                type="button" 
                onClick={() => {
                  setEditingId(null);
                  setFormData(emptyFormData);
                }}
                style={{ background: '#444' }}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </Form>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Preview</Th>
            <Th>Student</Th>
            <Th>Course</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {testimonials.length === 0 ? (
            <tr>
              <Td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: '30px' }}>
                No testimonials found. Add one above!
              </Td>
            </tr>
          ) : (
            testimonials.map(t => (
              <tr key={t.id}>
                <Td>{renderThumbnail(t)}</Td>
                <Td>
                  <strong>{t.student_name}</strong>
                  {t.video_url && (
                    <div style={{ fontSize: '0.8rem', color: '#888', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.video_url}
                    </div>
                  )}
                </Td>
                <Td>{t.course_name}</Td>
                <Td>
                  {canMutate ? (
                    <>
                      <EditBtn onClick={() => handleEdit(t)}>Edit</EditBtn>
                      <DeleteBtn onClick={() => handleDelete(t.id)}>Delete</DeleteBtn>
                    </>
                  ) : (
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>View-only</span>
                  )}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <TheaterVideoModal
        video={activeVideo}
        isOpen={Boolean(activeVideo)}
        onClose={() => setActiveVideo(null)}
      />
    </Container>
  );
};

const TestimonialManagerPage = () => <AdminLayout><TestimonialManager /></AdminLayout>;
export { TestimonialManager };
export default TestimonialManagerPage;
