import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaComments, FaTimes, FaPaperPlane } from 'react-icons/fa';

const BRAND = '#7B1F2E';
const BRAND_LIGHT = '#9b283b';

const pop = keyframes`from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; }`;

// Sits at the bottom of the corner stack; GoToTopButton is offset above it and
// the right offsets put both buttons on the same vertical centre line.
const Launcher = styled.button`
  position: fixed;
  right: 36px;
  bottom: 40px;
  z-index: 9998;
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT});
  color: #fff;
  font-size: 1.4rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(123, 31, 46, 0.45);
  transition: transform 0.2s ease;

  &:hover { transform: translateY(-2px) scale(1.05); }
  &:focus-visible { outline: 3px solid #ffccd3; outline-offset: 3px; }

  @media (max-width: 600px) { right: 39px; bottom: 32px; width: 52px; height: 52px; }
`;

const Panel = styled.div`
  position: fixed;
  right: 22px;
  bottom: 110px;
  z-index: 9999;
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 146px));
  display: flex;
  flex-direction: column;
  background: #14090c;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  animation: ${pop} 0.22s ease-out;
  font-family: 'Inter', sans-serif;

  @media (max-width: 600px) { right: 12px; left: 12px; width: auto; bottom: 96px; height: min(520px, calc(100vh - 130px)); }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT});
  color: #fff;

  h3 { margin: 0; font-size: 1rem; font-weight: 600; }
  p { margin: 2px 0 0; font-size: 0.75rem; opacity: 0.85; }

  button {
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    padding: 6px;
    line-height: 0;
  }
`;

const Thread = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Bubble = styled.div`
  max-width: 86%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 0.87rem;
  line-height: 1.5;
  white-space: pre-wrap;
  align-self: ${({ $me }) => ($me ? 'flex-end' : 'flex-start')};
  background: ${({ $me }) => ($me ? BRAND : 'rgba(255, 255, 255, 0.07)')};
  color: ${({ $me }) => ($me ? '#fff' : '#EFECEC')};
  border: 1px solid ${({ $me }) => ($me ? 'transparent' : 'rgba(255, 255, 255, 0.08)')};
`;

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-self: flex-start;

  a {
    font-size: 0.78rem;
    color: #ffccd3;
    border: 1px solid rgba(255, 204, 211, 0.4);
    border-radius: 999px;
    padding: 5px 11px;
    text-decoration: none;
    transition: background 0.2s ease;
  }
  a:hover { background: rgba(255, 204, 211, 0.12); }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-self: flex-start;

  button {
    font-size: 0.78rem;
    color: #EFECEC;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 6px 11px;
    cursor: pointer;
  }
  button:hover { background: rgba(255, 255, 255, 0.12); }
`;

const Composer = styled.form`
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);

  input {
    flex: 1;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 10px 12px;
    color: #fff;
    font-size: 0.87rem;
    font-family: inherit;
  }
  input::placeholder { color: rgba(255, 255, 255, 0.4); }
  input:focus { outline: none; border-color: ${BRAND_LIGHT}; }

  button {
    background: ${BRAND};
    border: none;
    border-radius: 10px;
    color: #fff;
    width: 42px;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const LeadCard = styled.div`
  align-self: stretch;
  background: rgba(123, 31, 46, 0.16);
  border: 1px solid rgba(255, 204, 211, 0.28);
  border-radius: 14px;
  padding: 13px;

  p.prompt { margin: 0 0 10px; font-size: 0.82rem; line-height: 1.45; color: #EFECEC; }

  form { display: flex; flex-direction: column; gap: 8px; }

  input {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 9px;
    padding: 9px 11px;
    color: #fff;
    font-size: 0.84rem;
    font-family: inherit;
  }
  input::placeholder { color: rgba(255, 255, 255, 0.4); }
  input:focus { outline: none; border-color: #d94a5e; }

  .row { display: flex; gap: 8px; }
  .row button {
    flex: 1;
    border: none;
    border-radius: 9px;
    padding: 9px 12px;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .row button.send { background: ${BRAND}; color: #fff; }
  .row button.send:disabled { opacity: 0.55; cursor: not-allowed; }
  .row button.skip { background: transparent; color: rgba(255, 255, 255, 0.55); border: 1px solid rgba(255, 255, 255, 0.14); flex: 0 0 auto; }

  .error { margin: 0; font-size: 0.76rem; color: #ff9aa6; }
  .privacy { margin: 0; font-size: 0.7rem; color: rgba(255, 255, 255, 0.45); }

  button.open {
    width: 100%;
    background: ${BRAND};
    color: #fff;
    border: none;
    border-radius: 9px;
    padding: 9px 12px;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
`;

const Note = styled.p`
  margin: 0;
  padding: 0 12px 10px;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
`;

const INTRO = {
  role: 'bot',
  text: 'Hi! I’m the DeepSkills assistant. Ask me about our courses, admissions, fees, internships or how to reach us.',
  suggestions: ['What courses do you offer?', 'How much are the fees?', 'How do I enroll?', 'Where are you located?'],
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INTRO]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // Callback form: offered after high-intent answers, asked for at most once.
  const [lead, setLead] = useState({ open: false, sent: false, dismissed: false, busy: false, error: '' });
  const [leadForm, setLeadForm] = useState({ name: '', phone: '' });
  const [courseContext, setCourseContext] = useState('');
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, open, lead]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const send = useCallback(async (raw) => {
    const question = String(raw || '').trim();
    if (!question || busy) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setDraft('');
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          // The page path is logged so the admin report shows where a question was asked.
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          // Recent turns let an AI-backed reply resolve follow-ups ("how long is it?").
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Request failed');
      if (data.courseName) setCourseContext(data.courseName);
      setMessages((prev) => [...prev, {
        role: 'bot',
        text: data.answer,
        sources: data.sources || [],
        suggestions: data.suggestions || [],
        offerLead: Boolean(data.offerLead),
        leadPrompt: data.leadPrompt,
        question,
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'bot',
        text: 'Sorry, I could not answer just now. Please try again, or email info@deepskills.pk.',
      }]);
    } finally {
      setBusy(false);
    }
  }, [busy, messages]);

  const submitLead = useCallback(async (event) => {
    event.preventDefault();
    if (lead.busy) return;
    setLead((prev) => ({ ...prev, busy: true, error: '' }));

    // The question that prompted the offer gives the counsellor context.
    const lastOffer = [...messages].reverse().find((m) => m.offerLead);

    try {
      const res = await fetch('/api/chat-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name,
          phone: leadForm.phone,
          course: courseContext,
          question: lastOffer?.question || '',
          path: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not send your details.');

      setLead({ open: false, sent: true, dismissed: false, busy: false, error: '' });
      setLeadForm({ name: '', phone: '' });
      setMessages((prev) => [...prev, {
        role: 'bot',
        text: `Thanks${leadForm.name ? `, ${leadForm.name.split(' ')[0]}` : ''}! Our team will contact you on ${leadForm.phone}. You can keep asking me anything in the meantime.`,
      }]);
    } catch (error) {
      setLead((prev) => ({ ...prev, busy: false, error: error.message || 'Could not send your details.' }));
    }
  }, [lead.busy, leadForm, courseContext, messages]);

  // Only the latest offer shows the form, and only until it is sent or dismissed.
  const lastOfferIndex = lead.sent || lead.dismissed
    ? -1
    : messages.reduce((found, msg, i) => (msg.offerLead ? i : found), -1);

  return (
    <>
      <Launcher
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
      >
        {open ? <FaTimes /> : <FaComments />}
      </Launcher>

      {open && (
        <Panel role="dialog" aria-label="DeepSkills assistant">
          <Header>
            <div>
              <h3>DeepSkills Assistant</h3>
              <p>Answers from our website</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat"><FaTimes /></button>
          </Header>

          <Thread ref={threadRef} aria-live="polite">
            {messages.map((msg, i) => (
              <React.Fragment key={i}>
                <Message msg={msg} onPick={send} />
                {i === lastOfferIndex && (
                  <LeadCard>
                    <p className="prompt">{msg.leadPrompt || 'Want the team to get back to you? Leave your name and number.'}</p>
                    {lead.open ? (
                      <form onSubmit={submitLead}>
                        <input
                          value={leadForm.name}
                          onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Your name"
                          maxLength={120}
                          aria-label="Your name"
                          autoComplete="name"
                          required
                        />
                        <input
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="Phone number (e.g. 03001234567)"
                          maxLength={30}
                          inputMode="tel"
                          aria-label="Phone number"
                          autoComplete="tel"
                          required
                        />
                        {lead.error ? <p className="error">{lead.error}</p> : null}
                        <div className="row">
                          <button type="submit" className="send" disabled={lead.busy}>
                            {lead.busy ? 'Sending…' : 'Request callback'}
                          </button>
                          <button
                            type="button"
                            className="skip"
                            onClick={() => setLead((p) => ({ ...p, open: false, dismissed: true, error: '' }))}
                          >
                            No thanks
                          </button>
                        </div>
                        <p className="privacy">We use these details only to contact you about your query.</p>
                      </form>
                    ) : (
                      <button type="button" className="open" onClick={() => setLead((p) => ({ ...p, open: true }))}>
                        Request a callback
                      </button>
                    )}
                  </LeadCard>
                )}
              </React.Fragment>
            ))}
            {busy && <Bubble>Typing…</Bubble>}
          </Thread>

          <Composer onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about courses, fees, admissions…"
              maxLength={500}
              aria-label="Your question"
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message"><FaPaperPlane /></button>
          </Composer>
          <Note>Answers come from published DeepSkills pages only.</Note>
        </Panel>
      )}
    </>
  );
}

function Message({ msg, onPick }) {
  return (
    <>
      <Bubble $me={msg.role === 'user'}>{msg.text}</Bubble>
      {!!msg.sources?.length && (
        <Links>
          {msg.sources.map((s) => (
            <a key={s.href} href={s.href}>{s.label}</a>
          ))}
        </Links>
      )}
      {!!msg.suggestions?.length && (
        <Chips>
          {msg.suggestions.map((q) => (
            <button key={q} type="button" onClick={() => onPick(q)}>{q}</button>
          ))}
        </Chips>
      )}
    </>
  );
}
