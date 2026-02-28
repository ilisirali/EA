import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({
        title: t('auth.error'),
        description: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({
        title: t('auth.passwordUpdated'),
      });
      navigate('/');
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: t('auth.error'),
          description: t('auth.passwordUpdateError'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.error'),
          description: t('auth.passwordUpdateError'),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdatePassword} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          {t('auth.newPassword')}
        </label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          {t('auth.confirmNewPassword')}
        </label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmNewPassword && newPassword !== confirmNewPassword && (
          <p className="text-sm text-destructive mt-1">{t('auth.passwordMismatch')}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {t('auth.updatePasswordButton')}
      </Button>
    </form>
  );
}
