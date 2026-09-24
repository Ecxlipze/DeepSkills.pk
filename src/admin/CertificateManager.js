import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { FaTrash, FaEdit, FaCertificate } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';
import {
  FormField,
  AdminInput,
  AdminSelect,
  AdminButton,
  FormGrid,
  FormSection
} from '../components/portal';
import DatePicker from '../components/DatePicker';
import { validateRequired, validateCnic, validateForm, formatCnic } from '../utils/formValidation';

const Container = styled.div`
  padding: 10px 0;
  color: #fff;
  background: transparent;
  min-height: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 20px;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  background: #111;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 15px 20px;
  background: #1a1a1a;
  color: #888;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  border-bottom: 1px solid #222;
`;

const Td = styled.td`
  padding: 15px 20px;
  border-bottom: 1px solid #222;
  font-size: 0.95rem;
`;

const ActionBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
  margin-right: 8px;

  &.edit {
    color: #4da6ff;
    &:hover { background: rgba(77, 166, 255, 0.1); }
  }

  &.delete {
    color: #ff4d4d;
    &:hover { background: rgba(255, 77, 77, 0.1); }
  }
`;

const CertificateManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canMutate = user?.role === 'admin' || canAccess(user?.permissions || {}, 'results', 'full');
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [formData, setFormData] = useState({
    certificate_no: '',
    student_name: '',
    student_cnic: '',
    course_name: '',
    batch_name: '',
    certificate_type: 'Completion',
    issue_date: new Date().toISOString().split('T')[0],
    signatory_1_name: 'Samira Hadid',
    signatory_1_role: 'Supervisor',
    signatory_2_name: 'Aaron Loeb',
    signatory_2_role: 'Co Founder'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch certificates
      const { data: certData, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });
      if (certError) throw certError;
      setCertificates(certData);

      // Fetch courses
      const { data: coursesData } = await supabase.from('courses').select('*');
      if (coursesData) setAvailableCourses(coursesData);

      // Fetch batches
      const { data: batchesData } = await supabase.from('batches').select('*');
      if (batchesData) setAvailableBatches(batchesData);

    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You have view-only access. Modifying certificates is not permitted.');
      return;
    }

    const errors = validateForm(formData, {
      certificate_no: (v) => validateRequired(v, 'Certificate number'),
      student_name: (v) => validateRequired(v, 'Student name'),
      student_cnic: (v) => validateCnic(v, true),
      course_name: (v) => validateRequired(v, 'Course name'),
      issue_date: (v) => validateRequired(v, 'Issue date')
    });

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please resolve the form errors before submitting.');
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('certificates')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Certificate updated');
      } else {
        const { error } = await supabase
          .from('certificates')
          .insert([formData]);
        if (error) throw error;
        toast.success('Certificate issued');
      }

      setFormErrors({});
      setFormData({
        certificate_no: '',
        student_name: '',
        student_cnic: '',
        course_name: '',
        batch_name: '',
        certificate_type: 'Completion',
        issue_date: new Date().toISOString().split('T')[0],
        signatory_1_name: 'Samira Hadid',
        signatory_1_role: 'Supervisor',
        signatory_2_name: 'Aaron Loeb',
        signatory_2_role: 'Co Founder'
      });
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to save certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cert) => {
    if (!canMutate) {
      toast.error('You have view-only access. Editing certificates is not permitted.');
      return;
    }
    setFormErrors({});
    setEditingId(cert.id);
    setFormData({
      certificate_no: cert.certificate_no,
      student_name: cert.student_name,
      student_cnic: cert.student_cnic || '',
      course_name: cert.course_name,
      batch_name: cert.batch_name || '',
      certificate_type: cert.certificate_type,
      issue_date: cert.issue_date,
      signatory_1_name: cert.signatory_1_name || 'Samira Hadid',
      signatory_1_role: cert.signatory_1_role || 'Supervisor',
      signatory_2_name: cert.signatory_2_name || 'Aaron Loeb',
      signatory_2_role: cert.signatory_2_role || 'Co Founder'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!canMutate) {
      toast.error('You have view-only access. Deleting certificates is not permitted.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this certificate?')) return;
    
    try {
      const { error } = await supabase.from('certificates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Certificate deleted');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete certificate');
    }
  };

  return (
    <Container>
      <Header>
        <h1><FaCertificate style={{ color: '#7B1F2E', marginRight: '15px' }} /> Certificate Manager</h1>
        <button 
          onClick={() => navigate('/admin/dashboard')}
          style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
        >
          Back to Dashboard
        </button>
      </Header>

      {canMutate && (
      <form onSubmit={handleSubmit} style={{
        background: '#111318',
        padding: '24px 28px',
        borderRadius: '16px',
        marginBottom: '40px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <FormGrid columns={2}>
          <FormField
            label="Certificate Number"
            required
            error={formErrors.certificate_no}
            helperText="e.g. DS-2024-001"
          >
            <AdminInput 
              placeholder="e.g. DS-2024-001" 
              value={formData.certificate_no}
              onChange={(e) => {
                setFormData({...formData, certificate_no: e.target.value});
                if (formErrors.certificate_no) setFormErrors(p => ({ ...p, certificate_no: null }));
              }}
              hasError={!!formErrors.certificate_no}
            />
          </FormField>

          <FormField
            label="Student Name"
            required
            error={formErrors.student_name}
          >
            <AdminInput 
              placeholder="Full Name" 
              value={formData.student_name}
              onChange={(e) => {
                setFormData({...formData, student_name: e.target.value});
                if (formErrors.student_name) setFormErrors(p => ({ ...p, student_name: null }));
              }}
              hasError={!!formErrors.student_name}
            />
          </FormField>

          <FormField
            label="Student CNIC"
            required
            error={formErrors.student_cnic}
            helperText="13 digits: XXXXX-XXXXXXX-X"
          >
            <AdminInput 
              placeholder="e.g. 35202-1234567-9" 
              value={formData.student_cnic}
              onChange={(e) => {
                setFormData({...formData, student_cnic: formatCnic(e.target.value)});
                if (formErrors.student_cnic) setFormErrors(p => ({ ...p, student_cnic: null }));
              }}
              maxLength={15}
              hasError={!!formErrors.student_cnic}
            />
          </FormField>

          <FormField
            label="Course Name"
            required
            error={formErrors.course_name}
          >
            <AdminSelect 
              value={formData.course_name}
              onChange={(e) => {
                setFormData({...formData, course_name: e.target.value});
                if (formErrors.course_name) setFormErrors(p => ({ ...p, course_name: null }));
              }}
              hasError={!!formErrors.course_name}
            >
              <option value="">Select Course</option>
              {availableCourses.map(c => (
                <option key={c.id} value={c.title}>{c.title}</option>
              ))}
              <option value="Internship">Internship</option>
              <option value="General">General / Other</option>
            </AdminSelect>
          </FormField>

          <FormField label="Batch Name (Optional)">
            <AdminSelect 
              value={formData.batch_name}
              onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
            >
              <option value="">Select Batch (Optional)</option>
              {availableBatches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </AdminSelect>
          </FormField>

          <FormField label="Certificate Type" required>
            <AdminSelect 
              value={formData.certificate_type}
              onChange={(e) => setFormData({...formData, certificate_type: e.target.value})}
            >
              <option value="Completion">Completion</option>
              <option value="Excellence">Excellence</option>
              <option value="Participation">Participation</option>
              <option value="Internship">Internship</option>
            </AdminSelect>
          </FormField>

          <FormField
            label="Issue Date"
            required
            error={formErrors.issue_date}
          >
            <DatePicker 
              value={formData.issue_date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setFormData({...formData, issue_date: e.target.value});
                if (formErrors.issue_date) setFormErrors(p => ({ ...p, issue_date: null }));
              }}
              hasError={!!formErrors.issue_date}
              aria-label="Issue Date"
            />
          </FormField>
        </FormGrid>

        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
          <h3 style={{ marginBottom: '16px', color: '#ff8a99', fontSize: '1rem', fontWeight: 700 }}>
            Signatories (Optional)
          </h3>
          <FormGrid columns={2}>
            <FormField label="Signatory 1 Name">
              <AdminInput 
                value={formData.signatory_1_name}
                onChange={(e) => setFormData({...formData, signatory_1_name: e.target.value})}
              />
            </FormField>
            <FormField label="Signatory 1 Role">
              <AdminInput 
                value={formData.signatory_1_role}
                onChange={(e) => setFormData({...formData, signatory_1_role: e.target.value})}
              />
            </FormField>
            <FormField label="Signatory 2 Name">
              <AdminInput 
                value={formData.signatory_2_name}
                onChange={(e) => setFormData({...formData, signatory_2_name: e.target.value})}
              />
            </FormField>
            <FormField label="Signatory 2 Role">
              <AdminInput 
                value={formData.signatory_2_role}
                onChange={(e) => setFormData({...formData, signatory_2_role: e.target.value})}
              />
            </FormField>
          </FormGrid>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
          <AdminButton type="submit" $variant="primary" disabled={loading}>
            {editingId ? 'Update Certificate' : 'Issue Certificate'}
          </AdminButton>
          {editingId && (
            <AdminButton
              type="button"
              $variant="secondary"
              onClick={() => {
                setEditingId(null);
                setFormErrors({});
                setFormData({
                  certificate_no: '',
                  student_name: '',
                  student_cnic: '',
                  course_name: '',
                  batch_name: '',
                  certificate_type: 'Completion',
                  issue_date: new Date().toISOString().split('T')[0],
                  signatory_1_name: 'Samira Hadid',
                  signatory_1_role: 'Supervisor',
                  signatory_2_name: 'Aaron Loeb',
                  signatory_2_role: 'Co Founder'
                });
              }}
            >
              Cancel Edit
            </AdminButton>
          )}
        </div>
      </form>
      )}

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>Cert No</Th>
              <Th>Student</Th>
              <Th>CNIC</Th>
              <Th>Course</Th>
              <Th>Batch</Th>
              <Th>Type</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {certificates.map(cert => (
              <tr key={cert.id}>
                <Td style={{ fontWeight: 'bold', color: '#7B1F2E' }}>{cert.certificate_no}</Td>
                <Td>{cert.student_name}</Td>
                <Td>{cert.student_cnic}</Td>
                <Td>{cert.course_name}</Td>
                <Td>{cert.batch_name || '-'}</Td>
                <Td>{cert.certificate_type}</Td>
                <Td>
                  {canMutate ? (
                    <>
                      <ActionBtn className="edit" onClick={() => handleEdit(cert)}><FaEdit /></ActionBtn>
                      <ActionBtn className="delete" onClick={() => handleDelete(cert.id)}><FaTrash /></ActionBtn>
                    </>
                  ) : (
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>View only</span>
                  )}
                </Td>
              </tr>
            ))}
            {certificates.length === 0 && !loading && (
              <tr>
                <Td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                  No certificates issued yet.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>
    </Container>
  );
};

const CertificateManagerPage = () => <AdminLayout><CertificateManager /></AdminLayout>;
export default CertificateManagerPage;
