/**
 * Job service for managing asynchronous processing jobs
 */
import { v4 as uuidv4 } from 'uuid';
import { logger, PREFIXES } from '../../utils/logger';
import type { ScriptProcessingRequest, ScriptProcessingResponse } from '../../types/script-types';
import { JobStatus, JobType, type ScriptProcessingJob, type JobUpdate } from '../../types/job-types';
// Using a more generic type to handle Elysia's WebSocket wrapper
type WebSocketLike = {
  send: (data: string | Uint8Array) => void;
};

/**
 * Service for managing processing jobs
 */
export class JobService {
  // In-memory store for jobs (in a production app, this would be a database)
  private jobs: Map<string, ScriptProcessingJob> = new Map();
  
  // WebSocket connections subscribed to job updates
  private subscribers: Map<string, Set<WebSocketLike>> = new Map();

  /**
   * Create a new script processing job
   * @param request Script processing request
   * @returns Job ID
   */
  createScriptProcessingJob(request: ScriptProcessingRequest): string {
    const jobId = uuidv4();
    
    const job: ScriptProcessingJob = {
      id: jobId,
      type: JobType.SCRIPT_PROCESSING,
      status: JobStatus.PENDING,
      request,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.jobs.set(jobId, job);
    logger.info(PREFIXES.JOB, `Created script processing job ${jobId}`);
    
    return jobId;
  }

  /**
   * Get a job by ID
   * @param jobId Job ID
   * @returns Job or undefined if not found
   */
  getJob(jobId: string): ScriptProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update a job's status
   * @param jobId Job ID
   * @param status New status
   * @param message Optional status message
   * @param progress Optional progress percentage (0-100)
   */
  updateJobStatus(
    jobId: string, 
    status: JobStatus, 
    message?: string, 
    progress?: number
  ): void {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      logger.warn(PREFIXES.JOB, `Attempted to update non-existent job ${jobId}`);
      return;
    }
    
    job.status = status;
    job.updatedAt = new Date();
    
    if (message !== undefined) {
      job.message = message;
    }
    
    if (progress !== undefined) {
      job.progress = progress;
    }
    
    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      job.completedAt = new Date();
    }
    
    logger.info(PREFIXES.JOB, `Updated job ${jobId} status to ${status}`);
    
    // Notify subscribers
    this.notifyJobUpdate(job);
  }

  /**
   * Complete a script processing job with results
   * @param jobId Job ID
   * @param result Script processing result
   */
  completeScriptProcessingJob(jobId: string, result: ScriptProcessingResponse): void {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      logger.warn(PREFIXES.JOB, `Attempted to complete non-existent job ${jobId}`);
      return;
    }
    
    job.status = JobStatus.COMPLETED;
    job.result = result;
    job.updatedAt = new Date();
    job.completedAt = new Date();
    job.progress = 100;
    
    logger.info(PREFIXES.JOB, `Completed job ${jobId}`);
    
    // Notify subscribers
    this.notifyJobUpdate(job);
  }

  /**
   * Fail a job with an error message
   * @param jobId Job ID
   * @param errorMessage Error message
   */
  failJob(jobId: string, errorMessage: string): void {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      logger.warn(PREFIXES.JOB, `Attempted to fail non-existent job ${jobId}`);
      return;
    }
    
    job.status = JobStatus.FAILED;
    job.message = errorMessage;
    job.updatedAt = new Date();
    job.completedAt = new Date();
    
    logger.error(PREFIXES.JOB, `Job ${jobId} failed: ${errorMessage}`);
    
    // Notify subscribers
    this.notifyJobUpdate(job);
  }

  /**
   * Subscribe a WebSocket to job updates
   * @param jobId Job ID
   * @param ws WebSocket connection
   */
  subscribeToJob(jobId: string, ws: WebSocketLike): void {
    if (!this.subscribers.has(jobId)) {
      this.subscribers.set(jobId, new Set());
    }
    
    this.subscribers.get(jobId)?.add(ws);
    logger.info(PREFIXES.JOB, `WebSocket subscribed to job ${jobId}`);
    
    // Send initial job state
    const job = this.jobs.get(jobId);
    if (job) {
      this.sendJobUpdate(ws, job);
    }
  }

  /**
   * Unsubscribe a WebSocket from job updates
   * @param jobId Job ID
   * @param ws WebSocket connection
   */
  unsubscribeFromJob(jobId: string, ws: WebSocketLike): void {
    const jobSubscribers = this.subscribers.get(jobId);
    
    if (jobSubscribers) {
      jobSubscribers.delete(ws);
      
      if (jobSubscribers.size === 0) {
        this.subscribers.delete(jobId);
      }
      
      logger.info(PREFIXES.JOB, `WebSocket unsubscribed from job ${jobId}`);
    }
  }

  /**
   * Unsubscribe a WebSocket from all jobs
   * @param ws WebSocket connection
   */
  unsubscribeFromAllJobs(ws: WebSocketLike): void {
    for (const [jobId, subscribers] of this.subscribers.entries()) {
      if (subscribers.has(ws)) {
        subscribers.delete(ws);
        
        if (subscribers.size === 0) {
          this.subscribers.delete(jobId);
        }
      }
    }
    
    logger.info(PREFIXES.JOB, 'WebSocket unsubscribed from all jobs');
  }

  /**
   * Notify all subscribers of a job update
   * @param job Updated job
   */
  private notifyJobUpdate(job: ScriptProcessingJob): void {
    const subscribers = this.subscribers.get(job.id);
    
    if (!subscribers || subscribers.size === 0) {
      return;
    }
    
    logger.info(PREFIXES.JOB, `Notifying ${subscribers.size} subscribers of job ${job.id} update`);
    
    for (const ws of subscribers) {
      this.sendJobUpdate(ws, job);
    }
  }

  /**
   * Send a job update to a WebSocket
   * @param ws WebSocket connection
   * @param job Job to send update for
   */
  private sendJobUpdate(ws: WebSocketLike, job: ScriptProcessingJob): void {
    try {
      const update: JobUpdate = {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        updatedAt: job.updatedAt,
        // Only include result if job is completed
        result: job.status === JobStatus.COMPLETED ? job.result : undefined
      };
      
      ws.send(JSON.stringify(update));
    } catch (error) {
      logger.error(PREFIXES.ERROR, `Error sending job update to WebSocket`, error);
    }
  }

  /**
   * Clean up old completed jobs (should be called periodically)
   * @param maxAgeMs Maximum age in milliseconds
   */
  cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    let count = 0;
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
        job.completedAt &&
        now.getTime() - job.completedAt.getTime() > maxAgeMs
      ) {
        this.jobs.delete(jobId);
        count++;
      }
    }
    
    if (count > 0) {
      logger.info(PREFIXES.JOB, `Cleaned up ${count} old jobs`);
    }
  }
}

// Export a singleton instance
export const jobService = new JobService();
