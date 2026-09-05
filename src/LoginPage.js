import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaIdCard, FaArrowRight, FaMapMarkerAlt, FaCheckCircle, FaClock, FaTimesCircle, FaInfoCircle, FaEnvelope } from 'react-icons/fa';
import { useAuth } from './context/AuthContext';
import { getFirstAccessibleAdminPath } from './utils/permissions';
import { getTodayAttendanceLoginStatus, triggerAutoAttendance } from './utils/autoAttendance';

const PageContainer = styled(motion.div)`
  min-height: 100vh;
  background-color: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100px 20px 40px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(123, 31, 46, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const GlowingOrb = styled(motion.div)`
  position: absolute;
  width: ${props => props.size || '400px'};
  height: ${props => props.size || '400px'};
  background: ${props => props.color || 'rgba(123, 31, 46, 0.2)'};
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  pointer-events: none;
`;

const LoginCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  padding: 50px;
  width: 100%;
  max-width: 500px;
  position: relative;
  z-index: 1;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);

  @media (max-width: 480px) {
    padding: 30px;
  }
`;

const Title = styled.h1`
  font-family: 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
  text-align: center;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-bottom: 40px;
  font-family: 'Inter', sans-serif;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  font-weight: 600;
  margin-left: 5px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 15px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 1.1rem;
    transition: color 0.3s ease;
  }

  input:focus + svg {
    color: #7B1F2E;
  }
`;

const Input = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 15px 14px 45px;
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;

  &:focus {
    background: rgba(255, 255, 255, 0.08);
    border-color: #7B1F2E;
    box-shadow: 0 0 15px rgba(123, 31, 46, 0.3);
  }
`;

const SubmitButton = styled(motion.button)`
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 10px 20px rgba(123, 31, 46, 0.3);
  margin-top: 10px;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(255, 100, 100, 0.1);
  border-left: 4px solid #ff4e4e;
  padding: 12px;
  color: #ff9999;
  font-size: 0.9rem;
  border-radius: 4px;
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const AttendanceModal = styled(motion.div)`
  width: 100%;
  max-width: 520px;
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 34px;
  color: #fff;
  text-align: center;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);

  .icon {
    width: 62px;
    height: 62px;
    border-radius: 50%;
    background: rgba(55, 138, 221, 0.14);
    color: #378ADD;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    margin-bottom: 18px;
  }

  h2 {
    margin: 0 0 10px;
    font-size: 1.7rem;
  }

  p {
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.7;
    margin: 0 0 22px;
  }
`;

const ModalActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModalButton = styled.button`
  border: 1px solid ${props => props.$secondary ? 'rgba(255,255,255,0.14)' : 'rgba(55, 138, 221, 0.45)'};
  background: ${props => props.$secondary ? 'rgba(255,255,255,0.04)' : '#378ADD'};
  color: #fff;
  border-radius: 12px;
  padding: 15px 18px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const ResultCard = styled.div`
  border-radius: 16px;
  padding: 18px;
  text-align: left;
  border: 1px solid ${props => props.$color || 'rgba(255,255,255,0.12)'};
  background: ${props => props.$bg || 'rgba(255,255,255,0.04)'};
  margin-bottom: 18px;

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 900;
    margin-bottom: 8px;
  }

  .meta {
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.65;
    font-size: 0.92rem;
  }
`;

const formatCNIC = (value) => {
  const cnic = value.replace(/\D/g, '');
  let formatted = cnic;
  if (cnic.length > 5 && cnic.length <= 12) {
    formatted = `${cnic.slice(0, 5)}-${cnic.slice(5)}`;
  } else if (cnic.length > 12) {
    formatted = `${cnic.slice(0, 5)}-${cnic.slice(5, 12)}-${cnic.slice(12, 13)}`;
  }
  return formatted;
};

const LoginPage = () => {
  const [cnic, setCnic] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
  const [attendanceUser, setAttendanceUser] = useState(null);
  const [attendanceState, setAttendanceState] = useState('permission');
  const [attendanceResult, setAttendanceResult] = useState(null);

  const { login, requestLoginOtp, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCnicChange = (e) => {
    setCnic(formatCNIC(e.target.value));
    if (otpStep) {
      setOtpStep(false);
      setOtp('');
      setOtpInfo('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (cnic.length !== 15) {
      setError('Please enter a valid 13-digit CNIC.');
      return;
    }

    setLoading(true);

    try {
      if (!otpStep) {
        const result = await requestLoginOtp(cnic);
        setOtpStep(true);
        if (result.devOtp) {
          setOtp(result.devOtp);
          setOtpInfo(`OTP sent to ${result.email || 'registered email'}. (Local Test Code: ${result.devOtp})`);
        } else {
          setOtpInfo(result.email ? `OTP sent to ${result.email}` : 'OTP sent to your registered email.');
        }
        return;
      }

      if (otp.replace(/\D/g, '').length !== 6) {
        setError('Please enter the 6-digit OTP from your email.');
        return;
      }

      const verified = await verifyLoginOtp(cnic, otp);
      const user = await login(cnic, { verificationToken: verified.verificationToken });
      
      const from = location.state?.from?.pathname;
      if (user.role === 'student') {
        const attendanceStatus = await getTodayAttendanceLoginStatus(user);
        if (attendanceStatus.status === 'needs_check') {
          setAttendanceUser(user);
          setAttendanceState('permission');
          setAttendanceResult(null);
        } else if (attendanceStatus.status === 'already_marked' || attendanceStatus.status === 'disabled' || attendanceStatus.status === 'no_class') {
          navigate('/student/dashboard', { replace: true });
        } else {
          setAttendanceUser(user);
          setAttendanceState('result');
          setAttendanceResult(attendanceStatus);
          setTimeout(finishStudentLogin, 3000);
        }
      } else if (from && from !== '/' && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        if (user.role === 'teacher') {
          if (user.status === 'Pending' || user.status === 'Onboarding') {
            navigate('/teacher/hr', { replace: true });
          } else {
            navigate('/teacher/dashboard', { replace: true });
          }
        } else {
          const adminPath = user.role === 'admin'
            ? '/admin/dashboard'
            : getFirstAccessibleAdminPath(user.permissions || {});
          navigate(adminPath, { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Access denied. Please contact your administrator.');
    } finally {
      setLoading(false);
    }
  };

  const finishStudentLogin = () => {
    navigate('/student/dashboard', { replace: true });
  };

  const runAutoAttendance = async (options = {}) => {
    if (!attendanceUser) return;
    setAttendanceState('checking');
    try {
      const result = await triggerAutoAttendance(attendanceUser, options);
      setAttendanceResult(result);
      setAttendanceState('result');
      setTimeout(finishStudentLogin, 3000);
    } catch (err) {
      setAttendanceResult({ status: 'error', reason: err.message || 'Attendance check failed' });
      setAttendanceState('result');
      setTimeout(finishStudentLogin, 3000);
    }
  };

  const getResultDisplay = () => {
    const result = attendanceResult || {};
    const batchStart = result.batch?.start_time || result.batch?.startTime || result.batch?.time_shift || result.batch?.timing_label || 'not set';
    const distance = typeof result.distance === 'number' ? `${result.distance}m from the institute` : null;
    const allowed = result.effectiveRadius
      ? `allowed within ${result.effectiveRadius}m after GPS accuracy`
      : result.settings?.radiusMeters
        ? `allowed within ${result.settings.radiusMeters}m`
        : null;
    const accuracy = typeof result.accuracy === 'number' ? `GPS accuracy: ${result.accuracy}m` : null;

    if (result.status === 'present') {
      return {
        icon: <FaCheckCircle />,
        title: 'You are on time. Attendance marked as Present.',
        color: 'rgba(46, 204, 113, 0.35)',
        bg: 'rgba(46, 204, 113, 0.12)',
        meta: [distance, accuracy, `Logged in now. Batch starts at ${batchStart}.`].filter(Boolean)
      };
    }
    if (result.status === 'late') {
      return {
        icon: <FaClock />,
        title: 'You are late. Attendance marked as Late.',
        color: 'rgba(241, 196, 15, 0.4)',
        bg: 'rgba(241, 196, 15, 0.12)',
        meta: [distance, accuracy, `Batch starts at ${batchStart}. Late arrival noted.`].filter(Boolean)
      };
    }
    if (result.status === 'too_early') {
      return {
        icon: <FaInfoCircle />,
        title: `You are early. Class starts at ${batchStart}.`,
        color: 'rgba(55, 138, 221, 0.4)',
        bg: 'rgba(55, 138, 221, 0.12)',
        meta: [distance, accuracy, 'No attendance was saved yet. Log in closer to class time.'].filter(Boolean)
      };
    }
    if (result.status === 'already_marked') {
      return {
        icon: <FaCheckCircle />,
        title: `Attendance already marked as ${String(result.existing?.status || '').toUpperCase()}.`,
        color: 'rgba(55, 138, 221, 0.4)',
        bg: 'rgba(55, 138, 221, 0.12)',
        meta: [`Date: ${result.existing?.date || 'today'}`]
      };
    }
    if (result.status === 'disabled' || result.status === 'no_class') {
      return {
        icon: <FaInfoCircle />,
        title: result.status === 'disabled' ? 'Auto-attendance is disabled.' : 'No class attendance is needed today.',
        color: 'rgba(156, 163, 175, 0.35)',
        bg: 'rgba(156, 163, 175, 0.10)',
        meta: ['You can continue to your dashboard.']
      };
    }
    if (result.status === 'missing_time' || result.status === 'batch_not_found') {
      return {
        icon: <FaInfoCircle />,
        title: 'Attendance could not be marked because batch timing is not configured.',
        color: 'rgba(241, 196, 15, 0.4)',
        bg: 'rgba(241, 196, 15, 0.12)',
        meta: ['Admin has been notified to configure this batch.']
      };
    }
    if (result.status === 'location_denied') {
      return {
        icon: <FaTimesCircle />,
        title: 'Location access was denied. Attendance marked as Absent.',
        color: 'rgba(156, 163, 175, 0.35)',
        bg: 'rgba(156, 163, 175, 0.10)',
        meta: ['Enable location in your browser settings if this was a mistake.']
      };
    }
    return {
      icon: <FaTimesCircle />,
      title: result.reason === 'outside_location'
        ? 'You appear to be outside the institute. Attendance marked as Absent.'
        : 'Attendance marked as Absent.',
      color: 'rgba(231, 76, 60, 0.4)',
      bg: 'rgba(231, 76, 60, 0.12)',
      meta: [distance && allowed ? `${distance} (${allowed})` : distance, accuracy, result.reason ? `Reason: ${result.reason.replace(/_/g, ' ')}` : null].filter(Boolean)
    };
  };

  const resultDisplay = getResultDisplay();

  return (
    <PageContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <GlowingOrb color="rgba(123, 31, 46, 0.3)" size="500px" style={{ top: '-10%', left: '-10%' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <GlowingOrb color="rgba(123, 31, 46, 0.2)" size="400px" style={{ bottom: '10%', right: '0%' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <LoginCard
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring' }}
      >
        <Title>Welcome Back</Title>
        <Subtitle>{otpStep ? 'Enter the OTP sent to your registered email' : 'Enter your CNIC to receive a secure login OTP'}</Subtitle>

        <Form onSubmit={handleSubmit}>
          <AnimatePresence>
            {error && (
              <ErrorMessage
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {error}
              </ErrorMessage>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {otpInfo && !error && (
              <ErrorMessage
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{ background: 'rgba(46, 204, 113, 0.1)', borderColor: 'rgba(46, 204, 113, 0.3)', color: '#2ecc71' }}
              >
                {otpInfo}
              </ErrorMessage>
            )}
          </AnimatePresence>

          <InputGroup>
            <Label>CNIC Number</Label>
            <InputWrapper>
              <FaIdCard />
              <Input
                type="text"
                placeholder="XXXXX-XXXXXXX-X"
                required
                value={cnic}
                onChange={handleCnicChange}
                maxLength="15"
              />
            </InputWrapper>
          </InputGroup>

          {otpStep && (
            <InputGroup>
              <Label>Email OTP</Label>
              <InputWrapper>
                <FaEnvelope />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  autoFocus
                />
              </InputWrapper>
            </InputGroup>
          )}

          <SubmitButton
            type="submit"
            disabled={loading || cnic.length !== 15 || (otpStep && otp.length !== 6)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Authenticating...' : otpStep ? 'Verify OTP & Sign In' : 'Send OTP'} <FaArrowRight />
          </SubmitButton>
          {otpStep && (
            <SubmitButton
              type="button"
              disabled={loading}
              onClick={async () => {
                setError('');
                setLoading(true);
                try {
                  const result = await requestLoginOtp(cnic);
                  if (result.devOtp) {
                    setOtp(result.devOtp);
                    setOtpInfo(`New OTP sent to ${result.email || 'registered email'}. (Local Test Code: ${result.devOtp})`);
                  } else {
                    setOtp('');
                    setOtpInfo(result.email ? `New OTP sent to ${result.email}` : 'New OTP sent to your registered email.');
                  }
                } catch (err) {
                  setError(err.message || 'Unable to resend OTP.');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ background: 'rgba(255,255,255,0.08)', boxShadow: 'none' }}
            >
              Resend OTP
            </SubmitButton>
          )}
        </Form>
      </LoginCard>

      <AnimatePresence>
        {attendanceUser && (
          <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AttendanceModal initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              {attendanceState === 'permission' && (
                <>
                  <div className="icon"><FaMapMarkerAlt /></div>
                  <h2>Attendance Check</h2>
                  <p>
                    DeepSkill needs your location to automatically mark attendance for today's class.
                    Your location is only used for attendance verification.
                  </p>
                  <ModalActions>
                    <ModalButton type="button" onClick={() => runAutoAttendance()}>Allow Location & Continue</ModalButton>
                    <ModalButton type="button" $secondary onClick={() => runAutoAttendance({ selfReportedAbsent: true })}>
                      I am not on campus today
                    </ModalButton>
                  </ModalActions>
                </>
              )}

              {attendanceState === 'checking' && (
                <>
                  <div className="icon"><FaMapMarkerAlt /></div>
                  <h2>Checking your location...</h2>
                  <p>Please keep this page open while we verify your attendance.</p>
                  <ModalActions>
                    <ModalButton type="button" disabled>Checking...</ModalButton>
                  </ModalActions>
                </>
              )}

              {attendanceState === 'result' && (
                <>
                  <ResultCard $color={resultDisplay.color} $bg={resultDisplay.bg}>
                    <div className="title">{resultDisplay.icon} {resultDisplay.title}</div>
                    <div className="meta">
                      {resultDisplay.meta.map((line) => <div key={line}>{line}</div>)}
                    </div>
                  </ResultCard>
                  <p>Redirecting to your dashboard...</p>
                </>
              )}
            </AttendanceModal>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

export default LoginPage;
