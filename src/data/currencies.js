// Master currency list for Settings → Profile → Currencies and the Finance tab.
// Users pick their own subset in Settings; anything not listed here can still be
// added as a free-typed 3-letter ISO code (see CurrencyPicker).
export const CURRENCIES = [
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',        flag: '🇮🇳' },
  { code: 'THB', symbol: '฿',   name: 'Thai Baht',           flag: '🇹🇭' },
  { code: 'USD', symbol: '$',   name: 'US Dollar',           flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   name: 'Euro',                flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',       flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',        flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',        flag: '🇨🇳' },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',    flag: '🇸🇬' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',          flag: '🇦🇪' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',   flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',     flag: '🇨🇦' },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc',         flag: '🇨🇭' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',    flag: '🇭🇰' },
  { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit',   flag: '🇲🇾' },
  { code: 'IDR', symbol: 'Rp',  name: 'Indonesian Rupiah',   flag: '🇮🇩' },
  { code: 'VND', symbol: '₫',   name: 'Vietnamese Dong',     flag: '🇻🇳' },
  { code: 'PHP', symbol: '₱',   name: 'Philippine Peso',     flag: '🇵🇭' },
  { code: 'KRW', symbol: '₩',   name: 'South Korean Won',    flag: '🇰🇷' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar',  flag: '🇳🇿' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand',  flag: '🇿🇦' },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal',         flag: '🇸🇦' },
  { code: 'QAR', symbol: '﷼',   name: 'Qatari Riyal',        flag: '🇶🇦' },
  { code: 'NPR', symbol: '₨',   name: 'Nepalese Rupee',      flag: '🇳🇵' },
  { code: 'LKR', symbol: '₨',   name: 'Sri Lankan Rupee',    flag: '🇱🇰' },
  { code: 'BDT', symbol: '৳',   name: 'Bangladeshi Taka',    flag: '🇧🇩' },
  { code: 'PKR', symbol: '₨',   name: 'Pakistani Rupee',     flag: '🇵🇰' },
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',       flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',     flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr',  name: 'Danish Krone',        flag: '🇩🇰' },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',      flag: '🇧🇷' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',        flag: '🇲🇽' },
];

export const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map(c => [c.code, c]));
export const DEFAULT_CURRENCIES = ['INR', 'THB', 'USD'];

export function currencySymbol(code) {
  return CURRENCY_MAP[code]?.symbol || code || '';
}
export function currencyFlag(code) {
  return CURRENCY_MAP[code]?.flag || '🌐';
}
export function currencyName(code) {
  return CURRENCY_MAP[code]?.name || code || '';
}
