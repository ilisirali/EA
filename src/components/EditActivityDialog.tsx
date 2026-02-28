import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Clock, MapPin, Users, UserPlus, X, Image, Upload, Trash2, LocateFixed, Camera, Plus, UserCheck, Calendar as CalendarIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { nl, tr, enUS, arSA } from "date-fns/locale";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { Activity, ActivityPhoto } from "@/hooks/useActivities";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const dateLocales: Record<Language, typeof nl> = { tr, en: enUS, nl, ar: arSA };

interface Teammate {
  name: string;
  hours: number;
}

interface DayEntry {
  work: string;
  meerwerk: string;
  location: string;
  googleMapsUrl?: string;
  hours: number;
  teammates: Teammate[];
  uitvoerder: string;
}

interface WeeklyWork {
  monday: DayEntry;
  tuesday: DayEntry;
  wednesday: DayEntry;
  thursday: DayEntry;
  friday: DayEntry;
  saturday: DayEntry;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function getPhotosForDay(photos: ActivityPhoto[] | undefined, day: string): ActivityPhoto[] {
  return photos ? photos.filter(p => p.day === day) : [];
}

const emptyDay = (): DayEntry => ({
  work: '', meerwerk: '', location: '', googleMapsUrl: '', hours: 0, teammates: [{ name: '', hours: 0 }], uitvoerder: ''
});

interface EditActivityDialogProps {
  activity: Activity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: { description: string; location?: string; date?: Date }) => Promise<boolean>;
  onDeletePhoto: (photoId: string) => Promise<boolean>;
  onUploadPhotos: (activityId: string, photos: File[], day?: string) => Promise<boolean>;
  onRefetch: () => void;
}

function parseDescription(description: string): { type: 'weekly' | 'simple'; days?: WeeklyWork; text?: string } {
  try {
    const parsed = JSON.parse(description);
    if (parsed.type === 'weekly' && parsed.days) {
      const days = parsed.days as WeeklyWork;
      DAYS.forEach(day => {
        if (days[day]) {
          if (!days[day].meerwerk) days[day].meerwerk = '';
          if (!days[day].teammates) days[day].teammates = [{ name: '', hours: 0 }];
          if (!days[day].uitvoerder) days[day].uitvoerder = '';
        }
      });
      return { type: 'weekly', days };
    }
  } catch {
    /* empty */
  }
  return { type: 'simple', text: description };
}

export function EditActivityDialog({ activity, open, onOpenChange, onSave, onDeletePhoto, onUploadPhotos, onRefetch }: EditActivityDialogProps) {
  const { t, language } = useLanguage(); // language bilgisini aldık
  const [loading, setLoading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadingDay, setUploadingDay] = useState<string | null>(null);
  const [locatingDay, setLocatingDay] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadDay, setCurrentUploadDay] = useState<string | undefined>(undefined);

  // Yerel Çeviri Objesi (Dosya içi hızlı çözüm)
  const ui = useMemo(() => ({
    hours: t("activity.hours").toUpperCase(),
    cancel: t("edit.cancel"),
    save: t("activity.save").toUpperCase(),
    add: t("activity.add").toUpperCase(),
    uitvoerder: t("activity.supervisor"),
    placeholder: t("form.personName"),
    workPlaceholder: t("days.workPlaceholder")
  }), [t]);

  const parsedDesc = parseDescription(activity.description);
  const isWeekly = parsedDesc.type === 'weekly';

  const [weeklyWork, setWeeklyWork] = useState<WeeklyWork>(() => {
    if (isWeekly && parsedDesc.days) return parsedDesc.days;
    return { monday: emptyDay(), tuesday: emptyDay(), wednesday: emptyDay(), thursday: emptyDay(), friday: emptyDay(), saturday: emptyDay() };
  });

  const [simpleText, setSimpleText] = useState(parsedDesc.text || '');
  const [location, setLocation] = useState(activity.location || '');
  const [activityDate, setActivityDate] = useState<Date>(() => new Date(activity.activity_date));

  useEffect(() => {
    // Sadece Dialog açıldığında (ilk renderda veya open true olduğunda) çalışır.
    // Böylece resim yükledikten sonra (activity prop güncellendiğinde) kullanıcının
    // yazdığı mevcut metinler/veriler sıfırlanmaz.
    if (open) {
      const parsed = parseDescription(activity.description);
      if (parsed.type === 'weekly' && parsed.days) {
        setWeeklyWork(parsed.days);
      } else {
        setSimpleText(parsed.text || '');
      }
      setLocation(activity.location || '');
      setActivityDate(new Date(activity.activity_date));
    }
  }, [open, activity.id, activity.description, activity.location, activity.activity_date]); // DİKKAT: activity'nin photos vb. alanları prop'ta direkt render olduğu için statelere gerek yok.

  const fetchAddress = async (day: keyof WeeklyWork) => {
    if (!navigator.geolocation) return toast.error("GPS desteklenmiyor.");
    setLocatingDay(day);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const gMaps = `https://www.google.com/maps?q=${lat},${lon}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, {
          headers: { 'Accept-Language': language }
        });
        const data = await res.json();
        const street = data.address.road || data.address.pedestrian || data.address.suburb || "";
        const houseNum = data.address.house_number ? ` No:${data.address.house_number}` : "";
        const city = data.address.city || data.address.town || "";
        const finalAddr = `${street}${houseNum} ${city}`.trim();

        setWeeklyWork(prev => ({
          ...prev, [day]: { ...prev[day], location: finalAddr || "Konum Belirlendi", googleMapsUrl: gMaps }
        }));
        toast.success("Adres güncellendi.");
      } catch (e) {
        setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], googleMapsUrl: gMaps } }));
        toast.error("Adres ismi çözülemedi.");
      } finally {
        setLocatingDay(null);
      }
    }, (error) => {
      setLocatingDay(null);
      if (error.code === error.PERMISSION_DENIED) {
        alert(t("activity.locationPermissionRequired") || "Konum izni reddedildi. Lütfen cihazınızın konum özelliğini açın ve tarayıcı ayarlarından bu siteye konum izni verin.");
      } else {
        toast.error(t("auth.error") || "Konum alınamadı.");
      }
    });
  };

  const handleDayChange = (day: keyof WeeklyWork, field: keyof DayEntry, value: string | number) => {
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleTeammateChange = (day: keyof WeeklyWork, index: number, field: keyof Teammate, value: string | number) => {
    setWeeklyWork(prev => {
      const newTeammates = [...(prev[day].teammates || [])];
      newTeammates[index] = { ...newTeammates[index], [field]: value };
      return { ...prev, [day]: { ...prev[day], teammates: newTeammates } };
    });
  };

  const addTeammate = (day: keyof WeeklyWork) => {
    setWeeklyWork(prev => ({ ...prev, [day]: { ...prev[day], teammates: [...(prev[day].teammates || []), { name: '', hours: 0 }] } }));
  };

  const removeTeammate = (day: keyof WeeklyWork, index: number) => {
    setWeeklyWork(prev => ({
      ...prev, [day]: { ...prev[day], teammates: prev[day].teammates.filter((_, i) => i !== index) }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let description: string;
      const totalHours = isWeekly ? DAYS.reduce((sum, day) => sum + (weeklyWork[day]?.hours || 0), 0) : 0;
      if (isWeekly) {
        description = JSON.stringify({ type: 'weekly', days: weeklyWork, totalHours });
      } else {
        description = simpleText;
      }
      const success = await onSave(activity.id, { description, location, date: activityDate });
      if (success) onOpenChange(false);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] rounded-[2.5rem] p-0 border-none shadow-2xl bg-background flex flex-col overflow-hidden">
        <DialogHeader className="p-8 pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl font-black text-primary tracking-tight uppercase italic">{t('edit.title')}</DialogTitle>
        </DialogHeader>

        <input
          type="file"
          title="Upload photo"
          ref={fileInputRef}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            setUploadingDay(currentUploadDay || '__simple__');
            const success = await onUploadPhotos(activity.id, files, currentUploadDay);
            if (success) {
              onRefetch();
            }
            setUploadingDay(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          accept="image/*"
          multiple
          className="hidden"
        />

        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8 custom-scrollbar">
          {/* Date Selection Section (Same as Creation) */}
          <div className="bg-card p-6 rounded-[2rem] border border-border mt-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.2em] mb-3 block">{t('form.date')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-none bg-muted/50 font-bold hover:bg-muted transition-all text-lg group">
                  <CalendarIcon className="mr-3 h-6 w-6 text-primary transition-transform group-hover:scale-110" />
                  {format(activityDate, "d MMMM yyyy", { locale: dateLocales[language] })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl" align="start">
                <Calendar mode="single" selected={activityDate} onSelect={(d) => d && setActivityDate(d)} className="rounded-3xl" />
              </PopoverContent>
            </Popover>
          </div>

          {isWeekly ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-primary/10 p-6 rounded-[2rem] border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className="font-black text-primary uppercase tracking-tight text-xl">{t('form.weeklyWork')}</span>
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest leading-none mt-1">Haftalık toplam mesai</p>
                  </div>
                </div>
                <div className="bg-primary text-white px-6 py-2 rounded-2xl font-black text-xl shadow-lg shadow-primary/20">
                  {DAYS.reduce((sum, day) => sum + (weeklyWork[day]?.hours || 0), 0)} <span className="opacity-80 text-sm uppercase">{ui.hours}</span>
                </div>
              </div>

              {DAYS.map((day) => (
                <div key={day} className="p-8 bg-card border border-border/50 rounded-[3rem] space-y-7 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 relative overflow-hidden group/card">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover/card:bg-primary transition-colors" />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border/50 pb-5 gap-4">
                    <span className="font-black text-2xl text-primary uppercase italic tracking-tighter">{t(`days.${day}`)}</span>
                    <div className="bg-muted/50 px-4 py-2 rounded-2xl flex items-center gap-3 w-full sm:w-auto">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">{ui.hours}:</span>
                      <input
                        type="number"
                        step="0.5"
                        title={ui.hours}
                        value={weeklyWork[day]?.hours || ''}
                        onChange={(e) => handleDayChange(day, 'hours', parseFloat(e.target.value) || 0)}
                        className="w-14 bg-transparent text-center font-black text-2xl text-foreground outline-none focus:text-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: SUPERVISOR & TEAM */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                          <UserCheck className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{ui.uitvoerder}</span>
                        </div>
                        <Input
                          value={weeklyWork[day]?.uitvoerder || ''}
                          onChange={(e) => handleDayChange(day, 'uitvoerder', e.target.value)}
                          placeholder={`${ui.uitvoerder}...`}
                          className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg focus:bg-muted/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                          <Users className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('form.teammates')}</span>
                        </div>
                        <div className="space-y-3">
                          {(weeklyWork[day]?.teammates || [{ name: '', hours: 0 }]).map((teammate, idx) => (
                            <div key={idx} className="flex gap-2 group/person">
                              <Input value={teammate.name} onChange={(e) => handleTeammateChange(day, idx, 'name', e.target.value)} placeholder={ui.placeholder} className="h-12 rounded-2xl bg-muted/20 border-none font-bold flex-1" />
                              <Input type="number" step="0.5" value={teammate.hours || ''} onChange={(e) => handleTeammateChange(day, idx, 'hours', parseFloat(e.target.value) || 0)} className="w-16 h-12 rounded-2xl bg-muted/20 border-none text-center font-black" />
                              {(weeklyWork[day]?.teammates?.length || 1) > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeTeammate(day, idx)} className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-2xl h-12 w-12 transition-colors"><X className="w-5 h-5" /></Button>
                              )}
                            </div>
                          ))}
                          <Button variant="outline" onClick={() => addTeammate(day)} className="w-full h-12 rounded-2xl border-dashed border-2 bg-transparent text-xs font-black uppercase text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 tracking-widest transition-all">
                            <UserPlus className="w-4 h-4 mr-2" /> {t('form.addPerson')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: WORK & MEERWERK */}
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Çalışma Detayları</span>
                        <Textarea
                          value={weeklyWork[day]?.work || ''}
                          onChange={(e) => handleDayChange(day, 'work', e.target.value)}
                          placeholder={ui.workPlaceholder}
                          className="min-h-[120px] rounded-[2rem] bg-muted/30 border-none p-6 font-medium text-lg focus:bg-muted/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] ml-1">İlave İşler (Meerwerk)</span>
                        <Textarea
                          value={weeklyWork[day]?.meerwerk || ''}
                          onChange={(e) => handleDayChange(day, 'meerwerk', e.target.value)}
                          placeholder="Meerwerk..."
                          className="min-h-[80px] rounded-2xl bg-primary/5 border-2 border-dashed border-primary/10 p-4 text-sm font-medium focus:bg-primary/10 transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/30">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Konum</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className="relative flex-1 group/loc">
                          <Input
                            value={weeklyWork[day]?.location || ''}
                            onChange={(e) => handleDayChange(day, 'location', e.target.value)}
                            className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-foreground focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <Button type="button" onClick={() => fetchAddress(day)} disabled={locatingDay === day} className={cn("h-14 w-14 rounded-2xl shadow-xl transition-all active:scale-95", weeklyWork[day]?.location ? "bg-green-600 hover:bg-green-700 text-white" : "bg-primary text-white")}>
                          {locatingDay === day ? <Loader2 className="w-6 h-6 animate-spin" /> : <LocateFixed className="w-6 h-6" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('activity.photo')} Galeri</span>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {getPhotosForDay(activity.photos, day).map((photo, pIdx) => (
                          <div key={pIdx} className="relative w-24 h-24 group/img">
                            <img src={photo.file_url} alt="Activity photo" className="w-full h-full object-cover rounded-[1.5rem] border-4 border-white shadow-xl group-hover/img:scale-105 transition-transform" />
                            <button type="button" onClick={async () => {
                              setDeletingPhotoId(photo.id);
                              if (await onDeletePhoto(photo.id)) onRefetch();
                              setDeletingPhotoId(null);
                            }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-2 shadow-xl border-2 border-white scale-100 transition-transform active:scale-90">
                              {deletingPhotoId === photo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            </button>
                          </div>
                        ))}
                        <Button type="button" disabled={uploadingDay === day} onClick={() => { setCurrentUploadDay(day); fileInputRef.current?.click(); }} className="w-24 h-24 rounded-[1.5rem] border-2 border-dashed border-border bg-muted/20 text-muted-foreground flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300">
                          {uploadingDay === day ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8" />}
                          <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">Ekle</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Açıklama</span>
                <Textarea value={simpleText} onChange={(e) => setSimpleText(e.target.value)} className="min-h-[200px] rounded-[2rem] bg-muted/20 border-none p-8 text-lg font-medium resize-none focus:bg-muted/30 transition-all" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground/60 ml-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Genel Konum</span>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} className="pl-14 h-16 rounded-[1.5rem] bg-muted/30 border-none text-lg font-bold" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t flex justify-end gap-4 rounded-b-[2.5rem] flex-shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-10">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="font-bold h-14 px-8 rounded-2xl hover:bg-slate-200 uppercase text-xs">{ui.cancel}</Button>
          <Button onClick={handleSave} disabled={loading} className="font-black h-14 px-12 rounded-2xl shadow-xl bg-primary hover:bg-primary/90 text-white text-lg">
            {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />}
            {ui.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
