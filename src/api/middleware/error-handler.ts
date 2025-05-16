/**
 * Error handling middleware for the API
 */
import { Elysia } from 'elysia';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Error response structure
 */
interface ErrorResponse {
  success: boolean;
  error: string;
  timestamp: string;
  path: string;
}

/**
 * Error handler middleware for Elysia
 * @returns Elysia instance with error handling
 */
export const errorHandler = new Elysia()
  .onError(({ code, error, request, set }) => {
    // Log the error with appropriate level based on the error type
    if (code === 'VALIDATION' || code === 'NOT_FOUND') {
      logger.warn(PREFIXES.API, `${code} Error: ${error.message}`, { path: request.url });
    } else {
      logger.error(PREFIXES.ERROR, `${code} Error: ${error.message}`, error.stack || error);
    }

    // Set appropriate status code
    let statusCode = 500;

    switch (code) {
      case 'VALIDATION':
        statusCode = 400;
        break;
      case 'NOT_FOUND':
        statusCode = 404;
        break;
      case 'PARSE':
        statusCode = 400;
        break;
      case 'INTERNAL_SERVER_ERROR':
      default:
        statusCode = 500;
    }
    
    set.status = statusCode;
    
    // Create error response
    const response: ErrorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      path: request.url || ''
    };
    
    return response;
  });
