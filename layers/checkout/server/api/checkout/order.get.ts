import type { H3Event } from 'h3'

/**
 * Checks whether `orderId` refers to a `congress_orders` row the logged-in
 * customer owns. Ownership is enforced entirely by Directus's own permissions
 * for this request's session token — this route does no ownership comparison
 * of its own — so the `congress_orders` read policy MUST be restricted to
 * `user_created == $CURRENT_USER` for the relevant role, otherwise any
 * logged-in user could probe arbitrary order ids.
 */
export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const orderId = typeof query.orderId === 'string' ? query.orderId : null

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'orderId is required' })
  }

  const cookies = parseCookies(event);
	// Production: access token sent as Authorization: Bearer header (localStorage-based json auth)
	// Sandbox: session token in cookie (cookie-based session auth)
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = cookies[config.sessionTokenName as string] || null;
	const userToken = bearerToken ?? sessionToken;



  if (!userToken) {
    return { valid: true }
  }

  try {
    // `congress_orders` doesn't exist in the generated schema yet — cast until
    // it's created in Directus and `npm run generate:types` picks it up.
    await directusServer.request(withToken(userToken, readItem('congress_orders' as any, orderId, { fields: ['id'] })))
    return { valid: true }
  } catch {
    return { valid: false }
  }
})
