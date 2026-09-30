/** One timer per task, no overlap, and no polling while the page is hidden. */
export function createVisibleScheduler(
  task,
  { interval, document: page = document, onError = console.warn } = {},
) {
  let timer = null,
    running = false,
    stopped = false;
  const visible = () => page.visibilityState !== 'hidden';
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    cancel();
    if (!stopped && visible()) timer = setTimeout(run, interval);
  };
  async function run() {
    cancel();
    if (stopped || !visible() || running) return;
    running = true;
    try {
      await task();
    } catch (error) {
      onError(error);
    } finally {
      running = false;
      schedule();
    }
  }
  const visibility = () => {
    cancel();
    if (visible()) void run();
  };
  page.addEventListener('visibilitychange', visibility);
  schedule();
  return () => {
    stopped = true;
    cancel();
    page.removeEventListener('visibilitychange', visibility);
  };
}
