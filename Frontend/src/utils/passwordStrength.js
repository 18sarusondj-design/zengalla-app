/**
 * Evaluates the strength of a password based on basic requirements:
 * - Minimum 8 characters
 * - At least 1 Uppercase letter
 * - At least 1 Number
 */
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'Weak', isValid: false };
  
  const requirements = {
    length: password.length >= 7,
    hasNumber: /[0-9]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const isSatisfied = requirements.length && requirements.hasNumber;

  let score = 0;
  if (isSatisfied) {
    if (requirements.hasSpecial && requirements.hasUpper && password.length >= 10) {
      score = 4; // Excellent
    } else if (requirements.hasUpper || requirements.hasSpecial) {
      score = 3; // Strong
    } else {
      score = 2; // Medium (Acceptable)
    }
  } else {
    score = password.length >= 4 ? 1 : 0;
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
