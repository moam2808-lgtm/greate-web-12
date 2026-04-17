import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, X, Building2, Phone, MapPin, Star, ChevronLeft, ChevronRight, BedDouble, Bath, Maximize2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const COMPANY_PHONE = '01100111618';

export const FEATURED: any[] = [];

const DISTRICTS_FILTER = ['الكل', 'طريق السويس', 'التجمع الخامس', 'جولدن سكوير', 'التجمع السادس', 'مصر الجديدة', 'الشيخ زايد', 'مناطق أخرى'];
const SEARCH_AREAS = [
  'التجمع الخامس', 'التجمع السادس', 'مصر الجديدة', 'جولدن سكوير', 'النرجس الجديدة',
  'بيت الوطن', 'شمال الرحاب', 'مدينة نصر', 'هليوبوليس', 'طريق السويس', 'الرحاب',
  'الشيخ زايد', 'أكتوبر السادس', 'الجيزة', 'الدقي', 'المهندسين', 'الزمالك', 'المعادي',
  'التجمع الأول', 'التجمع الثالث', 'القاهرة الجديدة', 'الشروق', 'المقطم', 'حلوان',
];
const TYPES_FILTER = ['الكل', 'شقة', 'استديو', 'دوبلكس', 'فيلا', 'مكتب', 'شاليه', 'محل تجاري', 'أرض'];
const PURPOSE_FILTER = ['الكل', 'بيع', 'إيجار', 'ريسيل'];

function formatPrice(price: number) {
  if (!price) return 'تواصل للسعر';
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)} مليون ج`;
  if (price >= 1000) return `${(price / 1000).toFixed(0)} ألف ج`;
  return `${price.toLocaleString()} ج`;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop&q=80';

export default function Properties() {
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('الكل');
  const [type, setType] = useState('الكل');
  const [purpose, setPurpose] = useState('الكل');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('الكل');
  const [showFilters, setShowFilters] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);

  const [dbProperties, setDbProperties] = useState<any[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [featuredImageSlides, setFeaturedImageSlides] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadProperties() {
      setLoadingProps(true);
      try {
        const data = await api.getProperties({ limit: 50 });
        if (cancelled) return;
        console.log('[Properties] API response:', data);
        const list = Array.isArray(data) ? data : (data?.properties || []);
        setDbProperties(list);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[Properties] Load error:', err);
        if (err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
          setDbProperties([]);
        }
      } finally {
        if (!cancelled) setLoadingProps(false);
      }
    }
    loadProperties();
    return () => { cancelled = true; };
  }, []);

  const purposeMap: Record<string,string> = { 'بيع': 'sale', 'إيجار': 'rent', 'ريسيل': 'resale' };
  const filteredAreas = SEARCH_AREAS.filter(area => area.includes(districtSearch));

  const filtered = FEATURED.filter(p => {
    const matchSearch = !search || p.title.includes(search) || p.desc.includes(search) || p.district.includes(search);
    const matchDistrict = district === 'الكل' || p.district === district;
    const matchType = type === 'الكل' || p.type.includes(type);
    const matchPurpose = purpose === 'الكل' || true;
    const matchMin = !minPrice || (Number(p.price?.replace(/[^0-9]/g,'')) >= Number(minPrice));
    const matchMax = !maxPrice || (Number(p.price?.replace(/[^0-9]/g,'')) <= Number(maxPrice));
    return matchSearch && matchDistrict && matchType && matchPurpose && matchMin && matchMax;
  });

  const activeDistrict = district === 'مناطق أخرى' ? districtSearch.trim() : district;

const safeDbProperties = Array.isArray(dbProperties) ? dbProperties : [];

  const filteredDb = safeDbProperties.filter(p => {
    const matchSearch = !search || (p.title_ar || p.title || '').includes(search) || (p.description_ar || p.description || '').includes(search) || (p.district || '').includes(search);
    const matchDistrict = !activeDistrict || activeDistrict === 'الكل' || (p.district || '').includes(activeDistrict);
    const matchType = type === 'الكل' || (p.type || '').includes(type);
    const matchPurpose = purpose === 'الكل' || (p.purpose || '') === purposeMap[purpose];
    const matchMin = !minPrice || Number(p.price) >= Number(minPrice);
    const matchMax = !maxPrice || Number(p.price) <= Number(maxPrice);
    const matchFeatured = featuredFilter === 'الكل' || (featuredFilter === 'مميز' ? Boolean(p.is_featured) : !p.is_featured);
    return matchSearch && matchDistrict && matchType && matchPurpose && matchMin && matchMax && matchFeatured;
  });

  console.log('[Properties] dbProperties:', safeDbProperties.length, 'filteredDb:', filteredDb.length);

  const filteredDbFeatured = filteredDb.filter(p => p.is_featured);
  const filteredDbNormal = filteredDb.filter(p => !p.is_featured);

  const clearFilters = () => { setSearch(''); setDistrict('الكل'); setDistrictSearch(''); setType('الكل'); setPurpose('الكل'); setMinPrice(''); setMaxPrice(''); setFeaturedFilter('الكل'); };
  const activeCount = [search, (district !== 'الكل' && district !== 'مناطق أخرى') ? district : districtSearch, type !== 'الكل' ? type : '', purpose !== 'الكل' ? purpose : '', minPrice, maxPrice, featuredFilter !== 'الكل' ? featuredFilter : ''].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#bca056] to-[#a68a47] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-white font-black text-3xl mb-2">تصفح العقارات</motion.h1>
          <p className="text-white/80">أكثر من 100 عقار في مختلف الأماكن · ابحث، قارن وتواصل معنا</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن عقار..."
                className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-[#005a7d] transition-all"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${showFilters ? 'bg-[#005a7d] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#e6f2f5]'}`}
            >
              <SlidersHorizontal size={16} />فلاتر
              {activeCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>}
            </button>
            {activeCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all">
                <X size={14} />مسح
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الوحدة</label>
                    <select value={type} onChange={e => setType(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                    >
                      {TYPES_FILTER.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">الغرض</label>
                    <select value={purpose} onChange={e => setPurpose(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                    >
                      {PURPOSE_FILTER.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">المنطقة</label>
                    <select value={district} onChange={e => { setDistrict(e.target.value); setDistrictSearch(''); setShowDistrictSuggestions(false); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                    >
                      {DISTRICTS_FILTER.map(d => <option key={d}>{d}</option>)}
                    </select>
                    {district === 'مناطق أخرى' && (
                      <div className="mt-1.5 relative">
                        <input
                          value={districtSearch}
                          onChange={e => { setDistrictSearch(e.target.value); setShowDistrictSuggestions(true); }}
                          onFocus={() => setShowDistrictSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowDistrictSuggestions(false), 150)}
                          placeholder="ابحث عن منطقة..."
                          className="w-full border border-[#005a7d]/40 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                        />
                        {showDistrictSuggestions && filteredAreas.length > 0 && (
                          <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {filteredAreas.map(area => (
                              <button key={area} type="button"
                                onMouseDown={() => { setDistrictSearch(area); setShowDistrictSuggestions(false); }}
                                className="w-full text-right px-3 py-2 text-sm text-gray-700 hover:bg-[#e6f2f5] hover:text-[#005a7d] transition-colors border-b border-gray-50 last:border-0"
                              >{area}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الإعلان</label>
                    <select value={featuredFilter} onChange={e => setFeaturedFilter(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                    >
                      <option value="الكل">الكل</option>
                      <option value="مميز">مميز</option>
                      <option value="عادي">عادي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">السعر الأدنى (ج)</label>
                    <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">السعر الأقصى (ج)</label>
                    <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                      placeholder="غير محدد"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#005a7d]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Featured Properties */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-[#bca056] to-[#a68a47] rounded-lg flex items-center justify-center">
            <Star size={16} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900">عقارات مميزة</h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#bca056]/30" />
          <span className="text-sm text-gray-400">{filtered.length + filteredDbFeatured.length} عقار</span>
        </div>

        {filtered.length === 0 && filteredDbFeatured.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 mb-8">
            <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">لا توجد عقارات مميزة تطابق البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[...filtered, ...filteredDbFeatured.map(p => {
              const imgs = Array.isArray(p.images) && p.images.length > 0 ? p.images.map((i: any) => typeof i === 'string' ? i : i.url) : [p.primary_image || DEFAULT_IMAGE];
              return {
                id: String(p.id),
                title: p.title_ar || p.title || 'عقار مميز',
                badge: 'عرض مميز',
                badgeColor: 'bg-[#bca056]',
                images: imgs,
                desc: p.description_ar || p.description || '',
                district: p.district || '',
                type: p.type || 'عقار',
                bedrooms: p.bedrooms || 0,
                bathrooms: p.bathrooms || 0,
                area: p.area || 0,
                finishing_type: p.finishing_type || '',
                rooms: p.rooms || 0,
                price: formatPrice(p.price),
                down: p.down_payment || p.delivery_status || 'تفاصيل متاحة',
                contact_phone: p.contact_phone || COMPANY_PHONE,
                delivery_status: p.delivery_status,
                address: p.address || '',
              };
            })].map((f: any, i) => {
              const curImg = featuredImageSlides[String(f.id)] ?? 0;
              const slideImg = (dir: number) => {
                setFeaturedImageSlides(prev => ({ ...prev, [String(f.id)]: ((prev[String(f.id)] ?? 0) + dir + f.images.length) % f.images.length }));
              };
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                >
                  <Link to={`/properties/${f.id}`} className="block">
                  <div className="relative h-48 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={curImg}
                        src={f.images[curImg]}
                        alt={f.title}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0"
                        onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                      />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <span className={`absolute top-3 right-3 ${f.badgeColor} text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow`}>{f.badge}</span>
                    {f.images.length > 1 && (
                      <>
                        <button onClick={() => slideImg(-1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all z-10">
                          <ChevronRight size={14} />
                        </button>
                        <button onClick={() => slideImg(1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all z-10">
                          <ChevronLeft size={14} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                          {f.images.map((_: string, imgIdx: number) => (
                            <button key={imgIdx} onClick={() => setFeaturedImageSlides(prev => ({ ...prev, [String(f.id)]: imgIdx }))}
                              className={`rounded-full transition-all ${imgIdx === curImg ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1">
                      <MapPin size={11} className="text-[#005a7d]" />
                      <span className="text-xs font-semibold text-gray-700">{f.district}</span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-gray-900 text-sm mb-3 leading-snug">{f.title}</h3>
                    {f.address && <p className="text-gray-400 text-xs mb-2">{f.address}</p>}
                    {f.desc && <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{f.desc}</p>}
                    
                    {/* Property Specs */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3 flex-wrap">
                      {f.bedrooms > 0 && <span className="flex items-center gap-0.5"><BedDouble size={12} className="text-[#005a7d]" />{f.bedrooms}</span>}
                      {f.bathrooms > 0 && <span className="flex items-center gap-0.5"><Bath size={12} className="text-[#005a7d]" />{f.bathrooms}</span>}
                      {f.area > 0 && <span className="flex items-center gap-0.5"><Maximize2 size={12} className="text-[#005a7d]" />{f.area}م²</span>}
                      {f.finishing_type && <span className="bg-[#e6f2f5] text-[#005a7d] px-1.5 py-0.5 rounded text-xs font-medium">{f.finishing_type}</span>}
                    </div>
                    
                    {f.delivery_status && (
                      <p className="text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1 text-xs font-bold mb-3 w-fit">{f.delivery_status}</p>
                    )}
                  </div>
                  </Link>

                  <div className="p-5 pt-0">
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[#005a7d] font-black text-sm">{f.price}</p>
                          <p className="text-[#bca056] text-xs font-semibold mt-0.5">{f.down}</p>
                        </div>
                        <span className="text-xs bg-[#e6f2f5] text-[#005a7d] font-semibold px-2.5 py-1 rounded-lg">{f.type}</span>
                      </div>
                      <a
                        href={`tel:+2${f.contact_phone || COMPANY_PHONE}`}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition-all"
                      >
                        <Phone size={14} />
                        اتصل الآن
                      </a>
                      <a
                        href={`https://wa.me/2${f.contact_phone || COMPANY_PHONE}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 text-sm font-bold py-2.5 rounded-xl hover:bg-green-100 transition-all mt-2 border border-green-200"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        واتساب
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* All DB Properties */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-[#005a7d] to-[#007a9a] rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900">جميع العقارات</h2>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#005a7d]/30" />
          {!loadingProps && <span className="text-sm text-gray-400">{filteredDbNormal.length} عقار</span>}
        </div>

        {loadingProps ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-[#005a7d]" />
          </div>
        ) : filteredDbNormal.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-[#e6f2f5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-[#005a7d]" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg mb-2">لا توجد عقارات</h3>
            <p className="text-gray-500 text-sm mb-4">
              {activeCount > 0 ? 'لم يتم العثور على عقارات تطابق البحث' : 'لم يتم إضافة أي عقارات بعد'}
            </p>
            {activeCount > 0 && (
              <button onClick={clearFilters} className="text-[#005a7d] text-sm font-medium hover:underline">مسح البحث</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDbNormal.map((p, i) => {
              const title = p.title_ar || p.title || 'عقار';
              const image = p.primary_image || (Array.isArray(p.images) && p.images[0]) || DEFAULT_IMAGE;
              const phone = p.contact_phone || COMPANY_PHONE;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                >
                  <Link to={`/properties/${p.id}`} className="block">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <span className="absolute top-3 right-3 bg-[#005a7d] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">
                      {p.purpose === 'rent' ? 'للإيجار' : 'للبيع'}
                    </span>
                    {p.district && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1">
                        <MapPin size={11} className="text-[#005a7d]" />
                        <span className="text-xs font-semibold text-gray-700">{p.district}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-gray-900 text-sm mb-2 leading-snug">{title}</h3>
                    {(p.description_ar || p.description) && (
                      <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-3">{p.description_ar || p.description}</p>
                    )}

                    {/* Specs */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
                      {(p.bedrooms || p.rooms) ? (
                        <span className="flex items-center gap-1">
                          <BedDouble size={12} className="text-[#005a7d]" />
                          {p.bedrooms || p.rooms} غرف
                        </span>
                      ) : null}
                      {p.bathrooms ? (
                        <span className="flex items-center gap-1">
                          <Bath size={12} className="text-[#005a7d]" />
                          {p.bathrooms} حمام
                        </span>
                      ) : null}
                      {p.area ? (
                        <span className="flex items-center gap-1">
                          <Maximize2 size={12} className="text-[#005a7d]" />
                          {p.area} م²
                        </span>
                      ) : null}
                      {p.finishing_type ? (
                        <span className="bg-[#e6f2f5] text-[#005a7d] px-2 py-0.5 rounded-lg text-xs font-medium">{p.finishing_type}</span>
                      ) : null}
                      {p.down_payment ? (
                        <span className="font-semibold text-[#bca056]">مقدم: {p.down_payment}</span>
                      ) : null}
                      {p.delivery_status ? (
                        <span className="font-semibold text-green-700">{p.delivery_status}</span>
                      ) : null}
                    </div>
                  </div>
                  </Link>

                  <div className="p-5 pt-0">
                    <div className="border-t border-gray-100 pt-4 mt-auto">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[#005a7d] font-black text-sm">{formatPrice(p.price)}</p>
                        </div>
                        <span className="text-xs bg-[#e6f2f5] text-[#005a7d] font-semibold px-2.5 py-1 rounded-lg">{p.type}</span>
                      </div>
                      <a
                        href={`tel:+2${phone}`}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#005a7d] to-[#007a9a] text-white text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition-all"
                      >
                        <Phone size={14} />
                        اتصل الآن
                      </a>
                      <a
                        href={`https://wa.me/2${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 text-sm font-bold py-2.5 rounded-xl hover:bg-green-100 transition-all mt-2 border border-green-200"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        واتساب
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
