"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  BookOpen,
  Brain,
  Zap,
  Clock,
  Send,
  Pause,
  Play,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";

type VoiceOption = "alloy" | "echo" | "fable" | "nova" | "onyx" | "shimmer";

interface ConversationEntry {
  id: string;
  type: "user" | "ai";
  text: string;
  audioUrl?: string;
  subject?: string;
  topic?: string;
  modelUsed?: string;
  complexityLevel?: string;
  timestamp: Date;
}

const VOICE_OPTIONS: { value: VoiceOption; label: string; description: string }[] = [
  { value: "nova", label: "Nova", description: "Warm & friendly" },
  { value: "alloy", label: "Alloy", description: "Balanced & clear" },
  { value: "echo", label: "Echo", description: "Calm & composed" },
  { value: "fable", label: "Fable", description: "Expressive" },
  { value: "onyx", label: "Onyx", description: "Deep & authoritative" },
  { value: "shimmer", label: "Shimmer", description: "Bright & upbeat" },
];

export default function VoiceTutorPage() {
  const { data: session } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [textInput, setTextInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>("nova");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    setAudioLevel(avg / 255);
    animationRef.current = requestAnimationFrame(monitorAudioLevel);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setAudioLevel(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        handleTranscription(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      monitorAudioLevel();
    } catch (err) {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
      formData.append("audio", audioFile);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transcription failed");
      }

      const data = await res.json();
      if (data.text?.trim()) {
        await processQuestion(data.text);
      } else {
        toast.error("Could not detect speech. Please try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to transcribe audio");
    } finally {
      setIsTranscribing(false);
    }
  };

  const processQuestion = async (question: string) => {
    const userEntry: ConversationEntry = {
      id: crypto.randomUUID(),
      type: "user",
      text: question,
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, userEntry]);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, inputMode: "voice" }),
      });

      if (!res.ok) throw new Error("Failed to get AI response");

      const data = await res.json();

      let audioUrl: string | undefined;
      if (autoSpeak) {
        audioUrl = await generateSpeech(data.aiResponse);
      }

      const aiEntry: ConversationEntry = {
        id: crypto.randomUUID(),
        type: "ai",
        text: data.aiResponse,
        audioUrl,
        subject: data.subject,
        topic: data.topic,
        modelUsed: data.modelUsed,
        complexityLevel: data.complexityLevel,
        timestamp: new Date(),
      };
      setConversation((prev) => [...prev, aiEntry]);

      if (audioUrl && autoSpeak) {
        playAudio(audioUrl);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process question");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSpeech = async (text: string): Promise<string | undefined> => {
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });

      if (!res.ok) return undefined;

      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return undefined;
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    audio.onpause = () => {
      if (!audio.ended) setIsPaused(true);
      else setIsSpeaking(false);
    };
    audio.play();
    setIsPaused(false);
  };

  const togglePause = () => {
    if (!audioRef.current) return;
    if (isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    } else {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    const q = textInput;
    setTextInput("");
    await processQuestion(q);
  };

  const speakEntry = async (entry: ConversationEntry) => {
    if (entry.audioUrl) {
      playAudio(entry.audioUrl);
    } else {
      const url = await generateSpeech(entry.text);
      if (url) {
        entry.audioUrl = url;
        playAudio(url);
      }
    }
  };

  const clearConversation = () => {
    stopSpeaking();
    setConversation([]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isActive = isRecording || isTranscribing || isProcessing;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            Voice AI Tutor
          </h1>
          <p className="text-muted text-sm mt-1">
            Speak your doubts and get AI-powered verbal explanations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Voice selector */}
          <div className="hidden sm:flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5">
            <Volume2 className="w-4 h-4 text-muted" />
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value as VoiceOption)}
              className="text-sm bg-transparent outline-none"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} — {v.description}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-speak toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              autoSpeak
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-gray-50 border-border text-muted"
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Auto-speak</span>
          </button>

          {conversation.length > 0 && (
            <button
              onClick={clearConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-danger hover:border-red-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-white mb-4">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 animate-float">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Start a Voice Conversation</h2>
            <p className="text-muted max-w-md mb-8">
              Click the microphone to speak your doubt, or type below.
              The AI tutor will respond with voice and text.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                  <Mic className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm font-medium">Whisper STT</p>
                <p className="text-xs text-muted mt-0.5">OpenAI Whisper converts your speech to text</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-sm font-medium">Smart Routing</p>
                <p className="text-xs text-muted mt-0.5">Auto-routes to GPT-4o Mini, GPT-4.1, or Claude</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                  <Volume2 className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm font-medium">OpenAI TTS</p>
                <p className="text-xs text-muted mt-0.5">Natural voice reads the AI response back</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {conversation.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${entry.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    entry.type === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-gray-50 border border-border rounded-bl-md"
                  }`}
                >
                  {entry.type === "ai" && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">AI Tutor</span>
                      </div>
                      {entry.subject && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          {entry.subject}
                        </span>
                      )}
                      {entry.topic && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-muted rounded-full">
                          {entry.topic}
                        </span>
                      )}
                      {entry.modelUsed && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-0.5">
                          <Zap className="w-3 h-3" />
                          {entry.modelUsed}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-sm leading-relaxed ${
                      entry.type === "user" ? "" : "markdown-content"
                    }`}
                  >
                    {entry.type === "ai"
                      ? entry.text.split("\n").map((line, i) => {
                          if (line.startsWith("## "))
                            return (
                              <h2 key={i} className="text-base font-bold mt-3 mb-1 text-foreground">
                                {line.replace("## ", "")}
                              </h2>
                            );
                          if (line.startsWith("- "))
                            return (
                              <li key={i} className="ml-4 text-sm">
                                {line.replace("- ", "")}
                              </li>
                            );
                          if (line.trim() === "") return <br key={i} />;
                          return <p key={i}>{line}</p>;
                        })
                      : entry.text}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                    <span
                      className={`text-xs ${
                        entry.type === "user" ? "text-white/60" : "text-muted"
                      }`}
                    >
                      {entry.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {entry.type === "ai" && (
                      <button
                        onClick={() => speakEntry(entry)}
                        disabled={isSpeaking}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark disabled:opacity-50 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Listen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(isTranscribing || isProcessing) && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-border rounded-2xl rounded-bl-md p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted">
                      {isTranscribing
                        ? "Transcribing your speech..."
                        : "AI is thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={conversationEndRef} />
          </div>
        )}
      </div>

      {/* Audio playback controls */}
      {isSpeaking && (
        <div className="mb-3 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-border rounded-full px-4 py-2 shadow-sm">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 16}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-primary ml-1">Speaking...</span>
            <button
              onClick={togglePause}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-primary" />
              ) : (
                <Pause className="w-4 h-4 text-primary" />
              )}
            </button>
            <button
              onClick={stopSpeaking}
              className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
            >
              <Square className="w-4 h-4 text-danger" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Record button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || isProcessing}
            className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 scale-110"
                : "bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/30"
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
          >
            {isRecording ? (
              <Square className="w-5 h-5" />
            ) : isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-6 h-6" />
            )}

            {isRecording && (
              <>
                <span
                  className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping"
                  style={{ opacity: audioLevel * 0.8 }}
                />
                <span
                  className="absolute -inset-1 rounded-full border-2 border-red-300 animate-ping"
                  style={{ animationDelay: "0.3s", opacity: audioLevel * 0.5 }}
                />
              </>
            )}
          </button>

          {isRecording ? (
            <div className="flex-1 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-600">
                  Recording {formatTime(recordingTime)}
                </span>
              </div>

              {/* Waveform visualization */}
              <div className="flex-1 flex items-center justify-center gap-0.5 h-10">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full transition-all duration-100"
                    style={{
                      height: `${4 + audioLevel * 36 * Math.sin((i / 30) * Math.PI) * (0.5 + Math.random() * 0.5)}px`,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Stop
              </button>
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your question here..."
                disabled={isActive}
                className="flex-1 px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isActive}
                className="p-3 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3" /> Whisper STT
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" /> Smart Model Routing
          </span>
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> OpenAI TTS ({selectedVoice})
          </span>
        </div>
      </div>
    </div>
  );
}
