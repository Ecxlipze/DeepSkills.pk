import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { 
  FaUsers, FaCheckCircle, FaClock, FaMoneyBillWave,
  FaArrowLeft, FaSyncAlt, FaFileCsv, FaSearch,
  FaTimes, FaTimesCircle, FaUndo, FaEye, FaReceipt, FaWhatsapp, FaHandHoldingUsd,
  FaCheck, FaExclamationCircle, FaUserGraduate,
  FaChalkboardTeacher, FaCalendarAlt, FaIdCard, FaPhoneAlt,
  FaSlidersH, FaUserCheck
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import { SkeletonCard } from '../components/Skeleton';
import { createNotification } from '../utils/notifications';
import { createReferralPayoutPdf } from '../utils/financePdf';

const AdminReferral = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'paid' | 'settings'
  const [referrals, setReferrals] = useState([]);
  const [settings, setSettings] = useState({
    id: 1,
    cash_reward: 1000,
    fee_discount: 1500,
    is_active: true,
    max_referrals_per_user: 0
  });
  const [summary, setSummary] = useState({
    total: 0,
    enrolled: 0,
    pendingPayouts: 0,
    pendingAmount: 0,
    totalPaid: 0,
    conversionRate: 0
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'student' | 'teacher'
  const [filterRewardType, setFilterRewardType] = useState('all'); // 'all' | 'cash' | 'fee_discount'
  const [datePreset, setDatePreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modal States
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(null);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [payoutData, setPayoutData] = useState({
    type: 'cash',
    amount: 1000,
    method: 'bank_transfer',
    reference: '',
    notes: ''
  });

  // Fetch Referral Data
  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Prioritize server API endpoint
      const res = await fetch('/api/admin/finance/referrals');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReferrals(json.referrals || []);
          if (json.settings) setSettings(json.settings);
          if (json.summary) setSummary(json.summary);
          if (isManualRefresh) toast.success('Referral ledger refreshed');
          return;
        }
      }

      // Client-side fallback to direct Supabase queries
      const { data: sData } = await supabase.from('referral_settings').select('*').single();
      const currentSettings = sData || {
        id: 1,
        cash_reward: 1000,
        fee_discount: 1500,
        is_active: true,
        max_referrals_per_user: 0
      };
      setSettings(currentSettings);

      const { data: rData, error: rErr } = await supabase
        .from('referrals')
        .select('*')
        .order('referred_at', { ascending: false });

      if (rErr) throw rErr;
      const list = rData || [];

      // Collect IDs for hydration
      const studentIds = [];
      const teacherIds = [];
      const admissionIds = [];

      list.forEach(r => {
        if (r.referrer_id) {
          if (r.referrer_role === 'teacher') teacherIds.push(r.referrer_id);
          else studentIds.push(r.referrer_id);
        }
        if (r.referred_id) admissionIds.push(r.referred_id);
      });

      const studentMap = {};
      if (studentIds.length > 0) {
        const { data: studs } = await supabase
          .from('admissions')
          .select('id, name, course, batch, cnic, phone, email')
          .in('id', [...new Set(studentIds)]);
        (studs || []).forEach(s => { studentMap[s.id] = s; });
      }

      const teacherMap = {};
      if (teacherIds.length > 0) {
        const { data: tchrs } = await supabase
          .from('teachers')
          .select('id, name, specialization, cnic, phone, email')
          .in('id', [...new Set(teacherIds)]);
        (tchrs || []).forEach(t => { teacherMap[t.id] = t; });
      }

      const referredMap = {};
      if (admissionIds.length > 0) {
        const { data: adms } = await supabase
          .from('admissions')
          .select('id, name, course, batch, cnic, phone, email, status')
          .in('id', [...new Set(admissionIds)]);
        (adms || []).forEach(a => { referredMap[a.id] = a; });
      }

      const hydrated = list.map(r => {
        const isTeacher = r.referrer_role === 'teacher';
        const refMeta = isTeacher ? teacherMap[r.referrer_id] : studentMap[r.referrer_id];
        const referredMeta = r.referred_id ? referredMap[r.referred_id] : null;

        return {
          ...r,
          referrer_role: r.referrer_role || (refMeta?.specialization ? 'teacher' : 'student'),
          referrer_name: refMeta?.name || (isTeacher ? 'Faculty Member' : 'Student Referrer'),
          referrer_cnic: refMeta?.cnic || '',
          referrer_phone: refMeta?.phone || '',
          referrer_email: refMeta?.email || '',
          referrer_program: refMeta?.course || refMeta?.specialization || '',
          referrer_batch: refMeta?.batch || '',

          referred_name: r.referred_name || referredMeta?.name || 'Prospective Student',
          referred_phone: r.referred_phone || referredMeta?.phone || '',
          referred_email: r.referred_email || referredMeta?.email || '',
          referred_course: referredMeta?.course || '',
          referred_batch: referredMeta?.batch || '',
          referred_status: referredMeta?.status || r.status || 'registered',
          reward_amount: r.reward_amount || (r.reward_type === 'fee_discount' ? currentSettings.fee_discount : currentSettings.cash_reward)
        };
      });

      setReferrals(hydrated);

      // Compute stats
      const total = hydrated.length;
      const enrolled = hydrated.filter(r => r.status === 'enrolled' || r.status === 'approved').length;
      const pendingList = hydrated.filter(r => r.payout_status === 'pending');
      const pendingPayouts = pendingList.length;
      const pendingAmount = pendingList.reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);
      const paidList = hydrated.filter(r => r.payout_status === 'paid');
      const totalPaid = paidList.reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

      setSummary({
        total,
        enrolled,
        pendingPayouts,
        pendingAmount,
        totalPaid,
        conversionRate: total > 0 ? Math.round((enrolled / total) * 100) : 0
      });

      if (isManualRefresh) toast.success('Referral ledger refreshed');
    } catch (err) {
      console.error('Failed to load referral data:', err);
      toast.error('Failed to load referral payouts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date Range Bounds Logic
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (datePreset === 'all') return null;

    if (datePreset === 'today') {
      return { start: todayStr, end: todayStr, label: 'Today' };
    }

    if (datePreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { start, end: todayStr, label: 'This Month' };
    }

    if (datePreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { start, end, label: 'Last Month' };
    }

    if (datePreset === 'custom') {
      return {
        start: customStartDate || '1970-01-01',
        end: customEndDate || '2099-12-31',
        label: `${customStartDate || 'Start'} to ${customEndDate || 'End'}`
      };
    }

    return null;
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered Referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      // Tab filter
      if (activeTab === 'pending' && r.payout_status !== 'pending') return false;
      if (activeTab === 'paid' && r.payout_status !== 'paid') return false;

      // Role filter
      if (filterRole !== 'all') {
        const rRole = (r.referrer_role || 'student').toLowerCase();
        if (filterRole === 'student' && rRole === 'teacher') return false;
        if (filterRole === 'teacher' && rRole !== 'teacher') return false;
      }

      // Reward Type filter
      if (filterRewardType !== 'all') {
        const rType = (r.reward_type || 'cash').toLowerCase();
        if (rType !== filterRewardType) return false;
      }

      // Date Range filter
      if (dateRangeBounds && r.referred_at) {
        const dStr = r.referred_at.slice(0, 10);
        if (dStr < dateRangeBounds.start || dStr > dateRangeBounds.end) {
          return false;
        }
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refName = (r.referrer_name || '').toLowerCase();
        const refRole = (r.referrer_role || '').toLowerCase();
        const refPhone = (r.referrer_phone || '').toLowerCase();
        const refCnic = (r.referrer_cnic || '').toLowerCase();
        const referredName = (r.referred_name || '').toLowerCase();
        const referredCourse = (r.referred_course || '').toLowerCase();
        const refNum = (r.payout_reference || '').toLowerCase();

        const match = 
          refName.includes(q) ||
          refRole.includes(q) ||
          refPhone.includes(q) ||
          refCnic.includes(q) ||
          referredName.includes(q) ||
          referredCourse.includes(q) ||
          refNum.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [referrals, activeTab, filterRole, filterRewardType, dateRangeBounds, searchQuery]);

  // Open Payout Modal
  const handleOpenPayoutModal = (refItem) => {
    setShowPayoutModal(refItem);
    setPayoutData({
      type: refItem.reward_type || 'cash',
      amount: refItem.reward_amount || (refItem.reward_type === 'fee_discount' ? settings.fee_discount : settings.cash_reward),
      method: 'bank_transfer',
      reference: '',
      notes: ''
    });
  };

  // Submit Payout Approval
  const handleApprovePayout = async (e) => {
    if (e) e.preventDefault();
    if (!showPayoutModal) return;

    setIsProcessingPayout(true);
    try {
      const payload = {
        action: 'approve_payout',
        referral_id: showPayoutModal.id,
        reward_type: payoutData.type,
        reward_amount: Number(payoutData.amount) || 1000,
        payout_method: payoutData.method,
        payout_reference: payoutData.reference || `REF-${Date.now().toString().slice(-6)}`,
        payout_notes: payoutData.notes
      };

      const res = await fetch('/api/admin/finance/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          toast.success(`Commission disbursed to ${showPayoutModal.referrer_name}!`);

          // Auto generate and download official Voucher PDF
          try {
            const voucherPdf = createReferralPayoutPdf({
              referral: {
                ...showPayoutModal,
                reward_amount: payload.reward_amount,
                reward_type: payload.reward_type,
                payout_method: payload.payout_method,
                payout_reference: payload.payout_reference,
                payout_notes: payload.payout_notes,
                payout_approved_at: new Date().toISOString()
              },
              referrer: {
                name: showPayoutModal.referrer_name,
                role: showPayoutModal.referrer_role,
                cnic: showPayoutModal.referrer_cnic,
                phone: showPayoutModal.referrer_phone,
                course: showPayoutModal.referrer_program
              },
              referred: {
                name: showPayoutModal.referred_name,
                course: showPayoutModal.referred_course,
                batch: showPayoutModal.referred_batch,
                phone: showPayoutModal.referred_phone
              }
            });
            const safeName = (showPayoutModal.referrer_name || 'Referral').replace(/\s+/g, '_');
            voucherPdf.save(`DeepSkills_Referral_Voucher_${safeName}.pdf`);
          } catch (pdfErr) {
            console.error('PDF auto-download note:', pdfErr);
          }

          setShowPayoutModal(null);
          fetchData();
          return;
        }
      }

      // Fallback direct Supabase update
      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from('referrals')
        .update({
          payout_status: 'paid',
          reward_type: payoutData.type,
          reward_amount: Number(payoutData.amount) || 1000,
          payout_method: payoutData.method,
          payout_reference: payoutData.reference || `REF-${Date.now().toString().slice(-6)}`,
          payout_notes: payoutData.notes,
          payout_approved_at: nowIso
        })
        .eq('id', showPayoutModal.id);

      if (updErr) throw updErr;

      // Also record in payments table as cash outflow
      await supabase.from('payments').insert([
        {
          entity_id: showPayoutModal.referrer_id,
          entity_type: 'referrer',
          amount: Number(payoutData.amount) || 1000,
          paid_date: nowIso.split('T')[0],
          method: payoutData.method,
          reference_number: payoutData.reference || `REF-${Date.now().toString().slice(-6)}`,
          description: `Referral Reward - Referred ${showPayoutModal.referred_name || 'Student'}`,
          notes: payoutData.notes || 'Referral payout approved by Admin',
          status: 'paid'
        }
      ]);

      await createNotification({
        userId: showPayoutModal.referrer_id,
        role: showPayoutModal.referrer_role || 'student',
        type: 'referral_payout',
        title: 'Referral Reward Paid',
        message: `Your referral commission of Rs. ${Number(payoutData.amount).toLocaleString()} has been approved and disbursed.`,
        link: showPayoutModal.referrer_role === 'teacher' ? '/teacher/referral' : '/student/referral',
        sendEmail: false
      });

      toast.success(`Commission disbursed to ${showPayoutModal.referrer_name}!`);
      setShowPayoutModal(null);
      fetchData();
    } catch (err) {
      console.error('Failed to approve payout:', err);
      toast.error('Failed to approve payout: ' + (err.message || ''));
    } finally {
      setIsProcessingPayout(false);
    }
  };

  // Download Voucher PDF for Paid Referral
  const handleDownloadVoucher = (r) => {
    try {
      const doc = createReferralPayoutPdf({
        referral: r,
        referrer: {
          name: r.referrer_name,
          role: r.referrer_role,
          cnic: r.referrer_cnic,
          phone: r.referrer_phone,
          course: r.referrer_program
        },
        referred: {
          name: r.referred_name,
          course: r.referred_course,
          batch: r.referred_batch,
          phone: r.referred_phone
        }
      });
      const safeName = (r.referrer_name || 'Referral').replace(/\s+/g, '_');
      doc.save(`DeepSkills_Referral_Voucher_${safeName}.pdf`);
      toast.success('Referral Payout Voucher downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to download voucher: ' + (err.message || ''));
    }
  };

  // Save Settings
  const handleUpdateSettings = async (e) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/finance/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          ...settings
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          toast.success('Referral settings updated successfully');
          return;
        }
      }

      // Fallback direct Supabase upsert
      const { error } = await supabase
        .from('referral_settings')
        .upsert(settings);

      if (error) throw error;
      toast.success('Referral settings updated successfully');
    } catch (err) {
      console.error('Settings update error:', err);
      toast.error('Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (filteredReferrals.length === 0) {
      toast.error('No referral records matching current filter to export.');
      return;
    }

    const headers = [
      'Referral ID',
      'Referrer Name',
      'Referrer Role',
      'Referrer CNIC',
      'Referrer Phone',
      'Referred Student',
      'Enrolled Program',
      'Batch',
      'Referral Date',
      'Enrollment Status',
      'Reward Type',
      'Reward Amount (PKR)',
      'Payout Status',
      'Disbursement Date',
      'Payment Method',
      'Reference Slip #'
    ];

    const escapeCsv = (val) => {
      const s = String(val == null ? '' : val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [headers.join(',')];
    filteredReferrals.forEach(r => {
      const row = [
        escapeCsv(r.id),
        escapeCsv(r.referrer_name),
        escapeCsv(r.referrer_role),
        escapeCsv(r.referrer_cnic),
        escapeCsv(r.referrer_phone),
        escapeCsv(r.referred_name),
        escapeCsv(r.referred_course),
        escapeCsv(r.referred_batch),
        escapeCsv(r.referred_at ? r.referred_at.slice(0, 10) : ''),
        escapeCsv(r.status),
        escapeCsv(r.reward_type),
        escapeCsv(r.reward_amount),
        escapeCsv(r.payout_status),
        escapeCsv(r.payout_approved_at ? r.payout_approved_at.slice(0, 10) : ''),
        escapeCsv(r.payout_method),
        escapeCsv(r.payout_reference)
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DeepSkills_Referral_Payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Referral records exported to CSV!');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterRewardType('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const hasActiveFilters = 
    Boolean(searchQuery) ||
    filterRole !== 'all' ||
    filterRewardType !== 'all' ||
    datePreset !== 'all';

  const getInitials = (name) => {
    if (!name) return 'RP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return String(d).slice(0, 10);
    }
  };

  return (
    <AdminLayout>
      <Container>
        {/* TOP HEADER */}
        <HeaderWrap>
          <div className="title-block">
            <BreadcrumbRow>
              <button type="button" onClick={() => router.push('/admin/finance')} className="back-link">
                <FaArrowLeft /> Finance
              </button>
              <span className="divider">/</span>
              <span className="current">Referral Payouts</span>
            </BreadcrumbRow>
            <h1>Referral Payouts &amp; Commission Management</h1>
            <p>Audit, disburse, and manage student and faculty referral commission incentives with automated cash flow ledger sync.</p>
          </div>

          <ActionCluster>
            <ActionButton 
              type="button" 
              onClick={() => fetchData(true)} 
              disabled={loading || refreshing}
              title="Refresh referral records"
            >
              <FaSyncAlt className={loading || refreshing ? 'spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </ActionButton>
            <ActionButton 
              type="button" 
              onClick={handleExportCsv}
              disabled={filteredReferrals.length === 0}
              title="Export filtered records to CSV"
            >
              <FaFileCsv /> Export CSV
            </ActionButton>
            <ActionButton 
              type="button" 
              $primary 
              onClick={() => setActiveTab('settings')}
              title="Configure referral rewards & policies"
            >
              <FaSlidersH /> Program Settings
            </ActionButton>
          </ActionCluster>
        </HeaderWrap>

        {/* 4 HIGH-CONTRAST STATS CARDS */}
        <StatsGrid>
          <StatCard $color="#38BDF8">
            <div className="top-meta">
              <span className="lbl">Total Referrals</span>
              <span className="badge sky"><FaUsers /> Pipeline</span>
            </div>
            <div className="val sky">{summary.total}</div>
            <div className="sub">
              {summary.conversionRate}% Overall Conversion Rate
            </div>
          </StatCard>

          <StatCard $color="#10B981">
            <div className="top-meta">
              <span className="lbl">Converted Enrollments</span>
              <span className="badge green"><FaUserCheck /> Enrolled</span>
            </div>
            <div className="val green">{summary.enrolled}</div>
            <div className="sub">
              Verified Course Admissions
            </div>
          </StatCard>

          <StatCard $color="#F59E0B">
            <div className="top-meta">
              <span className="lbl">Pending Payouts</span>
              <span className="badge amber"><FaClock /> Action Required</span>
            </div>
            <div className="val amber">Rs. {summary.pendingAmount.toLocaleString()}</div>
            <div className="sub">
              {summary.pendingPayouts} Commission Claims Pending
            </div>
          </StatCard>

          <StatCard $color="#8B5CF6">
            <div className="top-meta">
              <span className="lbl">Commissions Disbursed</span>
              <span className="badge purple"><FaMoneyBillWave /> Outflow</span>
            </div>
            <div className="val purple">Rs. {summary.totalPaid.toLocaleString()}</div>
            <div className="sub">
              Total Recorded Cash &amp; Fee Concessions
            </div>
          </StatCard>
        </StatsGrid>

        {/* TAB NAVIGATION */}
        <TabBarContainer>
          <TabBar>
            <TabButton 
              type="button" 
              $active={activeTab === 'all'} 
              onClick={() => setActiveTab('all')}
            >
              All Referrals ({referrals.length})
            </TabButton>
            <TabButton 
              type="button" 
              $active={activeTab === 'pending'} 
              onClick={() => setActiveTab('pending')}
            >
              Pending Payouts
              {summary.pendingPayouts > 0 && (
                <span className="count-pill">{summary.pendingPayouts}</span>
              )}
            </TabButton>
            <TabButton 
              type="button" 
              $active={activeTab === 'paid'} 
              onClick={() => setActiveTab('paid')}
            >
              Disbursed Commissions
            </TabButton>
            <TabButton 
              type="button" 
              $active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
            >
              Reward Policies &amp; Settings
            </TabButton>
          </TabBar>
        </TabBarContainer>

        {activeTab !== 'settings' ? (
          <>
            {/* MULTI-CRITERIA FILTER CARD */}
            <FilterCard>
              <FilterTopRow>
                <SearchInputWrap>
                  <FaSearch className="search-icon" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by referrer, student, phone, CNIC, reference..."
                  />
                  {searchQuery && (
                    <button type="button" className="clear-btn" onClick={() => setSearchQuery('')}>
                      <FaTimes />
                    </button>
                  )}
                </SearchInputWrap>

                <SelectWrap>
                  <label>Referrer Role</label>
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="all">All Referrers (Combined)</option>
                    <option value="student">Students Only</option>
                    <option value="teacher">Faculty Members Only</option>
                  </select>
                </SelectWrap>

                <SelectWrap>
                  <label>Reward Type</label>
                  <select value={filterRewardType} onChange={(e) => setFilterRewardType(e.target.value)}>
                    <option value="all">All Reward Types</option>
                    <option value="cash">Cash Reward (PKR)</option>
                    <option value="fee_discount">Tuition Fee Discount</option>
                  </select>
                </SelectWrap>

                <SelectWrap>
                  <label>Date Window</label>
                  <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="custom">Custom Date Range...</option>
                  </select>
                </SelectWrap>
              </FilterTopRow>

              {datePreset === 'custom' && (
                <CustomDateRow>
                  <div className="custom-input-group">
                    <label><FaCalendarAlt /> Start Date</label>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="custom-input-group">
                    <label><FaCalendarAlt /> End Date</label>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)} 
                    />
                  </div>
                </CustomDateRow>
              )}

              <FilterMetaRow>
                <div className="meta-info">
                  Showing <strong>{filteredReferrals.length}</strong> of {referrals.length} referrals
                  {dateRangeBounds && <span> • Period: <strong>{dateRangeBounds.label}</strong></span>}
                  {filterRole !== 'all' && <span> • Role: <strong>{filterRole.toUpperCase()}</strong></span>}
                  {filterRewardType !== 'all' && <span> • Reward: <strong>{filterRewardType === 'cash' ? 'Cash' : 'Fee Discount'}</strong></span>}
                </div>
                {hasActiveFilters && (
                  <button type="button" className="reset-btn" onClick={handleResetFilters}>
                    <FaUndo /> Reset all filters
                  </button>
                )}
              </FilterMetaRow>
            </FilterCard>

            {/* MASTER REFERRAL TABLE */}
            <TableCard>
              <TableContainer>
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>Beneficiary Referrer</th>
                      <th style={{ minWidth: '220px' }}>Referred Student</th>
                      <th style={{ minWidth: '110px' }}>Logged Date</th>
                      <th style={{ minWidth: '110px' }}>Enrollment</th>
                      <th style={{ minWidth: '130px', textAlign: 'right' }}>Reward (PKR)</th>
                      <th style={{ minWidth: '110px' }}>Payout Status</th>
                      <th style={{ minWidth: '160px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map(r => {
                      const isTeacher = (r.referrer_role || '').toLowerCase() === 'teacher';
                      const isPending = r.payout_status === 'pending';
                      const isPaid = r.payout_status === 'paid';
                      const isEnrolled = r.status === 'enrolled' || r.status === 'approved';

                      return (
                        <tr key={r.id}>
                          {/* Referrer */}
                          <td>
                            <CounterpartyCell>
                              <AvatarCircle $isTeacher={isTeacher}>
                                {getInitials(r.referrer_name)}
                              </AvatarCircle>
                              <div className="person-details">
                                <div className="name-row">
                                  <span className="name">{r.referrer_name || 'Referrer'}</span>
                                  <RoleBadge $isTeacher={isTeacher}>
                                    {isTeacher ? <><FaChalkboardTeacher /> Faculty</> : <><FaUserGraduate /> Student</>}
                                  </RoleBadge>
                                </div>
                                <div className="contact-sub">
                                  {r.referrer_cnic && <span><FaIdCard /> {r.referrer_cnic}</span>}
                                  {r.referrer_phone && <span><FaPhoneAlt /> {r.referrer_phone}</span>}
                                </div>
                              </div>
                            </CounterpartyCell>
                          </td>

                          {/* Referred Student */}
                          <td>
                            <div style={{ fontWeight: '700', color: '#fff' }}>{r.referred_name || 'Prospective Student'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              {r.referred_course || 'Course Not Assigned'}
                              {r.referred_batch ? ` • ${r.referred_batch}` : ''}
                            </div>
                            {r.referred_phone && (
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                <FaPhoneAlt size={9} style={{ marginRight: '4px' }} /> {r.referred_phone}
                              </div>
                            )}
                          </td>

                          {/* Logged Date */}
                          <td>
                            <div style={{ fontWeight: '500', color: '#cbd5e1' }}>{formatDate(r.referred_at)}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ID: {String(r.id).slice(0, 8)}</div>
                          </td>

                          {/* Enrollment Status */}
                          <td>
                            <EnrollmentPill $enrolled={isEnrolled}>
                              {isEnrolled ? <><FaCheckCircle /> Enrolled</> : <><FaClock /> Registered</>}
                            </EnrollmentPill>
                          </td>

                          {/* Reward Amount */}
                          <td style={{ textAlign: 'right' }}>
                            <AmountTag>
                              Rs. {Number(r.reward_amount || 1000).toLocaleString()}
                            </AmountTag>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                              {r.reward_type === 'fee_discount' ? 'Fee Concession' : 'Cash Incentive'}
                            </div>
                          </td>

                          {/* Payout Status */}
                          <td>
                            {isPaid ? (
                              <StatusDotBadge $status="paid">
                                <span className="dot" /> Paid Out
                              </StatusDotBadge>
                            ) : isPending ? (
                              <StatusDotBadge $status="pending">
                                <span className="dot" /> Pending
                              </StatusDotBadge>
                            ) : (
                              <StatusDotBadge $status="not_earned">
                                <span className="dot" /> Ineligible
                              </StatusDotBadge>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <ActionRow>
                              {isPending && (
                                <TableBtn 
                                  type="button" 
                                  $accent 
                                  onClick={() => handleOpenPayoutModal(r)}
                                  title="Disburse commission and update ledger"
                                >
                                  <FaHandHoldingUsd /> Disburse
                                </TableBtn>
                              )}

                              {isPaid && (
                                <TableBtn 
                                  type="button" 
                                  $accent 
                                  onClick={() => handleDownloadVoucher(r)}
                                  title="Download branded Referral Payout Voucher PDF"
                                >
                                  <FaReceipt /> Voucher
                                </TableBtn>
                              )}

                              <TableBtn 
                                type="button" 
                                onClick={() => setSelectedReferral(r)}
                                title="Inspect full referral particulars"
                              >
                                <FaEye /> Inspect
                              </TableBtn>

                              {r.referrer_phone && (
                                <TableBtn 
                                  as="a"
                                  href={`https://wa.me/${String(r.referrer_phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                    `Hello ${r.referrer_name}, regarding your referral for ${r.referred_name}: ${
                                      isPaid ? `Your commission of Rs. ${r.reward_amount} has been successfully disbursed via ${r.payout_method || 'bank transfer'} (Ref: ${r.payout_reference || 'Completed'}).` : `The referral is currently ${isPending ? 'approved and queued for disbursement.' : 'recorded and pending enrollment verification.'}`
                                    }`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Send WhatsApp update to referrer"
                                >
                                  <FaWhatsapp />
                                </TableBtn>
                              )}
                            </ActionRow>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredReferrals.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7}>
                          <EmptyStateCard>
                            <FaExclamationCircle size={36} />
                            <h4>No referral records matching filter criteria</h4>
                            <p>Try adjusting your search query, role filter, or date window.</p>
                            {hasActiveFilters && (
                              <button type="button" onClick={handleResetFilters}>
                                <FaUndo /> Reset all filters
                              </button>
                            )}
                          </EmptyStateCard>
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                          <FaSyncAlt className="spin" size={24} style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                          Loading referral payouts ledger...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableContainer>
            </TableCard>
          </>
        ) : (
          /* PROGRAM SETTINGS CARD */
          <SettingsCard>
            <div className="card-header">
              <h3>Referral Program Commission Policies</h3>
              <p>Configure institutional referral incentives for students and instructors.</p>
            </div>

            <form onSubmit={handleUpdateSettings}>
              <SettingsGrid>
                <SettingItem>
                  <label>Cash Commission Reward (PKR)</label>
                  <input 
                    type="number" 
                    value={settings.cash_reward} 
                    onChange={(e) => setSettings({ ...settings, cash_reward: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 1000"
                    min="0"
                    required
                  />
                  <div className="desc">Direct monetary payout disbursed to the referrer upon student enrollment.</div>
                </SettingItem>

                <SettingItem>
                  <label>Tuition Fee Concession / Discount (PKR)</label>
                  <input 
                    type="number" 
                    value={settings.fee_discount} 
                    onChange={(e) => setSettings({ ...settings, fee_discount: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 1500"
                    min="0"
                    required
                  />
                  <div className="desc">Tuition fee waiver amount credited to a student referrer's fee account.</div>
                </SettingItem>

                <SettingItem>
                  <label>Max Referrals Per Recruiter (0 = Unlimited)</label>
                  <input 
                    type="number" 
                    value={settings.max_referrals_per_user} 
                    onChange={(e) => setSettings({ ...settings, max_referrals_per_user: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  <div className="desc">Cap on rewarded referrals per individual user.</div>
                </SettingItem>

                <SettingItem>
                  <label>Program Operational Status</label>
                  <div className="toggle-group">
                    <button 
                      type="button" 
                      className={`status-btn ${settings.is_active ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, is_active: true })}
                    >
                      <FaCheckCircle /> Active &amp; Accepting Referrals
                    </button>
                    <button 
                      type="button" 
                      className={`status-btn ${!settings.is_active ? 'paused' : ''}`}
                      onClick={() => setSettings({ ...settings, is_active: false })}
                    >
                      <FaTimesCircle /> Paused Temporarily
                    </button>
                  </div>
                </SettingItem>
              </SettingsGrid>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <ActionButton type="submit" $primary disabled={isSavingSettings}>
                  {isSavingSettings ? 'Saving Policy Settings...' : 'Save Referral Policies'}
                </ActionButton>
              </div>
            </form>
          </SettingsCard>
        )}

        {/* PAYOUT DISBURSEMENT MODAL */}
        <AnimatePresence>
          {showPayoutModal && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPayoutModal(null)}
            >
              <ModalContent
                initial={{ y: 20, scale: 0.96 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <div className="title-area">
                    <h3>Disburse Referral Commission</h3>
                    <span className="sub-id">ID: {showPayoutModal.id}</span>
                  </div>
                  <button type="button" onClick={() => setShowPayoutModal(null)}><FaTimes /></button>
                </ModalHeader>

                <ModalBanner $isCash={payoutData.type === 'cash'}>
                  <div className="banner-left">
                    <span className="flow-lbl">COMMISSION DISBURSEMENT OUTFLOW</span>
                    <h2>Rs. {Number(payoutData.amount || 0).toLocaleString()}</h2>
                  </div>
                  <div className="banner-right">
                    <div className="party-name">{showPayoutModal.referrer_name}</div>
                    <div className="party-role">{showPayoutModal.referrer_role === 'teacher' ? 'Faculty Instructor' : 'Student Recruiter'}</div>
                  </div>
                </ModalBanner>

                <form onSubmit={handleApprovePayout}>
                  <ModalFormBody>
                    {/* Referrer & Referred Summary Box */}
                    <div className="dual-info-box">
                      <div className="info-block">
                        <span className="info-lbl">Referrer (Beneficiary)</span>
                        <strong>{showPayoutModal.referrer_name}</strong>
                        <span>CNIC: {showPayoutModal.referrer_cnic || 'On Record'}</span>
                      </div>
                      <div className="info-divider" />
                      <div className="info-block">
                        <span className="info-lbl">Referred Student</span>
                        <strong>{showPayoutModal.referred_name}</strong>
                        <span>Course: {showPayoutModal.referred_course || 'Enrollment'}</span>
                      </div>
                    </div>

                    <FormRow>
                      <FormGroup>
                        <label>Reward Mode</label>
                        <select 
                          value={payoutData.type}
                          onChange={(e) => setPayoutData({
                            ...payoutData,
                            type: e.target.value,
                            amount: e.target.value === 'fee_discount' ? settings.fee_discount : settings.cash_reward
                          })}
                        >
                          <option value="cash">Cash Commission Payout (Outflow)</option>
                          <option value="fee_discount">Tuition Fee Concession Voucher</option>
                        </select>
                      </FormGroup>

                      <FormGroup>
                        <label>Disbursement Amount (PKR)</label>
                        <input 
                          type="number" 
                          value={payoutData.amount}
                          onChange={(e) => setPayoutData({ ...payoutData, amount: e.target.value })}
                          min="1"
                          required
                        />
                      </FormGroup>
                    </FormRow>

                    <FormRow>
                      <FormGroup>
                        <label>Payment Method</label>
                        <select 
                          value={payoutData.method}
                          onChange={(e) => setPayoutData({ ...payoutData, method: e.target.value })}
                        >
                          <option value="bank_transfer">Bank Transfer / IBFT</option>
                          <option value="cash">Cash Voucher</option>
                          <option value="online">Online / EasyPaisa / JazzCash</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </FormGroup>

                      <FormGroup>
                        <label>Bank Slip / Ref ID (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. IBFT-98124 or Cheque #4912"
                          value={payoutData.reference}
                          onChange={(e) => setPayoutData({ ...payoutData, reference: e.target.value })}
                        />
                      </FormGroup>
                    </FormRow>

                    <FormGroup>
                      <label>Bookkeeping Remarks / Settlement Notes</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Cleared from DeepSkills promotional commission fund"
                        value={payoutData.notes}
                        onChange={(e) => setPayoutData({ ...payoutData, notes: e.target.value })}
                      />
                    </FormGroup>
                  </ModalFormBody>

                  <ModalFooter>
                    <ActionButton type="button" onClick={() => setShowPayoutModal(null)}>
                      Cancel
                    </ActionButton>
                    <ActionButton type="submit" $primary disabled={isProcessingPayout}>
                      <FaHandHoldingUsd /> {isProcessingPayout ? 'Processing Settlement...' : 'Confirm & Disburse Payout'}
                    </ActionButton>
                  </ModalFooter>
                </form>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* REFERRAL DETAILS INSPECTION MODAL */}
        <AnimatePresence>
          {selectedReferral && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReferral(null)}
            >
              <ModalContent
                initial={{ y: 20, scale: 0.96 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalHeader>
                  <div className="title-area">
                    <h3>Referral Audit Particulars</h3>
                    <span className="sub-id">ID: {selectedReferral.id}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedReferral(null)}><FaTimes /></button>
                </ModalHeader>

                <ModalGrid>
                  <KeyValGroup>
                    <label>Referrer (Beneficiary)</label>
                    <div className="val">{selectedReferral.referrer_name}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Recruiter Role</label>
                    <div className="val" style={{ textTransform: 'capitalize' }}>
                      {selectedReferral.referrer_role === 'teacher' ? 'Faculty Instructor' : 'Student Recruiter'}
                    </div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Referrer CNIC</label>
                    <div className="val font-mono">{selectedReferral.referrer_cnic || 'Not registered'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Referrer Phone</label>
                    <div className="val">{selectedReferral.referrer_phone || 'Not provided'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Referred Student</label>
                    <div className="val">{selectedReferral.referred_name}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Enrolled Program</label>
                    <div className="val">{selectedReferral.referred_course || 'Vocational Tech Program'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Date Referred</label>
                    <div className="val">{formatDate(selectedReferral.referred_at)}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Enrollment Status</label>
                    <div className="val">{selectedReferral.status || 'Registered'}</div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Reward Rate</label>
                    <div className="val" style={{ color: '#34D399' }}>
                      Rs. {Number(selectedReferral.reward_amount || 1000).toLocaleString()} ({selectedReferral.reward_type === 'fee_discount' ? 'Fee Concession' : 'Cash Payout'})
                    </div>
                  </KeyValGroup>

                  <KeyValGroup>
                    <label>Payout Status</label>
                    <div className="val" style={{ textTransform: 'capitalize' }}>
                      {selectedReferral.payout_status || 'not_earned'}
                    </div>
                  </KeyValGroup>

                  {selectedReferral.payout_status === 'paid' && (
                    <>
                      <KeyValGroup>
                        <label>Settlement Date</label>
                        <div className="val">{formatDate(selectedReferral.payout_approved_at)}</div>
                      </KeyValGroup>

                      <KeyValGroup>
                        <label>Payment Method &amp; Ref</label>
                        <div className="val">
                          {String(selectedReferral.payout_method || 'bank').replace('_', ' ')}
                          {selectedReferral.payout_reference ? ` • Ref: ${selectedReferral.payout_reference}` : ''}
                        </div>
                      </KeyValGroup>
                    </>
                  )}

                  {selectedReferral.payout_notes && (
                    <KeyValGroup style={{ gridColumn: '1 / -1' }}>
                      <label>Bookkeeping Remarks</label>
                      <div className="val notes-box">{selectedReferral.payout_notes}</div>
                    </KeyValGroup>
                  )}
                </ModalGrid>

                <ModalFooter>
                  <ActionButton type="button" onClick={() => setSelectedReferral(null)}>
                    Close
                  </ActionButton>
                  {selectedReferral.payout_status === 'paid' && (
                    <ActionButton 
                      type="button" 
                      $primary 
                      onClick={() => {
                        handleDownloadVoucher(selectedReferral);
                        setSelectedReferral(null);
                      }}
                    >
                      <FaReceipt /> Download Payout Voucher (PDF)
                    </ActionButton>
                  )}
                </ModalFooter>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </AdminLayout>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 0 40px 0;
  color: #fff;

  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
`;

const HeaderWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
  flex-wrap: wrap;

  .title-block {
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #fff;
      margin: 6px 0 4px 0;
      letter-spacing: -0.02em;
    }
    p {
      color: #94a3b8;
      font-size: 0.92rem;
      margin: 0;
    }
  }
`;

const BreadcrumbRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: #64748b;

  .back-link {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    font-size: 0.82rem;
    font-weight: 600;
    transition: color 0.2s;

    &:hover {
      color: #38bdf8;
    }
  }

  .divider {
    color: #475569;
  }

  .current {
    color: #e2e8f0;
    font-weight: 600;
  }
`;

const ActionCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  background: ${props => props.$primary 
    ? 'linear-gradient(135deg, #7B1F2E 0%, #a82e41 100%)' 
    : '#111318'};
  color: ${props => props.$primary ? '#fff' : '#e2e8f0'};
  border: 1px solid ${props => props.$primary ? '#7B1F2E' : 'rgba(255, 255, 255, 0.1)'};
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: ${props => props.$primary ? '0 4px 14px rgba(123, 31, 46, 0.35)' : 'none'};

  &:hover:not(:disabled) {
    background: ${props => props.$primary 
      ? 'linear-gradient(135deg, #912437 0%, #b83348 100%)' 
      : 'rgba(255, 255, 255, 0.06)'};
    border-color: ${props => props.$primary ? '#b83348' : 'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 4px solid ${props => props.$color || '#38bdf8'};
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;

  .top-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .lbl {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;

      &.green {
        background: rgba(16, 185, 129, 0.12);
        color: #10B981;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }

      &.amber {
        background: rgba(245, 158, 11, 0.12);
        color: #F59E0B;
        border: 1px solid rgba(245, 158, 11, 0.25);
      }

      &.sky {
        background: rgba(56, 189, 248, 0.12);
        color: #38BDF8;
        border: 1px solid rgba(56, 189, 248, 0.25);
      }

      &.purple {
        background: rgba(139, 92, 246, 0.12);
        color: #A78BFA;
        border: 1px solid rgba(139, 92, 246, 0.25);
      }
    }
  }

  .val {
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;

    &.green { color: #10B981; }
    &.amber { color: #F59E0B; }
    &.sky { color: #38BDF8; }
    &.purple { color: #C4B5FD; }
  }

  .sub {
    font-size: 0.78rem;
    color: #64748b;
  }
`;

const TabBarContainer = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 6px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
`;

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`;

const TabButton = styled.button`
  padding: 10px 18px;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.08)' : 'transparent'};
  border: 1px solid ${props => props.$active ? 'rgba(255, 255, 255, 0.14)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : '#94a3b8'};
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.86rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.04);
  }

  .count-pill {
    background: #f59e0b;
    color: #000;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 1px 7px;
    border-radius: 10px;
  }
`;

const FilterCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
`;

const FilterTopRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 14px;
  align-items: flex-end;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const SearchInputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    left: 14px;
    color: #64748b;
    pointer-events: none;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 10px 38px 10px 38px;
    border-radius: 10px;
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #38bdf8;
      background: rgba(255, 255, 255, 0.05);
    }

    &::placeholder {
      color: #64748b;
    }
  }

  .clear-btn {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
    font-size: 0.85rem;

    &:hover {
      color: #e2e8f0;
    }
  }
`;

const SelectWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.74rem;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  select {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.86rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;

    &:focus {
      border-color: #38bdf8;
    }

    option {
      background: #111318;
      color: #fff;
    }
  }
`;

const CustomDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  flex-wrap: wrap;

  .custom-input-group {
    display: flex;
    align-items: center;
    gap: 10px;

    label {
      font-size: 0.8rem;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }

    input[type="date"] {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 0.84rem;
      outline: none;
    }
  }
`;

const FilterMetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 0.82rem;
  color: #64748b;
  flex-wrap: wrap;
  gap: 10px;

  .meta-info {
    strong { color: #cbd5e1; }
    span { color: #94a3b8; }
  }

  .reset-btn {
    background: none;
    border: none;
    color: #f87171;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;

    &:hover {
      color: #ef4444;
      text-decoration: underline;
    }
  }
`;

const TableCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
`;

const TableContainer = styled.div`
  overflow-x: auto;
  width: 100%;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;

    thead {
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);

      th {
        text-align: left;
        padding: 14px 18px;
        font-size: 0.74rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        transition: background 0.15s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        &:last-child {
          border-bottom: none;
        }

        td {
          padding: 14px 18px;
          vertical-align: middle;
          color: #e2e8f0;
        }
      }
    }
  }
`;

const CounterpartyCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .person-details {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .name-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .name {
        font-weight: 700;
        color: #fff;
        font-size: 0.9rem;
      }
    }

    .contact-sub {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.74rem;
      color: #64748b;

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
`;

const AvatarCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
  flex-shrink: 0;
  background: ${props => props.$isTeacher
    ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
    : 'linear-gradient(135deg, #10B981 0%, #047857 100%)'};
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const RoleBadge = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 4px;
  background: ${props => props.$isTeacher ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)'};
  color: ${props => props.$isTeacher ? '#A78BFA' : '#34D399'};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const EnrollmentPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${props => props.$enrolled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'};
  color: ${props => props.$enrolled ? '#10B981' : '#F59E0B'};
  border: 1px solid ${props => props.$enrolled ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'};
`;

const AmountTag = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.94rem;
  font-weight: 700;
  color: #fff;
`;

const StatusDotBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  color: ${props => {
    if (props.$status === 'paid') return '#10B981';
    if (props.$status === 'pending') return '#F59E0B';
    return '#64748b';
  }};

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => {
      if (props.$status === 'paid') return '#10B981';
      if (props.$status === 'pending') return '#F59E0B';
      return '#64748b';
    }};
    box-shadow: ${props => {
      if (props.$status === 'paid') return '0 0 6px rgba(16, 185, 129, 0.8)';
      if (props.$status === 'pending') return '0 0 6px rgba(245, 158, 11, 0.8)';
      return 'none';
    }};
  }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
`;

const TableBtn = styled.button`
  background: ${props => props.$accent 
    ? 'rgba(16, 185, 129, 0.1)' 
    : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${props => props.$accent 
    ? 'rgba(16, 185, 129, 0.3)' 
    : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$accent ? '#34D399' : '#cbd5e1'};
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.$accent 
      ? 'rgba(16, 185, 129, 0.2)' 
      : 'rgba(255, 255, 255, 0.08)'};
    border-color: ${props => props.$accent ? '#10B981' : 'rgba(255, 255, 255, 0.2)'};
    color: #fff;
  }
`;

const EmptyStateCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #64748b;

  svg { color: #475569; margin-bottom: 12px; }
  h4 { font-size: 1.05rem; font-weight: 700; color: #e2e8f0; margin: 0 0 6px 0; }
  p { font-size: 0.86rem; color: #94a3b8; margin: 0 0 16px 0; max-width: 440px; }

  button {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }
`;

const SettingsCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  .card-header {
    margin-bottom: 24px;
    h3 { font-size: 1.2rem; font-weight: 800; color: #fff; margin: 0 0 4px 0; }
    p { font-size: 0.88rem; color: #94a3b8; margin: 0; }
  }
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SettingItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 0.84rem;
    font-weight: 700;
    color: #e2e8f0;
  }

  input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 11px 14px;
    color: #fff;
    font-size: 0.92rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus { border-color: #38bdf8; }
  }

  .desc {
    font-size: 0.78rem;
    color: #64748b;
    line-height: 1.4;
  }

  .toggle-group {
    display: flex;
    gap: 10px;

    .status-btn {
      flex: 1;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
      color: #94a3b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;

      &.active {
        background: rgba(16, 185, 129, 0.15);
        border-color: #10B981;
        color: #10B981;
      }

      &.paused {
        background: rgba(239, 68, 68, 0.15);
        border-color: #EF4444;
        color: #EF4444;
      }
    }
  }
`;

// Modal Styled Components
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: #0E131F;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  width: 100%;
  max-width: 620px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .title-area {
    h3 { font-size: 1.15rem; font-weight: 800; color: #fff; margin: 0 0 2px 0; }
    .sub-id { font-size: 0.74rem; color: #64748b; font-family: monospace; }
  }

  button {
    background: none; border: none; color: #94a3b8; cursor: pointer;
    font-size: 1.1rem; padding: 6px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    &:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
  }
`;

const ModalBanner = styled.div`
  padding: 18px 24px;
  background: ${props => props.$isCash 
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)'
    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(91, 33, 182, 0.25) 100%)'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .banner-left {
    .flow-lbl { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; color: ${props => props.$isCash ? '#34D399' : '#A78BFA'}; }
    h2 { font-size: 1.75rem; font-weight: 800; color: #fff; margin: 4px 0 0 0; font-family: 'JetBrains Mono', monospace; }
  }

  .banner-right {
    text-align: right;
    .party-name { font-weight: 700; color: #fff; font-size: 0.95rem; }
    .party-role { font-size: 0.76rem; color: #94a3b8; text-transform: uppercase; }
  }
`;

const ModalFormBody = styled.div`
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .dual-info-box {
    display: flex;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 12px 16px;

    .info-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      .info-lbl { font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 700; }
      strong { font-size: 0.88rem; color: #fff; }
      span { font-size: 0.76rem; color: #94a3b8; }
    }

    .info-divider {
      width: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 0 14px;
    }
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.76rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  input, select {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 10px 12px;
    color: #fff;
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.2s;

    &:focus { border-color: #38bdf8; }

    option { background: #111318; color: #fff; }
  }
`;

const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 24px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const KeyValGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.03em;
  }

  .val {
    font-size: 0.9rem;
    color: #e2e8f0;
    font-weight: 600;

    &.font-mono { font-family: 'JetBrains Mono', monospace; }
    &.notes-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.84rem;
      color: #cbd5e1;
      font-weight: 400;
      line-height: 1.5;
    }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
`;

export default AdminReferral;
