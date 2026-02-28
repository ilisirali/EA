import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useState } from "react";
import { toast } from "sonner";

interface ShareMenuProps {
  onPrint: () => void;
  getShareText: () => string;
  generatePdf: () => Promise<Blob | null>;
  pdfFileName: string;
}

export function ShareMenu({ onPrint, getShareText, generatePdf, pdfFileName }: ShareMenuProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const blob = await generatePdf();
      if (!blob) {
        toast.error("PDF oluşturulamadı");
        return;
      }

      const file = new File([blob], pdfFileName, { type: 'application/pdf' });

      // Use native share sheet if available (mobile & modern browsers)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: t('invoice.weeklyReport'),
          text: getShareText(),
          files: [file],
        });
      } else {
        // Fallback: download the PDF directly
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('invoice.pdfDownloaded'));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast.error("Paylaşım başarısız");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" disabled={loading} onClick={handleShare}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
      {t('invoice.send')}
    </Button>
  );
}
