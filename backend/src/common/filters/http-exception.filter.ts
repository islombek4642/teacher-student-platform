import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const errorCode =
      typeof body === 'object' && body !== null && 'errorCode' in body
        ? (body as { errorCode: string }).errorCode
        : ERROR_CODES.INTERNAL_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Unexpected error';

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${statusCode} - ErrorCode: ${errorCode} - Message: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(statusCode).json({ statusCode, errorCode, message });
  }
}
