export const required = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

export const isEmail = (value) => {
  if (!value) return null;
  return /\S+@\S+\.\S+/.test(value) ? null : 'Invalid email address';
};

export const minLength = (value, min, fieldName) => {
  if (value && value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
};

export const isValidPhone = (value) => {
  if (!value) return null;
  return /^[\d\s\-+()]{7,20}$/.test(value) ? null : 'Invalid phone number';
};

export const isValidPostcode = (value) => {
  if (!value) return null;
  return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(value) ? null : 'Invalid UK postcode';
};

export const isValidSortCode = (value) => {
  if (!value) return null;
  return /^\d{2}-\d{2}-\d{2}$/.test(value) ? null : 'Invalid sort code (use format: 12-34-56)';
};

export const isValidBankAccount = (value) => {
  if (!value) return null;
  return /^\d{8}$/.test(value.replace(/\s/g, '')) ? null : 'Invalid account number (8 digits)';
};

export const validateCallbackForm = (form) => {
  return required(form.businessName, 'Business name');
};

export const validateTransferForm = (form) => {
  const errors = [];
  const nameErr = required(form.businessName, 'Business name');
  if (nameErr) errors.push(nameErr);
  const phoneErr = required(form.businessPhone, 'Business phone');
  if (phoneErr) errors.push(phoneErr);
  return errors.length > 0 ? errors.join('; ') : null;
};

export const validateSaleForm = (form) => {
  const errors = [];
  if (!form.ownerFullName?.trim()) errors.push('Owner name is required');
  if (!form.dateOfBirth) errors.push('Date of birth is required');
  if (!form.homeAddress?.trim()) errors.push('Home address is required');
  return errors.length > 0 ? errors.join('; ') : null;
};
