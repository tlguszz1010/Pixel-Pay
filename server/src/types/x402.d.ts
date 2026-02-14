// ── 서버 사이드 (index.ts에서 사용) ──────────────────────

declare module "@x402/express" {
  import { RequestHandler } from "express";

  export class x402ResourceServer {
    constructor(facilitatorClient: any);
    register(chainId: string, scheme: any): x402ResourceServer;
  }

  export function paymentMiddleware(
    routes: Record<string, unknown>,
    server: x402ResourceServer,
    paywallConfig?: Record<string, unknown>,
    paywall?: unknown,
    syncFacilitatorOnStart?: boolean
  ): RequestHandler;
}

declare module "@x402/core/server" {
  export class HTTPFacilitatorClient {
    constructor(config: { url: string; createAuthHeaders?: () => Promise<any> });
  }
}

declare module "@x402/evm/exact/server" {
  export class ExactEvmScheme {
    registerMoneyParser(
      parser: (amount: number, network: string) => Promise<{ amount: string; asset: string; extra?: Record<string, unknown> } | null>
    ): ExactEvmScheme;
  }
}

// ── 클라이언트 사이드 (test-client.ts에서 사용) ──────────

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
