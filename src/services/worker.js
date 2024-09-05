import { Worker, connection } from "../config/bullmq.config.js";
import { loadQueues } from "./scheduler.js";
import axios from 'axios';
// A Map to store workers associated with queues
const workersMap = new Map();

/**
 * Initialize workers for all existing queues.
 */
export async function initializeWorkers() {
  const queues = await loadQueues();

  queues.forEach((queue, key) => {
    const worker = new Worker(
      queue.name,
      async (job) => {
        // Process the job here
        console.log(`Processing job ${job.id} from queue ${queue.name}`);
        // Add job processing logic here
        
        await axios.post('https://enyp6wdw75ja.x.pipedream.net', {
          jobID: job.id,
          firstName: 'Fred',
          lastName: 'Flintstone',
          orders: [1, 2, 3]
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
      })

      },
      { connection }
    );

    worker.on("completed", (job) => {
      console.log(`Job ${job.id} has been completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`Job ${job.id} failed with error ${err.message}`);
    });
  });
}

/**
 * Initialize a worker for a specific queue.
 * @param {Queue} queue - The queue for which to create a worker.
 * @returns {Worker} - The initialized worker.
 */
export function initializeWorker(queue) {
  const worker = new Worker(
    queue.name,
    async (job) => {
      // Process the job here
      console.log(`Processing job ${job.id} from queue ${queue.name}`);
      // Add job processing logic here
    },
    { connection }
  );

  // Store the worker in the map using the queue name as the key
  workersMap.set(queue.name, worker);
  console.log("workersMapSize=======", workersMap.size);

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} has been completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed with error ${err.message}`);
  });

  return worker;
}

/**
 * Get a worker associated with a specific queue.
 *
 * @param {Queue} queue - The queue for which to get the worker.
 * @returns {Worker | undefined} - The worker associated with the queue, or undefined if not found.
 */
export function getWorkerForQueue(queue) {
  // console.log("worker========", workersMap.get(queue.name));
  return workersMap.get(queue.name);
}

/**
 * Disconnects a worker from a specific queue.
 * @param {Queue} queue - The queue for which to create a worker.
 * @returns {Worker} - The initialized worker.
 */
export async function disconnectWorker(queue) {
  // const workers = await queue.getWorkers();
  const worker = await getWorkerForQueue(queue);
  // console.log("WWWWorker======", worker);

  //disconnect the worker attached to the queue
  await worker.close();
  const x = await queue.getWorkers();
  console.log("workers========", x);
}
