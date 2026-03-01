import { useState, useMemo } from "react";
import { format, addDays, getWeek } from "date-fns";
import jsPDF from "jspdf";
import { tr, nl, enUS, arSA } from "date-fns/locale";
import { CalendarDays, ChevronDown, Pencil, Trash2, Loader2, Share2, MapPin, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { EditActivityDialog } from "./EditActivityDialog";
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const dateLocales: Record<Language, typeof nl> = { tr, en: enUS, nl, ar: arSA };
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActivityCard({ activity, onDelete, onUpdate, onDeletePhoto, onUploadPhotos, onRefetch, canEdit }: { activity: any, onDelete: any, onUpdate: any, onDeletePhoto: any, onUploadPhotos: any, onRefetch: any, canEdit: boolean }) {
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const labels = useMemo(() => ({
    report: t("activity.workReport"),
    opsteller: t("activity.preparedBy"),
    uitvoerder: t("activity.supervisor"),
    period: t("activity.period"),
    day: t("activity.day"),
    desc: t("activity.description"),
    meerwerk: t("activity.extraWork"),
    locatie: t("activity.location"),
    hours: t("activity.hours"),
    send: t("activity.send"),
    edit: t("activity.edit"),
    delete: t("activity.delete"),
    total: t("activity.total"),
    monday: t("days.monday"),
    tuesday: t("days.tuesday"),
    wednesday: t("days.wednesday"),
    thursday: t("days.thursday"),
    friday: t("days.friday"),
    saturday: t("days.saturday"),
    confirmDeleteTitle: language === 'tr' ? 'Raporu Sil' : language === 'nl' ? 'Rapport Verwijderen' : 'Delete Report',
    confirmDeleteDesc: language === 'tr' ? 'Bu raporu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.' : language === 'nl' ? 'Weet u zeker dat u dit rapport wilt verwijderen? Dit kan niet ongedaan worden gemaakt.' : 'Are you sure you want to delete this report? This action cannot be undone.',
    cancel: t("edit.cancel")
  }), [t, language]);
  const data = (() => { try { return JSON.parse(activity?.description || "{}"); } catch (e) { return {}; } })();
  const weekNumber = activity?.activity_date ? getWeek(new Date(activity.activity_date), { weekStartsOn: 1 }) : 0;

  // Fotoğrafları PDF için optimize etme
  const getOptimizedImage = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxW = 500;
        const scale = maxW / img.width;
        canvas.width = maxW;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsGenerating(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      let y = 50;
      const pageWidth = 210;
      const col = { day: margin + 2, desc: margin + 22, meer: margin + 95, loc: margin + 135, hours: margin + 175 };

      // DUTCH PDF LABELS (Hardcoded)
      const pdfLabels = {
        report: "WERKRAPPORT",
        opsteller: "Opsteller",
        uitvoerder: "Uitvoerder",
        period: "Periode",
        day: "Dag",
        desc: "Beschrijving",
        meerwerk: "Meerwerk",
        locatie: "Locatie",
        hours: "Uren",
        total: "TOTAAL",
        week: "Week",
        generatedOn: "GEGENEREERD OP"
      };

      // PROFESSIONAL HEADER
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Logo/Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("EA APP", margin, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");


      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(pdfLabels.report.toUpperCase(), pageWidth - margin, 25, { align: 'right' });

      // PROJECT INFO
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(pdfLabels.period.toUpperCase(), margin, y - 4);
      doc.setFont("helvetica", "normal");
      doc.text(`${format(new Date(activity.activity_date), "dd.MM.yyyy", { locale: nl })} - ${format(addDays(new Date(activity.activity_date), 5), "dd.MM.yyyy", { locale: nl })} (${pdfLabels.week} ${weekNumber})`, margin, y);

      doc.setFont("helvetica", "bold");
      doc.text(pdfLabels.opsteller.toUpperCase(), margin + 70, y - 4);
      doc.setFont("helvetica", "normal");
      doc.text(activity?.profile?.full_name || "-", margin + 70, y);

      const firstDay = Object.values(data?.days || {})[0] as unknown;
      const firstDayRecord = firstDay as Record<string, string>;
      doc.setFont("helvetica", "bold");
      doc.text(pdfLabels.uitvoerder.toUpperCase(), margin + 130, y - 4);
      doc.setFont("helvetica", "normal");
      doc.text(firstDayRecord?.uitvoerder || "-", margin + 130, y);

      y += 15;

      // TABLE HEADER
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.rect(margin, y, 180, 10, 'F');
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.line(margin, y, margin + 180, y);
      doc.line(margin, y + 10, margin + 180, y + 10);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(pdfLabels.day.toUpperCase(), col.day, y + 6.5);
      doc.text(pdfLabels.desc.toUpperCase(), col.desc, y + 6.5);
      doc.text(pdfLabels.meerwerk.toUpperCase(), col.meer, y + 6.5);
      doc.text(pdfLabels.locatie.toUpperCase(), col.loc, y + 6.5);
      doc.text(pdfLabels.hours.toUpperCase(), col.hours, y + 6.5, { align: 'right' });

      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);

      // nl date-fns day names
      const nlDays: Record<string, string> = {
        monday: "Maandag",
        tuesday: "Dinsdag",
        wednesday: "Woensdag",
        thursday: "Donderdag",
        friday: "Vrijdag",
        saturday: "Zaterdag"
      };

      for (const dayKey of DAYS) {
        const entry = data?.days?.[dayKey];
        if (!entry || (!entry.work && !entry.hours)) continue;

        const dLines = doc.splitTextToSize(entry.work || "-", 70);
        const mLines = doc.splitTextToSize(entry.meerwerk || "-", 35);
        const lLines = doc.splitTextToSize(entry.location || "-", 35);

        const rowH = Math.max(15, dLines.length * 5 + 6, mLines.length * 5 + 6);
        if (y + rowH > 270) {
          doc.addPage();
          y = 20;
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, 180, 10, 'F');
          y += 10;
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + rowH, margin + 180, y + rowH);

        doc.setFont("helvetica", "bold");
        doc.text(nlDays[dayKey].toUpperCase(), col.day, y + 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(dLines, col.desc, y + 8);

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(mLines, col.meer, y + 8);
        doc.text(lLines, col.loc, y + 8);

        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.text(`${entry.hours}H`, col.hours, y + 8, { align: 'right' });

        y += rowH;

        // HIGH QUALITY PHOTO GRID
        const dayPhotos = activity?.photos?.filter((p: { day: string }) => p.day === dayKey);
        if (dayPhotos?.length > 0) {
          y += 5;
          let xImg = col.desc;
          const imgSize = 35;
          const spacing = 5;

          for (const photo of dayPhotos) {
            if (y + imgSize > 275) { doc.addPage(); y = 20; xImg = col.desc; }
            try {
              const imgData = await getOptimizedImage(photo.file_url);
              doc.setDrawColor(226, 232, 240);
              doc.rect(xImg - 0.5, y - 0.5, imgSize + 1, imgSize + 1); // Photo Border
              doc.addImage(imgData, 'JPEG', xImg, y, imgSize, imgSize);
              xImg += imgSize + spacing;
              if (xImg + imgSize > col.hours + 5) { xImg = col.desc; y += imgSize + spacing; }
            } catch (e) { console.error("PDF: Photo error", e); }
          }
          y += (xImg === col.desc) ? 10 : imgSize + 10;
        }
      }

      // TOTAL SUMMARY
      y += 10;
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFillColor(241, 245, 249);
      doc.rect(margin + 120, y, 60, 15, 'F');
      doc.setDrawColor(30, 41, 59);
      doc.line(margin + 120, y, margin + 180, y);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(pdfLabels.total.toUpperCase(), margin + 125, y + 9.5);
      doc.setFontSize(14);
      doc.text(`${data?.totalHours || 0} UREN`, margin + 175, y + 10, { align: 'right' });

      // FOOTER
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`EA APP - OFFICIEEL WERKRAPPORT - PAGINA ${i} VAN ${pageCount}`, pageWidth / 2, 285, { align: 'center' });
        doc.text(`${pdfLabels.generatedOn}: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: nl })}`, margin, 285);
      }

      // FINALIZING
      const fileName = `Werkrapport_Week${weekNumber}_${activity?.profile?.full_name?.replace(/ /g, '_') || 'Rapport'}.pdf`;
      const pdfBlob = doc.output('blob');

      if (Capacitor.isNativePlatform()) {
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(pdfBlob);
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error("Failed to read blob"));
            }
          };
          reader.onerror = reject;
        });
        const base64 = base64data.split(',')[1];

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache
        });

        await Share.share({
          title: pdfLabels.report,
          url: savedFile.uri,
          dialogTitle: pdfLabels.report
        });
      } else {
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: pdfLabels.report });
        } else {
          doc.save(fileName);
        }
      }
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast.error(t("activity.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card rounded-[2.5rem] border border-border/40 mb-8 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 group">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-8 cursor-pointer flex justify-between items-center bg-gradient-to-br from-white to-muted/30 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-primary p-4 rounded-2xl text-white shadow-lg shadow-primary/20 transition-transform group-hover:rotate-3">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{t('activity.week')} {weekNumber}</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{activity?.profile?.full_name || "-"}</span>
            </div>
            <p className="font-black text-foreground text-2xl tracking-tight">
              {activity?.activity_date ? format(new Date(activity.activity_date), "MMMM yyyy", { locale: dateLocales[language] || nl }) : '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{labels.hours}</span>
            <span className="font-black text-foreground text-3xl tabular-nums">{data?.totalHours || 0}</span>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <ChevronDown className={cn("w-6 h-6 transition-transform duration-500", isExpanded && "rotate-180")} />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-8 pt-0 space-y-8 animate-in slide-in-from-top-4 duration-500">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-[2rem] border border-border/50">
            <div className="flex items-center gap-3">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setEditDialogOpen(true); }}
                  className="rounded-xl font-black bg-white h-11 px-5 text-[11px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" /> {labels.edit}
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
                  className="rounded-xl font-black text-destructive h-11 px-5 text-[11px] uppercase tracking-widest hover:bg-destructive/10 transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> {labels.delete}
                </Button>
              )}
            </div>
            <Button
              disabled={isGenerating}
              onClick={handleShare}
              className="bg-foreground text-background rounded-xl h-12 px-8 font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-primary hover:text-white active:scale-95 transition-all w-full sm:w-auto flex items-center justify-center group/btn"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Share2 className="w-4 h-4 mr-2 transition-transform group-hover/btn:scale-125" />
              )}
              {labels.send}
            </Button>
          </div>

          {/* Days Grid */}
          <div className="space-y-4">
            {DAYS.map((day) => {
              const entry = data?.days?.[day];
              if (!entry?.work && !entry?.hours) return null;

              const dayPhotos = activity?.photos?.filter((p: { day: string }) => p.day === day);

              return (
                <div key={day} className="bg-white rounded-3xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow relative group/day overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-muted/20 group-hover/day:bg-primary/40 transition-colors" />

                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <span className="font-black text-primary text-xs uppercase tracking-[0.2em] italic">{labels[day]}</span>
                      {entry.location && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                          <MapPin className="w-3 h-3" /> {entry.location}
                        </div>
                      )}
                    </div>
                    <div className="bg-muted/50 px-4 py-1.5 rounded-full text-[11px] font-black border border-border/30 text-foreground shadow-inner">
                      {entry.hours}H
                    </div>
                  </div>

                  <p className="text-base text-foreground/80 font-medium mb-4 leading-relaxed pl-1 border-l-2 border-border/20">
                    {entry.work}
                  </p>

                  {entry.meerwerk && (
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-4 text-sm text-primary font-medium animate-in fade-in slide-in-from-left-2 duration-300">
                      <span className="font-black text-[10px] uppercase tracking-widest block mb-2 opacity-60 italic">{labels.meerwerk}</span>
                      {entry.meerwerk}
                    </div>
                  )}

                  {/* Day Photos Grid */}
                  {dayPhotos?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {dayPhotos.map((photo: { file_url: string }, i: number) => (
                        <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-lg flex-shrink-0 group/photo hover:scale-110 transition-transform cursor-pointer">
                          <img
                            src={photo.file_url}
                            alt={`Preview ${i}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {entry.uitvoerder && (
                    <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3 h-3" />
                        {labels.uitvoerder}: <span className="text-foreground">{entry.uitvoerder}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EditActivityDialog
        activity={activity}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={async (id, updateData) => {
          const res = await onUpdate(id, updateData);
          if (res) onRefetch();
          return res;
        }}
        onDeletePhoto={onDeletePhoto}
        onUploadPhotos={onUploadPhotos}
        onRefetch={onRefetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={e => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {labels.confirmDeleteDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={e => e.stopPropagation()}>{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onDelete(activity.id);
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {labels.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
