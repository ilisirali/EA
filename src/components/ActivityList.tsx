import { Activity } from "@/hooks/useActivities";
import { ActivityCard } from "./ActivityCard";
import { ClipboardList, Loader2, CalendarDays, Layers } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";

interface ActivityListProps {
  activities: Activity[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { description: string; location?: string }) => Promise<boolean>;
  onDeletePhoto: (photoId: string) => Promise<boolean>;
  onUploadPhotos: (activityId: string, photos: File[], day?: string) => Promise<boolean>;
  onRefetch: () => void;
  loading: boolean;
}

export function ActivityList({ activities, onDelete, onUpdate, onDeletePhoto, onUploadPhotos, onRefetch, loading }: ActivityListProps) {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();

  if (loading && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in duration-500">
        <div className="animate-spin w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{t('list.loading')}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-card/40 rounded-[3rem] border-2 border-dashed border-border/60 mx-2 animate-in zoom-in-95 duration-700">
        <div className="p-6 bg-muted/50 rounded-[2rem] mb-6">
          <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl font-black text-foreground uppercase tracking-tight italic">{t('list.empty')}</p>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest max-w-[200px] leading-relaxed mx-auto opacity-60">
            {t('list.addFirst')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <div className="space-y-8">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="animate-in fade-in slide-in-from-bottom-6 duration-1000"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ActivityCard
              activity={activity}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onDeletePhoto={onDeletePhoto}
              onUploadPhotos={onUploadPhotos}
              onRefetch={onRefetch}
              canEdit={isAdmin || activity.user_id === user?.id}
            />
          </div>
        ))}
      </div>

      {/* Scroll indicator for longer lists */}
      {activities.length > 3 && (
        <div className="flex justify-center pt-8 opacity-20">
          <div className="w-1 h-12 rounded-full bg-gradient-to-b from-primary to-transparent" />
        </div>
      )}
    </div>
  );
}
