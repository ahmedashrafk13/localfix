# LocalFix

**A local services marketplace where providers compete for your job.**
Customers post a repair problem. ID-verified local providers send offers with a price, an arrival time and details. The customer compares the offers, negotiates in a real-time chat, hires one provider and reviews them after the job.

CS 313 Web Engineering group project: Ahmed Ashraf (team lead), Zaid Abbasi, Muhammad Abdullah.
Built with the **MERN** stack: MongoDB, Express, React and Node.js, plus Socket.IO for real-time features.

---

## Quick start (2 commands)

Requirements: **Node.js 20.11 or newer**. Nothing else is needed. You do not have to install MongoDB, because a local database starts automatically.

```bash
npm install && npm run install:all     # install root, server and client packages
npm run dev                            # API on :5000 + website on http://localhost:5173
```

Open **http://localhost:5173**.

- The first start downloads a MongoDB binary (about 280 MB, one time only).
- It then fills the database with sample data automatically.
- Data is stored in `server/.data/db` and survives restarts.

| Command | What it does |
|---|---|
| `npm run dev` | Development: Express API with auto-restart plus the Vite dev server with hot reload |
| `npm run build` | Installs everything and builds the React app into `client/dist` |
| `npm start` | Production-style: one Express server on :5000 serves the API, Socket.IO and the built React app |
| `npm run seed` | Wipes the database and reloads the sample data. This also works while the server is running. |
| `npm test` | 19 end-to-end API tests on a throwaway in-memory database |

## Sample accounts

The **Log in** page has one-click buttons for each of these accounts.

| Role | Email | Password | What to try |
|---|---|---|---|
| Customer | `ayesha@localfix.test` | `Demo@1234` | Four offers to compare on "Kitchen sink pipe leaking". A job the electrician has marked done, ready for you to confirm. A completed AC job to review. Unread chat. |
| Customer | `bilal@localfix.test` | `Demo@1234` | A plumber is on the way (job in progress) |
| Provider (verified plumber) | `tariq@localfix.test` | `Demo@1234` | An active job to mark as done. A pending offer to edit or withdraw. New requests to bid on. Reviews to reply to. |
| Provider (pending check) | `moin@localfix.test` | `Demo@1234` | Waiting for admin verification, so cannot send offers yet |
| Provider (new) | `samina@localfix.test` | `Demo@1234` | Upload CNIC documents for verification |
| Admin | `admin@localfix.test` | `Admin@1234` | Success-criteria dashboard. One pending verification. Three open reports (spam request, advance-payment scam message, disputed review). Support inbox. |

All other sample users also use `Demo@1234`, for example `hira@`, `usman@`, `kashif@` and `rubina@localfix.test`.
The sample data contains:

- 28 users
- 10 service categories
- 95 requests
- 138 offers
- 48 reviews
- 15 chats
- 6 maintenance articles
- 14 days of analytics

All of it is generated relative to the current time, so it always looks fresh. Every person in it is fictional.

---

## Feature map (SRS functional requirements)

| SRS | Requirement | Where it is implemented |
|---|---|---|
| FR1 | Register and log in as Customer or Provider; email verification; password reset | `server/src/routes/auth.js`, `client/src/pages/auth/*` |
| FR2 | Create a request with category, description, location (map pin) and up to 5 photos | 3-step wizard `PostRequest.jsx`, which autosaves a draft to localStorage; `POST /api/requests` |
| FR3 | Providers browse and filter requests by category, city, area, urgency, date, distance and keyword | `BrowseRequests.jsx` with list and map views; `GET /api/requests` |
| FR4 | Submit, edit and withdraw offers (price, ETA, details, warranty, materials) | `OfferForm.jsx`, `routes/offers.js`. The edit history is shown to the customer. |
| FR5 | Compare offers by price, rating, experience and arrival, with sorting and filters | `OfferComparison.jsx` with card and table views and Lowest price / Fastest / Top rated highlights |
| FR6 | Real-time chat per request | `Messages.jsx` with Socket.IO: typing indicator, read receipts, system notes for offer changes |
| FR7 | Accept one offer; status goes Open → Assigned → Completed or Cancelled; other bidders notified | `POST /api/offers/:id/accept`. A race-safe update guarantees only one acceptance. |
| FR8 | Provider profile: services, areas, certifications, work gallery, weekly availability | `EditProfile.jsx`, `Availability.jsx`, public `ProviderProfile.jsx` |
| FR9 | Rate and review after completion; provider average updates; provider can reply | `POST /api/requests/:id/review`, `ReviewCard.jsx` |
| FR10 | Notifications for offers, messages and status changes | Stored and pushed live: bell menu, toasts, `/notifications` page |
| FR11 | Admins verify providers, suspend accounts, remove content and manage categories | `client/src/pages/admin/*`, `server/src/routes/admin.js` |
| FR12 | Report a provider, request, message or review | `ReportDialog.jsx`, `POST /api/reports`, admin reports queue |

Extras that support the proposal:

- **Success criteria dashboard.** The admin Overview measures every target from proposal section 7 live: offers per request, time to first offer, conversion, rating, review rate, growth and repeat customers.
- **Content strategy.** Maintenance tips are managed by admins, with a CMS-style editor and published dates.
- **Anonymous usage analytics.** Page views and searches are recorded with no IP address or user id stored, and deleted after 180 days.
- **Support.** Contact form with an admin support inbox, plus FAQ, Safety, Terms and Privacy pages.
- **Privacy rights.** "Download my data" (JSON export) and "Delete account" in Settings.

### Non-functional requirements

| NFR | How it is met |
|---|---|
| Performance (< 3 s) | Route-level code splitting. Maps and socket.io load only when needed. WebP images with sizes and lazy loading. Preloaded hero image. Measured LCP is about 1.0 s locally. |
| Usability | Mobile-first, with a bottom tab bar putting the main action in the thumb zone. Posting takes 3 steps. Every list has loading, empty and error states. Dark mode follows the device. |
| Security | bcrypt password hashes, httpOnly SameSite session cookie, session revocation (token version), RBAC on every route, Zod validation, NoSQL-injection stripping, CSRF header check, Helmet with a strict CSP, rate limiting. Uploads are re-encoded with sharp, which strips EXIF/GPS. CNIC documents are stored outside the public folder. |
| Privacy | The exact address, full name and phone are visible only to the hired provider, the customer and admins. Everyone else sees the area and a pin rounded to about 1 km. |
| Reliability | Health check endpoint at `/api/health`. Database `fsync` on shutdown. The seed never runs on a non-empty database. |
| Maintainability | Modular routes, models and services. Typed validation schemas. This README. Tests. |
| Accessibility | WCAG 2.1 AA: labelled inputs, visible focus, skip link, focus-trapped dialogs, aria-live status updates, 44px touch targets, `prefers-reduced-motion` respected, status never shown by colour alone. |

## How it maps to the course outline

| Week | Topic | In LocalFix |
|---|---|---|
| 1-4 | HTML, CSS, layouts | Semantic HTML, responsive CSS Grid and Flexbox layouts, Tailwind CSS v4 with design tokens and dark mode |
| 5-7 | JavaScript, DOM, events, advanced JS | Async/await, closures, modules, custom hooks, event handling, a typo-tolerant search (Damerau-Levenshtein) |
| 8 | Client-side storage and Fetch API | `client/src/lib/api.js` wraps `fetch`. `client/src/lib/storage.js` uses localStorage for the theme, the request draft and recent searches. |
| 10 | Node.js | `server/src`: ES modules, file system, streams for uploads, process lifecycle |
| 11 | Express | REST API with routers, middleware chain and centralised error handling |
| 12 | MongoDB | Mongoose models, indexes (including 2dsphere geo queries), aggregation pipelines |
| 13 | Authentication and security | JWT in httpOnly cookies, bcrypt, RBAC, CSRF, CSP, rate limits, input validation |
| 14-15 | React basics and advanced React | React 19, React Router, Context, custom hooks, lazy loading, Suspense |
| 16 | Full MERN integration | One Express server serves the API, Socket.IO and the React build |
| 17 | Website project | This repository |

---

## Project structure

```
localfix/
├── package.json            root scripts (dev, build, start, seed, test)
├── render.yaml             one-click deployment on Render
├── server/                 Node + Express + MongoDB + Socket.IO
│   ├── src/
│   │   ├── index.js        boot: database, auto-seed, HTTP + sockets
│   │   ├── app.js          Express app: security, static files, API, SPA fallback
│   │   ├── config/         env, database (Atlas or embedded), launch cities and areas
│   │   ├── models/         User, Category, ServiceRequest, Offer, Conversation, Message,
│   │   │                   Review, Notification, Report, Tip, ContactMessage, AnalyticsEvent
│   │   ├── routes/         auth, users, requests, offers, providers, conversations,
│   │   │                   notifications, reports, dashboard, admin, public
│   │   ├── middleware/     auth (RBAC), validation, uploads, security, errors
│   │   ├── services/       notifications, marketplace rules (counters, ratings, chat notes)
│   │   ├── socket/         Socket.IO auth, rooms, typing, presence
│   │   ├── seed/           sample data generator
│   │   └── utils/          serializers (privacy rules), tokens, mailer, helpers
│   ├── seed-assets/        sample photos (CC licensed, see CREDITS.md)
│   ├── seed-private/       fake sample ID document (never served publicly)
│   └── tests/api.test.js
└── client/                 React 19 + Vite + Tailwind CSS v4
    └── src/
        ├── pages/          Home, auth, PostRequest, BrowseRequests, RequestDetails, Providers,
        │                   ProviderProfile, Messages, Notifications, Settings,
        │                   customer/*, provider/*, admin/*, help/*
        ├── components/     layout (header, tab bar, footer), ui kit, cards, maps, chat pieces
        ├── context/        Auth, Realtime (Socket.IO), Theme, Toasts, App data
        └── lib/            fetch wrapper, storage, formatters, hooks, fuzzy search
```

## Data model

- **User** stores customers, providers and admins. Each has a role and a status. Providers have an embedded `provider` profile: categories, areas, certifications, gallery, weekly availability, verification, and the rating and jobs counters.
- **ServiceRequest** belongs to a customer and a category. It holds the location (area plus a private address and a GeoJSON point), images, budget, urgency, and a status of `open`, `assigned`, `completed` or `cancelled`.
- **Offer** links a request and a provider: price, ETA, details, warranty, materials, a status of `pending`, `accepted`, `rejected` or `withdrawn`, and the price history. There is one offer per provider per request (unique index).
- **Conversation** is one per request and provider pair, with unread counters. **Message** belongs to a conversation, and system messages record offer changes.
- **Review** is one per completed request. It has a rating, a comment, an optional provider reply and a moderation flag.
- **Notification**, **Report**, **Tip**, **ContactMessage** and **AnalyticsEvent** are the supporting collections. Analytics events expire automatically through a TTL index.

## API overview

All endpoints are under `/api`. JSON is used in and out, and photos use multipart. Every state-changing call needs the `X-Requested-With` header.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/logout`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`; `GET /auth/me`; `PATCH /auth/password` |
| Account | `PATCH /users/me`, `POST /users/me/avatar`, `GET /users/me/export`, `DELETE /users/me` |
| Requests | `GET /requests` (filters, geo radius, sort), `GET /requests/mine`, `GET/PATCH /requests/:id`, `POST /requests`, `POST /requests/:id/cancel`, `/mark-done`, `/complete`, `/review` |
| Offers | `GET/POST /requests/:id/offers`, `GET /offers/mine`, `PATCH /offers/:id`, `POST /offers/:id/withdraw`, `POST /offers/:id/accept` |
| Providers | `GET /providers`, `GET /providers/:id`, `GET /providers/:id/reviews`, `PATCH /providers/me`, `PUT /providers/me/availability`, `POST/DELETE /providers/me/gallery`, `POST /providers/me/verification`, `POST /reviews/:id/reply` |
| Chat | `GET/POST /conversations`, `GET /conversations/:id`, `GET/POST /conversations/:id/messages`, `POST /conversations/:id/read` |
| Other | `GET /notifications`, `POST /notifications/read-all`, `POST /reports`, `GET /dashboard/customer`, `GET /dashboard/provider`, `GET /categories`, `GET /meta`, `GET /stats/public`, `GET /tips`, `GET /tips/:slug`, `POST /contact`, `POST /analytics/events`, `GET /health` |
| Admin | `GET /admin/stats`, users, verifications (+ document), reports, requests (remove/restore), reviews (hide), messages (delete), categories CRUD, tips CRUD, inbox |

Socket.IO events pushed to clients: `notification:new`, `message:new`, `message:removed`, `typing`, `conversation:read`, `offer:new`, `request:new`, `request:updated`, `account:updated`.

---

## Deployment

LocalFix is a single Node service.

1. **Database.** Create a free **MongoDB Atlas** cluster. Add a database user, allow access from anywhere (`0.0.0.0/0`), and copy the connection string.
2. **Render.** Push this folder to GitHub. Then on [render.com](https://render.com) choose **New → Blueprint** and select the repo. `render.yaml` configures everything.
3. **Environment.** When asked, set:
   - `MONGO_URI` to your Atlas string;
   - `APP_URL` to your site URL, for example `https://localfix.onrender.com`.
   `JWT_SECRET` is generated for you. The empty database is seeded with the sample data on first start.
4. **Optional: real emails.** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`. Without SMTP, email verification is switched off in production, and emails are written to the server log.

Any other Node host (Railway, a VPS with PM2, and so on) works with the same steps:

```bash
npm install && npm run build
NODE_ENV=production MONGO_URI=... JWT_SECRET=... APP_URL=... npm start
```

Uploaded photos are saved to `UPLOAD_DIR`. Use a persistent disk on the host; `render.yaml` mounts one at `/var/data`. The sample photos ship inside the repo, so they work on any host.

All settings are documented in `server/.env.example`.

## Testing

- `npm test` runs 19 API tests against a fresh in-memory MongoDB with the real seed data. They cover:
  - privacy of addresses;
  - CSRF and NoSQL-injection protection;
  - RBAC;
  - the full post → bid → chat → negotiate → accept → complete → review flow;
  - withdraw and resubmit;
  - reports and moderation;
  - suspension ending sessions;
  - password reset;
  - account deletion.
- The full UI was also tested in a real browser (Playwright) across customer, provider and admin journeys, on desktop and mobile, in light and dark mode, with no console errors and no failed requests.

## Credits

The sample photos are Creative Commons or CC0 images from Flickr, rawpixel and StockSnap, found through Openverse. Portraits come from randomuser.me. Full attribution is in `server/seed-assets/CREDITS.md`. The map uses © OpenStreetMap contributors. Icons are by Phosphor Icons.
