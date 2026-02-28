import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Settings, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface LocationPermissionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRetry: () => void;
}

export function LocationPermissionDialog({ open, onOpenChange, onRetry }: LocationPermissionDialogProps) {
    const { t } = useLanguage();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                <div className="bg-destructive/10 p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-lg relative mb-4">
                        <MapPin className="w-8 h-8 text-destructive" />
                        <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1 border-2 border-background">
                            <AlertTriangle className="w-3 h-3 text-white" />
                        </div>
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-foreground tracking-tight">
                            {t('activity.locationPermissionTitle')}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm font-medium text-muted-foreground text-center">
                        {t('activity.locationPermissionDesc')}
                    </p>

                    <div className="bg-muted/50 rounded-2xl p-5 space-y-3 border border-border/50">
                        <div className="flex items-start gap-3">
                            <Settings className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="text-sm font-semibold text-foreground whitespace-pre-line leading-relaxed">
                                {t('activity.locationPermissionSteps')}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl font-bold border-2"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('edit.cancel')}
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-xl font-black bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => {
                                onOpenChange(false);
                                setTimeout(() => onRetry(), 100);
                            }}
                        >
                            {t('activity.tryAgain')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
