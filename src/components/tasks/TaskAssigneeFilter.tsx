import { useProfiles } from '@/hooks/useProfiles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserAvatar } from './UserAvatar';
import { Users } from 'lucide-react';

interface TaskAssigneeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskAssigneeFilter({ value, onChange }: TaskAssigneeFilterProps) {
  const { profiles, isLoading } = useProfiles();

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Filtrar por pessoa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Todas as pessoas</span>
            </div>
          </SelectItem>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4" />
              <span className="text-muted-foreground italic">Não atribuídas</span>
            </div>
          </SelectItem>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                <UserAvatar profile={profile} size="sm" />
                <span>{profile.full_name || profile.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
