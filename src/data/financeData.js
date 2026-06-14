// ─── Subscriptions ─────────────────────────────────────────────────────────────
// billingDay = day of month the charge is deducted / invoice raised

export const SUBSCRIPTIONS = [
  // India
  { id: 'sub1', name: 'Netflix',           country: 'IN',     cat: 'streaming', emoji: '🎬', amount: 649,  currency: 'INR', billingDay: 15 },
  { id: 'sub2', name: 'Amazon Prime',      country: 'IN',     cat: 'streaming', emoji: '📦', amount: 1499, currency: 'INR', billingDay: 3,  cycle: 'yearly' },
  { id: 'sub3', name: 'JioCinema Premium', country: 'IN',     cat: 'streaming', emoji: '📺', amount: 499,  currency: 'INR', billingDay: 20 },
  { id: 'sub4', name: 'Spotify',           country: 'IN',     cat: 'music',     emoji: '🎵', amount: 119,  currency: 'INR', billingDay: 7  },
  { id: 'sub5', name: 'iCloud+ (50 GB)',   country: 'IN',     cat: 'cloud',     emoji: '☁️', amount: 75,   currency: 'INR', billingDay: 22 },
  // Thailand
  { id: 'sub6', name: 'YouTube Premium',   country: 'TH',     cat: 'streaming', emoji: '▶️', amount: 179,  currency: 'THB', billingDay: 12 },
  { id: 'sub7', name: 'AIS Fiber',         country: 'TH',     cat: 'internet',  emoji: '🌐', amount: 599,  currency: 'THB', billingDay: 5  },
  // Global
  { id: 'sub8', name: 'Claude AI Pro',     country: 'GLOBAL', cat: 'ai',        emoji: '🤖', amount: 20,   currency: 'USD', billingDay: 1  },
  { id: 'sub9', name: 'ChatGPT Plus',      country: 'GLOBAL', cat: 'ai',        emoji: '🤖', amount: 20,   currency: 'USD', billingDay: 8  },
];

// ─── Loans & EMIs ───────────────────────────────────────────────────────────────
// dueDay = day of month EMI is debited

export const LOANS = [
  { id: 'loan1', name: 'Home Loan', bank: 'HDFC Bank',  emi: 45000, currency: 'INR', dueDay: 5 },
  { id: 'loan2', name: 'Car Loan',  bank: 'ICICI Bank', emi: 18500, currency: 'INR', dueDay: 8 },
];

// ─── Credit Cards ───────────────────────────────────────────────────────────────
// statementDay = day statement is generated each month
// dueDay       = day payment is due (typically ~20 days after statement, may cross into next month)

export const CREDIT_CARDS = [
  { id: 'cc1', name: 'Regalia',     bank: 'HDFC Bank', statementDay: 20, dueDay: 10, currency: 'INR' },
  { id: 'cc2', name: 'SimplyCLICK', bank: 'SBI Card',  statementDay: 15, dueDay: 5,  currency: 'INR' },
  { id: 'cc3', name: 'Atlas',       bank: 'Axis Bank', statementDay: 8,  dueDay: 28, currency: 'INR' },
];

// ─── Bills ──────────────────────────────────────────────────────────────────────
// generationDay = day bill is generated / cycle starts
// dueDay        = day payment must be made
// amount null   = variable (electricity etc.)

export const BILLS = [
  { id: 'bill1', name: 'Airtel Postpaid',    country: 'IN', type: 'phone',     emoji: '📱', generationDay: 1,  dueDay: 15, amount: 799,  currency: 'INR' },
  { id: 'bill2', name: 'True Move H',        country: 'TH', type: 'phone',     emoji: '📱', generationDay: 10, dueDay: 25, amount: 699,  currency: 'THB' },
  { id: 'bill3', name: 'BESCOM Electricity', country: 'IN', type: 'utility',   emoji: '⚡', generationDay: 1,  dueDay: 20, amount: null, currency: 'INR' },
  { id: 'bill4', name: 'MEA Electricity',    country: 'TH', type: 'utility',   emoji: '⚡', generationDay: 15, dueDay: 30, amount: null, currency: 'THB' },
];
