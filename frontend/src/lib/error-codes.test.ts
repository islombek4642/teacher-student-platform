import { describe, expect, it } from 'vitest';
import { errorCodeToI18nKey } from './error-codes';

describe('errorCodeToI18nKey', () => {
  it('maps a known error code to its i18n key', () => {
    expect(errorCodeToI18nKey('ERR_GROUP_NOT_FOUND')).toBe('errors.ERR_GROUP_NOT_FOUND');
  });

  it('falls back to errors.UNKNOWN for an unrecognized code', () => {
    expect(errorCodeToI18nKey('ERR_SOMETHING_NEW')).toBe('errors.UNKNOWN');
  });

  it('falls back to errors.UNKNOWN for undefined input', () => {
    expect(errorCodeToI18nKey(undefined)).toBe('errors.UNKNOWN');
  });
});
