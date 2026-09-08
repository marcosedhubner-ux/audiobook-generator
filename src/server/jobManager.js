import { randomUUID } from "node:crypto";

const jobs = new Map();

export function createJob() {
  const job = {
    id: randomUUID(),
    status: "extracting",
    current: 0,
    total: 0,
    engine: null,
    outputPath: null,
    error: null,
    result: null,
    cancelled: false,
    listeners: new Set(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId) {
  return jobs.get(jobId);
}

export function emitEvent(job, eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of job.listeners) {
    res.write(payload);
  }
}

export function subscribe(job, res) {
  job.listeners.add(res);
}

export function unsubscribe(job, res) {
  job.listeners.delete(res);
}
