import type { ClientEvent } from "@dailylingua/schemas";

type DeviceFields = "tz" | "deviceId" | "seq";
type UnitKind = "unit_item_attempt" | "unit_step_completed" | "unit_test_submitted" | "oral_attempt" | "roleplay_completed";

/**
 * An event of a unit or of the oral workshop, before the queue adds the device fields (`tz`, `deviceId`, `seq`). It never carries a score or an
 * XP: the server grades the answers.
 */
export type UnitEvent = ClientEvent extends infer Event
  ? Event extends ClientEvent & { kind: UnitKind }
    ? { kind: Event["kind"]; payload: Omit<Event["payload"], DeviceFields> }
    : never
  : never;
