const emailPattern = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export function isAllowedLoginEmail(
  email: string,
  configuredEmails = process.env.ALLOWED_LOGIN_EMAILS,
  production = process.env.NODE_ENV === "production" && process.env.NEON_BRANCH !== "dev/blackfruit",
): boolean {
  if (!configuredEmails?.trim()) return !production;

  const emails = configuredEmails.split(",").map((value) => value.trim().toLowerCase());
  if (emails.length !== 2 || new Set(emails).size !== 2 || emails.some((value) => !emailPattern.test(value))) {
    return false;
  }

  return emails.includes(email.trim().toLowerCase());
}
