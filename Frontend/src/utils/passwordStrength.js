/**
 * Evaluates the strength of a password based on basic requirements:
 * - Minimum 8 characters
 * - At least 1 Uppercase letter
 * - At least 1 Number
 */
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'Weak', isValid: false };
  
  const requirements = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasLower: /[a-z]/.test(password),
  };

  const isSatisfied = requirements.length && requirements.hasUpper && requirements.hasNumber;

  let score = 0;
  if (isSatisfied) {
    if (requirements.hasLower && password.length >= 10) {
      score = 4; // Excellent
    } else if (requirements.hasLower) {
      score = 3; // Strong
    } else {
      score = 2; // Medium (Acceptable)
    }
  } else {
    score = password.length > 4 ? 1 : 0;
  }

  const labels = ['Weak', 'Weak', 'Medium', 'Strong', 'Excellent'];
  
  return {
    score,
    label: labels[score],
    isValid: isSatisfied,
    requirements
  };
};

export const isPasswordAcceptable = (password) => {
  return getPasswordStrength(password).isValid;
};
