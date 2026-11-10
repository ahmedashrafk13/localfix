// Admin view of every third-party service LocalFix depends on: is it enabled, is its circuit
// breaker closed, how fast is it and how much traffic the cache absorbs.
import { Router } from 'express';
import { env } from '../config/env.js';
// Importing the integration modules registers their upstream clients even before first use.
import '../integrations/geocoding.js';
import '../integrations/routing.js';
import '../integrations/weather.js';
import { upstreamSnapshots } from '../integrations/upstream.js';
import { PushSubscription } from '../models/index.js';
import { assistantEngine } from '../services/assistant.js';

const router = Router();

router.get('/', async (req, res) => {
  const [devices, users] = await Promise.all([PushSubscription.countDocuments({}), PushSubscription.distinct('user')]);
  res.json({
    externalApisEnabled: env.EXTERNAL_APIS,
    upstreams: upstreamSnapshots(),
    assistant: {
      engine: assistantEngine(),
      model: assistantEngine() === 'claude' ? env.AI_MODEL : null,
      note: assistantEngine() === 'claude' ? 'Claude API with a built-in rule engine as fallback.' : 'Built-in rule engine. Set ANTHROPIC_API_KEY to use the Claude API.',
    },
    push: {
      devices,
      users: users.length,
      keySource: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? 'environment' : 'generated and stored in the database',
    },
    email: { transport: env.hasSmtp ? 'smtp' : 'console (no SMTP configured)' },
    generatedAt: new Date(),
  });
});

export default router;
