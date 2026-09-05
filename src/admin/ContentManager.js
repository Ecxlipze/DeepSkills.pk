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

const Section = styled.div`
  background: #1a1a1a;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #ccc;
`;

const Input = styled.input`
  padding: 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
`;

const TextArea = styled.textarea`
  padding: 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  min-height: 100px;
`;

const SaveBtn = styled.button`
  padding: 12px 24px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  &:hover { background: #a0283a; }
  &:disabled { opacity: 0.5; }
`;

const ContentManager = () => {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = Boolean(user?.role === 'admin' || canAccess(user?.permissions || {}, 'settings', 'full'));
  const [loading, setLoading] = useState(false);
  const [about, setAbout] = useState({
    title: 'About Deepskills',
    subtitle: 'Where Skills Become Careers',
    intro: 'The future belongs to those who can create, build, and adapt.',
    main: 'Deepskills is a modern learning institute focused on hands-on digital education...',
    footer: 'Learn Skills, earn at an early age, and grasp your future'
  });
  const [hero, setHero] = useState({
    heading: 'Build Skills That Secure Your Future',
    tagline: 'Industry-relevant digital skills designed to turn learners into professionals.',
    description: "At Deepskills, we equip young adults with practical, job-ready skills in design and web development, the skills that power today's digital economy. Design, develop and succeed!"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const aboutSetting = data.find(s => s.key === 'about_content');
      if (aboutSetting) setAbout(aboutSetting.value);
      
      const heroSetting = data.find(s => s.key === 'hero_content');
      if (heroSetting) setHero(heroSetting.value);
    }
  };

  const handleSave = async (key, value) => {
    if (!canMutate) {
      toast.error('You have view-only access to settings.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('settings').upsert({ key, value });
    if (error) toast.error(error.message);
    else {
      requestRevalidate(['/']);
      toast.success(`${key.replace('_', ' ')} saved!`);
    }
    setLoading(false);
  };

  return (
    <Container>
      <Header>
        <h1>Content Manager</h1>
        <button onClick={() => router.push('/admin/dashboard')}>Dashboard</button>
      </Header>

      <Section>
        <h2>Hero Section</h2>
        <FormGroup>
          <Label>Main Heading (Use \n for new line)</Label>
          <TextArea value={hero.heading} onChange={e => setHero({...hero, heading: e.target.value})} />
          
          <Label>Tagline (Red text)</Label>
          <Input value={hero.tagline} onChange={e => setHero({...hero, tagline: e.target.value})} />

          <Label>Full Description</Label>
          <TextArea value={hero.description} onChange={e => setHero({...hero, description: e.target.value})} />
        </FormGroup>
        {canMutate ? (
          <SaveBtn onClick={() => handleSave('hero_content', hero)} disabled={loading}>Save Hero Content</SaveBtn>
        ) : (
          <span style={{ color: '#888', fontSize: '0.85rem' }}>View-only access</span>
        )}
      </Section>

      <Section>
        <h2>About Section Text</h2>
        <FormGroup>
          <Label>Title</Label>
          <Input value={about.title} onChange={e => setAbout({...about, title: e.target.value})} />
          
          <Label>Subtitle</Label>
          <Input value={about.subtitle} onChange={e => setAbout({...about, subtitle: e.target.value})} />

          <Label>Intro Sentence</Label>
          <Input value={about.intro} onChange={e => setAbout({...about, intro: e.target.value})} />

          <Label>Main Description</Label>
          <TextArea value={about.main} onChange={e => setAbout({...about, main: e.target.value})} />

          <Label>Footer Tagline</Label>
          <Input value={about.footer} onChange={e => setAbout({...about, footer: e.target.value})} />
        </FormGroup>
        {canMutate ? (
          <SaveBtn onClick={() => handleSave('about_content', about)} disabled={loading}>Save About Content</SaveBtn>
        ) : (
          <span style={{ color: '#888', fontSize: '0.85rem' }}>View-only access</span>
        )}
      </Section>
    </Container>
  );
};

const ContentManagerPage = () => <AdminLayout><ContentManager /></AdminLayout>;
export { ContentManager };
export default ContentManagerPage;
