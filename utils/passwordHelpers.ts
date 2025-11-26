export async function validatePassword(password: string): Promise<{message: string, valid: boolean}> {
  if (password.length < 8) {
    return { message: 'Password must be at least 8 characters long.', valid: false };
  }
  if (!/[A-Z]/.test(password)) {
    return { message: 'Password must contain at least one uppercase letter.', valid: false };
  }
  if (!/[a-z]/.test(password)) {
    return { message: 'Password must contain at least one lowercase letter.', valid: false };
  }
  if (!/[0-9]/.test(password)) {
    return { message: 'Password must contain at least one digit.', valid: false };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { message: 'Password must contain at least one special character.', valid: false };
  }
  return { message: 'valid', valid: true };
}
