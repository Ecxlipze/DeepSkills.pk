import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { requestRevalidate } from '../utils/revalidatePublic';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

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
`;

const Button = styled.button`
  padding: 12px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: #a0283a; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #333;
  color: #888;
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #222;
`;

const DeleteBtn = styled.button`
  background: none;
  border: 1px solid #ff4d4d;
  color: #ff4d4d;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  &:hover { background: #ff4d4d; color: #fff; }
`;

const EditBtn = styled.button`
  background: none;
  border: 1px solid #4da6ff;
  color: #4da6ff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  &:hover { background: #4da6ff; color: #fff; }
`;

const VideoThumb = styled.video`
  width: 100px;
  height: 60px;
  background: #000;
  border-radius: 4px;
`;

const ImageThumb = styled.img`
  width: 100px;
  height: 60px;
  object-fit: cover;
  background: #000;
  border-radius: 4px;
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
  const canMutate = Boolean(user?.role === 'admin' || canAccess(user?.permissions || {}, 'settings', 'full'));
  const [testimonials, setTestimonials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    fetchTestimonials();
    fetchCourses();
  }, []);

  const fetchTestimonials = async () => {
    const { data, error } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setTestimonials(data);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('title');
    if (data) setCourses(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You have view-only access to settings.');
      return;
    }
    if (editingId) {
      const { error } = await supabase.from('testimonials').update(formData).eq('id', editingId);
      if (error) toast.error(error.message);
      else {
        setFormData(emptyFormData);
        setEditingId(null);
        requestRevalidate(['/']);
        toast.success('Testimonial updated successfully.');
        fetchTestimonials();
      }
    } else {
      const { error } = await supabase.from('testimonials').insert([formData]);
      if (error) {
        toast.error(error.message);
      } else {
        setFormData(emptyFormData);
        requestRevalidate(['/']);
        toast.success('Testimonial added successfully.');
        fetchTestimonials();
      }
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
      toast.error('You have view-only access to settings.');
      return;
    }
    if (!window.confirm('Delete this testimonial?')) return;
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      requestRevalidate(['/']);
      toast.success('Testimonial deleted.');
      fetchTestimonials();
    }
  };

  return (
    <Container>
      <Header>
        <h1>Testimonial Manager</h1>
        <button onClick={() => router.push('/admin/dashboard')}>Dashboard</button>
      </Header>

      {canMutate && (
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label>Student Name</Label>
            <Input value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} required />
          </InputGroup>
          <InputGroup>
            <Label>Video URL (from Media Library)</Label>
            <Input value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} placeholder="e.g. https://.../media/vid.mp4" required />
          </InputGroup>
          <InputGroup>
            <Label>Thumbnail URL (optional)</Label>
            <Input value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} placeholder="e.g. https://.../media/testimonial-thumb.jpg" />
          </InputGroup>
          <InputGroup>
            <Label>Course Assignment</Label>
            <select 
              style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
              value={formData.course_name} 
              onChange={e => setFormData({...formData, course_name: e.target.value})}
            >
              <option value="General">General / Homepage</option>
              {courses.map(c => (
                <option key={c.title} value={c.title}>{c.title}</option>
              ))}
            </select>
          </InputGroup>
          <Button type="submit">{editingId ? 'Update Testimonial' : 'Add Testimonial'}</Button>
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
          {testimonials.map(t => (
            <tr key={t.id}>
              <Td>
                {t.thumbnail_url ? (
                  <ImageThumb src={t.thumbnail_url} alt="" />
                ) : (
                  <VideoThumb src={t.video_url} />
                )}
              </Td>
              <Td>{t.student_name}</Td>
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
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

const TestimonialManagerPage = () => <AdminLayout><TestimonialManager /></AdminLayout>;
export { TestimonialManager };
export default TestimonialManagerPage;
