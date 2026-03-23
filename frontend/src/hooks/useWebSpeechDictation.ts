import { useRef, useState, useCallback, useEffect } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * 浏览器语音听写（中文）。将识别结果写入受控输入：保留开始录制前的文本，并追加识别内容。
 */
export function useWebSpeechDictation(options: {
  /** 开始一次听写时，从该回调取当前输入框全文作为前缀 */
  getText: () => string;
  setText: (value: string) => void;
  /** 为 true 时不启动 */
  disabled?: boolean;
  lang?: string;
}) {
  const { getText, setText, disabled = false, lang = 'zh-CN' } = options;
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const prefixRef = useRef('');
  const finalBufferRef = useRef('');

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (disabled) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError('当前浏览器不支持语音输入，请使用 Chrome / Edge 或手动输入');
      return;
    }
    setSpeechError(null);
    prefixRef.current = getText();
    finalBufferRef.current = '';

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          finalBufferRef.current += piece;
        } else {
          interim += piece;
        }
      }
      const prefix = prefixRef.current;
      const middle = finalBufferRef.current;
      const needsSpace =
        prefix.length > 0 &&
        !/\s$/.test(prefix) &&
        middle.length > 0 &&
        !/^\s/.test(middle);
      const glue = needsSpace ? ' ' : '';
      setText(prefix + glue + middle + interim);
    };

    rec.onerror = (ev) => {
      if (ev.error === 'aborted' || ev.error === 'no-speech') return;
      setSpeechError(
        ev.error === 'not-allowed'
          ? '麦克风权限被拒绝，请在浏览器设置中允许本站使用麦克风'
          : `语音识别错误：${ev.error}`,
      );
      setListening(false);
      recognitionRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setSpeechError('无法启动语音识别');
      setListening(false);
    }
  }, [disabled, getText, setText, lang]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return {
    speechSupported: isSpeechRecognitionSupported(),
    listening,
    speechError,
    setSpeechError,
    startListening,
    stopListening,
    toggleListening,
  };
}
