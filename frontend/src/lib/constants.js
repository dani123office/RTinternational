export const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
  done: { label: 'Sale Complete', bg: '#d1fae5', color: '#065f46' },
  completed: { label: 'Completed', bg: '#d1fae5', color: '#065f46' },
  converted: { label: 'Converted', bg: '#dbeafe', color: '#1e40af' },
  saleinprogress: { label: 'In Progress', bg: '#ede9fe', color: '#5b21b6' },
  salecomplete: { label: 'Complete', bg: '#d1fae5', color: '#065f46' },
  chasing: { label: 'Chasing', bg: '#fef3c7', color: '#92400e' },
  cotinprogress: { label: 'COT In Progress', bg: '#dbeafe', color: '#1e40af' },
  cotcomplete: { label: 'COT Complete', bg: '#d1fae5', color: '#065f46' },
  saleInProgress: { label: 'In Progress', bg: '#ede9fe', color: '#5b21b6' },
  saleComplete: { label: 'Complete', bg: '#d1fae5', color: '#065f46' },
  cotInProgress: { label: 'COT In Progress', bg: '#dbeafe', color: '#1e40af' },
  cotComplete: { label: 'COT Complete', bg: '#d1fae5', color: '#065f46' },
  failed: { label: 'Failed', bg: '#fee2e2', color: '#991b1b' },
  overdue: { label: 'Overdue', bg: '#fce7f3', color: '#9d174d' },
  hold: { label: 'On Hold', bg: '#f3e8ff', color: '#6b21a8' },
  success: { label: 'Success', bg: '#d1fae5', color: '#065f46' },
  submitted: { label: 'Submitted', bg: '#e0e7ff', color: '#3730a3' },
  approved: { label: 'Approved', bg: '#d1fae5', color: '#065f46' },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b' },
  dispute: { label: 'Dispute', bg: '#fef3c7', color: '#92400e' },
};

export const COT_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'chasing', label: 'Chasing' },
  { key: 'cotInProgress', label: 'COT In Progress' },
  { key: 'cotComplete', label: 'COT Complete' },
];

export const UTILITY_OPTIONS = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'gas', label: 'Gas' },
  { value: 'both', label: 'Both' },
];

export const BUSINESS_TYPES = [
  { value: 'soleTrader', label: 'Sole Trader' },
  { value: 'partnership', label: 'Partnership' },
];

export const BILL_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

export const PAYMENT_METHODS = [
  { value: 'bankTransfer', label: 'Bank Transfer' },
  { value: 'directDebit', label: 'Direct Debit' },
  { value: 'bankDetails', label: 'Bank Details' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
];

export const CALLBACK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'done', label: 'Done' },
];

export const SALE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'chasing', label: 'Chasing' },
  { key: 'cotInProgress', label: 'COT In Progress' },
  { key: 'cotComplete', label: 'COT Complete' },
  { key: 'done', label: 'Sale Complete' },
];

export const SALE_TYPES = [
  { value: 'cot', label: 'COT (Change of Tenancy)' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'out_of_contract', label: 'Out of Contract' },
];

export const DEFAULT_ELEC_METER = {
  currentSupplier: '', supplyNumber: '', dayUnitRate: '',
  nightUnitRate: '', eveningUnitRate: '', standingRate: '',
  monthlyBill: '', contractEndDate: '',
};

export const DEFAULT_GAS_METER = {
  currentSupplier: '', mprn: '', unitRate: '', standingRate: '',
  monthlyBill: '', contractEndDate: '',
};

export const DEFAULT_COMMISSION = {
  dayUnitRate: '', nightUnitRate: '', eveningUnitRate: '', standingRate: '',
};

export const DEFAULT_NON_COMMISSION = {
  dayUnitRate: '', nightUnitRate: '', eveningUnitRate: '',
  standingRate: '', brokerServiceCharge: '',
};

export const DEFAULT_CALLBACK_FORM = {
  utilityType: 'electricity',
  businessName: '', businessAddress: '', businessPhone: '',
  ownerName: '', ownerPhone: '', email: '', postcode: '',
  notes: '', scheduledDate: '', scheduledTime: '10:00',
  elecMeters: [{ ...DEFAULT_ELEC_METER }],
  gasMeters: [{ ...DEFAULT_GAS_METER }],
  showOfferRates: false,
  elecCommission: { ...DEFAULT_COMMISSION },
  elecNonCommission: { ...DEFAULT_NON_COMMISSION },
  gasCommission: { dayUnitRate: '', standingRate: '' },
  gasNonCommission: { dayUnitRate: '', standingRate: '', brokerServiceCharge: '' },
  elecSupplier: '', gasSupplier: '',
  elecContractLength: '1 Year', gasContractLength: '1 Year',
  elecMeterType: 'Standard', elecCommissionType: 'Commission',
};

export const DEFAULT_TRANSFER_FORM = {
  ...DEFAULT_CALLBACK_FORM,
  accountNumber: '', mpan: '', mprn: '', msn: '',
  scheduleAsCallback: false,
};
