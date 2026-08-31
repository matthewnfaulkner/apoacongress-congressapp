import type { BasketLine, CheckoutEvent } from '../types/checkout'
import { useCheckoutBasketStore } from '../stores/checkout-basket'
import { checkoutEventOptions } from '../utils/checkout-options'

export function useCheckoutBasket() {
  const store = useCheckoutBasketStore()

  function basketTotal(checkoutEvent: CheckoutEvent | null | undefined) {
    const options = checkoutEventOptions(checkoutEvent)

    return store.lines.reduce((sum: number, line: BasketLine) => {
      const option = options.find((candidate) => candidate.id === line.ticketTypeId)
      return option ? sum + (option.price + option.bookingFee) * line.quantity : sum
    }, 0)
  }

  return {
    store,
    quantityFor: store.quantityFor,
    setQuantity: store.setQuantity,
    totalQuantity: computed(() => store.totalQuantity),
    isEmpty: computed(() => store.isEmpty),
    basketTotal,
  }
}
