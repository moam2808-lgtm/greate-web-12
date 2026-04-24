import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Building2, Users, CreditCard, CheckCircle, XCircle, Clock, LogOut, Eye, ShieldCheck, MessageSquare, Phone, Mail, Lock, X, EyeOff, User, Plus, Edit3, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import PropertyChat from '../components/PropertyChat';
import ProfileTab from '../components/ProfileTab';
import PropertyImageManager from '../components/PropertyImageManager';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=120&fit=crop';

const SUB_ROLES = [
  { value: '', label: 'مستخدم عادي' },
  { value: 'data_entry', label: 'إدخال البيانات' },
  { value: 'property_manager', label: 'مدير العقارات' },
  { value: 'analytics', label: 'التحليلات' },
  { value: 'support', label: 'الدعم الفني' },
];

export default function SuperAdminDashboard() {
  const { user, logout, isSuperAdmin, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [stats, setStats] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatProperty, setChatProperty] = useState<{ id: number; title: string; ownerName?: string } | null>(null);
  const [resetModal, setResetModal] = useState<{ userId: number; userName: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [editProperty, setEditProperty] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [planUploading, setPlanUploading] = useState(false);
  const planInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!isSuperAdmin) { navigate('/dashboard'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, propData, usersData, paymentsData, contactData] = await Promise.allSettled([
        api.getStats(),
        api.getAllProperties(),
        api.getUsers(),
        api.getAdminPayments(),
        api.getContactMessages(),
      ]);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (propData.status === 'fulfilled') setProperties(propData.value || []);
      if (usersData.status === 'fulfilled') setUsers(usersData.value || []);
      if (paymentsData.status === 'fulfilled') setPayments(paymentsData.value || []);
      if (contactData.status === 'fulfilled') setContactMessages(contactData.value || []);
    } catch {}
    finally { setLoading(false); }
  };

  const markContactRead = async (id: number) => {
    await api.markContactRead(id);
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
  };

  const approveProperty = async (id: number) => {
    await api.approveProperty(id);
    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  };

  const rejectProperty = async (id: number) => {
    await api.rejectProperty(id);
    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
  };

  const markSold = async (id: number) => {
    await api.markSold(id);
    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'sold' } : p));
  };

  const approvePayment = async (id: number) => {
    await api.approvePayment(id);
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
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

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      await api.deleteProperty(id);
      setProperties(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (e: any) { alert(e.message || 'خطأ في الحذف'); }
    finally { setActionLoading(null); }
  };

  const updateUserRole = async (id: number, role: string, subRole?: string) => {
    await api.updateRole(id, role, subRole);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role, sub_role: subRole } : u));
  };

  const toggleUser = async (id: number) => {
    await api.toggleUser(id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword.trim()) return;
    setResetLoading(true);
    setResetMsg('');
    try {
      await api.resetUserPassword(resetModal.userId, newPassword);
      setResetMsg('✅ تم تغيير كلمة المرور بنجاح');
      setTimeout(() => { setResetModal(null); setNewPassword(''); setResetMsg(''); }, 1500);
    } catch (err: any) {
      setResetMsg('❌ ' + (err.message || 'خطأ في تغيير كلمة المرور'));
    } finally {
      setResetLoading(false);
    }
  };

  if (!user || !isSuperAdmin) return null;

  const pendingProps = properties.filter(p => p.status === 'pending');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const unreadContact = contactMessages.filter(m => !m.is_read).length;

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard size={16} /> },
    { id: 'properties', label: 'العقارات', icon: <Building2 size={16} />, badge: pendingProps.length },
    { id: 'users', label: 'المستخدمين', icon: <Users size={16} /> },
    { id: 'payments', label: 'المدفوعات', icon: <CreditCard size={16} />, badge: pendingPayments.length },
    { id: 'contact', label: 'رسائل التواصل', icon: <Mail size={16} />, badge: unreadContact },
    { id: 'profile', label: 'بروفايلي', icon: <User size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Super Admin Header */}
        <div className="bg-gradient-to-r from-gray-900 via-[#003a53] to-[#005a7d] rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-48 h-48 bg-white rounded-full -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#339ab7] rounded-full translate-y-1/2 blur-3xl" />
          </div>
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-white/30">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <ShieldCheck size={28} className="text-yellow-300" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black">سوبر أدمن</h1>
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-md font-bold">SUPER</span>
                </div>
                <p className="text-[#99c8db] text-sm">مرحباً، {user.name} — صلاحيات كاملة</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/add-property" className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 transition-colors px-4 py-2 rounded-xl text-sm font-bold">
                <PlusCircle size={15} />إضافة عقار
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-xl text-sm font-medium">
                <LogOut size={15} />خروج
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'إجمالي العقارات', value: stats.totalProperties || 0, icon: <Building2 size={20} />, color: 'from-[#005a7d] to-[#007a9a]' },
              { label: 'بانتظار المراجعة', value: stats.pendingProperties || 0, icon: <Clock size={20} />, color: 'from-yellow-500 to-orange-500' },
              { label: 'إجمالي المستخدمين', value: stats.totalUsers || 0, icon: <Users size={20} />, color: 'from-gray-700 to-gray-900' },
              { label: 'عقارات مباعة', value: stats.soldProperties || 0, icon: <CheckCircle size={20} />, color: 'from-green-500 to-green-700' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>{s.icon}</div>
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-gray-500 text-sm">{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-[#005a7d] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {t.icon}{t.label}
              {(t as any).badge > 0 && <span className={`text-xs rounded-full px-2 py-0.5 ${activeTab === t.id ? 'bg-white/30 text-white' : 'bg-red-100 text-red-600'}`}>{(t as any).badge}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#99c8db] border-t-[#005a7d] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-yellow-500" />عقارات تحتاج مراجعة ({pendingProps.length})
                  </h3>
                  {pendingProps.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">لا توجد عقارات بانتظار المراجعة</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingProps.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <img src={p.primary_image || DEFAULT_IMAGE} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 line-clamp-1">{p.title_ar || p.title}</div>
                            <div className="text-xs text-gray-400">{p.district} · {Number(p.price).toLocaleString()} ج</div>
                            {p.owner_name && (
                              <div className="text-xs mt-0.5">
                                <span className="text-gray-500">{p.owner_name}</span>
                                {p.owner_phone && <span className="text-[#005a7d] font-medium mr-1" dir="ltr"> · {p.owner_phone}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => approveProperty(p.id)} className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => rejectProperty(p.id)} className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-[#005a7d]" />مدفوعات بانتظار التأكيد ({pendingPayments.length})
                  </h3>
                  {pendingPayments.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">لا توجد مدفوعات بانتظار</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingPayments.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 bg-[#ccdfed] rounded-xl flex items-center justify-center flex-shrink-0">
                            <CreditCard size={16} className="text-[#005a7d]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">{p.buyer_name || p.user_name || 'مستخدم'}</div>
                            <div className="text-xs text-gray-400">{Number(p.amount).toLocaleString()} ج · {p.payment_method === 'instapay' ? 'InstaPay' : 'فودافون كاش'}</div>
                            {p.contact_phone && <div className="text-xs text-gray-400">رقم التحويل: {p.contact_phone}</div>}
                            {p.screenshot_url && (
                              <a href={p.screenshot_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#005a7d] hover:underline font-medium"
                              >📷 إيصال التحويل</a>
                            )}
                          </div>
                          <button onClick={() => approvePayment(p.id)} className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">
                            تأكيد
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">جميع العقارات ({properties.length})</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {properties.map(p => (
                    <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <img src={p.primary_image || DEFAULT_IMAGE} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm line-clamp-1">{p.title_ar || p.title}</div>
                        <div className="text-gray-400 text-xs mt-0.5">{p.district} · {Number(p.price).toLocaleString()} جنيه</div>
                        {p.owner_name && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {p.owner_name}
                            {p.owner_phone && <span className="text-[#005a7d] mr-1" dir="ltr"> · {p.owner_phone}</span>}
                          </div>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${({ pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', sold: 'bg-gray-100 text-gray-600' } as Record<string, string>)[p.status] || ''}`}>
                        {({ pending: 'مراجعة', approved: 'موافق', rejected: 'مرفوض', sold: 'مباع' } as Record<string, string>)[p.status] || p.status}
                      </span>
                      <div className="flex gap-2 flex-shrink-0 flex-wrap">
                        {p.status === 'pending' && (
                          <>
                            <button onClick={() => approveProperty(p.id)} className="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-lg flex items-center justify-center text-green-600 transition-colors">
                              <CheckCircle size={15} />
                            </button>
                            <button onClick={() => rejectProperty(p.id)} className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center text-red-600 transition-colors">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {p.status === 'approved' && (
                          <button onClick={() => markSold(p.id)} className="px-3 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 font-medium transition-colors">مباع</button>
                        )}
                        <button
                          onClick={() => setChatProperty({ id: p.id, title: p.title_ar || p.title, ownerName: p.user_name })}
                          className="w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center text-blue-600 transition-colors"
                          title="محادثة"
                        >
                          <MessageSquare size={15} />
                        </button>
                        <button onClick={() => handleEdit(p)} className="w-8 h-8 bg-yellow-100 hover:bg-yellow-200 rounded-lg flex items-center justify-center text-yellow-700 transition-colors" title="تعديل">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center text-red-600 transition-colors" title="حذف">
                          <Trash2 size={15} />
                        </button>
                        <Link to={`/properties/${p.id}`} className="w-8 h-8 bg-[#ccdfed] hover:bg-[#99c8db] rounded-lg flex items-center justify-center text-[#005a7d] transition-colors">
                          <Eye size={15} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">إدارة المستخدمين ({users.length})</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {users.map(u => (
                    <div key={u.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-[#005a7d] to-[#007a9a] rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 text-base">
                          {u.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm mb-1">{u.name}</div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                            <span className="flex items-center gap-1 text-xs text-gray-500" dir="ltr">
                              <Mail size={11} className="text-gray-400" />{u.email}
                            </span>
                            {u.phone && (
                              <span className="flex items-center gap-1 text-xs text-gray-500" dir="ltr">
                                <Phone size={11} className="text-gray-400" />{u.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={u.role === 'admin' || u.role === 'superadmin' ? `${u.role}:${u.sub_role || ''}` : 'user'}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === 'user') updateUserRole(u.id, 'user');
                                else if (val === 'superadmin:') updateUserRole(u.id, 'superadmin');
                                else {
                                  const [, sub] = val.split(':');
                                  updateUserRole(u.id, 'admin', sub || undefined);
                                }
                              }}
                              disabled={u.id === user?.id}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#005a7d] disabled:opacity-50"
                            >
                              <option value="user">مستخدم</option>
                              <option value="admin:data_entry">أدمن · إدخال بيانات</option>
                              <option value="admin:property_manager">أدمن · مدير عقارات</option>
                              <option value="admin:analytics">أدمن · تحليلات</option>
                              <option value="admin:support">أدمن · دعم فني</option>
                              <option value="superadmin:">سوبر أدمن</option>
                            </select>
                            <button
                              onClick={() => { setResetModal({ userId: u.id, userName: u.name }); setNewPassword(''); setResetMsg(''); }}
                              disabled={u.id === user?.id}
                              className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <Lock size={11} />تغيير الباسورد
                            </button>
                            <button onClick={() => toggleUser(u.id)} disabled={u.id === user?.id}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${u.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                            >
                              {u.is_active ? 'تعطيل' : 'تفعيل'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Password Modal */}
            <AnimatePresence>
              {resetModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                  onClick={e => { if (e.target === e.currentTarget) { setResetModal(null); setNewPassword(''); setResetMsg(''); } }}
                >
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 text-base">تغيير كلمة مرور</h3>
                      <button onClick={() => { setResetModal(null); setNewPassword(''); setResetMsg(''); }}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                      ><X size={15} /></button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      تغيير كلمة مرور: <strong className="text-gray-800">{resetModal.userName}</strong>
                    </p>
                    <div className="relative mb-4">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                        placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#005a7d] pr-10"
                      />
                      <button type="button" onClick={() => setShowNewPass(v => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {resetMsg && (
                      <p className={`text-xs mb-3 text-center font-medium ${resetMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{resetMsg}</p>
                    )}
                    <button onClick={handleResetPassword} disabled={resetLoading || !newPassword.trim()}
                      className="w-full bg-[#005a7d] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#004a68] disabled:opacity-50 transition-colors"
                    >
                      {resetLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {activeTab === 'contact' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">رسائل التواصل ({contactMessages.length})</h3>
                  {unreadContact > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">{unreadContact} غير مقروء</span>}
                </div>
                {contactMessages.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">لا توجد رسائل</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {contactMessages.map(m => (
                      <div key={m.id} className={`p-5 hover:bg-gray-50 transition-colors ${!m.is_read ? 'bg-blue-50/50' : ''}`}>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#005a7d] to-[#007a9a] rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                            {m.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-gray-900 text-sm">{m.name}</span>
                              {!m.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                              <span className="text-gray-400 text-xs">{new Date(m.created_at).toLocaleDateString('ar-EG')}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mb-2" dir="ltr">
                              <span>{m.email}</span>
                              {m.phone && <span>· {m.phone}</span>}
                            </div>
                            <div className="font-semibold text-gray-700 text-sm mb-1">{m.subject}</div>
                            <div className="text-gray-600 text-sm leading-relaxed">{m.message}</div>
                          </div>
                          {!m.is_read && (
                            <button onClick={() => markContactRead(m.id)}
                              className="flex-shrink-0 px-3 py-1.5 bg-[#005a7d] text-white text-xs font-bold rounded-lg hover:bg-[#004a68] transition-colors">
                              تمييز كمقروء
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && user && (
              <ProfileTab user={user} updateUser={updateUser} />
            )}

            {activeTab === 'payments' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">طلبات الدفع ({payments.length})</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {payments.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">لا توجد طلبات دفع</p>
                  ) : payments.map(p => (
                    <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 bg-[#ccdfed] rounded-xl flex items-center justify-center flex-shrink-0">
                        <CreditCard size={18} className="text-[#005a7d]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => p.buyer_id && navigate(`/profile/${p.buyer_id}`)}
                          className="font-medium text-gray-900 text-sm hover:text-[#005a7d] transition-colors text-left cursor-pointer"
                        >
                          {p.buyer_name || p.user_name || 'مستخدم'}
                        </button>
                        <div className="text-gray-400 text-xs">{p.property_title_ar || p.property_title || 'عقار'} · {Number(p.amount).toLocaleString()} ج · {p.payment_method}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${p.status === 'approved' || p.status === 'completed' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {p.status === 'approved' || p.status === 'completed' ? 'موافق' : p.status === 'rejected' ? 'مرفوض' : 'بانتظار'}
                      </span>
                      {p.status === 'pending' && (
                        <button onClick={() => approvePayment(p.id)} className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors flex-shrink-0">
                          تأكيد
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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

      {/* Edit Property Modal */}
      <AnimatePresence>
        {editProperty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setEditProperty(null); }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Edit3 size={20} className="text-yellow-700" />
                </div>
                <h3 className="font-black text-gray-900 text-lg">تعديل العقار</h3>
                <button onClick={() => setEditProperty(null)} className="mr-auto text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'title_ar', label: 'العنوان' },
                  { key: 'price', label: 'السعر' },
                  { key: 'area', label: 'المساحة (م²)' },
                  { key: 'rooms', label: 'الغرف' },
                  { key: 'bathrooms', label: 'الحمامات' },
                  { key: 'district', label: 'المنطقة' },
                  { key: 'floor', label: 'الطابق' },
                  { key: 'contact_phone', label: 'رقم الإعلان' },
                  { key: 'down_payment', label: 'المقدم' },
                  { key: 'delivery_status', label: 'حالة التسليم' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <input value={editForm[f.key] || ''} onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#005a7d]" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">الوصف</label>
                  <textarea value={editForm.description_ar || ''} rows={3}
                    onChange={e => setEditForm((p: any) => ({ ...p, description_ar: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#005a7d] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">النوع</label>
                    <select value={editForm.type || ''} onChange={e => setEditForm((p: any) => ({ ...p, type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#005a7d]">
                      {['شقة', 'فيلا', 'مكتب', 'شاليه', 'محل تجاري', 'أرض'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">الغرض</label>
                    <select value={editForm.purpose || ''} onChange={e => setEditForm((p: any) => ({ ...p, purpose: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#005a7d]">
                      <option value="sale">بيع</option>
                      <option value="rent">إيجار</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">نوع العقار</label>
                    <select value={editForm.is_featured ? 'featured' : 'normal'} onChange={e => setEditForm((p: any) => ({ ...p, is_featured: e.target.value === 'featured' }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#005a7d]">
                      <option value="normal">عادي</option>
                      <option value="featured">مميز</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">رابط جوجل ماب</label>
                  <input value={editForm.google_maps_url || ''} onChange={e => setEditForm((p: any) => ({ ...p, google_maps_url: e.target.value }))}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#005a7d]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">صورة المسقط الأفقي 2D</label>
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
                  className="flex-1 bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                  {editLoading ? <><Loader2 size={16} className="animate-spin" />جاري الحفظ...</> : 'حفظ التعديلات'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center" dir="rtl"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-2">تأكيد الحذف</h3>
              <p className="text-gray-500 text-sm mb-6">هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">إلغاء</button>
                <button onClick={() => handleDelete(deleteConfirm!)} disabled={actionLoading !== null}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {actionLoading !== null ? <><Loader2 size={16} className="animate-spin" />جاري الحذف...</> : 'حذف'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
