import type { H3Event } from 'h3';
import type { ECPayReturnPayload } from '../../../../app/types/ecpay';

/**
 * ECPay's server-to-server callback (ReturnURL) — not customer-facing. This
 * is the actual source of truth that payment succeeded; the customer's
 * browser landing on /checkout/ecpay/complete is a separate, unreliable
 * signal (they might close the tab, lose connectivity, etc).
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();

	if (!config.ecpayHashKey || !config.ecpayHashIv) {
		throw createError({ statusCode: 500, statusMessage: 'ECPay is not configured' });
	}

	const payload = await readBody<ECPayReturnPayload>(event);

	if (!payload || !verifyCheckMacValue(payload as unknown as Record<string, string>, config.ecpayHashKey as string, config.ecpayHashIv as string)) {
		// Don't acknowledge with "1|OK" for an unverified payload — a forged
		// callback must never be able to mark an order as paid.
		throw createError({ statusCode: 400, statusMessage: 'Invalid CheckMacValue' });
	}

	const orderId = payload.CustomField1;

	if (payload.RtnCode === '1' && orderId) {
		// No scoped key actually covers this — it's an order WRITE, not a read,
		// but 'orderRead' is the only order-related capability we have. Flagged
		// for confirmation: this will 401/403 if that key is truly read-only on
		// Ticket Tailor's side.
		await ticketTailorFetch(`/orders/${orderId}/confirm-payment-received`, 'orderRead', {
			method: 'POST',
			body: new URLSearchParams({ transaction_id: payload.TradeNo }),
		});
	}

	// ECPay requires this exact plaintext response — anything else is treated
	// as a failed delivery and the callback gets retried repeatedly.
	setResponseHeader(event, 'Content-Type', 'text/plain');
	return '1|OK';
});
