import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ERROR_CODES } from '../constants/error-codes.constant';

function buildHost(jsonMock: jest.Mock) {
  const response = { status: jest.fn().mockReturnThis(), json: jsonMock };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  it('normalizes an exception with an errorCode payload', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const exception = new BadRequestException({
      errorCode: ERROR_CODES.VALIDATION_FAILED,
      message: 'username must not be empty',
    });

    filter.catch(exception, buildHost(json));

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: ERROR_CODES.VALIDATION_FAILED,
      }),
    );
  });
});
