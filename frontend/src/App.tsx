import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2">
      <Button>
        <Icon icon="lucide:check" className="mr-2 h-4 w-4" />
        Frontend scaffold ready
      </Button>
    </div>
  );
}

export default App;
