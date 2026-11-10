/**
 * OpenAPI 3.1 building blocks for the LocalFix REST API (the 12 core routers).
 * Paths are relative to the server URL `/api`. The final document (info, servers, security schemes
 * `cookieAuth` / `bearerAuth`, global X-Requested-With note) is assembled elsewhere.
 *
 * Conventions used here:
 * - `security: []` marks a public route. Some public routes still read an optional session to
 *   personalise the response; that is stated in the operation description.
 * - `x-roles` lists the account roles that can pass the route's auth middleware.
 * - Multipart routes carry their JSON fields as a string field named `data` next to the file field(s).
 */

export const tags = [
  { name: 'Auth', description: 'Registration, login, session, email verification and password management.' },
  { name: 'Account', description: "The signed-in user's own account: profile, avatar, data export, deletion." },
  { name: 'Categories', description: 'Public list of active service categories.' },
  { name: 'Requests', description: 'Service requests posted by customers, and their lifecycle (open, assigned, completed, cancelled).' },
  { name: 'Offers', description: 'Offers (bids) that verified providers send on open requests.' },
  { name: 'Providers', description: 'Provider directory, public profiles and the provider-managed profile.' },
  { name: 'Reviews', description: 'Customer reviews of completed jobs and provider replies.' },
  { name: 'Chat', description: 'Conversations between a customer and a provider about one request.' },
  { name: 'Notifications', description: 'In-app notifications for the signed-in user.' },
  { name: 'Reports', description: 'User reports of abusive or fraudulent content, for moderation.' },
  { name: 'Dashboard', description: 'Role-specific dashboard summaries.' },
  { name: 'Admin', description: 'Administration: statistics, users, verification, moderation, categories, tips, support inbox.' },
  { name: 'Public', description: 'Public metadata, home page statistics, maintenance tips, contact form, analytics and health.' },
];

export const schemas = {
  /* ---------- Primitives and envelopes ---------- */
  ObjectId: {
    type: 'string',
    pattern: '^[a-fA-F0-9]{24}$',
    description: 'MongoDB ObjectId as a 24-character hexadecimal string.',
    example: '665f1c2ab7e4a91d3c0f8a12',
  },
  Error: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', description: 'Human-readable message, safe to show to the user.' },
          fields: {
            type: 'object',
            description: 'Per-field validation messages, keyed by field path (dot-separated). Only on validation errors.',
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
  },
  Ok: {
    type: 'object',
    required: ['ok'],
    properties: { ok: { type: 'boolean', const: true } },
  },
  OkMessage: {
    type: 'object',
    required: ['ok', 'message'],
    properties: { ok: { type: 'boolean', const: true }, message: { type: 'string' } },
  },
  Pagination: {
    type: 'object',
    description: 'Pagination envelope fields shared by every paginated list.',
    required: ['items', 'total', 'page', 'pages', 'limit'],
    properties: {
      items: { type: 'array' },
      total: { type: 'integer', minimum: 0, description: 'Total number of matching records.' },
      page: { type: 'integer', minimum: 1 },
      pages: { type: 'integer', minimum: 1, description: 'Total number of pages (at least 1).' },
      limit: { type: 'integer', minimum: 1 },
    },
  },
  Password: {
    type: 'string',
    minLength: 8,
    maxLength: 72,
    pattern: '^(?=.*[A-Za-z])(?=.*\\d).+$',
    description: 'Must contain at least one letter and one digit.',
  },

  /* ---------- Categories ---------- */
  Category: {
    type: 'object',
    description: 'A service category. When the reference was not populated only `id` is present.',
    required: ['id'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      name: { type: 'string', maxLength: 60 },
      slug: { type: 'string', maxLength: 60 },
      icon: { type: 'string', maxLength: 40, description: 'Phosphor icon name, e.g. `Wrench`.' },
      description: { type: 'string', maxLength: 300 },
      image: { type: 'string', description: 'Public image URL path, or an empty string.' },
      active: { type: 'boolean' },
      order: { type: 'integer' },
    },
  },
  CategoryWithCounts: {
    allOf: [
      { $ref: '#/components/schemas/Category' },
      {
        type: 'object',
        required: ['openRequests', 'providers'],
        properties: {
          openRequests: { type: 'integer', minimum: 0, description: 'Open, non-removed requests in this category.' },
          providers: { type: 'integer', minimum: 0, description: 'Active verified providers offering this category.' },
        },
      },
    ],
  },
  AdminCategory: {
    allOf: [
      { $ref: '#/components/schemas/Category' },
      {
        type: 'object',
        required: ['requests'],
        properties: { requests: { type: 'integer', minimum: 0, description: 'Total requests ever posted in this category.' } },
      },
    ],
  },
  CategoryInput: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 60 },
      icon: { type: 'string', pattern: '^[A-Za-z]+$', maxLength: 40, default: 'Wrench', description: 'Phosphor icon name.' },
      description: { type: 'string', maxLength: 300, default: '' },
      active: { type: 'boolean', default: true },
      order: { type: 'integer', minimum: 0, maximum: 999, default: 0 },
    },
  },
  CategoryUpdateInput: {
    type: 'object',
    description: 'Partial update: only the supplied fields change (defaults are not applied).',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 60 },
      icon: { type: 'string', pattern: '^[A-Za-z]+$', maxLength: 40 },
      description: { type: 'string', maxLength: 300 },
      active: { type: 'boolean' },
      order: { type: 'integer', minimum: 0, maximum: 999 },
    },
  },

  /* ---------- Users and providers ---------- */
  UserSummary: {
    type: 'object',
    description: 'Minimal public view of a user. A deleted account appears as `{ id: null, name: "Deleted user", role: "deleted" }`.',
    required: ['id', 'name', 'avatar', 'role'],
    properties: {
      id: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$' },
      name: { type: 'string', description: 'Full name, or a shortened form such as "Ayesha K." where privacy rules apply.' },
      avatar: { type: 'string', description: 'Avatar URL path, or an empty string.' },
      role: { type: 'string', enum: ['customer', 'provider', 'admin', 'deleted'] },
    },
  },
  ProviderCard: {
    type: 'object',
    description: 'Public provider summary. For a deleted account only `id` (null), `name`, `avatar`, `role` ("deleted") and `verified` (false) are present.',
    required: ['id', 'name', 'avatar', 'verified'],
    properties: {
      id: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$' },
      name: { type: 'string' },
      avatar: { type: 'string' },
      role: { type: 'string', enum: ['deleted'], description: 'Only present for a deleted account.' },
      city: { type: 'string' },
      area: { type: 'string' },
      headline: { type: 'string', maxLength: 100 },
      categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
      experienceYears: { type: 'integer', minimum: 0, maximum: 60 },
      ratingAvg: { type: 'number', minimum: 0, maximum: 5, description: 'Rounded to one decimal place.' },
      ratingCount: { type: 'integer', minimum: 0 },
      jobsCompleted: { type: 'integer', minimum: 0 },
      verified: { type: 'boolean' },
      availableNow: { type: 'boolean' },
      startingPrice: { type: ['number', 'null'], minimum: 0 },
      serviceAreas: { type: 'array', items: { type: 'string' } },
      memberSince: { type: 'string', format: 'date-time' },
      lastSeenAt: { type: ['string', 'null'], format: 'date-time' },
    },
  },
  ProviderListItem: {
    allOf: [
      { $ref: '#/components/schemas/ProviderCard' },
      { type: 'object', required: ['online'], properties: { online: { type: 'boolean', description: 'Has a live socket connection right now.' } } },
    ],
  },
  AssignedProvider: {
    description: 'The provider hired for a request. When the reference was not populated only `id` is present.',
    allOf: [
      { $ref: '#/components/schemas/ProviderCard' },
      {
        type: 'object',
        properties: { phone: { type: 'string', description: 'Only visible to the request owner, the assigned provider and admins.' } },
      },
    ],
  },
  Certification: {
    type: 'object',
    required: ['title'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      title: { type: 'string', maxLength: 120 },
      issuer: { type: 'string', maxLength: 120 },
      year: { type: 'integer', minimum: 1970, maximum: 2100 },
    },
  },
  GalleryItem: {
    type: 'object',
    required: ['id', 'url', 'kind'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      url: { type: 'string' },
      caption: { type: 'string', maxLength: 140 },
      kind: { type: 'string', enum: ['before', 'after', 'work'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  AvailabilityDay: {
    type: 'object',
    required: ['day', 'enabled', 'from', 'to'],
    properties: {
      day: { type: 'integer', minimum: 0, maximum: 6, description: '0 = Sunday ... 6 = Saturday.' },
      enabled: { type: 'boolean' },
      from: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'Opening time, HH:MM (24 hour).' },
      to: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'Closing time, HH:MM. Must be after `from` when the day is enabled.' },
    },
  },
  Availability: {
    type: 'object',
    required: ['availableNow', 'weekly'],
    properties: {
      availableNow: { type: 'boolean' },
      weekly: { type: 'array', items: { $ref: '#/components/schemas/AvailabilityDay' } },
    },
  },
  ProviderVerification: {
    type: 'object',
    description: 'Identity verification state. Private: only shown to the provider and admins.',
    required: ['status', 'idLast4', 'submittedAt', 'reviewedAt', 'note'],
    properties: {
      status: { type: 'string', enum: ['unverified', 'pending', 'verified', 'rejected'] },
      idLast4: { type: 'string', description: 'Last four digits of the submitted CNIC number, or an empty string.' },
      submittedAt: { type: ['string', 'null'], format: 'date-time' },
      reviewedAt: { type: ['string', 'null'], format: 'date-time' },
      note: { type: 'string', maxLength: 500, description: "Reviewer's note, e.g. the reason for a rejection." },
    },
  },
  ProviderProfile: {
    allOf: [
      { $ref: '#/components/schemas/ProviderCard' },
      {
        type: 'object',
        required: ['bio', 'certifications', 'gallery', 'availability', 'location'],
        properties: {
          bio: { type: 'string', maxLength: 1500 },
          certifications: { type: 'array', items: { $ref: '#/components/schemas/Certification' } },
          gallery: { type: 'array', items: { $ref: '#/components/schemas/GalleryItem' } },
          availability: { $ref: '#/components/schemas/Availability' },
          location: {
            type: ['object', 'null'],
            required: ['lng', 'lat'],
            properties: { lng: { type: 'number' }, lat: { type: 'number' } },
          },
          verification: { $ref: '#/components/schemas/ProviderVerification' },
        },
      },
    ],
  },
  PublicProviderProfile: {
    allOf: [
      { $ref: '#/components/schemas/ProviderProfile' },
      {
        type: 'object',
        required: ['online', 'status'],
        properties: {
          online: { type: 'boolean' },
          status: { type: 'string', enum: ['active', 'suspended'] },
        },
      },
    ],
  },
  SelfUser: {
    type: 'object',
    description: "The signed-in user's own account view.",
    required: ['id', 'name', 'email', 'phone', 'role', 'avatar', 'city', 'area', 'emailVerified', 'mustVerifyEmail', 'status', 'createdAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      role: { type: 'string', enum: ['customer', 'provider', 'admin'] },
      avatar: { type: 'string' },
      city: { type: 'string' },
      area: { type: 'string' },
      emailVerified: { type: 'boolean' },
      mustVerifyEmail: { type: 'boolean', description: 'True when email verification is enforced and this account has not verified yet.' },
      status: { type: 'string', enum: ['active', 'suspended'] },
      createdAt: { type: 'string', format: 'date-time' },
      provider: {
        description: 'Only present for provider accounts. Includes the private `verification` block.',
        allOf: [{ $ref: '#/components/schemas/ProviderProfile' }],
      },
    },
  },
  UserEnvelope: {
    type: 'object',
    required: ['user'],
    properties: { user: { $ref: '#/components/schemas/SelfUser' } },
  },

  /* ---------- Requests ---------- */
  RequestCustomer: {
    description: 'The customer who posted a request. When the reference was not populated only `id` is present.',
    allOf: [
      { $ref: '#/components/schemas/UserSummary' },
      {
        type: 'object',
        properties: {
          memberSince: { type: 'string', format: 'date-time' },
          phone: { type: 'string', description: 'Only visible to the assigned provider and admins.' },
        },
      },
    ],
  },
  MyOfferSummary: {
    type: 'object',
    description: "The viewing provider's own offer on a request, in short form.",
    required: ['id', 'status', 'price'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'withdrawn'] },
      price: { type: 'number' },
    },
  },
  ServiceRequest: {
    type: 'object',
    description:
      'A service request. The exact address, exact map pin, the customer full name and phone numbers are only visible to the owner, the assigned provider and admins; everyone else gets the area and a pin rounded to about 1 km (`location.approximate` is true).',
    required: ['id', 'title', 'description', 'images', 'category', 'location', 'urgency', 'status', 'offerCount', 'customer', 'createdAt', 'viewer'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      title: { type: 'string', minLength: 5, maxLength: 100 },
      description: { type: 'string', minLength: 20, maxLength: 2000 },
      images: { type: 'array', items: { type: 'string' }, description: 'Public image URL paths.' },
      category: { anyOf: [{ $ref: '#/components/schemas/Category' }, { type: 'null' }] },
      location: {
        type: 'object',
        required: ['lat', 'lng', 'approximate'],
        properties: {
          city: { type: 'string' },
          area: { type: 'string' },
          address: { type: ['string', 'null'], description: 'Exact address; null for viewers without access.' },
          lat: { type: 'number', description: 'Rounded to two decimals for viewers without access.' },
          lng: { type: 'number', description: 'Rounded to two decimals for viewers without access.' },
          approximate: { type: 'boolean' },
        },
      },
      budget: {
        type: ['object', 'null'],
        properties: { min: { type: ['number', 'null'] }, max: { type: ['number', 'null'] } },
      },
      urgency: { type: 'string', enum: ['emergency', 'today', 'this_week', 'flexible'] },
      preferredDate: { type: ['string', 'null'], format: 'date-time' },
      status: { type: 'string', enum: ['open', 'assigned', 'completed', 'cancelled'] },
      offerCount: { type: 'integer', minimum: 0 },
      lowestOffer: { type: ['number', 'null'] },
      customer: { $ref: '#/components/schemas/RequestCustomer' },
      assignedProvider: { anyOf: [{ $ref: '#/components/schemas/AssignedProvider' }, { type: 'null' }] },
      acceptedOffer: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$', description: 'Id of the accepted offer.' },
      assignedAt: { type: ['string', 'null'], format: 'date-time' },
      providerMarkedDoneAt: { type: ['string', 'null'], format: 'date-time' },
      completedAt: { type: ['string', 'null'], format: 'date-time' },
      cancelledAt: { type: ['string', 'null'], format: 'date-time' },
      cancelReason: { type: 'string', description: 'Empty string for viewers without access.' },
      reviewed: { type: 'boolean' },
      removed: { type: 'boolean', description: 'Removed by a moderator.' },
      views: { type: 'integer', minimum: 0 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      viewer: {
        type: 'object',
        required: ['isOwner', 'isAssigned', 'isAdmin'],
        properties: { isOwner: { type: 'boolean' }, isAssigned: { type: 'boolean' }, isAdmin: { type: 'boolean' } },
      },
      distanceKm: { type: 'number', description: 'Distance from the `lat`/`lng` query point, one decimal. Only when a point was supplied.' },
      myOffer: {
        description: 'Only present when the viewer is a provider.',
        anyOf: [{ $ref: '#/components/schemas/MyOfferSummary' }, { type: 'null' }],
      },
    },
  },
  ServiceRequestDetail: {
    allOf: [
      { $ref: '#/components/schemas/ServiceRequest' },
      {
        type: 'object',
        properties: {
          myOffer: {
            description: "Provider viewers only: the provider's own full offer on this request, or null.",
            anyOf: [{ $ref: '#/components/schemas/Offer' }, { type: 'null' }],
          },
          conversationId: {
            type: ['string', 'null'],
            pattern: '^[a-fA-F0-9]{24}$',
            description: "Provider viewers only: id of the provider's conversation about this request, or null.",
          },
          review: {
            description: 'Owner only, once the job has been reviewed.',
            allOf: [{ $ref: '#/components/schemas/Review' }],
          },
        },
      },
    ],
  },
  RequestEnvelope: {
    type: 'object',
    required: ['request'],
    properties: { request: { $ref: '#/components/schemas/ServiceRequest' } },
  },
  RequestCreateInput: {
    type: 'object',
    required: ['categoryId', 'title', 'description', 'city', 'area', 'lat', 'lng'],
    properties: {
      categoryId: { $ref: '#/components/schemas/ObjectId' },
      title: { type: 'string', minLength: 5, maxLength: 100 },
      description: { type: 'string', minLength: 20, maxLength: 2000 },
      city: { type: 'string', minLength: 2, maxLength: 60 },
      area: { type: 'string', minLength: 2, maxLength: 60 },
      address: { type: 'string', maxLength: 200, default: '', description: 'Exact address. Only shared with the provider the customer hires.' },
      lat: { type: 'number', minimum: -90, maximum: 90 },
      lng: { type: 'number', minimum: -180, maximum: 180 },
      budgetMin: { type: 'integer', minimum: 0, maximum: 5000000, description: 'Must not exceed `budgetMax`.' },
      budgetMax: { type: 'integer', minimum: 0, maximum: 5000000 },
      urgency: { type: 'string', enum: ['emergency', 'today', 'this_week', 'flexible'], default: 'today' },
      preferredDate: { type: 'string', format: 'date-time', description: 'Must not be more than 24 hours in the past.' },
    },
  },
  RequestUpdateInput: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 100 },
      description: { type: 'string', minLength: 20, maxLength: 2000 },
      address: { type: 'string', maxLength: 200 },
      urgency: { type: 'string', enum: ['emergency', 'today', 'this_week', 'flexible'] },
      preferredDate: { type: ['string', 'null'], format: 'date-time', description: 'Null clears the date.' },
      budgetMin: { type: ['integer', 'null'], minimum: 0, maximum: 5000000, description: 'Null clears the value. Must not exceed `budgetMax`.' },
      budgetMax: { type: ['integer', 'null'], minimum: 0, maximum: 5000000, description: 'Null clears the value.' },
    },
  },

  /* ---------- Offers ---------- */
  OfferBase: {
    type: 'object',
    required: ['id', 'price', 'etaMinutes', 'details', 'warrantyDays', 'includesMaterials', 'status', 'history', 'createdAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      price: { type: 'number', minimum: 100, maximum: 5000000, description: 'Price in PKR.' },
      etaMinutes: { type: 'integer', minimum: 5, maximum: 10080, description: 'Minutes until the provider can arrive.' },
      details: { type: 'string', minLength: 10, maxLength: 1000 },
      warrantyDays: { type: 'integer', minimum: 0, maximum: 365 },
      includesMaterials: { type: 'boolean' },
      status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'withdrawn'] },
      history: {
        type: 'array',
        description: 'Every price / arrival-time revision, oldest first.',
        items: {
          type: 'object',
          properties: { price: { type: 'number' }, etaMinutes: { type: 'integer' }, at: { type: 'string', format: 'date-time' } },
        },
      },
      acceptedAt: { type: ['string', 'null'], format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Offer: {
    allOf: [
      { $ref: '#/components/schemas/OfferBase' },
      {
        type: 'object',
        required: ['request', 'provider'],
        properties: {
          request: { $ref: '#/components/schemas/ObjectId' },
          provider: { $ref: '#/components/schemas/ProviderCard' },
        },
      },
    ],
  },
  RequestOffer: {
    description: 'An offer as listed on a request. `conversation` is only added for the request owner and admins.',
    allOf: [
      { $ref: '#/components/schemas/Offer' },
      {
        type: 'object',
        properties: {
          conversation: {
            type: ['object', 'null'],
            description: 'The chat with this bidder, if one exists.',
            required: ['id', 'unread'],
            properties: { id: { $ref: '#/components/schemas/ObjectId' }, unread: { type: 'integer', minimum: 0 } },
          },
        },
      },
    ],
  },
  OfferWithRequest: {
    description: "One of the provider's own offers with the request it belongs to (no `provider` field).",
    allOf: [
      { $ref: '#/components/schemas/OfferBase' },
      {
        type: 'object',
        required: ['request'],
        properties: { request: { $ref: '#/components/schemas/ServiceRequest' } },
      },
    ],
  },
  OfferEnvelope: {
    type: 'object',
    required: ['offer'],
    properties: { offer: { $ref: '#/components/schemas/Offer' } },
  },
  OfferInput: {
    type: 'object',
    required: ['price', 'etaMinutes', 'details'],
    properties: {
      price: { type: 'integer', minimum: 100, maximum: 5000000, description: 'Price in PKR, whole number.' },
      etaMinutes: { type: 'integer', minimum: 5, maximum: 10080, description: 'Arrival time in minutes (up to 7 days).' },
      details: { type: 'string', minLength: 10, maxLength: 1000 },
      warrantyDays: { type: 'integer', minimum: 0, maximum: 365, default: 0 },
      includesMaterials: { type: 'boolean', default: false },
    },
  },
  OfferUpdateInput: {
    type: 'object',
    minProperties: 1,
    properties: {
      price: { type: 'integer', minimum: 100, maximum: 5000000 },
      etaMinutes: { type: 'integer', minimum: 5, maximum: 10080 },
      details: { type: 'string', minLength: 10, maxLength: 1000 },
      warrantyDays: { type: 'integer', minimum: 0, maximum: 365 },
      includesMaterials: { type: 'boolean' },
    },
  },

  /* ---------- Reviews ---------- */
  Review: {
    type: 'object',
    required: ['id', 'rating', 'comment', 'reply', 'hidden', 'customer', 'provider', 'request', 'createdAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      comment: { type: 'string', maxLength: 1000, description: 'Blank when the review is hidden, except in the admin list.' },
      reply: {
        type: ['object', 'null'],
        description: "The provider's public reply.",
        required: ['text', 'at'],
        properties: { text: { type: 'string', maxLength: 600 }, at: { type: 'string', format: 'date-time' } },
      },
      hidden: { type: 'boolean', description: 'Hidden by a moderator.' },
      customer: {
        description: 'The reviewer, with a shortened name.',
        allOf: [{ $ref: '#/components/schemas/UserSummary' }, { type: 'object', properties: { city: { type: 'string' } } }],
      },
      provider: {
        type: 'object',
        description: 'The reviewed provider. Only `id` is present when the reference was not populated.',
        required: ['id'],
        properties: {
          id: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$' },
          name: { type: 'string' },
          avatar: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'provider', 'admin', 'deleted'] },
        },
      },
      request: {
        type: ['object', 'null'],
        description: 'The job that was reviewed. Only `id` is present when the reference was not populated.',
        required: ['id'],
        properties: {
          id: { $ref: '#/components/schemas/ObjectId' },
          title: { type: 'string' },
          category: { anyOf: [{ $ref: '#/components/schemas/Category' }, { type: 'null' }] },
        },
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  ReviewEnvelope: {
    type: 'object',
    required: ['review'],
    properties: { review: { $ref: '#/components/schemas/Review' } },
  },

  /* ---------- Notifications ---------- */
  Notification: {
    type: 'object',
    required: ['id', 'type', 'title', 'read', 'createdAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      type: {
        type: 'string',
        enum: [
          'new_request',
          'new_offer',
          'offer_updated',
          'offer_withdrawn',
          'offer_accepted',
          'offer_rejected',
          'message',
          'request_cancelled',
          'job_done',
          'job_completed',
          'review',
          'verification',
          'account',
          'report',
          'system',
        ],
      },
      title: { type: 'string', maxLength: 140 },
      body: { type: 'string', maxLength: 400 },
      link: { type: 'string', maxLength: 200, description: 'In-app path to open, or an empty string.' },
      read: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  /* ---------- Chat ---------- */
  Message: {
    type: 'object',
    required: ['id', 'conversation', 'sender', 'kind', 'text', 'removed', 'readAt', 'createdAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      conversation: { $ref: '#/components/schemas/ObjectId' },
      sender: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$', description: 'Sender user id.' },
      kind: { type: 'string', enum: ['text', 'system'], description: '`system` messages are automatic notes such as "offer accepted".' },
      text: { type: 'string', maxLength: 2000, description: 'Replaced by a placeholder when a moderator removed the message.' },
      removed: { type: 'boolean' },
      readAt: { type: ['string', 'null'], format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Conversation: {
    type: 'object',
    required: ['id', 'myRole', 'other', 'request', 'lastMessage', 'unread', 'updatedAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      myRole: { type: 'string', enum: ['customer', 'provider'], description: "The viewer's side of the conversation." },
      other: {
        type: 'object',
        description:
          'The other participant: `ProviderCard` fields when the viewer is the customer, `UserSummary` fields when the viewer is the provider (full name only once the provider is assigned to the request). A deleted account appears with a null id.',
        required: ['id', 'name', 'avatar', 'online'],
        properties: {
          id: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$' },
          name: { type: 'string' },
          avatar: { type: 'string' },
          role: { type: 'string' },
          online: { type: 'boolean' },
          lastSeenAt: { type: ['string', 'null'], format: 'date-time' },
        },
        additionalProperties: true,
      },
      request: {
        type: ['object', 'null'],
        required: ['id', 'title', 'status'],
        properties: {
          id: { $ref: '#/components/schemas/ObjectId' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['open', 'assigned', 'completed', 'cancelled'] },
          category: { anyOf: [{ $ref: '#/components/schemas/Category' }, { type: 'null' }] },
          area: { type: 'string' },
        },
      },
      lastMessage: {
        type: ['object', 'null'],
        required: ['text', 'sender', 'at'],
        properties: {
          text: { type: 'string' },
          sender: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$' },
          at: { type: 'string', format: 'date-time' },
        },
      },
      unread: { type: 'integer', minimum: 0, description: 'Unread messages for the viewer.' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  /* ---------- Tips ---------- */
  TipSummary: {
    type: 'object',
    required: ['id', 'title', 'slug', 'publishedAt', 'readMins'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      title: { type: 'string', maxLength: 140 },
      slug: { type: 'string', maxLength: 160 },
      excerpt: { type: 'string', maxLength: 300 },
      cover: { type: 'string', description: 'Cover image URL path, or an empty string.' },
      category: { anyOf: [{ $ref: '#/components/schemas/Category' }, { type: 'null' }] },
      author: {
        type: ['object', 'null'],
        properties: { name: { type: 'string' }, avatar: { type: 'string' } },
      },
      publishedAt: { type: 'string', format: 'date-time' },
      readMins: { type: 'integer', minimum: 1, description: 'Estimated reading time at 200 words per minute.' },
    },
  },
  Tip: {
    allOf: [
      { $ref: '#/components/schemas/TipSummary' },
      {
        type: 'object',
        required: ['body'],
        properties: {
          body: {
            type: 'string',
            maxLength: 20000,
            description: 'Plain text. Blank lines separate paragraphs, lines starting with "## " are subheadings, lines starting with "- " are list items.',
          },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  AdminTip: {
    type: 'object',
    required: ['id', 'title', 'slug', 'body', 'published'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      title: { type: 'string' },
      slug: { type: 'string' },
      excerpt: { type: 'string' },
      body: { type: 'string' },
      cover: { type: 'string' },
      category: { anyOf: [{ $ref: '#/components/schemas/Category' }, { type: 'null' }] },
      published: { type: 'boolean' },
      publishedAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  TipInput: {
    type: 'object',
    required: ['title', 'body'],
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 140 },
      excerpt: { type: 'string', maxLength: 300, default: '' },
      body: { type: 'string', minLength: 50, maxLength: 20000 },
      categoryId: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$' },
      published: { type: 'boolean', default: true },
    },
  },
  TipUpdateInput: {
    type: 'object',
    description: 'Partial update: only the supplied fields change (defaults are not applied).',
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 140 },
      excerpt: { type: 'string', maxLength: 300 },
      body: { type: 'string', minLength: 50, maxLength: 20000 },
      categoryId: { type: ['string', 'null'], pattern: '^[a-fA-F0-9]{24}$', description: 'Null removes the category.' },
      published: { type: 'boolean' },
    },
  },

  /* ---------- Paginated wrappers ---------- */
  PaginatedRequests: {
    allOf: [
      { $ref: '#/components/schemas/Pagination' },
      { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/ServiceRequest' } } } },
    ],
  },
  PaginatedProviders: {
    allOf: [
      { $ref: '#/components/schemas/Pagination' },
      { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/ProviderListItem' } } } },
    ],
  },
  PaginatedReviews: {
    allOf: [
      { $ref: '#/components/schemas/Pagination' },
      { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Review' } } } },
    ],
  },
  PaginatedNotifications: {
    allOf: [
      { $ref: '#/components/schemas/Pagination' },
      {
        type: 'object',
        required: ['unreadCount'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
          unreadCount: { type: 'integer', minimum: 0, description: 'All unread notifications, regardless of the filter.' },
        },
      },
    ],
  },
  PaginatedOffers: {
    allOf: [
      { $ref: '#/components/schemas/Pagination' },
      {
        type: 'object',
        required: ['counts'],
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/OfferWithRequest' } },
          counts: {
            type: 'object',
            description: "Number of the provider's offers per status. Statuses with no offers are omitted.",
            properties: {
              pending: { type: 'integer' },
              accepted: { type: 'integer' },
              rejected: { type: 'integer' },
              withdrawn: { type: 'integer' },
            },
          },
        },
      },
    ],
  },
  PaginatedAdminUsers: {
    allOf: [
      { $ref: '#/components/schemas/Pagination' },
      { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/AdminUser' } } } },
    ],
  },

  /* ---------- Dashboards and public stats ---------- */
  CustomerDashboard: {
    type: 'object',
    required: ['counts', 'pendingOffers', 'unreadMessages', 'active', 'awaitingReview'],
    properties: {
      counts: {
        type: 'object',
        description: "The customer's requests per status.",
        required: ['open', 'assigned', 'completed', 'cancelled'],
        properties: {
          open: { type: 'integer' },
          assigned: { type: 'integer' },
          completed: { type: 'integer' },
          cancelled: { type: 'integer' },
        },
      },
      pendingOffers: { type: 'integer', description: 'Pending offers across the open requests listed in `active`.' },
      unreadMessages: { type: 'integer' },
      active: { type: 'array', maxItems: 8, description: 'Most recently updated open or assigned requests.', items: { $ref: '#/components/schemas/ServiceRequest' } },
      awaitingReview: { type: 'array', maxItems: 5, description: 'Completed jobs not yet reviewed.', items: { $ref: '#/components/schemas/ServiceRequest' } },
    },
  },
  ProviderDashboard: {
    type: 'object',
    required: ['verification', 'counts', 'winRate', 'rating', 'jobsCompleted', 'earnings', 'unreadMessages', 'availableNow', 'activeJobs', 'matching', 'recentReviews'],
    properties: {
      verification: { type: 'string', enum: ['unverified', 'pending', 'verified', 'rejected'] },
      counts: {
        type: 'object',
        description: "The provider's offers per status.",
        required: ['pending', 'accepted', 'rejected', 'withdrawn'],
        properties: {
          pending: { type: 'integer' },
          accepted: { type: 'integer' },
          rejected: { type: 'integer' },
          withdrawn: { type: 'integer' },
        },
      },
      winRate: { type: ['integer', 'null'], minimum: 0, maximum: 100, description: 'Accepted offers as a percentage of decided offers; null when none are decided.' },
      rating: {
        type: 'object',
        required: ['avg', 'count'],
        properties: { avg: { type: 'number' }, count: { type: 'integer' } },
      },
      jobsCompleted: { type: 'integer' },
      earnings: {
        type: 'object',
        description: 'Sum of accepted offer prices on completed jobs, in PKR.',
        required: ['total', 'thisMonth'],
        properties: { total: { type: 'number' }, thisMonth: { type: 'number' } },
      },
      unreadMessages: { type: 'integer' },
      availableNow: { type: 'boolean' },
      activeJobs: { type: 'array', description: 'Jobs currently assigned to the provider.', items: { $ref: '#/components/schemas/ServiceRequest' } },
      matching: {
        type: 'array',
        maxItems: 6,
        description: "Newest open requests in the provider's categories, each with `myOffer`.",
        items: { $ref: '#/components/schemas/ServiceRequest' },
      },
      recentReviews: { type: 'array', maxItems: 3, items: { $ref: '#/components/schemas/Review' } },
    },
  },
  PublicStats: {
    type: 'object',
    required: ['verifiedProviders', 'jobsCompleted', 'totalRequests', 'avgRating', 'reviewCount', 'avgOffersPerRequest', 'medianFirstOfferMins', 'featuredProviders', 'testimonials', 'updatedAt'],
    properties: {
      verifiedProviders: { type: 'integer' },
      jobsCompleted: { type: 'integer' },
      totalRequests: { type: 'integer' },
      avgRating: { type: ['number', 'null'], description: 'Average of visible reviews, one decimal; null when there are none.' },
      reviewCount: { type: 'integer' },
      avgOffersPerRequest: { type: ['number', 'null'] },
      medianFirstOfferMins: { type: ['integer', 'null'], description: 'Median minutes from posting a request to its first offer.' },
      featuredProviders: { type: 'array', maxItems: 8, items: { $ref: '#/components/schemas/ProviderCard' } },
      testimonials: { type: 'array', maxItems: 6, items: { $ref: '#/components/schemas/Review' } },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Meta: {
    type: 'object',
    required: ['cities', 'urgencies', 'requireEmailVerification'],
    properties: {
      cities: {
        type: 'array',
        description: 'Launch cities with their areas and approximate map centres.',
        items: {
          type: 'object',
          required: ['name', 'center', 'areas'],
          properties: {
            name: { type: 'string' },
            center: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
            areas: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'lat', 'lng'],
                properties: { name: { type: 'string' }, lat: { type: 'number' }, lng: { type: 'number' } },
              },
            },
          },
        },
      },
      urgencies: { type: 'array', items: { type: 'string', enum: ['emergency', 'today', 'this_week', 'flexible'] } },
      requireEmailVerification: { type: 'boolean' },
    },
  },
  DataExport: {
    type: 'object',
    description: 'Everything held about the signed-in user. The lists contain raw database documents, so their exact shape is not fixed.',
    required: ['exportedAt', 'account'],
    properties: {
      exportedAt: { type: 'string', format: 'date-time' },
      account: { $ref: '#/components/schemas/SelfUser' },
      requests: { type: 'array', items: { type: 'object', additionalProperties: true } },
      offers: { type: 'array', items: { type: 'object', additionalProperties: true } },
      reviewsWritten: { type: 'array', items: { type: 'object', additionalProperties: true } },
      reviewsReceived: { type: 'array', items: { type: 'object', additionalProperties: true } },
      conversations: { type: 'array', items: { type: 'object', additionalProperties: true } },
      messagesSent: { type: 'array', items: { type: 'object', additionalProperties: true } },
      notifications: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  },

  /* ---------- Admin ---------- */
  DailyCount: {
    type: 'object',
    required: ['day', 'n'],
    properties: { day: { type: 'string', format: 'date', description: 'UTC day, YYYY-MM-DD.' }, n: { type: 'integer', minimum: 0 } },
  },
  AdminStats: {
    type: 'object',
    required: ['totals', 'requestsByStatus', 'successCriteria', 'daily', 'topCategories', 'topSearches', 'server'],
    properties: {
      totals: {
        type: 'object',
        properties: {
          customers: { type: 'integer' },
          providers: { type: 'integer' },
          verifiedProviders: { type: 'integer' },
          suspended: { type: 'integer' },
          requests: { type: 'integer' },
          offers: { type: 'integer' },
          reviews: { type: 'integer' },
          pendingVerifications: { type: 'integer' },
          openReports: { type: 'integer' },
          openInbox: { type: 'integer' },
        },
        additionalProperties: true,
      },
      requestsByStatus: {
        type: 'object',
        properties: {
          open: { type: 'integer' },
          assigned: { type: 'integer' },
          completed: { type: 'integer' },
          cancelled: { type: 'integer' },
        },
      },
      successCriteria: {
        type: 'array',
        description: 'The project success criteria, each measured against its target.',
        items: {
          type: 'object',
          required: ['key', 'label', 'value', 'display', 'target', 'met'],
          properties: {
            key: { type: 'string', enum: ['offers', 'firstOffer', 'conversion', 'rating', 'reviews', 'growth', 'repeat'] },
            label: { type: 'string' },
            value: { type: ['number', 'null'] },
            display: { type: 'string' },
            target: { type: 'string' },
            met: { type: 'boolean' },
          },
        },
      },
      daily: {
        type: 'object',
        description: 'Per-day series for the last 14 days.',
        properties: {
          days: { type: 'array', items: { type: 'string', format: 'date' } },
          requests: { type: 'array', items: { $ref: '#/components/schemas/DailyCount' } },
          offers: { type: 'array', items: { $ref: '#/components/schemas/DailyCount' } },
          signups: { type: 'array', items: { $ref: '#/components/schemas/DailyCount' } },
          pageViews: { type: 'array', items: { $ref: '#/components/schemas/DailyCount' } },
        },
      },
      topCategories: {
        type: 'array',
        maxItems: 6,
        items: { type: 'object', properties: { name: { type: 'string' }, slug: { type: 'string' }, n: { type: 'integer' } } },
      },
      topSearches: {
        type: 'array',
        maxItems: 8,
        items: { type: 'object', properties: { query: { type: 'string' }, n: { type: 'integer' } } },
      },
      server: {
        type: 'object',
        properties: { uptimeSeconds: { type: 'integer' }, node: { type: 'string', description: 'Node.js version.' } },
      },
    },
    additionalProperties: true,
  },
  AdminUser: {
    type: 'object',
    required: ['id', 'name', 'email', 'role', 'status'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      role: { type: 'string', enum: ['customer', 'provider', 'admin'] },
      avatar: { type: 'string' },
      city: { type: 'string' },
      area: { type: 'string' },
      status: { type: 'string', enum: ['active', 'suspended'] },
      suspendedReason: { type: 'string' },
      emailVerified: { type: 'boolean' },
      verification: { type: ['string', 'null'], enum: ['unverified', 'pending', 'verified', 'rejected', null], description: 'Provider verification status; null for non-providers.' },
      rating: {
        type: ['object', 'null'],
        description: 'Providers only.',
        properties: { avg: { type: 'number' }, count: { type: 'integer' } },
      },
      createdAt: { type: 'string', format: 'date-time' },
      lastSeenAt: { type: 'string', format: 'date-time' },
    },
  },
  VerificationQueueItem: {
    allOf: [
      { $ref: '#/components/schemas/ProviderProfile' },
      {
        type: 'object',
        required: ['email', 'hasDocument', 'createdAt'],
        properties: {
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          hasDocument: { type: 'boolean', description: 'Whether an ID document image was uploaded.' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  AdminReport: {
    type: 'object',
    required: ['id', 'targetType', 'targetId', 'target', 'reason', 'status', 'reporter', 'createdAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      targetType: { type: 'string', enum: ['user', 'request', 'message', 'review'] },
      targetId: { $ref: '#/components/schemas/ObjectId' },
      targetLabel: { type: 'string', maxLength: 200 },
      target: {
        type: ['object', 'null'],
        description: 'Current state of the reported item (shape depends on `targetType`), or null if it no longer exists.',
        additionalProperties: true,
      },
      reason: { type: 'string', enum: ['spam', 'fraud', 'abusive', 'inappropriate', 'fake', 'no_show', 'other'] },
      details: { type: 'string', maxLength: 1000 },
      status: { type: 'string', enum: ['open', 'resolved', 'dismissed'] },
      resolutionNote: { type: 'string', maxLength: 500 },
      reporter: {
        type: 'object',
        description: '`UserSummary` of the reporter, or just `{ name: "Deleted user" }`.',
        required: ['name'],
        properties: {
          id: { type: ['string', 'null'] },
          name: { type: 'string' },
          avatar: { type: 'string' },
          role: { type: 'string' },
        },
      },
      handledBy: { type: ['string', 'null'], description: 'Name of the admin who handled the report.' },
      handledAt: { type: ['string', 'null'], format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  ContactMessage: {
    type: 'object',
    required: ['id', 'name', 'email', 'topic', 'message', 'status', 'createdAt'],
    properties: {
      id: { $ref: '#/components/schemas/ObjectId' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      topic: { type: 'string', enum: ['general', 'account', 'provider', 'safety', 'billing', 'other'] },
      message: { type: 'string' },
      status: { type: 'string', enum: ['open', 'closed'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
};

export const responses = {
  BadRequest: {
    description: 'The request is invalid. For validation failures `error.fields` maps each field path to its message.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Unauthorized: {
    description: 'No valid session (or, on login, wrong credentials).',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Forbidden: {
    description: 'The session is valid but this account is not allowed to do this.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  NotFound: {
    description: 'The resource does not exist or is not visible to this account.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Conflict: {
    description: 'The request conflicts with the current state of the resource.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  TooManyRequests: {
    description: 'Rate limit exceeded. Retry later.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
};

export const paths = {
  /* ============================== Auth ============================== */
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a customer or provider account',
      operationId: 'register',
      description:
        'Creates the account and starts a session (sets the session cookie). Sends a verification email when verification is enforced, and notifies admins of new providers. Rate limited to 20 auth attempts per 15 minutes.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'phone', 'password', 'role', 'city'],
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 80 },
                email: { type: 'string', format: 'email', maxLength: 160 },
                phone: { type: 'string', pattern: '^\\+?[0-9\\s-]{10,16}$' },
                password: { $ref: '#/components/schemas/Password' },
                role: { type: 'string', enum: ['customer', 'provider'] },
                city: { type: 'string', minLength: 2, maxLength: 60 },
                area: { type: 'string', maxLength: 60, default: '' },
                categories: {
                  type: 'array',
                  maxItems: 6,
                  default: [],
                  description: 'Category ids for provider accounts. Unknown or inactive ids are ignored.',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Account created and signed in.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user'],
                properties: {
                  user: { $ref: '#/components/schemas/SelfUser' },
                  devLink: { type: 'string', description: 'Verification link, only exposed in development.' },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in with email and password',
      operationId: 'login',
      description: 'Sets the session cookie. Unknown email and wrong password return the same 401; a suspended account returns 403. Rate limited to 20 auth attempts per 15 minutes.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email', maxLength: 160 },
                password: { type: 'string', minLength: 1, maxLength: 200 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Signed in.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Log out',
      operationId: 'logout',
      description: 'Clears the session cookie. Succeeds whether or not a session exists.',
      security: [],
      responses: {
        '200': { description: 'Signed out.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get the current session',
      operationId: 'getSession',
      description: 'Never fails for a missing session: `user` is null when nobody is signed in.',
      security: [],
      responses: {
        '200': {
          description: 'Current user (or null) and client configuration.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user', 'config'],
                properties: {
                  user: { anyOf: [{ $ref: '#/components/schemas/SelfUser' }, { type: 'null' }] },
                  config: {
                    type: 'object',
                    required: ['requireEmailVerification'],
                    properties: { requireEmailVerification: { type: 'boolean' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/auth/verify-email': {
    post: {
      tags: ['Auth'],
      summary: 'Verify an email address with a token',
      operationId: 'verifyEmail',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: { token: { type: 'string', minLength: 10, maxLength: 200, description: 'Token from the verification email (valid for 24 hours).' } },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Email verified.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ok', 'user'],
                properties: { ok: { type: 'boolean', const: true }, user: { $ref: '#/components/schemas/SelfUser' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/auth/resend-verification': {
    post: {
      tags: ['Auth'],
      summary: 'Resend the verification email',
      operationId: 'resendVerification',
      description: 'Rate limited to 20 auth attempts per 15 minutes.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      responses: {
        '200': {
          description: 'Email sent, or the address was already verified.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ok'],
                properties: {
                  ok: { type: 'boolean', const: true },
                  alreadyVerified: { type: 'boolean', description: 'Present (true) when no email was needed.' },
                  devLink: { type: 'string', description: 'Verification link, only exposed in development.' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request a password reset link',
      operationId: 'forgotPassword',
      description: 'Always answers 200 with the same message so accounts cannot be enumerated. The link is valid for one hour. Rate limited to 20 auth attempts per 15 minutes.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', format: 'email', maxLength: 160 } },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Request accepted.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ok', 'message'],
                properties: {
                  ok: { type: 'boolean', const: true },
                  message: { type: 'string' },
                  devLink: { type: 'string', description: 'Reset link, only exposed in development.' },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Set a new password with a reset token',
      operationId: 'resetPassword',
      description: 'Signs out every other device, marks the email as verified and starts a new session (unless the account is suspended, in which case `user` is null). Rate limited to 20 auth attempts per 15 minutes.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'password'],
              properties: {
                token: { type: 'string', minLength: 10, maxLength: 200 },
                password: { $ref: '#/components/schemas/Password' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Password changed.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ok', 'user'],
                properties: {
                  ok: { type: 'boolean', const: true },
                  user: { anyOf: [{ $ref: '#/components/schemas/SelfUser' }, { type: 'null' }] },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/auth/password': {
    patch: {
      tags: ['Auth'],
      summary: 'Change the password of the signed-in user',
      operationId: 'changePassword',
      description: 'Signs out every other device and issues a fresh session cookie for this one.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: {
                currentPassword: { type: 'string', minLength: 1, maxLength: 200 },
                newPassword: { $ref: '#/components/schemas/Password' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Password changed.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  /* ============================== Account ============================== */
  '/users/me': {
    patch: {
      tags: ['Account'],
      summary: 'Update the basic account profile',
      operationId: 'updateAccount',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 80 },
                phone: { type: 'string', pattern: '^\\+?[0-9\\s-]{10,16}$' },
                city: { type: 'string', minLength: 2, maxLength: 60 },
                area: { type: 'string', maxLength: 60 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
    delete: {
      tags: ['Account'],
      summary: 'Delete the signed-in account',
      operationId: 'deleteAccount',
      description:
        'Requires the password. Cancels the open and assigned requests of the user (notifying affected providers), withdraws their pending offers, removes personal files and ends the session. Completed-job history and reviews remain and show "Deleted user". Admin accounts cannot be deleted.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password'],
              properties: { password: { type: 'string', minLength: 1 } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Account deleted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/users/me/avatar': {
    post: {
      tags: ['Account'],
      summary: 'Upload a profile photo',
      operationId: 'uploadAvatar',
      description: 'JPG, PNG or WebP up to 5 MB. The image is re-encoded to a 400 px square WebP and replaces the previous avatar.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['avatar'],
              properties: { avatar: { type: 'string', format: 'binary', description: 'One image file.' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/users/me/export': {
    get: {
      tags: ['Account'],
      summary: 'Export all personal data as JSON',
      operationId: 'exportAccountData',
      description: 'Sent with a `Content-Disposition: attachment` header so browsers download it as a file.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      responses: {
        '200': { description: 'Data export.', content: { 'application/json': { schema: { $ref: '#/components/schemas/DataExport' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  /* ============================== Categories ============================== */
  '/categories': {
    get: {
      tags: ['Categories'],
      summary: 'List active service categories',
      operationId: 'listCategories',
      security: [],
      responses: {
        '200': {
          description: 'Active categories in display order, with live counts.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array', items: { $ref: '#/components/schemas/CategoryWithCounts' } } },
              },
            },
          },
        },
      },
    },
  },

  /* ============================== Requests ============================== */
  '/requests': {
    get: {
      tags: ['Requests'],
      summary: 'Browse open service requests',
      operationId: 'listRequests',
      description:
        'Public. Only open, non-removed requests are listed, with approximate locations. When a provider is signed in each item also carries `myOffer`; when `lat` and `lng` are given each item carries `distanceKm`.',
      security: [],
      parameters: [
        { name: 'category', in: 'query', description: 'Category slug or id; several may be given separated by commas (up to 10).', schema: { type: 'string', maxLength: 400 } },
        { name: 'city', in: 'query', description: 'Exact city name.', schema: { type: 'string', maxLength: 60 } },
        { name: 'area', in: 'query', description: 'Exact area name.', schema: { type: 'string', maxLength: 60 } },
        { name: 'q', in: 'query', description: 'Case-insensitive text search in title, description and area.', schema: { type: 'string', maxLength: 80 } },
        { name: 'urgency', in: 'query', schema: { type: 'string', enum: ['emergency', 'today', 'this_week', 'flexible'] } },
        { name: 'postedWithin', in: 'query', description: 'Only requests posted within this period.', schema: { type: 'string', enum: ['24h', '3d', '7d', '30d'] } },
        { name: 'lat', in: 'query', description: 'Latitude of the viewer. Used with `lng` for distance, radius filtering and nearest sorting.', schema: { type: 'number', minimum: -90, maximum: 90 } },
        { name: 'lng', in: 'query', description: 'Longitude of the viewer.', schema: { type: 'number', minimum: -180, maximum: 180 } },
        { name: 'radiusKm', in: 'query', description: 'Only requests within this distance of `lat`/`lng`. Ignored without a point.', schema: { type: 'number', minimum: 1, maximum: 100 } },
        {
          name: 'sort',
          in: 'query',
          description: '`nearest` needs `lat` and `lng`; without them it behaves like `newest`.',
          schema: { type: 'string', enum: ['newest', 'oldest', 'budget', 'fewest_offers', 'nearest'], default: 'newest' },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 12 } },
      ],
      responses: {
        '200': { description: 'A page of open requests.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedRequests' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
      },
    },
    post: {
      tags: ['Requests'],
      summary: 'Post a new service request',
      operationId: 'createRequest',
      description:
        'Requires a verified email when verification is enforced. A customer may have at most 10 open requests. Matching verified providers in the category and city or area are notified. Rate limited to 40 writes per minute. Photos are optional; a plain JSON body is accepted when none are sent.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['data'],
              properties: {
                data: {
                  type: 'string',
                  description: 'The request fields as a JSON-encoded string.',
                  contentMediaType: 'application/json',
                  contentSchema: { $ref: '#/components/schemas/RequestCreateInput' },
                },
                images: {
                  type: 'array',
                  maxItems: 5,
                  description: 'Up to 5 photos of the problem (JPG, PNG or WebP, 5 MB each).',
                  items: { type: 'string', format: 'binary' },
                },
              },
            },
          },
          'application/json': { schema: { $ref: '#/components/schemas/RequestCreateInput' } },
        },
      },
      responses: {
        '201': { description: 'Request created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/RequestEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/requests/mine': {
    get: {
      tags: ['Requests'],
      summary: "List the signed-in customer's own requests",
      operationId: 'listMyRequests',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer'],
      parameters: [
        { name: 'status', in: 'query', description: 'Filter by status. Unknown values are ignored.', schema: { type: 'string', enum: ['open', 'assigned', 'completed', 'cancelled'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        '200': { description: 'A page of the customer\'s requests, newest first.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedRequests' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/requests/{id}': {
    get: {
      tags: ['Requests'],
      summary: 'Get one service request',
      operationId: 'getRequest',
      description:
        'Public for open requests. Requests that are no longer open are only visible to the owner, the assigned provider, providers who bid on them and admins; everyone else gets 404. Exact address and contact details follow the privacy rules of `ServiceRequest`. A provider view increments the view counter.',
      security: [],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': {
          description: 'The request.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['request'],
                properties: { request: { $ref: '#/components/schemas/ServiceRequestDetail' } },
              },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Requests'],
      summary: 'Edit an open request',
      operationId: 'updateRequest',
      description: 'Owner only, and only while the request is still open.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RequestUpdateInput' } } },
      },
      responses: {
        '200': { description: 'Updated request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/RequestEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/requests/{id}/cancel': {
    post: {
      tags: ['Requests'],
      summary: 'Cancel an open or assigned request',
      operationId: 'cancelRequest',
      description: 'Owner only. Pending offers are rejected and every bidder (and the assigned provider) is notified.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { reason: { type: 'string', maxLength: 300, default: '' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Cancelled request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/RequestEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/requests/{id}/mark-done': {
    post: {
      tags: ['Requests'],
      summary: 'Mark an assigned job as done (provider)',
      operationId: 'markRequestDone',
      description: 'Assigned provider only. Does not change the status: it sets `providerMarkedDoneAt` and asks the customer to confirm completion.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Updated request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/RequestEnvelope' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/requests/{id}/complete': {
    post: {
      tags: ['Requests'],
      summary: 'Confirm an assigned job is complete (customer)',
      operationId: 'completeRequest',
      description: 'Owner only. Moves the request from assigned to completed, updates the provider job count, notifies the provider and prompts the customer for a review.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Completed request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/RequestEnvelope' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/requests/{id}/review': {
    post: {
      tags: ['Reviews'],
      summary: 'Review the provider of a completed job',
      operationId: 'createReview',
      description: 'Owner only, once per completed request. Recalculates the provider rating and notifies the provider. Rate limited to 40 writes per minute.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['rating'],
              properties: {
                rating: { type: 'integer', minimum: 1, maximum: 5 },
                comment: { type: 'string', maxLength: 1000, default: '' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Review created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/requests/{id}/offers': {
    get: {
      tags: ['Offers'],
      summary: 'List the offers on a request',
      operationId: 'listRequestOffers',
      description:
        'The request owner and admins get every non-withdrawn offer (accepted first, then pending, then rejected) with comparison `highlights` and chat links; the query filters apply to them only. A provider only gets their own offer on the request, without `highlights`. Other customers get 403.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } },
        { name: 'sort', in: 'query', description: 'Order within each status group.', schema: { type: 'string', enum: ['price', 'rating', 'experience', 'eta', 'newest'], default: 'price' } },
        { name: 'verifiedOnly', in: 'query', description: '`true` keeps only offers from verified providers.', schema: { type: 'string', enum: ['true', 'false'] } },
        { name: 'minRating', in: 'query', description: 'Minimum provider rating.', schema: { type: 'number', minimum: 0, maximum: 5 } },
      ],
      responses: {
        '200': {
          description: 'Offers on the request.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/RequestOffer' } },
                  highlights: {
                    type: 'object',
                    description: 'Owner and admin only. Ids of the standout pending offers; a key is omitted when it does not apply.',
                    properties: {
                      lowestPrice: { $ref: '#/components/schemas/ObjectId' },
                      fastest: { $ref: '#/components/schemas/ObjectId' },
                      topRated: { $ref: '#/components/schemas/ObjectId' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    post: {
      tags: ['Offers'],
      summary: 'Send an offer on an open request',
      operationId: 'createOffer',
      description:
        'Only identity-verified providers (with a verified email when enforced) can bid, once per request; a withdrawn offer can be re-submitted and reuses the same offer record. The customer is notified. Rate limited to 40 writes per minute.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferInput' } } },
      },
      responses: {
        '201': { description: 'Offer sent.', content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  /* ============================== Offers ============================== */
  '/offers/mine': {
    get: {
      tags: ['Offers'],
      summary: "List the signed-in provider's own offers",
      operationId: 'listMyOffers',
      description: 'Each offer carries the request it belongs to. Offers whose request no longer exists are dropped from `items` but still counted in `total`.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      parameters: [
        { name: 'status', in: 'query', description: 'Filter by status. Unknown values are ignored.', schema: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'withdrawn'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        '200': { description: 'A page of offers, most recently updated first.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedOffers' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/offers/{id}': {
    patch: {
      tags: ['Offers'],
      summary: 'Edit a pending offer',
      operationId: 'updateOffer',
      description: 'Own offers only, while the offer is pending and the request is open. A price or arrival-time change is appended to `history` and the customer is notified. Rate limited to 40 writes per minute.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Offer id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferUpdateInput' } } },
      },
      responses: {
        '200': { description: 'Updated offer.', content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/offers/{id}/withdraw': {
    post: {
      tags: ['Offers'],
      summary: 'Withdraw a pending offer',
      operationId: 'withdrawOffer',
      description: 'Own offers only. The customer is notified.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Offer id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Withdrawn offer.', content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferEnvelope' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/offers/{id}/accept': {
    post: {
      tags: ['Offers'],
      summary: 'Accept an offer and hire the provider',
      operationId: 'acceptOffer',
      description:
        'Request owner only. Moves the request to assigned, rejects every other pending offer and notifies all bidders; the exact address and phone numbers become visible to the hired provider. Race-safe: the request is updated atomically only while it is still open, so a second concurrent accept gets 409.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Offer id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': {
          description: 'Offer accepted.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['offer', 'requestId'],
                properties: {
                  offer: { $ref: '#/components/schemas/Offer' },
                  requestId: { $ref: '#/components/schemas/ObjectId' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },

  /* ============================== Providers ============================== */
  '/providers': {
    get: {
      tags: ['Providers'],
      summary: 'Browse the provider directory',
      operationId: 'listProviders',
      description: 'Only active, identity-verified providers are listed.',
      security: [],
      parameters: [
        { name: 'category', in: 'query', description: 'Category slug or id.', schema: { type: 'string', maxLength: 60 } },
        { name: 'city', in: 'query', description: 'Exact city name.', schema: { type: 'string', maxLength: 60 } },
        { name: 'q', in: 'query', description: 'Case-insensitive text search in name, headline, bio, area and service areas.', schema: { type: 'string', maxLength: 80 } },
        { name: 'minRating', in: 'query', schema: { type: 'number', minimum: 0, maximum: 5 } },
        { name: 'availableNow', in: 'query', description: '`true` keeps only providers marked available now.', schema: { type: 'string', enum: ['true', 'false'] } },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['rating', 'jobs', 'experience', 'newest'], default: 'rating' } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 48, default: 12 } },
      ],
      responses: {
        '200': { description: 'A page of providers.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedProviders' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/providers/me/profile': {
    get: {
      tags: ['Providers'],
      summary: "Get the signed-in provider's own profile",
      operationId: 'getMyProviderProfile',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      responses: {
        '200': { description: 'Account with the full provider profile.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/providers/me': {
    patch: {
      tags: ['Providers'],
      summary: 'Update the provider profile',
      operationId: 'updateMyProviderProfile',
      description: 'The map location is only updated when both `lat` and `lng` are sent. Inactive or unknown category ids are dropped.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                headline: { type: 'string', maxLength: 100 },
                bio: { type: 'string', maxLength: 1500 },
                categories: { type: 'array', minItems: 1, maxItems: 6, items: { $ref: '#/components/schemas/ObjectId' } },
                experienceYears: { type: 'integer', minimum: 0, maximum: 60 },
                serviceAreas: { type: 'array', maxItems: 15, items: { type: 'string', minLength: 2, maxLength: 60 } },
                certifications: {
                  type: 'array',
                  maxItems: 10,
                  description: 'Replaces the whole list.',
                  items: {
                    type: 'object',
                    required: ['title'],
                    properties: {
                      title: { type: 'string', minLength: 2, maxLength: 120 },
                      issuer: { type: 'string', maxLength: 120, default: '' },
                      year: { type: 'integer', minimum: 1970, maximum: 2100 },
                    },
                  },
                },
                startingPrice: { type: ['integer', 'null'], minimum: 0, maximum: 1000000, description: 'Null clears the value.' },
                lat: { type: 'number', minimum: -90, maximum: 90 },
                lng: { type: 'number', minimum: -180, maximum: 180 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/providers/me/availability': {
    put: {
      tags: ['Providers'],
      summary: 'Replace the weekly availability',
      operationId: 'setMyAvailability',
      description: 'All seven days must be supplied, each day exactly once.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['availableNow', 'weekly'],
              properties: {
                availableNow: { type: 'boolean' },
                weekly: { type: 'array', minItems: 7, maxItems: 7, items: { $ref: '#/components/schemas/AvailabilityDay' } },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/providers/me/gallery': {
    post: {
      tags: ['Providers'],
      summary: 'Add photos to the work gallery',
      operationId: 'addGalleryPhotos',
      description: 'At least one photo is required. The same caption and kind are applied to every photo in the upload. The gallery holds at most 24 photos. Rate limited to 40 writes per minute.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['images'],
              properties: {
                images: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 6,
                  description: 'Up to 6 photos (JPG, PNG or WebP, 5 MB each).',
                  items: { type: 'string', format: 'binary' },
                },
                data: {
                  type: 'string',
                  description: 'Optional JSON-encoded string with the caption and kind.',
                  contentMediaType: 'application/json',
                  contentSchema: {
                    type: 'object',
                    properties: {
                      caption: { type: 'string', maxLength: 140, default: '' },
                      kind: { type: 'string', enum: ['before', 'after', 'work'], default: 'work' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Photos added; returns the updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/providers/me/gallery/{itemId}': {
    delete: {
      tags: ['Providers'],
      summary: 'Remove a photo from the work gallery',
      operationId: 'deleteGalleryPhoto',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      parameters: [{ name: 'itemId', in: 'path', required: true, description: 'Gallery item id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Photo removed; returns the updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/providers/me/verification': {
    post: {
      tags: ['Providers'],
      summary: 'Submit an identity document for verification',
      operationId: 'submitVerification',
      description:
        'Stores the ID image outside the public folder, keeps only the last four digits of the ID number, sets the status to pending and notifies admins. Rejected providers may resubmit; verified providers get 409. Rate limited to 40 writes per minute.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['document', 'data'],
              properties: {
                document: { type: 'string', format: 'binary', description: 'One photo of the CNIC (JPG, PNG or WebP, 5 MB).' },
                data: {
                  type: 'string',
                  description: 'JSON-encoded string with the ID number.',
                  contentMediaType: 'application/json',
                  contentSchema: {
                    type: 'object',
                    required: ['idNumber'],
                    properties: {
                      idNumber: { type: 'string', pattern: '^\\d{5}-?\\d{7}-?\\d$', description: '13-digit CNIC number, e.g. 61101-1234567-1.' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Submitted; returns the updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/providers/{id}': {
    get: {
      tags: ['Providers'],
      summary: 'Get a public provider profile',
      operationId: 'getProvider',
      description:
        'Public. Providers who are suspended or not yet verified return 404, except to themselves and admins, who also receive the private `verification` block.',
      security: [],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Provider user id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': {
          description: 'Profile, the six latest reviews and the rating breakdown.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['provider', 'reviews', 'ratingBreakdown'],
                properties: {
                  provider: { $ref: '#/components/schemas/PublicProviderProfile' },
                  reviews: { type: 'array', maxItems: 6, items: { $ref: '#/components/schemas/Review' } },
                  ratingBreakdown: {
                    type: 'object',
                    description: 'Number of visible reviews per star rating.',
                    required: ['1', '2', '3', '4', '5'],
                    properties: {
                      1: { type: 'integer', minimum: 0 },
                      2: { type: 'integer', minimum: 0 },
                      3: { type: 'integer', minimum: 0 },
                      4: { type: 'integer', minimum: 0 },
                      5: { type: 'integer', minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/providers/{id}/reviews': {
    get: {
      tags: ['Reviews'],
      summary: 'List the reviews of a provider',
      operationId: 'listProviderReviews',
      description: 'Hidden reviews are excluded.',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Provider user id.', schema: { $ref: '#/components/schemas/ObjectId' } },
        { name: 'rating', in: 'query', description: 'Only reviews with exactly this star rating. Out-of-range values are ignored.', schema: { type: 'integer', minimum: 1, maximum: 5 } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
      ],
      responses: {
        '200': { description: 'A page of reviews, newest first.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedReviews' } } } },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  /* ============================== Reviews ============================== */
  '/reviews/{id}/reply': {
    post: {
      tags: ['Reviews'],
      summary: 'Reply to a review as the reviewed provider',
      operationId: 'replyToReview',
      description: 'One reply per review. A review of another provider, or a hidden review, returns 404.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Review id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['text'],
              properties: { text: { type: 'string', minLength: 2, maxLength: 600 } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Review with the reply.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewEnvelope' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },

  /* ============================== Chat ============================== */
  '/conversations': {
    get: {
      tags: ['Chat'],
      summary: "List the signed-in user's conversations",
      operationId: 'listConversations',
      description: 'The 100 most recently active conversations, newest first.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      responses: {
        '200': {
          description: 'Conversations and the total unread count.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items', 'unreadTotal'],
                properties: {
                  items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/Conversation' } },
                  unreadTotal: { type: 'integer', minimum: 0 },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Chat'],
      summary: 'Open the conversation for a request',
      operationId: 'startConversation',
      description:
        'Idempotent: returns the existing conversation for the request and provider if there is one (still with status 201). A customer must own the request and pass the `providerId` of a provider who has sent an offer on it. A verified provider can open a chat with the customer of an open request, or of one they bid on or were assigned to. Admins get 403.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['requestId'],
              properties: {
                requestId: { $ref: '#/components/schemas/ObjectId' },
                providerId: {
                  description: 'Required when the caller is a customer; ignored for providers.',
                  allOf: [{ $ref: '#/components/schemas/ObjectId' }],
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'The new or existing conversation.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['conversation'],
                properties: { conversation: { $ref: '#/components/schemas/Conversation' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/conversations/{id}': {
    get: {
      tags: ['Chat'],
      summary: 'Get one conversation',
      operationId: 'getConversation',
      description: 'Participants only (anyone else gets 404). Also returns the offer the provider made on the request, if any.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Conversation id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': {
          description: 'Conversation and the related offer.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['conversation', 'offer'],
                properties: {
                  conversation: { $ref: '#/components/schemas/Conversation' },
                  offer: { anyOf: [{ $ref: '#/components/schemas/Offer' }, { type: 'null' }] },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/conversations/{id}/messages': {
    get: {
      tags: ['Chat'],
      summary: 'List messages in a conversation',
      operationId: 'listMessages',
      description: 'Participants only. Returns the latest messages in chronological order; page backwards by passing the `createdAt` of the oldest message as `before`.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: 'Conversation id.', schema: { $ref: '#/components/schemas/ObjectId' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 30 } },
        { name: 'before', in: 'query', description: 'Only messages created before this time. An unparseable value is ignored.', schema: { type: 'string', format: 'date-time' } },
      ],
      responses: {
        '200': {
          description: 'Messages, oldest first.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items', 'hasMore'],
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
                  hasMore: { type: 'boolean', description: 'Older messages exist.' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    post: {
      tags: ['Chat'],
      summary: 'Send a message',
      operationId: 'sendMessage',
      description: 'Participants only. The other participant gets one notification per burst of unread messages, not one per message. Rate limited to 30 messages per minute.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Conversation id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['text'],
              properties: { text: { type: 'string', minLength: 1, maxLength: 2000 } },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Message sent.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: { message: { $ref: '#/components/schemas/Message' } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/conversations/{id}/read': {
    post: {
      tags: ['Chat'],
      summary: 'Mark a conversation as read',
      operationId: 'markConversationRead',
      description: 'Participants only. Resets the unread counter of the viewer and sends a read receipt to the other participant over the socket.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Conversation id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Marked as read.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  /* ============================== Notifications ============================== */
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: "List the signed-in user's notifications",
      operationId: 'listNotifications',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [
        { name: 'unread', in: 'query', description: '`true` lists unread notifications only. Any other value lists all.', schema: { type: 'string', enum: ['true'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        '200': { description: 'A page of notifications, newest first.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedNotifications' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/notifications/read-all': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      operationId: 'markAllNotificationsRead',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      responses: {
        '200': { description: 'All marked as read.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/notifications/{id}/read': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark one notification as read',
      operationId: 'markNotificationRead',
      description: "Succeeds silently when the id is well-formed but is not one of the user's notifications.",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Notification id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Marked as read.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  /* ============================== Reports ============================== */
  '/reports': {
    post: {
      tags: ['Reports'],
      summary: 'Report a user, request, review or message',
      operationId: 'createReport',
      description:
        'Admins are notified. A message can only be reported by a participant of its conversation (otherwise 404). Reporting yourself returns 403, and a second open report of the same item by the same user returns 409. Rate limited to 40 writes per minute.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer', 'provider', 'admin'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['targetType', 'targetId', 'reason'],
              properties: {
                targetType: { type: 'string', enum: ['user', 'request', 'message', 'review'] },
                targetId: { $ref: '#/components/schemas/ObjectId' },
                reason: { type: 'string', enum: ['spam', 'fraud', 'abusive', 'inappropriate', 'fake', 'no_show', 'other'] },
                details: { type: 'string', maxLength: 1000, default: '' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Report submitted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkMessage' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },

  /* ============================== Dashboard ============================== */
  '/dashboard/customer': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get the customer dashboard summary',
      operationId: 'getCustomerDashboard',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['customer'],
      responses: {
        '200': { description: 'Customer dashboard.', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerDashboard' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/dashboard/provider': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get the provider dashboard summary',
      operationId: 'getProviderDashboard',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['provider'],
      responses: {
        '200': { description: 'Provider dashboard.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderDashboard' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  /* ============================== Admin ============================== */
  '/admin/stats': {
    get: {
      tags: ['Admin'],
      summary: 'Get platform statistics and success criteria',
      operationId: 'adminGetStats',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      responses: {
        '200': { description: 'Platform statistics.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminStats' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/users': {
    get: {
      tags: ['Admin'],
      summary: 'List and search users',
      operationId: 'adminListUsers',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [
        { name: 'role', in: 'query', description: 'Unknown values are ignored.', schema: { type: 'string', enum: ['customer', 'provider', 'admin'] } },
        { name: 'status', in: 'query', description: 'Unknown values are ignored.', schema: { type: 'string', enum: ['active', 'suspended'] } },
        { name: 'q', in: 'query', description: 'Case-insensitive search in name, email and phone (first 80 characters are used).', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        '200': { description: 'A page of users, newest first.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedAdminUsers' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/users/{id}/status': {
    patch: {
      tags: ['Admin'],
      summary: 'Suspend or reactivate a user',
      operationId: 'adminSetUserStatus',
      description:
        'Suspending requires a reason, ends all sessions of the user and withdraws their pending offers. Reactivating notifies the user. Admin accounts cannot be changed here.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'User id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['active', 'suspended'] },
                reason: { type: 'string', maxLength: 300, default: '', description: 'Required (non-empty) when suspending.' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Status changed.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ok', 'status'],
                properties: { ok: { type: 'boolean', const: true }, status: { type: 'string', enum: ['active', 'suspended'] } },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/verifications': {
    get: {
      tags: ['Admin'],
      summary: 'List providers by verification status',
      operationId: 'adminListVerifications',
      description: 'Up to 100 providers, most recently submitted first.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [
        { name: 'status', in: 'query', description: 'Unknown values fall back to `pending`.', schema: { type: 'string', enum: ['pending', 'verified', 'rejected', 'unverified'], default: 'pending' } },
      ],
      responses: {
        '200': {
          description: 'Providers in the chosen verification state.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/VerificationQueueItem' } } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/verifications/{id}': {
    post: {
      tags: ['Admin'],
      summary: 'Approve or reject a provider verification',
      operationId: 'adminDecideVerification',
      description: 'A rejection requires a note. The provider is notified of the decision.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Provider user id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: { type: 'string', enum: ['verified', 'rejected'] },
                note: { type: 'string', maxLength: 500, default: '', description: 'Required (non-empty) when rejecting; shown to the provider.' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Decision recorded.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/verifications/{id}/document': {
    get: {
      tags: ['Admin'],
      summary: "Download a provider's identity document",
      operationId: 'adminGetVerificationDocument',
      description: 'Streams the private ID image with `Cache-Control: private, no-store`.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Provider user id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': {
          description: 'The document image (uploads are stored as WebP).',
          content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/requests': {
    get: {
      tags: ['Admin'],
      summary: 'List all service requests for moderation',
      operationId: 'adminListRequests',
      description: 'Includes removed requests and full private details.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [
        { name: 'status', in: 'query', description: 'Unknown values are ignored.', schema: { type: 'string', enum: ['open', 'assigned', 'completed', 'cancelled'] } },
        { name: 'removed', in: 'query', description: '`true` lists removed requests only.', schema: { type: 'string', enum: ['true'] } },
        { name: 'q', in: 'query', description: 'Case-insensitive search in title and description (first 80 characters are used).', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        '200': { description: 'A page of requests, newest first.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedRequests' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/requests/{id}': {
    delete: {
      tags: ['Admin'],
      summary: 'Remove a request (moderation)',
      operationId: 'adminRemoveRequest',
      description:
        'Soft delete: the request is flagged as removed and, if open or assigned, cancelled. Pending offers are rejected, and the customer and bidders are notified. The reason is sent in the JSON body.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string', minLength: 3, maxLength: 300, description: 'Shown to the customer.' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Request removed.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/requests/{id}/restore': {
    post: {
      tags: ['Admin'],
      summary: 'Restore a removed request',
      operationId: 'adminRestoreRequest',
      description: 'Clears the removed flag only; a request that was cancelled by the removal stays cancelled.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Request id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Request restored.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/reviews': {
    get: {
      tags: ['Admin'],
      summary: 'List all reviews for moderation',
      operationId: 'adminListReviews',
      description: 'Hidden reviews are included with their full comment.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [
        { name: 'hidden', in: 'query', description: '`true` lists hidden reviews only.', schema: { type: 'string', enum: ['true'] } },
        { name: 'rating', in: 'query', description: 'Only reviews with exactly this star rating. Out-of-range values are ignored.', schema: { type: 'integer', minimum: 1, maximum: 5 } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        '200': { description: 'A page of reviews, newest first.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedReviews' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/reviews/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Hide or unhide a review',
      operationId: 'adminSetReviewHidden',
      description: "Recalculates the provider's rating, which excludes hidden reviews.",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Review id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['hidden'], properties: { hidden: { type: 'boolean' } } },
          },
        },
      },
      responses: {
        '200': { description: 'Review updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/messages/{id}': {
    delete: {
      tags: ['Admin'],
      summary: 'Remove a chat message (moderation)',
      operationId: 'adminRemoveMessage',
      description: 'Soft delete: the text is replaced by a placeholder for both participants, who are told over the socket.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Message id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Message removed.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/reports': {
    get: {
      tags: ['Admin'],
      summary: 'List user reports',
      operationId: 'adminListReports',
      description: 'Up to 100 reports, newest first, each with the current state of the reported item.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [
        { name: 'status', in: 'query', description: 'Unknown values fall back to `open`.', schema: { type: 'string', enum: ['open', 'resolved', 'dismissed'], default: 'open' } },
      ],
      responses: {
        '200': {
          description: 'Reports in the chosen state.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/AdminReport' } } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/reports/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Resolve, dismiss or reopen a report',
      operationId: 'adminUpdateReport',
      description: 'The reporter is notified when the report is resolved or dismissed.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Report id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['resolved', 'dismissed', 'open'] },
                resolutionNote: { type: 'string', maxLength: 500, default: '' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Report updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/categories': {
    get: {
      tags: ['Admin'],
      summary: 'List all categories, including inactive ones',
      operationId: 'adminListCategories',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      responses: {
        '200': {
          description: 'All categories in display order, with request counts.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array', items: { $ref: '#/components/schemas/AdminCategory' } } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create a category',
      operationId: 'adminCreateCategory',
      description: 'The slug is derived from the name; a duplicate name or slug returns 409. The image is optional; a plain JSON body is accepted when none is sent.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['data'],
              properties: {
                data: {
                  type: 'string',
                  description: 'The category fields as a JSON-encoded string.',
                  contentMediaType: 'application/json',
                  contentSchema: { $ref: '#/components/schemas/CategoryInput' },
                },
                image: { type: 'string', format: 'binary', description: 'One optional image (JPG, PNG or WebP, 5 MB).' },
              },
            },
          },
          'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } },
        },
      },
      responses: {
        '201': {
          description: 'Category created.',
          content: {
            'application/json': {
              schema: { type: 'object', required: ['category'], properties: { category: { $ref: '#/components/schemas/Category' } } },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/admin/categories/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Update a category',
      operationId: 'adminUpdateCategory',
      description: 'Renaming also regenerates the slug. The image is optional; a plain JSON body is accepted when none is sent.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Category id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'string',
                  description: 'The fields to change as a JSON-encoded string.',
                  contentMediaType: 'application/json',
                  contentSchema: { $ref: '#/components/schemas/CategoryUpdateInput' },
                },
                image: { type: 'string', format: 'binary', description: 'One optional replacement image (JPG, PNG or WebP, 5 MB).' },
              },
            },
          },
          'application/json': { schema: { $ref: '#/components/schemas/CategoryUpdateInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Updated category.',
          content: {
            'application/json': {
              schema: { type: 'object', required: ['category'], properties: { category: { $ref: '#/components/schemas/Category' } } },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete an unused category',
      operationId: 'adminDeleteCategory',
      description: 'Refused with 409 when any request uses the category (deactivate it instead). The category is also removed from provider profiles. Deleting an id that does not exist still returns 200.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Category id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Category deleted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
      },
    },
  },
  '/admin/tips': {
    get: {
      tags: ['Admin'],
      summary: 'List all maintenance tips, including drafts',
      operationId: 'adminListTips',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      responses: {
        '200': {
          description: 'All tips, most recently published first.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array', items: { $ref: '#/components/schemas/AdminTip' } } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
    post: {
      tags: ['Admin'],
      summary: 'Create a maintenance tip',
      operationId: 'adminCreateTip',
      description: 'The slug is derived from the title (a suffix is added if it is taken). The cover image is optional; a plain JSON body is accepted when none is sent.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['data'],
              properties: {
                data: {
                  type: 'string',
                  description: 'The tip fields as a JSON-encoded string.',
                  contentMediaType: 'application/json',
                  contentSchema: { $ref: '#/components/schemas/TipInput' },
                },
                cover: { type: 'string', format: 'binary', description: 'One optional cover image (JPG, PNG or WebP, 5 MB).' },
              },
            },
          },
          'application/json': { schema: { $ref: '#/components/schemas/TipInput' } },
        },
      },
      responses: {
        '201': {
          description: 'Tip created.',
          content: {
            'application/json': {
              schema: { type: 'object', required: ['tip'], properties: { tip: { $ref: '#/components/schemas/AdminTip' } } },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/tips/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Update a maintenance tip',
      operationId: 'adminUpdateTip',
      description: 'The slug does not change when the title changes. The cover image is optional; a plain JSON body is accepted when none is sent.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Tip id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'string',
                  description: 'The fields to change as a JSON-encoded string.',
                  contentMediaType: 'application/json',
                  contentSchema: { $ref: '#/components/schemas/TipUpdateInput' },
                },
                cover: { type: 'string', format: 'binary', description: 'One optional replacement cover image (JPG, PNG or WebP, 5 MB).' },
              },
            },
          },
          'application/json': { schema: { $ref: '#/components/schemas/TipUpdateInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Updated tip.',
          content: {
            'application/json': {
              schema: { type: 'object', required: ['tip'], properties: { tip: { $ref: '#/components/schemas/AdminTip' } } },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Delete a maintenance tip',
      operationId: 'adminDeleteTip',
      description: 'Deleting an id that does not exist still returns 200.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Tip id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      responses: {
        '200': { description: 'Tip deleted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/admin/inbox': {
    get: {
      tags: ['Admin'],
      summary: 'List support messages from the contact form',
      operationId: 'adminListInbox',
      description: 'Up to 100 messages, newest first.',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [
        { name: 'status', in: 'query', description: 'Unknown values fall back to `open`.', schema: { type: 'string', enum: ['open', 'closed'], default: 'open' } },
      ],
      responses: {
        '200': {
          description: 'Support messages in the chosen state.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/ContactMessage' } } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/admin/inbox/{id}': {
    patch: {
      tags: ['Admin'],
      summary: 'Close or reopen a support message',
      operationId: 'adminUpdateInboxMessage',
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      'x-roles': ['admin'],
      parameters: [{ name: 'id', in: 'path', required: true, description: 'Support message id.', schema: { $ref: '#/components/schemas/ObjectId' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['open', 'closed'] } } },
          },
        },
      },
      responses: {
        '200': { description: 'Support message updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  /* ============================== Public ============================== */
  '/meta': {
    get: {
      tags: ['Public'],
      summary: 'Get static app metadata',
      operationId: 'getMeta',
      security: [],
      responses: {
        '200': { description: 'Cities, urgency levels and configuration flags.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Meta' } } } },
      },
    },
  },
  '/stats/public': {
    get: {
      tags: ['Public'],
      summary: 'Get live platform numbers for the home page',
      operationId: 'getPublicStats',
      description: 'Every figure is computed from the database on each call.',
      security: [],
      responses: {
        '200': { description: 'Public statistics, featured providers and testimonials.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicStats' } } } },
      },
    },
  },
  '/tips': {
    get: {
      tags: ['Public'],
      summary: 'List published maintenance tips',
      operationId: 'listTips',
      description: 'The 50 most recently published tips, without their body.',
      security: [],
      responses: {
        '200': {
          description: 'Published tips, newest first.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array', maxItems: 50, items: { $ref: '#/components/schemas/TipSummary' } } },
              },
            },
          },
        },
      },
    },
  },
  '/tips/{slug}': {
    get: {
      tags: ['Public'],
      summary: 'Get one published maintenance tip',
      operationId: 'getTip',
      security: [],
      parameters: [{ name: 'slug', in: 'path', required: true, description: 'Tip slug (matched case-insensitively).', schema: { type: 'string' } }],
      responses: {
        '200': {
          description: 'The tip with its body.',
          content: {
            'application/json': {
              schema: { type: 'object', required: ['tip'], properties: { tip: { $ref: '#/components/schemas/Tip' } } },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/contact': {
    post: {
      tags: ['Public'],
      summary: 'Send a message to support',
      operationId: 'sendContactMessage',
      description: 'Public; a signed-in sender is linked to the message. Admins are notified. Rate limited to 5 messages per hour.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'message'],
              properties: {
                name: { type: 'string', minLength: 2, maxLength: 80 },
                email: { type: 'string', format: 'email', maxLength: 160 },
                topic: { type: 'string', enum: ['general', 'account', 'provider', 'safety', 'billing', 'other'], default: 'general' },
                message: { type: 'string', minLength: 10, maxLength: 2000 },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Message received.', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkMessage' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/analytics/events': {
    post: {
      tags: ['Public'],
      summary: 'Record an anonymous usage event',
      operationId: 'trackAnalyticsEvent',
      description: 'Stores no IP address or user id, only the role of the visitor. Accepted asynchronously (202). Rate limited to 60 events per minute.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['type'],
              properties: {
                type: { type: 'string', enum: ['page_view', 'search'] },
                path: { type: 'string', maxLength: 200, default: '' },
                query: { type: 'string', maxLength: 100, default: '' },
              },
            },
          },
        },
      },
      responses: {
        '202': { description: 'Event accepted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '429': { $ref: '#/components/responses/TooManyRequests' },
      },
    },
  },
  '/health': {
    get: {
      tags: ['Public'],
      summary: 'Check that the API is running',
      operationId: 'getHealth',
      security: [],
      responses: {
        '200': {
          description: 'Service is up.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ok', 'uptime', 'time'],
                properties: {
                  ok: { type: 'boolean', const: true },
                  uptime: { type: 'integer', description: 'Process uptime in seconds.' },
                  time: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  },
};
