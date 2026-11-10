import { CheckIcon, MicrophoneIcon, SparkleIcon, StopIcon, WarningIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { URGENCY } from '../../lib/format.js';
import { CategoryIcon } from '../../lib/icons.jsx';
import { Button } from '../ui/Button.jsx';

const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/** Dictation with the Web Speech API, where the browser has it (Chrome, Edge, Safari). */
function useDictation(onText) {
  const ref = useRef(null);
  const cb = useRef(onText);
  cb.current = onText;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => ref.current?.abort(), []);

  const start = () => {
    if (!SpeechRecognition) return;
    setError('');
    const rec = new SpeechRecognition();
    rec.lang = 'en-PK';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) if (event.results[i].isFinal) text += event.results[i][0].transcript;
      if (text.trim()) cb.current(text.trim());
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setError('Microphone access is blocked. Allow it in your browser, or type instead.');
      else if (event.error !== 'aborted' && event.error !== 'no-speech') setError('Could not hear you. Try again, or type instead.');
    };
    rec.onend = () => setListening(false);
    ref.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };
  const stop = () => ref.current?.stop();
  return { supported: Boolean(SpeechRecognition), listening, error, start, stop };
}

/**
 * "Describe it in your own words": the customer types or dictates the problem, the assistant
 * (POST /api/assistant/describe) suggests the category, a title, the urgency and what else
 * providers will want to know. Nothing is applied until the customer presses "Use these".
 */
export function AssistantPanel({ initialText = '', onApply }) {
  const id = useId();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const dictation = useDictation((spoken) => setText((t) => `${t}${t && !/\s$/.test(t) ? ' ' : ''}${spoken}`.slice(0, 1500)));

  const analyze = async () => {
    if (text.trim().length < 10) {
      setError('Write a sentence or two about the problem first.');
      return;
    }
    dictation.stop();
    setBusy(true);
    setError('');
    try {
      setResult(await api.post('/assistant/describe', { text: text.trim() }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const s = result?.suggestion;

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-2xl border border-accent/25 bg-accent-soft p-4 sm:p-5">
      <h2 id={`${id}-h`} className="flex items-center gap-2 font-bold text-ink">
        <SparkleIcon size={20} weight="fill" className="text-accent-text" aria-hidden="true" />
        Not sure how to describe it? Let the assistant fill this in
      </h2>
      <p className="mt-1 text-sm text-ink-2">Say what is wrong in your own words. You can change anything it suggests.</p>

      <label htmlFor={id} className="sr-only">
        Describe the problem in your own words
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={1500}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="For example: water has been dripping from the pipe under my kitchen sink since this morning and the cabinet is getting wet"
        className="mt-3 block w-full resize-y rounded-field border border-line-strong bg-surface px-3.5 py-2.5 text-[0.95rem] leading-relaxed text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={analyze} loading={busy} icon={SparkleIcon} size="sm">
          Suggest details
        </Button>
        {dictation.supported && (
          <Button variant="secondary" size="sm" icon={dictation.listening ? StopIcon : MicrophoneIcon} onClick={dictation.listening ? dictation.stop : dictation.start} aria-pressed={dictation.listening}>
            {dictation.listening ? 'Stop listening' : 'Speak instead'}
          </Button>
        )}
        {dictation.listening && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text" role="status">
            <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" /> Listening…
          </span>
        )}
      </div>
      {(error || dictation.error) && (
        <p className="mt-2 text-sm font-medium text-danger" role="alert">
          {error || dictation.error}
        </p>
      )}

      {s && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4" role="status" aria-live="polite">
          {s.safetyNote && (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-ink">
              <WarningIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              <span>
                <span className="font-semibold">Safety first. </span>
                {s.safetyNote}
              </span>
            </p>
          )}
          <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-5">
            <dt className="text-muted">Service</dt>
            <dd className="font-semibold text-ink">
              {s.category ? (
                <span className="inline-flex items-center gap-1.5">
                  <CategoryIcon name={s.category.icon} size={16} />
                  {s.category.name}
                </span>
              ) : (
                'Could not tell. Please choose one below.'
              )}
            </dd>
            <dt className="text-muted">Title</dt>
            <dd className="font-semibold text-ink">{s.title}</dd>
            <dt className="text-muted">How soon</dt>
            <dd className="font-semibold text-ink">{URGENCY[s.urgency]?.label || s.urgency}</dd>
          </dl>
          {s.questions.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-ink">Providers will want to know</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {s.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm" icon={CheckIcon} onClick={() => onApply({ ...s, text: text.trim() })}>
              Use these
            </Button>
            <span className="text-xs text-muted">{result.engine === 'claude' ? 'Suggested by Claude (AI). Check it before posting.' : 'Suggested by the LocalFix assistant. Check it before posting.'}</span>
          </div>
        </div>
      )}
    </section>
  );
}
