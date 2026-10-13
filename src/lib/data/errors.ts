/** An error whose message is safe and useful to show to the user as is. Any other error is logged and hidden. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
