// IntakeChat.jsx — AI-driven intake routing (upload vs generate)
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { routeIntake } from '../services/api';

const GREETING = "Hi! I'm here to help. Do you have an existing app you'd like to upload and have reviewed, or do you want to build something new from scratch?";

export default function IntakeChat({ onRoute }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await routeIntake(input, history);

      if (result.route === 'clarify' && result.question) {
        setMessages([...nextMessages, { role: 'assistant', content: result.question }]);
      } else {
        // Routed — confirm and call back
        const confirmMsg = result.route === 'upload'
          ? "Got it! Let's review and upgrade your app. Drop your ZIP below."
          : "Let's build something new! Describe your project and add your data below.";
        setMessages([...nextMessages, { role: 'assistant', content: confirmMsg }]);
        setTimeout(() => onRoute(result.route, result.summary), 800);
      }
    } catch {
      setMessages([...nextMessages, { role: 'assistant', content: "Sorry, I had trouble understanding. Choose an option below:" }]);
    }
    setLoading(false);
  };

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={styles.chatWindow}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              style={{ ...styles.bubble, ...(msg.role === 'user' ? styles.userBubble : styles.aiBubble) }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {msg.content}
            </motion.div>
          ))}
          {loading && (
            <motion.div style={styles.aiBubble} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span style={styles.dots}>
                <span /><span /><span />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Type your answer..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
          autoFocus
        />
        <button style={styles.sendBtn} onClick={send} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>

      <div style={styles.quickButtons}>
        <span style={styles.quickLabel}>Or choose directly:</span>
        <button style={styles.quickBtn} onClick={() => onRoute('upload', 'Upload existing app')}>
          Upload existing app
        </button>
        <button style={{ ...styles.quickBtn, ...styles.quickBtnPrimary }} onClick={() => onRoute('generate', 'Build new app')}>
          Build something new
        </button>
      </div>
    </motion.div>
  );
}

const styles = {
  container: {
    maxWidth: '560px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  chatWindow: {
    background: '#111827',
    borderRadius: '12px',
    border: '1px solid rgba(63, 63, 70, 0.4)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '160px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '85%',
    wordBreak: 'break-word',
  },
  aiBubble: {
    background: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    color: '#E4E4E7',
    alignSelf: 'flex-start',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '85%',
  },
  userBubble: {
    background: 'rgba(139, 92, 246, 0.12)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    color: '#E4E4E7',
    alignSelf: 'flex-end',
  },
  dots: {
    display: 'inline-flex',
    gap: '4px',
    '& span': {
      width: '6px',
      height: '6px',
      background: '#06B6D4',
      borderRadius: '50%',
    },
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: '#111827',
    border: '1px solid rgba(63, 63, 70, 0.5)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#E4E4E7',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: '#06B6D4',
    color: '#0B1120',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  quickButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  quickLabel: {
    color: '#71717A',
    fontSize: '12px',
  },
  quickBtn: {
    background: 'rgba(24, 24, 27, 0.6)',
    border: '1px solid rgba(63, 63, 70, 0.4)',
    borderRadius: '8px',
    padding: '7px 14px',
    color: '#A1A1AA',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  quickBtnPrimary: {
    background: 'rgba(6, 182, 212, 0.1)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    color: '#06B6D4',
  },
};
