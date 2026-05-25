export const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
};

export const formatCurrency = (value, symbol = '\u00a3') => {
  const n = safeNumber(value);
  return n !== null ? `${symbol}${n.toFixed(2)}` : null;
};

export const formatRate = (value, suffix = 'p/kWh') => {
  const n = safeNumber(value);
  return n !== null ? `${n.toFixed(2)}${suffix}` : null;
};

export const formatDate = (value, locale = 'en-GB') => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateFull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : `${formatDate(value)} ${formatTime(value)}`;
};

export const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

export const toISODateTime = (dateStr, timeStr = '10:00') => {
  if (!dateStr) return null;
  return `${dateStr}T${timeStr}:00`;
};

export const formatCapitalized = (str) => {
  if (!str) return '';
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
};

export const extractName = (customer) => {
  return customer?.businessName || customer?.ownerName || 'Unknown';
};

export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const MONEY = (val) => formatCurrency(val);
export const RATE = (val) => formatRate(val);

export const formatOwnerName = (name) => {
  if (!name) return 'No Contact Name';
  let cleaned = name.trim().replace(/\s+/g, ' ');
  if (/^(n\/a|na|none)$/i.test(cleaned)) {
    return 'No Contact Name';
  }
  const prefixMatch = cleaned.match(/^(mrs?|ms|dr)\.?\s*(.*)$/i);
  if (prefixMatch) {
    let prefix = prefixMatch[1].toLowerCase();
    let rest = prefixMatch[2];
    if (prefix === 'mr') prefix = 'Mr.';
    else if (prefix === 'mrs') prefix = 'Mrs.';
    else if (prefix === 'ms') prefix = 'Ms.';
    else if (prefix === 'dr') prefix = 'Dr.';
    rest = rest.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return `${prefix} ${rest}`.trim();
  }
  return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};
