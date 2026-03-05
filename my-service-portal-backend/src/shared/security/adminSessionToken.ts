import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AdminSessionPayload {
  uid: string;
  email: string;
  role: 'admin';
  iat: number;
  exp: number;
}

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (payloadPart: string, secret: string) => {
  return createHmac('sha256', secret).update(payloadPart).digest('base64url');
};

export const createAdminSessionToken = (payload: AdminSessionPayload, secret: string) => {
  const payloadPart = encode(JSON.stringify(payload));
  const signature = sign(payloadPart, secret);
  return `${payloadPart}.${signature}`;
};

export const verifyAdminSessionToken = (token: string, secret: string): AdminSessionPayload | null => {
  const [payloadPart, signature] = token.split('.');

  if (!payloadPart || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadPart, secret);
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(payloadPart)) as Partial<AdminSessionPayload>;

    if (
      typeof parsed.uid !== 'string' ||
      typeof parsed.email !== 'string' ||
      parsed.role !== 'admin' ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) {
      return null;
    }

    return parsed as AdminSessionPayload;
  } catch {
    return null;
  }
};

