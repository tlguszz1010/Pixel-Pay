declare module "@x402/fetch" {
  interface SchemeConfig {
    network: string;
    client: any;
    x402Version?: number;
  }

  interface PaymentConfig {
    schemes: SchemeConfig[];
    policies?: any[];
    paymentRequirementsSelector?: any;
  }

  export function wrapFetchWithPaymentFromConfig(
    fetch: typeof globalThis.fetch,
    config: PaymentConfig
  ): typeof globalThis.fetch;

  export function decodePaymentResponseHeader(header: string): any;
}

declare module "@x402/evm" {
  export class ExactEvmScheme {
    constructor(account: any);
  }
}
