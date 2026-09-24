import { normalizeCnic } from './portalAuthServer.js';

export { normalizeCnic };

/**
 * Returns formatted (XXXXX-XXXXXXX-X) and unformatted (13 digits) representations of CNIC.
 */
export function getCnicVariants(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 13) return [];
  const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  return Array.from(new Set([formatted, digits]));
}

/**
 * Checks whether a given CNIC is already in use by any other person or role in the system.
 * 
 * Rules:
 * - A CNIC represents a single real-world individual.
 * - Teachers, Staff, and Students cannot share a CNIC.
 * - Staff users (users table) cannot have a CNIC registered to a Teacher or Student.
 * - Teachers (teachers table) cannot have a CNIC registered to a Staff member or Student.
 * - Students (admissions table) cannot have a CNIC registered to a Teacher or Staff member.
 * - The SAME student may have multiple admissions records (for different courses or re-enrollment),
 *   but a DIFFERENT student name using that CNIC is considered an identity collision.
 * 
 * @param {object} supabase - Supabase client
 * @param {string} cnic - 13-digit CNIC
 * @param {object} options
 * @param {string} [options.targetRole] - 'student' | 'teacher' | 'staff' | 'admin' | 'custom'
 * @param {string} [options.studentName] - Student full name (if enrolling/registering student)
 * @param {string} [options.excludeId] - ID of record being updated to skip self
 * @param {string} [options.excludeTable] - 'users' | 'teachers' | 'admissions'
 */
export async function findCnicConflict(supabase, cnic, options = {}) {
  const {
    targetRole = null,
    studentName = '',
    excludeId = null,
    excludeTable = null
  } = options;

  const variants = getCnicVariants(cnic);
  if (!variants.length) {
    return {
      conflict: true,
      code: 'INVALID_CNIC',
      message: 'Please provide a valid 13-digit Pakistani CNIC.'
    };
  }

  // 1. Check Staff / Admin Users (users table)
  try {
    let userQuery = supabase
      .from('users')
      .select('id, full_name, email, role, status, cnic')
      .in('cnic', variants);

    if (excludeTable === 'users' && excludeId) {
      userQuery = userQuery.neq('id', excludeId);
    }

    const { data: userRows, error: userErr } = await userQuery.limit(1);
    if (!userErr && userRows && userRows.length > 0) {
      const existingUser = userRows[0];
      const isStaffRole = ['admin', 'custom'].includes(existingUser.role) || !['student', 'teacher'].includes(existingUser.role);

      // If we are targeting student or teacher, this is a direct cross-role conflict
      if (['student', 'teacher'].includes(targetRole) || (targetRole !== 'staff' && isStaffRole)) {
        return {
          conflict: true,
          code: 'CNIC_STAFF_CONFLICT',
          role: existingUser.role || 'staff',
          type: 'staff',
          id: existingUser.id,
          name: existingUser.full_name,
          email: existingUser.email,
          message: `CNIC is already registered to administrative staff member "${existingUser.full_name}" (${existingUser.role}). A CNIC must be unique across staff, students, and teachers.`
        };
      }

      // If we are creating another staff member and it's not the excluded user:
      if (['staff', 'admin', 'custom'].includes(targetRole) && existingUser.id !== excludeId) {
        return {
          conflict: true,
          code: 'CNIC_STAFF_DUPLICATE',
          role: existingUser.role || 'staff',
          type: 'staff',
          id: existingUser.id,
          name: existingUser.full_name,
          email: existingUser.email,
          message: `A staff account with this CNIC already exists ("${existingUser.full_name}").`
        };
      }
    }
  } catch (err) {
    // Continue
  }

  // 2. Check Teachers (teachers table)
  try {
    let teacherQuery = supabase
      .from('teachers')
      .select('id, name, email, specialization, status, cnic')
      .in('cnic', variants);

    if (excludeTable === 'teachers' && excludeId) {
      teacherQuery = teacherQuery.neq('id', excludeId);
    }

    const { data: teacherRows, error: teacherErr } = await teacherQuery.limit(1);
    if (!teacherErr && teacherRows && teacherRows.length > 0) {
      const existingTeacher = teacherRows[0];

      if (targetRole !== 'teacher' || existingTeacher.id !== excludeId) {
        const isSelf = targetRole === 'teacher' && existingTeacher.id === excludeId;
        if (!isSelf) {
          return {
            conflict: true,
            code: 'CNIC_TEACHER_CONFLICT',
            role: 'teacher',
            type: 'teacher',
            id: existingTeacher.id,
            name: existingTeacher.name,
            email: existingTeacher.email,
            message: targetRole === 'teacher'
              ? `An instructor with CNIC ${cnic} already exists ("${existingTeacher.name}").`
              : `CNIC is already registered to faculty instructor "${existingTeacher.name}". A CNIC must be unique across staff, students, and teachers.`
          };
        }
      }
    }
  } catch (err) {
    // Continue
  }

  // 3. Check Students (admissions table)
  try {
    let studentQuery = supabase
      .from('admissions')
      .select('id, name, email, course, batch, status, cnic')
      .in('cnic', variants)
      .in('status', ['Active', 'Pending', 'Graduated']);

    if (excludeTable === 'admissions' && excludeId) {
      studentQuery = studentQuery.neq('id', excludeId);
    }

    const { data: studentRows, error: studentErr } = await studentQuery.limit(5);
    if (!studentErr && studentRows && studentRows.length > 0) {
      const firstStudent = studentRows[0];

      if (targetRole && targetRole !== 'student') {
        return {
          conflict: true,
          code: 'CNIC_STUDENT_CONFLICT',
          role: 'student',
          type: 'student',
          id: firstStudent.id,
          name: firstStudent.name,
          email: firstStudent.email,
          message: `CNIC is already registered to student "${firstStudent.name}". A CNIC must be unique across staff, students, and teachers.`
        };
      }

      // If targetRole is student, check whether this is the SAME student or a DIFFERENT person
      if (studentName) {
        const normIncoming = studentName.trim().toLowerCase();
        const existingNames = studentRows.map(s => (s.name || '').trim().toLowerCase()).filter(Boolean);
        const nameMatches = existingNames.some(n => n === normIncoming || n.includes(normIncoming) || normIncoming.includes(n));

        if (!nameMatches && existingNames.length > 0) {
          return {
            conflict: true,
            code: 'CNIC_STUDENT_IDENTITY_MISMATCH',
            role: 'student',
            type: 'student',
            id: firstStudent.id,
            name: firstStudent.name,
            email: firstStudent.email,
            message: `CNIC is already registered under student name "${firstStudent.name}". Two different individuals cannot share the same CNIC.`
          };
        }
      }
    }
  } catch (err) {
    // Continue
  }

  // 4. Check Login Whitelist (allowed_cnics table)
  try {
    const { data: allowedRows, error: allowedErr } = await supabase
      .from('allowed_cnics')
      .select('cnic, name, role')
      .in('cnic', variants)
      .limit(1);

    if (!allowedErr && allowedRows && allowedRows.length > 0) {
      const allowed = allowedRows[0];
      const allowedRole = allowed.role;

      if (targetRole === 'student' && allowedRole !== 'student') {
        return {
          conflict: true,
          code: 'CNIC_WHITELIST_CONFLICT',
          role: allowedRole,
          type: allowedRole,
          name: allowed.name,
          message: `CNIC is already active in the login system with role "${allowedRole}" (${allowed.name}). Cannot enroll as student.`
        };
      }

      if (targetRole === 'teacher' && allowedRole !== 'teacher') {
        return {
          conflict: true,
          code: 'CNIC_WHITELIST_CONFLICT',
          role: allowedRole,
          type: allowedRole,
          name: allowed.name,
          message: `CNIC is already active in the login system with role "${allowedRole}" (${allowed.name}). Cannot register as teacher.`
        };
      }

      if (['staff', 'admin', 'custom'].includes(targetRole) && ['student', 'teacher'].includes(allowedRole)) {
        return {
          conflict: true,
          code: 'CNIC_WHITELIST_CONFLICT',
          role: allowedRole,
          type: allowedRole,
          name: allowed.name,
          message: `CNIC is already active in the login system as a "${allowedRole}" (${allowed.name}). Cannot register as administrative staff.`
        };
      }
    }
  } catch (err) {
    // Continue
  }

  return { conflict: false, available: true, normalizedCnic: variants[0] };
}
