import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Building2, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: number;
  property_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  sender_sub_role?: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

interface PropertyChatProps {
  propertyId: number;
  propertyTitle: string;
  ownerName?: string;
  onClose?: () => void;
  embedded?: boolean;
}

export default function PropertyChat({ propertyId, propertyTitle, ownerName, onClose, embedded = false }: PropertyChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.getPropertyChatMessages(propertyId);
      if (data) setMessages(data);
    } catch {}
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [propertyId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const msg = await api.sendPropertyChatMessage(propertyId, input.trim());
      if (msg) {
        setMessages(prev => [...prev, msg]);
        setSuccess('تم ارسال طلبك بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      }
      setInput('');
    } catch (err: any) {
      setError(err.message || 'خطأ في الإرسال');
    } finally {
      setSending(false);
    }
  };

  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });

  let lastDate = '';

  const containerClasses = embedded
    ? 'flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-100'
    : 'flex flex-col h-full';

  return (
    <div className={containerClasses} dir="rtl">
      {!embedded && (
        <div className="bg-gradient-to-r from-[#005a7d] to-[#007a9a] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm line-clamp-1">{propertyTitle}</div>
              {ownerName && <div className="text-white/70 text-xs">صاحب العقار: {ownerName}</div>}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      )}

      {embedded && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#e6f2f5] rounded-lg flex items-center justify-center">
            <MessageSquare size={16} className="text-[#005a7d]" />
          </div>
          <div>
            <div className="font-bold text-gray-800 text-sm">{isAdmin ? `محادثة - ${propertyTitle}` : 'التواصل مع الإدارة'}</div>
            {ownerName && isAdmin && <div className="text-gray-500 text-xs">صاحب العقار: {ownerName}</div>}
          </div>
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#005a7d]/30 border-t-[#005a7d] rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-14 h-14 bg-[#e6f2f5] rounded-2xl flex items-center justify-center mb-3">
              <MessageSquare size={24} className="text-[#005a7d]" />
            </div>
            <p className="text-gray-500 text-sm font-medium">لا توجد رسائل بعد</p>
            <p className="text-gray-400 text-xs mt-1">ابدأ المحادثة الآن</p>
          </div>
        ) : (
          messages.map((msg) => {
            const dateStr = formatDate(msg.created_at);
            const showDate = dateStr !== lastDate;
            if (showDate) lastDate = dateStr;
            const isMe = msg.sender_id === user?.id;
            const isAdminMsg = msg.is_admin;
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-3">
                    <span className="bg-white border border-gray-200 text-gray-400 text-xs px-3 py-1 rounded-full">{dateStr}</span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] ${isMe ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
                    <div className="flex items-center gap-1.5 px-1">
                      <span className={`text-xs font-semibold ${isAdminMsg ? 'text-[#005a7d]' : 'text-gray-600'}`}>
                        {isMe ? 'أنت' : isAdminMsg ? 'Great Society Team' : msg.sender_name}
                      </span>
                      {isAdminMsg && (
                        <span className="text-xs bg-[#005a7d]/10 text-[#005a7d] px-1.5 py-0.5 rounded-md font-medium">
                          {msg.sender_role === 'superadmin' ? 'سوبر أدمن' : msg.sender_sub_role === 'data_entry' ? 'داتا انتري' : msg.sender_sub_role === 'property_manager' ? 'مدير عقارات' : 'إدارة'}
                        </span>
                      )}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-tr-sm'
                        : isAdminMsg
                          ? 'bg-gradient-to-br from-[#005a7d] to-[#007a9a] text-white rounded-tl-sm'
                          : 'bg-[#bca056] text-white rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-gray-400 text-xs px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-red-500 text-xs">{error}</p>
        </div>
      )}

      {success && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-100">
          <p className="text-green-600 text-xs">{success}</p>
        </div>
      )}

      <form onSubmit={handleSend} className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="اكتب رسالتك..."
          className="flex-1 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005a7d] transition-all"
          disabled={sending}
        />
        <motion.button
          type="submit"
          disabled={!input.trim() || sending}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 bg-gradient-to-br from-[#005a7d] to-[#007a9a] text-white rounded-xl flex items-center justify-center shadow-sm disabled:opacity-50 flex-shrink-0"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </motion.button>
      </form>
    </div>
  );
}

interface PropertyChatButtonProps {
  propertyId: number;
  propertyTitle: string;
  ownerName?: string;
}

export function PropertyChatButton({ propertyId, propertyTitle, ownerName }: PropertyChatButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
      >
        <MessageSquare size={16} />
        محادثة العقار
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="w-full max-w-md h-[70vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <PropertyChat
                propertyId={propertyId}
                propertyTitle={propertyTitle}
                ownerName={ownerName}
                onClose={() => setOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
