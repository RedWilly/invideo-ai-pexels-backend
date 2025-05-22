/**
 * Types for job processing and tracking
 */

import type { ScriptProcessingRequest, ScriptProcessingResponse } from './script-types';

/**
 * Job status enum
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Job type enum
 */
export enum JobType {
  SCRIPT_PROCESSING = 'script_processing'
}

/**
 * Base job interface
 */
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  progress?: number;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Script processing job
 */
export interface ScriptProcessingJob extends Job {
  type: JobType.SCRIPT_PROCESSING;
  request: ScriptProcessingRequest;
  result?: ScriptProcessingResponse;
}

/**
 * Job update notification
 */
export interface JobUpdate {
  jobId: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  result?: any;
  updatedAt: Date;
}
