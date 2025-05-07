export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error caused by invalid input or expected business state.
 */
export class UserError extends ApplicationError {}

/**
 * Error for invalid input (e.g., Zod validation).
 */
export class ValidationError extends UserError {}

/**
 * Error when an entity already exists.
 */
export class AlreadyExistsError extends UserError {}

/**
 * Error when an entity is not found.
 */
export class NotFoundError extends UserError {}

/**
 * Internal or unexpected error. Do not expose details to the user.
 */
export class InternalError extends ApplicationError {}
