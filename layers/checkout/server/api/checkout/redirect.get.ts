import type { H3Event } from 'h3';
import type { TTOrder } from '../../../app/types/ticket-tailor';
import type { ECPayCheckoutParams } from '../../../app/types/ecpay';

/**
 * Ticket Tailor only supports ONE order-redirect URL for the whole box
 * office, shared by every payment method — Stripe, PayPal, and every offline
 * profile (ECPay included) all land here, whether they're already paid or
 * still awaiting payment. So this route branches: an ECPay order still
 * awaiting payment gets handed off to ECPay's gateway via an auto-submitting
 * form (ECPay's checkout requires POST, not a redirect); everything else —
 * other payment methods, or any order that isn't in that specific pending
 * ECPay state — just gets sent to the shared order-complete page instead.
 * The order is always re-fetched from Ticket Tailor fresh (never trusts the
 * query string's amount — a browser redirect isn't a secure channel).
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const query = getQuery(event);
	const rawOrderId = typeof query.tt_order_id === 'string' ? query.tt_order_id : null;

	if (!rawOrderId) {
		throw createError({ statusCode: 400, statusMessage: 'tt_order_id is required' });
	}

	// Ticket Tailor's own redirect strips the "or_" prefix off tt_order_id
	// (confirmed empirically — every other order id in this codebase,
	// including Ticket Tailor's own API responses, carries it), so it's
	// reconstructed here once rather than every downstream consumer having to
	// know about the discrepancy.
	const orderId = rawOrderId.startsWith('or_') ? rawOrderId : `or_${rawOrderId}`;

	const order = await getTicketTailorOrder(orderId);

	// Linking the order to its owning user (via the congress_order_owners
	// claim bundle.post.ts writes at bundle-creation time) now happens in the
	// Ticket Tailor webhook flow itself, not here — it already has the
	// order's line_items and creates the congress_orders row in the first
	// place, so it can set `user` directly instead of this route doing a
	// separate, racy follow-up update.

	const paymentMethodName = order.payment_method?.name?.replace(/\s+/g, '').toLowerCase();
	const isEcpayPending =
		order.status === 'pending' && paymentMethodName === 'ecpay' && order.payment_method?.type === 'offline';

	if (!isEcpayPending) {
		// tt_order_id carries straight through so the confirmation page looks up
		// this exact order (ownership-checked against the logged-in user server
		// side) rather than guessing "whichever order is newest" — order-
		// complete.vue stays reserved for ECPay's own ClientBackURL, which
		// carries no Ticket Tailor order data at all.
		return sendRedirect(event, `/checkout/confirmation?tt_order_id=${encodeURIComponent(orderId)}`, 302);
	}

	if (!config.ecpayMerchantId || !config.ecpayHashKey || !config.ecpayHashIv) {
		throw createError({ statusCode: 500, statusMessage: 'ECPay is not configured' });
	}

	let exchangeRate: number;
	try {
		exchangeRate = await getLiveUsdToTwdRate();
	} catch {
		// Live FX lookup failed (API down/network issue) — fall back to the
		// static configured rate rather than hard-failing checkout entirely.
		// Deliberately not defaulted further than that: ECPay's TotalAmount is
		// TWD with no subunits, and silently guessing a rate would misprice a
		// real payment.
		const fallbackRate = Number(config.public.ecpayTwdExchangeRate);
		if (!fallbackRate) {
			throw createError({
				statusCode: 502,
				statusMessage: 'Could not get a live USD to TWD exchange rate, and no fallback rate is configured',
			});
		}
		exchangeRate = fallbackRate;
	}

	const totalAmountTwd = Math.round((order.total / 100) * exchangeRate);

	const merchantTradeNo = generateMerchantTradeNo();
	const siteUrl = (config.public.siteUrl as string).replace(/\/$/, '');

	const fields: Record<string, string | number> = {
		MerchantID: config.ecpayMerchantId as string,
		MerchantTradeNo: merchantTradeNo,
		MerchantTradeDate: formatECPayDate(new Date()),
		PaymentType: 'aio',
		TotalAmount: totalAmountTwd,
		TradeDesc: 'APOA 2027 order payment',
		ItemName: `Order ${order.id}`,
		ReturnURL: `${siteUrl}/api/checkout/ecpay/return`,
		ChoosePayment: 'ALL',
		ClientBackURL: `${siteUrl}/checkout/order-complete`,
		EncryptType: 1,
		CustomField1: order.id,
	} satisfies ECPayCheckoutParams;

	const checkMacValue = computeCheckMacValue(fields, config.ecpayHashKey as string, config.ecpayHashIv as string);

	const checkoutUrl = ECPAY_CHECKOUT_URL[config.ecpayEnv === 'production' ? 'production' : 'sandbox'];

	const inputs = Object.entries({ ...fields, CheckMacValue: checkMacValue })
		.map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(String(value))}">`)
		.join('\n');

	setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');

	return `<!doctype html>
<html>
<body>
<form id="ecpay-form" method="POST" action="${checkoutUrl}" target="_top">
${inputs}
</form>
<script>document.getElementById('ecpay-form').submit();</script>
</body>
</html>`;
});

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function getTicketTailorOrder(orderId: string): Promise<TTOrder> {
	try {
		return await ticketTailorFetch<TTOrder>(`/orders/${orderId}`, 'orderRead');
	} catch {
		throw createError({ statusCode: 404, statusMessage: `Order ${orderId} not found` });
	}
}
