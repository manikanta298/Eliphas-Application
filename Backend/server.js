const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const dotenv  = require('dotenv');
const path    = require('path');
const connectDB = require('./config/db');

dotenv.config({ path: path.join(__dirname, '.env') });
connectDB().then(async () => {
  try {
    const FinancialYear = require('./models/FinancialYear');
    await FinancialYear.autoGenerate();
    console.log('✅ Financial years auto-generated');
  } catch (e) {
    console.warn('⚠️  FY auto-generate:', e.message);
  }

  try {
    const User = require('./models/User');
    const demoUsers = [
      { name: 'Master Admin', email: 'masteradmin@erp.com', password: 'Admin@123', role: 'masterAdmin', phone: '9999999999' },
      { name: 'Admin User', email: 'admin@erp.com', password: 'Admin@123', role: 'admin', phone: '8888888888' },
      { name: 'Site Manager', email: 'manager@erp.com', password: 'Admin@123', role: 'manager', phone: '7777777777' },
    ];

    // Always ensure the demo accounts exist, even if MongoDB already has other users.
    for (const demo of demoUsers) {
      const existing = await User.findOne({ email: demo.email });
      if (!existing) {
        await User.create(demo);
        console.log(`✅ Demo user created: ${demo.email}`);
      } else if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        console.log(`✅ Demo user reactivated: ${demo.email}`);
      }
    }

    // Keep operational seed data for a database containing only the demo accounts.
    const count = await User.countDocuments();
    if (count === demoUsers.length) {
      const Site = require('./models/Site');
      const Product = require('./models/Product');
      const Vehicle = require('./models/Vehicle');
      const manager = await User.findOne({ email: 'manager@erp.com' });

      const site1 = await Site.create({ name: 'Vizag Steel Plant', clientCompany: 'Rashtriya Ispat Nigam Ltd.', location: 'Visakhapatnam, AP', manager: manager._id, status: 'active', startDate: new Date('2024-01-01'), contractValue: 5000000 });
      const site2 = await Site.create({ name: 'Gannavaram Port', clientCompany: 'Gannavaram Port Authority', location: 'Gannavaram, AP', manager: manager._id, status: 'active', startDate: new Date('2024-03-01'), contractValue: 3000000 });
      manager.assignedSites = [site1._id, site2._id];
      await manager.save();

      await Product.insertMany([
        { name: 'River Sand', category: 'Sand', unit: 'Ton', purchaseRate: 800, sellingRate: 1200, gstPercent: 5, tdsPercent: 1, transportRate: 150 },
        { name: 'Thermal Coal', category: 'Coal', unit: 'Ton', purchaseRate: 3500, sellingRate: 4200, gstPercent: 5, tdsPercent: 1, transportRate: 300 },
        { name: 'Fly Ash', category: 'FlyAsh', unit: 'Ton', purchaseRate: 200, sellingRate: 450, gstPercent: 5, tdsPercent: 1, transportRate: 80 },
        { name: 'Blue Metal', category: 'Granite', unit: 'Ton', purchaseRate: 900, sellingRate: 1400, gstPercent: 18, tdsPercent: 1, transportRate: 200 },
        { name: 'TMT Steel', category: 'Steel', unit: 'Ton', purchaseRate: 52000, sellingRate: 55000, gstPercent: 18, tdsPercent: 1, transportRate: 500 },
      ]);

      await Vehicle.insertMany([
        { vehicleNumber: 'AP05TC1234', vehicleType: 'Tipper', ownership: 'own', driverName: 'Raju Kumar', driverPhone: '9876543210', capacity: 15, tripRate: 2500, tonRate: 180, assignedSites: [site1._id], status: 'active' },
        { vehicleNumber: 'AP05TC5678', vehicleType: 'Truck', ownership: 'own', driverName: 'Suresh Rao', driverPhone: '9876543211', capacity: 20, tripRate: 3000, tonRate: 160, assignedSites: [site1._id, site2._id], status: 'active' },
        { vehicleNumber: 'AP05JC0001', vehicleType: 'JCB', ownership: 'own', driverName: 'Manoj', driverPhone: '9876543213', capacity: 15, tripRate: 0, hourlyRate: 1200, dailyRate: 9000, assignedSites: [site1._id], status: 'active' },
      ]);
      console.log('✅ Default operational seed data created');
    }
  } catch (e) {
    console.warn('⚠️  Auto-seed error:', e.message);
  }});

const app = express();

// Root endpoint for Render/service health checks
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LogiCore ERP API is running',
    health: '/api/health'
  });
});

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
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/diesel', require('./routes/dieselRoutes'));
app.use('/api/contracts', require('./routes/contractRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/financial-years', require('./routes/financialYearRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));

app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const User = require('./models/User');
  let userCount = 0;
  try { userCount = await User.countDocuments(); } catch {}
  res.json({
    status: 'OK',
    env: process.env.NODE_ENV,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    jwtConfigured: !!process.env.JWT_SECRET,
    mongoConfigured: !!process.env.MONGODB_URI,
    users: userCount,
    timestamp: new Date(),
  });
});

app.use('/api/*', (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

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
