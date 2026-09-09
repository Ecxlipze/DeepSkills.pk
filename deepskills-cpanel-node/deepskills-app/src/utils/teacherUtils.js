import { supabase } from '../supabaseClient';

export const getTeacherByCnic = async (cnic) => {
  if (!cnic) return null;

  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('cnic', cnic)
    .single();

  if (error) throw error;
  return data;
};

export const getAssignedTeacherBatches = async (teacherId) => {
  if (!teacherId) return [];

  const { data, error } = await supabase
    .from('teacher_batches')
    .select('role, batches(*)')
    .eq('teacher_id', teacherId);

  if (error) throw error;

  return (data || [])
    .map((assignment) => ({
      ...assignment.batches,
      teacherRole: assignment.role
    }))
    .filter((batch) => batch?.id);
};

export const uniqueCoursesFromBatches = (batches) => {
  const courseMap = new Map();
  batches.forEach((batch) => {
    if (batch.course && !courseMap.has(batch.course)) {
      courseMap.set(batch.course, { title: batch.course });
    }
  });
  return Array.from(courseMap.values());
};
