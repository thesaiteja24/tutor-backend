import { env } from "@/config/index.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";

import { organizationRequestService } from "./organization-request.services.ts";

export function startOrganizationRequestReminderScheduler() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await organizationRequestService.sendReminders();
      if (result.sent > 0) devLogger.info("OrganizationRequestReminder", `Sent ${result.sent} reminder notification batch(es).`);
    } catch (error) {
      devLogger.error("OrganizationRequestReminder", "Reminder sweep failed.", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, env.ORGANIZATION_REQUEST_REMINDER_INTERVAL_MS);
  timer.unref();
  void run();
  return () => clearInterval(timer);
}
