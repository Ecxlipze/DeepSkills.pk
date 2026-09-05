import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { 
  FaSearch, FaDownload, FaArrowUp, 
  FaArrowDown, FaExchangeAlt
} from 'react-icons/fa';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { downloadCsv } from '../utils/csvExport';
import { getAuthHeaders } from '../utils/adminAccessApi';

const TransactionHistory = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(router?.query?.search ? String(router.query.search) : '');
  const [filterType, setFilterType] = useState('all');
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, net: 0 });

  useEffect(() => {
    if (router?.query?.search) {
      setSearchQuery(String(router.query.search));
    }
  }, [router?.query?.search]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // 0. Try server transactions endpoint first (handles staff portal_sessions + teacher_payments unification)
      try {
        const headers = await getAuthHeaders();
        let response = await fetch('/api/admin/finance/transactions', { headers });
        if (response.status === 404) {
          response = await fetch('/api/admin/finance/transactions.php', { headers });
        }
        if (response.ok) {
          const resData = await response.json().catch(() => null);
          if (resData?.status === 'success' && resData.data) {
            setTransactions(resData.data.transactions || []);
            setSummary(resData.data.summary || { totalIn: 0, totalOut: 0, net: 0 });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Fall through to direct Supabase query
      }

      // 1. Direct Supabase fallback
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'paid')
        .order('paid_date', { ascending: false });

      if (error) throw error;

      let allTxns = data || [];
      try {
        const { data: tpData } = await supabase
          .from('teacher_payments')
          .select('id, teacher_id, amount, month, paid_on, method, reference, status, teachers(name)')
          .eq('status', 'Paid')
          .order('paid_on', { ascending: false });

        if (tpData && tpData.length > 0) {
          const teacherRows = tpData.map(tp => ({
            id: tp.id,
            paid_date: tp.paid_on,
            entity_type: 'teacher',
            entity_id: tp.teacher_id,
            teacher_name: tp.teachers?.name || 'Faculty',
            person_name: tp.teachers?.name || 'Faculty',
            description: `Salary - ${tp.teachers?.name || 'Faculty'} (${tp.month})`,
            method: tp.method || 'bank_transfer',
            amount: Number(tp.amount) || 0,
            reference_number: tp.reference || '—',
            status: tp.status
          }));
          allTxns = [...allTxns, ...teacherRows].sort((a, b) => new Date(b.paid_date || '1970-01-01') - new Date(a.paid_date || '1970-01-01'));
        }
      } catch (tpErr) {
        // Ignore fallback teacher payments error
      }

      setTransactions(allTxns);
      
      const totalIn = allTxns.filter(p => p.entity_type === 'student').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalOut = allTxns.filter(p => p.entity_type === 'teacher').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      setSummary({
        totalIn,
        totalOut,
        net: totalIn - totalOut
      });

    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.entity_type === filterType;
    const search = searchQuery.trim().toLowerCase();
    const matchesSearch = !search ||
      t.description?.toLowerCase().includes(search) ||
      t.reference_number?.toLowerCase().includes(search) ||
      t.method?.toLowerCase().includes(search) ||
      t.person_name?.toLowerCase().includes(search) ||
      t.teacher_name?.toLowerCase().includes(search);
    return matchesType && matchesSearch;
  });

  const exportCSV = () => {
    const listToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;
    if (listToExport.length === 0) {
      toast.error("No transactions to export");
      return;
    }
    const headers = ["Date", "Type", "Description", "Method", "Amount", "Reference"];
    const rows = listToExport.map(t => [
      t.paid_date || '',
      t.entity_type === 'student' ? 'Fee' : 'Salary',
      t.description || (t.teacher_name ? `Salary - ${t.teacher_name}` : 'System Transaction'),
      t.method ? t.method.replace('_', ' ') : '',
      t.amount ?? '',
      t.reference_number || '—'
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsv(`DeepSkills_Finance_Export_${dateStr}.csv`, headers, rows);
    toast.success("Transactions exported successfully");
  };

  return (
    <AdminLayout>
      <Container>
        <Header>
          <div>
            <h1>Master Ledger</h1>
            <p>Complete transaction history across the entire system.</p>
          </div>
          <ExportBtn onClick={exportCSV}>
            <FaDownload /> Export CSV
          </ExportBtn>
        </Header>

        <SummaryRow>
          <SummaryCard type="in">
            <div className="icon"><FaArrowUp /></div>
            <div className="info">
              <span>Total Inflow</span>
              <strong>Rs. {summary.totalIn.toLocaleString()}</strong>
            </div>
          </SummaryCard>
          <SummaryCard type="out">
            <div className="icon"><FaArrowDown /></div>
            <div className="info">
              <span>Total Outflow</span>
              <strong>Rs. {summary.totalOut.toLocaleString()}</strong>
            </div>
          </SummaryCard>
          <SummaryCard type="net">
            <div className="icon"><FaExchangeAlt /></div>
            <div className="info">
              <span>Net Position</span>
              <strong>Rs. {summary.net.toLocaleString()}</strong>
            </div>
          </SummaryCard>
        </SummaryRow>

        <FilterBar>
          <SearchBox>
            <FaSearch />
            <input 
              type="text" 
              placeholder="Search by person, reference..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchBox>
          <FilterGroup>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="student">Student Fees</option>
              <option value="teacher">Teacher Salaries</option>
            </select>
            <select><option>Last 30 Days</option></select>
          </FilterGroup>
        </FilterBar>

        <TableCard>
          <TableContainer>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.paid_date}</td>
                    <td>
                      <TypeBadge type={t.entity_type}>
                        {t.entity_type === 'student' ? 'Student Fee' : 'Salary'}
                      </TypeBadge>
                    </td>
                    <td>{t.description || 'System Transaction'}</td>
                    <td>{t.method?.replace('_', ' ')}</td>
                    <td style={{ fontWeight: '700', color: t.entity_type === 'student' ? '#10B981' : '#ef4444' }}>
                      {t.entity_type === 'student' ? '+' : '-'} Rs. {t.amount.toLocaleString()}
                    </td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{t.reference_number || '—'}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && !loading && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>No transactions recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </TableContainer>
        </TableCard>
      </Container>
    </AdminLayout>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  h1 { font-size: 2rem; color: #fff; margin-bottom: 5px; }
  p { color: #6b7280; font-size: 1rem; }
`;

const ExportBtn = styled.button`
  background: #111318;
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
`;

const SummaryCard = styled.div`
  background: #111318;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 15px;

  .icon {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => 
      props.type === 'in' ? 'rgba(16, 185, 129, 0.1)' : 
      props.type === 'out' ? 'rgba(239, 68, 68, 0.1)' : 
      'rgba(79, 142, 247, 0.1)'};
    color: ${props => 
      props.type === 'in' ? '#10B981' : 
      props.type === 'out' ? '#ef4444' : 
      '#4F8EF7'};
  }

  .info {
    span { font-size: 0.8rem; color: #6b7280; text-transform: uppercase; }
    strong { font-size: 1.2rem; color: #fff; display: block; }
  }
`;

const FilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  gap: 20px;
`;

const SearchBox = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  svg { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #6b7280; }
  input {
    width: 100%;
    background: #111318;
    border: 1px solid rgba(255,255,255,0.05);
    padding: 12px 15px 12px 45px;
    border-radius: 12px;
    color: #fff;
    outline: none;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 15px;
  select {
    background: #111318;
    border: 1px solid rgba(255,255,255,0.05);
    padding: 10px 15px;
    border-radius: 10px;
    color: #fff;
    outline: none;
  }
`;

const TableCard = styled.div`
  background: #111318;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  table {
    width: 100%;
    border-collapse: collapse;
    th { text-align: left; padding: 20px 25px; font-size: 0.8rem; color: #6b7280; text-transform: uppercase; background: rgba(255,255,255,0.02); }
    td { padding: 18px 25px; font-size: 0.95rem; color: #eee; border-top: 1px solid rgba(255,255,255,0.03); }
  }
`;

const TypeBadge = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${props => props.type === 'student' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(236, 72, 153, 0.1)'};
  color: ${props => props.type === 'student' ? '#8B5CF6' : '#EC4899'};
`;

export default TransactionHistory;
