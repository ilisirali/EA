import { LogOut, Plus, Shield, Settings } from "lucide-react";
import { WeeklyActivityForm } from "@/components/WeeklyActivityForm";
import { ActivityList } from "@/components/ActivityList";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useActivities } from "@/hooks/useActivities";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSelector } from "@/components/LanguageSelector";
import { UserFilter } from "@/components/UserFilter";
import { Logo } from "@/components/Logo";

const Index = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { activities, loading, addActivity, updateActivity, deleteActivity, deletePhoto, uploadPhotosForActivity, refetch } = useActivities(selectedUserId);
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (authLoading || (activities.length === 0 && loading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin w-12 h-12 border-[6px] border-primary/20 border-t-primary rounded-full shadow-xl" />
        <p className="text-muted-foreground font-black text-xs uppercase tracking-widest animate-pulse">Sistem Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleAddActivity = async (data: {
    description: string;
    location: string;
    date: Date;
    photos: File[];
  }) => {
    const result = await addActivity(data);
    if (result) {
      setIsSheetOpen(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/40 shadow-sm safe-top">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="p-1 sm:p-1.5 transition-transform group-hover:scale-105 active:scale-95">
                <Logo className="h-8 sm:h-12" />
              </div>
              <div className="hidden xs:block h-8 w-[1px] bg-border/60 mx-1" />
              <div className="hidden xs:flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">Professional</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Management</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <div className="flex items-center gap-2 mr-2">
                  <UserFilter
                    selectedUserId={selectedUserId}
                    onUserChange={setSelectedUserId}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate('/admin')}
                    className="h-10 w-10 sm:h-12 sm:w-16 rounded-xl border-border/60 hover:border-primary hover:text-primary transition-all"
                  >
                    <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                </div>
              )}

              <LanguageSelector />

              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button size="lg" className="h-12 gap-2 rounded-2xl bg-foreground text-background hover:bg-primary hover:text-white shadow-xl hover:shadow-primary/20 transition-all font-black uppercase text-xs tracking-widest group">
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    <span className="hidden sm:inline">{t('index.new')}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[92vh] rounded-t-[3rem] border-t-0 shadow-2xl overflow-hidden p-0">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full" />
                  <div className="h-full flex flex-col pt-8">
                    <SheetHeader className="px-8 mb-6 text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <SheetTitle className="text-3xl font-black italic tracking-tighter uppercase">{t('index.newActivity')}</SheetTitle>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{t('activity.workReport')}</p>
                        </div>
                      </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-12 scroll-smooth-ios">
                      <WeeklyActivityForm onSubmit={handleAddActivity} />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button variant="ghost" size="icon" onClick={signOut} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-32 overflow-x-hidden">
        {/* Welcome Section */}
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-border/40">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">{activities.length} {t('index.activities')}</p>
                {isAdmin && (
                  <Badge variant="secondary" className="gap-1.5 rounded-full bg-primary/10 text-primary border-primary/20 font-black text-[10px] px-3 py-1 uppercase tracking-widest">
                    <Shield className="w-3 h-3" /> {t('index.admin')}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter uppercase italic pr-4">
                {t('auth.welcome')}, <br className="sm:hidden" />
                <span className="text-primary">{user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}</span>
              </h1>
            </div>
          </div>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          <ActivityList
            activities={activities}
            onDelete={deleteActivity}
            onUpdate={updateActivity}
            onDeletePhoto={deletePhoto}
            onUploadPhotos={uploadPhotosForActivity}
            onRefetch={refetch}
            loading={loading}
          />
        </section>
      </main>

      {/* Mobile FAB - Enhanced */}
      <div className="fixed bottom-8 right-8 z-40 sm:hidden animate-in zoom-in-50 duration-500 delay-500">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="h-16 w-16 rounded-[2rem] shadow-[0_20px_40px_rgba(var(--primary),0.3)] bg-primary hover:bg-black text-white hover:shadow-2xl active:scale-90 transition-all duration-300 group">
              <Plus className="w-8 h-8 transition-transform group-hover:rotate-90" />
            </Button>
          </SheetTrigger>
        </Sheet>
      </div>
    </div>
  );
};

export default Index;
