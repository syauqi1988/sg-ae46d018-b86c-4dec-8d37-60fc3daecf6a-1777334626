import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Modal, Badge } from '@/components/ui'
import { DollarSign, Edit3, Plus, Trash2, Check, X, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'

interface PlanFeature {
  label: string
  included: boolean
}

interface PricingPlan {
  id: string
  plan_key: string
  name: string
  tagline: string
  monthly_price: number
  yearly_price: number
  yearly_discount_pct: number
  currency: string
  max_jobs: number | null
  max_customers: number | null
  features: PlanFeature[]
  is_active: boolean
  is_featured: boolean
  badge_text: string | null
  badge_color: string
  sort_order: number
  updated_at: string
}

const BADGE_COLORS = ['blue', 'green', 'amber', 'gray', 'red', 'purple']

const emptyForm = {
  plan_key: '',
  name: '',
  tagline: '',
  monthly_price: 0,
  yearly_price: 0,
  yearly_discount_pct: 20,
  max_jobs: '',
  max_customers: '',
  is_featured: false,
  badge_text: '',
  badge_color: 'blue',
  sort_order: 0,
  features: [] as PlanFeature[],
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [newFeature, setNewFeature] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<PricingPlan | null>(null)

  useEffect(() => { fetchPlans() }, [])

  // Auto-calc yearly price when monthly or discount changes
  useEffect(() => {
    if (form.monthly_price > 0 && form.yearly_discount_pct > 0) {
      const yearly = form.monthly_price * 12 * (1 - form.yearly_discount_pct / 100)
      setForm(f => ({ ...f, yearly_price: Math.round(yearly * 100) / 100 }))
    }
  }, [form.monthly_price, form.yearly_discount_pct])

  const fetchPlans = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('sort_order')
    setPlans(data ?? [])
    setLoading(false)
  }

  const openEdit = (plan: PricingPlan) => {
    setEditingPlan(plan)
    setIsNew(false)
    setForm({
      plan_key: plan.plan_key,
      name: plan.name,
      tagline: plan.tagline ?? '',
      monthly_price: plan.monthly_price,
      yearly_price: plan.yearly_price,
      yearly_discount_pct: plan.yearly_discount_pct,
      max_jobs: plan.max_jobs?.toString() ?? '',
      max_customers: plan.max_customers?.toString() ?? '',
      is_featured: plan.is_featured,
      badge_text: plan.badge_text ?? '',
      badge_color: plan.badge_color ?? 'blue',
      sort_order: plan.sort_order,
      features: [...plan.features],
    })
    setShowModal(true)
  }

  const openNew = () => {
    setEditingPlan(null)
    setIsNew(true)
    setForm(emptyForm)
    setShowModal(true)
  }

  const savePlan = async () => {
    if (!form.name || !form.plan_key) return
    setSaving(true)

    const payload = {
      plan_key: form.plan_key.toLowerCase().trim(),
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      monthly_price: Number(form.monthly_price),
      yearly_price: Number(form.yearly_price),
      yearly_discount_pct: Number(form.yearly_discount_pct),
      max_jobs: form.max_jobs ? Number(form.max_jobs) : null,
      max_customers: form.max_customers ? Number(form.max_customers) : null,
      is_featured: form.is_featured,
      badge_text: form.badge_text.trim() || null,
      badge_color: form.badge_color,
      sort_order: Number(form.sort_order),
      features: form.features,
    }

    if (isNew) {
      const { error } = await supabase.from('pricing_plans').insert(payload)
      if (error) { showToast(`Ralat: ${error.message}`); setSaving(false); return }
      showToast('Pelan baru berjaya ditambah!')
    } else {
      const { error } = await supabase
        .from('pricing_plans')
        .update(payload)
        .eq('id', editingPlan!.id)
      if (error) { showToast(`Ralat: ${error.message}`); setSaving(false); return }
      showToast('Pelan berjaya dikemaskini!')
    }

    setShowModal(false)
    fetchPlans()
    setSaving(false)
  }

  const toggleActive = async (plan: PricingPlan) => {
    await supabase
      .from('pricing_plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id)
    showToast(plan.is_active ? `${plan.name} dilumpuhkan` : `${plan.name} diaktifkan`)
    fetchPlans()
  }

  const deletePlan = async (plan: PricingPlan) => {
    await supabase.from('pricing_plans').delete().eq('id', plan.id)
    setConfirmDelete(null)
    showToast(`Pelan ${plan.name} dipadam`)
    fetchPlans()
  }

  const addFeature = () => {
    if (!newFeature.trim()) return
    setForm(f => ({
      ...f,
      features: [...f.features, { label: newFeature.trim(), included: true }]
    }))
    setNewFeature('')
  }

  const removeFeature = (index: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== index) }))
  }

  const toggleFeature = (index: number) => {
    setForm(f => ({
      ...f,
      features: f.features.map((feat, i) =>
        i === index ? { ...feat, included: !feat.included } : feat
      )
    }))
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const badgeVariant: Record<string, 'blue' | 'green' | 'amber' | 'gray' | 'red' | 'purple'> = {
    blue: 'blue', green: 'green', amber: 'amber',
    gray: 'gray', red: 'red', purple: 'purple'
  }

  const yearlyTotal = (monthly: number, pct: number) =>
    (monthly * 12 * (1 - pct / 100)).toFixed(2)

  const yearlySaving = (monthly: number, pct: number) =>
    (monthly * 12 * (pct / 100)).toFixed(2)

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <Check size={14} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign size={20} className="text-blue-600" />
            Pengurusan Pelan & Harga
          </h1>
          <p className="page-subtitle">
            Tetapkan harga dan ciri bagi setiap pelan langganan
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Pelan Baru
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Perubahan harga di sini akan dikemaskini dalam aplikasi WorkTrace secara langsung.
          Pastikan harga yang ditetapkan adalah tepat sebelum menyimpan.
          Pengguna sedia ada tidak akan terjejas sehingga tarikh pembaharuan mereka.
        </p>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-8 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded" />
              <div className="h-4 bg-slate-200 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`card p-5 flex flex-col gap-4 relative
                ${plan.is_featured ? 'border-2 border-blue-500' : ''}
                ${!plan.is_active ? 'opacity-60' : ''}
              `}
            >
              {/* Featured ribbon */}
              {plan.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs px-3 py-0.5 rounded-full font-medium shadow">
                    {plan.badge_text ?? 'Paling Popular'}
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-start justify-between pt-1">
                <div>
                  {plan.badge_text && !plan.is_featured && (
                    <Badge variant={badgeVariant[plan.badge_color] ?? 'gray'}>
                      {plan.badge_text}
                    </Badge>
                  )}
                  <h3 className="text-base font-semibold text-slate-900 mt-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400">{plan.tagline}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                    title="Edit pelan"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(plan)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    title={plan.is_active ? 'Lumpuhkan' : 'Aktifkan'}
                  >
                    {plan.is_active
                      ? <ToggleRight size={16} className="text-green-500" />
                      : <ToggleLeft size={16} className="text-slate-400" />
                    }
                  </button>
                  {plan.plan_key !== 'free' && plan.plan_key !== 'pro' && (
                    <button
                      onClick={() => setConfirmDelete(plan)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                      title="Padam pelan"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Harga Bulanan</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">
                      RM {plan.monthly_price.toLocaleString('ms-MY', { minimumFractionDigits: plan.monthly_price % 1 !== 0 ? 2 : 0 })}
                    </span>
                    <span className="text-sm text-slate-400">/bulan</span>
                  </div>
                </div>

                {plan.monthly_price > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-400 mb-0.5">
                      Harga Tahunan ({plan.yearly_discount_pct}% diskaun)
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-slate-700">
                        RM {plan.yearly_price.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-400">/tahun</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs line-through text-slate-400">
                        RM {(plan.monthly_price * 12).toLocaleString('ms-MY', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                        Jimat RM {yearlySaving(plan.monthly_price, plan.yearly_discount_pct)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-slate-400">Had Kerja</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {plan.max_jobs ?? '∞'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-slate-400">Had Pelanggan</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {plan.max_customers ?? '∞'}
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {f.included
                      ? <Check size={13} className="text-green-500 flex-shrink-0" />
                      : <X size={13} className="text-slate-300 flex-shrink-0" />
                    }
                    <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Status + last updated */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Badge variant={plan.is_active ? 'green' : 'gray'}>
                  {plan.is_active ? 'Aktif' : 'Tidak Aktif'}
                </Badge>
                <p className="text-[10px] text-slate-400">
                  Dikemaskini {new Date(plan.updated_at).toLocaleDateString('ms-MY')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isNew ? 'Tambah Pelan Baru' : `Edit Pelan — ${editingPlan?.name}`}
        size="lg"
      >
        <div className="space-y-5">

          {/* Basic Info */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Maklumat Asas
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kunci Pelan *
                </label>
                <input
                  className="input"
                  value={form.plan_key}
                  onChange={e => setForm(f => ({ ...f, plan_key: e.target.value.toLowerCase() }))}
                  placeholder="free / pro / team"
                  disabled={!isNew}
                />
                {!isNew && (
                  <p className="text-xs text-slate-400 mt-1">
                    Kunci pelan tidak boleh diubah
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Pelan *
                </label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Free / Pro / Team"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tagline
              </label>
              <input
                className="input"
                value={form.tagline}
                onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="Cuba dulu, rasa dulu"
              />
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Harga (MYR)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Harga Bulanan (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">RM</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input pl-9"
                    value={form.monthly_price}
                    onChange={e => setForm(f => ({ ...f, monthly_price: Number(e.target.value) }))}
                    placeholder="49"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Diskaun Tahunan (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input pr-7"
                    value={form.yearly_discount_pct}
                    onChange={e => setForm(f => ({ ...f, yearly_discount_pct: Number(e.target.value) }))}
                    placeholder="20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Harga Tahunan (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">RM</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input pl-9"
                    value={form.yearly_price}
                    onChange={e => setForm(f => ({ ...f, yearly_price: Number(e.target.value) }))}
                  />
                </div>
                {form.monthly_price > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Jimat RM {yearlySaving(form.monthly_price, form.yearly_discount_pct)}/tahun
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Limits */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Had Penggunaan
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Had Kerja Aktif
                </label>
                <input
                  type="number"
                  className="input"
                  value={form.max_jobs}
                  onChange={e => setForm(f => ({ ...f, max_jobs: e.target.value }))}
                  placeholder="Kosong = tanpa had"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Had Pelanggan
                </label>
                <input
                  type="number"
                  className="input"
                  value={form.max_customers}
                  onChange={e => setForm(f => ({ ...f, max_customers: e.target.value }))}
                  placeholder="Kosong = tanpa had"
                />
              </div>
            </div>
          </div>

          {/* Badge & Display */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Paparan & Lencana
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teks Lencana
                </label>
                <input
                  className="input"
                  value={form.badge_text}
                  onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
                  placeholder="Paling Popular / Akan Datang"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Warna Lencana
                </label>
                <div className="flex gap-2">
                  {BADGE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, badge_color: color }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        form.badge_color === color ? 'scale-125 border-slate-700' : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor: {
                          blue: '#3B82F6', green: '#22C55E', amber: '#F59E0B',
                          gray: '#9CA3AF', red: '#EF4444', purple: '#A855F7'
                        }[color]
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={form.is_featured}
                  onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="is_featured" className="text-sm text-slate-700 cursor-pointer">
                  Tandakan sebagai Pelan Utama
                  <p className="text-xs text-slate-400">Papar ribbon "Paling Popular"</p>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Urutan Paparan
                </label>
                <input
                  type="number"
                  className="input"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  placeholder="1, 2, 3..."
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Senarai Ciri
            </h4>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {form.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleFeature(i)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      feat.included ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    {feat.included
                      ? <Check size={11} className="text-white" />
                      : <X size={11} className="text-white" />
                    }
                  </button>
                  <span className={`text-sm flex-1 ${feat.included ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                    {feat.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="text-slate-300 hover:text-red-400 p-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {form.features.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">
                  Tiada ciri ditambah lagi
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="Tambah ciri baru... (tekan Enter)"
              />
              <button
                type="button"
                onClick={addFeature}
                disabled={!newFeature.trim()}
                className="btn-outline flex items-center gap-1.5 disabled:opacity-40"
              >
                <Plus size={14} /> Tambah
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <button onClick={() => setShowModal(false)} className="btn-outline">
              Batal
            </button>
            <button
              onClick={savePlan}
              disabled={!form.name || !form.plan_key || saving}
              className="btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
              ) : (
                <><Check size={14} /> {isNew ? 'Tambah Pelan' : 'Simpan Perubahan'}</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Padam Pelan?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Pelan <strong>{confirmDelete?.name}</strong> akan dipadam secara kekal.
              Pengguna yang sedang dalam pelan ini tidak akan terjejas sehingga tarikh tamat mereka.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfirmDelete(null)} className="btn-outline">Batal</button>
            <button onClick={() => deletePlan(confirmDelete!)} className="btn-danger">
              Ya, Padam
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}