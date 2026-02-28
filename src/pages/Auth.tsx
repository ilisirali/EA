/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { LanguageSelector } from '@/components/LanguageSelector';
import ResetPasswordForm from '@/components/ResetPasswordForm';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formTransition, setFormTransition] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const { signIn, signUp, resetPassword, user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/home');
  }, [user, navigate]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsResetPassword(true);
    } else if (hash && hash.includes('signup')) {
      setIsLogin(false);
    }
  }, []);

  const switchForm = (callback: () => void) => {
    setFormTransition(true);
    setTimeout(() => {
      callback();
      setFormTransition(false);
    }, 200);
  };

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || '';
    if (message.includes('invalid login credentials')) return t('auth.invalidCredentials');
    if (message.includes('email not confirmed')) return t('auth.emailNotConfirmed');
    if (message.includes('already registered')) return t('auth.userAlreadyExists');
    return error?.message || t('auth.error');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      toast({
        title: t('auth.error'),
        description: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // 🔥 1️⃣ Önce login yap
        const { error } = await signIn(email, password);
        if (error) throw error;

        // 🔥 2️⃣ Sonra blocked kontrol et
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_blocked')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (profile?.is_blocked) {
            await supabase.auth.signOut();
            toast({
              title: t('auth.error'),
              description: t('auth.accountBlocked'),
              variant: 'destructive',
            });
            return;
          }
        }
      } else {
        const { error, data } = await signUp(email, password, fullName, t('auth.lang_code') || 'tr');

        if (error) throw error;

        // Auto-login after successful bypass signup
        const { error: signInError } = await signIn(email, password);

        if (signInError) {
          // If auto-login fails, still show success but ask to login manually
          toast({
            title: t('auth.signupSuccess'),
            description: t('auth.hasAccount'),
          });
          setIsLogin(true);
        } else {
          toast({
            title: t('auth.welcome'),
            description: t('auth.loginSuccess'),
          });
          navigate('/home');
        }
      }
    } catch (error: any) {
      toast({
        title: t('auth.error'),
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await resetPassword(email, t('auth.lang_code') || 'tr');

      if (error) throw error;

      toast({
        title: t('auth.resetEmailSent'),
        description: t('auth.checkEmailReset'),
      });
    } catch (error: any) {
      toast({
        title: t('auth.error'),
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black"></div>

      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-neutral-900 border border-red-600/30 rounded-3xl shadow-2xl p-8">

          <div className="flex flex-col items-center mb-8">
            <Logo className="h-16 mb-4" />
            <h1 className="text-white text-lg font-semibold">
              EA APP
            </h1>
          </div>

          {isResetPassword ? (
            <ResetPasswordForm />
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('auth.sendResetLink')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {!isLogin && (
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  required
                />
              )}

              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
              />

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {!isLogin && (
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPassword')}
                  required
                />
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLogin ? t('auth.loginButton') : t('auth.signupButton')}
              </Button>
            </form>
          )}

          {!isResetPassword && (
            <div className="mt-6 text-center space-y-2">
              {!isForgotPassword && (
                <button
                  type="button"
                  onClick={() => switchForm(() => setIsLogin(!isLogin))}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                </button>
              )}
              {isLogin && !isForgotPassword && (
                <div>
                  <button
                    type="button"
                    onClick={() => switchForm(() => setIsForgotPassword(true))}
                    className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}
              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => switchForm(() => setIsForgotPassword(false))}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  {t('auth.backToLogin')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
