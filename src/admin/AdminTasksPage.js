import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTasks, FaSearch, FaDownload, FaEye, FaTimes, 
  FaCheckCircle, FaClock, FaChalkboardTeacher, FaCalendarAlt, FaFileAlt
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import { portalTheme } from '../components/portal/PortalTheme';
import { PortalCard } from '../components/portal/PortalCard';
import { MetricCard } from '../components/portal/MetricCard';
import { StatusPill } from '../components/portal/StatusPill';
import { PortalHeader } from '../components/portal/PortalHeader';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1400px;
  margin: 0 auto;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FilterBar = styled(PortalCard)`
  padding: 18px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .search-box {
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid ${portalTheme.colors.borderSubtle};
    border-radius: ${portalTheme.radii.md};
    padding: 10px 14px;

    input {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      width: 100%;

      &::placeholder {
        color: ${portalTheme.colors.textMuted};
      }
    }
  }

  select {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid ${portalTheme.colors.borderSubtle};
    color: #fff;
    padding: 10px 14px;
    border-radius: ${portalTheme.radii.md};
    font-size: 0.88rem;
    outline: none;
    cursor: pointer;

    option {
      background: #111318;
      color: #fff;
    }

    &:focus {
      border-color: ${portalTheme.colors.primary};
    }
  }
`;

const TableWrap = styled(PortalCard)`
  padding: 0;
  overflow: hidden;
`;

const ModernTable = styled.div`
  width: 100%;
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;

    th {
      text-align: left;
      padding: 14px 20px;
      color: ${portalTheme.colors.textMuted};
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
    }

    td {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: ${portalTheme.colors.textSecondary};

      strong {
        color: #fff;
        font-weight: 600;
      }
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
  }
`;

const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .track {
    width: 80px;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;

    .fill {
      height: 100%;
      background: ${props => props.$color || portalTheme.colors.primary};
      border-radius: 999px;
      width: ${props => Math.min(100, Math.max(0, props.$pct || 0))}%;
    }
  }

  .pct {
    font-size: 0.78rem;
    font-weight: 600;
    color: ${portalTheme.colors.textPrimary};
  }
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: ${portalTheme.radii.sm};
  background: rgba(123, 31, 46, 0.15);
  color: #ff8a99;
  border: 1px solid rgba(123, 31, 46, 0.3);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${portalTheme.transitions.default};

  &:hover {
    background: ${portalTheme.colors.primary};
    color: #fff;
  }
`;

// Submissions Modal
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalCard = styled(motion.div)`
  width: 100%;
  max-width: 850px;
  max-height: 85vh;
  background: ${portalTheme.colors.bgElevated};
  border: 1px solid ${portalTheme.colors.borderMedium};
  border-radius: ${portalTheme.radii.lg};
  box-shadow: ${portalTheme.shadows.dropdown};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #fff;
  }

  button.close {
    background: none;
    border: none;
    color: ${portalTheme.colors.textMuted};
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px;
    transition: ${portalTheme.transitions.default};

    &:hover {
      color: #fff;
    }
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

export const AdminTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [enrolledCounts, setEnrolledCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    course: 'all',
    batch: 'all',
    category: 'all'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, subsRes, batchesRes, admissionsRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('task_submissions').select('*').order('submitted_at', { ascending: false }),
        supabase.from('batches').select('id, batch_name, course'),
        supabase.from('admissions').select('batch').eq('status', 'Active')
      ]);

      setTasks(tasksRes.data || []);
      setSubmissions(subsRes.data || []);
      setBatches(batchesRes.data || []);

      // Calculate enrolled count per batch
      const counts = {};
      (admissionsRes.data || []).forEach(a => {
        if (a.batch) {
          counts[a.batch] = (counts[a.batch] || 0) + 1;
        }
      });
      setEnrolledCounts(counts);
    } catch (err) {
      console.error('Error fetching admin tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique courses for filter
  const courseOptions = useMemo(() => {
    return Array.from(new Set(tasks.map(t => t.course).filter(Boolean)));
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const s = filters.search.toLowerCase();
      const matchesSearch = !s || 
        task.title?.toLowerCase().includes(s) || 
        task.assigned_by?.toLowerCase().includes(s);
      
      const matchesCourse = filters.course === 'all' || task.course === filters.course;
      const matchesBatch = filters.batch === 'all' || task.batch === filters.batch;
      const matchesCat = filters.category === 'all' || task.category === filters.category;

      return matchesSearch && matchesCourse && matchesBatch && matchesCat;
    });
  }, [tasks, filters]);

  // Key metrics
  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === 'Graded' || s.marks_obtained !== null).length;
  const gradingRate = totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0;

  return (
    <AdminLayout>
      <Container>
        <PortalHeader
          breadcrumb={['Admin', 'Academics', 'Tasks']}
          title="Tasks & Assignments Management"
          highlightWord="Management"
          subtitle="Track assignments created by instructors, monitor student submission rates, and review evaluated submissions."
        />

        {/* KPI Metrics */}
        <MetricsGrid>
          <MetricCard
            icon={<FaTasks />}
            label="Total Tasks Created"
            value={tasks.length}
            badgeText="All Time"
            badgeType="primary"
            accentColor="#ff8a99"
          />

          <MetricCard
            icon={<FaFileAlt />}
            label="Student Submissions"
            value={totalSubmissions}
            badgeText="Submitted"
            badgeType="info"
            accentColor={portalTheme.colors.info}
          />

          <MetricCard
            icon={<FaCheckCircle />}
            label="Evaluation Rate"
            value={`${gradingRate}%`}
            badgeText={`${gradedSubmissions} Graded`}
            badgeType="success"
            progress={gradingRate}
            accentColor={portalTheme.colors.success}
          />

          <MetricCard
            icon={<FaChalkboardTeacher />}
            label="Active Batches"
            value={batches.length}
            badgeText="Course Streams"
            badgeType="warning"
            accentColor={portalTheme.colors.warning}
          />
        </MetricsGrid>

        {/* Filters */}
        <FilterBar>
          <div className="search-box">
            <FaSearch color={portalTheme.colors.textMuted} />
            <input
              type="text"
              placeholder="Search by assignment title or instructor..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>

          <select
            value={filters.course}
            onChange={e => setFilters(f => ({ ...f, course: e.target.value }))}
          >
            <option value="all">All Courses</option>
            {courseOptions.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filters.batch}
            onChange={e => setFilters(f => ({ ...f, batch: e.target.value }))}
          >
            <option value="all">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.batch_name}>{b.batch_name}</option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
          >
            <option value="all">All Categories</option>
            <option value="Assignment">Assignment</option>
            <option value="Quiz">Quiz</option>
            <option value="Project">Project</option>
          </select>
        </FilterBar>

        {/* Tasks Table */}
        <TableWrap>
          <ModernTable>
            <table>
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Course & Batch</th>
                  <th>Assigned By</th>
                  <th>Due Date</th>
                  <th>Submissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const taskSubs = submissions.filter(s => s.task_id === task.id);
                  const enrolled = enrolledCounts[task.batch] || 0;
                  const pct = enrolled > 0 ? Math.round((taskSubs.length / enrolled) * 100) : 0;

                  return (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.title}</strong><br />
                        <span style={{ fontSize: '0.78rem', color: portalTheme.colors.textMuted }}>
                          {task.category} • Total Marks: {task.total_marks || 100}
                        </span>
                      </td>
                      <td>
                        <strong>{task.course}</strong><br />
                        <small style={{ color: portalTheme.colors.textMuted }}>{task.batch}</small>
                      </td>
                      <td>{task.assigned_by || 'Instructor'}</td>
                      <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                      <td>
                        <ProgressBar $pct={pct} $color={pct >= 70 ? portalTheme.colors.success : portalTheme.colors.warning}>
                          <div className="track"><div className="fill" /></div>
                          <span className="pct">{taskSubs.length} / {enrolled} ({pct}%)</span>
                        </ProgressBar>
                      </td>
                      <td>
                        <ActionBtn onClick={() => setSelectedTask(task)}>
                          <FaEye /> Submissions ({taskSubs.length})
                        </ActionBtn>
                      </td>
                    </tr>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: portalTheme.colors.textMuted }}>
                      {loading ? 'Loading tasks...' : 'No assignments found matching criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ModernTable>
        </TableWrap>

        {/* Submissions Modal */}
        <AnimatePresence>
          {selectedTask && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
            >
              <ModalCard
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={e => e.stopPropagation()}
              >
                <ModalHeader>
                  <div>
                    <h3>{selectedTask.title} — Submissions</h3>
                    <span style={{ fontSize: '0.8rem', color: portalTheme.colors.textMuted }}>
                      {selectedTask.batch} • {selectedTask.course}
                    </span>
                  </div>
                  <button className="close" onClick={() => setSelectedTask(null)}>
                    <FaTimes />
                  </button>
                </ModalHeader>

                <ModalBody>
                  <ModernTable>
                    <table>
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>CNIC</th>
                          <th>Submitted At</th>
                          <th>Status & Marks</th>
                          <th>File Attachment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions
                          .filter(s => s.task_id === selectedTask.id)
                          .map((sub, i) => (
                            <tr key={i}>
                              <td><strong>{sub.student_name}</strong></td>
                              <td>{sub.cnic}</td>
                              <td>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'}</td>
                              <td>
                                <StatusPill status={sub.status || 'Submitted'} />
                                {sub.marks_obtained !== null && sub.marks_obtained !== undefined && (
                                  <span style={{ marginLeft: '8px', fontWeight: '700', color: '#10B981' }}>
                                    {sub.marks_obtained} / {selectedTask.total_marks || 100}
                                  </span>
                                )}
                              </td>
                              <td>
                                {sub.file_url ? (
                                  <ActionBtn as="a" href={sub.file_url} target="_blank" rel="noopener noreferrer">
                                    <FaDownload /> Download
                                  </ActionBtn>
                                ) : (
                                  <span style={{ color: portalTheme.colors.textMuted }}>No File</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {submissions.filter(s => s.task_id === selectedTask.id).length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: portalTheme.colors.textMuted }}>
                              No students have submitted this assignment yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </ModernTable>
                </ModalBody>
              </ModalCard>
            </ModalOverlay>
          )}
        </AnimatePresence>

      </Container>
    </AdminLayout>
  );
};

export default AdminTasksPage;
