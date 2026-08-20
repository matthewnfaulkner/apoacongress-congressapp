import type { H3Event } from 'h3';
import type { TTOrder } from '../../../app/types/ticket-tailor';

/** Minimal, PII-free order summary for order-complete.vue to display. */
export default defineEventHandler(async (event: H3Event) => {
	const orderId = getQuery(event).tt_order_id;

	if (typeof orderId !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'tt_order_id is required' });
	}

	try {
		const order = await ticketTailorFetch<TTOrder>(`/orders/${orderId}`, 'orderRead');

		return {
			id: order.id,
			status: order.status,
			total: order.total_paid,
			currency: order.currency.code,
		};
	} catch {
		throw createError({ statusCode: 404, statusMessage: `Order ${orderId} not found` });
	}
});
