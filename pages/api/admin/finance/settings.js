import { getSupabaseServerClient } from '../../../../lib/supabaseServer.js';
import { authorizeAdminOperation } from '../../../../lib/portalAuthServer.js';

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
    lateFeeType: 'flat', // 'flat' | 'daily'
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
      provider: 'payfast', // 'payfast' | 'stripe' | 'kuickpay' | 'disabled'
      environment: 'sandbox', // 'sandbox' | 'production'
      merchantId: 'DS-MERCHANT-01',
      securedKey: 'pk_live_••••••••••••••••',
      enableCreditCard: true,
      enableUnionPay: true,
      enableBankTransferCheckout: true
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const auth = await authorizeAdminOperation(req, null);
  if (!auth.ok) {
    return res.status(auth.status).json({ status: 'error', message: auth.message });
  }

  if (auth.role === 'custom') {
    const perm = auth.permissions?.finance;
    if (perm !== 'view' && perm !== 'full') {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to manage fee settings.'
      });
    }
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return res.status(500).json({ status: 'error', message: 'Database client unavailable.' });
  }

  try {
    // GET: Retrieve current fee settings & course pricing list
    if (req.method === 'GET') {
      const [settingsRes, coursesRes] = await Promise.all([
        supabase.from('settings').select('*').eq('key', 'fee_settings').maybeSingle(),
        supabase.from('courses').select('id, title, description, price, duration, category, status, reenrollment_discount_pct').order('title', { ascending: true })
      ]);

      let feeSettings = DEFAULT_FEE_SETTINGS;
      if (settingsRes.data?.value) {
        try {
          const parsed = typeof settingsRes.data.value === 'string'
            ? JSON.parse(settingsRes.data.value)
            : settingsRes.data.value;
          feeSettings = {
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
          console.warn('Failed to parse stored fee_settings JSON, using defaults:', e);
        }
      }

      return res.status(200).json({
        status: 'success',
        data: {
          settings: feeSettings,
          courses: coursesRes.data || [],
          updatedAt: settingsRes.data?.updated_at || null
        }
      });
    }

    // POST: Updates
    if (req.method === 'POST') {
      if (auth.role === 'custom' && auth.permissions?.finance !== 'full') {
        return res.status(403).json({
          status: 'error',
          message: 'You have read-only permissions for finance. Modifications require full access.'
        });
      }

      const { action = 'update_fee_settings', settings: newSettings, courseId, courseUpdates } = req.body;

      if (action === 'update_fee_settings') {
        if (!newSettings || typeof newSettings !== 'object') {
          return res.status(400).json({ status: 'error', message: 'Valid settings object is required.' });
        }

        const valueString = JSON.stringify(newSettings);
        const { error: upsertErr } = await supabase
          .from('settings')
          .upsert({
            key: 'fee_settings',
            value: valueString,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        if (upsertErr) throw upsertErr;

        return res.status(200).json({
          status: 'success',
          message: 'Fee settings updated successfully.',
          data: newSettings
        });
      }

      if (action === 'update_course_tuition') {
        if (!courseId) {
          return res.status(400).json({ status: 'error', message: 'courseId is required.' });
        }

        const allowedFields = ['price', 'duration', 'reenrollment_discount_pct', 'status', 'category'];
        const updates = {};
        allowedFields.forEach(f => {
          if (courseUpdates?.[f] !== undefined) {
            updates[f] = courseUpdates[f];
          }
        });

        const { data: updatedCourse, error: courseErr } = await supabase
          .from('courses')
          .update(updates)
          .eq('id', courseId)
          .select()
          .single();

        if (courseErr) throw courseErr;

        return res.status(200).json({
          status: 'success',
          message: 'Course tuition pricing updated successfully.',
          data: updatedCourse
        });
      }

      if (action === 'reset_defaults') {
        const valueString = JSON.stringify(DEFAULT_FEE_SETTINGS);
        const { error: resetErr } = await supabase
          .from('settings')
          .upsert({
            key: 'fee_settings',
            value: valueString,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        if (resetErr) throw resetErr;

        return res.status(200).json({
          status: 'success',
          message: 'Fee settings reset to institutional defaults.',
          data: DEFAULT_FEE_SETTINGS
        });
      }

      return res.status(400).json({ status: 'error', message: 'Unknown action requested.' });
    }

  } catch (error) {
    console.error('Fee Settings API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error processing fee settings.'
    });
  }
}
