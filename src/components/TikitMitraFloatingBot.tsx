'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Theater, X, Send, Sparkles, MessageSquare, RotateCcw, ChevronRight, ExternalLink, CreditCard, Armchair, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

interface ChatOption {
  label: string;
  value: string;
  type?: 'chat' | 'select_event' | 'select_session' | 'select_seats' | 'checkout_pay' | 'my_tickets' | 'open_seatmap' | 'explore_category';
  payload?: Record<string, any>;
}

interface ChatAction {
  type: 'open_event' | 'select_seats' | 'my_tickets' | 'explore_category' | 'contact_support' | 'checkout_pay' | 'open_seatmap';
  label: string;
  payload?: Record<string, any>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  action?: ChatAction;
  options?: ChatOption[];
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  '🎭 सध्याची लोकप्रिय नाटके कोणती?',
  '🎟️ २ तिकीट बुक करा (Auto Select Seats)',
  '📍 बालगंधर्व रंगमंदिरातील प्रयोग',
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
      text: 'नमस्कार! 🙏 मी **टिकिट मित्र**, महाटिकिटचा अधिकृत AI डिजिटल नाट्य साहाय्यक.\n\nमी आपल्याला नाटक शोधणे, शोची वेळ निवडणे, सर्वोत्तम आसने आरक्षित करणे आणि थेट पेमेंट करण्यात पूर्ण मदत करू शकतो!\n\nआपण आज काय पाहू इच्छिता?',
      options: [
        { label: '🎭 लोकप्रिय नाटके दाखवा', value: 'लोकप्रिय नाटके दाखवा', type: 'chat' },
        { label: '🎟️ तिकीट बुक करा (Auto Seats)', value: 'तिकीट बुक करा', type: 'chat' },
        { label: '📍 बालगंधर्व रंगमंदिर', value: 'बालगंधर्व रंगमंदिर', type: 'chat' },
        { label: '🎟️ माझी तिकिटे पहा', value: 'माझी तिकिटे दाखवा', type: 'my_tickets' },
      ],
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

  const handleSendMessage = async (textToSend?: string, actionPayload?: Record<string, any>) => {
    const text = (textToSend || inputValue).trim();
    if (!text && !actionPayload) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text || actionPayload?.label || 'पुढे जा',
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
          actionPayload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply || 'क्षमस्व, उत्तर देता आले नाही. कृपया पुन्हा प्रयत्न करा.',
          action: data.action,
          options: data.options,
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
    } catch {
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

  const handleOptionClick = (opt: ChatOption) => {
    if (opt.type === 'checkout_pay' && opt.payload) {
      setIsOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tikitmitra_start_checkout', {
            detail: opt.payload,
          })
        );
      }
      return;
    }

    if (opt.type === 'open_seatmap' && opt.payload) {
      setIsOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tikitmitra_open_seatmap', {
            detail: { eventId: opt.payload.eventId, sessionId: opt.payload.sessionId },
          })
        );
      }
      return;
    }

    if (opt.type === 'my_tickets') {
      setIsOpen(false);
      window.location.href = '/my-tickets';
      return;
    }

    handleSendMessage(opt.value, opt.payload ? { type: opt.type, ...opt.payload } : undefined);
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'नमस्कार! 🙏 मी **टिकिटमित्र**, मी आपल्याला नाटक शोधण्यात, सीट निवडण्यात किंवा तिकीट बुक करण्यात कशी मदत करू शकतो?',
        options: [
          { label: '🎭 लोकप्रिय नाटके दाखवा', value: 'लोकप्रिय नाटके दाखवा', type: 'chat' },
          { label: '🎟️ तिकीट बुक करा (Auto Seats)', value: 'तिकीट बुक करा', type: 'chat' },
          { label: '📍 बालगंधर्व रंगमंदिर', value: 'बालगंधर्व रंगमंदिर', type: 'chat' },
          { label: '🎟️ माझी तिकिटे पहा', value: 'माझी तिकिटे दाखवा', type: 'my_tickets' },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const formatText = (text: string) => {
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <>
      {/* Compact round logo FAB — minimal space */}
      <div className="fixed bottom-[76px] md:bottom-6 right-3 sm:right-6 z-30">
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              setIsMinimized(false);
              setIsOpen(true);
            }}
            aria-label="टिकिटमित्र AI उघडा"
            title="टिकिटमित्र AI"
            className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-white hover:bg-orange-50 text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-[#EA580C] p-1.5"
          >
            <TheatreFaceMasksIcon className="h-9 w-9 transition-transform group-hover:scale-105" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 border border-white"></span>
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] max-h-[85vh] h-[600px] bg-white rounded-2xl shadow-2xl border border-orange-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#EA580C] via-[#C2410C] to-[#9A3412] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-amber-300/40">
                <TheatreFaceMasksIcon className="h-5 w-5 drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm leading-tight">टिकिटमित्र AI साहाय्यक</h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-green-500/20 text-green-200 border border-green-400/30">
                    थेट बुकिंग सक्षम
                  </span>
                </div>
                <p className="text-[10px] text-orange-100 font-medium">
                  नाटकाचा शोध, सीट निवड व थेट पेमेंट
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
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-[#EA580C] text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-xs'
                  }`}
                >
                  {formatText(msg.text)}

                  {/* Interactive Options Chips inside AI Chat */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleOptionClick(opt)}
                          disabled={loading}
                          className={`text-left px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                            opt.type === 'checkout_pay'
                              ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 text-white w-full justify-center py-2 text-xs shadow-md animate-pulse'
                              : opt.type === 'select_seats'
                              ? 'bg-orange-50 hover:bg-orange-100 text-[#EA580C] border border-orange-200'
                              : opt.type === 'select_session'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {opt.type === 'checkout_pay' ? (
                            <CreditCard className="w-3.5 h-3.5" />
                          ) : opt.type === 'select_seats' ? (
                            <Armchair className="w-3 h-3 text-[#EA580C]" />
                          ) : opt.type === 'select_session' ? (
                            <Calendar className="w-3 h-3 text-amber-700" />
                          ) : null}
                          <span>{opt.label}</span>
                          {opt.type === 'checkout_pay' && <ChevronRight className="w-4 h-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Direct Action Link */}
                  {msg.action && !msg.options?.some(o => o.type === msg.action?.type) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                      {msg.action.type === 'checkout_pay' && msg.action.payload ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(
                                new CustomEvent('tikitmitra_start_checkout', {
                                  detail: msg.action?.payload,
                                })
                              );
                            }
                          }}
                          className="inline-flex items-center justify-between w-full gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 text-white font-extrabold text-xs transition shadow-md active:scale-95 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4" />
                            <span>{msg.action.label || '💳 आता पैसे भरा (Pay Now)'}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        </button>
                      ) : (msg.action.type === 'open_event' || msg.action.type === 'select_seats') && msg.action.payload?.eventId ? (
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
                          href="/my-tickets"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF7ED] text-[#EA580C] font-bold text-[11px] hover:bg-[#EA580C] hover:text-white transition shadow-2xs cursor-pointer"
                        >
                          <span>{msg.action.label || 'माझी तिकिटे पहा'}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
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
                  टिकिटमित्र सीट माहिती तपासत आहे...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Bar */}
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
              placeholder="उदा. 'नियम व अटी लागू चे २ तिकीट' किंवा शोधा..."
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
