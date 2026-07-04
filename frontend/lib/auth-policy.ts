const JWT_SECRET_MIN_LENGTH = 32;
const JWT_SECRET_PLACEHOLDERS = [
  "change-this-to-a-secure-random-string",
  "opanel-default-secret-change-me",
];

/** Registration is only allowed for the first-run bootstrap (empty user table). */
export function canRegister(userCount: number): boolean {
  return userCount === 0;
}

/** Throws a fatal, descriptive error if the JWT secret is unset, too short, or a known placeholder. */
export function assertValidJwtSecret(value: string | undefined): asserts value is string {
  if(!value) {
    throw new Error(
      "JWT_SECRET environment variable is not set. Generate a secure value with: openssl rand -base64 48"
    );
  }
  if(JWT_SECRET_PLACEHOLDERS.includes(value)) {
    throw new Error(
      "JWT_SECRET is set to a known placeholder value. Generate a secure value with: openssl rand -base64 48"
    );
  }
  if(value.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters long. Generate a secure value with: openssl rand -base64 48`
    );
  }
}
