const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const excelQueue = new Queue('excel-processing', { connection });
const conciliacionQueue = new Queue('conciliacion-process', { connection });

module.exports = {
  excelQueue,
  conciliacionQueue,
  redisConnection: connection
};

