import IORedis from "ioredis";
import pkg from "bullmq";
const { Queue, Worker } = pkg;

// const redisOptions = {
//   host: "redis-host", // Use 'redis' as the host
//   port: port,
//   password: "password",
//   maxRetriesPerRequest: null,
// };

const redisOptions = {
  host: "redis", // Use 'redis' as the host
  port: 6379,
  maxRetriesPerRequest: null,
};

const connection = new IORedis(redisOptions);

export { Queue, Worker, connection };
