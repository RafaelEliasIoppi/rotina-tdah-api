export function createRemindersSync(apiClient) {
  let cachedReminders = [];
  let intervalId = null;

  async function sync() {
    try {
      const data = await apiClient.getReminders();

      if (data && Array.isArray(data.reminders)) {
        const active = data.reminders.filter((r) => r.enabled === true);
        cachedReminders = active;

        if (active.length > 0) {
          console.log(
            `[remindersSync] ${active.length} lembretes ativos sincronizados`,
          );
        }
      }
    } catch (err) {
      console.error('[remindersSync] Erro na sincronização:', err.message);
    }
  }

  function start(intervalMs = 10 * 60 * 1000) {
    sync();
    intervalId = setInterval(sync, intervalMs);
    console.log(
      `[remindersSync] Polling a cada ${intervalMs / 1000 / 60} min`,
    );
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function getReminders() {
    return cachedReminders;
  }

  return { start, stop, getReminders, sync };
}
