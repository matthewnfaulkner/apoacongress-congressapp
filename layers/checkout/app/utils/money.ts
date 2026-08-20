export function formatMoney(cents: number, currency: string, options: { showCode?: boolean } = {}): string {
  const { showCode = true } = options
  const code = currency.toUpperCase()
  const isWholeAmount = cents % 100 === 0

  const amount = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code,
    // Without this, Intl renders USD as "US$" in locales where "$" alone is
    // ambiguous — we already append the code separately, so force the plain symbol.
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: isWholeAmount ? 0 : 2,
  }).format(cents / 100)

  return showCode ? `${amount} ${code}` : amount
}

/**
 * A rough NT$ estimate for national-locality customers, using the same rate
 * ECPay actually charges at (NUXT_PUBLIC config, mirrors ECPAY_TWD_EXCHANGE_RATE).
 * Returns null when the rate isn't configured, so callers can gracefully omit it.
 */
export function formatDomesticEstimate(cents: number): string | null {
  const rate = Number(useRuntimeConfig().public.ecpayTwdExchangeRate)
  if (!rate) return null

  const twd = Math.round((cents / 100) * rate)
  return `NT$${twd.toLocaleString()}`
}

/**
 * formatMoney, plus a "(≈ NT$X)" domestic estimate appended for national-
 * locality customers — the actual charged currency/amount is unaffected,
 * this is display-only.
 */
export function formatMoneyLocalized(
  cents: number,
  currency: string,
  locality: 'national' | 'international',
  options: { showCode?: boolean } = {},
): string {
  const primary = formatMoney(cents, currency, options)
  if (locality !== 'national') return primary

  const domestic = formatDomesticEstimate(cents)
  return domestic ? `${primary} (≈ ${domestic})` : primary
}
