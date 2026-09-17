import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PersonAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <Avatar>
      <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
    </Avatar>
  );
}
