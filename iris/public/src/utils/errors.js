export class IrisError extends Error {
    constructor(message, code, context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'IrisError';
    }
}
export class ApiRequestError extends IrisError {
    constructor(message, statusCode, context) {
        super(message, 'API_REQUEST_ERROR', context);
        this.statusCode = statusCode;
        this.name = 'ApiRequestError';
    }
}
export class ValidationError extends IrisError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.details = details;
        this.name = 'ValidationError';
    }
}
export class AuthenticationError extends IrisError {
    constructor(message = 'Authentication required') {
        super(message, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends IrisError {
    constructor(message = 'Insufficient permissions') {
        super(message, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
export function handleApiError(error, operation) {
    if (isApiError(error)) {
        const apiError = error;
        if (apiError.details) {
            throw new ValidationError(`${operation} failed: ${apiError.error}`, apiError.details);
        }
        if (apiError.error.includes('Invalid or expired token')) {
            throw new AuthenticationError(apiError.error);
        }
        if (apiError.error.includes('Insufficient permissions')) {
            throw new AuthorizationError(apiError.error);
        }
        throw new ApiRequestError(`${operation} failed: ${apiError.error}`);
    }
    if (error instanceof Error) {
        throw new IrisError(`${operation} failed: ${error.message}`, 'UNKNOWN_ERROR', error);
    }
    throw new IrisError(`${operation} failed: Unknown error`, 'UNKNOWN_ERROR', error);
}
function isApiError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof error.error === 'string');
}
export function getErrorMessage(error) {
    if (error instanceof IrisError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (isApiError(error)) {
        return error.error;
    }
    return 'An unknown error occurred';
}
