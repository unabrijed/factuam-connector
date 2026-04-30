import { listAxlWorkerHealth } from "../services/axl-worker-health.service";

export async function getAxlWorkersStatusController() {
  const workers = await listAxlWorkerHealth();
  return {
    ok: workers.every((worker) => worker.healthy),
    workers
  };
}
