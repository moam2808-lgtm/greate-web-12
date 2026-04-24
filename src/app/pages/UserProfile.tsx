import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Mail, Phone, User, Building2, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  role: string;
  sub_role?: string;
  created_at: string;
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) {
        setError('معرف المستخدم غير صحيح');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${id}/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'لا يمكن تحميل البيانات');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setProfileData(data);
        setError('');
      } catch (err) {
        setError('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const getRoleLabel = (role: string, subRole?: string) => {
    if (role === 'superadmin') return 'سوبر أدمن';
    if (role === 'admin') {
      if (subRole === 'data_entry') return 'داتا انتري';
      if (subRole === 'property_manager') return 'مدير عقارات';
      return 'إدارة';
    }
    if (role === 'user') return 'مستخدم';
    return role;
  };

  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isOwnProfile = user?.id === parseInt(id || '0');

  return (
    <div className="min-h-screen bg-gray-50 pt-20" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#005a7d] hover:text-[#004a68] mb-6 font-medium"
        >
          <ArrowRight size={18} />
          العودة
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#99c8db] border-t-[#005a7d] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 rounded-2xl border border-red-200 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 mb-1">خطأ</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </motion.div>
        ) : profileData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-[#005a7d] to-[#007a9a] rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-white/30 bg-white/20 flex items-center justify-center">
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black">
                      {profileData.name?.charAt(0) || '؟'}
                    </span>
                  )}
                </div>
                <div className="text-center sm:text-right flex-1">
                  <h1 className="text-3xl font-black">{profileData.name}</h1>
                  <p className="text-[#99c8db] text-sm mt-2">
                    {getRoleLabel(profileData.role, profileData.sub_role)}
                  </p>
                  <p className="text-[#99c8db] text-xs mt-1">
                    عضو منذ{' '}
                    {new Date(profileData.created_at).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#e6f2f5] rounded-lg flex items-center justify-center">
                  <User size={20} className="text-[#005a7d]" />
                </div>
                <h2 className="font-bold text-gray-900">معلومات الاتصال</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">البريد الإلكتروني</p>
                    <p className="font-bold text-gray-900 break-all">{profileData.email}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">رقم الهاتف</p>
                    <p className="font-bold text-gray-900" dir="ltr">{profileData.phone}</p>
                  </div>
                </div>

                {/* User ID */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">معرف المستخدم</p>
                    <p className="font-bold text-gray-900">#{profileData.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Permission Notice */}
            {!isAdmin && !isOwnProfile && (
              <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4">
                <p className="text-yellow-700 text-sm">
                  تم عرض معلومات محدودة من المستخدم. قد تكون هناك معلومات إضافية متاحة فقط للإدارة.
                </p>
              </div>
            )}

            {/* Admin Info (only for admins) */}
            {isAdmin && profileData.role === 'admin' && (
              <div className="bg-[#e6f2f5] rounded-2xl border border-[#ccdfed] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#005a7d] rounded-lg flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">معلومات الإدارة</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">الدور</p>
                    <p className="font-bold text-gray-900">
                      {getRoleLabel(profileData.role, profileData.sub_role)}
                    </p>
                  </div>
                  {profileData.sub_role && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">الوظيفة الفرعية</p>
                      <p className="font-bold text-gray-900">{profileData.sub_role}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
