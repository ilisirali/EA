import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { Loader2 } from 'lucide-react';

interface TranslatedTextProps {
  text: string;
  className?: string;
}

export function TranslatedText({ text, className = '' }: TranslatedTextProps) {
  const { translatedText, translating } = useAutoTranslate(text);

  if (translating) {
    return (
      <span className={`${className} inline-flex items-center gap-1`}>
        <span className="opacity-70">{text}</span>
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      </span>
    );
  }

  return <span className={className}>{translatedText}</span>;
}
