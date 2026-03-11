# ClearDeal - B2B Billboard Advertising Transparency Platform

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License MIT">
  <img src="https://img.shields.io/badge/python-3.9+-blue.svg" alt="Python 3.9+">
  <img src="https://img.shields.io/badge/react-19.0-61dafb.svg" alt="React 19">
</p>

## 📋 Overview

ClearDeal is India's first B2B deal transparency platform for billboard/OOH advertising, starting with Hyderabad. The platform formalizes middlemen (negotiation reps), enforces price bands, provides an immutable negotiation audit trail, and automates GST invoice generation.

### 🎯 Problem Statement

B2B advertising deals in India are plagued by:
- **Opacity**: Off-platform negotiations with no audit trail
- **Corruption**: Kickbacks and undeclared commissions
- **Inefficiency**: Manual GST invoicing and payment tracking
- **Trust deficit**: No verification of parties involved

### 💡 Solution

ClearDeal provides an organization-level operating system where:
- Every transaction occurs between verified organizations
- All negotiations are logged with immutable audit trails
- Escrow payments ensure transparency
- Auto-generated GST invoices eliminate tax leakage

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TailwindCSS, Shadcn UI, React-Leaflet |
| **Backend** | FastAPI (Python), Motor (async MongoDB) |
| **Database** | MongoDB |
| **Authentication** | JWT (python-jose) + bcrypt |
| **Maps** | Leaflet + OpenStreetMap (CartoDB tiles) |
| **Fonts** | Public Sans, DM Sans (Google Fonts) |

### Project Structure

```
/app
├── backend/
│   ├── server.py           # FastAPI application (1500+ lines)
│   ├── exceptions.py       # Custom exception handling
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Backend test suites
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main router
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── components/     # UI components (Shadcn)
│   │   ├── pages/          # Page components
│   │   ├── utils/          # API utilities
│   │   └── hooks/          # Custom hooks
│   ├── public/             # Static assets
│   └── package.json        # Node dependencies
├── memory/
│   └── PRD.md              # Product Requirements Document
└── README.md               # This file
```

---

## 👥 User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `owner` | Billboard Owner / Org Manager | Create listings, set price bands, approve deals, manage reps |
| `brand_manager` | Brand / Advertiser Manager | Browse listings, initiate deals, approve & pay |
| `rep` | Negotiation Representative | Negotiate within price bands, earn commissions |

---

## ✨ Features

### Core Features (MVP)

- ✅ **Authentication**: JWT-based email/password auth with role selection
- ✅ **Company Onboarding**: 3-step verification (GST, Aadhaar, Bank)
- ✅ **Billboard Listings**: Create, manage, and publish billboard inventory
- ✅ **Discovery & Search**: Map view with filters (area, price, type)
- ✅ **Negotiation Engine**: Real-time chat with offer/counter-offer
- ✅ **Deal Lifecycle**: From negotiation to payment with dual approvals
- ✅ **Payment & Invoicing**: Escrow payments with auto GST invoice

### PRD v2.0 Features

- ✅ **F1**: Deal Contract Auto-Generation
- ✅ **F2**: Deal Thread Lock (Anti-Bypass)
- ✅ **F3**: Benchmark Price Intelligence
- ✅ **F4**: Rep Performance Dashboard with Ratings
- ✅ **F5**: Dispute Resolution Flow
- ✅ **F6**: Multi-Board Campaign Bundling
- ✅ **F7**: Availability Calendar with Interest Flagging

### Manager Controls

- ✅ Rep invitation and onboarding
- ✅ Price band configuration
- ✅ Rep activation/deactivation
- ✅ Budget ceiling management
- ✅ Commission visibility settings

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.9 or higher
- **Node.js** 18.x or higher
- **MongoDB** 4.4 or higher (or MongoDB Atlas)
- **Yarn** package manager

### Environment Variables

#### Backend (`/app/backend/.env`)

```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=cleardeal

# Security
JWT_SECRET=your-secure-jwt-secret-key-here

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

#### Frontend (`/app/frontend/.env`)

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/KushalMohith18/ClearDeal.git
cd ClearDeal
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from example above)
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Run development server
yarn start
```

#### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

---

## 🌐 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Get current user profile |

### Companies

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/companies` | POST | Create company |
| `/api/companies/me` | GET | Get user's company |
| `/api/companies/verify-gst` | POST | Verify GST (mocked) |
| `/api/companies/verify-aadhaar` | POST | Verify Aadhaar (mocked) |
| `/api/companies/verify-bank` | POST | Verify bank account (mocked) |
| `/api/companies/invite-rep` | POST | Invite representative |

### Billboards

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/billboards` | GET | Search billboards |
| `/api/billboards` | POST | Create billboard |
| `/api/billboards/my` | GET | Get user's billboards |
| `/api/billboards/{id}` | GET | Get billboard details |
| `/api/billboards/{id}/status` | PUT | Update status |
| `/api/billboards/{id}/availability` | GET | Get availability calendar |

### Deals & Negotiation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/deals` | GET | Get user's deals |
| `/api/deals` | POST | Create new deal |
| `/api/deals/{id}` | GET | Get deal details |
| `/api/deals/{id}/messages` | GET/POST | Negotiation messages |
| `/api/deals/{id}/accept-offer` | POST | Accept current offer |
| `/api/deals/{id}/approve` | POST | Manager approval |
| `/api/deals/{id}/reject` | POST | Reject and reopen |
| `/api/deals/{id}/pay` | POST | Process payment |
| `/api/deals/{id}/invoice` | GET | Get GST invoice |
| `/api/deals/{id}/contract` | GET | Get contract |
| `/api/deals/{id}/dispute` | POST/GET | Dispute management |

### Dashboard & Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Role-based statistics |
| `/api/benchmarks` | GET | Area price benchmarks |
| `/api/reps/my-performance` | GET | Rep performance data |
| `/api/admin/stats` | GET | Platform-wide statistics |

---

## 🚢 Deployment Guide

### Option 1: Docker Deployment (Recommended)

#### 1. Create Dockerfile for Backend

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### 2. Create Dockerfile for Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

#### 3. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: cleardeal
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=cleardeal
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001
    depends_on:
      - backend

volumes:
  mongodb_data:
```

#### 4. Deploy

```bash
# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 2: Cloud Deployment

#### Railway/Render (Backend)

1. Connect your GitHub repository
2. Set environment variables:
   - `MONGO_URL`: Your MongoDB Atlas connection string
   - `DB_NAME`: cleardeal
   - `JWT_SECRET`: Your secure secret key
   - `CORS_ORIGINS`: Your frontend URL
3. Deploy command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

#### Vercel (Frontend)

1. Import from GitHub
2. Set environment variables:
   - `REACT_APP_BACKEND_URL`: Your backend URL
3. Build command: `yarn build`
4. Output directory: `build`

### Option 3: Traditional VPS (Ubuntu)

```bash
# Install dependencies
sudo apt update
sudo apt install python3-pip nodejs npm nginx mongodb

# Clone and setup
git clone https://github.com/KushalMohith18/ClearDeal.git
cd ClearDeal

# Backend
cd backend
pip3 install -r requirements.txt
# Create systemd service for uvicorn

# Frontend
cd ../frontend
npm install -g yarn
yarn install
yarn build
# Copy build to nginx

# Configure nginx reverse proxy
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v --cov=server
```

### Frontend Tests

```bash
cd frontend
yarn test
```

---

## ⚠️ Mocked Services

The following services are **MOCKED** and require real API integration for production:

| Service | Current Status | Production Integration |
|---------|---------------|----------------------|
| GST Verification | Mocked | Masters India API |
| Aadhaar Verification | Mocked | DigiLocker API |
| Bank Penny-Drop | Mocked | Razorpay API |
| Payment/Escrow | Mocked | Razorpay Route |
| Email Notifications | Not implemented | Resend/SendGrid |
| SMS Notifications | Not implemented | MSG91 |
| E-Signature | Not implemented | Digio/Leegality |

---

## 📊 Success Metrics (MVP Targets)

- [ ] 10 verified billboard organizations
- [ ] 5 verified brand organizations
- [ ] 20 completed deals on platform
- [ ] 95% deal completion rate
- [ ] <48 hour average deal cycle time

---

## 🔐 Security Considerations

- All PII should be encrypted (AES-256) in production
- Use TLS 1.3 for all connections
- Store only Razorpay tokens, never card details
- Implement rate limiting for API endpoints
- Enable Row-Level Security in database
- Regular security audits recommended

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Support

For support, email support@cleardeal.in or raise an issue on GitHub.

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - Frontend library
- [Shadcn UI](https://ui.shadcn.com/) - Beautiful UI components
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [MongoDB](https://www.mongodb.com/) - Database

---

**Built with ❤️ for transparent B2B advertising in India**
