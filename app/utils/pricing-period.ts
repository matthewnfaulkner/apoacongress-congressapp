import { DateTime } from 'luxon';
import { dateStringToHumanStringBack } from './time-utils';

/**
 * When a charge's price applies, for the public pricing blocks
 * (PricingCard, ChargeTableRegistration).
 *
 * Comes from the charge's congress_pricing_periods row when it has one;
 * otherwise from the old `details[0]` cutoff (cutoff_description +
 * cutoff_date), kept as a fallback for charges not moved to periods yet.
 */
export type PriceWindow = {
	/** E.g. "Early bird until 31st December 2026". */
	label: string;
	/** Last day the price applies (yyyy-MM-dd), or null for no end. */
	endsOn: string | null;
	/** Period order; 0 when there's no period. */
	sort: number;
};

export function chargePriceWindow(charge: CongressCharge): PriceWindow | null {
	const period = charge.pricing_period;
	if (period && typeof period === 'object') {
		return {
			label: periodLabel(period),
			endsOn: period.ends_on ?? null,
			sort: period.sort ?? 0,
		};
	}

	const detail = Array.isArray(charge.details) ? (charge.details[0] as { cutoff_date?: string | null; cutoff_description?: string | null } | undefined) : undefined;
	if (detail?.cutoff_date) {
		return {
			label: `${detail.cutoff_description ?? ''} ${dateStringToHumanStringBack(detail.cutoff_date)}`.trim(),
			endsOn: detail.cutoff_date,
			sort: 0,
		};
	}

	return null;
}

/** True once the window's last day has passed (the last day itself still counts). */
export function priceWindowHasEnded(window: PriceWindow | null): boolean {
	if (!window?.endsOn) return false;
	return (DateTime.now().toISODate() ?? '') > window.endsOn;
}

function periodLabel(period: CongressPricingPeriod): string {
	if (period.ends_on) return `${period.name} until ${dateStringToHumanStringBack(period.ends_on)}`;
	if (period.starts_on) return `${period.name} from ${dateStringToHumanStringBack(period.starts_on)}`;
	return period.name;
}
