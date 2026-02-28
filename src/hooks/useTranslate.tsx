 import { useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useLanguage, Language } from "./useLanguage";
 
 export function useTranslate() {
   const [translating, setTranslating] = useState(false);
   const { language, t } = useLanguage();
 
   const translate = async (text: string, targetLanguage?: Language): Promise<string | null> => {
     if (!text.trim()) return null;
     
     const target = targetLanguage || language;
     
     setTranslating(true);
     try {
       const { data, error } = await supabase.functions.invoke('translate', {
         body: { text, targetLanguage: target }
       });
 
       if (error) {
         console.error('Translation error:', error);
         toast.error(t('translate.error'));
         return null;
       }
 
       if (data.error) {
         if (data.error.includes('Rate limit')) {
           toast.error(t('translate.rateLimited'));
         } else if (data.error.includes('Payment')) {
           toast.error(t('translate.paymentRequired'));
         } else {
           toast.error(t('translate.error'));
         }
         return null;
       }
 
       return data.translatedText;
     } catch (err) {
       console.error('Translation failed:', err);
       toast.error(t('translate.error'));
       return null;
     } finally {
       setTranslating(false);
     }
   };
 
   return { translate, translating };
 }