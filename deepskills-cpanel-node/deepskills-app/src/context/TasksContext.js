import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createBatchNotifications, createNotification, getStudentsForCourseBatch } from '../utils/notifications';

const TasksContext = createContext();

export const TasksProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks and merge with submissions
  const fetchTasks = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const { data: subData, error: subError } = await supabase
        .from('task_submissions')
        .select('*');

      if (subError) throw subError;

      // Merge them together to match existing structure
      const mergedTasks = tasksData.map(task => ({
        id: task.id,
        title: task.title,
        category: task.category,
        description: task.description,
        dueDate: task.due_date,
        course: task.course,
        batch: task.batch,
        fileUrl: task.file_url,
        assignedBy: task.assigned_by,
        totalMarks: task.total_marks,
        createdAt: task.created_at,
        submissions: subData
          .filter(sub => sub.task_id === task.id)
          .map(sub => ({
            id: sub.id,
            studentName: sub.student_name,
            cnic: sub.cnic,
            fileUrl: sub.file_url,
            status: sub.status,
            submittedAt: sub.submitted_at,
            marksObtained: sub.marks_obtained
          }))
      }));

      setTasks(mergedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const uploadFileToSupabase = async (file, pathPrefix, customName = null) => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = customName ? `${customName}.${fileExt}` : `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${pathPrefix}/${fileName}`;

    const { error } = await supabase.storage
      .from('task_files')
      .upload(filePath, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('task_files')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const addTask = async (newTask) => {
    try {
      let fileUrl = newTask.fileUrl || null;
      
      // If a raw File object was passed, upload it first
      if (newTask.file) {
        fileUrl = await uploadFileToSupabase(newTask.file, 'assignments');
      }

      const { error } = await supabase.from('tasks').insert([{
        title: newTask.title,
        category: newTask.category,
        description: newTask.description,
        due_date: newTask.dueDate,
        course: newTask.course,
        batch: newTask.batch,
        file_url: fileUrl,
        assigned_by: newTask.assignedBy,
        total_marks: newTask.totalMarks
      }]);

      if (error) throw error;

      const students = await getStudentsForCourseBatch(newTask.course, newTask.batch);
      await createBatchNotifications(students.map((student) => student.id), {
        role: 'student',
        type: 'task',
        title: 'New Task Assigned',
        message: `${newTask.assignedBy || 'Your teacher'} assigned: "${newTask.title}" — due ${newTask.dueDate}`,
        link: '/student/tasks'
      });

      fetchTasks();
      return true;
    } catch (error) {
      alert("Failed to assign task: " + error.message);
      return false;
    }
  };

  const submitTask = async (taskId, submission) => {
    try {
      let fileUrl = submission.fileUrl || null;

      // If a raw File object was passed, upload it first
      if (submission.file) {
        fileUrl = await uploadFileToSupabase(
          submission.file, 
          `submissions/${taskId}`, 
          submission.customFileName
        );
      }

      // 1. Delete any existing submission for this student and task
      await supabase.from('task_submissions')
        .delete()
        .eq('task_id', taskId)
        .eq('cnic', submission.cnic);

      // 2. Insert new submission
      const { error } = await supabase.from('task_submissions').insert([{
        task_id: taskId,
        student_name: submission.studentName,
        cnic: submission.cnic,
        file_url: fileUrl,
        status: 'Submitted'
      }]);

      if (error) throw error;

      const { data: task } = await supabase
        .from('tasks')
        .select('title, assigned_by')
        .eq('id', taskId)
        .maybeSingle();

      if (task?.assigned_by) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('name', task.assigned_by)
          .maybeSingle();

        if (teacher?.id) {
          await createNotification({
            userId: teacher.id,
            role: 'teacher',
            type: 'task_submitted',
            title: 'Task Submitted',
            message: `${submission.studentName} submitted: "${task.title}"`,
            link: '/teacher/tasks/view'
          });
        }
      }

      fetchTasks();
    } catch (error) {
      alert("Failed to submit task: " + error.message);
    }
  };

  const updateTask = async (taskId, updatedData) => {
    try {
      const { error } = await supabase.from('tasks')
        .update({
          title: updatedData.title,
          category: updatedData.category,
          description: updatedData.description,
          due_date: updatedData.dueDate
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      alert("Failed to update task: " + error.message);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      // Delete submissions first (or rely on cascading deletes if set up)
      await supabase.from('task_submissions').delete().eq('task_id', taskId);
      
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      
      fetchTasks();
    } catch (error) {
      alert("Failed to delete task: " + error.message);
    }
  };

  const gradeSubmission = async (submissionId, marksObtained) => {
    try {
      const { data: sub, error: subErr } = await supabase
        .from('task_submissions')
        .update({ marks_obtained: marksObtained, status: 'Graded' })
        .eq('id', submissionId)
        .select('task_id, cnic')
        .single();

      if (subErr) throw subErr;

      // Trigger result recomputation
      const { data: studentRows } = await supabase
        .from('admissions')
        .select('id')
        .eq('cnic', sub.cnic)
        .in('status', ['Active', 'Graduated'])
        .order('submitted_at', { ascending: false })
        .limit(1);
      const student = studentRows?.[0];
      if (student) {
        const { computeAndCacheResult } = await import('../utils/resultUtils');
        await computeAndCacheResult(student.id, 'midterm');
        await computeAndCacheResult(student.id, 'finalterm');
      }

      fetchTasks();
    } catch (error) {
      alert("Failed to grade submission: " + error.message);
    }
  };

  return (
    <TasksContext.Provider value={{ tasks, addTask, submitTask, updateTask, deleteTask, gradeSubmission, loading }}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => useContext(TasksContext);
