import { HttpException, InternalServerErrorException, Logger } from '@nestjs/common';

type SafeExecuteOptions = {
  context: string;
  humanMessage: string;
};

const logger = new Logger('SafeExecute');

export async function safeExecute<T>(
  fn: () => Promise<T>,
  options: SafeExecuteOptions,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof Error) {
      logger.error(`${options.context}: ${error.message}`, error.stack);
    } else {
      logger.error(`${options.context}: unknown error`, JSON.stringify(error));
    }

    throw new InternalServerErrorException(options.humanMessage);
  }
}
