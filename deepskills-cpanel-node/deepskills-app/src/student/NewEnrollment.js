import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { EMAIL_EVENTS, sendAdmissionEmail } from '../utils/emailNotifications';
import { notifyAdmins } from '../utils/notifications';
import { 
  FaHome, FaTasks, FaChartLine, FaCertificate, 
  FaExclamationCircle, FaUserPlus, FaComments, 
  FaWallet, FaUserFriends, FaGraduationCap, 
  FaCheckCircle, FaTimesCircle, FaClock 
} from 'react-icons/fa';
import toast from 'react-hot-toast';

// Layout definition handled by DashboardLayout

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  color: #fff;
`;

const Header = styled.div`
  margin-bottom: 30px;
  h1 { font-size: 2rem; margin-bottom: 5px; color: #fff; }
  p { color: rgba(255,255,255,0.6); }
`;

const DiscountBanner = styled.div`
  background: linear-gradient(90deg, #6b21a8, #9333ea);
  color: #fff;
  padding: 15px 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  margin-bottom: 30px;
  box-shadow: 0 4px 15px rgba(147, 51, 234, 0.3);
`;

const CurrentEnrollmentCard = styled.div`
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;

  .info {
    h3 { margin: 0 0 5px 0; color: #fff; }
    p { margin: 0; color: #888; font-size: 0.9rem; }
  }
  
  .badge {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const CourseCard = styled(motion.div)`
  background: #1a1a1a;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${props => props.$selected ? '#9333ea' : 'rgba(255,255,255,0.1)'};
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    border-color: rgba(147, 51, 234, 0.5);
  }
`;

const CardAccent = styled.div`
  height: 6px;
  background: linear-gradient(90deg, #9333ea, #ec4899);
`;

const CardContent = styled.div`
  padding: 25px;
  
  h3 { margin: 0 0 10px 0; font-size: 1.3rem; }
  .desc { color: #888; font-size: 0.9rem; margin-bottom: 20px; min-height: 40px; }
  
  .pricing {
    margin-bottom: 20px;
    .original { text-decoration: line-through; color: #666; font-size: 0.9rem; margin-bottom: 2px; }
    .discounted { color: #10b981; font-size: 1.5rem; font-weight: bold; display: flex; align-items: center; gap: 10px; }
    .badge { background: rgba(147,51,234,0.2); color: #c084fc; font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; }
  }
  
  .meta { color: #aaa; font-size: 0.85rem; display: flex; justify-content: space-between; }
`;

const FormSection = styled(motion.div)`
  margin-top: 30px;
  background: #111;
  padding: 30px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1);

  .prefilled {
    display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;
    div { background: #1a1a1a; padding: 12px; border-radius: 8px; color: #888; font-size: 0.9rem; }
  }
  
  textarea {
    width: 100%; background: #1a1a1a; border: 1px solid #333; padding: 15px; border-radius: 8px;
    color: #fff; margin-bottom: 20px; min-height: 100px;
  }
`;

const Button = styled.button`
  width: 100%; padding: 15px; border-radius: 8px; border: none; font-weight: bold; font-size: 1rem;
  background: ${props => props.$danger ? '#ef4444' : '#7B1F2E'}; color: #fff; cursor: pointer; transition: 0.3s;
  &:hover { background: ${props => props.$danger ? '#dc2626' : '#9f283c'}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const StatusCard = styled(motion.div)`
  background: #111; border: 1px solid rgba(255,255,255,0.1); padding: 40px; border-radius: 16px;
  text-align: center; margin-top: 20px;

  .icon { font-size: 4rem; margin-bottom: 20px; color: ${props => props.$color || '#fff'}; }
  h2 { margin-bottom: 15px; font-size: 1.8rem; }
  p { color: #aaa; margin-bottom: 30px; line-height: 1.6; }
`;

const Timeline = styled.div`
  text-align: left; max-width: 400px; margin: 0 auto 30px auto;
  .step {
    display: flex; align-items: center; gap: 15px; margin-bottom: 20px;
    color: ${props => props.$active ? '#fff' : '#666'};
    .circle { 
      width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: ${props => props.$active ? '#10b981' : '#333'}; color: #fff;
    }
  }
`;

const NewEnrollment = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [requestState, setRequestState] = useState('browsing'); // browsing, pending, approved, rejected
  const [activeRequest, setActiveRequest] = useState(null);
  
  const [courses, setCourses] = useState([]);
  const [discountSettings, setDiscountSettings] = useState({ percentage: 5, isActive: true });
  
  const [selectedCourse, setSelectedCourse] = useState(null);
  const message = '';
  const [submitting, setSubmitting] = useState(false);

  const fetchInitialData = useCallback(async () => {
    if (!user?.cnic) return;
    setLoading(true);

    try {
      // 1. Check for existing enrollment request
      const { data: enrollments, error: reqError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_cnic', user.cnic)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (reqError) throw reqError;

      if (enrollments && enrollments.length > 0) {
        const req = enrollments[0];
        setActiveRequest(req);
        if (req.status === 'pending') setRequestState('pending');
        else if (req.status === 'approved') setRequestState('approved');
        else if (req.status === 'rejected') setRequestState('rejected');
        else setRequestState('browsing'); // active means they are already studying it, can apply for new
      }

      // 2. Fetch Discount Settings
      const { data: settings } = await supabase
        .from('enrollment_settings')
        .select('setting_value')
        .eq('setting_key', 'loyalty_discount')
        .single();
      
      if (settings?.setting_value) {
        setDiscountSettings(settings.setting_value);
      }

      // 3. Fetch Courses
      const { data: coursesData } = await supabase.from('courses').select('*');

      if (coursesData) setCourses(coursesData);

    } catch (err) {
      console.error("Error fetching enrollment data:", err);
      toast.error("Failed to load enrollment data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const calculateFee = (originalFeeStr) => {
    const originalFee = parseInt((originalFeeStr || '0').toString().replace(/\D/g, '')) || 0;
    const discountPct = discountSettings.isActive ? discountSettings.percentage : 0;
    const discountAmount = Math.round(originalFee * (discountPct / 100));
    return { originalFee, discountPct, discountAmount, finalFee: originalFee - discountAmount };
  };

  const handleSubmit = async () => {
    if (!selectedCourse) return;
    setSubmitting(true);

    const feeDetails = calculateFee(selectedCourse.price);

    try {
      // Get the correct student_id from the admissions table
      const { data: admissionRows, error: admErr } = await supabase
        .from('admissions')
        .select('id, email, name, course')
        .eq('cnic', user.cnic)
        .in('status', ['Active', 'Graduated'])
        .order('submitted_at', { ascending: false })
        .limit(1);
        
      if (admErr) throw new Error("Could not find student admission record.");
      const admissionData = admissionRows?.[0];
      if (!admissionData) throw new Error("Could not find student admission record.");

      const { error } = await supabase.from('enrollments').insert([{
        student_id: admissionData.id,
        student_cnic: user.cnic,
        enrollment_type: 're-enrollment',
        course: selectedCourse.title,
        message: message,
        original_fee: feeDetails.originalFee,
        discount_pct: feeDetails.discountPct,
        discount_amount: feeDetails.discountAmount,
        final_fee: feeDetails.finalFee,
        status: 'pending'
      }]);

      if (error) throw error;

      await notifyAdmins({
        type: 'enrollment',
        title: 'New Re-enrollment Request',
        message: `${admissionData.name || user.name} requested enrollment in ${selectedCourse.title}`,
        link: '/admin/admissions',
        sendEmail: true,
        emailData: {
          name: admissionData.name || user.name,
          course: selectedCourse.title,
          cnic: user.cnic
        }
      });

      const emailResult = await sendAdmissionEmail(EMAIL_EVENTS.RE_ENROLLMENT_REQUESTED, {
        email: admissionData.email || user.email,
        name: admissionData.name || user.name,
        cnic: user.cnic,
        course: selectedCourse.title
      });
      if (!emailResult.ok) {
        console.warn("Re-enrollment request email failed:", emailResult.message);
      }
      
      toast.success("Enrollment request submitted successfully!");
      fetchInitialData(); // Will update state to 'pending'
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest || activeRequest.status !== 'pending') return;
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('enrollments').delete().eq('id', activeRequest.id);
      if (error) throw error;
      
      toast.success("Request cancelled.");
      setActiveRequest(null);
      setRequestState('browsing');
    } catch (err) {
      toast.error("Failed to cancel request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DashboardLayout><Container>Loading enrollment data...</Container></DashboardLayout>;
  }

  // Calculate stats for UI
  const availableCourses = courses.filter(c => c.title !== user?.assigned_course);

  return (
    <DashboardLayout>
      <Container>
        
        {requestState === 'browsing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Header>
              <h1>Enroll in Your Next Course 🎓</h1>
              <p>Continue your learning journey with DeepSkill</p>
            </Header>

            <CurrentEnrollmentCard>
              <div className="info">
                <p>Currently Enrolled In</p>
                <h3>{user?.assigned_course || 'Unknown Course'}</h3>
                <p>{user?.batch || 'Unknown Batch'}</p>
              </div>
              <div className="badge">Active Student</div>
            </CurrentEnrollmentCard>

            {discountSettings.isActive && (
              <DiscountBanner>
                <span>🎉</span> You qualify for an existing student discount of {discountSettings.percentage}% on all courses!
              </DiscountBanner>
            )}

            <Grid>
              {availableCourses.map(course => {
                const fee = calculateFee(course.price);
                
                return (
                  <CourseCard 
                    key={course.id} 
                    onClick={() => handleCourseSelect(course)}
                    $selected={selectedCourse?.id === course.id}
                  >
                    <CardAccent />
                    <CardContent>
                      <h3>{course.title}</h3>
                      <div className="desc">{course.description || course.category}</div>
                      
                      <div className="pricing">
                        {discountSettings.isActive && <div className="original">Rs. {fee.originalFee.toLocaleString()}</div>}
                        <div className="discounted">
                          Rs. {fee.finalFee.toLocaleString()}
                          {discountSettings.isActive && <span className="badge">{discountSettings.percentage}% OFF</span>}
                        </div>
                      </div>
                      
                      <div className="meta">
                        <span><FaClock style={{marginRight: '5px'}}/> {course.duration || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </CourseCard>
                );
              })}
            </Grid>

            <AnimatePresence>
              {selectedCourse && (
                <FormSection
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Apply for {selectedCourse.title}?</h3>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                    </FormSection>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {requestState === 'pending' && activeRequest && (
          <StatusCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} $color="#f59e0b">
            <FaClock className="icon" />
            <h2>Request Submitted</h2>
            <p>Your enrollment request for <strong>{activeRequest.course}</strong> is currently pending review.<br/>We'll notify you once an admin approves it.</p>
            
            <Timeline>
              <div className="step" $active={true}>
                <div className="circle"><FaCheckCircle /></div>
                <div>Request Submitted<br/><small style={{ color: '#888' }}>{new Date(activeRequest.submitted_at).toLocaleString()}</small></div>
              </div>
              <div className="step" $active={false}>
                <div className="circle">⏳</div>
                <div>Admin Review<br/><small style={{ color: '#888' }}>Pending</small></div>
              </div>
            </Timeline>

            <Button $danger onClick={handleCancelRequest} disabled={submitting} style={{ maxWidth: '250px', marginTop: '20px' }}>
              {submitting ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </StatusCard>
        )}

        {requestState === 'approved' && activeRequest && (
          <StatusCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} $color="#10b981">
            <FaCheckCircle className="icon" />
            <h2>Enrollment Confirmed! 🎉</h2>
            <p>Welcome to <strong>{activeRequest.course} ({activeRequest.batch_name})</strong>.<br/>Your dashboard has been updated.</p>
            <Button onClick={() => window.location.href = '/student/dashboard'} style={{ maxWidth: '250px' }}>
              Go to Dashboard
            </Button>
          </StatusCard>
        )}

        {requestState === 'rejected' && activeRequest && (
          <StatusCard initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} $color="#ef4444">
            <FaTimesCircle className="icon" />
            <h2>Request Declined</h2>
            <p>Unfortunately, your request for <strong>{activeRequest.course}</strong> was not approved.</p>
            {activeRequest.rejection_reason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px' }}>
                Reason: {activeRequest.rejection_reason}
              </div>
            )}
            <Button onClick={() => setRequestState('browsing')} style={{ maxWidth: '250px' }}>
              Submit a New Request
            </Button>
          </StatusCard>
        )}

      </Container>
    </DashboardLayout>
  );
};

export default NewEnrollment;
