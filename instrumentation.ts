export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupChecks } = await import("@/lib/startup/init");
    await runStartupChecks();
  }
}
