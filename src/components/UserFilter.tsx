import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UserFilterProps {
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
}

export function UserFilter({ selectedUserId, onUserChange }: UserFilterProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (!error && data) {
        setUsers(data);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  if (loading) return null;

  return (
    <Select
      value={selectedUserId || 'all'}
      onValueChange={(value) => onUserChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-9 h-9 sm:w-10 sm:h-10 px-2 rounded-xl border-2 hover:border-primary/50 transition-all duration-200">
        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-2 shadow-lg">
        <SelectItem value="all" className="rounded-lg font-medium">{t('admin.allUsers')}</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id} className="rounded-lg">
            {user.full_name || user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
