'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Theater, X, Send, Sparkles, MessageSquare, RotateCcw, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  action?: {
    type: 'open_event' | 'select_seats' | 'my_tickets' | 'explore_category' | 'contact_support';
    label: string;
    payload?: Record<string, any>;
  };
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  '🎭 सध्याची लोकप्रिय नाटके कोणती?',
  '📍 बालगंधर्व रंगमंदिरातील प्रयोग',
  '🎟️ तिकीट कसे बुक करावे?',
  '💡 महानाट्य महोत्सव ऑफर काय आहे?',
];

// Authentic Theatre Face Masks logo icon
const TheatreFaceMasksIcon = ({ className = 'w-7 h-7' }: { className?: string }) => (
  <img src="/logo.png" alt="टिकिटमित्र" className={`${className} object-contain drop-shadow-sm`} />
);

export function TikitMitraFloatingBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'नमस्कार! 🙏 मी **टिकिट मित्र**, मी आपल्याला नाटक शोधण्यात, वेळेची माहिती देण्यात किंवा तिकीट बुक करण्यात कशी मदत करू शकतो?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        sender: m.sender === 'user' ? ('user' as const) : ('agent' as const),
        text: m.text,
      }));

      const res = await fetch('/api/tikitmitra/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          language: 'mr',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply || 'क्षमस्व, उत्तर देता आले नाही. कृपया पुन्हा प्रयत्न करा.',
          action: data.action,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: data.error || 'क्षमस्व, सध्या संपर्क होऊ शकला नाही. कृपया थोड्या वेळाने प्रयत्न करा.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'इंटरनेट किंवा नेटवर्कमध्ये अडचण आली आहे. कृपया आपले नेटवर्क तपासा.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'नमस्कार! 🙏 मी **टिकिटमित्र**, मी आपल्याला नाटक शोधण्यात किंवा तिकीट बुक करण्यात कशी मदत करू शकतो?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const formatText = (text: string) => {
    // Replace **bold** with <strong>
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <>
      {/* Floating Launcher Button - elevated cleanly above sticky bottom booking bar */}
      <div className="fixed bottom-20 md:bottom-20 right-4 sm:right-6 z-40">
        {!isOpen && (
          <div className="flex items-center gap-1">
            {isMinimized ? (
              <button
                type="button"
                onClick={() => {
                  setIsMinimized(false);
                  setIsOpen(true);
                }}
                aria-label="टिकिटमित्र AI उघडा"
                className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:from-[#C2410C] text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-amber-300/60 p-2"
                title="टिकिटमित्र AI उघडा"
              >
                <TheatreFaceMasksIcon className="h-8 w-8 transition-transform group-hover:scale-110 drop-shadow-sm" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-gradient-to-r from-[#EA580C] via-[#C2410C] to-[#9A3412] p-0.5 pl-0.5 rounded-2xl shadow-[0_8px_25px_rgba(234,88,12,0.45)] border border-amber-400/40">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  aria-label="टिकिटमित्र AI नाट्य मदतनीस उघडा"
                  className="group relative flex items-center gap-2 text-white transition-all transform active:scale-95 cursor-pointer"
                >
                  <div className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-amber-300/60 shrink-0 p-1">
                    <TheatreFaceMasksIcon className="h-7 w-7 transition-transform group-hover:scale-110 drop-shadow-sm" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
                    </span>
                  </div>
                  <div className="flex flex-col text-left leading-none pr-1">
                    <span className="text-[11px] font-bold text-white-200 tracking-tight">
                      टिकिट मित्र
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(true);
                  }}
                  title="लपवा / Minimize (>)"
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer text-xs font-bold mr-0.5"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[410px] max-h-[85vh] h-[580px] bg-white rounded-2xl shadow-2xl border border-orange-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#EA580C] via-[#C2410C] to-[#9A3412] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-amber-300/40">
                <TheatreFaceMasksIcon className="h-5 w-5 drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm leading-tight">टिकिटमित्र AI</h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-green-500/20 text-green-200 border border-green-400/30">
                    सक्रिय
                  </span>
                </div>
                <p className="text-[10px] text-orange-100 font-medium">
                  महाटिकिटचा अधिकृत डिजिटल नाट्य मदतनीस
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="चॅट पुन्हा सुरू करा"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="बंद करा"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                    ? 'bg-[#EA580C] text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-xs'
                    }`}
                >
                  {formatText(msg.text)}

                  {/* Direct Action Link if provided by TikitMitra */}
                  {msg.action && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                      {(msg.action.type === 'open_event' || msg.action.type === 'select_seats') && msg.action.payload?.eventId ? (
                        <Link
                          href={`/events/${msg.action.payload.eventId}?book=true`}
                          onClick={() => {
                            setIsOpen(false);
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(
                                new CustomEvent('tikitmitra_open_seatmap', {
                                  detail: { eventId: msg.action?.payload?.eventId },
                                })
                              );
                            }
                          }}
                          className="inline-flex items-center justify-between w-full gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:from-[#C2410C] hover:to-[#9A3412] text-white font-bold text-xs transition shadow-md active:scale-95 cursor-pointer"
                        >
                          <span className="truncate">{msg.action.label || '🎟️ थेट आसन निवडा व बुक करा'}</span>
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        </Link>
                      ) : msg.action.type === 'my_tickets' ? (
                        <Link
                          href="/tickets"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF7ED] text-[#EA580C] font-bold text-[11px] hover:bg-[#EA580C] hover:text-white transition shadow-2xs cursor-pointer"
                        >
                          <span>{msg.action.label || 'माझी तिकिटे पहा'}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href="/"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF7ED] text-[#EA580C] font-bold text-[11px] hover:bg-[#EA580C] hover:text-white transition shadow-2xs cursor-pointer"
                        >
                          <span>{msg.action.label || 'सर्व प्रयोगांची यादी पहा'}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200/70 text-slate-500 w-fit">
                <div className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-[#EA580C] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#EA580C] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#EA580C] rounded-full animate-bounce"></span>
                </div>
                <span className="text-[11px] font-medium text-slate-600">
                  टिकिटमित्र उत्तर शोधत आहे...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions Strip */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {DEFAULT_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(sug)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 text-[#A33900] text-[10px] font-bold border border-orange-200/50 transition cursor-pointer disabled:opacity-50"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="तुमचा प्रश्न किंवा नाटकाचे नाव लिहा..."
              maxLength={200}
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] text-slate-800 placeholder:text-slate-400 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="p-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white disabled:opacity-40 disabled:hover:bg-[#EA580C] transition shadow-xs cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
