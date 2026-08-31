/**
 * Whether Ticket Tailor's API is currently reachable — see
 * checkTicketTailorHealth in ticket-tailor.ts for the actual ping + cache.
 * Polled by the frontend to disable checkout with a clear message instead of
 * letting a customer fill out the whole flow and only find out at the final
 * "create bundle" step (bundle.post.ts) that it was never going to work.
 */
export default defineEventHandler(async () => {
	return { available: await checkTicketTailorHealth() };
});
