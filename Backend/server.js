const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const dotenv  = require('dotenv');
const path    = require('path');
const connectDB = require('./config/db');

// Always load .env from the backend folder root
dotenv.config({ path: path.join(__dirname, '.env') });
connectDB().then(async () => {
  // Auto-generate financial years on startup
  try {
    const FinancialYear = require('./models/FinancialYear');
    await FinancialYear.autoGenerate();
    console.log('✅ Financial years auto-generated');
  } catch (e) {
    console.warn('⚠️  FY auto-generate:', e.message);
  }
});

const app = express();

// ─── CORS — accept any origin in dev, whitelist in production ──
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://eliphas-application.onrender.com',
  'https://eliphas-application.vercel.app',
  'https://eliphas-application-git-main-manikanta298.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / Postman (no origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development allow everything
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Pre-flight for all routes
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/authRoutes'));
app.use('/api/users',           require('./routes/userRoutes'));
app.use('/api/sites',           require('./routes/siteRoutes'));
app.use('/api/products',        require('./routes/productRoutes'));
app.use('/api/vehicles',        require('./routes/vehicleRoutes'));
app.use('/api/diesel',          require('./routes/dieselRoutes'));
app.use('/api/contracts',       require('./routes/contractRoutes'));
app.use('/api/trips',           require('./routes/tripRoutes'));
app.use('/api/invoices',        require('./routes/invoiceRoutes'));
app.use('/api/reports',         require('./routes/reportRoutes'));
app.use('/api/dashboard',       require('./routes/dashboardRoutes'));
app.use('/api/activity',        require('./routes/activityRoutes'));
// ─── New Modules ───────────────────────────────────────────────
app.use('/api/financial-years', require('./routes/financialYearRoutes'));
app.use('/api/companies',       require('./routes/companyRoutes'));
app.use('/api/drivers',         require('./routes/driverRoutes'));
app.use('/api/purchases',       require('./routes/purchaseRoutes'));
app.use('/api/transactions',    require('./routes/transactionRoutes'));

// Health check — Render pings this to keep the service alive
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', env: process.env.NODE_ENV, timestamp: new Date() })
);

// 404 for unknown API routes
app.use('/api/*', (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 LogiCore ERP API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
);
