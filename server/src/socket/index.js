import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { isObjectId, sameId } from '../utils/http.js';
import { SESSION_COOKIE, parseCookieHeader, verifySession } from '../utils/tokens.js';

let io = null;
const online = new Map(); // userId -> number of open sockets

export function isOnline(userId) {
  return (online.get(String(userId)) || 0) > 0;
}

export function emitToUser(userId, event, payload) {
  if (io && userId) io.to(`user:${userId.toString()}`).emit(event, payload);
}

export function emitToUsers(userIds, event, payload) {
  for (const id of userIds) emitToUser(id, event, payload);
}

async function authenticate(socket, next) {
  try {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie || '');
    const token = cookies[SESSION_COOKIE] || socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    const payload = verifySession(token);
    const user = await User.findById(payload.sub).select('_id role status tokenVersion name');
    if (!user || user.status !== 'active' || (user.tokenVersion || 0) !== (payload.tv || 0)) {
      return next(new Error('unauthorized'));
    }
    socket.data.user = { id: user._id.toString(), role: user.role, name: user.name };
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    // In development Vite proxies /socket.io, so the browser is same-origin. No CORS is opened.
    cors: { origin: false },
    pingInterval: 20_000,
    pingTimeout: 20_000,
  });

  io.use(authenticate);

  io.on('connection', (socket) => {
    const { id: userId } = socket.data.user;
    socket.join(`user:${userId}`);
    online.set(userId, (online.get(userId) || 0) + 1);

    // Typing indicator: only relayed to the other participant of a conversation the sender belongs to.
    socket.on('typing', async (payload = {}) => {
      const { conversationId, typing } = payload;
      if (!isObjectId(conversationId)) return;
      const conv = await Conversation.findById(conversationId).select('customer provider').lean();
      if (!conv) return;
      const isCustomer = sameId(conv.customer, userId);
      const isProvider = sameId(conv.provider, userId);
      if (!isCustomer && !isProvider) return;
      const other = isCustomer ? conv.provider : conv.customer;
      emitToUser(other, 'typing', { conversationId, userId, typing: Boolean(typing) });
    });

    socket.on('presence:query', (ids = [], ack) => {
      if (typeof ack !== 'function' || !Array.isArray(ids)) return;
      ack(Object.fromEntries(ids.slice(0, 50).map((id) => [id, isOnline(id)])));
    });

    socket.on('disconnect', () => {
      const left = (online.get(userId) || 1) - 1;
      if (left <= 0) {
        online.delete(userId);
        User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
      } else {
        online.set(userId, left);
      }
    });
  });

  if (!env.isTest) console.log('[socket] realtime ready');
  return io;
}

/** Force-disconnect every socket of a user (used after suspension or password change). */
export function disconnectUser(userId) {
  if (io) io.in(`user:${userId.toString()}`).disconnectSockets(true);
}
