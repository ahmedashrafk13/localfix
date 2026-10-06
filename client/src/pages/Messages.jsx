import {
  ArrowLeftIcon,
  ChatsCircleIcon,
  ChecksIcon,
  CheckIcon,
  FlagIcon,
  HandshakeIcon,
  MagnifyingGlassIcon,
  PaperPlaneRightIcon,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ReportDialog } from '../components/ReportDialog.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { OfferStatusBadge, RequestStatusBadge, VerifiedBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime, useSocketEvent } from '../context/RealtimeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { eta, formatDate, formatTime, pkr, timeAgo } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';

function ConversationList({ items, activeId, loading, error, reload }) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return items;
    return items.filter((c) => c.other.name.toLowerCase().includes(f) || c.request?.title.toLowerCase().includes(f));
  }, [items, filter]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        <h1 className="px-1 pb-2 text-xl font-bold text-ink">Messages</h1>
        <div className="relative">
          <label htmlFor="conv-filter" className="sr-only">
            Search conversations
          </label>
          <MagnifyingGlassIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="conv-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or job…"
            className="h-10 w-full rounded-full border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {error ? (
          <ErrorState error={error} onRetry={reload} className="m-2 border-0" />
        ) : loading && !items.length ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">{items.length ? 'No conversations match.' : 'No conversations yet.'}</p>
        ) : (
          <ul>
            {shown.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/messages/${c.id}`}
                  aria-current={c.id === activeId ? 'page' : undefined}
                  className={`flex gap-3 rounded-2xl px-3 py-3 transition-colors ${c.id === activeId ? 'bg-accent-soft' : 'hover:bg-surface-3'}`}
                >
                  <Avatar src={c.other.avatar} name={c.other.name} size="md" online={c.other.online} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>{c.other.name}</span>
                      {c.lastMessage && <span className="shrink-0 text-xs text-muted">{timeAgo(c.lastMessage.at)}</span>}
                    </span>
                    <span className="block truncate text-xs font-medium text-accent-text">{c.request?.title || 'Request removed'}</span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-[0.82rem] ${c.unread ? 'font-semibold text-ink' : 'text-muted'}`}>{c.lastMessage?.text || 'No messages yet'}</span>
                      {c.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-accent px-1.5 text-[0.7rem] font-bold leading-5 text-on-accent">
                          {c.unread}
                          <span className="sr-only"> unread</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDate(d, { year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function Thread({ id, onConversationChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { emit, refreshCounts } = useRealtime();
  const { data: meta, error: metaError, reload: reloadMeta } = useApi(`/conversations/${id}`);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [reportId, setReportId] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const scroller = useRef(null);
  const stickToBottom = useRef(true);
  const typingTimer = useRef(null);
  const typingSent = useRef(false);
  const conv = meta?.conversation;
  const offer = meta?.offer;

  const markRead = useCallback(async () => {
    await api.post(`/conversations/${id}/read`).catch(() => {});
    onConversationChange?.(id, { unread: 0 });
    refreshCounts();
  }, [id, onConversationChange, refreshCounts]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setOtherTyping(false);
    stickToBottom.current = true;
    api
      .get(`/conversations/${id}/messages`, { limit: 40 })
      .then((res) => {
        if (cancelled) return;
        setMessages(res.items);
        setHasMore(res.hasMore);
      })
      .catch((err) => !cancelled && toast.error(err.message))
      .finally(() => !cancelled && setLoading(false));
    markRead();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping]);

  const onScroll = () => {
    const el = scroller.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingOlder(true);
    const el = scroller.current;
    const prevHeight = el.scrollHeight;
    try {
      const res = await api.get(`/conversations/${id}/messages`, { before: messages[0].createdAt, limit: 40 });
      stickToBottom.current = false;
      setMessages((m) => [...res.items, ...m]);
      setHasMore(res.hasMore);
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  useSocketEvent('message:new', ({ message, conversation }) => {
    if (conversation.id !== id) return;
    setMessages((m) => (m.some((x) => x.id === message.id) ? m : [...m, message]));
    if (message.sender && message.sender !== user.id) {
      setOtherTyping(false);
      markRead();
    }
    if (message.kind === 'system') reloadMeta();
  });
  useSocketEvent('typing', (p) => {
    if (p.conversationId === id && p.userId !== user.id) setOtherTyping(p.typing);
  });
  useSocketEvent('conversation:read', (p) => {
    if (p.conversationId !== id) return;
    setMessages((m) => m.map((x) => (x.sender === user.id && !x.readAt ? { ...x, readAt: p.readAt } : x)));
  });
  useSocketEvent('message:removed', (p) => {
    if (p.conversationId !== id) return;
    setMessages((m) => m.map((x) => (x.id === p.id ? { ...x, removed: true, text: 'This message was removed by a moderator.' } : x)));
  });

  // Safety net: if the typing "stop" event is lost, hide the indicator after a few seconds.
  useEffect(() => {
    if (!otherTyping) return undefined;
    const t = setTimeout(() => setOtherTyping(false), 6000);
    return () => clearTimeout(t);
  }, [otherTyping]);

  const sendTyping = (typing) => {
    if (typingSent.current === typing) return;
    typingSent.current = typing;
    emit('typing', { conversationId: id, typing });
  };

  const onChange = (e) => {
    setText(e.target.value);
    sendTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 2000);
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    clearTimeout(typingTimer.current);
    sendTyping(false);
    try {
      const res = await api.post(`/conversations/${id}/messages`, { text: body });
      stickToBottom.current = true;
      setMessages((m) => (m.some((x) => x.id === res.message.id) ? m : [...m, res.message]));
      setText('');
      onConversationChange?.(id, { lastMessage: { text: body, sender: user.id, at: res.message.createdAt } });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const accept = async () => {
    setAcceptBusy(true);
    try {
      await api.post(`/offers/${offer.id}/accept`);
      toast.success(`You hired ${conv.other.name}.`);
      setAccepting(false);
      reloadMeta();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAcceptBusy(false);
    }
  };

  if (metaError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState icon={ChatsCircleIcon} title="Conversation not found" description="It may have been removed, or it belongs to another account." action={<Button onClick={() => navigate('/messages')}>Back to messages</Button>} className="border-0" />
      </div>
    );
  }

  const lastMine = [...messages].reverse().find((m) => m.sender === user.id);
  let lastDay = '';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-4">
        <Link to="/messages" className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-3 lg:hidden" aria-label="Back to conversations">
          <ArrowLeftIcon size={20} />
        </Link>
        {conv ? (
          <>
            <Avatar src={conv.other.avatar} name={conv.other.name} size="md" online={conv.other.online} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-bold text-ink">
                {conv.myRole === 'customer' && conv.other.id ? (
                  <Link to={`/providers/${conv.other.id}`} className="truncate hover:underline">
                    {conv.other.name}
                  </Link>
                ) : (
                  <span className="truncate">{conv.other.name}</span>
                )}
                {conv.other.verified && <VerifiedBadge compact />}
              </p>
              <p className="truncate text-xs text-muted">
                {otherTyping ? <span className="font-semibold text-accent-text">typing</span> : conv.other.online ? 'Online now' : conv.other.lastSeenAt ? `Last seen ${timeAgo(conv.other.lastSeenAt)}` : ''}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        )}
      </div>

      {conv?.request && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-2 px-4 py-2.5 text-sm">
          <Link to={`/requests/${conv.request.id}`} className="w-full min-w-0 truncate font-semibold text-ink hover:underline sm:w-auto sm:flex-1">
            {conv.request.title}
          </Link>
          <RequestStatusBadge status={conv.request.status} short />
          {offer && (
            <span className="inline-flex items-center gap-2">
              <span className="font-display font-bold tabular-nums text-ink">{pkr(offer.price)}</span>
              <span className="text-muted">{eta(offer.etaMinutes)}</span>
              <OfferStatusBadge status={offer.status} />
            </span>
          )}
          {offer && conv.myRole === 'customer' && offer.status === 'pending' && conv.request.status === 'open' && (
            <Button size="sm" icon={HandshakeIcon} onClick={() => setAccepting(true)}>
              Accept offer
            </Button>
          )}
          {offer && conv.myRole === 'provider' && offer.status === 'pending' && (
            <Link to={`/requests/${conv.request.id}`} className="font-semibold text-accent-text hover:underline">
              Edit my offer
            </Link>
          )}
        </div>
      )}

      <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-4 sm:px-5" role="log" aria-live="polite" aria-label="Messages">
        {hasMore && (
          <div className="mb-4 text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} loading={loadingOlder}>
              Load earlier messages
            </Button>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Say hello and ask anything about the job. Keep payment talk on LocalFix so there is a record.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => {
              const day = dayLabel(m.createdAt);
              const showDay = day !== lastDay;
              lastDay = day;
              const mine = m.sender === user.id;
              return (
                <li key={m.id}>
                  {showDay && (
                    <p className="my-4 text-center text-xs font-semibold text-muted">
                      <span className="rounded-full bg-surface-3 px-3 py-1">{day}</span>
                    </p>
                  )}
                  {m.kind === 'system' ? (
                    <p className="mx-auto my-3 max-w-md rounded-2xl bg-surface-3 px-4 py-2 text-center text-xs text-ink-2">
                      {m.text}
                      <span className="ml-1 text-muted">{formatTime(m.createdAt)}</span>
                    </p>
                  ) : (
                    <div className={`group flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-[0.95rem] leading-relaxed sm:max-w-[65%] ${
                          m.removed ? 'border border-dashed border-line-strong italic text-muted' : mine ? 'rounded-br-lg bg-accent text-on-accent' : 'rounded-bl-lg border border-line bg-surface text-ink'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={`mt-0.5 flex items-center justify-end gap-1 text-[0.7rem] ${mine && !m.removed ? 'text-on-accent/80' : 'text-muted'}`}>
                          {formatTime(m.createdAt)}
                          {mine &&
                            (m.readAt ? (
                              <ChecksIcon size={14} weight="bold" aria-label="Seen" />
                            ) : (
                              <CheckIcon size={14} weight="bold" aria-label="Sent" />
                            ))}
                        </p>
                      </div>
                      {!mine && !m.removed && (
                        <button
                          type="button"
                          onClick={() => setReportId(m.id)}
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-surface-3 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
                          aria-label="Report this message"
                        >
                          <FlagIcon size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  {mine && lastMine?.id === m.id && m.readAt && <p className="mt-0.5 text-right text-[0.7rem] text-muted">Seen {timeAgo(m.readAt)}</p>}
                </li>
              );
            })}
          </ul>
        )}
        {otherTyping && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1.5 text-xs text-muted" aria-live="polite">
            <span className="inline-flex gap-0.5" aria-hidden="true">
              <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted" />
            </span>
            {conv?.other.name.split(' ')[0]} is typing
          </p>
        )}
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line bg-surface p-3">
        <label htmlFor="composer" className="sr-only">
          Write a message
        </label>
        <textarea
          id="composer"
          rows={1}
          value={text}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={2000}
          placeholder="Write a message…"
          className="max-h-36 min-h-11 flex-1 resize-none rounded-3xl border border-line-strong bg-surface-2 px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)] [field-sizing:content]"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send message"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-soft transition-[background-color,transform] duration-200 hover:bg-accent-hover active:scale-95 disabled:opacity-50"
        >
          {sending ? (
            <span className="size-5 animate-spin rounded-full border-2 border-on-accent/40 border-t-on-accent" aria-hidden="true" />
          ) : (
            <PaperPlaneRightIcon size={20} weight="fill" aria-hidden="true" />
          )}
        </button>
      </form>

      {reportId && <ReportDialog open onClose={() => setReportId(null)} targetType="message" targetId={reportId} />}
      <ConfirmDialog
        open={accepting}
        onClose={() => setAccepting(false)}
        onConfirm={accept}
        busy={acceptBusy}
        title={`Hire ${conv?.other.name}?`}
        description={offer ? `For ${pkr(offer.price)}, arriving within ${eta(offer.etaMinutes)}. Other offers will be declined and your address shared with this provider.` : ''}
        confirmLabel="Accept offer"
      />
    </div>
  );
}

export default function Messages() {
  useDocumentTitle('Messages');
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useApi('/conversations');
  const items = data?.items || [];

  const patchConversation = useCallback(
    (convId, patch) => {
      setData((d) => (d ? { ...d, items: d.items.map((c) => (c.id === convId ? { ...c, ...patch } : c)) } : d));
    },
    [setData]
  );

  useSocketEvent('message:new', ({ message, conversation }) => {
    if (!data?.items.some((c) => c.id === conversation.id)) {
      reload(); // a brand-new conversation: fetch the list with full details
      return;
    }
    setData((d) => {
      const existing = d.items.find((c) => c.id === conversation.id);
      if (!existing) return d;
      const isMine = message.sender === user.id;
      const updated = {
        ...existing,
        lastMessage: conversation.lastMessage,
        unread: conversation.id === id || isMine ? existing.unread : existing.unread + 1,
      };
      return { ...d, items: [updated, ...d.items.filter((c) => c.id !== conversation.id)] };
    });
  });

  return (
    <div className="container-page py-4 sm:py-6">
      <div className="grid h-[calc(100dvh-9.5rem)] min-h-[28rem] overflow-hidden rounded-card border border-line bg-surface md:h-[calc(100dvh-8rem)] lg:grid-cols-[21rem_1fr]">
        <div className={`min-h-0 border-line lg:border-r ${id ? 'hidden lg:block' : ''}`}>
          <ConversationList items={items} activeId={id} loading={loading} error={error} reload={reload} />
        </div>
        <div className={`min-h-0 ${id ? '' : 'hidden lg:block'}`}>
          {id ? (
            <Thread key={id} id={id} onConversationChange={patchConversation} />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={ChatsCircleIcon}
                title={items.length ? 'Choose a conversation' : 'No messages yet'}
                description={
                  user.role === 'provider'
                    ? 'Open a request and tap "Ask a question first" or send an offer to start chatting.'
                    : 'When providers send offers, use "Chat" on the offer to ask questions and negotiate.'
                }
                className="border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
