import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGraduationCap, FaCoins, FaCalendarAlt, FaClock,
  FaExclamationTriangle, FaShieldAlt, FaAward, FaPercentage,
  FaUniversity, FaCreditCard, FaCheckCircle, FaTimesCircle,
  FaInfoCircle, FaEdit, FaTrashAlt, FaPlus, FaSave, FaUndo,
  FaSearch, FaFilter, FaMobileAlt, FaFileInvoiceDollar,
  FaBuilding, FaSlidersH, FaSyncAlt, FaEye, FaEyeSlash,
  FaCheck, FaTimes, FaReceipt, FaCalculator, FaCheckDouble
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { SkeletonCard } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import { supabase } from '../supabaseClient';
import { getAuthHeaders } from '../utils/adminAccessApi';

export const DEFAULT_FEE_SETTINGS = {
  general: {
    defaultCurrency: 'PKR',
    registrationFee: 2000,
    admissionDeposit: 5000,
    feeReceiptPrefix: 'DS-REC',
    invoiceNotes: 'Tuition fees are strictly non-refundable once classes commence. Installments must be paid on or before the designated due date to avoid penalties.'
  },
  installments: {
    allowInstallments: true,
    maxInstallments: 6,
    defaultInstallmentCount: 3,
    dueDayOfMonth: 10,
    gracePeriodDays: 5,
    lumpSumDiscountPct: 5,
    installmentSurchargePct: 0,
    allowedSplits: [1, 2, 3, 4, 6]
  },
  lateFeeAndConcessions: {
    enableLateFee: true,
    lateFeeType: 'flat',
    flatLateFeeAmount: 500,
    dailyLateFeeAmount: 100,
    maxLateFeeCap: 2500,
    maxCounsellorConcessionPct: 20,
    requireDirectorApprovalAbovePct: 20,
    allowPartialFeeWaiver: true
  },
  scholarships: [
    {
      id: 'merit',
      name: 'Academic Merit Scholarship',
      discountPct: 25,
      maxAmount: 10000,
      criteria: 'High academic performance / admission test score >= 85%',
      isActive: true
    },
    {
      id: 'need',
      name: 'Need-Based Financial Assistance',
      discountPct: 40,
      maxAmount: 15000,
      criteria: 'Household income verification and financial hardship application',
      isActive: true
    },
    {
      id: 'kinship',
      name: 'Sibling & Kinship Concession',
      discountPct: 15,
      maxAmount: 6000,
      criteria: 'Immediate sibling or family member currently enrolled at DeepSkills',
      isActive: true
    },
    {
      id: 'early_bird',
      name: 'Early Bird Registration Incentive',
      discountPct: 10,
      maxAmount: 3500,
      criteria: 'Admission enrollment confirmed 14+ days prior to batch commencement',
      isActive: true
    },
    {
      id: 'alumni',
      name: 'DeepSkills Alumni Re-Enrollment',
      discountPct: 20,
      maxAmount: 8000,
      criteria: 'Graduates of any prior certified DeepSkills vocational training program',
      isActive: true
    }
  ],
  paymentGateways: {
    bankAccounts: [
      {
        id: 'meezan_main',
        bankName: 'Meezan Bank Limited',
        accountTitle: 'DeepSkills Institute (Pvt) Ltd',
        accountNumber: '01020304050607',
        iban: 'PK36MEZN0001020304050607',
        branch: 'DHA Phase 5 Branch, Lahore',
        isActive: true
      },
      {
        id: 'hbl_operational',
        bankName: 'Habib Bank Limited (HBL)',
        accountTitle: 'DeepSkills Institute',
        accountNumber: '22334455667788',
        iban: 'PK45HABB0022334455667788',
        branch: 'Main Boulevard Gulberg, Lahore',
        isActive: true
      }
    ],
    mobileWallets: [
      {
        id: 'jazzcash',
        provider: 'JazzCash',
        accountTitle: 'DeepSkills Central Accounts',
        accountNumber: '0300-1234567',
        tillNumber: '889900',
        isActive: true
      },
      {
        id: 'easypaisa',
        provider: 'EasyPaisa',
        accountTitle: 'DeepSkills Central Accounts',
        accountNumber: '0345-7654321',
        tillNumber: '112233',
        isActive: true
      }
    ],
    digitalGateway: {
      provider: 'payfast',
      environment: 'sandbox',
      merchantId: 'DS-MERCHANT-01',
      securedKey: 'pk_live_••••••••••••••••',
      enableCreditCard: true,
      enableUnionPay: true,
      enableBankTransferCheckout: true
    }
  }
};

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export default function FeeSettings() {
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'finance', 'full');
  const hasAccess = user?.role === 'admin' || canAccess(user?.permissions || {}, 'finance', 'view') || canMutate;

  // Active Tab: 'tuition' | 'installments' | 'penalties' | 'scholarships' | 'gateways'
  const [activeTab, setActiveTab] = useState('tuition');

  // Core Data
  const [settings, setSettings] = useState(DEFAULT_FEE_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_FEE_SETTINGS);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Filters & Sub-states
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('all');
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Modals
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseSaving, setCourseSaving] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState(null);
  const [editingBank, setEditingBank] = useState(null);
  const [editingWallet, setEditingWallet] = useState(null);

  // Simulator State for Installments
  const [simFee, setSimFee] = useState(30000);
  const [simSplit, setSimSplit] = useState(3);
  const [simPaymentType, setSimPaymentType] = useState('installment'); // 'installment' | 'lump_sum'

  // Mark dirty on settings changes
  const updateSettingsField = (section, field, value) => {
    setSettings(prev => {
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
      setIsDirty(JSON.stringify(next) !== JSON.stringify(originalSettings));
      return next;
    });
  };

  // Fetch Fee Settings & Courses
  const fetchSettings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const authHeaders = await getAuthHeaders();
      const headers = { 'Content-Type': 'application/json', ...authHeaders };

      let res = await fetch('/api/admin/finance/settings/', { headers });
      if (res.status === 404) {
        res = await fetch('/api/admin/finance/settings.php', { headers });
      }

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 'success' && json.data) {
          const loadedSettings = json.data.settings || DEFAULT_FEE_SETTINGS;
          setSettings(loadedSettings);
          setOriginalSettings(loadedSettings);
          setCourses(json.data.courses || []);
          setIsDirty(false);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
    } catch (serverErr) {
      console.warn('Server API unavailable, falling back to direct Supabase client:', serverErr);
    }

    // Direct Supabase Fallback
    try {
      const [settingsRes, coursesRes] = await Promise.all([
        supabase.from('settings').select('*').eq('key', 'fee_settings').maybeSingle(),
        supabase.from('courses').select('id, title, description, price, duration, category, status, reenrollment_discount_pct').order('title', { ascending: true })
      ]);

      let parsedSettings = DEFAULT_FEE_SETTINGS;
      if (settingsRes.data?.value) {
        try {
          const parsed = typeof settingsRes.data.value === 'string'
            ? JSON.parse(settingsRes.data.value)
            : settingsRes.data.value;
          parsedSettings = {
            ...DEFAULT_FEE_SETTINGS,
            ...parsed,
            general: { ...DEFAULT_FEE_SETTINGS.general, ...(parsed.general || {}) },
            installments: { ...DEFAULT_FEE_SETTINGS.installments, ...(parsed.installments || {}) },
            lateFeeAndConcessions: { ...DEFAULT_FEE_SETTINGS.lateFeeAndConcessions, ...(parsed.lateFeeAndConcessions || {}) },
            paymentGateways: { ...DEFAULT_FEE_SETTINGS.paymentGateways, ...(parsed.paymentGateways || {}) },
            scholarships: Array.isArray(parsed.scholarships) && parsed.scholarships.length > 0
              ? parsed.scholarships
              : DEFAULT_FEE_SETTINGS.scholarships
          };
        } catch (e) {
          console.warn('Fallback JSON parse error:', e);
        }
      }

      setSettings(parsedSettings);
      setOriginalSettings(parsedSettings);
      setCourses(coursesRes.data || []);
      setIsDirty(false);
    } catch (dbErr) {
      console.error('Direct Supabase fetch error:', dbErr);
      toast.error('Failed to load fee configuration from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save Settings
  const handleSaveSettings = async () => {
    if (!canMutate) {
      toast.error('You do not have permission to modify finance settings.');
      return;
    }

    setSaving(true);
    try {
      const authHeaders = await getAuthHeaders();
      const headers = { 'Content-Type': 'application/json', ...authHeaders };

      let res = await fetch('/api/admin/finance/settings/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'update_fee_settings', settings })
      });

      if (res.status === 404) {
        res = await fetch('/api/admin/finance/settings.php', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'update_fee_settings', settings })
        });
      }

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 'success') {
          toast.success('Fee settings saved successfully!');
          setOriginalSettings(settings);
          setIsDirty(false);
          setSaving(false);
          return;
        }
      }
      throw new Error('Server API failed to persist fee settings.');
    } catch (apiErr) {
      console.warn('API error saving fee settings, trying direct Supabase upsert:', apiErr);
      try {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key: 'fee_settings',
            value: JSON.stringify(settings),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        if (error) throw error;

        toast.success('Fee settings saved directly to database!');
        setOriginalSettings(settings);
        setIsDirty(false);
      } catch (dbErr) {
        console.error('Supabase upsert error:', dbErr);
        toast.error('Could not save settings: ' + dbErr.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (!canMutate) return;
    if (!window.confirm('Are you sure you want to reset all fee settings to institutional defaults? This action will overwrite your current configuration.')) {
      return;
    }

    setSaving(true);
    try {
      const authHeaders = await getAuthHeaders();
      const headers = { 'Content-Type': 'application/json', ...authHeaders };

      let res = await fetch('/api/admin/finance/settings/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'reset_defaults' })
      });

      if (res.status === 404) {
        res = await fetch('/api/admin/finance/settings.php', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'reset_defaults' })
        });
      }

      if (res.ok) {
        setSettings(DEFAULT_FEE_SETTINGS);
        setOriginalSettings(DEFAULT_FEE_SETTINGS);
        setIsDirty(false);
        toast.success('Fee settings reset to institutional defaults.');
        setSaving(false);
        return;
      }
      throw new Error('API reset failed');
    } catch (e) {
      try {
        await supabase.from('settings').upsert({
          key: 'fee_settings',
          value: JSON.stringify(DEFAULT_FEE_SETTINGS),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        setSettings(DEFAULT_FEE_SETTINGS);
        setOriginalSettings(DEFAULT_FEE_SETTINGS);
        setIsDirty(false);
        toast.success('Fee settings reset to defaults.');
      } catch (err) {
        toast.error('Failed to reset defaults: ' + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Save Single Course Tuition Updates
  const handleSaveCourseTuition = async () => {
    if (!editingCourse || !canMutate) return;
    setCourseSaving(true);

    const updates = {
      price: editingCourse.price !== '' ? Number(editingCourse.price) : 0,
      duration: editingCourse.duration || '',
      reenrollment_discount_pct: editingCourse.reenrollment_discount_pct !== '' ? Number(editingCourse.reenrollment_discount_pct) : 0,
      category: editingCourse.category || '',
      status: editingCourse.status || 'Active'
    };

    try {
      const authHeaders = await getAuthHeaders();
      const headers = { 'Content-Type': 'application/json', ...authHeaders };

      let res = await fetch('/api/admin/finance/settings/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update_course_tuition',
          courseId: editingCourse.id,
          courseUpdates: updates
        })
      });

      if (res.status === 404) {
        res = await fetch('/api/admin/finance/settings.php', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'update_course_tuition',
            courseId: editingCourse.id,
            courseUpdates: updates
          })
        });
      }

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.status === 'success') {
          toast.success(`Tuition updated for ${editingCourse.title}`);
          setCourses(prev => prev.map(c => c.id === editingCourse.id ? { ...c, ...updates } : c));
          setEditingCourse(null);
          setCourseSaving(false);
          return;
        }
      }
      throw new Error('Course update API returned error');
    } catch (apiErr) {
      try {
        const { error } = await supabase
          .from('courses')
          .update(updates)
          .eq('id', editingCourse.id);

        if (error) throw error;

        toast.success(`Tuition updated for ${editingCourse.title}`);
        setCourses(prev => prev.map(c => c.id === editingCourse.id ? { ...c, ...updates } : c));
        setEditingCourse(null);
      } catch (dbErr) {
        toast.error('Failed to update course: ' + dbErr.message);
      }
    } finally {
      setCourseSaving(false);
    }
  };

  // Scholarship Bracket Management
  const handleSaveScholarship = (item) => {
    if (!item.name) {
      toast.error('Scholarship name is required.');
      return;
    }
    const currentList = settings.scholarships || [];
    let updated;
    if (item.isNew) {
      const id = item.id || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const newItem = { ...item, id };
      delete newItem.isNew;
      updated = [...currentList, newItem];
    } else {
      updated = currentList.map(s => s.id === item.id ? item : s);
    }
    const nextSettings = { ...settings, scholarships: updated };
    setSettings(nextSettings);
    setIsDirty(true);
    setEditingScholarship(null);
    toast.success('Scholarship bracket updated (click Save All Changes to apply).');
  };

  const handleDeleteScholarship = (id) => {
    if (!window.confirm('Are you sure you want to remove this scholarship bracket?')) return;
    const updated = (settings.scholarships || []).filter(s => s.id !== id);
    setSettings({ ...settings, scholarships: updated });
    setIsDirty(true);
    toast.success('Scholarship bracket removed.');
  };

  // Bank Account Management
  const handleSaveBank = (bank) => {
    if (!bank.bankName || !bank.accountNumber) {
      toast.error('Bank name and account number are required.');
      return;
    }
    const current = settings.paymentGateways?.bankAccounts || [];
    let updated;
    if (bank.isNew) {
      const id = bank.id || `bank_${Date.now()}`;
      const newBank = { ...bank, id };
      delete newBank.isNew;
      updated = [...current, newBank];
    } else {
      updated = current.map(b => b.id === bank.id ? bank : b);
    }
    const nextSettings = {
      ...settings,
      paymentGateways: {
        ...settings.paymentGateways,
        bankAccounts: updated
      }
    };
    setSettings(nextSettings);
    setIsDirty(true);
    setEditingBank(null);
    toast.success('Bank account updated (click Save All Changes to apply).');
  };

  const handleDeleteBank = (id) => {
    if (!window.confirm('Are you sure you want to remove this institutional bank account?')) return;
    const updated = (settings.paymentGateways?.bankAccounts || []).filter(b => b.id !== id);
    setSettings({
      ...settings,
      paymentGateways: {
        ...settings.paymentGateways,
        bankAccounts: updated
      }
    });
    setIsDirty(true);
    toast.success('Bank account removed.');
  };

  // Mobile Wallet Management
  const handleSaveWallet = (wallet) => {
    if (!wallet.provider || !wallet.accountNumber) {
      toast.error('Wallet provider and mobile number are required.');
      return;
    }
    const current = settings.paymentGateways?.mobileWallets || [];
    let updated;
    if (wallet.isNew) {
      const id = wallet.id || `wal_${Date.now()}`;
      const newWallet = { ...wallet, id };
      delete newWallet.isNew;
      updated = [...current, newWallet];
    } else {
      updated = current.map(w => w.id === wallet.id ? wallet : w);
    }
    const nextSettings = {
      ...settings,
      paymentGateways: {
        ...settings.paymentGateways,
        mobileWallets: updated
      }
    };
    setSettings(nextSettings);
    setIsDirty(true);
    setEditingWallet(null);
    toast.success('Mobile wallet updated (click Save All Changes to apply).');
  };

  const handleDeleteWallet = (id) => {
    if (!window.confirm('Are you sure you want to remove this mobile wallet?')) return;
    const updated = (settings.paymentGateways?.mobileWallets || []).filter(w => w.id !== id);
    setSettings({
      ...settings,
      paymentGateways: {
        ...settings.paymentGateways,
        mobileWallets: updated
      }
    });
    setIsDirty(true);
    toast.success('Mobile wallet removed.');
  };

  // Filtered Courses
  const categories = useMemo(() => {
    const set = new Set(courses.map(c => c.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = !courseSearch ||
        course.title?.toLowerCase().includes(courseSearch.toLowerCase()) ||
        course.category?.toLowerCase().includes(courseSearch.toLowerCase());
      const matchesCategory = courseCategoryFilter === 'all' || course.category === courseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [courses, courseSearch, courseCategoryFilter]);

  // Course Statistics KPI
  const courseKpis = useMemo(() => {
    const total = courses.length;
    const active = courses.filter(c => c.status === 'Active' || !c.status).length;
    const prices = courses.map(c => Number(c.price) || 0).filter(p => p > 0);
    const avg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const min = prices.length > 0 ? Math.min(...prices) : 0;
    const max = prices.length > 0 ? Math.max(...prices) : 0;
    return { total, active, avg, min, max };
  }, [courses]);

  // Simulator Calculation
  const simResults = useMemo(() => {
    const base = Number(simFee) || 0;
    const lumpSumDiscountPct = Number(settings.installments?.lumpSumDiscountPct || 0);
    const lumpSumSavings = Math.round(base * (lumpSumDiscountPct / 100));
    const lumpSumNet = base - lumpSumSavings;

    const split = Math.max(1, Number(simSplit) || 1);
    const perInstallment = Math.round(base / split);
    const installmentsList = [];
    const today = new Date();
    const dueDay = Number(settings.installments?.dueDayOfMonth || 10);
    const grace = Number(settings.installments?.gracePeriodDays || 5);

    for (let i = 1; i <= split; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + (i - 1), dueDay);
      const g = new Date(d);
      g.setDate(g.getDate() + grace);

      installmentsList.push({
        num: i,
        amount: perInstallment,
        dueDate: d.toISOString().slice(0, 10),
        graceDate: g.toISOString().slice(0, 10)
      });
    }

    return {
      base,
      lumpSumDiscountPct,
      lumpSumSavings,
      lumpSumNet,
      split,
      perInstallment,
      installmentsList
    };
  }, [simFee, simSplit, settings.installments]);

  if (!hasAccess) {
    return (
      <AdminLayout>
        <Container>
          <AccessDeniedCard>
            <FaShieldAlt size={56} />
            <h2>Access Restricted</h2>
            <p>You do not have sufficient permissions to view institutional fee settings.</p>
          </AccessDeniedCard>
        </Container>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container>
        {/* Header */}
        <Header>
          <div className="titles">
            <h1>
              <FaSlidersH /> Institutional Fee Settings & Tuition Governance
              <span className="badge">GOVERNANCE & POLICY</span>
            </h1>
            <p className="subtitle">
              Configure base course tuition rates, installment terms, concession policies, scholarships, and institutional bank gateways.
            </p>
          </div>

          <div className="actions">
            <ActionButton
              type="button"
              className="refresh-btn"
              onClick={() => fetchSettings(true)}
              disabled={loading || refreshing || saving}
              title="Refresh configuration from database"
            >
              <FaSyncAlt className={refreshing ? 'spinner' : ''} />
              <span>Refresh</span>
            </ActionButton>

            {canMutate && (
              <>
                <ActionButton
                  type="button"
                  className="reset-btn"
                  onClick={handleResetDefaults}
                  disabled={loading || saving}
                  title="Reset to institutional defaults"
                >
                  <FaUndo />
                  <span>Reset Defaults</span>
                </ActionButton>

                <ActionButton
                  type="button"
                  className="save-btn"
                  onClick={handleSaveSettings}
                  disabled={loading || saving || !isDirty}
                  title="Save all changes to server"
                >
                  {saving ? <FaSyncAlt className="spinner" /> : <FaSave />}
                  <span>{saving ? 'Saving...' : isDirty ? 'Save Changes *' : 'Saved'}</span>
                </ActionButton>
              </>
            )}
          </div>
        </Header>

        {/* Unsaved Changes Banner */}
        <AnimatePresence>
          {isDirty && (
            <DirtyBanner
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="msg">
                <FaInfoCircle />
                <span>You have unsaved changes in fee policies. Click <strong>"Save Changes"</strong> to persist them to the database.</span>
              </div>
              <button type="button" onClick={handleSaveSettings} disabled={saving}>
                <FaSave /> Save Now
              </button>
            </DirtyBanner>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <TabNavigation>
          <TabButton
            $active={activeTab === 'tuition'}
            onClick={() => setActiveTab('tuition')}
            type="button"
          >
            <FaGraduationCap /> Course Tuition & Registration
          </TabButton>

          <TabButton
            $active={activeTab === 'installments'}
            onClick={() => setActiveTab('installments')}
            type="button"
          >
            <FaCalendarAlt /> Installment Policies & Splits
          </TabButton>

          <TabButton
            $active={activeTab === 'penalties'}
            onClick={() => setActiveTab('penalties')}
            type="button"
          >
            <FaExclamationTriangle /> Late Penalties & Concessions
          </TabButton>

          <TabButton
            $active={activeTab === 'scholarships'}
            onClick={() => setActiveTab('scholarships')}
            type="button"
          >
            <FaAward /> Scholarships & Aid Brackets
          </TabButton>

          <TabButton
            $active={activeTab === 'gateways'}
            onClick={() => setActiveTab('gateways')}
            type="button"
          >
            <FaUniversity /> Bank Accounts & Gateways
          </TabButton>
        </TabNavigation>

        {loading ? (
          <SkeletonGrid>
            <SkeletonCard height="180px" />
            <SkeletonCard height="180px" />
            <SkeletonCard height="240px" />
          </SkeletonGrid>
        ) : (
          <ContentArea>
            {/* PILLAR 1: COURSE TUITION & REGISTRATION */}
            {activeTab === 'tuition' && (
              <motion.div
                key="tuition"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* General Registration & Institutional Fees */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap gold">
                        <FaFileInvoiceDollar />
                      </div>
                      <div>
                        <h3>General Institutional Charges & Policy Terms</h3>
                        <p>Configure non-tuition registration fees, default currency, receipt prefix, and official invoice terms.</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Registration Fee ({settings.general?.defaultCurrency || 'PKR'})</label>
                      <input
                        type="number"
                        value={settings.general?.registrationFee ?? 2000}
                        onChange={(e) => updateSettingsField('general', 'registrationFee', Number(e.target.value))}
                        disabled={!canMutate}
                        placeholder="2000"
                      />
                      <span className="hint">One-time administrative processing fee charged at admission.</span>
                    </div>

                    <div className="form-group">
                      <label>Admission Deposit ({settings.general?.defaultCurrency || 'PKR'})</label>
                      <input
                        type="number"
                        value={settings.general?.admissionDeposit ?? 5000}
                        onChange={(e) => updateSettingsField('general', 'admissionDeposit', Number(e.target.value))}
                        disabled={!canMutate}
                        placeholder="5000"
                      />
                      <span className="hint">Seat reservation deposit applied against final tuition.</span>
                    </div>

                    <div className="form-group">
                      <label>Fee Receipt / Voucher Prefix</label>
                      <input
                        type="text"
                        value={settings.general?.feeReceiptPrefix || 'DS-REC'}
                        onChange={(e) => updateSettingsField('general', 'feeReceiptPrefix', e.target.value.toUpperCase())}
                        disabled={!canMutate}
                        placeholder="DS-REC"
                      />
                      <span className="hint">Prefix used on auto-generated official receipts and voucher slips.</span>
                    </div>

                    <div className="form-group">
                      <label>Standard Currency</label>
                      <select
                        value={settings.general?.defaultCurrency || 'PKR'}
                        onChange={(e) => updateSettingsField('general', 'defaultCurrency', e.target.value)}
                        disabled={!canMutate}
                      >
                        <option value="PKR">PKR - Pakistani Rupee</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="AED">AED - UAE Dirham</option>
                      </select>
                      <span className="hint">Primary institutional billing currency across all statements.</span>
                    </div>

                    <div className="form-group full-width">
                      <label>Official Invoice Notes & Terms (Printed on Slips)</label>
                      <textarea
                        rows={3}
                        value={settings.general?.invoiceNotes || ''}
                        onChange={(e) => updateSettingsField('general', 'invoiceNotes', e.target.value)}
                        disabled={!canMutate}
                        placeholder="Tuition fees are strictly non-refundable once classes commence..."
                      />
                      <span className="hint">This policy disclosure appears on all student fee plans, vouchers, and PDF receipts.</span>
                    </div>
                  </div>
                </SectionCard>

                {/* Course Catalog Pricing Overview */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap burgundy">
                        <FaCoins />
                      </div>
                      <div>
                        <h3>Base Course Tuition Pricing Table</h3>
                        <p>Manage individual course pricing, duration, and alumni re-enrollment discount concessions.</p>
                      </div>
                    </div>
                  </div>

                  {/* Course KPIs */}
                  <KpiRow>
                    <div className="kpi-card">
                      <span className="label">Total Courses</span>
                      <span className="value">{courseKpis.total}</span>
                    </div>
                    <div className="kpi-card">
                      <span className="label">Active In Catalog</span>
                      <span className="value text-emerald">{courseKpis.active}</span>
                    </div>
                    <div className="kpi-card">
                      <span className="label">Average Tuition</span>
                      <span className="value text-gold">PKR {courseKpis.avg.toLocaleString()}</span>
                    </div>
                    <div className="kpi-card">
                      <span className="label">Price Range</span>
                      <span className="value">PKR {courseKpis.min.toLocaleString()} - {courseKpis.max.toLocaleString()}</span>
                    </div>
                  </KpiRow>

                  {/* Filter Toolbar */}
                  <FilterBar>
                    <div className="search-box">
                      <FaSearch />
                      <input
                        type="text"
                        placeholder="Search courses by title or category..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                      />
                      {courseSearch && (
                        <button type="button" className="clear-btn" onClick={() => setCourseSearch('')}>
                          <FaTimes />
                        </button>
                      )}
                    </div>

                    <div className="filter-select">
                      <FaFilter />
                      <select
                        value={courseCategoryFilter}
                        onChange={(e) => setCourseCategoryFilter(e.target.value)}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </FilterBar>

                  {/* Table */}
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <th>Course Name</th>
                          <th>Category</th>
                          <th>Duration</th>
                          <th>Base Tuition (PKR)</th>
                          <th>Re-Enrollment Discount</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCourses.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                              No courses found matching your criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredCourses.map((course) => (
                            <tr key={course.id}>
                              <td>
                                <div className="course-name-cell">
                                  <strong>{course.title}</strong>
                                  {course.description && (
                                    <span className="desc-preview">{course.description.slice(0, 70)}...</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="category-tag">{course.category || 'General'}</span>
                              </td>
                              <td>{course.duration || 'N/A'}</td>
                              <td>
                                <strong className="price-tag">
                                  PKR {Number(course.price || 0).toLocaleString()}
                                </strong>
                              </td>
                              <td>
                                <span className="discount-tag">
                                  {course.reenrollment_discount_pct ? `${course.reenrollment_discount_pct}%` : 'Standard (20%)'}
                                </span>
                              </td>
                              <td>
                                <StatusPill $active={course.status === 'Active' || !course.status}>
                                  {course.status || 'Active'}
                                </StatusPill>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <TableActionBtn
                                  type="button"
                                  onClick={() => setEditingCourse({ ...course })}
                                  title="Edit course tuition pricing"
                                  disabled={!canMutate}
                                >
                                  <FaEdit /> Edit Tuition
                                </TableActionBtn>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </TableWrapper>
                </SectionCard>
              </motion.div>
            )}

            {/* PILLAR 2: INSTALLMENT POLICIES & SPLITS */}
            {activeTab === 'installments' && (
              <motion.div
                key="installments"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap emerald">
                        <FaCalendarAlt />
                      </div>
                      <div>
                        <h3>Installment Governance & Payment Split Rules</h3>
                        <p>Configure installment options, monthly billing due day, grace periods, and upfront lump-sum discount incentives.</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    {/* Master Switch */}
                    <div className="form-group full-width">
                      <ToggleCard>
                        <div className="toggle-info">
                          <strong>Allow Installment Payment Plans</strong>
                          <p>When enabled, counselors and admissions staff can offer multi-month split payment plans to students.</p>
                        </div>
                        <ToggleButton
                          type="button"
                          $active={settings.installments?.allowInstallments}
                          onClick={() => updateSettingsField('installments', 'allowInstallments', !settings.installments?.allowInstallments)}
                          disabled={!canMutate}
                        >
                          <div className="thumb" />
                          <span>{settings.installments?.allowInstallments ? 'Enabled' : 'Disabled'}</span>
                        </ToggleButton>
                      </ToggleCard>
                    </div>

                    {/* Allowed Splits */}
                    <div className="form-group full-width">
                      <label>Permitted Installment Splits</label>
                      <SplitsSelector>
                        {[1, 2, 3, 4, 6].map((splitCount) => {
                          const allowed = (settings.installments?.allowedSplits || [1, 2, 3, 4, 6]).includes(splitCount);
                          return (
                            <SplitChip
                              key={splitCount}
                              $selected={allowed}
                              type="button"
                              onClick={() => {
                                if (!canMutate) return;
                                const current = settings.installments?.allowedSplits || [1, 2, 3, 4, 6];
                                const next = allowed
                                  ? current.filter(x => x !== splitCount)
                                  : [...current, splitCount].sort((a, b) => a - b);
                                updateSettingsField('installments', 'allowedSplits', next.length > 0 ? next : [1]);
                              }}
                              disabled={!canMutate}
                            >
                              {allowed ? <FaCheckCircle /> : <FaTimesCircle />}
                              <span>{splitCount === 1 ? '1 Installment (Lump Sum)' : `${splitCount} Installments`}</span>
                            </SplitChip>
                          );
                        })}
                      </SplitsSelector>
                      <span className="hint">Students will only be able to select from splits enabled above during admission onboarding.</span>
                    </div>

                    <div className="form-group">
                      <label>Default Installment Count</label>
                      <select
                        value={settings.installments?.defaultInstallmentCount ?? 3}
                        onChange={(e) => updateSettingsField('installments', 'defaultInstallmentCount', Number(e.target.value))}
                        disabled={!canMutate}
                      >
                        <option value={1}>1 Month (Lump Sum)</option>
                        <option value={2}>2 Installments</option>
                        <option value={3}>3 Installments (Standard)</option>
                        <option value={4}>4 Installments</option>
                        <option value={6}>6 Installments</option>
                      </select>
                      <span className="hint">Pre-selected default installment plan on admissions inquiries.</span>
                    </div>

                    <div className="form-group">
                      <label>Monthly Due Day of Month</label>
                      <select
                        value={settings.installments?.dueDayOfMonth ?? 10}
                        onChange={(e) => updateSettingsField('installments', 'dueDayOfMonth', Number(e.target.value))}
                        disabled={!canMutate}
                      >
                        <option value={1}>1st of each month</option>
                        <option value={5}>5th of each month</option>
                        <option value={10}>10th of each month (Default)</option>
                        <option value={15}>15th of each month</option>
                        <option value={20}>20th of each month</option>
                      </select>
                      <span className="hint">The calendar date recurring installments fall due.</span>
                    </div>

                    <div className="form-group">
                      <label>Grace Period (Days)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={settings.installments?.gracePeriodDays ?? 5}
                        onChange={(e) => updateSettingsField('installments', 'gracePeriodDays', Number(e.target.value))}
                        disabled={!canMutate}
                        placeholder="5"
                      />
                      <span className="hint">Number of days allowed after due date before late penalties trigger.</span>
                    </div>

                    <div className="form-group">
                      <label>Lump-Sum Upfront Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.installments?.lumpSumDiscountPct ?? 5}
                        onChange={(e) => updateSettingsField('installments', 'lumpSumDiscountPct', Number(e.target.value))}
                        disabled={!canMutate}
                        placeholder="5"
                      />
                      <span className="hint">Discount incentive granted if student pays 100% tuition upfront in one payment.</span>
                    </div>
                  </div>
                </SectionCard>

                {/* Interactive Simulator Sandbox */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap gold">
                        <FaCalculator />
                      </div>
                      <div>
                        <h3>Installment & Lump-Sum Simulator Sandbox</h3>
                        <p>Test how installment breakdowns and upfront discount incentives will calculate for student fee plans.</p>
                      </div>
                    </div>
                  </div>

                  <SimulatorGrid>
                    <div className="sim-controls">
                      <div className="sim-field">
                        <label>Sample Course Tuition (PKR)</label>
                        <input
                          type="number"
                          step="1000"
                          value={simFee}
                          onChange={(e) => setSimFee(Number(e.target.value))}
                        />
                      </div>

                      <div className="sim-field">
                        <label>Or Choose From Catalog</label>
                        <select onChange={(e) => {
                          const found = courses.find(c => c.id === e.target.value);
                          if (found) setSimFee(Number(found.price) || 30000);
                        }}>
                          <option value="">-- Select Course --</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.title} (PKR {Number(c.price || 0).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sim-field">
                        <label>Select Split Plan</label>
                        <div className="split-btns">
                          {[1, 2, 3, 4, 6].map(num => (
                            <button
                              key={num}
                              type="button"
                              className={simSplit === num ? 'active' : ''}
                              onClick={() => {
                                setSimSplit(num);
                                if (num === 1) setSimPaymentType('lump_sum');
                                else setSimPaymentType('installment');
                              }}
                            >
                              {num === 1 ? '1 (Lump Sum)' : `${num} Splits`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="sim-preview">
                      <div className="sim-result-header">
                        <div>
                          <span className="tag">CALCULATED BREAKDOWN</span>
                          <h4>Plan: {simSplit === 1 ? 'Lump-Sum Upfront' : `${simSplit} Equal Monthly Installments`}</h4>
                        </div>
                        <div className="total-amount">
                          <span>Total Payable:</span>
                          <strong>
                            PKR {simSplit === 1 ? simResults.lumpSumNet.toLocaleString() : simResults.base.toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      {simSplit === 1 ? (
                        <div className="lump-sum-box">
                          <div className="benefit-row">
                            <span>Original Base Tuition:</span>
                            <span>PKR {simResults.base.toLocaleString()}</span>
                          </div>
                          <div className="benefit-row text-emerald">
                            <span>Upfront Lump-Sum Incentive ({simResults.lumpSumDiscountPct}%):</span>
                            <span>- PKR {simResults.lumpSumSavings.toLocaleString()}</span>
                          </div>
                          <div className="benefit-row total">
                            <span>Net Tuition Payable:</span>
                            <span>PKR {simResults.lumpSumNet.toLocaleString()}</span>
                          </div>
                          <p className="notice">
                            <FaCheckDouble /> Student saves PKR {simResults.lumpSumSavings.toLocaleString()} by paying in full.
                          </p>
                        </div>
                      ) : (
                        <div className="installments-table">
                          <div className="inst-row header">
                            <span>#</span>
                            <span>Amount</span>
                            <span>Due Date</span>
                            <span>Grace Cutoff</span>
                          </div>
                          {simResults.installmentsList.map((inst) => (
                            <div key={inst.num} className="inst-row">
                              <span className="inst-badge">Inst. {inst.num}</span>
                              <span className="inst-amount">PKR {inst.amount.toLocaleString()}</span>
                              <span className="inst-date">{inst.dueDate}</span>
                              <span className="inst-grace">{inst.graceDate}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </SimulatorGrid>
                </SectionCard>
              </motion.div>
            )}

            {/* PILLAR 3: LATE PENALTIES & CONCESSIONS */}
            {activeTab === 'penalties' && (
              <motion.div
                key="penalties"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Late Fee Governance */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap warning">
                        <FaExclamationTriangle />
                      </div>
                      <div>
                        <h3>Late Payment Penalties & Overdue Surcharges</h3>
                        <p>Configure automated fines applied when student installments exceed the designated grace period.</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group full-width">
                      <ToggleCard>
                        <div className="toggle-info">
                          <strong>Enable Automatic Late Fee Surcharge</strong>
                          <p>When enabled, installments unpaid after the grace period will automatically incur a late penalty.</p>
                        </div>
                        <ToggleButton
                          type="button"
                          $active={settings.lateFeeAndConcessions?.enableLateFee}
                          onClick={() => updateSettingsField('lateFeeAndConcessions', 'enableLateFee', !settings.lateFeeAndConcessions?.enableLateFee)}
                          disabled={!canMutate}
                        >
                          <div className="thumb" />
                          <span>{settings.lateFeeAndConcessions?.enableLateFee ? 'Active' : 'Disabled'}</span>
                        </ToggleButton>
                      </ToggleCard>
                    </div>

                    <div className="form-group">
                      <label>Penalty Calculation Model</label>
                      <select
                        value={settings.lateFeeAndConcessions?.lateFeeType || 'flat'}
                        onChange={(e) => updateSettingsField('lateFeeAndConcessions', 'lateFeeType', e.target.value)}
                        disabled={!canMutate || !settings.lateFeeAndConcessions?.enableLateFee}
                      >
                        <option value="flat">Flat Surcharge (One-time fine per installment)</option>
                        <option value="daily">Daily Accumulating (Per day after grace period)</option>
                      </select>
                      <span className="hint">Method of applying the overdue fine to student balance.</span>
                    </div>

                    <div className="form-group">
                      <label>Flat Surcharge Amount (PKR)</label>
                      <input
                        type="number"
                        value={settings.lateFeeAndConcessions?.flatLateFeeAmount ?? 500}
                        onChange={(e) => updateSettingsField('lateFeeAndConcessions', 'flatLateFeeAmount', Number(e.target.value))}
                        disabled={!canMutate || !settings.lateFeeAndConcessions?.enableLateFee}
                        placeholder="500"
                      />
                      <span className="hint">One-time fee charged on day 1 after grace period expires.</span>
                    </div>

                    <div className="form-group">
                      <label>Daily Accumulating Rate (PKR/day)</label>
                      <input
                        type="number"
                        value={settings.lateFeeAndConcessions?.dailyLateFeeAmount ?? 100}
                        onChange={(e) => updateSettingsField('lateFeeAndConcessions', 'dailyLateFeeAmount', Number(e.target.value))}
                        disabled={!canMutate || !settings.lateFeeAndConcessions?.enableLateFee}
                        placeholder="100"
                      />
                      <span className="hint">Daily fine added for each consecutive day overdue.</span>
                    </div>

                    <div className="form-group">
                      <label>Maximum Late Fee Cap (PKR)</label>
                      <input
                        type="number"
                        value={settings.lateFeeAndConcessions?.maxLateFeeCap ?? 2500}
                        onChange={(e) => updateSettingsField('lateFeeAndConcessions', 'maxLateFeeCap', Number(e.target.value))}
                        disabled={!canMutate || !settings.lateFeeAndConcessions?.enableLateFee}
                        placeholder="2500"
                      />
                      <span className="hint">Upper ceiling to ensure penalties do not exceed a humane maximum.</span>
                    </div>
                  </div>
                </SectionCard>

                {/* Concession & Waiver Authority Matrix */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap blue">
                        <FaShieldAlt />
                      </div>
                      <div>
                        <h3>Concession Authority & Waiver Approvals</h3>
                        <p>Establish discretionary discount limits for counselors and approval escalation thresholds.</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Counselor Discretionary Discount Limit (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.lateFeeAndConcessions?.maxCounsellorConcessionPct ?? 20}
                        onChange={(e) => updateSettingsField('lateFeeAndConcessions', 'maxCounsellorConcessionPct', Number(e.target.value))}
                        disabled={!canMutate}
                        placeholder="20"
                      />
                      <span className="hint">Maximum fee reduction admissions counselors can grant without managerial sign-off.</span>
                    </div>

                    <div className="form-group">
                      <label>Require Director Approval Above (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.lateFeeAndConcessions?.requireDirectorApprovalAbovePct ?? 20}
                        onChange={(e) => updateSettingsField('lateFeeAndConcessions', 'requireDirectorApprovalAbovePct', Number(e.target.value))}
                        disabled={!canMutate}
                        placeholder="20"
                      />
                      <span className="hint">Discounts exceeding this percentage must be approved by the Academic Director or Finance Head.</span>
                    </div>

                    <div className="form-group full-width">
                      <ToggleCard>
                        <div className="toggle-info">
                          <strong>Allow Partial Fee Waivers on Hardship Grounds</strong>
                          <p>Permit finance managers to waive unpaid late fees or fee plan installments for verified hardship cases.</p>
                        </div>
                        <ToggleButton
                          type="button"
                          $active={settings.lateFeeAndConcessions?.allowPartialFeeWaiver}
                          onClick={() => updateSettingsField('lateFeeAndConcessions', 'allowPartialFeeWaiver', !settings.lateFeeAndConcessions?.allowPartialFeeWaiver)}
                          disabled={!canMutate}
                        >
                          <div className="thumb" />
                          <span>{settings.lateFeeAndConcessions?.allowPartialFeeWaiver ? 'Permitted' : 'Disallowed'}</span>
                        </ToggleButton>
                      </ToggleCard>
                    </div>
                  </div>

                  {/* Authority Matrix Table */}
                  <MatrixInfo>
                    <div className="matrix-col">
                      <div className="tier-tag green">TIER 1: COUNSELOR LEVEL</div>
                      <h4>0% to {settings.lateFeeAndConcessions?.maxCounsellorConcessionPct || 20}%</h4>
                      <p>Authorized for on-the-spot admission closing by certified admission counselors.</p>
                    </div>
                    <div className="matrix-col">
                      <div className="tier-tag gold">TIER 2: DIRECTOR APPROVAL</div>
                      <h4>{Number(settings.lateFeeAndConcessions?.maxCounsellorConcessionPct || 20) + 1}% to 50%</h4>
                      <p>Requires written justification and sign-off by Finance Head / Academic Director.</p>
                    </div>
                    <div className="matrix-col">
                      <div className="tier-tag red">TIER 3: BOARD / CEO ACTION</div>
                      <h4>Above 50% / Full Sponsorship</h4>
                      <p>Reserved strictly for institutional merit awards and verified charitable financial aid.</p>
                    </div>
                  </MatrixInfo>
                </SectionCard>
              </motion.div>
            )}

            {/* PILLAR 4: SCHOLARSHIPS & FINANCIAL AID BRACKETS */}
            {activeTab === 'scholarships' && (
              <motion.div
                key="scholarships"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap gold">
                        <FaAward />
                      </div>
                      <div>
                        <h3>Scholarship & Financial Aid Brackets</h3>
                        <p>Manage merit-based, need-based, kinship, and early registration aid brackets across admissions.</p>
                      </div>
                    </div>

                    {canMutate && (
                      <HeaderActionBtn
                        type="button"
                        onClick={() => setEditingScholarship({
                          id: '',
                          name: '',
                          discountPct: 20,
                          maxAmount: 8000,
                          criteria: '',
                          isActive: true,
                          isNew: true
                        })}
                      >
                        <FaPlus /> Add Scholarship Bracket
                      </HeaderActionBtn>
                    )}
                  </div>

                  <ScholarshipsGrid>
                    {(settings.scholarships || []).map((scholarship) => (
                      <ScholarshipCard key={scholarship.id} $active={scholarship.isActive !== false}>
                        <div className="card-top">
                          <div className="icon-badge">
                            <FaAward />
                          </div>
                          <div className="badges">
                            <span className="discount-badge">{scholarship.discountPct}% OFF</span>
                            <span className={`status-badge ${scholarship.isActive !== false ? 'active' : 'inactive'}`}>
                              {scholarship.isActive !== false ? 'Active' : 'Paused'}
                            </span>
                          </div>
                        </div>

                        <h4>{scholarship.name}</h4>
                        <p className="criteria">{scholarship.criteria || 'Standard eligibility criteria apply.'}</p>

                        <div className="cap-row">
                          <span className="label">Maximum Benefit Cap:</span>
                          <strong className="cap-val">
                            PKR {Number(scholarship.maxAmount || 0).toLocaleString()}
                          </strong>
                        </div>

                        {canMutate && (
                          <div className="card-footer">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => setEditingScholarship({ ...scholarship, isNew: false })}
                            >
                              <FaEdit /> Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDeleteScholarship(scholarship.id)}
                            >
                              <FaTrashAlt /> Remove
                            </button>
                          </div>
                        )}
                      </ScholarshipCard>
                    ))}
                  </ScholarshipsGrid>
                </SectionCard>
              </motion.div>
            )}

            {/* PILLAR 5: BANK ACCOUNTS & PAYMENT GATEWAYS */}
            {activeTab === 'gateways' && (
              <motion.div
                key="gateways"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Institutional Bank Accounts */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap gold">
                        <FaUniversity />
                      </div>
                      <div>
                        <h3>Official Institutional Bank Accounts</h3>
                        <p>Commercial bank accounts published on student fee vouchers and invoice slips for direct deposits.</p>
                      </div>
                    </div>

                    {canMutate && (
                      <HeaderActionBtn
                        type="button"
                        onClick={() => setEditingBank({
                          id: '',
                          bankName: '',
                          accountTitle: 'DeepSkills Institute (Pvt) Ltd',
                          accountNumber: '',
                          iban: '',
                          branch: '',
                          isActive: true,
                          isNew: true
                        })}
                      >
                        <FaPlus /> Add Bank Account
                      </HeaderActionBtn>
                    )}
                  </div>

                  <CardsGrid>
                    {(settings.paymentGateways?.bankAccounts || []).map((bank) => (
                      <BankCard key={bank.id} $active={bank.isActive !== false}>
                        <div className="card-header-mini">
                          <div className="icon-badge">
                            <FaBuilding />
                          </div>
                          <div>
                            <h4>{bank.bankName}</h4>
                            <p className="branch-label">{bank.branch || 'Designated Branch'}</p>
                          </div>
                        </div>

                        <div className="info-list">
                          <div className="info-row">
                            <span className="lbl">Account Title:</span>
                            <span className="val">{bank.accountTitle}</span>
                          </div>
                          <div className="info-row">
                            <span className="lbl">Account No:</span>
                            <span className="val mono">{bank.accountNumber}</span>
                          </div>
                          {bank.iban && (
                            <div className="info-row">
                              <span className="lbl">IBAN:</span>
                              <span className="val mono">{bank.iban}</span>
                            </div>
                          )}
                        </div>

                        {canMutate && (
                          <div className="card-actions">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => setEditingBank({ ...bank, isNew: false })}
                            >
                              <FaEdit /> Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDeleteBank(bank.id)}
                            >
                              <FaTrashAlt /> Remove
                            </button>
                          </div>
                        )}
                      </BankCard>
                    ))}
                  </CardsGrid>
                </SectionCard>

                {/* Mobile Wallets */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap blue">
                        <FaMobileAlt />
                      </div>
                      <div>
                        <h3>Mobile Wallets & Merchant Till Numbers</h3>
                        <p>Configure JazzCash, EasyPaisa, SadaPay, and Nayapay numbers for instant tuition transfers.</p>
                      </div>
                    </div>

                    {canMutate && (
                      <HeaderActionBtn
                        type="button"
                        onClick={() => setEditingWallet({
                          id: '',
                          provider: 'JazzCash',
                          accountTitle: 'DeepSkills Central Accounts',
                          accountNumber: '',
                          tillNumber: '',
                          isActive: true,
                          isNew: true
                        })}
                      >
                        <FaPlus /> Add Mobile Wallet
                      </HeaderActionBtn>
                    )}
                  </div>

                  <CardsGrid>
                    {(settings.paymentGateways?.mobileWallets || []).map((wallet) => (
                      <BankCard key={wallet.id} $active={wallet.isActive !== false}>
                        <div className="card-header-mini">
                          <div className="icon-badge wallet">
                            <FaMobileAlt />
                          </div>
                          <div>
                            <h4>{wallet.provider}</h4>
                            <p className="branch-label">{wallet.accountTitle}</p>
                          </div>
                        </div>

                        <div className="info-list">
                          <div className="info-row">
                            <span className="lbl">Account Number:</span>
                            <span className="val mono">{wallet.accountNumber}</span>
                          </div>
                          {wallet.tillNumber && (
                            <div className="info-row">
                              <span className="lbl">Merchant Till No:</span>
                              <span className="val mono">{wallet.tillNumber}</span>
                            </div>
                          )}
                        </div>

                        {canMutate && (
                          <div className="card-actions">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => setEditingWallet({ ...wallet, isNew: false })}
                            >
                              <FaEdit /> Edit
                            </button>
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDeleteWallet(wallet.id)}
                            >
                              <FaTrashAlt /> Remove
                            </button>
                          </div>
                        )}
                      </BankCard>
                    ))}
                  </CardsGrid>
                </SectionCard>

                {/* Digital Payment Gateway Configuration */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap emerald">
                        <FaCreditCard />
                      </div>
                      <div>
                        <h3>Digital Payment Gateway Integration</h3>
                        <p>Automated payment checkout configuration for online credit/debit cards and 1Link IBFT.</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Payment Gateway Provider</label>
                      <select
                        value={settings.paymentGateways?.digitalGateway?.provider || 'payfast'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            paymentGateways: {
                              ...prev.paymentGateways,
                              digitalGateway: {
                                ...(prev.paymentGateways?.digitalGateway || {}),
                                provider: val
                              }
                            }
                          }));
                          setIsDirty(true);
                        }}
                        disabled={!canMutate}
                      >
                        <option value="payfast">PayFast (APPS / 1Link Partner)</option>
                        <option value="kuickpay">KuickPay 1Bill / Bill Split</option>
                        <option value="stripe">Stripe International Checkout</option>
                        <option value="disabled">Disabled (Manual Bank & Cash Only)</option>
                      </select>
                      <span className="hint">Select active processor for student portal online payments.</span>
                    </div>

                    <div className="form-group">
                      <label>Gateway Environment Mode</label>
                      <select
                        value={settings.paymentGateways?.digitalGateway?.environment || 'sandbox'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            paymentGateways: {
                              ...prev.paymentGateways,
                              digitalGateway: {
                                ...(prev.paymentGateways?.digitalGateway || {}),
                                environment: val
                              }
                            }
                          }));
                          setIsDirty(true);
                        }}
                        disabled={!canMutate}
                      >
                        <option value="sandbox">Sandbox / Test Mode (Simulator)</option>
                        <option value="production">Production / Live Processing</option>
                      </select>
                      <span className="hint">Switch to Production only after credentials have been verified.</span>
                    </div>

                    <div className="form-group">
                      <label>Merchant / Terminal ID</label>
                      <input
                        type="text"
                        value={settings.paymentGateways?.digitalGateway?.merchantId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            paymentGateways: {
                              ...prev.paymentGateways,
                              digitalGateway: {
                                ...(prev.paymentGateways?.digitalGateway || {}),
                                merchantId: val
                              }
                            }
                          }));
                          setIsDirty(true);
                        }}
                        disabled={!canMutate}
                        placeholder="DS-MERCHANT-01"
                      />
                      <span className="hint">Your unique institutional identifier issued by the merchant acquirer.</span>
                    </div>

                    <div className="form-group">
                      <label>Gateway Secret Key / API Token</label>
                      <div className="secret-input-wrap">
                        <input
                          type={showSecretKey ? 'text' : 'password'}
                          value={settings.paymentGateways?.digitalGateway?.securedKey || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettings(prev => ({
                              ...prev,
                              paymentGateways: {
                                ...prev.paymentGateways,
                                digitalGateway: {
                                  ...(prev.paymentGateways?.digitalGateway || {}),
                                  securedKey: val
                                }
                              }
                            }));
                            setIsDirty(true);
                          }}
                          disabled={!canMutate}
                          placeholder="pk_live_••••••••••••••••"
                        />
                        <button
                          type="button"
                          className="eye-toggle"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      <span className="hint">Secured API signature key for webhook validation.</span>
                    </div>
                  </div>
                </SectionCard>

                {/* Live Student Payment Slip Preview */}
                <SectionCard>
                  <div className="card-header">
                    <div className="title-group">
                      <div className="icon-wrap burgundy">
                        <FaReceipt />
                      </div>
                      <div>
                        <h3>Live Student Fee Voucher / Payment Slip Preview</h3>
                        <p>Interactive preview of the official institutional fee voucher rendered on the student portal and printable slip.</p>
                      </div>
                    </div>
                  </div>

                  <VoucherPreviewCard>
                    <div className="voucher-header">
                      <div className="logo-title">
                        <h2>DEEPSKILLS INSTITUTE</h2>
                        <span className="tagline">Center for Advanced Professional Computing</span>
                      </div>
                      <div className="voucher-meta">
                        <span className="voucher-no">{settings.general?.feeReceiptPrefix || 'DS-REC'}-2026-0891</span>
                        <span className="due-tag">DUE: DAY {settings.installments?.dueDayOfMonth || 10} OF MONTH</span>
                      </div>
                    </div>

                    <div className="voucher-student-bar">
                      <div>
                        <strong>Student Name:</strong> Muhammad Ali Khan
                      </div>
                      <div>
                        <strong>Admission ID:</strong> DS-STU-2026-441
                      </div>
                      <div>
                        <strong>Batch:</strong> Batch 08 - Full Stack AI
                      </div>
                    </div>

                    <div className="voucher-fee-table">
                      <div className="row header">
                        <span>Description</span>
                        <span>Billing Cycle</span>
                        <span style={{ textAlign: 'right' }}>Amount</span>
                      </div>
                      <div className="row">
                        <span>Tuition Fee Installment 1</span>
                        <span>Month 1 of {settings.installments?.defaultInstallmentCount || 3}</span>
                        <span style={{ textAlign: 'right' }}>PKR 10,000</span>
                      </div>
                      <div className="row">
                        <span>Admission Registration Fee</span>
                        <span>One-time</span>
                        <span style={{ textAlign: 'right' }}>PKR {settings.general?.registrationFee || 2000}</span>
                      </div>
                      <div className="row total">
                        <strong>TOTAL PAYABLE ON OR BEFORE DUE DATE:</strong>
                        <span />
                        <strong style={{ textAlign: 'right', color: '#10B981', fontSize: '1.1rem' }}>
                          PKR {(10000 + Number(settings.general?.registrationFee || 2000)).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="voucher-banks-box">
                      <h5>OFFICIAL INSTITUTIONAL DEPOSIT ACCOUNTS:</h5>
                      <div className="banks-flex">
                        {(settings.paymentGateways?.bankAccounts || []).filter(b => b.isActive !== false).map(b => (
                          <div key={b.id} className="bank-item">
                            <strong>{b.bankName}</strong>
                            <span>Title: {b.accountTitle}</span>
                            <span>A/C: {b.accountNumber}</span>
                            {b.iban && <span>IBAN: {b.iban}</span>}
                          </div>
                        ))}

                        {(settings.paymentGateways?.mobileWallets || []).filter(w => w.isActive !== false).map(w => (
                          <div key={w.id} className="bank-item wallet">
                            <strong>{w.provider} (Mobile Wallet)</strong>
                            <span>Title: {w.accountTitle}</span>
                            <span>Number: {w.accountNumber}</span>
                            {w.tillNumber && <span>Till No: {w.tillNumber}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="voucher-footer">
                      <p className="policy-note">
                        <strong>Policy Note:</strong> {settings.general?.invoiceNotes || 'Tuition fees are strictly non-refundable once classes commence.'}
                      </p>
                    </div>
                  </VoucherPreviewCard>
                </SectionCard>
              </motion.div>
            )}
          </ContentArea>
        )}

        {/* Modal: Edit Course Tuition */}
        <AnimatePresence>
          {editingCourse && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !courseSaving && setEditingCourse(null)}
            >
              <ModalCard
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <h3>Edit Tuition Pricing</h3>
                    <p className="sub">{editingCourse.title}</p>
                  </div>
                  <button type="button" className="close-btn" onClick={() => setEditingCourse(null)}>
                    <FaTimes />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-field">
                    <label>Base Tuition Fee (PKR)</label>
                    <input
                      type="number"
                      value={editingCourse.price ?? 0}
                      onChange={(e) => setEditingCourse({ ...editingCourse, price: e.target.value })}
                      placeholder="e.g. 35000"
                    />
                    <span className="field-hint">Standard total fee charged for this course program.</span>
                  </div>

                  <div className="modal-field">
                    <label>Course Duration</label>
                    <input
                      type="text"
                      value={editingCourse.duration || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, duration: e.target.value })}
                      placeholder="e.g. 3 Months / 12 Weeks"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Re-Enrollment / Alumni Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingCourse.reenrollment_discount_pct ?? 20}
                      onChange={(e) => setEditingCourse({ ...editingCourse, reenrollment_discount_pct: e.target.value })}
                      placeholder="20"
                    />
                    <span className="field-hint">Concession percentage for graduates who enroll in this second course.</span>
                  </div>

                  <div className="modal-field">
                    <label>Course Category</label>
                    <input
                      type="text"
                      value={editingCourse.category || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, category: e.target.value })}
                      placeholder="e.g. Artificial Intelligence, Development, Design"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Catalog Status</label>
                    <select
                      value={editingCourse.status || 'Active'}
                      onChange={(e) => setEditingCourse({ ...editingCourse, status: e.target.value })}
                    >
                      <option value="Active">Active (Open for Admission)</option>
                      <option value="Inactive">Inactive (Archived)</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setEditingCourse(null)}
                    disabled={courseSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="save-btn"
                    onClick={handleSaveCourseTuition}
                    disabled={courseSaving}
                  >
                    {courseSaving ? <FaSyncAlt className="spinner" /> : <FaSave />}
                    <span>{courseSaving ? 'Updating...' : 'Save Pricing'}</span>
                  </button>
                </div>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Modal: Edit / Add Scholarship */}
        <AnimatePresence>
          {editingScholarship && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingScholarship(null)}
            >
              <ModalCard
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <h3>{editingScholarship.isNew ? 'Add Scholarship Bracket' : 'Edit Scholarship Bracket'}</h3>
                    <p className="sub">Define eligibility terms and tuition fee concession caps.</p>
                  </div>
                  <button type="button" className="close-btn" onClick={() => setEditingScholarship(null)}>
                    <FaTimes />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-field">
                    <label>Scholarship Name</label>
                    <input
                      type="text"
                      value={editingScholarship.name || ''}
                      onChange={(e) => setEditingScholarship({ ...editingScholarship, name: e.target.value })}
                      placeholder="e.g. Women in Tech Fellowship"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Concession Percentage (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingScholarship.discountPct ?? 25}
                      onChange={(e) => setEditingScholarship({ ...editingScholarship, discountPct: Number(e.target.value) })}
                      placeholder="25"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Maximum Benefit Cap (PKR)</label>
                    <input
                      type="number"
                      value={editingScholarship.maxAmount ?? 10000}
                      onChange={(e) => setEditingScholarship({ ...editingScholarship, maxAmount: Number(e.target.value) })}
                      placeholder="10000"
                    />
                    <span className="field-hint">Maximum fee discount in rupees granted under this category.</span>
                  </div>

                  <div className="modal-field">
                    <label>Eligibility & Verification Criteria</label>
                    <textarea
                      rows={3}
                      value={editingScholarship.criteria || ''}
                      onChange={(e) => setEditingScholarship({ ...editingScholarship, criteria: e.target.value })}
                      placeholder="Documentation or test score required to qualify..."
                    />
                  </div>

                  <div className="modal-field">
                    <label>Status</label>
                    <select
                      value={editingScholarship.isActive !== false ? 'active' : 'inactive'}
                      onChange={(e) => setEditingScholarship({ ...editingScholarship, isActive: e.target.value === 'active' })}
                    >
                      <option value="active">Active (Available for Counselors)</option>
                      <option value="inactive">Paused / Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setEditingScholarship(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="save-btn"
                    onClick={() => handleSaveScholarship(editingScholarship)}
                  >
                    <FaSave /> Apply Bracket
                  </button>
                </div>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Modal: Edit / Add Bank Account */}
        <AnimatePresence>
          {editingBank && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingBank(null)}
            >
              <ModalCard
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <h3>{editingBank.isNew ? 'Add Bank Account' : 'Edit Bank Account'}</h3>
                    <p className="sub">Published on official vouchers for student tuition deposits.</p>
                  </div>
                  <button type="button" className="close-btn" onClick={() => setEditingBank(null)}>
                    <FaTimes />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-field">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      value={editingBank.bankName || ''}
                      onChange={(e) => setEditingBank({ ...editingBank, bankName: e.target.value })}
                      placeholder="e.g. Meezan Bank Limited"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Account Title</label>
                    <input
                      type="text"
                      value={editingBank.accountTitle || ''}
                      onChange={(e) => setEditingBank({ ...editingBank, accountTitle: e.target.value })}
                      placeholder="e.g. DeepSkills Institute (Pvt) Ltd"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={editingBank.accountNumber || ''}
                      onChange={(e) => setEditingBank({ ...editingBank, accountNumber: e.target.value })}
                      placeholder="e.g. 01020304050607"
                    />
                  </div>

                  <div className="modal-field">
                    <label>IBAN (24 Characters)</label>
                    <input
                      type="text"
                      value={editingBank.iban || ''}
                      onChange={(e) => setEditingBank({ ...editingBank, iban: e.target.value.toUpperCase() })}
                      placeholder="e.g. PK36MEZN0001020304050607"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Branch Name & City</label>
                    <input
                      type="text"
                      value={editingBank.branch || ''}
                      onChange={(e) => setEditingBank({ ...editingBank, branch: e.target.value })}
                      placeholder="e.g. DHA Phase 5 Branch, Lahore"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Display Status</label>
                    <select
                      value={editingBank.isActive !== false ? 'active' : 'inactive'}
                      onChange={(e) => setEditingBank({ ...editingBank, isActive: e.target.value === 'active' })}
                    >
                      <option value="active">Active (Visible on Vouchers & Portal)</option>
                      <option value="inactive">Inactive / Hidden</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setEditingBank(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="save-btn"
                    onClick={() => handleSaveBank(editingBank)}
                  >
                    <FaSave /> Apply Account
                  </button>
                </div>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {/* Modal: Edit / Add Mobile Wallet */}
        <AnimatePresence>
          {editingWallet && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingWallet(null)}
            >
              <ModalCard
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <h3>{editingWallet.isNew ? 'Add Mobile Wallet' : 'Edit Mobile Wallet'}</h3>
                    <p className="sub">JazzCash, EasyPaisa, SadaPay or Nayapay numbers.</p>
                  </div>
                  <button type="button" className="close-btn" onClick={() => setEditingWallet(null)}>
                    <FaTimes />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-field">
                    <label>Wallet Provider</label>
                    <select
                      value={editingWallet.provider || 'JazzCash'}
                      onChange={(e) => setEditingWallet({ ...editingWallet, provider: e.target.value })}
                    >
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="SadaPay">SadaPay</option>
                      <option value="NayaPay">NayaPay</option>
                    </select>
                  </div>

                  <div className="modal-field">
                    <label>Account Title</label>
                    <input
                      type="text"
                      value={editingWallet.accountTitle || ''}
                      onChange={(e) => setEditingWallet({ ...editingWallet, accountTitle: e.target.value })}
                      placeholder="e.g. DeepSkills Central Accounts"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Mobile / Account Number</label>
                    <input
                      type="text"
                      value={editingWallet.accountNumber || ''}
                      onChange={(e) => setEditingWallet({ ...editingWallet, accountNumber: e.target.value })}
                      placeholder="e.g. 0300-1234567"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Merchant Till Number (Optional)</label>
                    <input
                      type="text"
                      value={editingWallet.tillNumber || ''}
                      onChange={(e) => setEditingWallet({ ...editingWallet, tillNumber: e.target.value })}
                      placeholder="e.g. 889900"
                    />
                  </div>

                  <div className="modal-field">
                    <label>Display Status</label>
                    <select
                      value={editingWallet.isActive !== false ? 'active' : 'inactive'}
                      onChange={(e) => setEditingWallet({ ...editingWallet, isActive: e.target.value === 'active' })}
                    >
                      <option value="active">Active (Visible on Vouchers & Portal)</option>
                      <option value="inactive">Inactive / Hidden</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setEditingWallet(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="save-btn"
                    onClick={() => handleSaveWallet(editingWallet)}
                  >
                    <FaSave /> Apply Wallet
                  </button>
                </div>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Container>
    </AdminLayout>
  );
}

// Styled Components
const Container = styled.div`
  padding: 20px 0 40px;
  color: #f8fafc;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
`;

const AccessDeniedCard = styled.div`
  background: #111318;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 18px;
  padding: 60px 20px;
  text-align: center;
  color: #ef4444;
  margin-top: 40px;

  h2 {
    color: #fff;
    margin: 20px 0 10px;
  }

  p {
    color: #94a3b8;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;

  .titles {
    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 12px;

      .badge {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 4px 10px;
        background: rgba(212, 175, 55, 0.15);
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #d4af37;
        border-radius: 9999px;
        letter-spacing: 0.06em;
      }
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.92rem;
      margin: 0;
    }
  }

  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &.refresh-btn {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    border-color: rgba(255, 255, 255, 0.1);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  &.reset-btn {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.25);

    &:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.18);
    }
  }

  &.save-btn {
    background: linear-gradient(135deg, #7b1f2e 0%, #9e2a3b 100%);
    border-color: #d4af37;
    color: #fff;
    box-shadow: 0 4px 14px rgba(123, 31, 46, 0.35);

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #8c2334 0%, #b23043 100%);
      transform: translateY(-1px);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    animation: ${spinAnimation} 1s linear infinite;
  }
`;

const DirtyBanner = styled(motion.div)`
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 12px;
  padding: 12px 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .msg {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #f1f5f9;
    font-size: 0.9rem;

    svg {
      color: #d4af37;
      font-size: 1.1rem;
    }
  }

  button {
    background: #d4af37;
    color: #0b0c10;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;

    &:hover {
      background: #e2be4b;
    }
  }
`;

const TabNavigation = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`;

const TabButton = styled.button`
  background: ${props => props.$active ? 'rgba(123, 31, 46, 0.25)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : '#94a3b8'};
  border: 1px solid ${props => props.$active ? '#7b1f2e' : 'transparent'};
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  svg {
    color: ${props => props.$active ? '#d4af37' : '#64748b'};
    font-size: 1rem;
  }

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.04);
  }
`;

const SkeletonGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SectionCard = styled.div`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 22px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .title-group {
      display: flex;
      align-items: center;
      gap: 14px;

      .icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;

        &.gold {
          background: rgba(212, 175, 55, 0.12);
          border: 1px solid rgba(212, 175, 55, 0.25);
          color: #d4af37;
        }
        &.burgundy {
          background: rgba(123, 31, 46, 0.2);
          border: 1px solid rgba(123, 31, 46, 0.35);
          color: #f87171;
        }
        &.emerald {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #10b981;
        }
        &.blue {
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #38bdf8;
        }
        &.warning {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: #f59e0b;
        }
      }

      h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #fff;
      }

      p {
        margin: 4px 0 0 0;
        font-size: 0.82rem;
        color: #94a3b8;
      }
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      &.full-width {
        grid-column: 1 / -1;
      }

      label {
        font-size: 0.84rem;
        font-weight: 600;
        color: #cbd5e1;
      }

      input, select, textarea {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px 14px;
        color: #fff;
        font-size: 0.9rem;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: #d4af37;
          background: rgba(0, 0, 0, 0.45);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .hint {
        font-size: 0.75rem;
        color: #64748b;
        line-height: 1.4;
      }

      .secret-input-wrap {
        position: relative;
        display: flex;
        align-items: center;

        input {
          width: 100%;
          padding-right: 42px;
        }

        .eye-toggle {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px;

          &:hover {
            color: #fff;
          }
        }
      }
    }
  }
`;

const HeaderActionBtn = styled.button`
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.3);
  color: #d4af37;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    background: rgba(212, 175, 55, 0.22);
    transform: translateY(-1px);
  }
`;

const ToggleCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;

  .toggle-info {
    strong {
      display: block;
      color: #fff;
      font-size: 0.92rem;
      margin-bottom: 2px;
    }
    p {
      margin: 0;
      color: #94a3b8;
      font-size: 0.8rem;
    }
  }
`;

const ToggleButton = styled.button`
  position: relative;
  width: 110px;
  height: 36px;
  border-radius: 18px;
  border: 1px solid ${props => props.$active ? '#10b981' : 'rgba(255, 255, 255, 0.15)'};
  background: ${props => props.$active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? '#10b981' : '#94a3b8'};
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$active ? 'flex-start' : 'flex-end'};
  padding: 0 12px;
  transition: all 0.25s;

  .thumb {
    position: absolute;
    top: 3px;
    left: ${props => props.$active ? 'calc(100% - 31px)' : '3px'};
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${props => props.$active ? '#10b981' : '#64748b'};
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  span {
    z-index: 1;
  }
`;

const SplitsSelector = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const SplitChip = styled.button`
  background: ${props => props.$selected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${props => props.$selected ? '#10b981' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$selected ? '#10b981' : '#94a3b8'};
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.$selected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'};
  }
`;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 22px;

  .kpi-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 14px 18px;

    .label {
      font-size: 0.75rem;
      color: #94a3b8;
      display: block;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .value {
      font-size: 1.35rem;
      font-weight: 800;
      color: #fff;
      margin-top: 4px;
      display: block;

      &.text-emerald { color: #10b981; }
      &.text-gold { color: #d4af37; }
    }
  }
`;

const FilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;

  .search-box {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 240px;

    svg {
      position: absolute;
      left: 14px;
      color: #64748b;
    }

    input {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 38px 10px 40px;
      color: #fff;
      font-size: 0.88rem;

      &:focus {
        outline: none;
        border-color: #d4af37;
      }
    }

    .clear-btn {
      position: absolute;
      right: 12px;
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      &:hover { color: #fff; }
    }
  }

  .filter-select {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0 14px;
    color: #94a3b8;

    select {
      background: transparent;
      border: none;
      color: #e2e8f0;
      padding: 10px 0;
      font-size: 0.88rem;
      cursor: pointer;
      &:focus { outline: none; }
    }
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;

  thead tr {
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    th {
      padding: 14px 18px;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }

  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    td {
      padding: 14px 18px;
      color: #cbd5e1;
      vertical-align: middle;
    }
  }

  .course-name-cell {
    display: flex;
    flex-direction: column;
    strong {
      color: #fff;
      font-size: 0.92rem;
    }
    .desc-preview {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 2px;
    }
  }

  .category-tag {
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.2);
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .price-tag {
    color: #f8fafc;
    font-size: 0.95rem;
  }

  .discount-tag {
    color: #d4af37;
    font-weight: 600;
  }
`;

const StatusPill = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${props => props.$active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
  color: ${props => props.$active ? '#10b981' : '#ef4444'};
  border: 1px solid ${props => props.$active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
`;

const TableActionBtn = styled.button`
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.25);
  color: #d4af37;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(212, 175, 55, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SimulatorGrid = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  .sim-controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    padding: 20px;

    .sim-field {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.8rem;
        color: #94a3b8;
        font-weight: 600;
      }

      input, select {
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px 12px;
        color: #fff;
        font-size: 0.88rem;

        &:focus {
          outline: none;
          border-color: #d4af37;
        }
      }

      .split-btns {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;

        button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;

          &.active {
            background: rgba(123, 31, 46, 0.4);
            border-color: #d4af37;
            color: #fff;
          }

          &:hover {
            color: #fff;
          }
        }
      }
    }
  }

  .sim-preview {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .sim-result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      .tag {
        font-size: 0.7rem;
        color: #d4af37;
        font-weight: 700;
        letter-spacing: 0.06em;
      }

      h4 {
        margin: 2px 0 0 0;
        color: #fff;
        font-size: 1.1rem;
      }

      .total-amount {
        text-align: right;
        span {
          font-size: 0.75rem;
          color: #94a3b8;
          display: block;
        }
        strong {
          color: #10b981;
          font-size: 1.35rem;
        }
      }
    }

    .lump-sum-box {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .benefit-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        color: #cbd5e1;

        &.text-emerald { color: #10b981; font-weight: 600; }
        &.total {
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-weight: 700;
          color: #fff;
          font-size: 1.05rem;
        }
      }

      .notice {
        margin-top: 16px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: #10b981;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 0.84rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .installments-table {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .inst-row {
        display: grid;
        grid-template-columns: 100px 1fr 1fr 1fr;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        font-size: 0.85rem;
        align-items: center;

        &.header {
          background: transparent;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .inst-badge {
          color: #fff;
          font-weight: 700;
        }
        .inst-amount {
          color: #10b981;
          font-weight: 700;
        }
        .inst-date {
          color: #e2e8f0;
        }
        .inst-grace {
          color: #f59e0b;
        }
      }
    }
  }
`;

const MatrixInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  .matrix-col {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 16px;

    .tier-tag {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      margin-bottom: 6px;

      &.green { color: #10b981; }
      &.gold { color: #d4af37; }
      &.red { color: #ef4444; }
    }

    h4 {
      margin: 0 0 6px 0;
      color: #fff;
      font-size: 1.15rem;
    }

    p {
      margin: 0;
      font-size: 0.78rem;
      color: #94a3b8;
      line-height: 1.4;
    }
  }
`;

const ScholarshipsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
`;

const ScholarshipCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${props => props.$active ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(212, 175, 55, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;

    .icon-badge {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(212, 175, 55, 0.12);
      color: #d4af37;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .badges {
      display: flex;
      gap: 6px;

      .discount-badge {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .status-badge {
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 700;
        &.active {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }
        &.inactive {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
      }
    }
  }

  h4 {
    margin: 0 0 8px 0;
    font-size: 1.05rem;
    color: #fff;
    font-weight: 700;
  }

  .criteria {
    font-size: 0.8rem;
    color: #94a3b8;
    line-height: 1.4;
    margin: 0 0 16px 0;
    flex: 1;
  }

  .cap-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.82rem;

    .label {
      color: #94a3b8;
    }
    .cap-val {
      color: #f8fafc;
      font-size: 0.92rem;
    }
  }

  .card-footer {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    button {
      flex: 1;
      padding: 6px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;

      &.edit-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        &:hover { background: rgba(255, 255, 255, 0.1); }
      }

      &.delete-btn {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #ef4444;
        &:hover { background: rgba(239, 68, 68, 0.18); }
      }
    }
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
`;

const BankCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${props => props.$active ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.2)'};
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(212, 175, 55, 0.35);
    background: rgba(255, 255, 255, 0.04);
  }

  .card-header-mini {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .icon-badge {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(212, 175, 55, 0.12);
      border: 1px solid rgba(212, 175, 55, 0.25);
      color: #d4af37;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;

      &.wallet {
        background: rgba(56, 189, 248, 0.12);
        border-color: rgba(56, 189, 248, 0.25);
        color: #38bdf8;
      }
    }

    h4 {
      margin: 0;
      font-size: 1rem;
      color: #fff;
    }

    .branch-label {
      margin: 2px 0 0 0;
      font-size: 0.75rem;
      color: #94a3b8;
    }
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;

      .lbl {
        color: #94a3b8;
      }
      .val {
        color: #f8fafc;
        font-weight: 600;
        word-break: break-all;
        text-align: right;

        &.mono {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.3);
          padding: 1px 6px;
          border-radius: 4px;
        }
      }
    }
  }

  .card-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    button {
      flex: 1;
      padding: 6px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;

      &.edit-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        &:hover { background: rgba(255, 255, 255, 0.1); }
      }

      &.delete-btn {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #ef4444;
        &:hover { background: rgba(239, 68, 68, 0.18); }
      }
    }
  }
`;

const VoucherPreviewCard = styled.div`
  background: #ffffff;
  color: #1e293b;
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  .voucher-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 2px solid #7b1f2e;

    .logo-title {
      h2 {
        margin: 0;
        color: #7b1f2e;
        font-size: 1.4rem;
        font-weight: 800;
        letter-spacing: 0.03em;
      }
      .tagline {
        font-size: 0.78rem;
        color: #64748b;
        font-weight: 500;
      }
    }

    .voucher-meta {
      text-align: right;
      .voucher-no {
        display: block;
        font-weight: 700;
        font-size: 0.95rem;
        color: #0f172a;
        font-family: monospace;
      }
      .due-tag {
        display: inline-block;
        margin-top: 4px;
        background: #fee2e2;
        color: #991b1b;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 4px;
      }
    }
  }

  .voucher-student-bar {
    display: flex;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin: 16px 0;
    font-size: 0.85rem;

    strong {
      color: #475569;
    }
  }

  .voucher-fee-table {
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;

    .row {
      display: grid;
      grid-template-columns: 2fr 1.5fr 1fr;
      padding: 10px 14px;
      font-size: 0.85rem;
      border-bottom: 1px solid #f1f5f9;

      &.header {
        background: #f1f5f9;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        font-size: 0.75rem;
      }

      &.total {
        background: #faf5ff;
        border-bottom: none;
        border-top: 2px solid #e2e8f0;
      }
    }
  }

  .voucher-banks-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;

    h5 {
      margin: 0 0 10px 0;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .banks-flex {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;

      .bank-item {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px;
        font-size: 0.78rem;
        display: flex;
        flex-direction: column;
        gap: 2px;

        strong {
          color: #0f172a;
          font-size: 0.84rem;
        }

        span {
          color: #64748b;
        }

        &.wallet {
          border-left: 3px solid #0284c7;
        }
      }
    }
  }

  .voucher-footer {
    padding-top: 10px;
    border-top: 1px dashed #cbd5e1;
    .policy-note {
      margin: 0;
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.4;
      strong { color: #334155; }
    }
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalCard = styled(motion.div)`
  background: #111318;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 22px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #fff;
      font-weight: 700;
    }

    .sub {
      margin: 4px 0 0 0;
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 4px;
      &:hover { color: #fff; }
    }
  }

  .modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .modal-field {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.82rem;
        font-weight: 600;
        color: #cbd5e1;
      }

      input, select, textarea {
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 9px 12px;
        color: #fff;
        font-size: 0.88rem;

        &:focus {
          outline: none;
          border-color: #d4af37;
        }
      }

      .field-hint {
        font-size: 0.72rem;
        color: #64748b;
      }
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px 22px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);

    button {
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;

      &.cancel-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        &:hover { color: #fff; }
      }

      &.save-btn {
        background: linear-gradient(135deg, #7b1f2e 0%, #9e2a3b 100%);
        border: 1px solid #d4af37;
        color: #fff;
        &:hover { background: linear-gradient(135deg, #8c2334 0%, #b23043 100%); }
      }
    }
  }
`;
