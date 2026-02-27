import { supabase } from './supabase.js'

// ─── Users ───
export const dbGetUsers = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('users').select('*').order('created_at')
  if (error) { console.error('dbGetUsers:', error); return null }
  return data
}

export const dbCreateUser = async (user) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('users').insert([user]).select().single()
  if (error) { console.error('dbCreateUser:', error); return null }
  return data
}

export const dbUpdateUser = async (id, updates) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
  if (error) { console.error('dbUpdateUser:', error); return null }
  return data
}

// ─── Clients ───
export const dbGetClients = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
  if (error) { console.error('dbGetClients:', error); return null }
  return data
}

export const dbCreateClient = async (client) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('clients').insert([client]).select().single()
  if (error) { console.error('dbCreateClient:', error); return null }
  return data
}

export const dbUpdateClient = async (id, updates) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single()
  if (error) { console.error('dbUpdateClient:', error); return null }
  return data
}

// ─── Products ───
export const dbGetProducts = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('products').select('*').eq('active', true).order('category')
  if (error) { console.error('dbGetProducts:', error); return null }
  return data
}

// ─── Appointments ───
export const dbGetAppointments = async () => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('dbGetAppointments:', error); return null }
  return data
}

export const dbCreateAppointment = async (appt) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('appointments').insert([appt]).select().single()
  if (error) { console.error('dbCreateAppointment:', error); return null }
  return data
}

export const dbUpdateAppointment = async (id, updates) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select().single()
  if (error) { console.error('dbUpdateAppointment:', error); return null }
  return data
}

// ─── Appointment Messages ───
export const dbGetMessages = async (apptId) => {
  if (!supabase) return null
  let query = supabase.from('appointment_messages').select('*').order('created_at')
  if (apptId) query = query.eq('appt_id', apptId)
  const { data, error } = await query
  if (error) { console.error('dbGetMessages:', error); return null }
  return data
}

export const dbSendMessage = async (msg) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('appointment_messages').insert([msg]).select().single()
  if (error) { console.error('dbSendMessage:', error); return null }
  return data
}

// ─── Inventory ───
export const dbGetInventory = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('inventory').select('*')
  if (error) { console.error('dbGetInventory:', error); return null }
  return data
}

export const dbUpdateInventory = async (productId, city, qty) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('inventory')
    .upsert({ product_id: productId, city, qty }, { onConflict: 'product_id,city' })
    .select().single()
  if (error) { console.error('dbUpdateInventory:', error); return null }
  return data
}

// ─── Custody ───
export const dbGetCustody = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('custody').select('*').is('returned_at', null)
  if (error) { console.error('dbGetCustody:', error); return null }
  return data
}

export const dbCreateCustody = async (item) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('custody').insert([item]).select().single()
  if (error) { console.error('dbCreateCustody:', error); return null }
  return data
}

// ─── Custody Requests ───
export const dbGetCustodyRequests = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('custody_requests').select('*').order('created_at', { ascending: false })
  if (error) { console.error('dbGetCustodyRequests:', error); return null }
  return data
}

export const dbCreateCustodyRequest = async (req) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('custody_requests').insert([req]).select().single()
  if (error) { console.error('dbCreateCustodyRequest:', error); return null }
  return data
}

export const dbUpdateCustodyRequest = async (id, updates) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('custody_requests').update(updates).eq('id', id).select().single()
  if (error) { console.error('dbUpdateCustodyRequest:', error); return null }
  return data
}

// ─── Contracts ───
export const dbGetContracts = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) { console.error('dbGetContracts:', error); return null }
  return data
}

export const dbCreateContract = async (contract) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('contracts').insert([contract]).select().single()
  if (error) { console.error('dbCreateContract:', error); return null }
  return data
}

export const dbUpdateContract = async (id, updates) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('contracts').update(updates).eq('id', id).select().single()
  if (error) { console.error('dbUpdateContract:', error); return null }
  return data
}

// ─── Tasks ───
export const dbGetTasks = async () => {
  if (!supabase) return null
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
  if (error) { console.error('dbGetTasks:', error); return null }
  return data
}

export const dbCreateTask = async (task) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('tasks').insert([task]).select().single()
  if (error) { console.error('dbCreateTask:', error); return null }
  return data
}

export const dbUpdateTask = async (id, updates) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
  if (error) { console.error('dbUpdateTask:', error); return null }
  return data
}

// ─── Task Comments ───
export const dbGetTaskComments = async (taskId) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at')
  if (error) { console.error('dbGetTaskComments:', error); return null }
  return data
}

export const dbAddTaskComment = async (comment) => {
  if (!supabase) return null
  const { data, error } = await supabase.from('task_comments').insert([comment]).select().single()
  if (error) { console.error('dbAddTaskComment:', error); return null }
  return data
}

// ─── Audit Log ───
export const dbAddAuditLog = async (entry) => {
  if (!supabase) return null
  const { error } = await supabase.from('audit_log').insert([entry])
  if (error) console.error('dbAddAuditLog:', error)
}

export const dbGetAuditLog = async () => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { console.error('dbGetAuditLog:', error); return null }
  return data
}

// ─── Login ───
export const dbLogin = async (phone, password) => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .eq('password', password)
    .eq('active', true)
    .single()
  if (error) return null
  return data
}

// ─── تحويل بيانات Supabase لتنسيق التطبيق ───
export const mapSupabaseToApp = (raw) => {
  if (!raw) return null
  return {
    // users
    users: (raw.users || []).map(u => ({
      id: u.id, name: u.name, phone: u.phone, pass: u.password,
      role: u.role, city: u.city, permissions: u.permissions || [], active: u.active
    })),
    // clients
    clients: (raw.clients || []).map(c => ({
      id: c.id, name: c.name, phone: c.phone, city: c.city,
      district: c.district || '', address: c.address || '',
      devices: c.devices || [], notes: c.notes || '',
      createdAt: c.created_at
    })),
    // products (mapped from supabase to app format)
    products: (raw.products || []).map(p => ({
      id: p.id, sku: p.sku, name: p.name, cat: p.category,
      price: p.price, oldPrice: p.old_price,
      image: p.image, desc: p.description, features: p.features,
      minStock: p.min_stock
    })),
    // appointments
    appointments: (raw.appointments || []).map(a => ({
      id: a.id, clientId: a.client_id, techId: a.tech_id,
      createdBy: a.created_by, city: a.city, serviceType: a.service_type,
      priority: a.priority, status: a.status,
      date: a.date, time: a.time?.slice(0,5) || '09:00',
      products: a.products || [], notes: a.notes || '',
      amount: a.amount || 0, payMethod: a.pay_method || '',
      createdAt: a.created_at
    })),
    // messages
    messages: (raw.messages || []).map(m => ({
      id: m.id, apptId: m.appt_id, userId: m.user_id,
      text: m.text, ts: m.created_at
    })),
    // inventory - تحويل من array لـ object مجمّع بالمدينة
    inventory: buildInventoryObj(raw.inventory || [], raw.products || []),
    // custody
    custody: (raw.custody || []).map(c => ({
      id: c.id, techId: c.tech_id, productId: c.product_id,
      qty: c.qty, city: c.city, givenBy: c.given_by, givenAt: c.given_at
    })),
    // custodyRequests
    custodyRequests: (raw.custodyRequests || []).map(r => ({
      id: r.id, fromId: r.from_id, toId: r.to_id,
      productId: r.product_id, qty: r.qty,
      status: r.status, note: r.note, createdAt: r.created_at
    })),
    // contracts
    contracts: (raw.contracts || []).map(c => ({
      id: c.id, clientId: c.client_id, type: c.type,
      startDate: c.start_date, endDate: c.end_date,
      amount: c.amount, totalVisits: c.total_visits,
      doneVisits: c.done_visits, status: c.status, notes: c.notes
    })),
    // tasks
    tasks: (raw.tasks || []).map(t => ({
      id: t.id, title: t.title, desc: t.description,
      assignedTo: t.assigned_to, assignedBy: t.assigned_by,
      priority: t.priority, status: t.status,
      dueDate: t.due_date, comments: t.comments || [],
      createdAt: t.created_at
    })),
    // auditLog
    auditLog: (raw.auditLog || []).map(l => ({
      id: l.id, userId: l.user_id, action: l.action,
      target: l.target, details: l.details, ts: l.created_at
    })),
  }
}

const buildInventoryObj = (invArray, products) => {
  const obj = {}
  invArray.forEach(item => {
    if (!obj[item.city]) {
      obj[item.city] = products.map(p => ({ productId: p.id, qty: 0, minQty: p.min_stock || 5 }))
    }
    const entry = obj[item.city].find(e => e.productId === item.product_id)
    if (entry) { entry.qty = item.qty; entry.minQty = item.min_qty }
  })
  return obj
}
