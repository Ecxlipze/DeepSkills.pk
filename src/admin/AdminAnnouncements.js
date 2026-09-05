import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBullhorn, FaThumbtack, FaEdit, FaTrash,
  FaPaperclip, FaTimes, FaPlus, FaToggleOn, FaToggleOff,
  FaCrosshairs, FaCalendarAlt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

// ─── Styled Components ───

const Container = styled.div`padding: 20px 0;`;

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 30px; flex-wrap: wrap; gap: 15px;
  h1 { font-size: 2rem; font-weight: 800; color: #fff; margin: 0; }
  p { color: #888; font-size: 0.9rem; margin: 5px 0 0; }
`;

const PrimaryBtn = styled.button`
  background: #7B1F2E; color: #fff; border: none; padding: 12px 24px;
  border-radius: 10px; font-weight: 700; cursor: pointer; display: flex;
  align-items: center; gap: 8px; font-size: 0.9rem;
  &:hover { background: #9c273a; }
`;

const StatsGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;
  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
`;

const StatCard = styled.div`
  background: #111318; padding: 20px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  h4 { color: #888; font-size: 0.75rem; text-transform: uppercase; margin: 0 0 8px; }
  .val { font-size: 1.6rem; font-weight: 800; color: #fff; }
`;

const FilterBar = styled.div`
  background: #111318; padding: 20px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px;
  display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
`;

const Input = styled.input`
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px;
  border-radius: 8px; color: #fff; font-size: 0.85rem; flex: 1; min-width: 200px;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const Select = styled.select`
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px;
  border-radius: 8px; color: #fff; font-size: 0.85rem;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const ClearBtn = styled.button`
  background: none; border: none; color: #7B1F2E; font-size: 0.8rem;
  font-weight: 600; cursor: pointer; &:hover { text-decoration: underline; }
`;

const TableCard = styled.div`
  background: #111318; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse;
  th, td { padding: 14px 18px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.03); }
  th { font-size: 0.75rem; color: #666; text-transform: uppercase; font-weight: 700; }
  td { font-size: 0.85rem; color: #ccc; }
  tr:hover td { background: rgba(255,255,255,0.01); }
`;

const AudienceBadge = styled.span`
  font-size: 0.8rem; display: flex; align-items: center; gap: 5px;
`;

const StatusBadge = styled.span`
  padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700;
  background: ${p => p.$active ? 'rgba(46,204,113,0.1)' : 'rgba(107,114,128,0.1)'};
  color: ${p => p.$active ? '#2ecc71' : '#888'};
`;

const ActionBtn = styled.button`
  background: none; border: none; color: #888; cursor: pointer; padding: 4px 8px;
  font-size: 0.85rem; transition: color 0.2s;
  &:hover { color: #fff; }
  &.danger:hover { color: #e74c3c; }
  &.pin:hover { color: #f1c40f; }
`;

// ─── Modal Styles ───

const Overlay = styled(motion.div)`
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000;
  display: flex; justify-content: center; align-items: flex-start; padding: 40px 20px;
  overflow-y: auto;
`;

const Modal = styled(motion.div)`
  background: #111318; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);
  width: 100%; max-width: 700px; padding: 30px; color: #fff;
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;
  h2 { font-size: 1.4rem; font-weight: 800; margin: 0; }
`;

const CloseBtn = styled.button`
  background: rgba(255,255,255,0.05); border: none; color: #888; width: 36px; height: 36px;
  border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  &:hover { color: #fff; background: rgba(255,255,255,0.1); }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  label { display: block; color: #888; font-size: 0.8rem; font-weight: 600;
    text-transform: uppercase; margin-bottom: 8px; }
`;

const TextArea = styled.textarea`
  width: 100%; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); padding: 12px;
  border-radius: 8px; color: #fff; font-size: 0.9rem; min-height: 120px; resize: vertical;
  font-family: inherit;
  &:focus { border-color: #7B1F2E; outline: none; }
`;

const ToggleRow = styled.div`
  display: flex; gap: 10px; align-items: center;
`;

const ToggleBtn = styled.button`
  padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
  border: 1px solid ${p => p.$active ? '#7B1F2E' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(123,31,46,0.2)' : 'transparent'};
  color: ${p => p.$active ? '#fff' : '#888'};
  display: flex; align-items: center; gap: 8px;
  &:hover { border-color: #7B1F2E; color: #fff; }
`;

const CheckRow = styled.div`
  display: flex; gap: 15px; margin-top: 10px;
  label { display: flex; align-items: center; gap: 6px; color: #ccc;
    font-size: 0.85rem; cursor: pointer; }
`;

const MultiSelect = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
`;

const Chip = styled.button`
  padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; cursor: pointer;
  border: 1px solid ${p => p.$selected ? '#378ADD' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$selected ? 'rgba(55,138,221,0.15)' : 'transparent'};
  color: ${p => p.$selected ? '#378ADD' : '#888'};
  &:hover { border-color: #378ADD; }
`;

const PreviewBox = styled.div`
  background: rgba(55,138,221,0.05); border: 1px solid rgba(55,138,221,0.15);
  border-radius: 8px; padding: 12px 16px; margin-top: 15px;
  font-size: 0.85rem; color: #378ADD;
`;

const SubmitBtn = styled.button`
  width: 100%; padding: 14px; background: #7B1F2E; color: #fff; border: none;
  border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; margin-top: 10px;
  &:hover { background: #9c273a; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const EmptyState = styled.div`
  text-align: center; padding: 60px 20px; color: #555;
  .emoji { font-size: 3rem; margin-bottom: 15px; }
  h3 { color: #888; margin-bottom: 5px; }
`;

// ─── Component ───

const AdminAnnouncements = () => {
  const { announcements, togglePin, deleteAnnouncement, activateAnnouncement, createAnnouncement, updateAnnouncement, fetchAnnouncements } = useAnnouncements();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'announcements', 'full');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({ search: '', audience: 'all', role: 'all' });

  // Form state
  const [form, setForm] = useState({
    title: '', body: '', audienceType: 'broadcast',
    audienceRoles: ['student', 'teacher'],
    audienceCourses: [], audienceBatches: [],
    isPinned: false, scheduleFor: false, scheduledAt: ''
  });

  // Fetch courses/batches for targeting
  const fetchMeta = useCallback(async () => {
    const { data: c } = await supabase.from('courses').select('title');
    const { data: b } = await supabase.from('batches').select('batch_name');
    if (c) setCourses(c.map(x => x.title));
    if (b) setBatches(b.map(x => x.batch_name));
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({ title: '', body: '', audienceType: 'broadcast',
      audienceRoles: ['student', 'teacher'], audienceCourses: [], audienceBatches: [],
      isPinned: false, scheduleFor: false, scheduledAt: '' });
    setEditingId(null);
  };

  const openNew = () => {
    if (!canMutate) {
      toast.error('You have view-only access. Creating announcements is not permitted.');
      return;
    }
    resetForm();
    setShowModal(true);
  };

  const openEdit = (a) => {
    if (!canMutate) {
      toast.error('You have view-only access. Editing announcements is not permitted.');
      return;
    }
    setForm({
      title: a.title, body: a.body,
      audienceType: a.audience_type || 'broadcast',
      audienceRoles: a.audience_roles || ['student', 'teacher'],
      audienceCourses: a.audience_courses || [],
      audienceBatches: a.audience_batches || [],
      isPinned: a.is_pinned,
      scheduleFor: !!a.scheduled_at,
      scheduledAt: a.scheduled_at ? new Date(a.scheduled_at).toISOString().slice(0, 16) : ''
    });
    setEditingId(a.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!canMutate) {
      toast.error('You have view-only access. Saving announcements is not permitted.');
      return;
    }
    if (!form.title.trim() || !form.body.trim()) return toast.error('Title and body are required');
    if (form.body.trim().length < 10) return toast.error('Body must be at least 10 characters');

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      posted_by_name: 'Admin',
      posted_by_role: 'admin',
      audience_type: form.audienceType,
      audience_roles: form.audienceRoles,
      audience_courses: form.audienceType === 'targeted' ? form.audienceCourses : null,
      audience_batches: form.audienceType === 'targeted' ? form.audienceBatches : null,
      is_pinned: form.isPinned,
      is_active: !form.scheduleFor,
      scheduled_at: form.scheduleFor && form.scheduledAt ? form.scheduledAt : null,
      posted_at: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateAnnouncement(editingId, payload);
        toast.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        toast.success('Announcement posted! 📢');
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Failed to save announcement');
    }
  };

  const handleTogglePin = async (id, currentPinned) => {
    if (!canMutate) {
      toast.error('You have view-only access. Pinning announcements is not permitted.');
      return;
    }
    await togglePin(id, currentPinned);
  };

  const handleToggleActive = async (id, isActive) => {
    if (!canMutate) {
      toast.error('You have view-only access. Changing announcement status is not permitted.');
      return;
    }
    if (isActive) {
      await deleteAnnouncement(id);
    } else {
      await activateAnnouncement(id);
    }
  };

  const handleDeletePermanent = async (id) => {
    if (!canMutate) {
      toast.error('You have view-only access. Deleting announcements is not permitted.');
      return;
    }
    if (!window.confirm('Delete this announcement permanently?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted permanently');
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message || 'Failed to delete announcement');
    }
  };

  const toggleRole = (role) => {
    setForm(prev => {
      const roles = prev.audienceRoles.includes(role)
        ? prev.audienceRoles.filter(r => r !== role)
        : [...prev.audienceRoles, role];
      return { ...prev, audienceRoles: roles.length > 0 ? roles : [role] };
    });
  };

  const toggleChip = (arr, val, key) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(v => v !== val) : [...prev[key], val]
    }));
  };

  // Stats
  const now = new Date();
  const thisMonth = announcements.filter(a => new Date(a.posted_at).getMonth() === now.getMonth()
    && new Date(a.posted_at).getFullYear() === now.getFullYear());
  const stats = {
    total: announcements.length,
    active: announcements.filter(a => a.is_active).length,
    pinned: announcements.filter(a => a.is_pinned).length,
    month: thisMonth.length
  };

  // Filtered list
  const filtered = announcements.filter(a => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!a.title.toLowerCase().includes(s) && !a.body.toLowerCase().includes(s)) return false;
    }
    if (filters.audience !== 'all' && a.audience_type !== filters.audience) return false;
    if (filters.role === 'student' && !a.audience_roles?.includes('student')) return false;
    if (filters.role === 'teacher' && !a.audience_roles?.includes('teacher')) return false;
    return true;
  });

  // Audience preview
  const getPreview = () => {
    if (form.audienceType === 'broadcast') {
      const roles = form.audienceRoles.join(' and ');
      return `📡 This will be sent to all ${roles}s`;
    }
    const parts = [];
    if (form.audienceCourses.length) parts.push(`Courses: ${form.audienceCourses.join(', ')}`);
    if (form.audienceBatches.length) parts.push(`Batches: ${form.audienceBatches.join(', ')}`);
    const roles = form.audienceRoles.join(' & ');
    return `🎯 Targeted to ${roles}s — ${parts.join(' + ') || 'No targets selected'}`;
  };

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div>
            <h1>📢 Announcements</h1>
            <p>Post and manage announcements for students and teachers</p>
          </div>
          {canMutate && <PrimaryBtn onClick={openNew}><FaPlus /> New Announcement</PrimaryBtn>}
        </Header>

        <StatsGrid>
          <StatCard><h4>Total Posted</h4><div className="val">{stats.total}</div></StatCard>
          <StatCard><h4>Active</h4><div className="val">{stats.active}</div></StatCard>
          <StatCard><h4>Pinned</h4><div className="val">{stats.pinned}</div></StatCard>
          <StatCard><h4>This Month</h4><div className="val">{stats.month}</div></StatCard>
        </StatsGrid>

        <FilterBar>
          <Input placeholder="Search by title or body..." value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
          <Select value={filters.audience} onChange={e => setFilters(p => ({ ...p, audience: e.target.value }))}>
            <option value="all">All Audiences</option>
            <option value="broadcast">Broadcast</option>
            <option value="targeted">Targeted</option>
          </Select>
          <Select value={filters.role} onChange={e => setFilters(p => ({ ...p, role: e.target.value }))}>
            <option value="all">All Roles</option>
            <option value="student">Students Only</option>
            <option value="teacher">Teachers Only</option>
          </Select>
          {(filters.search || filters.audience !== 'all' || filters.role !== 'all') && (
            <ClearBtn onClick={() => setFilters({ search: '', audience: 'all', role: 'all' })}>Clear</ClearBtn>
          )}
        </FilterBar>

        {filtered.length === 0 ? (
          <EmptyState>
            <div className="emoji">📢</div>
            <h3>No announcements yet</h3>
            <p>Create your first announcement to get started</p>
          </EmptyState>
        ) : (
          <TableCard>
            <Table>
              <thead>
                <tr>
                  <th>Title</th><th>Audience</th><th>Posted By</th>
                  <th>Posted On</th><th>Attachments</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, maxWidth: 250 }}>
                      {a.is_pinned && <FaThumbtack style={{ color: '#f1c40f', marginRight: 6 }} size={11} />}
                      {a.title}
                    </td>
                    <td>
                      <AudienceBadge>
                        {a.audience_type === 'broadcast'
                          ? <>📡 Everyone</>
                          : <>🎯 {(a.audience_batches || a.audience_courses || []).join(', ') || 'Targeted'}</>
                        }
                      </AudienceBadge>
                    </td>
                    <td>{a.posted_by_name}</td>
                    <td style={{ fontSize: '0.8rem', color: '#666' }}>
                      {new Date(a.posted_at).toLocaleDateString()}
                    </td>
                    <td>
                      {(a.announcement_attachments || []).length > 0
                        ? <span><FaPaperclip size={10} /> {a.announcement_attachments.length} files</span>
                        : <span style={{ color: '#444' }}>—</span>}
                    </td>
                    <td><StatusBadge $active={a.is_active}>{a.is_active ? 'Active' : 'Inactive'}</StatusBadge></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {canMutate ? (
                        <>
                          <ActionBtn onClick={() => openEdit(a)}><FaEdit /></ActionBtn>
                          <ActionBtn className="pin" onClick={() => handleTogglePin(a.id, a.is_pinned)}>
                            <FaThumbtack />
                          </ActionBtn>
                          {a.is_active
                            ? <ActionBtn className="danger" onClick={() => handleToggleActive(a.id, true)}>
                                <FaToggleOff />
                              </ActionBtn>
                            : <ActionBtn onClick={() => handleToggleActive(a.id, false)}>
                                <FaToggleOn />
                              </ActionBtn>
                          }
                          <ActionBtn className="danger" onClick={() => handleDeletePermanent(a.id)}><FaTrash /></ActionBtn>
                        </>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableCard>
        )}

        {/* ─── Modal ─── */}
        <AnimatePresence>
          {showModal && (
            <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}>
              <Modal initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }} onClick={e => e.stopPropagation()}>
                <ModalHeader>
                  <h2>{editingId ? 'Edit Announcement' : '📢 New Announcement'}</h2>
                  <CloseBtn onClick={() => setShowModal(false)}><FaTimes /></CloseBtn>
                </ModalHeader>

                <FormGroup>
                  <label>Title</label>
                  <Input style={{ width: '100%', minWidth: 0 }} maxLength={100}
                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Holiday Notice — April 28" />
                </FormGroup>

                <FormGroup>
                  <label>Body</label>
                  <TextArea value={form.body}
                    onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                    placeholder="Write your announcement here..." />
                </FormGroup>

                <FormGroup>
                  <label>Audience Type</label>
                  <ToggleRow>
                    <ToggleBtn $active={form.audienceType === 'broadcast'}
                      onClick={() => setForm(p => ({ ...p, audienceType: 'broadcast' }))}>
                      <FaBullhorn size={12} /> Broadcast
                    </ToggleBtn>
                    <ToggleBtn $active={form.audienceType === 'targeted'}
                      onClick={() => setForm(p => ({ ...p, audienceType: 'targeted' }))}>
                      <FaCrosshairs size={12} /> Targeted
                    </ToggleBtn>
                  </ToggleRow>
                </FormGroup>

                <FormGroup>
                  <label>Send to Roles</label>
                  <CheckRow>
                    <label>
                      <input type="checkbox" checked={form.audienceRoles.includes('student')}
                        onChange={() => toggleRole('student')} /> Students
                    </label>
                    <label>
                      <input type="checkbox" checked={form.audienceRoles.includes('teacher')}
                        onChange={() => toggleRole('teacher')} /> Teachers
                    </label>
                  </CheckRow>
                </FormGroup>

                {form.audienceType === 'targeted' && (
                  <>
                    <FormGroup>
                      <label>Select Courses</label>
                      <MultiSelect>
                        {courses.map(c => (
                          <Chip key={c} $selected={form.audienceCourses.includes(c)}
                            onClick={() => toggleChip(form.audienceCourses, c, 'audienceCourses')}>{c}</Chip>
                        ))}
                      </MultiSelect>
                    </FormGroup>
                    <FormGroup>
                      <label>Select Batches</label>
                      <MultiSelect>
                        {batches.map(b => (
                          <Chip key={b} $selected={form.audienceBatches.includes(b)}
                            onClick={() => toggleChip(form.audienceBatches, b, 'audienceBatches')}>{b}</Chip>
                        ))}
                      </MultiSelect>
                    </FormGroup>
                  </>
                )}

                <PreviewBox>{getPreview()}</PreviewBox>

                <FormGroup style={{ marginTop: 20 }}>
                  <CheckRow>
                    <label>
                      <input type="checkbox" checked={form.isPinned}
                        onChange={() => setForm(p => ({ ...p, isPinned: !p.isPinned }))} />
                      📌 Pin this announcement
                    </label>
                    <label>
                      <input type="checkbox" checked={form.scheduleFor}
                        onChange={() => setForm(p => ({ ...p, scheduleFor: !p.scheduleFor }))} />
                      <FaCalendarAlt size={11} /> Schedule for later
                    </label>
                  </CheckRow>
                </FormGroup>

                {form.scheduleFor && (
                  <FormGroup>
                    <label>Schedule Date & Time</label>
                    <Input type="datetime-local" style={{ width: '100%', minWidth: 0 }}
                      value={form.scheduledAt}
                      onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                  </FormGroup>
                )}

                <SubmitBtn onClick={handleSubmit} disabled={!form.title.trim() || !form.body.trim()}>
                  {editingId ? 'Update Announcement' : form.scheduleFor ? '📅 Schedule Announcement' : '📢 Post Announcement'}
                </SubmitBtn>
              </Modal>
            </Overlay>
          )}
        </AnimatePresence>
      </Container>
    </AdminLayout>
  );
};

export default AdminAnnouncements;
