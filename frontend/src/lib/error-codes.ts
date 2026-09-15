import type { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/api/types';

// Manually synced with backend/src/common/constants/error-codes.constant.ts.
// There is no automated check tying the two together, so whenever that file
// changes, update this set to match or new codes will silently fall back to
// errors.UNKNOWN.
const KNOWN_CODES = new Set([
  'ERR_INVALID_CREDENTIALS',
  'ERR_USER_NOT_FOUND',
  'ERR_TEACHER_NOT_FOUND',
  'ERR_TEACHER_HAS_GROUPS',
  'ERR_GROUP_NOT_FOUND',
  'ERR_GROUP_HAS_DEPENDENTS',
  'ERR_STUDENT_NOT_FOUND',
  'ERR_STUDENT_HAS_SUBMISSIONS',
  'ERR_TASK_NOT_FOUND',
  'ERR_SUBJECT_NOT_FOUND',
  'ERR_SUBMISSION_NOT_FOUND',
  'ERR_SUBMISSION_ALREADY_COMPLETED',
  'ERR_TASK_HAS_SUBMISSIONS',
  'ERR_FORBIDDEN_RESOURCE',
  'ERR_VALIDATION_FAILED',
  'ERR_USERNAME_TAKEN',
  'ERR_INTERNAL_ERROR',
]);

export function errorCodeToI18nKey(errorCode: string | undefined): string {
  if (errorCode && KNOWN_CODES.has(errorCode)) {
    return `errors.${errorCode}`;
  }
  return 'errors.UNKNOWN';
}

export function extractErrorCode(error: unknown): string | undefined {
  const axiosError = error as AxiosError<ApiErrorBody>;
  return axiosError.response?.data?.errorCode;
}
