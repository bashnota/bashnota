# Logging System Documentation

## Overview

This document explains the logging system implemented in BashNota. The logging system provides a centralized way to manage logs based on the current environment (development vs. production).

## Features

- **Environment-aware logging**: Console logs only appear in development, while errors are logged in all environments
- **Debug mode**: Special debug logs that can be enabled in production via environment variables
- **Prefixed loggers**: Create context-specific loggers for better identification of log sources
- **Performance optimization**: No logging overhead in production for non-error logs
- **Consistent API**: Uses familiar console.log-style methods for easy adoption

## Usage

### Basic Usage

```typescript
import { logger } from '@/services/logger'

// Only logs in development
logger.log('User logged in:', userId)

// Only logs in development
logger.warn('Deprecated method called')

// Only logs in development
logger.info('Application started')

// Logs in all environments - use for critical errors
logger.error('Failed to connect to API:', error)

// Only logs in development or if VITE_ENABLE_DEBUG_LOGS=true
logger.debug('Detailed debug information')
```

### Advanced Usage - Prefixed Loggers

Create a prefixed logger for a specific component or service:

```typescript
// In a service or component
const componentLogger = logger.createPrefixedLogger('AuthService')

componentLogger.log('User authenticated') // Logs: [AuthService] User authenticated
componentLogger.error('Login failed:', error) // Logs: [AuthService] Login failed: [error details]
```

### Grouping Logs

```typescript
logger.group('Task Execution')
logger.log('Starting task')
logger.log('Task details:', details)
logger.groupEnd()
```

### Performance Measurement

```typescript
logger.time('Operation')
// Perform operation
logger.timeEnd('Operation') // Logs time elapsed
```

## Configuration

The logging system checks the current environment using:

```typescript
import.meta.env.DEV // true in development, false in production
```

For debug logs in production, set the environment variable:

```
VITE_ENABLE_DEBUG_LOGS=true
```

## Best Practices

1. **Use appropriate log levels**: 
   - `log`, `info`: General information
   - `warn`: Potential issues, deprecated features
   - `debug`: Detailed debugging information
   - `error`: Critical errors that affect functionality

2. **Be concise and descriptive**:
   - Include relevant context in log messages
   - For errors, include both a message and the error object

3. **Use prefixed loggers**:
   - Create a prefixed logger for each module to identify the source
   
4. **Group related logs**:
   - Use `group` and `groupEnd` to organize complex logs

5. **Avoid sensitive information**:
   - Never log credentials, tokens, or personal information

## Implementation Details

The logger is implemented as a singleton with methods that check the current environment before logging. This ensures no performance impact in production for most logs.

Error logs are always preserved to help with production troubleshooting.

The implementation is in `src/services/logger.ts`.