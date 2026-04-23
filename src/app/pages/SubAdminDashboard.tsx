import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, CheckCircle, XCircle, Clock, LogOut, Eye, BarChart3, MessageSquare,
  FileText, PlusCircle, Edit3, Trash2, Users, TrendingUp, AlertCircle, Send,
  PieChart, Activity, DollarSign, RefreshCw, Search, Filter, ChevronRight, X, Home, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import PropertyDetailModal from '../components/PropertyDetailModal';
import PropertyChat from '../components/PropertyChat';
import ProfileTab from '../components/ProfileTab';
import PropertyImageManager from '../components/PropertyImageManager';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from 'recharts';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=120&fit=crop';
const COLORS = ['#005a7d', '#007a9a', '#1F2937', '#004a68', '#003a53', '#66b1c9'];

const STATUS_LABEL: Record<string, string> = { pending: 'قيد المراجعة', approved: 'موافق عليه', rejected: 'مرفوض', sold: 'مباع' };
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  sold: 'bg-gray-100 text-gray-600 border-gray-200'
};

function StatCard({ label, value, icon, color }: { label: string; value: any; icon: React.ReactNode; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-900">{value?.toLocaleString?.() ?? value ?? 0}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>{icon}</div>
      </div>
    </motion.div>
  );
}

export default function SubAdminDashboard() {
  const { user, logout, isAdmin, isSuperAdmin, subRole, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyMsg, setReplyMsg] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [chatProperty, setChatProperty] = useState<{ id: number; title: string; ownerName?: string } | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [editProperty, setEditProperty] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [planUploading, setPlanUploading] = useState(false);
  const planInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (isSuperAdmin) { navigate('/superadmin'); return; }
    if (!isAdmin) { navigate('/dashboard'); return; }

    const role = user.sub_role;
    if (role === 'data_entry') setActiveTab('listings');
    else if (role === 'property_manager') setActiveTab('pending');
    else if (role === 'analytics') setActiveTab('analytics');
    else if (role === 'support') setActiveTab('tickets');
    else navigate('/admin');

    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getAllProperties(),
        api.getStats(),
        api.getAnalytics(),
        api.getTickets(),
        api.getAdminPayments(),
      ]);
      if (results[0].status === 'fulfilled') setProperties(results[0].value || []);
      if (results[1].status === 'fulfilled') setStats(results[1].value);
      if (results[2].status === 'fulfilled') setAnalytics(results[2].value);
      if (results[3].status === 'fulfilled') setTickets(results[3].value || []);
      if (results[4].status === 'fulfilled') setPurchases(results[4].value || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await api.approveProperty(id);
      setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await api.rejectProperty(id);
      setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleMarkSold = async (id: number) => {
    setActionLoading(id);
    try {
      await api.markSold(id);
      setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'sold' } : p));
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const openTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    const msgs = await api.getTicketMessages(ticket.id);
    setTicketMessages(msgs || []);
  };

  const sendReply = async () => {
    if (!replyMsg.trim() || !activeTicket) return;
    setSendingReply(true);
    try {
      const msg = await api.sendTicketMessage(activeTicket.id, replyMsg);
      setTicketMessages(prev => [...prev, msg]);
      setReplyMsg('');
    } catch {}
    finally { setSendingReply(false); }
  };

  const closeTicketAction = async (id: number) => {
    await api.closeTicket(id);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'closed' } : t));
    if (activeTicket?.id === id) setActiveTicket({ ...activeTicket, status: 'closed' });
  };

  const handleEdit = (prop: any) => {
    setEditProperty(prop);
    setEditForm({
      title_ar: prop.title_ar || prop.title || '',
      description_ar: prop.description_ar || prop.description || '',
      price: prop.price || '',
      area: prop.area || '',
      rooms: prop.rooms || '',
      bathrooms: prop.bathrooms || '',
      district: prop.district || '',
      city: prop.city || '',
      floor: prop.floor || '',
      type: prop.type || '',
      purpose: prop.purpose || '',
      contact_phone: prop.contact_phone || prop.owner_phone || '',
      is_featured: Boolean(prop.is_featured),
      down_payment: prop.down_payment || '',
      delivery_status: prop.delivery_status || '',
      google_maps_url: prop.google_maps_url || '',
      floor_plan_image: prop.floor_plan_image || '',
    });
  };

  const handleEditSave = async () => {
    if (!editProperty) return;
    setEditLoading(true);
    try {
      await api.editProperty(editProperty.id, editForm);
      setProperties(prev => prev.map(p => p.id === editProperty.id ? { ...p, ...editForm } : p));
      setEditProperty(null);
    } catch (e: any) { alert(e.message || 'خطأ في التعديل'); }
    finally { setEditLoading(false); }
  };

  const handlePlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setPlanUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الرفع');
      setEditForm((p: any) => ({ ...p, floor_plan_image: data.url }));
    } catch (err: any) { alert(err.message || 'فشل رفع الصورة'); }
    finally { setPlanUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      await api.deleteProperty(id);
      setProperties(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (e: any) { alert(e.message || 'خطأ في الحذف'); }
    finally { setActionLoading(null); }
  };

  const handleApprovePurchase = async (id: number) => {
    try {
      await api.approvePayment(id);
      setPurchases(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' } : p));
    } catch (e: any) { alert(e.message || 'خطأ'); }
  };

  if (!user) return null;

  const ROLE_LABELS: Record<string, string> = {
    data_entry: 'مسؤول إدخال البيانات',
    property_manager: 'مدير العقارات',
    analytics: 'مسؤول التحليلات',
    support: 'مسؤول الدعم الفني',
  };

  const ROLE_COLOR: Record<string, string> = {
    data_entry: 'from-blue-500 to-blue-600',
    property_manager: 'from-[#005a7d] to-[#007a9a]',
    analytics: 'from-green-500 to-emerald-600',
    support: 'from-orange-500 to-red-500',
  };

  const filteredProps = properties.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title_ar?.includes(searchQuery) ||
    p.district?.includes(searchQuery)
  );

  const pendingProps = filteredProps.filter(p => p.status === 'pending');

  const TABS: Record<string, { id: string; label: string; icon: React.ReactNode }[]> = {
    data_entry: [
      { id: 'listings', label: 'العقارات', icon: <Building2 size={16} /> },
      { id: 'add', label: 'إضافة عقار', icon: <PlusCircle size={16} /> },
      { id: 'profile', label: 'بروفايلي', icon: <User size={16} /> },
    ],
    property_manager: [
      { id: 'pending', label: 'بانتظار الموافقة', icon: <Clock size={16} /> },
      { id: 'approved', label: 'المعتمدة', icon: <CheckCircle size={16} /> },
      { id: 'purchases', label: 'طلبات الشراء', icon: <DollarSign size={16} /> },
      { id: 'sold', label: 'المباعة', icon: <TrendingUp size={16} /> },
      { id: 'add', label: 'إضافة عقار', icon: <PlusCircle size={16} /> },
      { id: 'profile', label: 'بروفايلي', icon: <User size={16} /> },
    ],
    analytics: [
      { id: 'analytics', label: 'الإحصائيات', icon: <BarChart3 size={16} /> },
      { id: 'overview', label: 'نظرة عامة', icon: <Activity size={16} /> },
      { id: 'profile', label: 'بروفايلي', icon: <User size={16} /> },
    ],
    support: [
      { id: 'tickets', label: 'التذاكر', icon: <MessageSquare size={16} /> },
      { id: 'profile', label: 'بروفايلي', icon: <User size={16} /> },
    ],
  };

  const tabs = TABS[subRole || ''] || [];
  const roleLabel = ROLE_LABELS[subRole || ''] || 'أدمن';
  const roleColor = ROLE_COLOR[subRole || ''] || 'from-gray-700 to-gray-900';

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <AnimatePresence>
        {selectedPropertyId !== null && (
          <PropertyDetailModal
            propertyId={selectedPropertyId}
            onClose={() => setSelectedPropertyId(null)}
            onApprove={async (data) => {
              setActionLoading(selectedPropertyId);
              try {
                await api.approveProperty(selectedPropertyId, data || {});
                setProperties(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, ...data, status: 'approved' } : p));
              } catch (e: any) { alert(e.message); }
              finally { setActionLoading(null); }
            }}
            onReject={() => handleReject(selectedPropertyId)}
          />
        )}
      </AnimatePresence>
      <div className={`bg-gradient-to-r ${roleColor} py-8 px-4 sm:px-8`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl">لوحة {roleLabel}</h1>
              <p className="text-white/70 text-sm">{user.name} · {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm transition-all">
              <Home size={14} />الرئيسية
            </Link>
            <button onClick={() => { logout(); navigate('/'); }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm transition-all"
            >
              <LogOut size={14} />خروج
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* Stats Row */}
        {stats && subRole !== 'support' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="عقارات معتمدة" value={stats.totalProperties} icon={<Building2 size={20} />} color="bg-gradient-to-br from-[#005a7d] to-[#007a9a]" />
            <StatCard label="بانتظار المراجعة" value={stats.pendingProperties} icon={<Clock size={20} />} color="bg-gradient-to-br from-yellow-400 to-yellow-500" />
            <StatCard label="مباعة" value={stats.soldProperties} icon={<TrendingUp size={20} />} color="bg-gradient-to-br from-gray-700 to-gray-900" />
            <StatCard label="المستخدمون" value={stats.totalUsers} icon={<Users size={20} />} color="bg-gradient-to-br from-green-500 to-emerald-600" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-[#005a7d] text-white shadow-md' : 'bg-white text-gray-600 hover:bg-[#e6f2f5] hover:text-[#005a7d] border border-gray-100'}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
          <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-white border border-gray-100 text-gray-500 hover:bg-[#e6f2f5] transition-all mr-auto">
            <RefreshCw size={14} />تحديث
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-[#005a7d]/30 border-t-[#005a7d] rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ─── DATA ENTRY: LISTINGS ─── */}
            {activeTab === 'listings' && (
              <motion.div key="listings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالعنوان أو الحي..."
                      className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-[#005a7d]" />
                  </div>
                </div>
                <div className="grid gap-3">
                  {filteredProps.map(prop => (
                    <motion.div key={prop.id} layout className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex gap-4 items-center">
                        <img src={prop.primary_image || DEFAULT_IMAGE} alt="" className="w-20 h-16 rounded-xl object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm line-clamp-1">{prop.title_ar || prop.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{prop.district} · {Number(prop.area)}م² · {Number(prop.price).toLocaleString()} جنيه</p>
                          {prop.owner_name && (
                            <p className="text-gray-400 text-xs mt-0.5">
                              المالك: {prop.owner_name}
                              {prop.owner_phone && <span className="mr-1 text-[#005a7d] font-medium" dir="ltr"> · {prop.owner_phone}</span>}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${STATUS_COLOR[prop.status] || 'bg-gray-100 text-gray-500'}`}>
                              {STATUS_LABEL[prop.status] || prop.status}
                            </span>
                            <Link to={`/properties/${prop.id}`} className="flex items-center gap-1 bg-[#e6f2f5] text-[#005a7d] px-3 py-1 rounded-lg text-xs font-medium hover:bg-[#ccdfed] transition-colors">
                              <Eye size={12} />عرض
                            </Link>
                            <button onClick={() => handleEdit(prop)}
                              className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                            ><Edit3 size={12} />تعديل</button>
                            <button onClick={() => setDeleteConfirm(prop.id)}
                              className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                            ><Trash2 size={12} />حذف</button>
                            <button onClick={() => setChatProperty({ id: prop.id, title: prop.title_ar || prop.title, ownerName: prop.owner_name })}
                              className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                            ><MessageSquare size={12} />محادثة</button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {filteredProps.length === 0 && <div className="text-center py-12 text-gray-400">لا توجد عقارات</div>}
                </div>
              </motion.div>
            )}

            {/* ─── DATA ENTRY: ADD ─── */}
            {activeTab === 'add' && (
              <motion.div key="add" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center"
              >
                <div className="w-20 h-20 bg-[#e6f2f5] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#005a7d]">
                  <PlusCircle size={36} />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">إضافة عقار جديد</h2>
                <p className="text-gray-500 mb-6">يمكنك إضافة عقارات جديدة عبر صفحة الإضافة</p>
                <Link to="/admin/add-property" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white px-8 py-3 rounded-xl font-bold shadow-lg">
                  <PlusCircle size={18} />إضافة عقار
                </Link>
              </motion.div>
            )}

            {/* ─── PROPERTY MANAGER: PENDING ─── */}
            {activeTab === 'pending' && (
              <motion.div key="pending" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {pendingProps.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-1">لا توجد عقارات بانتظار المراجعة</p>
                    <p className="text-gray-500 text-sm">جميع العقارات تمت مراجعتها</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingProps.map(prop => (
                      <motion.div key={prop.id} layout className="bg-white rounded-2xl p-5 shadow-sm border border-yellow-100">
                        <div className="flex gap-4">
                          <img src={prop.primary_image || DEFAULT_IMAGE} alt="" className="w-24 h-20 rounded-xl object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }} />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-bold text-gray-900">{prop.title_ar || prop.title}</p>
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-md text-xs font-bold border border-yellow-200 flex-shrink-0">بانتظار المراجعة</span>
                            </div>
                            <p className="text-gray-500 text-sm">{prop.district} · {Number(prop.area)}م² · {Number(prop.price).toLocaleString()} جنيه</p>
                            {prop.owner_name && (
                              <div className="flex items-center gap-2 mt-1 bg-blue-50 rounded-lg px-3 py-1.5 text-xs w-fit">
                                <span className="text-gray-600">المالك: <strong>{prop.owner_name}</strong></span>
                                {prop.owner_phone && (
                                  <a href={`tel:${prop.owner_phone}`} className="flex items-center gap-1 text-[#005a7d] font-bold hover:underline" dir="ltr">
                                    📞 {prop.owner_phone}
                                  </a>
                                )}
                              </div>
                            )}
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => handleApprove(prop.id)} disabled={actionLoading === prop.id}
                                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                              >
                                <CheckCircle size={14} />{actionLoading === prop.id ? '...' : 'قبول'}
                              </button>
                              <button onClick={() => handleReject(prop.id)} disabled={actionLoading === prop.id}
                                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                              >
                                <XCircle size={14} />رفض
                              </button>
                              <button onClick={() => setSelectedPropertyId(prop.id)} className="flex items-center gap-1.5 bg-[#e6f2f5] text-[#005a7d] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#ccdfed] transition-colors">
                                <Eye size={14} />تفاصيل
                              </button>
                              <button onClick={() => setChatProperty({ id: prop.id, title: prop.title_ar || prop.title, ownerName: prop.owner_name })} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                                <MessageSquare size={14} />محادثة
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── PROPERTY MANAGER: APPROVED ─── */}
            {activeTab === 'approved' && (
              <motion.div key="approved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid gap-3">
                  {filteredProps.filter(p => p.status === 'approved').map(prop => (
                    <div key={prop.id} className="bg-white rounded-2xl p-4 shadow-sm border border-green-50">
                      <div className="flex gap-4 items-center">
                        <img src={prop.primary_image || DEFAULT_IMAGE} alt="" className="w-20 h-16 rounded-xl object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm line-clamp-1">{prop.title_ar || prop.title}</p>
                          <p className="text-gray-500 text-xs">{prop.district} · {Number(prop.area)}م² · {Number(prop.price).toLocaleString()} جنيه</p>
                          <p className="text-gray-400 text-xs mt-0.5">المالك: {prop.owner_name} · {prop.owner_phone}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button onClick={() => setChatProperty({ id: prop.id, title: prop.title_ar || prop.title, ownerName: prop.owner_name })}
                              className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                            ><MessageSquare size={12} />محادثة</button>
                            <button onClick={() => handleEdit(prop)}
                              className="flex items-center gap-1 bg-[#e6f2f5] text-[#005a7d] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#ccdfed] transition-colors"
                            ><Edit3 size={12} />تعديل</button>
                            <button onClick={() => setDeleteConfirm(prop.id)}
                              className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                            ><Trash2 size={12} />حذف</button>
                            <button onClick={() => handleMarkSold(prop.id)} disabled={actionLoading === prop.id}
                              className="flex items-center gap-1 bg-gray-800 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            ><DollarSign size={12} />مباع</button>
                          </div>
                        </div>
                        <button onClick={() => setSelectedPropertyId(prop.id)} className="flex-shrink-0">
                          <Eye size={16} className="text-gray-400 hover:text-[#005a7d]" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredProps.filter(p => p.status === 'approved').length === 0 && (
                    <div className="text-center py-12 text-gray-400">لا توجد عقارات معتمدة</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── PROPERTY MANAGER: PURCHASE REQUESTS ─── */}
            {activeTab === 'purchases' && (
              <motion.div key="purchases" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {purchases.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <DollarSign size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-500">لا توجد طلبات شراء بعد</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {purchases.map(p => (
                      <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-sm">{p.property_title}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                              <span>👤 {p.buyer_name}</span>
                              <span>📞 {p.buyer_phone}</span>
                              <span>💰 {Number(p.amount).toLocaleString()} جنيه</span>
                              <span>💳 {p.payment_method === 'instapay' ? 'InstaPay' : 'فودافون كاش'}</span>
                              {p.contact_phone && <span>📲 رقم التحويل: {p.contact_phone}</span>}
                            </div>
                            {p.screenshot_url && (
                              <a href={p.screenshot_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#005a7d] hover:underline font-medium mt-1"
                              >📷 عرض صورة إيصال التحويل</a>
                            )}
                            <p className="text-gray-400 text-xs mt-1">{new Date(p.created_at).toLocaleDateString('ar-EG')}</p>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <span className={`px-3 py-1 rounded-xl text-xs font-bold ${p.status === 'completed' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {p.status === 'completed' ? 'مكتمل' : p.status === 'rejected' ? 'مرفوض' : 'بانتظار'}
                            </span>
                            {p.status === 'pending' && (
                              <button onClick={() => handleApprovePurchase(p.id)}
                                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                              ><CheckCircle size={12} />تأكيد البيع</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── PROPERTY MANAGER: SOLD ─── */}
            {activeTab === 'sold' && (
              <motion.div key="sold" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid gap-3">
                  {filteredProps.filter(p => p.status === 'sold').map(prop => (
                    <div key={prop.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 items-center opacity-75">
                      <img src={prop.primary_image || DEFAULT_IMAGE} alt="" className="w-20 h-16 rounded-xl object-cover grayscale" onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-700 text-sm line-clamp-1">{prop.title_ar || prop.title}</p>
                        <p className="text-gray-400 text-xs">{prop.district} · {Number(prop.price).toLocaleString()} جنيه</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold">مباع</span>
                    </div>
                  ))}
                  {filteredProps.filter(p => p.status === 'sold').length === 0 && (
                    <div className="text-center py-12 text-gray-400">لا توجد عقارات مباعة بعد</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── ANALYTICS ─── */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {stats && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="إجمالي العقارات" value={stats.totalProperties} icon={<Building2 size={20} />} color="bg-gradient-to-br from-[#005a7d] to-[#007a9a]" />
                    <StatCard label="بانتظار المراجعة" value={stats.pendingProperties} icon={<Clock size={20} />} color="bg-gradient-to-br from-yellow-400 to-orange-400" />
                    <StatCard label="مباعة" value={stats.soldProperties} icon={<TrendingUp size={20} />} color="bg-gradient-to-br from-gray-700 to-gray-900" />
                    <StatCard label="إجمالي الإيرادات" value={stats.totalRevenue ? `${Number(stats.totalRevenue).toLocaleString()} ج` : '0 ج'} icon={<DollarSign size={20} />} color="bg-gradient-to-br from-green-500 to-emerald-600" />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {analytics?.byType && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><PieChart size={18} className="text-[#005a7d]" />توزيع أنواع العقارات</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <RPieChart>
                          <Pie data={analytics.byType} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="type" label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {analytics.byType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {analytics?.byDistrict && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-[#005a7d]" />العقارات حسب الحي</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.byDistrict.slice(0, 6)} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="district" tick={{ fontSize: 12 }} width={80} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#005a7d" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {analytics?.byMonth && analytics.byMonth.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Activity size={18} className="text-[#005a7d]" />نمو العقارات الشهري</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.byMonth}>
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#005a7d" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── ANALYTICS: OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4">نظرة عامة على جميع العقارات</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-right py-3 px-4 font-semibold text-gray-500">العقار</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-500">الحي</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-500">السعر</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-500">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {properties.slice(0, 15).map(p => (
                          <tr key={p.id} className="border-b border-gray-50 hover:bg-[#e6f2f5]/30">
                            <td className="py-3 px-4 font-medium text-gray-900 line-clamp-1 max-w-[200px]">{p.title_ar || p.title}</td>
                            <td className="py-3 px-4 text-gray-500">{p.district}</td>
                            <td className="py-3 px-4 text-[#005a7d] font-bold">{Number(p.price).toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── SUPPORT: TICKETS ─── */}
            {activeTab === 'tickets' && (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {activeTicket ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-gray-900">{activeTicket.subject}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">المستخدم: {activeTicket.user_name}</p>
                        {activeTicket.user_phone && (
                          <a href={`tel:${activeTicket.user_phone}`} className="flex items-center gap-1 text-[#005a7d] text-xs font-bold mt-0.5 hover:underline" dir="ltr">
                            📞 {activeTicket.user_phone}
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {activeTicket.status === 'open' && (
                          <button onClick={() => closeTicketAction(activeTicket.id)}
                            className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-all"
                          >إغلاق التذكرة</button>
                        )}
                        <button onClick={() => setActiveTicket(null)}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
                        ><X size={14} /></button>
                      </div>
                    </div>
                    <div className="p-4 h-80 overflow-y-auto space-y-3">
                      {ticketMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === user.id ? 'bg-[#005a7d] text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {ticketMessages.length === 0 && <p className="text-center text-gray-400 text-sm">لا توجد رسائل بعد</p>}
                    </div>
                    {activeTicket.status === 'open' && (
                      <div className="p-4 border-t border-gray-100 flex gap-2">
                        <input value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
                          placeholder="اكتب ردك..."
                          onKeyDown={e => e.key === 'Enter' && sendReply()}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#005a7d]" />
                        <button onClick={sendReply} disabled={sendingReply || !replyMsg.trim()}
                          className="w-10 h-10 bg-[#005a7d] rounded-xl flex items-center justify-center text-white hover:bg-[#004a68] disabled:opacity-50"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets
                      .filter(t => t.status === 'open')
                      .map(ticket => (
                        <motion.div key={ticket.id} layout
                          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-purple-200 transition-all"
                          onClick={() => openTicket(ticket)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-orange-100 text-orange-600`}>
                                <MessageSquare size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{ticket.subject}</p>
                                <p className="text-gray-400 text-xs mt-0.5">{ticket.user_name} · {new Date(ticket.created_at).toLocaleDateString('ar-EG')}</p>
                                {ticket.user_phone && (
                                  <p className="text-[#005a7d] text-xs font-medium mt-0.5" dir="ltr">📞 {ticket.user_phone}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold bg-green-100 text-green-700`}>
                                مفتوح
                              </span>
                              <ChevronRight size={16} className="text-gray-400" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    {tickets.filter(t => t.status === 'open').length === 0 && (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                        <MessageSquare size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="font-bold text-gray-500">لا توجد تذاكر مفتوحة</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && user && (
              <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ProfileTab user={user} updateUser={updateUser} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {chatProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setChatProperty(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="w-full max-w-lg h-[70vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <PropertyChat
                propertyId={chatProperty.id}
                propertyTitle={chatProperty.title}
                ownerName={chatProperty.ownerName}
                onClose={() => setChatProperty(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editProperty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setEditProperty(null); }}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" dir="rtl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Edit3 size={20} className="text-[#005a7d]" />تعديل العقار
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'title_ar', label: 'عنوان العقار', type: 'text' },
                  { key: 'price', label: 'السعر', type: 'number' },
                  { key: 'area', label: 'المساحة م²', type: 'number' },
                  { key: 'rooms', label: 'عدد الغرف', type: 'number' },
                  { key: 'bathrooms', label: 'عدد الحمامات', type: 'number' },
                  { key: 'floor', label: 'الطابق', type: 'text' },
                  { key: 'district', label: 'الحي', type: 'text' },
                  { key: 'city', label: 'المدينة', type: 'text' },
                  { key: 'contact_phone', label: 'رقم الإعلان', type: 'text' },
                  { key: 'down_payment', label: 'المقدم', type: 'text' },
                  { key: 'delivery_status', label: 'حالة التسليم', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">الوصف</label>
                  <textarea
                    value={editForm.description_ar || ''}
                    onChange={e => setEditForm((p: any) => ({ ...p, description_ar: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005a7d] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">النوع</label>
                  <select value={editForm.type || ''} onChange={e => setEditForm((p: any) => ({ ...p, type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                  >
                    {['شقة', 'فيلا', 'مكتب', 'شاليه', 'محل تجاري', 'أرض'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">الغرض</label>
                  <select value={editForm.purpose || ''} onChange={e => setEditForm((p: any) => ({ ...p, purpose: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                  >
                    <option value="sale">للبيع</option>
                    <option value="rent">للإيجار</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">نوع العقار</label>
                  <select value={editForm.is_featured ? 'featured' : 'normal'} onChange={e => setEditForm((p: any) => ({ ...p, is_featured: e.target.value === 'featured' }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                  >
                    <option value="normal">عادي</option>
                    <option value="featured">مميز</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">رابط جوجل ماب</label>
                  <input
                    type="text"
                    value={editForm.google_maps_url || ''}
                    onChange={e => setEditForm((p: any) => ({ ...p, google_maps_url: e.target.value }))}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">صورة المسقط الأفقي (2D)</label>
                  <input ref={planInputRef} type="file" accept="image/*" onChange={handlePlanUpload} className="hidden" />
                  {editForm.floor_plan_image ? (
                    <div className="relative inline-block w-full">
                      <img src={editForm.floor_plan_image} alt="مسقط" className="w-full max-h-32 object-contain rounded-xl border border-gray-200" />
                      <button type="button" onClick={() => setEditForm((p: any) => ({ ...p, floor_plan_image: '' }))}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-lg text-xs">✕</button>
                      <button type="button" onClick={() => planInputRef.current?.click()}
                        className="mt-1 w-full text-xs text-[#005a7d] bg-[#e6f2f5] rounded-lg py-1.5 hover:bg-[#ccdfed] transition-colors">
                        تغيير الصورة
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => planInputRef.current?.click()} disabled={planUploading}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-xs text-gray-500 hover:border-[#005a7d] hover:text-[#005a7d] transition-colors flex items-center justify-center gap-2">
                      {planUploading ? 'جاري الرفع...' : '📁 رفع صورة المسقط من الجهاز'}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 border border-gray-100 rounded-xl p-4">
                <PropertyImageManager propertyId={editProperty.id} />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setEditProperty(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">إلغاء</button>
                <button onClick={handleEditSave} disabled={editLoading}
                  className="flex-1 bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-70"
                >
                  {editLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" dir="rtl"
            >
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="font-black text-gray-900 mb-2">تأكيد الحذف</h3>
              <p className="text-gray-500 text-sm mb-5">هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium">إلغاء</button>
                <button onClick={() => handleDelete(deleteConfirm!)} disabled={actionLoading !== null}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-70"
                >
                  {actionLoading !== null ? 'جاري الحذف...' : 'حذف'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
