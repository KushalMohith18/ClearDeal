# ClearDeal PRD — MVP v1.0

**Last Updated:** 2024-02-26  
**Status:** MVP Complete  

---

## Overview
ClearDeal is India's first B2B billboard deal transparency platform, starting with Hyderabad's OOH advertising market. It formalizes middlemen, enforces price bands, provides an immutable negotiation audit trail, and automates GST invoice generation.

---

## Architecture

### Tech Stack
- **Frontend:** React + TailwindCSS + Shadcn UI + React-Leaflet (Leaflet/OpenStreetMap)
- **Backend:** FastAPI (Python) + Motor (async MongoDB driver)
- **Database:** MongoDB
- **Auth:** JWT (python-jose) + bcrypt (passlib)
- **Maps:** Leaflet + CartoDB Light tile layer (free, no API key)
- **Fonts:** Public Sans (headings), DM Sans (body) via Google Fonts

### Key Directories
```
/app/backend/server.py          — Full FastAPI backend (900 lines)
/app/frontend/src/
  App.js                        — Main router
  contexts/AuthContext.js       — JWT auth state
  utils/api.js                  — Axios interceptor
  pages/Landing.js              — Public landing page
  pages/Auth.js                 — Login/Register with role selection
  pages/Onboarding.js           — 3-step company setup
  pages/Dashboard.js            — Role-based dashboard
  pages/BillboardBrowse.js      — Search + Leaflet map view
  pages/BillboardDetail.js      — Detail + Make Offer modal
  pages/CreateListing.js        — 3-step billboard creation
  pages/Negotiation.js          — Real-time chat + deal lifecycle
  pages/InviteAccept.js         — Rep invite acceptance
  components/Navbar.js          — Responsive navigation
```

---

## User Roles
| Role | Description |
|------|-------------|
| `owner` | Billboard Owner — creates listings, sets price bands, approves deals |
| `brand_manager` | Brand Manager — browses listings, initiates deals, approves & pays |
| `rep` | Negotiation Rep — linked to company, negotiates within price bands |

---

## Core Features Implemented

### Authentication
- JWT-based email/password auth
- Role selection at registration (owner/brand_manager/rep)
- Rep invite flow with unique invite links
- Token stored in localStorage (`cd_token`)

### Company Onboarding (3 steps)
1. Company details (name, GST, director, address, type)
2. GST verification (MOCKED) + Aadhaar verification (MOCKED)
3. Bank account verification via penny-drop (MOCKED)
4. Verified badge issued after all steps

### Billboard Listings
- 3-step creation form (basic info, location, photos + pricing)
- Photo upload (base64, up to 10 photos)
- GPS coordinates + Leaflet map display
- Price band settings (min acceptable price, max rep discount %)
- Status management: draft → active → booked
- Private pricing fields hidden from non-owners

### Discovery & Search
- Leaflet/OpenStreetMap map view with markers
- Grid view and map+list split view
- Filters: area, price range, board type, illumination
- Hardcoded benchmark prices per area (Hitech City, Banjara Hills, etc.)

### Negotiation Engine
- Full chat thread with offer/counter-offer/text/system messages
- Immutable messages (no edit/delete)
- Price band enforcement for reps (backend-enforced)
- Real-time polling every 4 seconds
- Accept offer → move to Pending Approval state
- Each message has sender name, role, timestamp

### Deal Lifecycle
```
negotiating → pending_approval → approved → paid → completed
                                       ↘ rejected (back to negotiating)
```

### Owner Approval Gate
- Both buyer company (brand_manager) AND seller company (owner) must digitally approve
- `buyer_approved` + `seller_approved` flags tracked separately
- Only fully approved when both flags are true

### Payment (MOCKED)
- Simulated escrow payment
- Auto commission split: 6% platform, 4% rep, 90% seller
- Payment reference generated (PAY-XXXXXXXX)
- Billboard status → booked after payment

### GST Invoice (MOCKED)
- Invoice number format: INV-YYYYMM-DEALID
- Shows buyer/seller GST, amounts, HSN code 998361
- Available after payment

### Dashboards
- **Owner:** occupancy rate, revenue, active deals, billboard list, invite reps
- **Brand Manager:** total spend, active negotiations, recent deals
- **Rep:** deal count, commission earned, active negotiations

---

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Companies
- `POST /api/companies`
- `GET /api/companies/me`
- `POST /api/companies/verify-gst`
- `POST /api/companies/verify-aadhaar`
- `POST /api/companies/verify-bank`
- `POST /api/companies/invite-rep`
- `GET /api/companies/{id}/reps`

### Billboards
- `POST /api/billboards`
- `GET /api/billboards` (search/filter)
- `GET /api/billboards/my`
- `GET /api/billboards/{id}`
- `PUT /api/billboards/{id}/status`

### Deals & Negotiation
- `POST /api/deals`
- `GET /api/deals`
- `GET /api/deals/{id}`
- `POST /api/deals/{id}/messages`
- `GET /api/deals/{id}/messages`
- `POST /api/deals/{id}/accept-offer`
- `POST /api/deals/{id}/approve`
- `POST /api/deals/{id}/reject`
- `POST /api/deals/{id}/pay`
- `GET /api/deals/{id}/invoice`

### Dashboard & Invites
- `GET /api/dashboard/stats`
- `GET /api/invites/{id}`
- `POST /api/invites/{id}/accept`

---

## What's Mocked
| Feature | Status |
|---------|--------|
| GST Verification | MOCKED (no real GSTN API) |
| Aadhaar Verification | MOCKED (no DigiLocker) |
| Bank Penny-Drop | MOCKED (no Razorpay) |
| Payment/Escrow | MOCKED (no real payment gateway) |
| Email Notifications | Not implemented |
| WebSocket | Polling (4s interval) |
| File Storage | Base64 in MongoDB (not cloud storage) |

---

## P0/P1/P2 Backlog

### P0 — Critical for real launch
- [ ] Real Razorpay integration (payment, escrow, Route split)
- [ ] Real GST verification API (Masters India / Razorpay GST)
- [ ] Real Aadhaar verification (DigiLocker)
- [ ] Email notifications (Resend) for deal updates
- [ ] Production-grade file storage (S3/GCS for photos)

### P1 — Important
- [ ] WebSocket real-time (replace polling)
- [ ] Multi-photo carousel in billboard detail
- [ ] PDF invoice download
- [ ] Rep deal history / rep profile page
- [ ] Advanced dashboard with revenue chart (Recharts)
- [ ] 48-hour approval timeout with reminders
- [ ] Admin panel for platform oversight

### P2 — Nice to have
- [ ] AI-powered price benchmarking engine
- [ ] Multi-city support (beyond Hyderabad)
- [ ] Native iOS/Android apps
- [ ] Multi-campaign management for brands
- [ ] Rep performance leaderboard
- [ ] API for third-party integrations

---

## Test Credentials (Seeded)
- **Owner:** testowner@cleardeal.com / test123
- **Brand Manager:** testbrand@cleardeal.com / test123
