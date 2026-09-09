import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaPlus, FaTimes, FaEdit, FaArchive, FaEye, FaClock, FaSearch, FaMoneyBillWave, FaLaptopCode, FaPalette, FaChartLine, FaMobileAlt, FaShieldAlt, FaVideo, FaPen, FaGlobe, FaRobot, FaDraftingCompass, FaWrench, FaGraduationCap, FaCode, FaDatabase } from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

const ACCENT = { blue:'#3b82f6', purple:'#9333ea', green:'#10b981', amber:'#f59e0b', red:'#ef4444', teal:'#14b8a6' };
const ICONS = { laptop:FaLaptopCode, palette:FaPalette, chart:FaChartLine, mobile:FaMobileAlt, shield:FaShieldAlt, video:FaVideo, pen:FaPen, globe:FaGlobe, robot:FaRobot, compass:FaDraftingCompass, wrench:FaWrench, grad:FaGraduationCap, code:FaCode, database:FaDatabase };
const getIcon = (k) => ICONS[k] || FaGraduationCap;

const getBatchStatus = (b) => {
  if (b.status === 'Completed') return 'completed';
  if (b.status === 'Inactive') return 'archived';
  if (!b.start_date||!b.end_date) return 'active';
  const t=new Date(), s=new Date(b.start_date), e=new Date(b.end_date);
  if ((b._enrolled||0)>=(b.capacity||30)) return 'full';
  if (t<s) return 'upcoming'; if (t>e) return 'completed'; return 'active';
};
const sColors = { active:'#10b981', upcoming:'#3b82f6', completed:'#8b5cf6', archived:'#555', full:'#ef4444' };

// Styled
const Container = styled.div`padding:20px 0;color:#fff;`;
const BackLink = styled.button`background:none;border:none;color:#666;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.88rem;margin-bottom:24px;transition:0.2s;&:hover{color:#fff;}`;

const InfoBar = styled.div`
  background:linear-gradient(135deg,#0d0d0d,#131313);border:1px solid rgba(255,255,255,0.06);border-radius:16px;
  padding:24px 28px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;
  .left{display:flex;align-items:center;gap:18px;flex:1;min-width:0;}
  .icon-box{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;}
  .text{min-width:0;h2{margin:0 0 4px;font-size:1.4rem;color:#fff;font-weight:600;}p{margin:0;color:#666;font-size:0.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}}
  .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
  .chip{background:rgba(255,255,255,0.04);color:#777;padding:5px 11px;border-radius:6px;font-size:0.76rem;display:flex;align-items:center;gap:5px;}
`;

const EditCourseBtn = styled.button`padding:10px 20px;background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;transition:0.2s;&:hover{background:#1a1a1a;border-color:rgba(255,255,255,0.15);}`;
const StatusPill = styled.span`padding:5px 14px;border-radius:20px;font-size:0.75rem;font-weight:600;background:${p=>p.$on?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.04)'};color:${p=>p.$on?'#10b981':'#555'};border:1px solid ${p=>p.$on?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.06)'};`;

const StatsGrid = styled.div`display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:30px;@media(max-width:800px){grid-template-columns:repeat(2,1fr);}`;
const StatCard = styled.div`
  background:linear-gradient(135deg,#0d0d0d,#131313);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:22px;text-align:center;
  transition:all 0.3s;&:hover{border-color:rgba(255,255,255,0.1);transform:translateY(-2px);}
  .val{font-size:1.8rem;font-weight:700;color:#fff;letter-spacing:-0.5px;}
  .lbl{font-size:0.72rem;color:#555;text-transform:uppercase;letter-spacing:0.8px;margin-top:5px;}
`;

const SectionHeader = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;h3{margin:0;font-size:1.15rem;color:#fff;font-weight:600;}`;
const AddBtn = styled.button`display:flex;align-items:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:10px;color:#fff;font-weight:600;font-size:0.88rem;cursor:pointer;transition:0.2s;&:hover{transform:translateY(-2px);box-shadow:0 4px 15px rgba(16,185,129,0.3);}`;

const TableWrap = styled.div`overflow-x:auto;border-radius:14px;border:1px solid rgba(255,255,255,0.05);background:#0a0a0a;`;
const Table = styled.table`width:100%;border-collapse:collapse;min-width:850px;`;
const Th = styled.th`text-align:left;padding:14px 16px;background:#060606;color:#555;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:600;`;
const Td = styled.td`padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.88rem;color:#ccc;`;

const SeatBar = styled.div`
  display:flex;align-items:center;gap:8px;
  .bar{width:56px;height:5px;background:#1a1a1a;border-radius:3px;overflow:hidden;.fill{height:100%;border-radius:3px;transition:width 0.5s;background:${p=>p.$c};}}
  .num{font-size:0.78rem;color:${p=>p.$c};font-weight:600;}
`;

const Badge = styled.span`padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;background:${p=>`${p.$c}15`};color:${p=>p.$c};border:1px solid ${p=>`${p.$c}30`};text-transform:capitalize;`;
const TdActions = styled.div`display:flex;gap:6px;`;
const SmBtn = styled.button`background:#161616;border:1px solid rgba(255,255,255,0.06);color:#888;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:0.76rem;display:flex;align-items:center;gap:4px;transition:0.2s;&:hover{color:#fff;border-color:rgba(255,255,255,0.15);background:#1a1a1a;}`;

// Modal
const Overlay = styled(motion.div)`position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);`;
const Modal = styled(motion.div)`background:#0f0f0f;border-radius:18px;border:1px solid rgba(255,255,255,0.08);width:90%;max-width:540px;max-height:85vh;overflow-y:auto;box-shadow:0 30px 70px rgba(0,0,0,0.6);`;
const MH = styled.div`display:flex;justify-content:space-between;align-items:center;padding:22px 26px;border-bottom:1px solid rgba(255,255,255,0.06);h2{margin:0;font-size:1.2rem;color:#fff;font-weight:600;}button{background:none;border:none;color:#666;cursor:pointer;font-size:1.2rem;&:hover{color:#fff;}}`;
const MB = styled.div`padding:26px;`;
const FG = styled.div`margin-bottom:18px;label{display:block;color:#999;font-size:0.8rem;margin-bottom:7px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;}input,select,textarea{width:100%;padding:11px 14px;background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-size:0.93rem;transition:border 0.2s;&:focus{outline:none;border-color:rgba(123,31,46,0.6);}}textarea{min-height:70px;resize:vertical;}`;
const FR = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:14px;`;
const SaveBtn = styled.button`width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#7B1F2E,#9b283b);color:#fff;font-weight:700;font-size:1rem;cursor:pointer;margin-top:8px;transition:0.2s;&:hover{box-shadow:0 6px 20px rgba(123,31,46,0.4);}&:disabled{opacity:0.5;cursor:not-allowed;}`;

// Slide Panel
const SlidePanel = styled(motion.div)`position:fixed;top:0;right:0;width:400px;max-width:100vw;height:100vh;background:#0f0f0f;border-left:1px solid rgba(255,255,255,0.06);z-index:1001;display:flex;flex-direction:column;`;
const PH = styled.div`padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;h3{margin:0;font-size:1.05rem;color:#fff;font-weight:600;}button{background:none;border:none;color:#666;cursor:pointer;font-size:1.2rem;&:hover{color:#fff;}}`;
const PB = styled.div`flex:1;overflow-y:auto;padding:20px 24px;`;
const SearchBox = styled.div`display:flex;align-items:center;gap:8px;background:#161616;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;margin-bottom:16px;input{flex:1;background:none;border:none;color:#fff;font-size:0.88rem;&:focus{outline:none;}&::placeholder{color:#444;}}svg{color:#444;}`;
const SRow = styled.div`display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.03);
  .av{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7B1F2E,#9b283b);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.82rem;flex-shrink:0;}
  .info{flex:1;min-width:0;.name{color:#fff;font-size:0.88rem;font-weight:500;}.cnic{color:#555;font-size:0.76rem;}}
`;
const EmptyMsg = styled.div`text-align:center;padding:40px;color:#555;font-size:0.9rem;`;

// ===================== COMPONENT =====================
const getCourseIdFromPath = () => {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  const courseIndex = parts.indexOf('courses');
  return courseIndex >= 0 ? parts.slice(courseIndex + 1).join('/') : '';
};

const CourseDetailPage = ({ courseId: courseIdProp }) => {
  const params = useParams();
  const courseId = courseIdProp || params.courseId || getCourseIdFromPath();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'courses', 'full');
  const [course, setCourse] = useState(null);
  const [batches, setBatches] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchModal, setBatchModal] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bf, setBf] = useState({ batch_name:'', timing_label:'morning', start_time:'09:00', end_time:'12:00', start_date:'', end_date:'', capacity:30, notes:'' });
  const [panelBatch, setPanelBatch] = useState(null);
  const [panelSearch, setPanelSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data:c } = await supabase.from('courses').select('*').eq('id',courseId).single();
      if(c) setCourse(c);
      const { data:b } = await supabase.from('batches').select('*').eq('course',c?.title).order('created_at',{ascending:false});
      if(b) setBatches(b);
      const { data:a } = await supabase.from('admissions').select('id,name,cnic,course,batch,status').eq('course',c?.title).in('status',['Active','Graduated']);
      if(a) setAdmissions(a);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  },[courseId]);

  useEffect(()=>{fetchData();},[fetchData]);

  const batchesWithStats = batches.map(b=>({...b, _enrolled:admissions.filter(a=>a.batch===b.batch_name).length}));
  const activeBatches = batchesWithStats.filter(b=>{ const s=getBatchStatus(b); return s==='active'||s==='upcoming'; }).length;

  const openAddBatch = () => {
    if (!canMutate) {
      toast.error('You have view-only access. Adding batches is not permitted.');
      return;
    }
    setEditBatch(null); setBf({batch_name:'',timing_label:'morning',start_time:'09:00',end_time:'12:00',start_date:'',end_date:'',capacity:30,notes:''}); setBatchModal(true);
  };
  const openEditBatch = (b) => {
    if (!canMutate) {
      toast.error('You have view-only access. Editing batches is not permitted.');
      return;
    }
    setEditBatch(b); setBf({batch_name:b.batch_name||'',timing_label:b.timing_label||'morning',start_time:b.start_time||'09:00',end_time:b.end_time||'12:00',start_date:b.start_date||'',end_date:b.end_date||'',capacity:b.capacity||30,notes:b.notes||''}); setBatchModal(true);
  };

  const saveBatch = async () => {
    if (!canMutate) {
      toast.error('You have view-only access. Modifying batches is not permitted.');
      return;
    }
    if(!bf.batch_name.trim()){toast.error('Batch name required');return;}
    setSaving(true);
    try {
      const tMap={morning:'Morning (9:00 AM - 12:00 PM)',afternoon:'Afternoon (2:00 PM - 5:00 PM)',evening:'Evening (6:00 PM - 9:00 PM)',weekend:'Weekend (Saturday & Sunday)'};
      const payload = { batch_name:bf.batch_name, timing_label:bf.timing_label, time_shift:tMap[bf.timing_label]||bf.timing_label, start_time:bf.start_time, end_time:bf.end_time, start_date:bf.start_date||null, end_date:bf.end_date||null, capacity:parseInt(bf.capacity)||30, notes:bf.notes, course:course.title, course_id:course.id, status:editBatch?.status || 'Active' };
      if(editBatch){ const {error}=await supabase.from('batches').update(payload).eq('id',editBatch.id); if(error)throw error; toast.success('Batch updated'); }
      else { const {error}=await supabase.from('batches').insert([payload]); if(error)throw error; toast.success('Batch created'); }
      setBatchModal(false); fetchData();
    }catch(e){toast.error('Failed: '+e.message);}
    finally{setSaving(false);}
  };

  const archiveBatch = async (b) => {
    if (!canMutate) {
      toast.error('You have view-only access. Archiving batches is not permitted.');
      return;
    }
    if(!window.confirm(`Archive "${b.batch_name}"?`))return;
    try{ const {error}=await supabase.from('batches').update({status:'Inactive',archived_at:new Date().toISOString()}).eq('id',b.id); if(error)throw error; toast.success('Batch archived'); fetchData(); }catch(e){toast.error('Failed: '+e.message);}
  };

  const completeBatch = async (b) => {
    if (!canMutate) {
      toast.error('You have view-only access. Completing batches is not permitted.');
      return;
    }
    if(!window.confirm(`Complete "${b.batch_name}" and graduate all active students in this batch?`))return;
    try{
      const completedAt = new Date().toISOString();
      const {error:batchError}=await supabase.from('batches').update({status:'Completed',completed_at:completedAt}).eq('id',b.id);
      if(batchError)throw batchError;

      const {error:studentError}=await supabase
        .from('admissions')
        .update({status:'Graduated',graduated_at:completedAt})
        .eq('course',course.title)
        .eq('batch',b.batch_name)
        .eq('status','Active');
      if(studentError)throw studentError;

      toast.success('Batch completed and students graduated');
      fetchData();
    }catch(e){toast.error('Failed: '+e.message);}
  };

  const panelStudents = panelBatch ? admissions.filter(a=>a.batch===panelBatch.batch_name).filter(s=>!panelSearch||s.name?.toLowerCase().includes(panelSearch.toLowerCase())||s.cnic?.includes(panelSearch)) : [];

  if(loading||!course) return <AdminLayout><Container style={{textAlign:'center',padding:'60px',color:'#555'}}>{loading?'Loading...':'Course not found'}</Container></AdminLayout>;

  const IconComp = getIcon(course.icon);
  const accentColor = ACCENT[course.accent_color]||ACCENT.blue;

  return (
    <AdminLayout>
      <Container>
        <BackLink onClick={()=>navigate('/admin/management/courses')}><FaArrowLeft /> Back to Courses</BackLink>

        <InfoBar>
          <div className="left">
            <div className="icon-box" style={{background:`${accentColor}15`,color:accentColor}}><IconComp /></div>
            <div className="text">
              <h2>{course.title}</h2>
              <p>{course.description||'No description'}</p>
              <div className="chips">
                <span className="chip"><FaClock /> {course.duration||'N/A'}</span>
                <span className="chip"><FaMoneyBillWave /> Rs. {parseInt(course.price||0).toLocaleString()}</span>
                {(course.reenrollment_discount_pct||0)>0 && <span className="chip" style={{color:'#c084fc'}}>{course.reenrollment_discount_pct}% Discount</span>}
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <StatusPill $on={course.status==='active'}>{course.status==='active'?'Active':'Inactive'}</StatusPill>
            {canMutate && <EditCourseBtn onClick={()=>navigate('/admin/management/courses')}><FaEdit /> Edit</EditCourseBtn>}
          </div>
        </InfoBar>

        <StatsGrid>
          <StatCard><div className="val">{batches.length}</div><div className="lbl">Total Batches</div></StatCard>
          <StatCard><div className="val">{activeBatches}</div><div className="lbl">Active Batches</div></StatCard>
          <StatCard><div className="val">{admissions.length}</div><div className="lbl">Total Students</div></StatCard>
          <StatCard><div className="val">—</div><div className="lbl">Avg Attendance</div></StatCard>
        </StatsGrid>

        <SectionHeader><h3>Batches</h3>{canMutate && <AddBtn onClick={openAddBatch}><FaPlus /> Add New Batch</AddBtn>}</SectionHeader>

        {batchesWithStats.length===0 ? <EmptyMsg>No batches yet. Add the first batch for this course.</EmptyMsg> : (
          <TableWrap><Table>
            <thead><tr><Th>Batch Name</Th><Th>Timing</Th><Th>Start</Th><Th>End</Th><Th>Enrolled</Th><Th>Seats Left</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {batchesWithStats.map(b => {
                const st=getBatchStatus(b), left=(b.capacity||30)-b._enrolled, pct=Math.min(100,(b._enrolled/(b.capacity||30))*100);
                const sc=left<5?'#ef4444':left<10?'#f59e0b':'#10b981';
                return (
                  <tr key={b.id}>
                    <Td style={{fontWeight:600,color:'#fff'}}>{b.batch_name}</Td>
                    <Td style={{color:'#888',textTransform:'capitalize'}}>{b.timing_label||b.time_shift||'—'}</Td>
                    <Td style={{fontSize:'0.82rem',color:'#666'}}>{b.start_date||'—'}</Td>
                    <Td style={{fontSize:'0.82rem',color:'#666'}}>{b.end_date||'—'}</Td>
                    <Td>{b._enrolled} / {b.capacity||30}</Td>
                    <Td><SeatBar $c={sc}><div className="bar"><div className="fill" style={{width:`${pct}%`}} /></div><span className="num">{left} left</span></SeatBar></Td>
                    <Td><Badge $c={sColors[st]}>{st}</Badge></Td>
                    <Td><TdActions>
                      <SmBtn onClick={()=>{setPanelBatch(b);setPanelSearch('');}}><FaEye /> Students</SmBtn>
                      {canMutate && <SmBtn onClick={()=>openEditBatch(b)}><FaEdit /></SmBtn>}
                      {canMutate && b.status!=='Completed' && b.status!=='Inactive' && <SmBtn onClick={()=>completeBatch(b)}><FaGraduationCap /></SmBtn>}
                      {canMutate && <SmBtn onClick={()=>archiveBatch(b)}><FaArchive /></SmBtn>}
                    </TdActions></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table></TableWrap>
        )}

        {/* Batch Modal */}
        <AnimatePresence>{batchModal && (
          <Overlay initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setBatchModal(false)}>
            <Modal initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}} onClick={e=>e.stopPropagation()}>
              <MH><h2>{editBatch?'Edit Batch':'Add New Batch'}</h2><button onClick={()=>setBatchModal(false)}><FaTimes /></button></MH>
              <MB>
                <FR><FG><label>Batch Name *</label><input value={bf.batch_name} onChange={e=>setBf({...bf,batch_name:e.target.value})} placeholder="e.g. Batch 14" /></FG>
                <FG><label>Timing</label><select value={bf.timing_label} onChange={e=>setBf({...bf,timing_label:e.target.value})}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="weekend">Weekend</option></select></FG></FR>
                <FR><FG><label>Start Time</label><input type="time" value={bf.start_time} onChange={e=>setBf({...bf,start_time:e.target.value})} /></FG><FG><label>End Time</label><input type="time" value={bf.end_time} onChange={e=>setBf({...bf,end_time:e.target.value})} /></FG></FR>
                <FR><FG><label>Start Date</label><input type="date" value={bf.start_date} onChange={e=>setBf({...bf,start_date:e.target.value})} /></FG><FG><label>End Date</label><input type="date" value={bf.end_date} onChange={e=>setBf({...bf,end_date:e.target.value})} /></FG></FR>
                <FG><label>Capacity</label><input type="number" value={bf.capacity} onChange={e=>setBf({...bf,capacity:e.target.value})} min="1" /></FG>
                <FG><label>Notes (optional)</label><textarea value={bf.notes} onChange={e=>setBf({...bf,notes:e.target.value})} placeholder="Internal notes..." /></FG>
                <SaveBtn onClick={saveBatch} disabled={saving}>{saving?'Saving...':(editBatch?'Update Batch':'Create Batch')}</SaveBtn>
              </MB>
            </Modal>
          </Overlay>
        )}</AnimatePresence>

        {/* Students Panel */}
        <AnimatePresence>{panelBatch && (<>
          <motion.div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setPanelBatch(null)} />
          <SlidePanel initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:25,stiffness:200}}>
            <PH><h3>{panelBatch.batch_name} — Students ({panelStudents.length})</h3><button onClick={()=>setPanelBatch(null)}><FaTimes /></button></PH>
            <PB>
              <SearchBox><FaSearch /><input placeholder="Search by name or CNIC..." value={panelSearch} onChange={e=>setPanelSearch(e.target.value)} /></SearchBox>
              {panelStudents.length===0?<EmptyMsg>No students in this batch.</EmptyMsg>:
                panelStudents.map(s=>(
                  <SRow key={s.id}><div className="av">{s.name?.[0]||'?'}</div><div className="info"><div className="name">{s.name}</div><div className="cnic">{s.cnic}</div></div><SmBtn onClick={()=>navigate(`/admin/management/students/${s.id}`)}>View</SmBtn></SRow>
                ))
              }
            </PB>
          </SlidePanel>
        </>)}</AnimatePresence>
      </Container>
    </AdminLayout>
  );
};

export default CourseDetailPage;
