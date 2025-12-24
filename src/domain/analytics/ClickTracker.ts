import type { ClickEvent } from "@/domain/analytics/ClickEvent";

export interface ClickTracker {
  track(event: ClickEvent): Promise<void>;
}
