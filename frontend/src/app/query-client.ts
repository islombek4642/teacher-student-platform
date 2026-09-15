import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import i18n from '@/i18n';
import { toast } from '@/components/ui/toast';
import { errorCodeToI18nKey, extractErrorCode } from '@/lib/error-codes';

function showErrorToast(error: unknown) {
  const key = errorCodeToI18nKey(extractErrorCode(error));
  toast.add({ type: 'error', description: i18n.t(key) });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
  queryCache: new QueryCache({ onError: showErrorToast }),
  mutationCache: new MutationCache({ onError: showErrorToast }),
});
