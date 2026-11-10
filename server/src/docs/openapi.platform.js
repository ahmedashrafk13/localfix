// OpenAPI paths and schemas for the platform endpoints: third-party integrations (maps, routing,
// weather, AI assistant), Web Push, price insights, calendar export and system status.
// The marketplace endpoints are described in openapi.base.js; openapi.js merges both.

const session = [{ cookieAuth: [] }, { bearerAuth: [] }];
const json = (schema) => ({ 'application/json': { schema } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const err = (name) => ({ $ref: `#/components/responses/${name}` });
const idParam = { name: 'id', in: 'path', required: true, description: 'Request id.', schema: ref('ObjectId') };
const latParam = (name, required = true) => ({ name, in: 'query', required, schema: { type: 'number', minimum: -90, maximum: 90 } });
const lngParam = (name, required = true) => ({ name, in: 'query', required, schema: { type: 'number', minimum: -180, maximum: 180 } });

export const tags = [
  { name: 'Location', description: 'Address search, reverse geocoding, routing and weather. Proxied, cached and rate limited by this server; data from OpenStreetMap (Photon, Nominatim, OSRM) and Open-Meteo.' },
  { name: 'Assistant', description: 'Turns a rough problem description into a ready-to-post request. Uses the Claude API when configured, otherwise a built-in rule engine.' },
  { name: 'Insights', description: 'Price guidance computed from real offers on the marketplace.' },
  { name: 'Push', description: 'Web Push (VAPID) subscriptions for notifications that arrive when LocalFix is closed.' },
  { name: 'System', description: 'Health, API description and integration status.' },
];

export const schemas = {
  AreaMatch: {
    type: ['object', 'null'],
    description: 'The LocalFix launch area closest to a point, or null when the point is outside the service region.',
    properties: { city: { type: 'string' }, area: { type: 'string' }, distanceKm: { type: 'number' } },
  },
  PlaceSuggestion: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      label: { type: 'string' },
      detail: { type: 'string' },
      address: { type: 'string', maxLength: 200 },
      lat: { type: 'number' },
      lng: { type: 'number' },
      match: ref('AreaMatch'),
    },
  },
  ReverseGeocode: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Short street address suitable for the request form.' },
      street: { type: 'string' },
      suburb: { type: 'string' },
      city: { type: 'string' },
      displayName: { type: 'string' },
      match: ref('AreaMatch'),
      stale: { type: 'boolean', description: 'True when the upstream was down and a cached answer was served.' },
      attribution: { type: 'string' },
    },
  },
  WeatherDay: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date' },
      label: { type: 'string', examples: ['Rain'] },
      icon: { type: 'string', enum: ['clear', 'partly-cloudy', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm'] },
      maxC: { type: ['number', 'null'] },
      minC: { type: ['number', 'null'] },
      rainChance: { type: ['number', 'null'], description: 'Maximum precipitation probability, percent.' },
      rainMm: { type: ['number', 'null'] },
      windKph: { type: ['number', 'null'] },
    },
  },
  WorkAdvisory: {
    type: ['object', 'null'],
    description: 'Advice for the focus day and the kind of work. "caution" means the weather may delay the job.',
    properties: { level: { type: 'string', enum: ['ok', 'info', 'caution'] }, message: { type: 'string' } },
  },
  Forecast: {
    type: 'object',
    properties: {
      current: {
        type: ['object', 'null'],
        properties: { tempC: { type: 'number' }, label: { type: 'string' }, icon: { type: 'string' }, windKph: { type: 'number' }, rainMm: { type: 'number' }, at: { type: 'string' } },
      },
      days: { type: 'array', items: ref('WeatherDay') },
      timezone: { type: 'string' },
      cached: { type: 'boolean' },
      stale: { type: 'boolean' },
      attribution: { type: 'string' },
      focus: { anyOf: [ref('WeatherDay'), { type: 'null' }], description: 'The day the advice is about: the requested or preferred date, or today.' },
      focusIsPreferredDate: { type: 'boolean' },
      advisory: ref('WorkAdvisory'),
    },
  },
  Route: {
    type: 'object',
    properties: {
      distanceKm: { type: 'number' },
      durationMin: { type: 'integer' },
      geometry: { type: ['array', 'null'], description: 'Route line as [lat, lng] pairs. Null for a straight-line estimate.', items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 } },
      source: { type: 'string', enum: ['osrm', 'estimate'], description: '"estimate" means OSRM was unreachable and a straight-line estimate was used.' },
    },
  },
  AssistantSuggestion: {
    type: 'object',
    properties: {
      category: { anyOf: [ref('Category'), { type: 'null' }] },
      title: { type: 'string', maxLength: 100 },
      urgency: { type: 'string', enum: ['emergency', 'today', 'this_week', 'flexible'] },
      questions: { type: 'array', maxItems: 4, items: { type: 'string' }, description: 'Details a provider needs before quoting.' },
      safetyNote: { type: 'string', description: 'What to do right now when the situation is dangerous, otherwise empty.' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
  },
  PriceInsight: {
    type: ['object', 'null'],
    description: 'Null when the category has fewer than 5 offers.',
    properties: {
      basis: { type: 'string', enum: ['accepted', 'quoted'], description: 'Whether the range comes from accepted offers or from all offers sent.' },
      sample: { type: 'integer' },
      low: { type: 'integer', description: '25th percentile, rupees.' },
      median: { type: 'integer' },
      high: { type: 'integer', description: '75th percentile, rupees.' },
      typicalEtaMinutes: { type: ['integer', 'null'] },
      avgOffersPerRequest: { type: ['number', 'null'] },
    },
  },
  PushSubscriptionInput: {
    type: 'object',
    required: ['endpoint', 'keys'],
    description: 'The object returned by PushSubscription.toJSON() in the browser.',
    properties: {
      endpoint: { type: 'string', format: 'uri', maxLength: 1000, description: 'Must be an HTTPS URL of a known browser push service (FCM, Mozilla, WNS, Apple).' },
      keys: {
        type: 'object',
        required: ['p256dh', 'auth'],
        properties: { p256dh: { type: 'string', minLength: 20, maxLength: 200 }, auth: { type: 'string', minLength: 8, maxLength: 100 } },
      },
    },
  },
  UpstreamStatus: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      label: { type: 'string' },
      purpose: { type: 'string' },
      host: { type: 'string' },
      enabled: { type: 'boolean' },
      breaker: { type: 'string', enum: ['closed', 'open', 'half-open'] },
      calls: { type: 'integer' },
      cacheHits: { type: 'integer' },
      cacheHitRate: { type: ['integer', 'null'] },
      staleServed: { type: 'integer' },
      failures: { type: 'integer' },
      retries: { type: 'integer' },
      shortCircuited: { type: 'integer' },
      lastError: { type: ['string', 'null'] },
      latencyMs: { type: 'object', properties: { p50: { type: ['number', 'null'] }, p95: { type: ['number', 'null'] } } },
    },
  },
};

export const responses = {
  ServiceUnavailable: { description: 'A third-party service is down and no cached answer exists.', content: json(ref('Error')) },
};

export const paths = {
  '/geo/search': {
    get: {
      tags: ['Location'],
      summary: 'Search for an address',
      description: 'Type-ahead search limited to the Islamabad and Rawalpindi service region. Limited to 60 lookups per minute per client.',
      operationId: 'searchPlaces',
      security: [],
      parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 3, maxLength: 80 } }],
      responses: {
        200: { description: 'Matching places.', content: json({ type: 'object', properties: { items: { type: 'array', items: ref('PlaceSuggestion') }, stale: { type: 'boolean' }, attribution: { type: 'string' } } }) },
        400: err('BadRequest'),
        429: err('TooManyRequests'),
        503: err('ServiceUnavailable'),
      },
    },
  },
  '/geo/reverse': {
    get: {
      tags: ['Location'],
      summary: 'Turn coordinates into an address',
      operationId: 'reverseGeocode',
      security: [],
      parameters: [latParam('lat'), lngParam('lng')],
      responses: { 200: { description: 'The address at that point.', content: json(ref('ReverseGeocode')) }, 400: err('BadRequest'), 429: err('TooManyRequests'), 503: err('ServiceUnavailable') },
    },
  },
  '/geo/weather': {
    get: {
      tags: ['Location'],
      summary: 'Get the 7-day forecast for a point',
      description: 'Coordinates are rounded to about 1 km before the upstream call. Pass `date` and `category` to get advice for a planned job.',
      operationId: 'getWeather',
      security: [],
      parameters: [
        latParam('lat'),
        lngParam('lng'),
        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'category', in: 'query', description: 'Category slug, used for the work advisory.', schema: { type: 'string', maxLength: 60 } },
      ],
      responses: { 200: { description: 'Forecast and advisory.', content: json(ref('Forecast')) }, 400: err('BadRequest'), 429: err('TooManyRequests'), 503: err('ServiceUnavailable') },
    },
  },
  '/requests/{id}/weather': {
    get: {
      tags: ['Location'],
      summary: 'Get the forecast for a request',
      description: 'Visible to anyone who can view the request. The advisory uses the request category and preferred date.',
      operationId: 'getRequestWeather',
      security: [],
      parameters: [idParam],
      responses: { 200: { description: 'Forecast and advisory.', content: json(ref('Forecast')) }, 404: err('NotFound'), 429: err('TooManyRequests'), 503: err('ServiceUnavailable') },
    },
  },
  '/requests/{id}/route': {
    get: {
      tags: ['Location'],
      summary: 'Get the drive to a request',
      description:
        'Driving distance, time and route line from the viewer to the job. Only the customer, the hired provider and admins are routed to the exact pin; everyone else is routed to the public ~1 km rounded point (`approximate: true`). The starting point defaults to the signed-in user\'s saved location.',
      operationId: 'getRequestRoute',
      security: session,
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [idParam, latParam('fromLat', false), lngParam('fromLng', false)],
      responses: {
        200: {
          description: 'The route.',
          content: json({
            type: 'object',
            properties: {
              route: ref('Route'),
              from: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
              to: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
              approximate: { type: 'boolean' },
              attribution: { type: 'string' },
            },
          }),
        },
        400: err('BadRequest'),
        401: err('Unauthorized'),
        404: err('NotFound'),
        429: err('TooManyRequests'),
      },
    },
  },
  '/requests/{id}/calendar.ics': {
    get: {
      tags: ['Requests'],
      summary: 'Download the booked job as a calendar event',
      description: 'iCalendar (RFC 5545) file with the visit time, address and contact details. Only for the customer and the hired provider while the job is in progress.',
      operationId: 'getRequestCalendar',
      security: session,
      'x-roles': ['customer', 'provider'],
      parameters: [idParam],
      responses: {
        200: { description: 'The event.', content: { 'text/calendar': { schema: { type: 'string' } } } },
        401: err('Unauthorized'),
        403: err('Forbidden'),
        404: err('NotFound'),
        409: err('Conflict'),
      },
    },
  },
  '/assistant/describe': {
    post: {
      tags: ['Assistant'],
      summary: 'Suggest request details from a description',
      description: 'Limited to 10 calls per minute per client. `engine` says which engine answered.',
      operationId: 'describeProblem',
      security: [],
      requestBody: { required: true, content: json({ type: 'object', required: ['text'], properties: { text: { type: 'string', minLength: 10, maxLength: 1500 } } }) },
      responses: {
        200: { description: 'The suggestion.', content: json({ type: 'object', properties: { suggestion: ref('AssistantSuggestion'), engine: { type: 'string', enum: ['claude', 'rules'] } } }) },
        400: err('BadRequest'),
        429: err('TooManyRequests'),
      },
    },
  },
  '/insights/price': {
    get: {
      tags: ['Insights'],
      summary: 'Get typical prices for a category',
      operationId: 'getPriceInsight',
      security: [],
      parameters: [{ name: 'category', in: 'query', required: true, description: 'Category slug or id.', schema: { type: 'string', maxLength: 60 } }],
      responses: {
        200: { description: 'Price range.', content: json({ type: 'object', properties: { category: ref('Category'), insight: ref('PriceInsight'), currency: { type: 'string', const: 'PKR' } } }) },
        400: err('BadRequest'),
        404: err('NotFound'),
      },
    },
  },
  '/push/public-key': {
    get: {
      tags: ['Push'],
      summary: 'Get the VAPID public key',
      operationId: 'getPushPublicKey',
      security: [],
      responses: { 200: { description: 'The application server key for PushManager.subscribe().', content: json({ type: 'object', properties: { publicKey: { type: 'string' } } }) } },
    },
  },
  '/push/subscriptions': {
    get: {
      tags: ['Push'],
      summary: 'Count my registered devices',
      operationId: 'countPushSubscriptions',
      security: session,
      'x-roles': ['customer', 'provider', 'admin'],
      responses: { 200: { description: 'Device count.', content: json({ type: 'object', properties: { devices: { type: 'integer' } } }) }, 401: err('Unauthorized') },
    },
    post: {
      tags: ['Push'],
      summary: 'Register this browser for push notifications',
      description: 'Idempotent per endpoint. At most 10 devices per account; the oldest are dropped.',
      operationId: 'createPushSubscription',
      security: session,
      'x-roles': ['customer', 'provider', 'admin'],
      requestBody: { required: true, content: json(ref('PushSubscriptionInput')) },
      responses: {
        201: { description: 'Registered.', content: json({ type: 'object', properties: { ok: { type: 'boolean' }, devices: { type: 'integer' } } }) },
        400: err('BadRequest'),
        401: err('Unauthorized'),
        429: err('TooManyRequests'),
      },
    },
    delete: {
      tags: ['Push'],
      summary: 'Unregister this browser',
      operationId: 'deletePushSubscription',
      security: session,
      'x-roles': ['customer', 'provider', 'admin'],
      requestBody: { required: true, content: json({ type: 'object', required: ['endpoint'], properties: { endpoint: { type: 'string', maxLength: 1000 } } }) },
      responses: { 200: { description: 'Removed.', content: json({ type: 'object', properties: { ok: { type: 'boolean' }, devices: { type: 'integer' } } }) }, 400: err('BadRequest'), 401: err('Unauthorized') },
    },
  },
  '/push/test': {
    post: {
      tags: ['Push'],
      summary: 'Send myself a test notification',
      operationId: 'sendTestPush',
      security: session,
      'x-roles': ['customer', 'provider', 'admin'],
      responses: {
        200: { description: 'Delivery result.', content: json({ type: 'object', properties: { sent: { type: 'integer' }, removed: { type: 'integer' }, failed: { type: 'integer' } } }) },
        401: err('Unauthorized'),
        409: err('Conflict'),
        429: err('TooManyRequests'),
      },
    },
  },
  '/admin/integrations': {
    get: {
      tags: ['System'],
      summary: 'Get the status of third-party integrations',
      operationId: 'getIntegrations',
      security: session,
      'x-roles': ['admin'],
      responses: {
        200: {
          description: 'Per-upstream call counts, cache hit rate, latency and circuit breaker state.',
          content: json({
            type: 'object',
            properties: {
              externalApisEnabled: { type: 'boolean' },
              upstreams: { type: 'array', items: ref('UpstreamStatus') },
              assistant: { type: 'object', properties: { engine: { type: 'string', enum: ['claude', 'rules'] }, model: { type: ['string', 'null'] }, note: { type: 'string' } } },
              push: { type: 'object', properties: { devices: { type: 'integer' }, users: { type: 'integer' }, keySource: { type: 'string' } } },
              email: { type: 'object', properties: { transport: { type: 'string' } } },
              generatedAt: { type: 'string', format: 'date-time' },
            },
          }),
        },
        401: err('Unauthorized'),
        403: err('Forbidden'),
      },
    },
  },
  '/openapi.json': {
    get: {
      tags: ['System'],
      summary: 'Get this API description',
      operationId: 'getOpenApi',
      security: [],
      responses: { 200: { description: 'OpenAPI 3.1 document.', content: json({ type: 'object' }) } },
    },
  },
  '/docs': {
    get: {
      tags: ['System'],
      summary: 'Open the interactive API reference',
      operationId: 'getDocs',
      security: [],
      responses: { 200: { description: 'Swagger UI.', content: { 'text/html': { schema: { type: 'string' } } } } },
    },
  },
};

/** Replaces the base description of GET /health with the extended payload. */
export const healthOperation = {
  tags: ['System'],
  summary: 'Check service health',
  description: 'Returns 503 when the database is not connected, so load balancers stop routing to this instance.',
  operationId: 'getHealth',
  security: [],
  responses: {
    200: {
      description: 'Healthy.',
      content: json({
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          version: { type: 'string' },
          uptime: { type: 'integer', description: 'Seconds since the process started.' },
          time: { type: 'string', format: 'date-time' },
          database: { type: 'string', enum: ['connected', 'connecting', 'disconnected'] },
          integrations: { type: 'object', additionalProperties: { type: 'string', enum: ['closed', 'open', 'half-open', 'disabled'] } },
        },
      }),
    },
    503: { description: 'The database is unreachable.', content: json({ type: 'object', properties: { ok: { type: 'boolean', const: false } }, additionalProperties: true }) },
  },
};
