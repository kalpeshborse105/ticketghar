'use client';

import React, { useState, useRef } from 'react';
import { Bold, Palette, Image as ImageIcon, List, Eye, Edit3, Sparkles } from 'lucide-react';

interface RichDescriptionEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
}

export const formatRichDescription = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[color:(#[A-Fa-f0-9]{6})\](.*?)\[\/color\]/g, '<span style="color:$1;font-weight:600">$2</span>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-3 rounded-xl max-h-60 w-full object-cover shadow-sm" />')
    .replace(/\n/g, '<br />');
};

export const RichDescriptionEditor: React.FC<RichDescriptionEditorProps> = ({
  value,
  onChange,
  label = 'मराठी वर्णन (Description):',
  placeholder = 'कार्यक्रमाची माहिती, कथा, मुख्य आकर्षणे...',
  rows = 4,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colors = [
    { label: 'केशरी', hex: '#EA580C', bg: 'bg-[#EA580C]' },
    { label: 'हिरवा', hex: '#16A34A', bg: 'bg-[#16A34A]' },
    { label: 'निळा', hex: '#2563EB', bg: 'bg-[#2563EB]' },
    { label: 'सोनेरी', hex: '#D97706', bg: 'bg-[#D97706]' },
    { label: 'गुलाबी', hex: '#E11D48', bg: 'bg-[#E11D48]' },
  ];

  const insertTextAtCursor = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + before + defaultText + after);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;
    const replacement = before + selectedText + after;
    const nextValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      const nextCursor = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const handleBold = () => {
    insertTextAtCursor('**', '**', 'ठळक मजकूर');
  };

  const handleColor = (hex: string) => {
    insertTextAtCursor(`[color:${hex}]`, '[/color]', 'रंगीत मजकूर');
    setShowColorPicker(false);
  };

  const handleBullet = () => {
    insertTextAtCursor('\n• ', '', 'नवीन मुद्दा');
  };

  const handleInsertImage = () => {
    if (!imageUrlInput.trim()) return;
    const alt = imageAltInput.trim() || 'नाट्य दृश्य';
    insertTextAtCursor(`\n![${alt}](${imageUrlInput.trim()})\n`, '', '');
    setImageUrlInput('');
    setImageAltInput('');
    setShowImagePrompt(false);
  };

  const handleInsertTemplate = () => {
    const template = `**नाट्य परिचय:**
[color:#EA580C]महाराष्ट्रातील अव्वल कलाकारांचा कौटुंबिक व विनोदी महाप्रयोग![/color]

**ठळक वैशिष्ट्ये:**
• २ तास २० मिनिटांचे निखळ मनोरंजन
• ५ सुपरहिट नाट्यसंगीत गीते
• सर्वोत्कृष्ट दिग्दर्शन व प्रकाशयोजना`;
    onChange(value ? `${value}\n\n${template}` : template);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-slate-400 block text-xs font-semibold">{label}</label>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition ${
              activeTab === 'edit'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>संपादित करा</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition ${
              activeTab === 'preview'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>पूर्वावलोकन</span>
          </button>
        </div>
      </div>

      {activeTab === 'edit' ? (
        <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden focus-within:border-amber-500/80 transition-colors">
          {/* Toolbar */}
          <div className="flex items-center flex-wrap gap-1 p-1.5 bg-slate-900/90 border-b border-slate-800 text-slate-300">
            <button
              type="button"
              onClick={handleBold}
              title="ठळक करा (Bold - **मजकूर**)"
              className="p-1.5 rounded-md hover:bg-slate-800 hover:text-amber-400 transition"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Color dropdown trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="रंग निवडा (Color Text)"
                className="p-1.5 rounded-md hover:bg-slate-800 hover:text-amber-400 transition flex items-center gap-1"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold text-amber-400">रंग</span>
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-xl flex items-center gap-1.5">
                  {colors.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleColor(c.hex)}
                      title={c.label}
                      className={`w-5 h-5 rounded-full ${c.bg} border border-white/20 hover:scale-110 transition active:scale-95`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleBullet}
              title="मुद्दे / यादी (Bullet Points)"
              className="p-1.5 rounded-md hover:bg-slate-800 hover:text-amber-400 transition"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowImagePrompt(!showImagePrompt)}
              title="इमेज जोडा (Insert Image)"
              className="p-1.5 rounded-md hover:bg-slate-800 hover:text-amber-400 transition flex items-center gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="text-[10px]">फोटो</span>
            </button>

            <button
              type="button"
              onClick={handleInsertTemplate}
              title="तयार फॉरमॅट वापरा (Insert Sample Format)"
              className="ml-auto px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-bold flex items-center gap-1 transition"
            >
              <Sparkles className="w-3 h-3" />
              <span>खिडकी फॉरमॅट</span>
            </button>
          </div>

          {/* Quick Image Insertion Bar */}
          {showImagePrompt && (
            <div className="p-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="इमेज URL (https://...)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-white text-xs outline-hidden"
              />
              <input
                type="text"
                value={imageAltInput}
                onChange={(e) => setImageAltInput(e.target.value)}
                placeholder="वर्णन"
                className="w-24 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-white text-xs outline-hidden"
              />
              <button
                type="button"
                onClick={handleInsertImage}
                className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
              >
                जोडा
              </button>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent p-3 text-white text-xs leading-relaxed outline-hidden resize-y font-sans"
            placeholder={placeholder}
          />

          <div className="px-3 py-1 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>सपोर्ट: **ठळक**, [color:#रंग]मजकूर[/color], ![alt](url), • मुद्दे</span>
            <span>{value.length} अक्षरे</span>
          </div>
        </div>
      ) : (
        /* Preview Tab */
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 min-h-[120px] max-h-72 overflow-y-auto">
          {value.trim() ? (
            <div
              className="text-xs text-slate-300 leading-relaxed space-y-2 prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formatRichDescription(value) }}
            />
          ) : (
            <p className="text-xs text-slate-500 italic">कोणताही मजकूर प्रविष्ट केलेला नाही.</p>
          )}
        </div>
      )}
    </div>
  );
};
