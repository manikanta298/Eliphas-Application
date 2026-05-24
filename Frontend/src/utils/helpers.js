// Currency formatter
export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// Number with commas
export const formatNumber = (n, dec = 2) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: dec }).format(n || 0);

// Date formatter
export const formatDate = (d, opts = {}) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
};

export const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Calculate billing amount
export const calcBillingAmount = (type, rate, { quantity = 0, weight = 0, km = 0, hours = 0, days = 0 }) => {
  const map = {
    trip:        rate,
    ton:         rate * quantity,
    weight:      rate * (weight / 1000),
    km:          rate * km,
    hourly:      rate * hours,
    daily:       rate * days,
    weekly:      rate * (days / 7),
    monthly:     rate * (days / 30),
    fixed:       rate,
    machineRental: rate * (hours || days),
  };
  return map[type] || rate;
};

// GST/TDS Calculator
export const calcTaxes = (amount, gstPct = 0, tdsPct = 0) => {
  const gst = (amount * gstPct) / 100;
  const tds = (amount * tdsPct) / 100;
  return { gst, tds, total: amount + gst - tds };
};

// Profit calculator
export const calcProfit = (revenue, supplierCost, vendorExp, dieselExp) => {
  const net = revenue - supplierCost - vendorExp - dieselExp;
  const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(1) : 0;
  return { net, margin };
};

// Margin %
export const calcMargin = (buy, sell) => {
  if (!buy || !sell) return 0;
  return (((sell - buy) / buy) * 100).toFixed(2);
};

// Debounce
export const debounce = (fn, delay = 400) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};

// Role display name
export const roleLabel = (role) => ({
  masterAdmin: 'Master Admin',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
}[role] || role);

// Status badge class
export const statusClass = (status) => ({
  active:    'badge-success',
  inactive:  'badge-neutral',
  completed: 'badge-info',
  cancelled: 'badge-danger',
  paid:      'badge-success',
  unpaid:    'badge-danger',
  partial:   'badge-warning',
  overdue:   'badge-danger',
  pending:   'badge-warning',
  invoiced:  'badge-info',
  on_trip:   'badge-accent',
  maintenance:'badge-warning',
}[status] || 'badge-neutral');

// Billing type display
export const billingLabel = (type) => ({
  trip:         'Trip Wise',
  ton:          'Ton Wise',
  weight:       'Weight Wise',
  km:           'KM Wise',
  hourly:       'Hourly',
  daily:        'Daily',
  weekly:       'Weekly',
  monthly:      'Monthly',
  fixed:        'Fixed Contract',
  machineRental:'Machine Rental',
  custom:       'Custom',
}[type] || type);
