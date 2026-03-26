/**
 * Map VehicleEditForm / create form state to Supabase `inventories` columns only.
 * Extra UI-only fields are folded into comment1/comment2.
 */

type FormLike = Record<string, unknown>

export function mapVehicleFormToDbUpdate(f: FormLike) {
  const yearRaw = f.year
  let year: number | null = null
  if (typeof yearRaw === 'number' && !Number.isNaN(yearRaw)) year = yearRaw
  else if (yearRaw != null && String(yearRaw).trim() !== '') {
    const n = parseInt(String(yearRaw), 10)
    year = Number.isNaN(n) ? null : n
  }

  const comment1Parts = [f.notes, f.features, f.equipment, f.repair_history]
    .filter((x) => x != null && String(x).trim() !== '')
    .map(String)
  const comment1 = comment1Parts.length > 0 ? comment1Parts.join('\n') : null

  const comment2Parts = [
    f.store_name,
    f.contact_person,
    f.contact_phone,
    f.contact_email,
    f.location,
    f.transmission ? `MT/AT: ${f.transmission}` : null,
    f.fuel_type ? `燃料: ${f.fuel_type}` : null,
    f.drive_type ? `駆動: ${f.drive_type}` : null,
    f.one_owner ? 'ワンオーナー' : null,
  ].filter((x) => x != null && String(x).trim() !== '')
  const comment2 = comment2Parts.length > 0 ? comment2Parts.join(' / ') : null

  return {
    vehicle_code: String(f.vehicle_code ?? '').trim(),
    maker: f.maker != null ? String(f.maker) : null,
    car_name: f.car_name != null ? String(f.car_name) : null,
    grade: f.grade != null ? String(f.grade) : null,
    price_body: typeof f.price_body === 'number' ? f.price_body : null,
    price_total: typeof f.price_total === 'number' ? f.price_total : null,
    status: f.status != null ? String(f.status) : null,
    publication_status: f.publication_status != null ? String(f.publication_status) : null,
    stock_status: f.stock_status != null ? String(f.stock_status) : 'あり',
    year,
    mileage: typeof f.mileage === 'number' ? f.mileage : null,
    color: f.body_color != null ? String(f.body_color) : null,
    inspection: f.vehicle_inspection != null ? String(f.vehicle_inspection) : null,
    comment1,
    comment2,
    updated_at: new Date().toISOString(),
  }
}

export function mapVehicleFormToDbInsert(f: FormLike) {
  const base = mapVehicleFormToDbUpdate(f)
  const now = new Date().toISOString()
  const pub = base.publication_status === '掲載'
  return {
    ...base,
    detail_views: 0,
    email_inquiries: 0,
    phone_inquiries: 0,
    published_date: pub ? now.split('T')[0] : null,
    inserted_at: now,
    updated_at: now,
  }
}
