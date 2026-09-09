import { supabase } from '../supabaseClient';

/**
 * Generates a unique referral code based on the user's name.
 * Format: DS-[FIRST4LETTERS]-[4RANDOM]
 * Example: DS-ALIH-7X92
 */
export function generateReferralCode(userName) {
  const namePart = (userName || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const randomPart = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `DS-${namePart}-${randomPart}`;
}

/**
 * Ensures the current user has a referral code in the database.
 * If not, generates and saves one.
 */
export async function ensureReferralCode(user) {
  if (!user || !user.id) return null;

  try {
    // 1. Check if user already has a code
    const { data: existing, error: fetchError } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', user.id)
      .single();

    if (existing) return existing.code;
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      console.error('Error fetching referral code:', fetchError);
      return null;
    }

    // 2. Generate a new code
    const newCode = generateReferralCode(user.name);

    // 3. Save to database
    const { error: insertError } = await supabase
      .from('referral_codes')
      .insert([
        {
          user_id: user.id,
          user_role: user.role,
          code: newCode
        }
      ])
      .select()
      .single();

    if (insertError) {
      // Handle collision (unlikely but possible)
      if (insertError.code === '23505') { // unique_violation
        return ensureReferralCode(user); // Retry once
      }
      console.error('Error creating referral code:', insertError);
      return null;
    }

    return newCode;
  } catch (error) {
    console.error('Referral utility error:', error);
    return null;
  }
}
