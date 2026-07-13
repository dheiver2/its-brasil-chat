"use client";
import { useState, useRef, useCallback } from "react";

/**
 * Entrada por voz/áudio: grava pelo microfone (MediaRecorder) ou aceita um
 * arquivo de áudio, envia para /api/audio (Whisper do motor Mangaba) e devolve
 * a transcrição via onResult — que cai na caixa de mensagem do chat.
 */
export function VoiceInput({ onResult }: { onResult: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Erro não-bloqueante (alert() congela a aba enquanto o diálogo está aberto).
  const showErr = useCallback((msg: string) => {
    setErr(msg);
    if (errTimerRef.current) clearTimeout(errTimerRef.current);
    errTimerRef.current = setTimeout(() => setErr(""), 5000);
  }, []);

  const transcribe = useCallback(async (blob: Blob, filename: string) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, filename);
      fd.append("language", "pt");
      const res = await fetch("/api/audio", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showErr(data?.error || "Falha ao transcrever o áudio.");
        return;
      }
      const text = (data?.transcription || "").replace(/\s+/g, " ").trim();
      if (text) onResult(text);
      else showErr("Não foi possível entender o áudio.");
    } catch {
      showErr("Erro ao enviar o áudio.");
    } finally {
      setBusy(false);
    }
  }, [onResult, showErr]);

  const startRec = useCallback(async () => {
    if (busy) return;
    let stream: MediaStream;
    try {
      // Timeout: se o pedido de permissão nunca for respondido (navegadores
      // embutidos/quiosque), não deixa o botão pendurado para sempre.
      stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15_000)
        ),
      ]);
    } catch {
      showErr("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
      return;
    }
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      if (blob.size > 0) void transcribe(blob, "gravacao.webm");
    };
    mediaRef.current = mr;
    mr.start();
    setRecording(true);
  }, [busy, transcribe]);

  const stopRec = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (recording) stopRec();
    else void startRec();
  }, [recording, startRec, stopRec]);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void transcribe(f, f.name);
  }, [transcribe]);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
        style={{ display: "none" }}
        onChange={onPickFile}
      />
      <button
        className={`attach-btn voice-btn${recording ? " active listening" : ""}`}
        onClick={toggle}
        type="button"
        disabled={busy}
        aria-label={recording ? "Parar gravação" : "Gravar mensagem de voz"}
        title={busy ? "Transcrevendo…" : recording ? "Clique para parar e transcrever" : "Gravar mensagem por voz"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M5 11a7 7 0 0014 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M12 21v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        {recording && <span className="voice-pulse" />}
      </button>
      <button
        className="attach-btn"
        onClick={() => fileRef.current?.click()}
        type="button"
        disabled={busy || recording}
        aria-label="Enviar arquivo de áudio"
        title="Transcrever um arquivo de áudio (mp3, wav, m4a…)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 18V6l10-2v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
      </button>
      {err && (
        <span
          role="status"
          style={{ color: "#c0392b", fontSize: 12, alignSelf: "center", maxWidth: 220 }}
        >
          {err}
        </span>
      )}
    </>
  );
}
