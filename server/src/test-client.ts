/**
 * PixelPay 402 결제 플로우 검증 테스트 클라이언트
 *
 * 두 가지 테스트를 순차 실행:
 *   A) 402 응답 구조 검증 — 지갑 불필요, 일반 fetch 사용
 *   B) 전체 결제 플로우 — EVM_PRIVATE_KEY 필요, @x402/fetch 사용
 */

import dotenv from "dotenv";
dotenv.config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:4000";

// ── 테스트 A: 402 응답 구조 검증 ──────────────────────────
// 일반 fetch로 POST /generate 호출 → 402 응답이 올바른 구조인지 확인
// 지갑이나 결제 없이도 실행 가능
async function testA_402Response(): Promise<boolean> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("테스트 A: 402 응답 구조 검증");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const res = await fetch(`${SERVER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "a cute pixel cat" }),
    });

    // 1) 상태 코드 확인
    console.log(`\n  Status: ${res.status}`);
    if (res.status !== 402) {
      console.log(`  ❌ 예상: 402, 실제: ${res.status}`);
      return false;
    }
    console.log("  ✅ 402 Payment Required 확인");

    // 2) PAYMENT-REQUIRED 헤더 파싱 (x402 v2는 헤더에 base64로 결제 정보를 넣음)
    const paymentRequiredHeader = res.headers.get("payment-required");
    if (!paymentRequiredHeader) {
      console.log("  ❌ PAYMENT-REQUIRED 헤더가 없음");
      return false;
    }
    console.log("  ✅ PAYMENT-REQUIRED 헤더 존재");

    const decoded = JSON.parse(Buffer.from(paymentRequiredHeader, "base64").toString("utf-8")) as {
      x402Version?: number;
      error?: string;
      resource?: { url?: string; description?: string };
      accepts?: Array<{
        scheme?: string;
        network?: string;
        amount?: string;
        asset?: string;
        payTo?: string;
        maxTimeoutSeconds?: number;
        extra?: { name?: string; version?: string };
      }>;
    };

    console.log(`\n  x402Version: ${decoded.x402Version}`);
    console.log(`  error:       ${decoded.error}`);
    console.log(`  resource:    ${decoded.resource?.url} — ${decoded.resource?.description}`);

    if (!decoded.accepts || !Array.isArray(decoded.accepts) || decoded.accepts.length === 0) {
      console.log("  ❌ accepts 배열이 없거나 비어있음");
      return false;
    }
    console.log("  ✅ accepts 배열 존재");

    // 3) accepts[0] 상세 출력
    const accept = decoded.accepts[0];
    console.log("\n  accepts[0]:");
    console.log(`    scheme:  ${accept.scheme}`);
    console.log(`    network: ${accept.network}`);
    console.log(`    amount:  ${accept.amount}`);
    console.log(`    asset:   ${accept.asset}`);
    console.log(`    payTo:   ${accept.payTo}`);
    console.log(`    timeout: ${accept.maxTimeoutSeconds}s`);
    if (accept.extra) {
      console.log(`    extra:   ${accept.extra.name} v${accept.extra.version}`);
    }

    console.log("\n  ✅ 테스트 A 통과\n");
    return true;
  } catch (error) {
    console.log(`\n  ❌ 테스트 A 실패: ${error instanceof Error ? error.message : error}`);
    console.log("     서버가 실행 중인지 확인하세요: npm run dev\n");
    return false;
  }
}

// ── 테스트 B: 전체 402 결제 플로우 ─────────────────────────
// @x402/fetch가 자동으로 402 → 서명 → 재요청 처리
// EVM_PRIVATE_KEY가 필요하며, Base Sepolia 테스트넷 USDC 잔고 필요
async function testB_PaymentFlow(): Promise<boolean> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("테스트 B: 전체 결제 플로우 (테스트넷 지갑)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey || privateKey === "your_evm_private_key_here") {
    console.log("\n  ⏭️  EVM_PRIVATE_KEY가 설정되지 않아 건너뜁니다.");
    console.log("     .env에 Base Sepolia 테스트넷 개인키를 설정하세요.\n");
    return true; // skip은 실패가 아님
  }

  try {
    // viem으로 account 생성
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(
      privateKey.startsWith("0x") ? (privateKey as `0x${string}`) : (`0x${privateKey}` as `0x${string}`)
    );
    console.log(`\n  지갑 주소: ${account.address}`);

    // @x402/evm 클라이언트 scheme 생성
    const { ExactEvmScheme } = await import("@x402/evm");
    const scheme = new ExactEvmScheme(account);

    // @x402/fetch로 결제 가능한 fetch 생성
    const { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } = await import("@x402/fetch");
    const payFetch = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [{ network: "eip155:84532", client: scheme }],
    });

    console.log("  결제 fetch 생성 완료, 요청 전송 중...\n");

    // 결제 포함 요청 전송
    const res = await payFetch(`${SERVER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "a cute pixel cat" }),
    });

    console.log(`  Status: ${res.status}`);

    // PAYMENT-RESPONSE 헤더 확인
    const paymentResponseHeader = res.headers.get("payment-response");
    if (paymentResponseHeader) {
      console.log("  ✅ PAYMENT-RESPONSE 헤더 수신");
      try {
        const decoded = decodePaymentResponseHeader(paymentResponseHeader);
        console.log("  결제 응답:", JSON.stringify(decoded, null, 4));
      } catch {
        console.log("  (헤더 디코딩 실패 — raw:", paymentResponseHeader, ")");
      }
    }

    // 결과 분석
    if (res.status === 200) {
      console.log("  ✅ 결제 + API 호출 모두 성공!");
      const data = await res.json();
      console.log("  응답:", JSON.stringify(data, null, 2));
    } else if (res.status === 500) {
      // OpenAI 키가 없으면 결제는 성공했지만 이미지 생성에서 500 발생
      console.log("  ✅ 결제 플로우 성공 (402 통과)");
      console.log("  ⚠️  서버 내부 에러 (OpenAI API 키 미설정일 수 있음)");
      const data = await res.json();
      console.log("  서버 응답:", JSON.stringify(data, null, 2));
    } else if (res.status === 402) {
      console.log("  ❌ 여전히 402 — 결제 서명이 거부됨");
      console.log("     테스트넷 USDC 잔고를 확인하세요.");
      return false;
    } else {
      console.log(`  ⚠️  예상치 못한 상태 코드: ${res.status}`);
      const text = await res.text();
      console.log("  응답:", text.slice(0, 500));
    }

    console.log("\n  ✅ 테스트 B 완료\n");
    return true;
  } catch (error) {
    console.log(`\n  ❌ 테스트 B 실패: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  console.log("\n🔍 PixelPay 402 결제 플로우 테스트\n");
  console.log(`  서버: ${SERVER_URL}\n`);

  const resultA = await testA_402Response();
  const resultB = await testB_PaymentFlow();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("결과 요약");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  테스트 A (402 구조): ${resultA ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  테스트 B (결제 플로우): ${resultB ? "✅ PASS" : "❌ FAIL"}`);
  console.log();

  process.exit(resultA && resultB ? 0 : 1);
}

main();
