import IORedis from "ioredis";
import pkg from "bullmq";
const { Queue, Worker } = pkg;

const redisOptions = {
  host: "localhost", // Replace with your Redis host
  port: 6379, // Replace with your Redis port
  maxRetriesPerRequest: null,
};

const connection = new IORedis(redisOptions);

export { Queue, Worker, connection };
