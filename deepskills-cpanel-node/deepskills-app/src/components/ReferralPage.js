import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  FaCopy, FaShareAlt, FaWhatsapp, FaInfoCircle,
  FaHourglassHalf, FaUserFriends,
  FaWallet, FaCheck, FaMoneyBillWave
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ensureReferralCode } from '../utils/referralUtils';
import DashboardLayout from './DashboardLayout';

const Container = styled.div`
  padding: 20px 0;
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 40px 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

// --- Hero Card ---
const HeroCard = styled(motion.div)`
  background: linear-gradient(135deg, #1f427b 0%, #2d55b3 100%);
  border-radius: 24px;
  padding: 40px;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(31, 66, 123, 0.3);

  &::after {
    content: '';
    position: absolute;
    top: -50px;
    right: -50px;
    width: 240px;
    height: 240px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%);
    border-radius: 50%;
    pointer-events: none;
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 600px;

  h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 10px; }
  p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 30px; }
`;

const CodeBox = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 15px 25px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);

  .label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
  .code { font-family: 'JetBrains Mono', monospace; font-size: 1.5rem; font-weight: 800; }
  
  button {
    background: #fff;
    color: #1f427b;
    border: none;
    padding: 8px 15px;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    &:hover { transform: scale(1.05); }
  }
`;

const ShareActions = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 10px;

  .share-btn {
    padding: 12px 20px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.2); }
    &.whatsapp:hover { background: #25D366; border-color: #25D366; }
  }
`;

const Card = styled(motion.div)`
  background: #111;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

// --- Stats Row ---
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 30px;

  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const StatCard = styled(Card)`
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  background: #111;

  .icon {
    width: 50px; height: 50px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem;
    &.success { background: rgba(46, 204, 113, 0.1); color: #2ecc71; }
    &.earned { background: rgba(55, 138, 221, 0.1); color: #378ADD; }
    &.pending { background: rgba(241, 196, 15, 0.1); color: #f1c40f; }
  }

  .details {
    p { font-size: 0.85rem; color: #888; margin-bottom: 4px; }
    h3 { font-size: 1.5rem; font-weight: 800; color: #fff; }
  }
`;

const Banner = styled.div`
  background: rgba(55, 138, 221, 0.05);
  border: 1px solid rgba(55, 138, 221, 0.1);
  padding: 15px 20px;
  border-radius: 12px;
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  color: #378ADD;
`;

// --- Referrals List ---
const ReferralList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ReferralRow = styled(Card)`
  padding: 20px 25px;
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  align-items: center;
  gap: 20px;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    text-align: center;
    .avatar-info { justify-content: center; }
    .stepper { justify-content: center; }
  }

  .avatar-info {
    display: flex;
    align-items: center;
    gap: 15px;
    
    .avatar {
      width: 45px; height: 45px; border-radius: 50%;
      background: #222; color: #378ADD; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(55, 138, 221, 0.2);
    }

    .info {
      h4 { font-size: 1rem; color: #fff; margin-bottom: 2px; }
      p { font-size: 0.8rem; color: #666; }
    }
  }

  .reward-badge {
    justify-self: end;
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 700;
    
    &.paid { background: rgba(46, 204, 113, 0.1); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.2); }
    &.pending { background: rgba(241, 196, 15, 0.1); color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.2); }
    &.not-earned { background: rgba(255, 255, 255, 0.05); color: #666; }
  }
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  .step {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #444;
    transition: all 0.3s;

    &.active { color: #378ADD; }
    &.completed { color: #2ecc71; }

    .circle {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid #333;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.6rem;
    }
    
    &.active .circle { border-color: #378ADD; background: rgba(55, 138, 221, 0.1); }
    &.completed .circle { border-color: #2ecc71; background: #2ecc71; color: #fff; }
  }

  .line { flex: 1; height: 2px; background: #222; min-width: 20px; }
`;


const ReferralPage = () => {
  const { user } = useAuth();
  const [refCode, setRefCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [settings, setSettings] = useState({ cash_reward: 1000, fee_discount: 1500, is_active: true });
  const [stats, setStats] = useState({ successful: 0, totalEarned: 0, pendingPayout: 0 });

  useEffect(() => {
    const initPage = async () => {
      if (!user) return;

      // 1. Get/Generate Referral Code
      const code = await ensureReferralCode(user);
      setRefCode(code);

      // 2. Get Settings
      const { data: sData } = await supabase.from('referral_settings').select('*').single();
      if (sData) setSettings(sData);

      // 3. Get User Referrals
      const { data: rData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('referred_at', { ascending: false });

      if (rData) {
        setReferrals(rData);

        // Calculate Stats
        const successful = rData.filter(r => r.status === 'enrolled').length;
        const totalEarned = rData.filter(r => r.payout_status === 'paid').reduce((sum, r) => sum + (r.reward_amount || 0), 0);
        const pendingPayout = rData.filter(r => r.payout_status === 'pending').reduce((sum, r) => sum + (r.reward_amount || 0), 0);

        setStats({ successful, totalEarned, pendingPayout });
      }

    };

    initPage();
  }, [user]);

  const copyToClipboard = (text, type = "Code") => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const shareWhatsapp = () => {
    const link = `https://deepskills.pk/inquiry?ref=${refCode}`;
    const text = `Join DeepSkill with my referral link and get enrolled in top tech courses: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!settings.is_active) {
    return (
      <DashboardLayout>
        <Container>
          <Banner style={{ background: 'rgba(241, 196, 15, 0.1)', color: '#f1c40f', borderColor: 'rgba(241, 196, 15, 0.2)' }}>
            <FaInfoCircle /> The referral program is currently paused. Please check back later!
          </Banner>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container>
        <HeroCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <HeroContent>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              Refer &amp; Earn <FaMoneyBillWave style={{ color: '#fbbf24', fontSize: '2rem' }} />
            </h1>
            <p>Invite friends to join DeepSkill and earn rewards when they enroll in their first course.</p>

            <CodeBox>
              <div>
                <div className="label">Your Code</div>
                <div className="code">{refCode || 'DS-REF-XXXX'}</div>
              </div>
              <button onClick={() => copyToClipboard(refCode)}>
                <FaCopy /> Copy
              </button>
            </CodeBox>

            <ShareActions>
              <button className="share-btn whatsapp" onClick={shareWhatsapp}>
                <FaWhatsapp /> Share on WhatsApp
              </button>
              <button className="share-btn" onClick={() => copyToClipboard(`https://deepskills.pk/inquiry?ref=${refCode}`, "Link")}>
                <FaShareAlt /> Copy Link
              </button>
            </ShareActions>
          </HeroContent>
        </HeroCard>

        <StatsGrid>
          <StatCard>
            <div className="icon success"><FaUserFriends /></div>
            <div className="details">
              <p>Successful Referrals</p>
              <h3>{stats.successful}</h3>
            </div>
          </StatCard>
          <StatCard>
            <div className="icon earned"><FaWallet /></div>
            <div className="details">
              <p>Total Earned</p>
              <h3>Rs. {stats.totalEarned.toLocaleString()}</h3>
            </div>
          </StatCard>
          <StatCard>
            <div className="icon pending"><FaHourglassHalf /></div>
            <div className="details">
              <p>Pending Payout</p>
              <h3>Rs. {stats.pendingPayout.toLocaleString()}</h3>
            </div>
          </StatCard>
        </StatsGrid>

        <Banner>
          <FaInfoCircle />
          Earn <strong>Rs. {settings.cash_reward} cash reward</strong> OR <strong>Rs. {settings.fee_discount} fee discount</strong> for each successful enrollment.
        </Banner>

        <SectionTitle><FaUserFriends /> Your Referrals</SectionTitle>
        <ReferralList>
          {referrals.length === 0 ? (
            <Card style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No referrals yet. Share your code to get started!
            </Card>
          ) : (
            referrals.map((ref) => (
              <ReferralRow key={ref.id}>
                <div className="avatar-info">
                  <div className="avatar">{ref.referred_name?.[0] || '?'}</div>
                  <div className="info">
                    <h4>{ref.referred_name}</h4>
                    <p>{new Date(ref.referred_at).toLocaleDateString()}</p>
                    {ref.payout_reference && (
                      <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'block', marginTop: '2px' }}>
                        Ref: {ref.payout_reference}
                      </span>
                    )}
                  </div>
                </div>

                <div className="stepper">
                  <Stepper>
                    <div className={`step ${['registered', 'approved', 'enrolled'].includes(ref.status) ? 'completed' : ''}`}>
                      <div className="circle"><FaCheck /></div> Registered
                    </div>
                    <div className="line" />
                    <div className={`step ${['approved', 'enrolled'].includes(ref.status) ? 'completed' : ref.status === 'registered' ? 'active' : ''}`}>
                      <div className="circle">{['approved', 'enrolled'].includes(ref.status) ? <FaCheck /> : 2}</div> Approved
                    </div>
                    <div className="line" />
                    <div className={`step ${ref.status === 'enrolled' ? 'completed' : ref.status === 'approved' ? 'active' : ''}`}>
                      <div className="circle">{ref.status === 'enrolled' ? <FaCheck /> : 3}</div> Enrolled
                    </div>
                  </Stepper>
                </div>

                <div className={`reward-badge ${ref.payout_status}`}>
                  {ref.payout_status === 'paid' ? (
                    <><FaCheck /> Rs. {Number(ref.reward_amount || 1000).toLocaleString()} — Paid {ref.payout_method ? `(${ref.payout_method.replace('_', ' ')})` : ''}</>
                  ) : ref.payout_status === 'pending' ? (
                    <><FaHourglassHalf /> Rs. {Number(ref.reward_amount || 1000).toLocaleString()} — Pending Disbursal</>
                  ) : (
                    "Reward pending enrollment"
                  )}
                </div>
              </ReferralRow>
            ))
          )}
        </ReferralList>

      </Container>
    </DashboardLayout>
  );
};

export default ReferralPage;
