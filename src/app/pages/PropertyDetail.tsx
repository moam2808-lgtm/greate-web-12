import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Bed, Bath, Maximize, MapPin, Phone, MessageCircle, Heart, ArrowRight, CheckCircle, Building2, Eye, CreditCard, Wallet, ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop';

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'instapay' | 'vodafone'>('instapay');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      api.getProperty(Number(id))
        .then(prop => {
          setProperty(prop);
          // Fetch similar properties based on type and purpose
          return api.getProperties({ type: prop.type, purpose: prop.purpose, limit: 3 });
        })
        .then(result => {
          const props = Array.isArray(result) ? result : (result?.properties || []);
          // Filter out current property and limit to 3
          const filtered = props.filter((p: any) => p.id !== Number(id)).slice(0, 3);
          setRecommendations(filtered);
        })
        .catch(() => navigate('/properties'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handlePayment = async () => {
    if (!user) return navigate('/login');
    setPaymentLoading(true);
    try {
      await api.requestPayment({ property_id: property.id, amount: property.price, payment_method: paymentMethod });
      setPaymentDone(true);
    } catch (err: any) {
      alert(err.message || 'خطأ في طلب الدفع');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <div className="w-12 h-12 border-4 border-[#ccdfed] border-t-[#005a7d] rounded-full animate-spin" />
    </div>
  );

  if (!property) return null;

  const images = property.images?.filter(Boolean) || [{ url: DEFAULT_IMAGE }];
  const price = property.purpose === 'rent'
    ? `${Number(property.price).toLocaleString()} جنيه/شهر`
    : `${Number(property.price).toLocaleString()} جنيه`;

  return (
    <div className="min-h-screen bg-gray-50 pt-20" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-[#005a7d]">الرئيسية</Link>
          <span>›</span>
          <Link to="/properties" className="hover:text-[#005a7d]">العقارات</Link>
          <span>›</span>
          <span className="text-gray-900 line-clamp-1">{property.title_ar || property.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images + Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="relative h-80 lg:h-96">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    src={images[activeImage]?.url || DEFAULT_IMAGE}
                    alt={property.title_ar}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                  />
                </AnimatePresence>
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${property.purpose === 'sale' ? 'bg-[#005a7d]' : 'bg-gray-900'}`}>
                    {property.purpose === 'sale' ? 'للبيع' : 'للإيجار'}
                  </span>
                  <span className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-[#005a7d]">{property.type}</span>
                </div>
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img: any, i: number) => (
                    <button key={i} onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? 'border-[#005a7d]' : 'border-transparent'}`}
                    >
                      <img src={img.url || DEFAULT_IMAGE} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h1 className="text-2xl font-black text-gray-900 mb-2">{property.title_ar || property.title}</h1>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                <MapPin size={14} className="text-[#005a7d]" />
                <span>{property.address || property.district}، {property.city || 'الإسكندرية'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#e6f2f5] rounded-xl mb-6">
                {property.rooms > 0 && (
                  <div className="text-center">
                    <Bed size={20} className="text-[#005a7d] mx-auto mb-1" />
                    <div className="font-bold text-gray-900 text-lg">{property.rooms}</div>
                    <div className="text-xs text-gray-500">غرف نوم</div>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="text-center">
                    <Bath size={20} className="text-[#005a7d] mx-auto mb-1" />
                    <div className="font-bold text-gray-900 text-lg">{property.bathrooms}</div>
                    <div className="text-xs text-gray-500">حمامات</div>
                  </div>
                )}
                <div className="text-center">
                  <Maximize size={20} className="text-[#005a7d] mx-auto mb-1" />
                  <div className="font-bold text-gray-900 text-lg">{property.area}</div>
                  <div className="text-xs text-gray-500">م²</div>
                </div>
                {property.floor && (
                  <div className="text-center">
                    <Building2 size={20} className="text-[#005a7d] mx-auto mb-1" />
                    <div className="font-bold text-gray-900 text-lg">{property.floor}</div>
                    <div className="text-xs text-gray-500">الطابق</div>
                  </div>
                )}
                <div className="text-center">
                  <Eye size={20} className="text-[#005a7d] mx-auto mb-1" />
                  <div className="font-bold text-gray-900 text-lg">{property.views || 0}</div>
                  <div className="text-xs text-gray-500">مشاهدة</div>
                </div>
              </div>

              {property.description && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">الوصف</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{property.description_ar || property.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Price + Actions */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <div className="text-3xl font-black text-[#005a7d] mb-1">{price}</div>
              <div className="text-sm text-gray-500 mb-6">{property.district}، {property.city || 'الإسكندرية'}</div>

              {property.status === 'approved' && property.purpose === 'sale' && (
                <button onClick={() => { if (!user) navigate('/login'); else navigate(`/payment/${property.id}`); }}
                  className="w-full bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-[#ccdfed] transition-all mb-3 flex items-center justify-center gap-2"
                >
                  <CreditCard size={16} />طلب الشراء
                </button>
              )}

              <a href={`https://wa.me/20${(property.contact_phone || '01100111618').replace(/^0/, '')}?text=مرحباً، أريد الاستفسار عن: ${property.title_ar || property.title}`} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-600 transition-all mb-3"
              >
                <MessageCircle size={16} />تواصل عبر واتساب
              </a>

              <a href={`tel:${property.contact_phone || '01100111618'}`}
                className="w-full flex items-center justify-center gap-2 border-2 border-[#005a7d] text-[#005a7d] py-3 rounded-xl font-bold text-sm hover:bg-[#e6f2f5] transition-all"
              >
                <Phone size={16} />{property.contact_phone || '01100111618'}
              </a>

              {property.status === 'sold' && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl text-center text-red-600 text-sm font-semibold">تم بيع هذا العقار</div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-200">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-black text-gray-900 mb-6">عقارات مشابهة قد تنال إعجابك</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendations.map((rec, idx) => {
                  const imgs = rec.images?.length ? rec.images.map((i: any) => i.url) : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'];
                  return (
                    <motion.div key={rec.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden border border-gray-100 group"
                    >
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img src={imgs[0]} alt={rec.title_ar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'; }}
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <span className="bg-[#bca056] text-[#005a7d] text-xs font-bold px-2 py-1 rounded-full">{rec.purpose === 'sale' ? 'للبيع' : 'للإيجار'}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <Link to={`/properties/${rec.id}`} className="block">
                          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-[#005a7d] transition-colors mb-2">{rec.title_ar}</h3>
                        </Link>
                        <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
                          <MapPin size={12} className="text-[#bca056]" />
                          <span>{rec.district}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-3 flex-wrap">
                          {rec.bedrooms > 0 && <span className="flex items-center gap-0.5"><Bed size={12} />{rec.bedrooms}</span>}
                          {rec.bathrooms > 0 && <span className="flex items-center gap-0.5"><Bath size={12} />{rec.bathrooms}</span>}
                          {rec.area > 0 && <span className="flex items-center gap-0.5"><Maximize size={12} />{rec.area}م²</span>}
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-[#005a7d] font-black text-sm">{Number(rec.price).toLocaleString('ar-EG')} ج</div>
                          </div>
                          <Link to={`/properties/${rec.id}`} className="text-[#005a7d] hover:text-[#007a9a] text-sm font-bold flex items-center gap-0.5">
                            التفاصيل <ChevronLeft size={12} />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPayment(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
              dir="rtl"
            >
              {paymentDone ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">تم استلام طلبك!</h3>
                  <p className="text-gray-500 text-sm mb-4">سيتواصل معك فريقنا خلال 24 ساعة لإتمام الإجراءات.</p>
                  <button onClick={() => setShowPayment(false)} className="w-full bg-[#005a7d] text-white py-3 rounded-xl font-bold text-sm">حسناً</button>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-black text-gray-900 mb-1">طلب الشراء</h3>
                  <p className="text-gray-500 text-sm mb-6">{property.title_ar}</p>

                  <div className="bg-[#e6f2f5] rounded-xl p-4 mb-6">
                    <div className="text-2xl font-black text-[#005a7d]">{Number(property.price).toLocaleString()} جنيه</div>
                    <div className="text-xs text-gray-500 mt-1">المبلغ الإجمالي</div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-3">اختر طريقة الدفع</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPaymentMethod('instapay')}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'instapay' ? 'border-[#005a7d] bg-[#e6f2f5]' : 'border-gray-200 hover:border-[#ccdfed]'}`}
                      >
                        <Wallet size={20} className={`mx-auto mb-1 ${paymentMethod === 'instapay' ? 'text-[#005a7d]' : 'text-gray-400'}`} />
                        <div className="text-sm font-bold text-gray-800">InstaPay</div>
                      </button>
                      <button onClick={() => setPaymentMethod('vodafone')}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'vodafone' ? 'border-[#005a7d] bg-[#e6f2f5]' : 'border-gray-200 hover:border-[#ccdfed]'}`}
                      >
                        <Wallet size={20} className={`mx-auto mb-1 ${paymentMethod === 'vodafone' ? 'text-[#005a7d]' : 'text-gray-400'}`} />
                        <div className="text-sm font-bold text-gray-800">فودافون كاش</div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
                    <p className="font-bold text-gray-700 mb-2">رقم المحفظة (InstaPay / فودافون كاش):</p>
                    <p className="text-[#005a7d] font-black text-xl" dir="ltr">01100111618</p>
                    <p className="text-gray-500 text-xs mt-2">حوّل المبلغ ثم أرسل صورة التحويل عبر واتساب على نفس الرقم</p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setShowPayment(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-sm hover:bg-gray-50">إلغاء</button>
                    <button onClick={handlePayment} disabled={paymentLoading}
                      className="flex-1 bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-70"
                    >
                      {paymentLoading ? 'جاري الإرسال...' : 'تأكيد الطلب'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
