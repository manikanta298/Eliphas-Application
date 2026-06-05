# ⬡ LogiCore ERP
### Full-Stack Logistics, Transport & Material Supply Management System

Built with **React + Vite** (frontend) · **Node.js + Express** (backend) · **MongoDB Atlas** (database)

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd logicore-erp
npm run install:all
```

### 2. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env and set your MONGODB_URI and JWT secrets
```

### 3. Seed Demo Data
```bash
npm run seed
```
This creates:
| Role | Email | Password |
|------|-------|----------|
| Master Admin | masteradmin@erp.com | Admin@123 |
| Admin | admin@erp.com | Admin@123 |
| Manager | manager@erp.com | Manager@123 |

### 4. Start Development
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 📁 Project Structure
```
logicore-erp/
├── backend/
│   ├── config/          # DB connection
│   ├── controllers/     # Business logic
│   ├── middleware/       # Auth, activity logger
│   ├── models/          # Mongoose schemas
│   │   ├── User.js
│   │   ├── Site.js
│   │   ├── Product.js
│   │   ├── Vehicle.js
│   │   ├── DieselEntry.js
│   │   ├── Trip.js
│   │   ├── Invoice.js
│   │   ├── Contract.js
│   │   └── ActivityLog.js
│   ├── routes/          # Express routes
│   ├── utils/           # Seeder
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/  # Modal, shared
│       │   └── layout/  # Sidebar, Topbar
│       ├── contexts/    # AuthContext
│       ├── pages/
│       │   ├── auth/       Login
│       │   ├── dashboard/  Dashboard + Charts
│       │   ├── sites/      Site Management
│       │   ├── vehicles/   Vehicle Fleet
│       │   ├── products/   Material Products
│       │   ├── contracts/  Billing Contracts
│       │   ├── trips/      Trip Logging
│       │   ├── diesel/     Fuel Management
│       │   ├── invoices/   Customer Invoices + Print
│       │   ├── reports/    Trip & Diesel Reports
│       │   └── users/      Users + Activity Logs
│       ├── services/    # Axios API + interceptors
│       └── utils/       # helpers (formatCurrency, etc.)
│
└── package.json         # Monorepo root (concurrently)
```

---

## 🔐 Role Permissions Matrix

| Feature | Master Admin | Admin | Manager | Staff |
|---------|:-----------:|:-----:|:-------:|:-----:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Add Trips / Diesel | ✅ | ✅ | ✅ | ✅ |
| Create Invoices | ✅ | ✅ | ✅ | ❌ |
| View Supplier Cost | ✅ | ✅ | ❌ | ❌ |
| View Profit Reports | ✅ | ✅ | ❌ | ❌ |
| Delete Financial Data | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ |
| View Activity Logs | ✅ | ✅ | ❌ | ❌ |
| Restore Deleted Data | ✅ | ❌ | ❌ | ❌ |
| Permanently Delete | ✅ | ❌ | ❌ | ❌ |

---

## 🏗 ERP Modules

| Module | Features |
|--------|---------|
| 🗺 **Sites** | Multi-project site management with client info |
| 🚛 **Vehicles** | Own + vendor fleet, all rate types |
| 📦 **Products** | Sand, Coal, Granite, Steel, Fly Ash with pricing |
| 📋 **Contracts** | Trip/Ton/KM/Hour/Day/Month billing contracts |
| 🔄 **Trips** | Auto-billing calculation, profit tracking |
| ⛽ **Diesel** | Morning/evening entries, vehicle/site summaries |
| 🧾 **Invoices** | Customer invoices + hidden supplier invoices |
| 📊 **Reports** | Trip + diesel reports, date-range, print |
| 💰 **Profit** | Site-wise P&L, margin analytics (admin only) |
| 👥 **Users** | Role management, permissions |
| 🕐 **Activity** | Full audit trail with before/after snapshots |

---

## 🔑 Key Architecture Decisions

### Hidden Profit System
- Supplier costs stored in every Trip/Invoice record
- API strips profit fields based on `user.permissions.canViewProfit`
- Customer invoices NEVER expose `supplierRate`, `supplierCost`, `netProfit`

### Auto Invoice Calculation
```
Supplier Invoice → Internal Cost → Company Margin → GST/TDS → Customer Invoice
                                              ↓
                              Hidden Profit = Revenue - SupplierCost - VendorExp - DieselExp
```

### JWT with Refresh Tokens
- Access token: 15 minutes
- Refresh token: 7 days (stored in DB)
- Auto-refresh via Axios interceptor (transparent to user)

---

## 🚢 Deployment

### Backend (Render / Railway)
```bash
# Set env vars in dashboard:
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy /dist folder
# Set VITE_API_URL if not using proxy
```

---

## 📱 Responsive Breakpoints
| Screen | Width | Layout |
|--------|-------|--------|
| Mobile | 300–767px | Collapsed sidebar, stacked forms |
| Tablet | 768–1023px | Drawer sidebar, adapted tables |
| Desktop | 1024–1440px | Full 260px sidebar |
| 4K | 1441–2560px | 280px sidebar, larger spacing |

---

*Built for real logistics & transport operations. Designed to replace spreadsheets with a proper ERP.*
