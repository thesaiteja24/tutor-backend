import { buildApp } from "@/app.ts";
import { env } from "@/config/index.ts";
import { queryClient } from "@/database/index.ts";
import { startOrganizationRequestReminderScheduler } from "@/modules/organization-requests/index.ts";

async function start() {
  const app = await buildApp();
  let stopOrganizationRequestReminderScheduler = () => {};

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    stopOrganizationRequestReminderScheduler = startOrganizationRequestReminderScheduler();

    console.log(`🚀 Server running on http://${env.HOST}:${env.PORT}`);
    console.log(`📚 API Reference (Scalar Docs): http://${env.HOST}:${env.PORT}/docs`);
    console.log(`💚 Health check: http://${env.HOST}:${env.PORT}/health`);
  } catch (err) {
    app.log.error(err);
    await queryClient.end();
    process.exit(1);
  }

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}, closing server gracefully...`);
      try {
        await app.close();
        stopOrganizationRequestReminderScheduler();
        await queryClient.end();
        console.log("👋 Server closed cleanly.");
        process.exit(0);
      } catch (err) {
        console.error("Error during graceful shutdown:", err);
        process.exit(1);
      }
    });
  }
}

start();
