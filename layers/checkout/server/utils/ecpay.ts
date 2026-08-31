import { createHash } from 'crypto';

export const ECPAY_CHECKOUT_URL = {
	sandbox: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',
	production: 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5',
} as const;

// ECPay's CheckMacValue algorithm requires the URL-encoding to match .NET's
// UrlEncode exactly, which differs from encodeURIComponent for several
// characters — this is the single most common integration bug for ECPay, so
// it's isolated here rather than inlined. See ECPay's official examples
// (any language) for the same character-by-character remapping.
function ecpayUrlEncode(value: string): string {
	return encodeURIComponent(value)
		.toLowerCase()
		.replace(/%2d/g, '-')
		.replace(/%5f/g, '_')
		.replace(/%2e/g, '.')
		.replace(/%21/g, '!')
		.replace(/%2a/g, '*')
		.replace(/%28/g, '(')
		.replace(/%29/g, ')')
		.replace(/%20/g, '+');
}

/**
 * Computes ECPay's CheckMacValue for a set of params: sort keys ascending,
 * wrap with HashKey/HashIV, .NET-style URL-encode, lowercase, SHA256, uppercase.
 * Used both to sign outgoing checkout requests and to verify incoming
 * ReturnURL callbacks (same algorithm both directions).
 */
export function computeCheckMacValue(params: Record<string, string | number>, hashKey: string, hashIv: string): string {
	const sortedEntries = Object.entries(params)
		.filter(([key]) => key !== 'CheckMacValue')
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

	const raw = [`HashKey=${hashKey}`, ...sortedEntries.map(([key, value]) => `${key}=${value}`), `HashIV=${hashIv}`].join('&');

	const encoded = ecpayUrlEncode(raw);

	return createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

export function verifyCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): boolean {
	const { CheckMacValue, ...rest } = params;
	return !!CheckMacValue && computeCheckMacValue(rest, hashKey, hashIv) === CheckMacValue;
}

/** yyyy/MM/dd HH:mm:ss, the exact format ECPay's MerchantTradeDate requires. */
export function formatECPayDate(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** MerchantTradeNo must be unique per attempt, alphanumeric only, <=20 chars. */
export function generateMerchantTradeNo(): string {
	return `ECP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase().slice(0, 20);
}

let cachedUsdToTwdRate: { rate: number; fetchedAt: number } | null = null;
const RATE_CACHE_MS = 60 * 60 * 1000; // 1 hour — avoid hitting the FX API on every redirect

/**
 * Live USD->TWD rate via Frankfurter (ECB-backed, free, no API key). Throws
 * on failure — callers should fall back to a static configured rate rather
 * than let this silently produce a wrong charge amount.
 */
export async function getLiveUsdToTwdRate(): Promise<number> {
	if (cachedUsdToTwdRate && Date.now() - cachedUsdToTwdRate.fetchedAt < RATE_CACHE_MS) {
		return cachedUsdToTwdRate.rate;
	}

	const response = await $fetch<unknown>('https://api.frankfurter.dev/v2/rates', {
		query: { base: 'USD', quotes: 'TWD' },
	});

	if (!Array.isArray(response) || response.length === 0) {
		throw new Error('Frankfurter response was not a non-empty array');
	}

	const rate = response[0]?.rate;

	if (typeof rate !== 'number') {
		throw new Error('Frankfurter did not return a USD -> TWD rate');
	}

	cachedUsdToTwdRate = { rate, fetchedAt: Date.now() };

	return rate;
}
