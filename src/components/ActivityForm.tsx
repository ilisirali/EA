import { useState, useRef } from "react";
import { format } from "date-fns";
import { nl, tr, enUS, arSA } from "date-fns/locale";
import { CalendarIcon, Camera, MapPin, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/hooks/useLanguage";

const dateLocales: Record<Language, typeof nl> = {
  tr: tr,
  en: enUS,
  nl: nl,
  ar: arSA,
};

interface ActivityFormProps {
  onSubmit: (data: {
    description: string;
    location: string;
    date: Date;
    photos: File[];
  }) => Promise<unknown>;
}

export function ActivityForm({ onSubmit }: ActivityFormProps) {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setPhotos(prev => [...prev, ...newFiles]);

      // Create previews synchronously to preserve order
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);

      // Clear input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        description: description.trim(),
        location: location.trim(),
        date,
        photos,
      });

      setDescription("");
      setLocation("");
      setDate(new Date());
      setPhotos([]);
      setPreviews(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('form.whatDidYouDo')}
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
          placeholder={t('form.descriptionPlaceholder')}
          className="min-h-[100px] resize-none"
          maxLength={5000}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('form.location')}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('form.locationPlaceholder')}
            className="pl-9"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('form.date')}
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "d MMMM yyyy", { locale: dateLocales[language] }) : t('form.selectDate')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('form.photos')}
        </label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          accept="image/*"
          multiple
          className="hidden"
        />

        <div className="flex flex-wrap gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative group animate-fade-in">
              <img
                src={preview}
                alt={`${t('form.upload')} ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs mt-1">{t('form.photo')}</span>
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!description.trim() || loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        {t('form.addActivity')}
      </Button>
    </form>
  );
}
