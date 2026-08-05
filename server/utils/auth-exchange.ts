import { createHmac, timingSafeEqual } from 'crypto';

interface ExchangePayload {
	access_token: string;
	refresh_token: string;
	expires: number;
	exp: number;
}

export interface AuthTokens {
	access_token: string;
	refresh_token: string;
	expires: number;
}

export function createExchangeToken(tokens: AuthTokens, secret: string): string {
	const data = Buffer.from(JSON.stringify({
		...tokens,
		exp: Date.now() + 60_000,
	})).toString('base64url');

	const sig = createHmac('sha256', secret).update(data).digest('base64url');
	return `${data}.${sig}`;
}

export function verifyExchangeToken(token: string, secret: string): AuthTokens {
	const dotIndex = token.lastIndexOf('.');
	if (dotIndex === -1) throw new Error('Invalid token format');

	const data = token.slice(0, dotIndex);
	const sig = token.slice(dotIndex + 1);

	const expectedSig = createHmac('sha256', secret).update(data).digest('base64url');

	if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expectedSig, 'base64url'))) {
		throw new Error('Invalid token signature');
	}

	const payload: ExchangePayload = JSON.parse(Buffer.from(data, 'base64url').toString());

	if (payload.exp < Date.now()) throw new Error('Token expired');

	const { exp, ...tokens } = payload;
	return tokens;
}
