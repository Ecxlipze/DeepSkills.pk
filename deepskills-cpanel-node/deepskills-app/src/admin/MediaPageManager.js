import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { requestRevalidate } from '../utils/revalidatePublic';

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
  display: grid;
  grid-template-columns: 1fr 1fr;
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

const Select = styled.select`
  padding: 10px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
`;

const TextArea = styled.textarea`
  padding: 10px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  grid-column: span 2;
  min-height: 60px;
`;

const Button = styled.button`
  padding: 12px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  grid-column: span 2;
  &:hover { background: #a0283a; }
`;

const SectionTitle = styled.h2`
  margin: 30px 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const Card = styled.div`
  background: #111;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const MediaOverlay = styled.div`
  width: 100%;
  height: 180px;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  img, video { width: 100%; height: 100%; object-fit: cover; }
`;

const Info = styled.div`
  padding: 15px;
  h4 { margin-bottom: 5px; }
  p { font-size: 0.85rem; color: #888; }
`;

const DeleteBtn = styled.button`
  width: 100%;
  padding: 10px;
  background: #222;
  color: #ff4d4d;
  border: none;
  cursor: pointer;
  &:hover { background: #ff4d4d; color: #fff; }
`;

const EditBtn = styled.button`
  width: 100%;
  padding: 10px;
  background: #222;
  color: #4da6ff;
  border: none;
  border-right: 1px solid #333;
  cursor: pointer;
  &:hover { background: #4da6ff; color: #fff; }
`;

const ButtonGroup = styled.div`
  display: flex;
  border-top: 1px solid #333;
`;

const MediaPageManager = () => {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media_url: '',
    type: 'project'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('media_items').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setItems(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from('media_items').update(formData).eq('id', editingId);
      if (error) alert(error.message);
      else {
        setFormData({ title: '', description: '', media_url: '', type: 'project' });
        setEditingId(null);
        requestRevalidate(['/media']);
        fetchItems();
      }
    } else {
      const { error } = await supabase.from('media_items').insert([formData]);
      if (error) alert(error.message);
      else {
        setFormData({ title: '', description: '', media_url: '', type: 'project' });
        requestRevalidate(['/media']);
        fetchItems();
      }
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      media_url: item.media_url || '',
      type: item.type || 'project'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    const { error } = await supabase.from('media_items').delete().eq('id', id);
    if (error) alert(error.message);
    else {
      requestRevalidate(['/media']);
      fetchItems();
    }
  };

  const groupByType = (type) => items.filter(i => i.type === type);

  return (
    <Container>
      <Header>
        <h1>Media Page Manager</h1>
        <button onClick={() => window.location.href = '/admin/dashboard'}>Dashboard</button>
      </Header>

      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Label>Title</Label>
          <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        </InputGroup>
        <InputGroup>
          <Label>Type</Label>
          <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="project">Featured Project</option>
            <option value="award">Award</option>
            <option value="stay_updated">Stay Updated Item</option>
            <option value="learn">Learn Through Video</option>
          </Select>
        </InputGroup>
        <InputGroup style={{ gridColumn: 'span 2' }}>
          <Label>Media URL (Image or Video from Library)</Label>
          <Input value={formData.media_url} onChange={e => setFormData({...formData, media_url: e.target.value})} required />
        </InputGroup>
        <TextArea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Short description..." />
        <Button type="submit">{editingId ? 'Update Item' : 'Add Item'}</Button>
        {editingId && (
          <Button 
            type="button" 
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', description: '', media_url: '', type: 'project' });
            }}
            style={{ background: '#444' }}
          >
            Cancel Edit
          </Button>
        )}
      </Form>

      {['project', 'award', 'stay_updated', 'learn'].map(type => (
        <div key={type}>
          <SectionTitle>{type.replace('_', ' ').toUpperCase()}S</SectionTitle>
          <MediaGrid>
            {groupByType(type).map(item => {
              const mediaUrl = String(item.media_url || '').trim();
              return (
              <Card key={item.id}>
                <MediaOverlay>
                  {mediaUrl ? (
                    mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={mediaUrl} muted />
                    ) : (
                      <img src={mediaUrl} alt="" />
                    )
                  ) : (
                    <div style={{ color: '#777', fontSize: '0.85rem' }}>No media</div>
                  )}
                </MediaOverlay>
                <Info>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </Info>
                <ButtonGroup>
                  <EditBtn onClick={() => handleEdit(item)}>Edit</EditBtn>
                  <DeleteBtn onClick={() => handleDelete(item.id)}>Delete</DeleteBtn>
                </ButtonGroup>
              </Card>
            )})}
          </MediaGrid>
        </div>
      ))}
    </Container>
  );
};

const MediaPageManagerPage = () => <AdminLayout><MediaPageManager /></AdminLayout>;
export { MediaPageManager };
export default MediaPageManagerPage;
