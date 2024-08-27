import IORedis from "ioredis";
import pkg from "bullmq";

const { Queue, Worker } = pkg;

// const redisOptions = {
//   host: "redis-17560.c13.us-east-1-3.ec2.redns.redis-cloud.com", // Use 'redis' as the host
//   port: 17560,
//   password: "Ey3YTL8308IKPCXepVx86hbUAXF96u3W",
//   maxRetriesPerRequest: null,
// };

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  connectionName: "scheduler-redis-client", // This is the name that will show up in CLIENT LIST
};

// const redisOptions = {
//   host: "localhost", // Use 'redis' as the host
//   port: 6379,
//   maxRetriesPerRequest: null,
// };

const connection = new IORedis(redisOptions);

export { Queue, Worker, connection };
