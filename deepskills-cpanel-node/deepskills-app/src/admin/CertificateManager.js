import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { FaTrash, FaEdit, FaCertificate } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/permissions';

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

const Form = styled.form`
  background: #111;
  padding: 30px;
  border-radius: 15px;
  margin-bottom: 40px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  border: 1px solid rgba(123, 31, 46, 0.2);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: #888;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 12px 15px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  outline: none;
  transition: border-color 0.3s;

  &:focus {
    border-color: #7B1F2E;
  }
`;

const Select = styled.select`
  padding: 12px 15px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  outline: none;

  &:focus {
    border-color: #7B1F2E;
  }
`;

const SubmitBtn = styled.button`
  padding: 14px;
  background: #7B1F2E;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  grid-column: span 2;
  transition: all 0.3s;

  &:hover {
    background: #9b283b;
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    grid-column: span 1;
  }
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

  const formatCnic = (value) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = '';
    
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 5);
    }
    if (cleaned.length > 5) {
      formatted += '-' + cleaned.substring(5, 12);
    }
    if (cleaned.length > 12) {
      formatted += '-' + cleaned.substring(12, 13);
    }
    
    return formatted;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canMutate) {
      toast.error('You have view-only access. Modifying certificates is not permitted.');
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
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Label>Certificate Number</Label>
          <Input 
            placeholder="e.g. DS-2024-001" 
            value={formData.certificate_no}
            onChange={(e) => setFormData({...formData, certificate_no: e.target.value})}
            required 
          />
        </InputGroup>
        <InputGroup>
          <Label>Student Name</Label>
          <Input 
            placeholder="Full Name" 
            value={formData.student_name}
            onChange={(e) => setFormData({...formData, student_name: e.target.value})}
            required 
          />
        </InputGroup>
        <InputGroup>
          <Label>Student CNIC</Label>
          <Input 
            placeholder="e.g. 35202-1234567-9" 
            value={formData.student_cnic}
            onChange={(e) => setFormData({...formData, student_cnic: formatCnic(e.target.value)})}
            required 
            maxLength={15}
          />
        </InputGroup>
        <InputGroup>
          <Label>Course Name</Label>
          <Select 
            value={formData.course_name}
            onChange={(e) => setFormData({...formData, course_name: e.target.value})}
            required 
          >
            <option value="">Select Course</option>
            {availableCourses.map(c => (
              <option key={c.id} value={c.title}>{c.title}</option>
            ))}
            <option value="Internship">Internship</option>
            <option value="General">General / Other</option>
          </Select>
        </InputGroup>
        <InputGroup>
          <Label>Batch Name</Label>
          <Select 
            value={formData.batch_name}
            onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
          >
            <option value="">Select Batch (Optional)</option>
            {availableBatches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </Select>
        </InputGroup>
        <InputGroup>
          <Label>Certificate Type</Label>
          <Select 
            value={formData.certificate_type}
            onChange={(e) => setFormData({...formData, certificate_type: e.target.value})}
          >
            <option value="Completion">Completion</option>
            <option value="Excellence">Excellence</option>
            <option value="Participation">Participation</option>
            <option value="Internship">Internship</option>
          </Select>
        </InputGroup>
        <InputGroup>
          <Label>Issue Date</Label>
          <Input 
            type="date" 
            value={formData.issue_date}
            onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
            required 
          />
        </InputGroup>

        <div style={{ gridColumn: 'span 2', marginTop: '20px', borderTop: '1px solid #333', paddingTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#7B1F2E' }}>Signatories (Optional)</h3>
        </div>

        <InputGroup>
          <Label>Signatory 1 Name</Label>
          <Input 
            value={formData.signatory_1_name}
            onChange={(e) => setFormData({...formData, signatory_1_name: e.target.value})}
          />
        </InputGroup>
        <InputGroup>
          <Label>Signatory 1 Role</Label>
          <Input 
            value={formData.signatory_1_role}
            onChange={(e) => setFormData({...formData, signatory_1_role: e.target.value})}
          />
        </InputGroup>
        <InputGroup>
          <Label>Signatory 2 Name</Label>
          <Input 
            value={formData.signatory_2_name}
            onChange={(e) => setFormData({...formData, signatory_2_name: e.target.value})}
          />
        </InputGroup>
        <InputGroup>
          <Label>Signatory 2 Role</Label>
          <Input 
            value={formData.signatory_2_role}
            onChange={(e) => setFormData({...formData, signatory_2_role: e.target.value})}
          />
        </InputGroup>

        <SubmitBtn type="submit" disabled={loading}>
          {editingId ? 'Update Certificate' : 'Issue Certificate'}
        </SubmitBtn>
      </Form>
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
