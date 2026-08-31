// Fields ECPay's AioCheckOut/V5 requires (subset actually used here — see
// https://developers.ecpay.com.tw for the full field list). Sent as
// application/x-www-form-urlencoded via an auto-submitting HTML form, not a
// plain redirect — ECPay's checkout doesn't support GET with these params.
export interface ECPayCheckoutParams {
	MerchantID: string;
	MerchantTradeNo: string;
	MerchantTradeDate: string;
	PaymentType: 'aio';
	TotalAmount: number;
	TradeDesc: string;
	ItemName: string;
	ReturnURL: string;
	ChoosePayment: string;
	ClientBackURL?: string;
	EncryptType: 1;
	CustomField1?: string;
}

// Fields ECPay POSTs back to ReturnURL after payment (subset used here).
export interface ECPayReturnPayload {
	MerchantID: string;
	MerchantTradeNo: string;
	RtnCode: string;
	RtnMsg: string;
	TradeNo: string;
	TradeAmt: string;
	PaymentDate: string;
	PaymentType: string;
	CustomField1?: string;
	CheckMacValue: string;
	[key: string]: string | undefined;
}
