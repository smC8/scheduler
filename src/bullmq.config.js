import IORedis from "ioredis";
import pkg from "bullmq";
const { Queue, Worker } = pkg;

const redisOptions = {
  host: "localhost", // Use 'redis' as the host
  port: 6379,
  maxRetriesPerRequest: null,
};

const connection = new IORedis(redisOptions);

export { Queue, Worker, connection };
