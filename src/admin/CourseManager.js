import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, FaTimes, FaArrowRight, FaEdit, FaBan,
  FaClock, FaMoneyBillWave, FaUsers, FaLayerGroup, 
  FaCheckCircle, FaLaptopCode, FaPalette, FaChartLine,
  FaMobileAlt, FaShieldAlt, FaVideo, FaPen, FaGlobe,
  FaRobot, FaDraftingCompass, FaWrench, FaGraduationCap,
  FaCode, FaDatabase
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { requestRevalidate } from '../utils/revalidatePublic';
import { slugify } from '../../lib/careers';
import { 
  AdminModal, 
  AdminModalHeader, 
  AdminModalBody, 
  AdminModalFooter, 
  FormField, 
  AdminInput, 
  AdminTextarea, 
  AdminButton, 
  FormGrid 
} from '../components/portal';
import { validateRequired, validateNumber } from '../utils/formValidation';

// --- Color Map ---
const ACCENT_COLORS = {
  maroon: { grad: 'linear-gradient(135deg, #7B1F2E, #9b283b)', solid: '#7B1F2E' },
  purple: { grad: 'linear-gradient(135deg, #9333ea, #6b21a8)', solid: '#9333ea' },
  green:  { grad: 'linear-gradient(135deg, #10b981, #047857)', solid: '#10b981' },
  amber:  { grad: 'linear-gradient(135deg, #f59e0b, #d97706)', solid: '#f59e0b' },
  red:    { grad: 'linear-gradient(135deg, #ef4444, #b91c1c)', solid: '#ef4444' },
  teal:   { grad: 'linear-gradient(135deg, #14b8a6, #0d9488)', solid: '#14b8a6' },
};

// --- Icon Map (react-icons instead of emojis) ---
const COURSE_ICONS = {
  laptop: { icon: FaLaptopCode, label: 'Web Dev' },
  palette: { icon: FaPalette, label: 'Design' },
  chart: { icon: FaChartLine, label: 'Data' },
  mobile: { icon: FaMobileAlt, label: 'Mobile' },
  shield: { icon: FaShieldAlt, label: 'Security' },
  video: { icon: FaVideo, label: 'Video' },
  pen: { icon: FaPen, label: 'Content' },
  globe: { icon: FaGlobe, label: 'Web' },
  robot: { icon: FaRobot, label: 'AI/ML' },
  compass: { icon: FaDraftingCompass, label: 'Engineering' },
  wrench: { icon: FaWrench, label: 'DevOps' },
  grad: { icon: FaGraduationCap, label: 'General' },
  code: { icon: FaCode, label: 'Coding' },
  database: { icon: FaDatabase, label: 'Database' },
};

const getIconComponent = (iconKey) => {
  const entry = COURSE_ICONS[iconKey];
  if (entry) return entry.icon;
  return FaGraduationCap;
};

// ===================== STYLED COMPONENTS =====================
const Container = styled.div`padding:20px 0;color:#fff;`;

const PageHeader = styled.div`
  display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;gap:15px;
  @media(max-width:600px){flex-direction:column;align-items:flex-start;}
  .title-block{
    h1{font-size:1.8rem;font-weight:700;margin-bottom:5px;color:#fff;}
    p{color:#888;font-size:0.95rem;margin:0;}
  }
`;

const AddBtn = styled.button`
  display:flex;align-items:center;gap:8px;padding:12px 24px;
  background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:10px;
  color:#fff;font-weight:700;font-size:0.95rem;cursor:pointer;
  transition:all 0.2s;box-shadow:0 4px 15px rgba(16,185,129,0.25);
  &:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,0.35);}
`;

const StatsStrip = styled.div`display:flex;gap:16px;margin-bottom:30px;flex-wrap:wrap;`;

const StatChip = styled.div`
  background:linear-gradient(135deg,#0d0d0d,#151515);
  border:1px solid rgba(255,255,255,0.06);border-radius:12px;
  padding:18px 22px;display:flex;align-items:center;gap:14px;flex:1;min-width:190px;
  transition:all 0.3s;
  &:hover{border-color:rgba(255,255,255,0.12);transform:translateY(-2px);}
  .icon-box{
    width:42px;height:42px;border-radius:10px;
    background:${p => p.$bg || 'rgba(255,255,255,0.05)'};
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:1rem;
  }
  .info{
    .val{font-size:1.5rem;font-weight:700;color:#fff;letter-spacing:-0.5px;}
    .lbl{font-size:0.72rem;color:#666;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px;}
  }
`;

const Grid = styled.div`
  display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px;
`;

const CourseCard = styled(motion.div)`
  background:linear-gradient(180deg,#0f0f0f,#111);border-radius:16px;overflow:hidden;
  border:1px solid rgba(255,255,255,0.05);transition:all 0.3s;position:relative;
  display:flex;flex-direction:column;
  &:hover{transform:translateY(-5px);box-shadow:0 16px 40px rgba(0,0,0,0.6);border-color:rgba(255,255,255,0.1);}
`;

const CardAccent = styled.div`height:4px;background:${p => ACCENT_COLORS[p.$c]?.grad || ACCENT_COLORS.maroon.grad};flex-shrink:0;`;

const CardBody = styled.div`padding:26px;display:flex;flex-direction:column;flex:1;`;

const CardTop = styled.div`
  display:flex;align-items:flex-start;gap:16px;margin-bottom:18px;
  .icon-circle{
    width:48px;height:48px;border-radius:12px;flex-shrink:0;
    background:${p => p.$bg || 'rgba(59,130,246,0.12)'};
    display:flex;align-items:center;justify-content:center;
    color:${p => p.$color || '#3b82f6'};font-size:1.2rem;
  }
  .text{flex:1;min-width:0;
    .title-row{
      display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px;
      h3{margin:0;font-size:1.15rem;color:#fff;font-weight:600;line-height:1.3;flex:1;min-width:0;}
    }
    p{margin:0;color:#666;font-size:0.83rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5;}
  }
`;

const StatusDot = styled.div`
  display:inline-flex;align-items:center;gap:6px;flex-shrink:0;
  padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;letter-spacing:0.3px;
  white-space:nowrap;margin-top:2px;
  background:${p => p.$on ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)'};
  color:${p => p.$on ? '#10b981' : '#555'};
  border:1px solid ${p => p.$on ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'};
  &::before{content:'';width:5px;height:5px;border-radius:50%;background:${p => p.$on ? '#10b981' : '#555'};}
`;

const MetaRow = styled.div`
  display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;flex:1;align-content:flex-start;
  span{background:rgba(255,255,255,0.04);color:#888;padding:5px 11px;border-radius:6px;font-size:0.76rem;display:flex;align-items:center;gap:5px;}
`;

const MiniStats = styled.div`
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;
  border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);
  margin:0 -26px;padding:0 26px;
  .stat{text-align:center;padding:16px 0;
    &:not(:last-child){border-right:1px solid rgba(255,255,255,0.05);}
    .num{font-size:1.2rem;font-weight:700;color:#fff;}
    .lbl{font-size:0.68rem;color:#555;margin-top:4px;text-transform:uppercase;letter-spacing:0.4px;}
  }
`;

const CardActions = styled.div`display:flex;gap:8px;margin-top:20px;`;

const ActionBtn = styled.button`
  flex:${p => p.$grow ? 1 : 'none'};padding:10px 14px;border-radius:8px;font-size:0.82rem;
  font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;
  background:${p => p.$primary ? 'linear-gradient(135deg,#7B1F2E,#9b283b)' : 'transparent'};
  color:${p => p.$danger ? '#ef4444' : (p.$primary ? '#fff' : '#777')};
  border:1px solid ${p => p.$danger ? 'rgba(239,68,68,0.2)' : (p.$primary ? 'transparent' : 'rgba(255,255,255,0.08)')};
  &:hover{transform:translateY(-1px);
    background:${p => p.$primary ? 'linear-gradient(135deg,#9b283b,#b33248)' : (p.$danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)')};
  }
`;

// --- Modal ---
const Overlay = styled(motion.div)`position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);`;
const Modal = styled(motion.div)`background:#0f0f0f;border-radius:18px;border:1px solid rgba(255,255,255,0.08);width:90%;max-width:560px;max-height:85vh;overflow-y:auto;box-shadow:0 30px 70px rgba(0,0,0,0.6);`;
const ModalHeader = styled.div`display:flex;justify-content:space-between;align-items:center;padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);h2{margin:0;font-size:1.25rem;color:#fff;font-weight:600;}button{background:none;border:none;color:#666;cursor:pointer;font-size:1.2rem;&:hover{color:#fff;}}`;
const ModalBody = styled.div`padding:28px;`;
const FG = styled.div`margin-bottom:20px;label{display:block;color:#999;font-size:0.82rem;margin-bottom:8px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;}input,textarea,select{width:100%;padding:12px 14px;background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-size:0.93rem;transition:border 0.2s;&:focus{outline:none;border-color:rgba(123,31,46,0.6);}}textarea{min-height:80px;resize:vertical;}`;
const FR = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:16px;`;

const IconGrid = styled.div`display:grid;grid-template-columns:repeat(7,1fr);gap:8px;`;
const IconOption = styled.button`
  padding:10px;border-radius:10px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;
  border:2px solid ${p => p.$sel ? '#9333ea' : 'rgba(255,255,255,0.06)'};
  background:${p => p.$sel ? 'rgba(147,51,234,0.12)' : '#161616'};
  color:${p => p.$sel ? '#c084fc' : '#666'};font-size:1.1rem;
  &:hover{border-color:rgba(147,51,234,0.4);}
`;

const ColorGrid = styled.div`display:grid;grid-template-columns:repeat(6,1fr);gap:8px;`;
const ColorOption = styled.button`
  height:36px;border-radius:8px;cursor:pointer;transition:all 0.2s;
  background:${p => ACCENT_COLORS[p.$c]?.grad || '#333'};
  border:3px solid ${p => p.$sel ? '#fff' : 'transparent'};
  &:hover{opacity:0.85;}
`;

const ToggleRow = styled.div`display:flex;align-items:center;justify-content:space-between;`;
const Toggle = styled.button`
  width:48px;height:26px;border-radius:13px;border:none;cursor:pointer;
  background:${p => p.$on ? '#10b981' : '#333'};position:relative;transition:0.3s;
  &::after{content:'';position:absolute;top:3px;left:${p => p.$on ? '25px' : '3px'};width:20px;height:20px;border-radius:50%;background:#fff;transition:0.3s;}
`;

const SaveBtn = styled.button`
  width:100%;padding:14px;border-radius:10px;border:none;
  background:linear-gradient(135deg,#7B1F2E,#9b283b);color:#fff;font-weight:700;font-size:1rem;
  cursor:pointer;transition:0.2s;margin-top:10px;
  &:hover{box-shadow:0 6px 20px rgba(123,31,46,0.4);}
  &:disabled{opacity:0.5;cursor:not-allowed;}
`;

const EmptyState = styled.div`
  text-align:center;padding:80px 20px;color:#555;
  .icon{font-size:3rem;margin-bottom:16px;color:#333;}
  p{font-size:1rem;margin:0;}
`;

// ===================== COMPONENT =====================
const CourseManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'courses', 'full');
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    title:'', description:'', duration:'', price:'',
    reenrollment_discount_pct:5, icon:'laptop', accent_color:'maroon', status:'active'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cR,bR,aR] = await Promise.all([
        supabase.from('courses').select('*').order('created_at',{ascending:false}),
        supabase.from('batches').select('*'),
        supabase.from('admissions').select('id,course,batch,status').eq('status','Active')
      ]);
      if(cR.data) setCourses(cR.data);
      if(bR.data) setBatches(bR.data);
      if(aR.data) setAdmissions(aR.data);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchData();},[fetchData]);

  const getCourseBatches = (t) => batches.filter(b=>b.course===t && b.status==='Active');
  const getCourseStudents = (t) => admissions.filter(a=>a.course===t);
  const stats = {
    total:courses.length,
    active:courses.filter(c=>(c.status||'active')==='active').length,
    batches:batches.filter(b=>b.status==='Active').length,
    students:admissions.length
  };

  const openAdd = () => {
    if (!canMutate) {
      toast.error('You have view-only access. Adding courses is not permitted.');
      return;
    }
    setEditingCourse(null);
    setFormErrors({});
    setForm({title:'',description:'',duration:'',price:'',reenrollment_discount_pct:5,icon:'laptop',accent_color:'maroon',status:'active'});
    setIsModalOpen(true);
  };
  const openEdit = (c) => {
    if (!canMutate) {
      toast.error('You have view-only access. Editing courses is not permitted.');
      return;
    }
    setEditingCourse(c);
    setFormErrors({});
    const resolvedColor = (!c.accent_color || c.accent_color === 'blue') ? 'maroon' : c.accent_color;
    setForm({title:c.title||'',description:c.description||'',duration:c.duration||'',price:c.price||'',reenrollment_discount_pct:c.reenrollment_discount_pct??5,icon:c.icon||'laptop',accent_color:resolvedColor,status:c.status||'active'});
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!canMutate) {
      toast.error('You have view-only access. Modifying courses is not permitted.');
      return;
    }
    const errors = {};
    const titleErr = validateRequired(form.title, 'Course name');
    if (titleErr) errors.title = titleErr;
    else if (form.title.trim().length < 3) errors.title = 'Course name must be at least 3 characters.';

    const durationErr = validateRequired(form.duration, 'Duration');
    if (durationErr) errors.duration = durationErr;

    const priceErr = validateNumber(form.price, { fieldName: 'Total Fee', required: true, positive: true });
    if (priceErr) errors.price = priceErr;

    const discountErr = validateNumber(form.reenrollment_discount_pct, { fieldName: 'Discount', required: false, min: 0, max: 100 });
    if (discountErr) errors.reenrollment_discount_pct = discountErr;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setSaving(true);
    try {
      const slug = editingCourse?.slug || slugify(form.title);
      let payload = { ...form, slug };
      if(editingCourse){
        let { error } = await supabase.from('courses').update(payload).eq('id', editingCourse.id);
        if (error && error.message?.includes('slug')) {
          delete payload.slug;
          const retry = await supabase.from('courses').update(payload).eq('id', editingCourse.id);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
        toast.success('Course updated');
      } else {
        let { error } = await supabase.from('courses').insert([payload]);
        if (error && error.message?.includes('slug')) {
          delete payload.slug;
          const retry = await supabase.from('courses').insert([payload]);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
        toast.success('Course created');
      }
      requestRevalidate(['/', '/courses', `/courses/${slug}`]);
      setIsModalOpen(false); fetchData();
    }catch(e){toast.error('Failed: '+e.message);}
    finally{setSaving(false);}
  };

  const handleDeactivate = async (c) => {
    if (!canMutate) {
      toast.error('You have view-only access. Changing course status is not permitted.');
      return;
    }
    const next = (c.status||'active')==='active'?'inactive':'active';
    if(!window.confirm(`${next==='inactive'?'Deactivate':'Reactivate'} "${c.title}"?`))return;
    try{
      const {error}=await supabase.from('courses').update({status:next}).eq('id',c.id);
      if(error)throw error; toast.success(`Course ${next==='inactive'?'deactivated':'reactivated'}`);
      const slug = c.slug || slugify(c.title);
      requestRevalidate(['/', '/courses', `/courses/${slug}`]); fetchData();
    }catch(e){toast.error('Failed: '+e.message);}
  };

  return (
    <Container>
      <PageHeader>
        <div className="title-block">
          <h1>Courses & Batches</h1>
          <p>Manage all courses offered at DeepSkill</p>
        </div>
        {canMutate && <AddBtn onClick={openAdd}><FaPlus /> Add New Course</AddBtn>}
      </PageHeader>

      <StatsStrip>
        <StatChip $bg="rgba(123,31,46,0.15)"><div className="icon-box" style={{ color: '#ff8597' }}><FaLayerGroup /></div><div className="info"><div className="val">{stats.total}</div><div className="lbl">Total Courses</div></div></StatChip>
        <StatChip $bg="rgba(16,185,129,0.12)"><div className="icon-box"><FaCheckCircle /></div><div className="info"><div className="val">{stats.active}</div><div className="lbl">Active Courses</div></div></StatChip>
        <StatChip $bg="rgba(147,51,234,0.12)"><div className="icon-box"><FaGraduationCap /></div><div className="info"><div className="val">{stats.batches}</div><div className="lbl">Total Batches</div></div></StatChip>
        <StatChip $bg="rgba(245,158,11,0.12)"><div className="icon-box"><FaUsers /></div><div className="info"><div className="val">{stats.students}</div><div className="lbl">Enrolled Students</div></div></StatChip>
      </StatsStrip>

      {courses.length===0 && !loading ? (
        <EmptyState><FaGraduationCap className="icon" /><p>No courses added yet. Add your first course.</p></EmptyState>
      ) : (
        <Grid>
          {courses.map(course => {
            const cB=getCourseBatches(course.title), cS=getCourseStudents(course.title);
            const active=(course.status||'active')==='active';
            const col=(!course.accent_color || course.accent_color === 'blue') ? 'maroon' : course.accent_color;
            const IconComp=getIconComponent(course.icon);
            return (
              <CourseCard key={course.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>
                <CardAccent $c={col} />
                <CardBody>
                  <CardTop $bg={`${ACCENT_COLORS[col]?.solid}18`} $color={ACCENT_COLORS[col]?.solid}>
                    <div className="icon-circle"><IconComp /></div>
                    <div className="text">
                      <div className="title-row">
                        <h3>{course.title}</h3>
                        <StatusDot $on={active}>{active?'Active':'Inactive'}</StatusDot>
                      </div>
                      <p>{course.description||course.category||'No description'}</p>
                    </div>
                  </CardTop>
                  <MetaRow>
                    <span><FaClock /> {course.duration||'N/A'}</span>
                    <span><FaMoneyBillWave /> Rs. {parseInt(course.price||0).toLocaleString()}</span>
                    {(course.reenrollment_discount_pct||0)>0 && <span style={{color:'#c084fc'}}>{course.reenrollment_discount_pct}% Returning Discount</span>}
                  </MetaRow>
                  <MiniStats>
                    <div className="stat"><div className="num">{cB.length}</div><div className="lbl">Active Batches</div></div>
                    <div className="stat"><div className="num">{cS.length}</div><div className="lbl">Students</div></div>
                    <div className="stat"><div className="num">—</div><div className="lbl">Avg Attendance</div></div>
                  </MiniStats>
                  <CardActions>
                    <ActionBtn $primary $grow onClick={()=>navigate(`/admin/management/courses/${course.id}`)}>View Batches <FaArrowRight /></ActionBtn>
                    {canMutate && <ActionBtn onClick={()=>openEdit(course)}><FaEdit /></ActionBtn>}
                    {canMutate && <ActionBtn $danger onClick={()=>handleDeactivate(course)}><FaBan /></ActionBtn>}
                  </CardActions>
                </CardBody>
              </CourseCard>
            );
          })}
        </Grid>
      )}

      {/* Add / Edit Modal */}
      <AdminModal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} maxWidth="580px">
        <AdminModalHeader
          title={editingCourse ? 'Edit Course' : 'Add New Course'}
          subtitle={editingCourse ? 'Update syllabus details, pricing, and appearance.' : 'Create a new vocational course offering.'}
          onClose={()=>setIsModalOpen(false)}
        />
        <AdminModalBody>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FormField label="Course Name" required error={formErrors.title}>
              <AdminInput
                value={form.title}
                onChange={e => {
                  setForm({ ...form, title: e.target.value });
                  if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined }));
                }}
                placeholder="e.g. Web Development Bootcamp"
                $hasError={Boolean(formErrors.title)}
              />
            </FormField>

            <FormField label="Description" error={formErrors.description} hint="Brief summary of skills and outcomes.">
              <AdminTextarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="2-3 sentences outlining the program..."
                rows={3}
              />
            </FormField>

            <FormGrid $columns={2}>
              <FormField label="Duration" required error={formErrors.duration}>
                <AdminInput
                  value={form.duration}
                  onChange={e => {
                    setForm({ ...form, duration: e.target.value });
                    if (formErrors.duration) setFormErrors(prev => ({ ...prev, duration: undefined }));
                  }}
                  placeholder="e.g. 3 months"
                  $hasError={Boolean(formErrors.duration)}
                />
              </FormField>

              <FormField label="Total Fee (PKR)" required error={formErrors.price}>
                <AdminInput
                  type="number"
                  value={form.price}
                  onChange={e => {
                    setForm({ ...form, price: e.target.value });
                    if (formErrors.price) setFormErrors(prev => ({ ...prev, price: undefined }));
                  }}
                  placeholder="25000"
                  $hasError={Boolean(formErrors.price)}
                />
              </FormField>
            </FormGrid>

            <FormField label="Re-enrollment Discount %" error={formErrors.reenrollment_discount_pct} hint="Applicable to DeepSkills alumni">
              <AdminInput
                type="number"
                value={form.reenrollment_discount_pct}
                onChange={e => {
                  setForm({ ...form, reenrollment_discount_pct: parseInt(e.target.value) || 0 });
                  if (formErrors.reenrollment_discount_pct) setFormErrors(prev => ({ ...prev, reenrollment_discount_pct: undefined }));
                }}
                min="0"
                max="100"
                $hasError={Boolean(formErrors.reenrollment_discount_pct)}
              />
            </FormField>

            <FormField label="Course Icon">
              <IconGrid>
                {Object.entries(COURSE_ICONS).map(([key,{icon:IC,label}])=>(
                  <IconOption key={key} $sel={form.icon===key} onClick={()=>setForm({...form,icon:key})} title={label} type="button">
                    <IC />
                  </IconOption>
                ))}
              </IconGrid>
            </FormField>

            <FormField label="Accent Color">
              <ColorGrid>
                {Object.keys(ACCENT_COLORS).map(c=>(
                  <ColorOption key={c} $c={c} $sel={form.accent_color===c} onClick={()=>setForm({...form,accent_color:c})} type="button" />
                ))}
              </ColorGrid>
            </FormField>

            <ToggleRow>
              <label style={{margin:0, fontSize: '0.88rem', color: '#fff'}}>
                Status: <strong>{form.status==='active'?'Active':'Inactive'}</strong>
              </label>
              <Toggle $on={form.status==='active'} onClick={()=>setForm({...form,status:form.status==='active'?'inactive':'active'})} />
            </ToggleRow>
          </form>
        </AdminModalBody>
        <AdminModalFooter>
          <AdminButton $variant="secondary" type="button" onClick={()=>setIsModalOpen(false)}>
            Cancel
          </AdminButton>
          <AdminButton $variant="primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (editingCourse ? 'Update Course' : 'Create Course')}
          </AdminButton>
        </AdminModalFooter>
      </AdminModal>
    </Container>
  );
};

const CourseManagerPage = () => <AdminLayout><CourseManager /></AdminLayout>;
export { CourseManager };
export default CourseManagerPage;
