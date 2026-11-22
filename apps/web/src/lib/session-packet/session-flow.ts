import { readingRatios, sessionSteps, type ClientEvent, type SessionPacket, type SessionStep } from "@dailylingua/schemas";

type Card = SessionPacket["cards"][number];
type Item = SessionPacket["items"][number];
type Text = NonNullable<SessionPacket["text"]>;

export type SessionScreen =
  | { key: string; step: "wake"; kind: "card"; card: Card }
  | { key: string; step: "reading" | "workshop"; kind: "item"; item: Item }
  | { key: string; step: "reading"; kind: "text"; text: Text }
  | { key: string; step: "expression"; kind: "write"; text: Text }
  | { key: string; step: "momentum"; kind: "reread"; text: Text }
  | { key: string; step: "review"; kind: "summary" };

export function sessionScreens(packet: SessionPacket): SessionScreen[] {
  // Older packets contained the upcoming cards as well. Never treat those as due.
  const wakeIds = new Set(packet.wakeCardIds ?? packet.cards
    .filter((card) => card.state !== "new" && Date.parse(card.dueAt) <= Date.parse(packet.session.servedAt))
    .map((card) => card.id));
  const screens: SessionScreen[] = packet.cards
    .filter((card) => wakeIds.has(card.id))
    .map((card) => ({ key: card.id, step: "wake", kind: "card", card }));
  const { text } = packet;
  const hasStep = (step: SessionStep) => packet.steps.some((entry) => entry.step === step);
  if (text && hasStep("reading")) {
    screens.push({ key: "text", step: "reading", kind: "text", text });
    for (const item of packet.items.filter((item) => item.step === "reading")) {
      screens.push({ key: item.id, step: "reading", kind: "item", item });
    }
  }
  if (text && hasStep("workshop")) {
    for (const item of packet.items.filter((item) => item.step === "workshop")) {
      screens.push({ key: item.id, step: "workshop", kind: "item", item });
    }
  }
  if (text && hasStep("expression")) screens.push({ key: "write", step: "expression", kind: "write", text });
  if (text && hasStep("momentum")) screens.push({ key: "reread", step: "momentum", kind: "reread", text });
  screens.push({ key: "summary", step: "review", kind: "summary" });
  return screens;
}

export const stepNumber = (step: SessionStep) => sessionSteps.indexOf(step) + 1;

export type SessionEvent = ClientEvent extends infer Event
  ? Event extends ClientEvent
    ? { kind: Event["kind"]; payload: Omit<Event["payload"], "tz" | "deviceId" | "seq"> }
    : never
  : never;

export function readingEvent(sessionId: string, textId: string, ratio: (typeof readingRatios)[number]): SessionEvent {
  return { kind: "reading_progress", payload: { sessionId, textId, ratio } };
}

export function itemOptions(item: Item): { id: string; text: string }[] {
  if (!Array.isArray(item.prompt.options)) return [];
  return item.prompt.options.flatMap((option: unknown) => {
    if (!option || typeof option !== "object" || !("id" in option) || !("text" in option)) return [];
    return typeof option.id === "string" && typeof option.text === "string" ? [{ id: option.id, text: option.text }] : [];
  });
}
