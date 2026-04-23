import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageCircle, Bot } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

const CONTACT = '01100111618';

function getSmartReply(msg: string): string {
  const m = msg.toLowerCase();

  if (/مرحب|هلو|هاي|السلام|أهلا|اهلا/.test(m)) {
    return `أهلاً وسهلاً! 🏡\nأنا مساعد Great Society العقاري.\nيسعدني مساعدتك في إيجاد عقار أحلامك.\n\nما الذي تبحث عنه؟\n• شقة أم فيلا؟\n• في أي منطقة؟\n• ما هي ميزانيتك؟`;
  }

  if (/طريق السويس|سويس/.test(m)) {
    return `🏠 شقق 3 غرف – طريق السويس\n\n📍 أقوى لوكيشن على طريق السويس مباشرةً\n🏛️ جنب أول جامعة ومستشفى بريطانية في مصر\n\n💰 السعر: تبدأ من 3,200,000 جنيه\n💵 المقدم: 750,000 جنيه\n🏗️ نسبة إنشاءات: 40% على أرض الواقع\n✅ متشطبة بالكامل\n\n📞 للمعاينة والحجز: ${CONTACT}`;
  }

  if (/تجمع سادس|كازار/.test(m)) {
    return `🏢 شقق التجمع السادس – أمام كمبوند الكازار\n\n📍 أفضل موقع في التجمع السادس\n🎓 10 دقائق من الجامعة الأمريكية\n\n💰 الأسعار:\n• غرفة واحدة: 3,000,000 جنيه\n• غرفتان: 4,500,000 جنيه\n💵 المقدم: 300,000 جنيه فقط!\n\n📞 كلمنا دلوقتي: ${CONTACT}`;
  }

  if (/تجمع خامس|تجمع ال5/.test(m)) {
    return `🏘️ عقارات التجمع الخامس – Great Society\n\nلدينا خيارات متعددة:\n\n🏠 شقق 3 غرف:\n• السعر: 12,000,000 جنيه (متوسط)\n• المقدم: 1,200,000 جنيه\n• تقسيط حتى 10 سنوات\n\n🏡 فيلات:\n• السعر: 20,000,000 جنيه (متوسط)\n• المقدم: 2,000,000 جنيه\n\n✅ استلام فوري في أفضل مواقع:\n• النرجس الجديدة\n• النورث هاوس\n• بيت الوطن\n• شمال الرحاب\n\n📞 للتفاصيل: ${CONTACT}`;
  }

  if (/جولدن سكوير|golden square|نادي أهلي|التسعين/.test(m)) {
    return `⭐ شقق جولدن سكوير – فرصة لا تتكرر!\n\n📍 في قلب جولدن سكوير\n🏟️ 600 متر من النادي الأهلي\n🛣️ خطوات من التسعين الجنوبي\n🏬 قريب من الفيوزون وشارع النوادي\n\n💵 المقدم: يبدأ من 1,800,000 جنيه\n📅 تقسيط مريح: حتى 5 سنوات\n🏠 شقة 3 غرف ماستر\n✅ استلام فوري وخلال 6 شهور\n🪟 واجهات مميزة وفيو مفتوح\n\n📞 احجز الآن: ${CONTACT}`;
  }

  if (/عاصمة|r8|العاصمه/.test(m)) {
    return `🏛️ فيلتك بسعر شقة – العاصمة الإدارية R8\n\n🤝 مع أقوى مطور في العاصمة الإدارية\n\n💰 المقدم: 10% فقط!\n💳 القسط الشهري: 60,000 جنيه\n🎁 خصم وسعر الطرح الأول\n⚠️ أسعار لن تتكرر!\n\n📞 للحجز الفوري: ${CONTACT}\n💬 واتساب: wa.me/20${CONTACT}`;
  }

  if (/مقدم|دفعة|دفعه/.test(m)) {
    return `💵 خيارات المقدم المتاحة:\n\n• طريق السويس: مقدم 750,000 ج\n• التجمع السادس: مقدم 300,000 ج فقط!\n• التجمع الخامس (شقق): مقدم 1,200,000 ج\n• التجمع الخامس (فيلات): مقدم 2,000,000 ج\n• جولدن سكوير: مقدم 1,800,000 ج\n• العاصمة الإدارية R8: مقدم 10% فقط!\n\nأي منطقة تهمك أكثر؟ 📞 ${CONTACT}`;
  }

  if (/قسط|تقسيط|أقساط/.test(m)) {
    return `📅 خطط التقسيط المتاحة:\n\n• التجمع الخامس: تقسيط حتى 10 سنوات\n• جولدن سكوير: تقسيط حتى 5 سنوات\n• العاصمة الإدارية: قسط شهري 60,000 جنيه\n• التجمع السادس: مقدم 300,000 ج وأقساط مريحة\n\nللحصول على خطة تقسيط مخصصة:\n📞 ${CONTACT}`;
  }

  if (/فيلا|فيله|villa/.test(m)) {
    return `🏡 فيلات Great Society:\n\n1️⃣ فيلات التجمع الخامس:\n• السعر: 20,000,000 جنيه\n• المقدم: 2,000,000 جنيه\n• استلام فوري\n\n2️⃣ فيلات العاصمة الإدارية R8:\n• المقدم: 10% فقط\n• قسط شهري: 60,000 جنيه\n• مع أقوى مطور في العاصمة\n\n📞 للمزيد: ${CONTACT}`;
  }

  if (/شقة|شقه|apartment/.test(m)) {
    return `🏠 شقق Great Society:\n\n1️⃣ طريق السويس - 3 غرف:\nمن 3,200,000 ج | مقدم 750,000 ج\n\n2️⃣ التجمع الخامس - 3 غرف:\nمن 12,000,000 ج | مقدم 1,200,000 ج\n\n3️⃣ التجمع السادس:\n3,000,000 ج (غرفة) | 4,500,000 ج (غرفتين)\nمقدم 300,000 ج\n\n4️⃣ جولدن سكوير - 3 غرف ماستر:\nمقدم 1,800,000 ج\n\nأي منطقة تفضل؟ 📞 ${CONTACT}`;
  }

  if (/سعر|اسعار|كام|تكلف|ميزانية/.test(m)) {
    return `💰 أسعار عقارات Great Society:\n\n🟢 تبدأ من الأقل:\n• التجمع السادس: 3,000,000 ج (غرفة)\n• طريق السويس: 3,200,000 ج (3 غرف)\n• النرجس/النورث هاوس: 4,000,000 ج\n• التجمع الخامس شقق: 12,000,000 ج\n• التجمع الخامس فيلات: 20,000,000 ج\n\nما هي ميزانيتك التقريبية؟ 📞 ${CONTACT}`;
  }

  if (/موقع|منطقة|فين|مناطق/.test(m)) {
    return `📍 مناطق عقارات Great Society:\n\n• طريق السويس (شقق 3 غرف)\n• التجمع الخامس (شقق وفيلات)\n• جولدن سكوير (شقق 3 غرف ماستر)\n• العاصمة الإدارية R8 (فيلات)\n• التجمع السادس (شقق بأرخص الأسعار)\n• النرجس الجديدة، النورث هاوس، بيت الوطن، شمال الرحاب\n\nأي منطقة تهمك؟ 📞 ${CONTACT}`;
  }

  if (/تواصل|اتصل|واتساب|هاتف|رقم/.test(m)) {
    return `📞 تواصل معنا الآن:\n\n📱 هاتف: ${CONTACT}\n💬 واتساب: wa.me/20${CONTACT}\n📧 بريد: info@greatsocietyeg.com\n📍 العنوان: Villa 99, 1st District, 90th Street, New Cairo\n\nفريقنا جاهز للمساعدة وتحديد موعد معاينة! 🏠`;
  }

  if (/استلام|تسليم|جاهز/.test(m)) {
    return `✅ عقارات استلام فوري:\n\n🏠 التجمع الخامس:\n• شقق وفيلات - استلام فوري\n• مقدم 1,200,000 ج (شقق)\n• مقدم 2,000,000 ج (فيلات)\n\n🏢 جولدن سكوير:\n• استلام فوري وخلال 6 شهور\n• مقدم 1,800,000 ج\n\n📞 احجز وحدتك: ${CONTACT}`;
  }

  if (/كل|اعرض|عندك|محفظة|عقارات/.test(m)) {
    return `🏢 محفظة Great Society الكاملة:\n\n1️⃣ شقق طريق السويس (3 غرف) - من 3.2 مليون\n2️⃣ التجمع الخامس - شقق وفيلات (استلام فوري)\n3️⃣ جولدن سكوير - 3 غرف ماستر (مقدم 1.8 م)\n4️⃣ النرجس/النورث هاوس/بيت الوطن - من 4 مليون\n5️⃣ العاصمة الإدارية R8 - فيلات (مقدم 10%)\n6️⃣ التجمع السادس - شقق (من 3 مليون)\n\n📞 للتفاصيل والمعاينة: ${CONTACT}`;
  }

  return `شكراً لتواصلك مع Great Society! 🏠\n\nيمكنني مساعدتك في:\n• معرفة أسعار العقارات\n• تفاصيل المناطق المتاحة\n• خيارات المقدم والتقسيط\n• مواعيد المعاينة\n\nأو تواصل مباشرةً مع فريقنا:\n📞 ${CONTACT}\n💬 واتساب: wa.me/20${CONTACT}`;
}

const SUGGESTIONS = [
  'اعرض كل العقارات',
  'شقق بمقدم منخفض',
  'فيلات متاحة',
  'أسعار التجمع الخامس',
  'تواصل معنا',
];

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'أهلاً بك في Great Society! 🏡\nأنا مساعدك العقاري، يسعدني مساعدتك في:\n• إيجاد العقار المناسب\n• معرفة الأسعار والمناطق\n• تفاصيل المقدم والتقسيط\n\nكيف أقدر أساعدك؟'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDot, setShowDot] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setShowDot(false);
    }
  }, [open]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    await new Promise(res => setTimeout(res, 600 + Math.random() * 400));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';
        let aiResponseAdded = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                full += data.content;
                if (!aiResponseAdded) {
                  setMessages(prev => [...prev, { role: 'assistant', content: full }]);
                  aiResponseAdded = true;
                } else {
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: full };
                    return updated;
                  });
                }
              }
            } catch {}
          }
        }

        if (!full.trim()) throw new Error('empty');
        setLoading(false);
        return;
      }
    } catch {}

    const reply = getSmartReply(msg);
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2.5, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 left-6 z-40 w-14 h-14 bg-gradient-to-br from-[#005a7d] to-[#007a9a] rounded-full flex items-center justify-center shadow-2xl shadow-[#005a7d]/40"
        title="مساعد عقاري"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="relative">
              <MessageCircle size={22} className="text-white" />
              {showDot && (
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-[#bca056] rounded-full border-2 border-white"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-44 left-6 z-40 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl shadow-[#005a7d]/15 flex flex-col overflow-hidden border border-gray-100"
            style={{ maxHeight: 'calc(100vh - 11rem)', height: 400 }}
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#005a7d] to-[#007a9a] px-5 py-4 flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm">مساعد Great Society</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/80 text-xs">متاح الآن</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 bg-gradient-to-br from-[#005a7d] to-[#007a9a] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot size={13} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#005a7d] text-white rounded-tl-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tr-sm'
                  }`}>{m.content}</div>
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-[#005a7d] to-[#007a9a] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-gray-100 flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-[#005a7d] rounded-full opacity-60"
                        animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 1 && !loading && (
              <div className="px-4 py-2 border-t border-gray-100 bg-white flex-shrink-0">
                <p className="text-xs text-gray-400 mb-2">اقتراحات سريعة:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 bg-[#e6f2f5] text-[#005a7d] rounded-full hover:bg-[#ccdfed] transition-colors font-medium"
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="اسألني عن أي عقار..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#005a7d] focus:bg-white transition-all"
                  disabled={loading}
                />
                <button onClick={() => send()} disabled={loading || !input.trim()}
                  className="w-10 h-10 bg-gradient-to-br from-[#005a7d] to-[#007a9a] rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
