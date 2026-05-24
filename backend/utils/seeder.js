const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend root (works regardless of which folder you run from)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.MONGODB_URI) {
  console.error('\n❌  MONGODB_URI not found!');
  console.error('📋  Steps to fix:');
  console.error('    1. Go to your backend/ folder');
  console.error('    2. Copy .env.example  →  .env');
  console.error('    3. Open .env and paste your MongoDB Atlas connection string');
  console.error('    4. Run npm run seed again\n');
  process.exit(1);
}

const User = require('../models/User');
const Site = require('../models/Site');
const Product = require('../models/Product');
const Vehicle = require('../models/Vehicle');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB...');

  // Clear existing
  await User.deleteMany({});
  await Site.deleteMany({});
  await Product.deleteMany({});
  await Vehicle.deleteMany({});

  // Create Master Admin
  const masterAdmin = await User.create({
    name: 'Master Admin',
    email: 'masteradmin@erp.com',
    password: 'Admin@123',
    role: 'masterAdmin',
    phone: '9999999999',
  });

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@erp.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '8888888888',
  });

  const manager = await User.create({
    name: 'Site Manager',
    email: 'manager@erp.com',
    password: 'Manager@123',
    role: 'manager',
    phone: '7777777777',
  });

  // Create Sites
  const site1 = await Site.create({
    name: 'Vizag Steel Plant',
    clientCompany: 'Rashtriya Ispat Nigam Ltd.',
    clientContact: 'Mr. Ramesh Kumar',
    clientPhone: '9100000001',
    location: 'Visakhapatnam, AP',
    address: 'Steel Plant Road, Ukkunagaram, Visakhapatnam - 530031',
    manager: manager._id,
    status: 'active',
    startDate: new Date('2024-01-01'),
    contractValue: 5000000,
  });

  const site2 = await Site.create({
    name: 'Gannavaram Port',
    clientCompany: 'Gannavaram Port Authority',
    clientContact: 'Mr. Suresh Babu',
    clientPhone: '9100000002',
    location: 'Gannavaram, AP',
    address: 'Port Road, Gannavaram - 521101',
    manager: manager._id,
    status: 'active',
    startDate: new Date('2024-03-01'),
    contractValue: 3000000,
  });

  // Assign sites to manager
  manager.assignedSites = [site1._id, site2._id];
  await manager.save();

  // Create Products
  await Product.insertMany([
    { name: 'River Sand', category: 'Sand', unit: 'Ton', purchaseRate: 800, sellingRate: 1200, gstPercent: 5, tdsPercent: 1, transportRate: 150 },
    { name: 'M-Sand', category: 'Sand', unit: 'Ton', purchaseRate: 600, sellingRate: 950, gstPercent: 5, tdsPercent: 1, transportRate: 120 },
    { name: 'Thermal Coal', category: 'Coal', unit: 'Ton', purchaseRate: 3500, sellingRate: 4200, gstPercent: 5, tdsPercent: 1, transportRate: 300 },
    { name: 'Coking Coal', category: 'Coal', unit: 'Ton', purchaseRate: 8000, sellingRate: 9500, gstPercent: 5, tdsPercent: 1, transportRate: 400 },
    { name: 'Blue Metal Granite', category: 'Granite', unit: 'Ton', purchaseRate: 900, sellingRate: 1400, gstPercent: 18, tdsPercent: 1, transportRate: 200 },
    { name: 'Fly Ash', category: 'FlyAsh', unit: 'Ton', purchaseRate: 200, sellingRate: 450, gstPercent: 5, tdsPercent: 1, transportRate: 80 },
    { name: 'TMT Steel Bars', category: 'Steel', unit: 'Ton', purchaseRate: 52000, sellingRate: 55000, gstPercent: 18, tdsPercent: 1, transportRate: 500 },
  ]);

  // Create Vehicles
  await Vehicle.insertMany([
    {
      vehicleNumber: 'AP05TC1234', vehicleType: 'Tipper', ownership: 'own',
      driverName: 'Raju Kumar', driverPhone: '9876543210', capacity: 15,
      tripRate: 2500, tonRate: 180, kmRate: 25,
      assignedSites: [site1._id], status: 'active',
    },
    {
      vehicleNumber: 'AP05TC5678', vehicleType: 'Truck', ownership: 'own',
      driverName: 'Suresh Rao', driverPhone: '9876543211', capacity: 20,
      tripRate: 3000, tonRate: 160, kmRate: 22,
      assignedSites: [site1._id, site2._id], status: 'active',
    },
    {
      vehicleNumber: 'AP09AB2345', vehicleType: 'Lorry', ownership: 'vendor',
      driverName: 'Naresh', driverPhone: '9876543212', capacity: 10,
      tripRate: 2000, tonRate: 200, kmRate: 30,
      assignedSites: [site2._id], status: 'active',
    },
    {
      vehicleNumber: 'AP05JC0001', vehicleType: 'JCB', ownership: 'own',
      driverName: 'Manoj', driverPhone: '9876543213',
      hourlyRate: 1200, dailyRate: 9000, monthlyRate: 180000,
      assignedSites: [site1._id], status: 'active',
    },
  ]);

  console.log('✅ Seed data created successfully!');
  console.log('─────────────────────────────────────');
  console.log('Master Admin: masteradmin@erp.com / Admin@123');
  console.log('Admin:        admin@erp.com / Admin@123');
  console.log('Manager:      manager@erp.com / Manager@123');
  console.log('─────────────────────────────────────');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
