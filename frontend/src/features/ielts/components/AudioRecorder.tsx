import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { toast } from '@/components/ui/toast';

export function AudioRecorder({
  onAudioReady,
  existingAudioUrl,
  maxDurationSeconds = 120,
  disabled = false,
}: {
  onAudioReady?: (blob: Blob, durationSeconds: number) => void;
  existingAudioUrl?: string;
  maxDurationSeconds?: number;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (existingAudioUrl) {
      setAudioUrl(existingAudioUrl);
    }
  }, [existingAudioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.add({
          type: 'error',
          description: t('speaking.micNotSupported', { defaultValue: 'Brauzeringiz ovoz yozishni qo\'llab-quvvatlamaydi' }),
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        if (onAudioReady) {
          onAudioReady(blob, elapsed);
        }
        // Stop all audio tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Mic access error:', err);
      toast.add({
        type: 'error',
        description: t('speaking.micPermissionDenied', { defaultValue: 'Mikrofondan foydalanishga ruxsat berilmadi' }),
      });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const resetRecording = () => {
    setAudioUrl(null);
    setElapsed(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-card gap-3 text-center">
      {audioUrl ? (
        <div className="w-full flex flex-col items-center gap-3 animate-in fade-in">
          <audio controls src={audioUrl} className="w-full max-w-md h-10" />
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetRecording}
              className="gap-2 text-xs font-semibold"
            >
              <Icon icon="lucide:rotate-ccw" className="w-3.5 h-3.5" />
              {t('speaking.rerecord', { defaultValue: 'Qayta yozish' })}
            </Button>
          )}
        </div>
      ) : isRecording ? (
        <div className="flex flex-col items-center gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping inline-block" />
            <span className="text-sm font-bold text-red-600 font-mono tracking-wider">
              {formatTime(elapsed)} / {formatTime(maxDurationSeconds)}
            </span>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-2 text-xs font-semibold shadow-md"
          >
            <Icon icon="lucide:square" className="w-3.5 h-3.5 fill-current" />
            {t('speaking.stopRecord', { defaultValue: 'Yozishni to\'xtatish' })}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled}
            onClick={startRecording}
            className="gap-2 font-semibold text-xs"
          >
            <Icon icon="lucide:mic" className="w-4 h-4" />
            {t('speaking.startRecord', { defaultValue: 'Ovoz yozishni boshlash' })}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {t('speaking.maxDuration', {
              duration: formatTime(maxDurationSeconds),
              defaultValue: `Maksimal davomiyligi: ${formatTime(maxDurationSeconds)}`,
            })}
          </span>
        </div>
      )}
    </div>
  );
}
