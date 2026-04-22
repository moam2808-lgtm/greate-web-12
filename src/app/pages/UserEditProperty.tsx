import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { Building2, CheckCircle, X, Loader2, Map, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { compressAndUploadMultiple, compressImage } from '../lib/imageUtils';

const TYPES = ['شقة', 'استديو', 'دوبلكس', 'فيلا', 'مكتب', 'شاليه', 'محل تجاري', 'أرض'];
const FINISHING_OPTIONS = ['تشطيب', 'نص تشطيب', '3/4 تشطيب', 'سوبر لوكس'];

export default function UserEditProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [floorPlanImage, setFloorPlanImage] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    description: '',
    type: 'شقة',
    purpose: 'sale',
    price: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    floor: '',
    district: '',
    address: '',
    contact_phone: '',
    down_payment: '',
    delivery_status: '',
    is_furnished: false,
    has_parking: false,
    has_elevator: false,
    has_pool: false,
    has_garden: false,
    has_basement: false,
    finishing_type: '',
    google_maps_url: '',
  });

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!id) return;
    const fetchProperty = async () => {
      setFetching(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/properties/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل تحميل العقار');
        if (data.owner_id !== user?.id) {
          navigate('/dashboard');
          return;
        }
        if (data.status !== 'pending') {
          setError('لا يمكن تعديل عقار بعد الموافقة عليه');
          setFetching(false);
          return;
        }
        setForm({
          title: data.title || '',
          title_ar: data.title_ar || data.title || '',
          description: data.description || '',
          type: data.type || 'شقة',
          purpose: data.purpose || 'sale',
          price: data.price ? String(data.price) : '',
          area: data.area ? String(data.area) : '',
          bedrooms: data.bedrooms ? String(data.bedrooms) : '',
          bathrooms: data.bathrooms ? String(data.bathrooms) : '',
          floor: data.floor ? String(data.floor) : '',
          district: data.district || '',
          address: data.address || '',
          contact_phone: data.contact_phone || '',
          down_payment: data.down_payment || '',
          delivery_status: data.delivery_status || '',
          is_furnished: Boolean(data.is_furnished),
          has_parking: Boolean(data.has_parking),
          has_elevator: Boolean(data.has_elevator),
          has_pool: Boolean(data.has_pool),
          has_garden: Boolean(data.has_garden),
          has_basement: Boolean(data.has_basement),
          finishing_type: data.finishing_type || '',
          google_maps_url: data.google_maps_url || '',
        });
        const imgs = Array.isArray(data.images)
          ? data.images.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean)
          : [];
        setUploadedImages(imgs);
        if (data.floor_plan_image) setFloorPlanImage(data.floor_plan_image);
      } catch (err: any) {
        setError(err.message || 'فشل تحميل العقار');
      } finally {
        setFetching(false);
      }
    };
    fetchProperty();
  }, [id, user?.id]);

  if (!user) return null;

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    const token = localStorage.getItem('token');
    try {
      const urls = await compressAndUploadMultiple(Array.from(files), token);
      if (urls.length === 0) throw new Error('فشل رفع الصور');
      setUploadedImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      setError(err.message || 'فشل رفع الصور');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handlePlanSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل رفع الصورة');
      setFloorPlanImage(data.url);
    } catch (err: any) {
      setError(err.message || 'فشل رفع الصورة');
    } finally {
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const propertyData = {
        ...form,
        price: Number(form.price),
        area: Number(form.area),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        floor: form.floor ? Number(form.floor) : null,
        images: uploadedImages,
        floor_plan_image: floorPlanImage || null,
      };
      const res = await fetch(`/api/properties/${id}/user-edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(propertyData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تعديل العقار');
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#99c8db] border-t-[#005a7d] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">تعديل العقار</h1>
              <p className="text-gray-500 text-sm">يمكنك التعديل طالما لم تتم الموافقة على عقارك بعد</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>بعد الحفظ سيعود العقار إلى قائمة المراجعة</span>
          </div>
        </motion.div>

        {success && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
            <CheckCircle size={22} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-green-700 font-bold">تم حفظ التعديلات بنجاح!</p>
              <p className="text-green-600 text-sm">جاري التحويل إلى حسابك...</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-700"><X size={20} /></button>
          </motion.div>
        )}

        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-gray-200 space-y-8">

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">المعلومات الأساسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العنوان (عربي) <span className="text-red-500">*</span></label>
                <input type="text" value={form.title_ar} onChange={e => update('title_ar', e.target.value)}
                  placeholder="مثال: شقة 3 غرف في التجمع الخامس"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع العقار</label>
                <select value={form.type} onChange={e => update('type', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الغرض</label>
                <select value={form.purpose} onChange={e => update('purpose', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]">
                  <option value="sale">بيع</option>
                  <option value="rent">إيجار</option>
                  <option value="resale">ريسيل</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم تواصلك <span className="text-red-500">*</span></label>
                <input type="tel" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)}
                  placeholder="مثال: 01100000000" dir="ltr" required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d] text-right" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)}
                placeholder="وصف تفصيلي للعقار..." rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d] resize-none" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">السعر والموقع</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر (جنيه) <span className="text-red-500">*</span></label>
                <input type="number" value={form.price} onChange={e => update('price', e.target.value)}
                  placeholder="0" min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المساحة (م²) <span className="text-red-500">*</span></label>
                <input type="number" value={form.area} onChange={e => update('area', e.target.value)}
                  placeholder="0" min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المنطقة <span className="text-red-500">*</span></label>
                <input type="text" value={form.district} onChange={e => update('district', e.target.value)}
                  placeholder="مثال: التجمع الخامس..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]"
                  list="edit-districts-list" required />
                <datalist id="edit-districts-list">
                  {['التجمع الخامس','مصر الجديدة','العاصمة الإدارية','طريق السويس','التجمع السادس','جولدن سكوير','النرجس الجديدة','بيت الوطن','شمال الرحاب','مدينة نصر','هليوبوليس','سيدي جابر','سموحة','المنتزه','العجمي','ستانلي','المندرة','كليوباترا','الدخيلة','برج العرب','الشيخ زايد','أكتوبر السادس','الجيزة','المهندسين','الزمالك','المعادي','الرحاب','القاهرة الجديدة','الشروق','مناطق أخرى'].map(d => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المقدم</label>
                <input type="text" value={form.down_payment} onChange={e => update('down_payment', e.target.value)}
                  placeholder="مثال: مقدم 750,000 جنيه"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">حالة التسليم</label>
                <input type="text" value={form.delivery_status} onChange={e => update('delivery_status', e.target.value)}
                  placeholder="مثال: استلام فوري"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Map size={14} />رابط موقع جوجل ماب (اختياري)
                </label>
                <input type="url" value={form.google_maps_url} onChange={e => update('google_maps_url', e.target.value)}
                  placeholder="https://maps.google.com/..." dir="ltr"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">التفاصيل</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عدد الغرف</label>
                <input type="number" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)}
                  placeholder="0" min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عدد الحمامات</label>
                <input type="number" value={form.bathrooms} onChange={e => update('bathrooms', e.target.value)}
                  placeholder="0" min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الطابق</label>
                <input type="number" value={form.floor} onChange={e => update('floor', e.target.value)}
                  placeholder="0" min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#005a7d]" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'is_furnished', label: 'مفروش' },
                { key: 'has_parking', label: 'موقف سيارات' },
                { key: 'has_elevator', label: 'مصعد' },
                { key: 'has_pool', label: 'حمام سباحة' },
                { key: 'has_garden', label: 'حديقة' },
                { key: 'has_basement', label: 'بيزمنت' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-gray-100 transition-colors">
                  <input type="checkbox" checked={form[item.key as keyof typeof form] as boolean}
                    onChange={e => update(item.key, e.target.checked)}
                    className="w-4 h-4 accent-[#005a7d] rounded" />
                  <span className="text-gray-700 text-sm">{item.label}</span>
                </label>
              ))}
              {FINISHING_OPTIONS.map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-gray-100 transition-colors">
                  <input type="checkbox"
                    checked={form.finishing_type === f}
                    onChange={e => update('finishing_type', e.target.checked ? f : '')}
                    className="w-4 h-4 accent-[#005a7d] rounded" />
                  <span className="text-gray-700 text-sm">{f}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">صور العقار</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-[#005a7d] transition-colors group"
              onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelect} className="hidden" />
              {uploadingImages ? (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 size={20} className="animate-spin" />
                  <span>جاري رفع الصور...</span>
                </div>
              ) : (
                <>
                  <Building2 size={32} className="mx-auto mb-2 text-gray-300 group-hover:text-[#005a7d] transition-colors" />
                  <p className="text-gray-500 text-sm font-medium">اضغط لرفع صور إضافية</p>
                  <p className="text-gray-400 text-xs mt-1">يمكنك اختيار أكثر من صورة دفعة واحدة</p>
                </>
              )}
            </div>
            {uploadedImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="" className="w-full h-32 object-cover rounded-xl" />
                    {idx === 0 && <span className="absolute bottom-2 right-2 bg-[#005a7d] text-white text-[10px] px-2 py-0.5 rounded-lg font-medium">رئيسية</span>}
                    <button type="button" onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Map size={18} />مسقط أفقي (2D) - اختياري
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:border-[#005a7d] transition-colors group"
              onClick={() => planInputRef.current?.click()}>
              <input ref={planInputRef} type="file" accept="image/*" onChange={handlePlanSelect} className="hidden" />
              {floorPlanImage ? (
                <div className="relative inline-block">
                  <img src={floorPlanImage} alt="مسقط" className="max-h-48 rounded-xl mx-auto" />
                  <button type="button" onClick={e => { e.stopPropagation(); setFloorPlanImage(''); }}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-lg">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Map size={28} className="mx-auto mb-2 text-gray-300 group-hover:text-[#005a7d] transition-colors" />
                  <p className="text-gray-500 text-sm">ارفع صورة التقسيم الداخلي (مسقط أفقي)</p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || success}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={20} className="animate-spin" />جاري الحفظ...</> : 'حفظ التعديلات'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')}
              className="px-6 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all">
              إلغاء
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
