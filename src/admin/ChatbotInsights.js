import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaComments, FaSync, FaQuestionCircle, FaCheckCircle, FaPercentage } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { AdminLayout } from '../components/AdminLayout';
import { portalTheme } from '../components/portal/PortalTheme';
import { useAuth } from '../context/AuthContext';
import { getAuthToken } from '../utils/timeTrackingApi';

const PageContainer = styled.div`
  padding: 24px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: ${portalTheme.colors.textPrimary};

  @media (max-width: 768px) { padding: 16px; }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  h1 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 4px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  p { margin: 0; font-size: 0.88rem; color: ${portalTheme.colors.textSecondary}; max-width: 640px; }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  select, button {
    background: ${portalTheme.colors.bgInput};
    border: 1px solid ${portalTheme.colors.borderMedium};
    color: ${portalTheme.colors.textPrimary};
    border-radius: 10px;
    padding: 9px 13px;
    font-size: 0.85rem;
    cursor: pointer;
  }
  button { display: inline-flex; align-items: center; gap: 8px; }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: 14px;
  padding: 18px 20px;

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${portalTheme.colors.textMuted};
  }
  .value { font-size: 2rem; font-weight: 800; margin-top: 8px; }
  .hint { font-size: 0.78rem; color: ${portalTheme.colors.textSecondary}; margin-top: 4px; }
`;

const Panel = styled.section`
  background: ${portalTheme.colors.bgCard};
  border: 1px solid ${portalTheme.colors.borderSubtle};
  border-radius: 14px;
  overflow: hidden;

  header {
    padding: 16px 20px;
    border-bottom: 1px solid ${portalTheme.colors.borderSubtle};

    h2 { margin: 0; font-size: 1.05rem; font-weight: 700; }
    p { margin: 4px 0 0; font-size: 0.8rem; color: ${portalTheme.colors.textSecondary}; }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.87rem;

  th, td {
    text-align: left;
    padding: 12px 20px;
    border-bottom: 1px solid ${portalTheme.colors.borderSubtle};
  }
  th {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${portalTheme.colors.textMuted};
    font-weight: 600;
  }
  tr:last-child td { border-bottom: none; }
  td.count { font-weight: 700; width: 90px; }
  td.when { color: ${portalTheme.colors.textSecondary}; width: 170px; white-space: nowrap; }
`;

const Empty = styled.p`
  margin: 0;
  padding: 26px 20px;
  color: ${portalTheme.colors.textSecondary};
  font-size: 0.87rem;
  text-align: center;
`;

const Notice = styled.div`
  background: ${portalTheme.colors.warningLight};
  border: 1px solid ${portalTheme.colors.warning};
  color: ${portalTheme.colors.warningText};
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 0.86rem;
`;

const Status = styled.div`
  border-radius: 12px;
  padding: 13px 18px;
  font-size: 0.84rem;
  border: 1px solid ${({ $on }) => ($on ? portalTheme.colors.success : portalTheme.colors.borderMedium)};
  background: ${({ $on }) => ($on ? portalTheme.colors.successLight : portalTheme.colors.bgCard)};
  color: ${({ $on }) => ($on ? portalTheme.colors.successText : portalTheme.colors.textSecondary)};

  .engines {
    display: block;
    margin-top: 6px;
    color: ${portalTheme.colors.textMuted};
    font-size: 0.78rem;
  }
`;

const ENGINE_LABELS = {
  keyword: 'knowledge base',
  keyword_fallback: 'knowledge base (AI call failed)',
  claude: 'Claude',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

export default function ChatbotInsights() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [pending, setPending] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/admin/chat-insights?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Could not load chatbot insights.');
      setData(body.data);
      setPending(body.pending || '');
    } catch (error) {
      toast.error(error.message || 'Could not load chatbot insights.');
    } finally {
      setLoading(false);
    }
  }, [user, days]);

  useEffect(() => { load(); }, [load]);

  const engineSummary = Object.entries(data?.engines || {})
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${count} answered by ${ENGINE_LABELS[key] || key}`)
    .join(' · ');

  const unanswered = data?.unanswered || [];
  const answeredTop = data?.answered_top || [];

  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader>
          <div>
            <h1><FaComments /> Chatbot Insights</h1>
            <p>
              What visitors ask the website assistant. The unanswered list is the one to act on:
              each repeated question there is an answer worth adding to the chatbot.
            </p>
          </div>
          <Controls>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button type="button" onClick={load} disabled={loading}>
              <FaSync /> {loading ? 'Loading…' : 'Refresh'}
            </button>
          </Controls>
        </PageHeader>

        {pending ? <Notice>{pending}</Notice> : null}

        <Status $on={Boolean(data?.ai?.enabled)}>
          {data?.ai?.enabled
            ? `AI answering is ON — ${data.ai.provider} (${data.ai.model}). Answers are written by the model but restricted to published site content.`
            : 'AI answering is OFF. Answers come from the built-in knowledge base. Add a provider API key to enable it.'}
          {engineSummary ? <span className="engines">{engineSummary}</span> : null}
        </Status>

        <StatGrid>
          <StatCard>
            <div className="label"><FaQuestionCircle /> Questions asked</div>
            <div className="value">{data?.total ?? '—'}</div>
            <div className="hint">in the last {data?.days ?? days} days</div>
          </StatCard>
          <StatCard>
            <div className="label"><FaCheckCircle /> Answered</div>
            <div className="value">{data?.answered ?? '—'}</div>
            <div className="hint">matched a knowledge base entry</div>
          </StatCard>
          <StatCard>
            <div className="label"><FaPercentage /> Answer rate</div>
            <div className="value">{data?.answerRate != null ? `${data.answerRate}%` : '—'}</div>
            <div className="hint">higher is better; add entries to raise it</div>
          </StatCard>
        </StatGrid>

        <Panel>
          <header>
            <h2>Unanswered questions</h2>
            <p>The assistant fell back to “contact us” for these. Most asked first.</p>
          </header>
          {unanswered.length ? (
            <Table>
              <thead>
                <tr><th>Question</th><th>Times asked</th><th>Last asked</th></tr>
              </thead>
              <tbody>
                {unanswered.map((row) => (
                  <tr key={row.question}>
                    <td>{row.question}</td>
                    <td className="count">{row.count}</td>
                    <td className="when">{formatDate(row.lastAsked)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>{loading ? 'Loading…' : 'Nothing unanswered in this period.'}</Empty>
          )}
        </Panel>

        <Panel>
          <header>
            <h2>Most asked topics</h2>
            <p>Questions the assistant answered — useful for knowing what visitors care about.</p>
          </header>
          {answeredTop.length ? (
            <Table>
              <thead>
                <tr><th>Question</th><th>Times asked</th><th>Last asked</th></tr>
              </thead>
              <tbody>
                {answeredTop.map((row) => (
                  <tr key={row.question}>
                    <td>{row.question}</td>
                    <td className="count">{row.count}</td>
                    <td className="when">{formatDate(row.lastAsked)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>{loading ? 'Loading…' : 'No questions recorded yet.'}</Empty>
          )}
        </Panel>
      </PageContainer>
    </AdminLayout>
  );
}
