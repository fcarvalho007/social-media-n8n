import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/hooks/useProfiles';

interface UserAvatarProps {
  profile: Profile | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const UserAvatar = ({ profile, size = 'md', showName = false }: UserAvatarProps) => {
  if (!profile) return null;

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const displayName = profile.full_name || profile.email.split('@')[0];

  return (
    <div className="flex items-center gap-2">
      <Avatar className={sizeClasses[size]}>
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {getInitials(profile.full_name, profile.email)}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
      )}
    </div>
  );
};
