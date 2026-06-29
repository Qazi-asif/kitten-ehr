import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pawsitive-dev-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
