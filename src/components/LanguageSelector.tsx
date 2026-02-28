import { useLanguage, languages, Language } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      {/* Ok işareti (Chevron) olmayan, tertemiz tetikleyici */}
      <SelectTrigger className="w-[80px] h-11 px-0 rounded-2xl border-slate-200 bg-white shadow-sm hover:shadow-md transition-all focus:ring-0 [&>svg]:hidden">
        <SelectValue>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl leading-none">{languages[language]?.flag || "🌐"}</span>
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
              {language}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>

      {/* İçindeki Tik (Check) ikonu kaldırılmış liste */}
      <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-1 min-w-[90px]">
        {(Object.entries(languages) as [Language, { name: string; flag: string }][]).map(
          ([code, { flag }]) => (
            <SelectItem 
              key={code} 
              value={code} 
              // check iconunu gizlemek için CSS sınıfı
              className="rounded-xl cursor-pointer py-3 px-2 focus:bg-slate-100 [&>span:first-child]:hidden"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl">{flag}</span>
                <span className={`text-sm uppercase ${language === code ? 'font-black text-blue-600' : 'font-bold text-slate-600'}`}>
                  {code}
                </span>
              </div>
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}
