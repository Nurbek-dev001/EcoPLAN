import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, StopCircle, Download } from "lucide-react";

export function VideoReportGenerator() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Capture the entire screen for video report
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setProgress(100);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setProgress(0);

      // Simulate progress
      let p = 0;
      const interval = setInterval(() => {
        p += 2;
        if (p >= 95) clearInterval(interval);
        setProgress(p);
      }, 1000);

      // Auto-stop after 60 seconds for demo
      setTimeout(() => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
          clearInterval(interval);
        }
      }, 60000);
    } catch {
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const downloadVideo = useCallback(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecoplan-report-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordedBlob]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase flex items-center gap-2">
          <Film className="h-4 w-4" />
          Видео-отчёт для совета директоров
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Запишите презентацию экрана с дашбордами, 3D-моделью и аналитикой.
        </p>

        {isRecording && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-600 text-xs font-semibold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Идёт запись... {progress}%
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {!recordedBlob ? (
          <Button
            size="sm"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            className="w-full"
          >
            {isRecording ? (
              <>
                <StopCircle className="h-4 w-4 mr-1" /> Остановить запись
              </>
            ) : (
              <>
                <Film className="h-4 w-4 mr-1" /> Начать запись экрана
              </>
            )}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={downloadVideo} className="w-full">
            <Download className="h-4 w-4 mr-1" /> Скачать видео-отчёт
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
