import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from './useLanguage';
import { useAuth } from './useAuth';

// Global translation cache
const translationCache: Record<string, Record<string, string>> = {};

// Global request queue to prevent rate limiting
let requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2500;

// Circuit breaker: stop trying after consecutive failures
let consecutiveFailures = 0;
const MAX_FAILURES = 3;
let circuitOpenUntil = 0;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;

  // Circuit breaker: if too many failures, stop for 60 seconds
  if (consecutiveFailures >= MAX_FAILURES && Date.now() < circuitOpenUntil) {
    requestQueue = [];
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    if (consecutiveFailures >= MAX_FAILURES && Date.now() < circuitOpenUntil) {
      requestQueue = [];
      break;
    }

    const timeSinceLastRequest = Date.now() - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      lastRequestTime = Date.now();
      await nextRequest();
    }
  }

  isProcessingQueue = false;
}

export function useAutoTranslate(text: string, enabled: boolean = true) {
  const { language } = useLanguage();
  const { session } = useAuth();
  const [translatedText, setTranslatedText] = useState(text);
  const [translating, setTranslating] = useState(false);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !text?.trim() || !session) {
      setTranslatedText(text);
      return;
    }

    const cacheKey = text.slice(0, 100);

    // Check cache first
    if (translationCache[cacheKey]?.[language]) {
      setTranslatedText(translationCache[cacheKey][language]);
      return;
    }

    // Generate unique request ID
    const currentRequestId = ++requestIdRef.current;
    setTranslating(true);

    const translateText = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('translate', {
          body: { text, targetLanguage: language }
        });

        if (!mountedRef.current || currentRequestId !== requestIdRef.current) return;

        if (!error && data?.translatedText) {
          consecutiveFailures = 0; // Reset on success
          if (!translationCache[cacheKey]) {
            translationCache[cacheKey] = {};
          }
          translationCache[cacheKey][language] = data.translatedText;
          setTranslatedText(data.translatedText);
        } else {
          consecutiveFailures++;
          if (consecutiveFailures >= MAX_FAILURES) {
            circuitOpenUntil = Date.now() + 60000; // Pause for 60s
          }
          setTranslatedText(text);
        }
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_FAILURES) {
          circuitOpenUntil = Date.now() + 60000;
        }
        if (mountedRef.current && currentRequestId === requestIdRef.current) {
          setTranslatedText(text);
        }
      } finally {
        if (mountedRef.current && currentRequestId === requestIdRef.current) {
          setTranslating(false);
        }
      }
    };

    // Add to queue instead of calling directly
    requestQueue.push(translateText);
    processQueue();

    const id = requestIdRef.current;
    return () => {
      // Cancel this specific request by incrementing requestId
      requestIdRef.current = id + 1;
    };
  }, [text, language, enabled, session]);

  return { translatedText, translating };
}
