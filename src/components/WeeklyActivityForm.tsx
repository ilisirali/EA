import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { nl, tr, enUS, arSA } from "date-fns/locale";
import {
  CalendarIcon, Camera, Clock, MapPin, Plus, X,
  Loader2, UserPlus, LocateFixed, UserCheck, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { LocationPermissionDialog } from "./LocationPermissionDialog";

const dateLocales: Record<Language, typeof nl> = { tr, en: enUS, nl, ar: arSA };

export interface Teammate { name: string; hours: number; }
export interface DayEntry {
  work: string; meerwerk: string; location: string; googleMapsUrl?: string;
  hours: number; photos: File[]; previews: string[]; teammates: Teammate[];
  uitvoerder: string;
}
export interface WeeklyWork {
  monday: DayEntry; tuesday: DayEntry; wednesday: DayEntry;
  thursday: DayEntry; friday: DayEntry; saturday: DayEntry;
}
export interface DayPhotos { day: string; photos: File[]; }

interface WeeklyActivityFormProps {
  onSubmit: (data: {
    description: string; location: string; date: Date;
    photos: File[]; dayPhotos: DayPhotos[];
  }) => Promise<void>;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const emptyDay = (): DayEntry => ({
  work: '', meerwerk: '', location: '', googleMapsUrl: '',
  hours: 0, photos: [], previews: [], teammates: [{ name: '', hours: 0 }],
  uitvoerder: ''
});

const STORAGE_KEY = 'weeklyWorkDraft';

export function WeeklyActivityForm({ onSubmit }: WeeklyActivityFormProps) {
  const [weeklyWork, setWeeklyWork] = useState<WeeklyWork>({
    monday: emptyDay(), tuesday: emptyDay(), wednesday: emptyDay(),
    thursday: emptyDay(), friday: emptyDay(), saturday: emptyDay(),
  });
  const [weekStart, setWeekStart] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(false);
  const [locatingDay, setLocatingDay] = useState<string | null>(null);
  const [uploadingDay, setUploadingDay] = useState<string | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [retryDay, setRetryDay] = useState<keyof WeeklyWork | null>(null);
  const { t, language } = useLanguage();

  const cur = useMemo(() => ({
    date: t("activity.day"),
    weeklyWork: t("activity.workReport"),
    weeklyWorkSub: t("activity.weeklySummary"),
    hours: t("activity.hours"),
    teammates: t("form.teammates"),
    addPerson: t("form.addPerson"),
    name: t("form.personName"),
    workPlaceholder: t("days.workPlaceholder"),
    workDetails: t("activity.description"),
    extraWork: t("activity.extraWork"),
    extraWorkPlaceholder: t("form.meerwerkPlaceholder"),
    location: t("activity.location"),
    locationPlaceholder: t("form.locationPlaceholder"),
    photo: t("activity.photo"),
    gallery: t("activity.gallery"),
    add: t("common.add"),
    addActivity: t("activity.submit"),
    locationDetected: t("activity.locationDetected"),
    supervisor: t("activity.supervisor"),
    save: t("activity.save"),
    saved: t("activity.saved"),
    saving: t("activity.saving")
  }), [t]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.weeklyWork) {
          const cleanedWork = { ...parsed.weeklyWork };
          DAYS.forEach(day => {
            cleanedWork[day].previews = [];
            cleanedWork[day].photos = [];
          });
          setWeeklyWork(cleanedWork);
        }
        if (parsed.weekStart) setWeekStart(new Date(parsed.weekStart));
      } catch (e) { console.error('Failed to load draft', e); }
    }
  }, []);

  useEffect(() => {
    const dataToSave = { weeklyWork, weekStart: weekStart.toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [weeklyWork, weekStart]);

  const handleUitvoerderChange = (day: keyof WeeklyWork, value: string) =>
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], uitvoerder: value } }));

  const handleDayWorkChange = (day: keyof WeeklyWork, value: string) =>
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], work: value } }));

  const handleDayMeerwerkChange = (day: keyof WeeklyWork, value: string) =>
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], meerwerk: value } }));

  const handleDayLocationChange = (day: keyof WeeklyWork, value: string) =>
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], location: value } }));

  const handleDayHoursChange = (day: keyof WeeklyWork, value: string) => {
    const hours = parseFloat(value) || 0;
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], hours: Math.max(0, Math.min(24, hours)) } }));
  };

  const addTeammate = (day: keyof WeeklyWork) =>
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], teammates: [...prev[day].teammates, { name: '', hours: 0 }] } }));

  const removeTeammate = (day: keyof WeeklyWork, index: number) =>
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], teammates: prev[day].teammates.filter((_, i) => i !== index) } }));

  const handleDayPhotoUpload = (day: keyof WeeklyWork, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingDay(day);
    try {
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setWeeklyWork(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          photos: [...prev[day].photos, ...files],
          previews: [...prev[day].previews, ...newPreviews]
        }
      }));
    } catch { toast.error(t("auth.error")); } finally { setUploadingDay(null); }
  };

  const handleRemovePhoto = (day: keyof WeeklyWork, index: number) => {
    setWeeklyWork(prev => {
      const dayData = prev[day];
      const newPhotos = [...dayData.photos];
      const newPreviews = [...dayData.previews];
      URL.revokeObjectURL(newPreviews[index]);
      newPhotos.splice(index, 1);
      newPreviews.splice(index, 1);
      return { ...prev, [day]: { ...dayData, photos: newPhotos, previews: newPreviews } };
    });
  };

  const fetchAddress = async (day: keyof WeeklyWork) => {
    if (!navigator.geolocation) return toast.error(t("auth.error"));
    setLocatingDay(day);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const gMaps = `https://www.google.com/maps?q=${lat},${lon}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
          headers: { 'Accept-Language': language }
        });
        const data = await res.json();
        const finalAddr = data.display_name || "";
        setWeeklyWork(prev => ({
          ...prev, [day]: { ...prev[day], location: finalAddr || cur.locationDetected, googleMapsUrl: gMaps }
        }));
      } catch {
        setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], googleMapsUrl: gMaps } }));
      } finally { setLocatingDay(null); }
    }, (error) => {
      setLocatingDay(null);
      if (error.code === error.PERMISSION_DENIED) {
        setRetryDay(day);
        setPermissionDialogOpen(true);
      } else {
        toast.error(t("auth.error") || "Konum alınamadı.");
      }
    });
  };

  const totalHours = useMemo(() =>
    DAYS.reduce((sum, day) => sum + weeklyWork[day].hours, 0),
    [weeklyWork]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const description = JSON.stringify({ type: 'weekly', days: weeklyWork, totalHours });
      await onSubmit({
        description, location: '', date: weekStart,
        photos: DAYS.flatMap(day => weeklyWork[day].photos),
        dayPhotos: DAYS.filter(day => weeklyWork[day].photos.length > 0).map(day => ({ day, photos: weeklyWork[day].photos })),
      });
      localStorage.removeItem(STORAGE_KEY);
      toast.success(t("activity.success"));
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <div className="bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
        <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.2em] mb-3 block">{cur.date}</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-none bg-muted/50 font-bold hover:bg-muted transition-all text-lg group">
              <CalendarIcon className="mr-3 h-6 w-6 text-primary transition-transform group-hover:scale-110" />
              {format(weekStart, "d MMMM yyyy", { locale: dateLocales[language] })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl" align="start">
            <Calendar mode="single" selected={weekStart} onSelect={(d) => d && setWeekStart(d)} className="rounded-3xl" />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic">{cur.weeklyWork}</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{cur.weeklyWorkSub}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
              <Clock className="w-5 h-5" /> {totalHours} <span className="opacity-80 text-sm">{cur.hours.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {DAYS.map((day) => (
          <div key={day} className="group p-8 bg-card border border-border/50 rounded-[3rem] space-y-7 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-colors" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border/50 pb-5 gap-4">
              <span className="font-black text-2xl text-primary uppercase italic tracking-tighter block">{t(`days.${day}`)}</span>
              <div className="bg-muted/50 px-4 py-2 rounded-2xl flex items-center gap-3 w-full sm:w-auto">
                <span className="text-[10px] font-black text-muted-foreground uppercase">{cur.hours}:</span>
                <input
                  type="number" step="0.5" value={weeklyWork[day].hours || ''}
                  onChange={(e) => handleDayHoursChange(day, e.target.value)}
                  className="w-14 bg-transparent text-center font-black text-2xl text-foreground outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                    <UserCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cur.supervisor}</span>
                  </div>
                  <Input
                    value={weeklyWork[day].uitvoerder} placeholder="..."
                    className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg"
                    onChange={(e) => handleUitvoerderChange(day, e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cur.teammates}</span>
                  </div>
                  <div className="space-y-3">
                    {weeklyWork[day].teammates.map((teammate, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={teammate.name} placeholder={cur.name}
                          className="h-12 rounded-2xl bg-muted/20 border-none font-bold flex-1"
                          onChange={(e) => {
                            const newT = [...weeklyWork[day].teammates];
                            newT[idx].name = e.target.value;
                            setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], teammates: newT } }));
                          }}
                        />
                        <Input
                          type="number" placeholder="h"
                          className="w-16 h-12 rounded-2xl bg-muted/20 border-none text-center font-black"
                          onChange={(e) => {
                            const newT = [...weeklyWork[day].teammates];
                            newT[idx].hours = parseFloat(e.target.value) || 0;
                            setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], teammates: newT } }));
                          }}
                        />
                        <Button
                          type="button" variant="ghost" size="icon"
                          onClick={() => removeTeammate(day, idx)}
                          className="text-destructive/40 hover:text-destructive rounded-2xl h-12 w-12"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button" variant="outline" onClick={() => addTeammate(day)}
                      className="w-full h-12 rounded-2xl border-dashed border-2 bg-transparent text-xs font-black uppercase text-muted-foreground"
                    >
                      <Plus className="w-4 h-4 mr-2" /> {cur.addPerson}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">{cur.workDetails}</span>
                  <Textarea
                    value={weeklyWork[day].work} onChange={(e) => handleDayWorkChange(day, e.target.value)}
                    placeholder={cur.workPlaceholder}
                    className="min-h-[120px] rounded-[2rem] bg-muted/30 border-none p-6 font-medium text-lg resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] ml-1">{cur.extraWork}</span>
                  <Textarea
                    value={weeklyWork[day].meerwerk} onChange={(e) => handleDayMeerwerkChange(day, e.target.value)}
                    placeholder={cur.extraWorkPlaceholder}
                    className="min-h-[80px] rounded-2xl bg-primary/5 border-2 border-dashed border-primary/10 p-4 text-sm font-medium resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/30">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cur.location}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <Input
                    value={weeklyWork[day].location} onChange={(e) => handleDayLocationChange(day, e.target.value)}
                    placeholder={cur.locationPlaceholder}
                    className="h-14 rounded-2xl bg-muted/30 border-none font-bold"
                  />
                  <Button
                    type="button" onClick={() => fetchAddress(day)}
                    className={cn("h-14 w-14 rounded-2xl shadow-xl", weeklyWork[day].location ? "bg-green-600" : "bg-primary")}
                    disabled={locatingDay === day}
                  >
                    {locatingDay === day ? <Loader2 className="w-6 h-6 animate-spin" /> : <LocateFixed className="w-6 h-6" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                  <Camera className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cur.photo} {cur.gallery}</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {weeklyWork[day].previews.map((p, i) => (
                    <div key={i} className="relative w-24 h-24 group/img">
                      <img src={p} className="w-full h-full object-cover rounded-[1.5rem] border-4 border-white shadow-xl" />
                      <button
                        type="button" onClick={() => handleRemovePhoto(day, i)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-2 border-2 border-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="relative">
                    <input type="file" id={`file-${day}`} className="hidden" multiple accept="image/*" onChange={(e) => handleDayPhotoUpload(day, e)} />
                    <Button
                      type="button" onClick={() => document.getElementById(`file-${day}`)?.click()}
                      disabled={uploadingDay === day}
                      className="w-24 h-24 rounded-[1.5rem] border-2 border-dashed border-border bg-muted/20 text-muted-foreground flex flex-col items-center justify-center gap-2"
                    >
                      {uploadingDay === day ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Plus className="w-8 h-8" /><span className="text-[10px] font-black uppercase">{cur.add}</span></>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Küçültülmüş Kaydet Butonu */}
      <div className="sticky bottom-4 left-0 right-0 max-w-sm mx-auto px-4 z-20">
        <Button
          type="submit" disabled={loading}
          className="w-full h-14 rounded-full text-lg font-black bg-foreground text-background hover:bg-primary hover:text-white uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5" /> {cur.addActivity}</>}
        </Button>
      </div>
      <LocationPermissionDialog
        open={permissionDialogOpen}
        onOpenChange={setPermissionDialogOpen}
        onRetry={() => retryDay && fetchAddress(retryDay)}
      />
    </form>
  );
}
