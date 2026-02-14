import type { GalleryItem } from "./gallery-client";

/**
 * Decide which image to buy from the unsold list.
 * If ANTHROPIC_API_KEY is set, uses Claude to evaluate.
 * Otherwise, picks a random one.
 */
export async function evaluateAndPick(
  unsold: GalleryItem[]
): Promise<GalleryItem | null> {
  if (unsold.length === 0) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return pickWithClaude(unsold, apiKey);
  }

  // Fallback: random pick
  const idx = Math.floor(Math.random() * unsold.length);
  return unsold[idx];
}

async function pickWithClaude(
  unsold: GalleryItem[],
  apiKey: string
): Promise<GalleryItem | null> {
  try {
    const listing = unsold
      .map((item, i) => `${i}: "${item.prompt}" (price: ${item.price})`)
      .join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `You are an art collector AI. Pick the most interesting image to buy from this gallery listing. Reply with ONLY the index number.\n\n${listing}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.log("Claude API error, falling back to random pick");
      const idx = Math.floor(Math.random() * unsold.length);
      return unsold[idx];
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content?.[0]?.text?.trim() ?? "";
    const idx = parseInt(text, 10);

    if (isNaN(idx) || idx < 0 || idx >= unsold.length) {
      // Fallback: pick first
      return unsold[0];
    }
    return unsold[idx];
  } catch {
    // Fallback on any error
    const idx = Math.floor(Math.random() * unsold.length);
    return unsold[idx];
  }
}
