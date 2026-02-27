import { useState, useEffect, useCallback, useMemo } from "react";
import {
  dbGetUsers, dbGetClients, dbGetProducts, dbGetAppointments,
  dbGetMessages, dbGetInventory, dbGetCustody, dbGetCustodyRequests,
  dbGetContracts, dbGetTasks, dbGetTaskComments, dbGetAuditLog,
  dbLogin, dbCreateAppointment, dbUpdateAppointment,
  dbCreateClient, dbUpdateClient, dbCreateUser, dbUpdateUser,
  dbUpdateInventory, dbCreateCustody, dbCreateCustodyRequest,
  dbUpdateCustodyRequest, dbCreateContract, dbUpdateContract,
  dbCreateTask, dbUpdateTask, dbAddTaskComment, dbSendMessage, dbAddAuditLog,
  mapSupabaseToApp
} from './src/db.js';
import { supabase } from './src/supabase.js';
// مسارات صحيحة من root

/* ═══════════════════════════════════════════
   نقاء المتحدة - نظام إدارة مواعيد الصيانة
   المرحلة الأولى: الهيكل + الدخول + لوحة التحكم + المواعيد
   ═══════════════════════════════════════════ */

// ─── ثوابت النظام ───
const CITIES = [
  "الرياض","جدة","مكة","الطائف","الدمام","المدينة المنورة","القصيم","المجمعة",
  "الجبيل","الخرج","الخبر","الأحساء","حائل","تبوك","أبها","خميس مشيط",
  "عرعر","سكاكا","ظهران الجنوب","المزاحمية","نجران"
];

const STATUSES = [
  { id: "new", label: "جديد", color: "#3B82F6", bg: "#EFF6FF", icon: "🆕" },
  { id: "confirmed", label: "مؤكد", color: "#8B5CF6", bg: "#F5F3FF", icon: "✅" },
  { id: "delivering", label: "جاري التوصيل", color: "#F59E0B", bg: "#FFFBEB", icon: "🚗" },
  { id: "installing", label: "جاري التركيب", color: "#F97316", bg: "#FFF7ED", icon: "🔧" },
  { id: "completed", label: "مكتمل", color: "#10B981", bg: "#ECFDF5", icon: "✨" },
  { id: "cancelled", label: "ملغي", color: "#EF4444", bg: "#FEF2F2", icon: "❌" },
  { id: "postponed", label: "مؤجل", color: "#6B7280", bg: "#F9FAFB", icon: "⏸️" },
];

const PRIORITIES = [
  { id: "normal", label: "عادي", color: "#64748B", bg: "#F1F5F9", icon: "●" },
  { id: "urgent", label: "مستعجل", color: "#F59E0B", bg: "#FFFBEB", icon: "⚡" },
  { id: "vip", label: "VIP", color: "#8B5CF6", bg: "#F5F3FF", icon: "⭐" },
];

const SERVICE_TYPES = ["تركيب جديد","صيانة دورية","إصلاح عطل","تبديل قطع","صيانة فلتر","تركيب برادة"];

const PRODUCTS = [
  { id:"p1", name:"فلتر نقاء ٧ مراحل", cat:"فلاتر تحلية", price:594, oldPrice:800, sku:"PU-F7-001",
    image:"https://cdn.salla.sa/OQRbq/aJmYgFqeXGk9S0p1DxJNNYYFhpZbHmvXgPMb4CU2.png",
    desc:"فلتر تحلية 7 مراحل بتقنية التناضح العكسي RO. إنتاج 300 لتر يومياً. مضخة 130 PSI. خزان فايبر 7 لتر. حنفية كروم. توصيل وتركيب مجاناً.",
    features:"7 مراحل تنقية وتحلية | تقنية التناضح العكسي RO | مضخة 130 PSI | خزان فايبر 7 لتر | حنفية كرومية 1/4 انش | هوز 5 متر | محبس دخول ماء | قاعدة تثبيت أرضية | مرحلة موازنة القلوية PH", minStock:10 },
  { id:"p2", name:"فلتر نقاء ٩ مراحل", cat:"فلاتر تحلية", price:3500, sku:"PU-F9-001",
    image:"https://cdn.salla.sa/OQRbq/aJmYgFqeXGk9S0p1DxJNNYYFhpZbHmvXgPMb4CU2.png",
    desc:"فلتر متقدم 9 مراحل مع مراحل إضافية للمعادن والقلوية. إنتاج عالي يصل 400 لتر يومياً. مثالي للعائلات الكبيرة.",
    features:"9 مراحل تنقية متقدمة | تقنية RO | فلتر معادن | فلتر قلوي | فلتر هيدروجين | مضخة قوية | خزان فايبر كبير", minStock:5 },
  { id:"p3", name:"برادة نقاء الفاخرة", cat:"برادات مياه", price:550, oldPrice:600, sku:"PU-WC-001",
    image:"https://cdn.salla.sa/OQRbq/8rz7cKpv0s7TQK2lgQxaZB9KXRI5CcYSzXOjJy7b.png",
    desc:"برادة مياه فاخرة بخزان داخلي وتعبئة ذاتية. 3 صنابير (بارد، فاتر، حار) مع زر أمان. متوفرة بـ 3 ألوان: أبيض، أسود، فضي. توصل مباشرة بالفلتر.",
    features:"3 صنابير (بارد/فاتر/حار) | زر أمان للحار | خزان داخلي تعبئة ذاتية | 3 ألوان متوفرة | تصميم طاولة عملي | صنع بمواصفات سعودية | ضمان سنتين", minStock:8 },
  { id:"p4", name:"بكج التوفير (فلتر + برادة)", cat:"بكجات", price:2500, sku:"PU-PK-001",
    image:"https://cdn.salla.sa/OQRbq/Ow9ycKpmU5AK3LVcXGfr72YcH9lVKlk1pvFAoEtj.png",
    desc:"عرض التوفير: فلتر نقاء 7 مراحل + برادة فاخرة بـ 3 ألوان (أبيض، أسود، فضي). 3 صنابير بارد وساخن ودافئ. خزان فايبر 7 لتر. توصيل وتركيب مجاناً.",
    features:"فلتر 7 مراحل كامل | برادة فاخرة 3 ألوان | 3 صنابير | خزان فايبر 7 لتر | حنفية كروم | توصيل وتركيب مجاني | عرض توفيري", minStock:5 },
  { id:"p5", name:"فلتر جامبو لتنقية الخزان", cat:"فلاتر تحلية", price:1900, sku:"PU-JB-001",
    image:"https://cdn.salla.sa/OQRbq/xTR5mJkTkfnJvQwGUyZI0u6vYkYTz8HgqWcEBCH0.png",
    desc:"فلتر جامبو 3 مراحل لتنقية مياه الخزانات. يزيل الشوائب والأوساخ والصدأ والكلور. يركّب قبل الخزان العلوي. مواد مقاومة للصدأ.",
    features:"3 مراحل تنقية | فلتر قطني للشوائب | فلتر كربون نشط | فلتر كربون صلب | تركيب قبل الخزان | مقاوم للصدأ | تنقية بدون تحلية", minStock:5 },
  { id:"p6", name:"فلتر شوائب 5 ميكرون", cat:"قطع غيار", price:25, sku:"PU-SP-001",
    image:"",
    desc:"المرحلة الأولى - فلتر البولي بروبيلين لإزالة الأتربة والرمال والشوائب. مسامات 5 ميكرون.", minStock:50 },
  { id:"p7", name:"فلتر كربون نشط", cat:"قطع غيار", price:35, sku:"PU-SP-002",
    image:"",
    desc:"المرحلة الثانية - يعالج الطعم والرائحة ويزيل الكلور من المياه.", minStock:50 },
  { id:"p8", name:"فلتر كربون صلب", cat:"قطع غيار", price:35, sku:"PU-SP-003",
    image:"",
    desc:"المرحلة الثالثة - تنقية إضافية من الكلور وتحسين طعم ورائحة المياه.", minStock:50 },
  { id:"p9", name:"ممبرين RO (غشاء التناضح العكسي)", cat:"قطع غيار", price:150, sku:"PU-SP-004",
    image:"",
    desc:"المرحلة الرابعة - غشاء التناضح العكسي لإزالة الأملاح والفيروسات. القطعة الأهم في الفلتر.", minStock:20 },
  { id:"p10", name:"فلتر Post Carbon", cat:"قطع غيار", price:40, sku:"PU-SP-005",
    image:"",
    desc:"المرحلة الخامسة - إزالة الكلور الزائد وتحسين نقاء المياه النهائية.", minStock:50 },
  { id:"p11", name:"خزان فايبر جلاس 7 لتر", cat:"ملحقات", price:120, sku:"PU-AC-001",
    image:"",
    desc:"خزان تخزين المياه المحلاة. سعة 7 لتر. مصنوع من الفايبر جلاس المقاوم للصدأ.", minStock:10 },
  { id:"p12", name:"حنفية كرومية 1/4 انش", cat:"ملحقات", price:45, sku:"PU-AC-002",
    image:"",
    desc:"حنفية كرومية أنيقة لتوزيع المياه المحلاة. مقاس 1/4 انش.", minStock:15 },
  { id:"p13", name:"مضخة 130 PSI", cat:"ملحقات", price:180, sku:"PU-AC-003",
    image:"",
    desc:"مضخة قوية بقدرة 130 PSI لتسريع عملية تحلية المياه. مناسبة لجميع فلاتر RO.", minStock:10 },
  { id:"p14", name:"فلتر محسن القلوية", cat:"قطع غيار", price:55, sku:"PU-SP-006",
    image:"",
    desc:"المرحلة السادسة - يعزز نقاء المياه ويضيف المعادن الضرورية ويوازن القلوية PH.", minStock:30 },
  { id:"p15", name:"فلتر متعدد المعادن", cat:"قطع غيار", price:55, sku:"PU-SP-007",
    image:"",
    desc:"المرحلة السابعة - يضفي مذاقاً عذباً ونقاءً فائقاً مع تحسين القيمة الهيدروجينية.", minStock:30 },
];
const getProduct = (id) => PRODUCTS.find(p => p.id === id);
const PERM_LABELS = {
  "view_dashboard":"لوحة التحكم","manage_appointments":"المواعيد","assign_technicians":"إسناد فنيين",
  "manage_inventory":"المخزون","manage_custody":"العهد","view_reports":"التقارير",
  "manage_finance":"الحسابات","manage_users":"المستخدمين","manage_clients":"العملاء",
  "manage_contracts":"العقود","view_audit_log":"سجل التعديلات","manage_all_cities":"جميع المدن","send_whatsapp":"واتساب","manage_tasks":"المهام"
};

const ROLES = [
  { id: "owner", label: "المالك", level: 5 },
  { id: "general_manager", label: "مدير عام", level: 4 },
  { id: "branch_manager", label: "مدير فرع", level: 3 },
  { id: "customer_service", label: "خدمة عملاء", level: 2 },
  { id: "technician", label: "فني", level: 1 },
];

const PERMISSIONS_LIST = [
  "view_dashboard","manage_appointments","assign_technicians","manage_inventory",
  "manage_custody","view_reports","manage_finance","manage_users","manage_clients",
  "manage_contracts","view_audit_log","manage_all_cities","send_whatsapp","manage_tasks"
];

// ─── ألوان الهوية (مستوحاة من pu.sa) ───
const C = {
  brand: "#0284C7",       // أزرق نقاء الأساسي
  brandDark: "#075985",   // أزرق غامق
  brandDeep: "#0C4A6E",   // أزرق عميق للشريط الجانبي
  brandLight: "#38BDF8",  // أزرق فاتح
  brandPale: "#E0F2FE",   // أزرق باهت للخلفيات
  brandBg: "#F0F9FF",     // خلفية زرقاء خفيفة
  white: "#FFFFFF",
  g50: "#F8FAFC", g100: "#F1F5F9", g200: "#E2E8F0", g300: "#CBD5E1",
  g400: "#94A3B8", g500: "#64748B", g600: "#475569", g700: "#334155",
  g800: "#1E293B", g900: "#0F172A",
  ok: "#10B981", warn: "#F59E0B", err: "#EF4444", purple: "#8B5CF6",
};

// ─── دوال مساعدة ───
const uid = () => "id_" + Math.random().toString(36).slice(2, 10);
const fmtDate = d => new Date(d).toLocaleDateString("ar-SA");
const fmtTime = d => new Date(d).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });
const fmtDateTime = d => new Date(d).toLocaleString("ar-SA");
const today = () => new Date().toISOString().split("T")[0];
const addMonths = (date, m) => { const d = new Date(date); d.setMonth(d.getMonth() + m); return d.toISOString().split("T")[0]; };
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };

// ─── بيانات تجريبية ───
const makeSampleData = () => {
  const users = [
    { id:"u1", name:"عبدالله الراشد", role:"owner", phone:"0501234567", city:"all", permissions: PERMISSIONS_LIST, active:true, pass:"owner" },
    { id:"u2", name:"محمد السعيد", role:"general_manager", phone:"0509876543", city:"all", permissions: PERMISSIONS_LIST.filter(p=>p!=="manage_finance"), active:true, pass:"gm" },
    { id:"u3", name:"أحمد العمري", role:"branch_manager", phone:"0551112222", city:"الرياض", permissions:["view_dashboard","manage_appointments","assign_technicians","manage_inventory","manage_custody","view_reports","manage_clients","send_whatsapp","manage_tasks"], active:true, pass:"bm" },
    { id:"u4", name:"سارة المطيري", role:"customer_service", phone:"0553334444", city:"الرياض", permissions:["manage_appointments","manage_clients","send_whatsapp","manage_tasks"], active:true, pass:"cs" },
    { id:"u5", name:"خالد الزهراني", role:"technician", phone:"0555556666", city:"الرياض", permissions:["manage_appointments","manage_custody","manage_tasks"], active:true, pass:"tech1" },
    { id:"u6", name:"فهد الغامدي", role:"technician", phone:"0557778888", city:"الرياض", permissions:["manage_appointments","manage_custody","manage_tasks"], active:true, pass:"tech2" },
    { id:"u7", name:"يوسف الشهري", role:"branch_manager", phone:"0561112222", city:"جدة", permissions:["view_dashboard","manage_appointments","assign_technicians","manage_inventory","manage_custody","view_reports","manage_clients","send_whatsapp","manage_tasks"], active:true, pass:"bm2" },
    { id:"u8", name:"عمر البقمي", role:"technician", phone:"0563334444", city:"جدة", permissions:["manage_appointments","manage_custody","manage_tasks"], active:true, pass:"tech3" },
  ];

  const clients = [
    { id:"c1", name:"فيصل العتيبي", phone:"0541112233", city:"الرياض", district:"حي النرجس", address:"شارع الأمير محمد، فيلا 12", devices:["فلتر نقاء 7 مراحل"], notes:"عميل مميز", createdAt:"2025-01-15" },
    { id:"c2", name:"سلطان الدوسري", phone:"0542223344", city:"الرياض", district:"حي الملقا", address:"شارع التخصصي، شقة 5", devices:["فلتر نقاء 7 مراحل","برادة مياه"], notes:"", createdAt:"2025-02-01" },
    { id:"c3", name:"نورة الشمري", phone:"0543334455", city:"الرياض", district:"حي الياسمين", address:"فيلا 8، طريق الملك فهد", devices:[], notes:"عميلة جديدة", createdAt:"2025-02-20" },
    { id:"c4", name:"عبدالرحمن القحطاني", phone:"0561234567", city:"جدة", district:"حي الروضة", address:"شارع فلسطين، عمارة 3", devices:["فلتر نقاء 9 مراحل"], notes:"", createdAt:"2025-01-20" },
    { id:"c5", name:"ماجد الحربي", phone:"0562345678", city:"جدة", district:"حي الصفا", address:"شارع الأمير ماجد", devices:["بكج توفير"], notes:"عقد سنوي", createdAt:"2024-12-10" },
    { id:"c6", name:"سعد الشهراني", phone:"0544445566", city:"مكة", district:"حي العزيزية", address:"شارع أم القرى", devices:["فلتر نقاء 7 مراحل"], notes:"", createdAt:"2025-01-25" },
  ];

  const t = today();
  const appointments = [
    { id:"a1", clientId:"c1", city:"الرياض", serviceType:"صيانة دورية", priority:"normal", status:"new", techId:null, date:t, time:"09:00", products:[], notes:"صيانة دورية", amount:150, payMethod:"", createdBy:"u4", createdAt:new Date().toISOString() },
    { id:"a2", clientId:"c2", city:"الرياض", serviceType:"تركيب جديد", priority:"urgent", status:"confirmed", techId:"u5", date:t, time:"11:00", products:[], notes:"تركيب سريع", amount:594, payMethod:"تحويل", createdBy:"u4", createdAt:new Date().toISOString() },
    { id:"a3", clientId:"c3", city:"الرياض", serviceType:"تركيب جديد", priority:"vip", status:"installing", techId:"u6", date:t, time:"14:00", products:[], notes:"", amount:2500, payMethod:"شبكة", createdBy:"u3", createdAt:new Date().toISOString() },
    { id:"a4", clientId:"c4", city:"جدة", serviceType:"إصلاح عطل", priority:"urgent", status:"delivering", techId:"u8", date:t, time:"10:00", products:[], notes:"تسريب ممبرين", amount:200, payMethod:"", createdBy:"u7", createdAt:new Date().toISOString() },
    { id:"a5", clientId:"c5", city:"جدة", serviceType:"صيانة دورية", priority:"normal", status:"completed", techId:"u8", date:daysAgo(1), time:"09:00", products:[], notes:"تم بنجاح", amount:95, payMethod:"نقدي", createdBy:"u7", createdAt:new Date(Date.now()-86400000).toISOString() },
    { id:"a6", clientId:"c1", city:"الرياض", serviceType:"صيانة دورية", priority:"normal", status:"completed", techId:"u5", date:daysAgo(5), time:"10:00", products:[], notes:"", amount:150, payMethod:"نقدي", createdBy:"u4", createdAt:new Date(Date.now()-5*86400000).toISOString() },
    { id:"a7", clientId:"c6", city:"مكة", serviceType:"تركيب جديد", priority:"normal", status:"new", techId:null, date:t, time:"15:00", products:[], notes:"", amount:800, payMethod:"", createdBy:"u2", createdAt:new Date().toISOString() },
  ];

  const auditLog = [
    { id:"l1", userId:"u4", action:"إنشاء موعد", target:"a1", details:"تم إنشاء موعد صيانة للعميل فيصل العتيبي", ts:new Date().toISOString() },
    { id:"l2", userId:"u3", action:"إسناد فني", target:"a2", details:"تم إسناد الموعد للفني خالد الزهراني", ts:new Date().toISOString() },
  ];

  const messages = [
    { id:"m1", apptId:"a2", userId:"u4", text:"العميل أكد الموعد", ts:new Date().toISOString() },
    { id:"m2", apptId:"a2", userId:"u3", text:"@خالد توجه للموعد", ts:new Date().toISOString() },
  ];

  const inventory = {};
  CITIES.forEach(city => {
    inventory[city] = PRODUCTS.map(p => ({
      productId: p.id,
      qty: Math.floor(Math.random() * 40) + 5,
      minQty: 5
    }));
  });

  const custody = [
    { id:"ct1", techId:"u5", productId:"p5", qty:10, city:"الرياض", givenBy:"u3", givenAt:new Date().toISOString() },
    { id:"ct2", techId:"u5", productId:"p6", qty:10, city:"الرياض", givenBy:"u3", givenAt:new Date().toISOString() },
    { id:"ct3", techId:"u5", productId:"p8", qty:3, city:"الرياض", givenBy:"u3", givenAt:new Date().toISOString() },
    { id:"ct4", techId:"u6", productId:"p5", qty:8, city:"الرياض", givenBy:"u3", givenAt:new Date().toISOString() },
    { id:"ct5", techId:"u8", productId:"p5", qty:12, city:"جدة", givenBy:"u7", givenAt:new Date().toISOString() },
    { id:"ct6", techId:"u8", productId:"p8", qty:5, city:"جدة", givenBy:"u7", givenAt:new Date().toISOString() },
  ];

  const contracts = [
    { id:"cn1", clientId:"c5", type:"سنوي", startDate:"2024-12-10", endDate:"2025-12-10", amount:500, totalVisits:2, doneVisits:1, status:"active", notes:"صيانة سنوية" },
    { id:"cn2", clientId:"c1", type:"سنوي", startDate:"2025-01-15", endDate:"2026-01-15", amount:600, totalVisits:2, doneVisits:0, status:"active", notes:"عقد شامل" },
  ];

  const custodyRequests = [
    { id:"cr1", fromId:"u5", toId:"u3", productId:"p8", qty:5, status:"pending", note:"نحتاج ممبرين RO عاجل", createdAt:new Date().toISOString() },
  ];

  const tasks = [
    { id:"t1", title:"متابعة عميل فيصل العتيبي", desc:"التواصل مع العميل بخصوص تجديد العقد السنوي", assignedTo:"u4", assignedBy:"u3", priority:"urgent", status:"in_progress", dueDate:addMonths(today(), 0), comments:[{ userId:"u3", text:"يرجى المتابعة قبل نهاية الأسبوع", ts:new Date().toISOString() }], createdAt:new Date().toISOString() },
    { id:"t2", title:"جرد مخزون فرع الرياض", desc:"جرد شامل لجميع القطع والمنتجات", assignedTo:"u5", assignedBy:"u3", priority:"normal", status:"new", dueDate:addMonths(today(), 0), comments:[], createdAt:new Date().toISOString() },
    { id:"t3", title:"تدريب الفني الجديد", desc:"تدريب على تركيب فلتر 9 مراحل والبرادة", assignedTo:"u6", assignedBy:"u2", priority:"normal", status:"completed", dueDate:daysAgo(2), comments:[{ userId:"u6", text:"تم التدريب بنجاح", ts:new Date().toISOString() }], createdAt:new Date(Date.now()-5*86400000).toISOString() },
  ];

  return { users, clients, appointments, auditLog, messages, inventory, custody, contracts, custodyRequests, tasks };
};

// ─── أيقونات SVG ───
const Icon = {
  Home:     (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Calendar: (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Users:    (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  User:     (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Box:      (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Shield:   (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Chart:    (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Dollar:   (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  File:     (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Clock:    (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Bell:     (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  Search:   (p) => <svg {...p} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus:     (p) => <svg {...p} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X:        (p) => <svg {...p} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:    (p) => <svg {...p} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Edit:     (p) => <svg {...p} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Send:     (p) => <svg {...p} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Logout:   (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Menu:     (p) => <svg {...p} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Chevron:  (p) => <svg {...p} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Droplet:  (p) => <svg {...p} width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill="currentColor" opacity="0.9"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
  WhatsApp: (p) => <svg {...p} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
};

// ─── مكونات مشتركة ───
const StatusBadge = ({ status, small }) => {
  const s = STATUSES.find(x => x.id === status);
  if (!s) return null;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding: small ? "2px 8px" : "4px 12px", borderRadius:20,
      fontSize: small ? 11 : 12, fontWeight:600,
      color:s.color, background:s.bg, border:`1px solid ${s.color}22`,
      whiteSpace:"nowrap"
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
      {s.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const p = PRIORITIES.find(x => x.id === priority);
  if (!p) return null;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:3,
      padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:600,
      color:p.color, background:p.bg, whiteSpace:"nowrap"
    }}>{p.icon} {p.label}</span>
  );
};

const StatCard = ({ title, value, sub, color, icon }) => (
  <div style={{
    background:C.white, borderRadius:16, padding:"22px 20px",
    boxShadow:"0 1px 4px rgba(0,0,0,0.05)", borderRight:`4px solid ${color}`,
    position:"relative", overflow:"hidden", minWidth:0
  }}>
    <div style={{ position:"absolute", top:12, left:14, fontSize:36, opacity:0.08 }}>{icon}</div>
    <div style={{ fontSize:12, color:C.g500, marginBottom:6, fontWeight:500 }}>{title}</div>
    <div style={{ fontSize:28, fontWeight:800, color:C.g900, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.g400, marginTop:6 }}>{sub}</div>}
  </div>
);

const Modal = ({ title, children, onClose, width = 600 }) => (
  <div style={{
    position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
    background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)", animation:"fadeIn .2s", padding:12
  }} onClick={onClose}>
    <div style={{
      background:C.white, borderRadius:18, width:"100%", maxWidth:width,
      maxHeight:"90vh", overflow:"auto", boxShadow:"0 25px 60px rgba(0,0,0,0.2)",
      animation:"slideUp .25s ease-out"
    }} onClick={e => e.stopPropagation()}>
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 18px", borderBottom:`1px solid ${C.g200}`,
        position:"sticky", top:0, background:C.white, zIndex:1, borderRadius:"18px 18px 0 0"
      }}>
        <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.g900 }}>{title}</h3>
        <button onClick={onClose} style={{
          border:"none", background:C.g100, borderRadius:10, width:32, height:32,
          display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.g500
        }}><Icon.X/></button>
      </div>
      <div style={{ padding:"16px 18px" }}>{children}</div>
    </div>
  </div>
);

// ─── أنماط ───
const inp = {
  width:"100%", padding:"9px 13px", borderRadius:10, border:`1.5px solid ${C.g300}`,
  fontSize:14, outline:"none", fontFamily:"inherit", transition:"border-color .2s",
  boxSizing:"border-box", background:C.white
};
const lbl = { display:"block", fontSize:13, fontWeight:600, color:C.g700, marginBottom:5 };
const btnP = {
  padding:"9px 22px", background:`linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
  color:C.white, border:"none", borderRadius:10, fontSize:13, fontWeight:600,
  cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7,
  boxShadow:`0 2px 8px ${C.brand}33`, transition:"all .2s"
};
const btnS = {
  padding:"9px 22px", background:C.g100, color:C.g700,
  border:`1px solid ${C.g200}`, borderRadius:10, fontSize:13, fontWeight:600,
  cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7
};

// ═══════════════════════
//  التطبيق الرئيسي
// ═══════════════════════
export default function NaqaaSystem() {
  const [user, setUser] = useState(null);       // المستخدم الحالي
  const [data, setData] = useState(null);        // البيانات
  const [page, setPage] = useState("dashboard"); // الصفحة الحالية
  const [sideOpen, setSideOpen] = useState(true); // الشريط الجانبي
  const [cityFilter, setCityFilter] = useState("all"); // فلتر المدينة
  const [modal, setModal] = useState(null);      // المودال
  const [notifs, setNotifs] = useState([]);       // الإشعارات
  const [showNotifs, setShowNotifs] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!supabase) {
        setData(makeSampleData());
        return;
      }
      setDbLoading(true);
      try {
        const [users, clients, products, appointments, messages, inventory,
               custody, custodyRequests, contracts, tasks, auditLog] = await Promise.all([
          dbGetUsers(), dbGetClients(), dbGetProducts(), dbGetAppointments(),
          dbGetMessages(null), dbGetInventory(), dbGetCustody(), dbGetCustodyRequests(),
          dbGetContracts(), dbGetTasks(), dbGetAuditLog()
        ]);
        const raw = { users, clients, products, appointments,
          messages: messages || [], inventory: inventory || [],
          custody, custodyRequests, contracts, tasks, auditLog };
        const mapped = mapSupabaseToApp(raw);
        if (mapped && mapped.users && mapped.users.length > 0) {
          setData(mapped);
        } else {
          console.warn('Supabase returned empty data, using demo data');
          setData(makeSampleData());
        }
      } catch (e) {
        console.error('Supabase load error:', e);
        setData(makeSampleData());
      } finally {
        setDbLoading(false);
      }
    };
    loadFromSupabase();
  }, []);
  useEffect(() => {
    const check = () => {
      const m = window.innerWidth <= 768;
      setIsMobile(m);
      if (m) setSideOpen(false);
      else setSideOpen(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const goPage = (p) => { setPage(p); if (isMobile) setSideOpen(false); };

  // ─── دوال مساعدة ───
  const getUser = id => data?.users.find(u => u.id === id);
  const getClient = id => data?.clients.find(c => c.id === id);
  const roleName = id => ROLES.find(r => r.id === id)?.label || id;

  const log = useCallback((action, target, details) => {
    if (!user) return;
    setData(p => ({ ...p, auditLog: [{ id:uid(), userId:user.id, action, target, details, ts:new Date().toISOString() }, ...p.auditLog] }));
  }, [user]);

  const notify = useCallback((msg, type = "info") => {
    setNotifs(p => [{ id:uid(), msg, type, ts:new Date().toISOString(), read:false }, ...p]);
  }, []);

  const filteredAppts = useMemo(() => {
    if (!data) return [];
    let list = data.appointments;
    if (cityFilter !== "all") list = list.filter(a => a.city === cityFilter);
    if (user?.role === "technician") list = list.filter(a => a.techId === user.id);
    if (user?.role === "branch_manager") list = list.filter(a => a.city === user.city);
    return list;
  }, [data, cityFilter, user]);

  // ─── شاشة التحميل ───
  if (dbLoading || !data) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        minHeight:"100vh", background:"linear-gradient(135deg, #0C4A6E, #0284C7)", gap:16 }}>
        <div style={{ width:60, height:60, borderRadius:"50%", border:"4px solid rgba(255,255,255,0.3)",
          borderTop:"4px solid white", animation:"spin 1s linear infinite" }}/>
        <div style={{ color:"white", fontSize:18, fontWeight:700 }}>جاري تحميل النظام...</div>
        <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13 }}>نقاء المتحدة</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ─── صفحة تسجيل الدخول ───
  if (!user) {
    return <LoginPage data={data} onLogin={setUser} supabase={supabase} />;
  }

  const unread = notifs.filter(n => !n.read).length;

  // ─── قائمة الصفحات ───
  const pages = [
    { id:"dashboard", label:"لوحة التحكم", icon:Icon.Home, perm:"view_dashboard" },
    { id:"appointments", label:"المواعيد", icon:Icon.Calendar, perm:"manage_appointments" },
    { id:"tasks", label:"المهام", icon:Icon.Check, perm:"manage_tasks" },
    { id:"clients", label:"العملاء", icon:Icon.User, perm:"manage_clients" },
    { id:"products", label:"المنتجات", icon:Icon.Box, perm:"manage_inventory" },
    { id:"inventory", label:"المخزون", icon:Icon.Box, perm:"manage_inventory" },
    { id:"custody", label:"العهد", icon:Icon.Shield, perm:"manage_custody" },
    { id:"contracts", label:"العقود", icon:Icon.File, perm:"manage_contracts" },
    { id:"reports", label:"التقارير", icon:Icon.Chart, perm:"view_reports" },
    { id:"finance", label:"الحسابات", icon:Icon.Dollar, perm:"manage_finance" },
    { id:"users", label:"المستخدمين", icon:Icon.Users, perm:"manage_users" },
    { id:"auditlog", label:"سجل التعديلات", icon:Icon.Clock, perm:"view_audit_log" },
  ].filter(p => user.permissions.includes(p.perm) || user.role === "owner");

  // ═══════════════════════
  //  لوحة التحكم
  // ═══════════════════════
  const Dashboard = () => {
    const todayAppts = filteredAppts.filter(a => a.date === today());
    const newC = todayAppts.filter(a => a.status === "new").length;
    const prog = todayAppts.filter(a => ["confirmed","delivering","installing"].includes(a.status)).length;
    const done = todayAppts.filter(a => a.status === "completed").length;
    const rev = filteredAppts.filter(a => a.status === "completed").reduce((s,a) => s + (a.amount||0), 0);
    const overdue = filteredAppts.filter(a => a.status === "new" && a.date < today());

    return (
      <div>
        {/* ترحيب */}
        <div style={{ marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:24, fontWeight:800, color:C.g900 }}>مرحباً، {user.name.split(" ")[0]} 👋</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.g500 }}>
            {cityFilter === "all" ? "جميع المدن" : cityFilter} • {new Date().toLocaleDateString("ar-SA",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        </div>

        {/* إحصائيات */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap:14, marginBottom:24 }}>
          <StatCard title="مواعيد اليوم" value={todayAppts.length} sub={`${newC} جديد`} color={C.brand} icon="📅"/>
          <StatCard title="قيد التنفيذ" value={prog} sub="جاري العمل" color={C.warn} icon="⚡"/>
          <StatCard title="مكتمل اليوم" value={done} color={C.ok} icon="✅"/>
          <StatCard title="الإيرادات" value={`${rev.toLocaleString()} ر.س`} sub="المكتمل" color={C.purple} icon="💰"/>
        </div>

        {/* تنبيهات */}
        {overdue.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"#FEF2F2", borderRadius:12, marginBottom:16, border:"1px solid #FECACA" }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <span style={{ fontSize:13, color:"#991B1B", fontWeight:600 }}>{overdue.length} موعد متأخر يحتاج متابعة</span>
            <button onClick={() => setPage("appointments")} style={{ ...btnS, padding:"4px 14px", fontSize:12, marginRight:"auto" }}>عرض</button>
          </div>
        )}

        {/* مواعيد اليوم */}
        <div style={{ background:C.white, borderRadius:16, padding:"20px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.g900 }}>📋 مواعيد اليوم</h3>
            <button onClick={() => setPage("appointments")} style={{ ...btnS, padding:"5px 14px", fontSize:12 }}>عرض الكل</button>
          </div>
          {todayAppts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:C.g400 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
              <div style={{ fontSize:14 }}>لا توجد مواعيد لهذا اليوم</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {todayAppts.sort((a,b) => a.time.localeCompare(b.time)).map(appt => {
                const cl = getClient(appt.clientId);
                const tech = appt.techId ? getUser(appt.techId) : null;
                return (
                  <div key={appt.id} onClick={() => setModal({ type:"appt", data:appt })} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"12px 16px", borderRadius:12, background:C.g50,
                    border:`1px solid ${C.g200}`, cursor:"pointer",
                    transition:"all .15s"
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, flex:1, minWidth:0 }}>
                      <div style={{
                        width:44, height:44, borderRadius:12, flexShrink:0,
                        background:`linear-gradient(135deg, ${C.brand}12, ${C.brandLight}12)`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:13, fontWeight:700, color:C.brand
                      }}>{appt.time}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:C.g900, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cl?.name || "—"}</span>
                          <PriorityBadge priority={appt.priority}/>
                        </div>
                        <div style={{ fontSize:12, color:C.g500, marginTop:2 }}>
                          {appt.serviceType} • {appt.city}{tech ? ` • 🔧 ${tech.name.split(" ").pop()}` : " • غير مسند"}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={appt.status}/>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════
  //  إدارة المواعيد
  // ═══════════════════════
  const Appointments = () => {
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);

    const list = filteredAppts
      .filter(a => filter === "all" || a.status === filter)
      .filter(a => {
        if (!search) return true;
        const cl = getClient(a.clientId);
        return (cl?.name||"").includes(search) || (cl?.phone||"").includes(search);
      })
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    const changeStatus = (id, s) => {
      setData(p => ({ ...p, appointments: p.appointments.map(a => a.id === id ? { ...a, status:s } : a) }));
      const sl = STATUSES.find(x => x.id === s)?.label;
      log("تحديث حالة", id, `تغيير إلى ${sl}`);
      notify(`تم تحديث الحالة: ${sl}`, "success");
      // جدولة صيانة بعد 6 أشهر عند الاكتمال
      if (s === "completed") {
        const appt = data.appointments.find(a => a.id === id);
        if (appt) {
          const auto = {
            id:uid(), clientId:appt.clientId, city:appt.city,
            serviceType:"صيانة دورية", priority:"normal", status:"new",
            techId:null, date:addMonths(appt.date, 6), time:"09:00",
            products:[], notes:"⏰ صيانة دورية تلقائية - 6 أشهر", amount:0,
            payMethod:"", createdBy:"system", createdAt:new Date().toISOString()
          };
          setData(p => ({ ...p, appointments:[...p.appointments, auto] }));
          log("جدولة تلقائية", auto.id, `صيانة تلقائية بعد 6 أشهر للعميل ${getClient(appt.clientId)?.name}`);
          notify("تم جدولة صيانة تلقائية بعد 6 أشهر ⏰");
        }
      }
    };

    const assignTech = (apptId, techId) => {
      setData(p => ({
        ...p, appointments: p.appointments.map(a =>
          a.id === apptId ? { ...a, techId:techId, status: a.status==="new"?"confirmed":a.status } : a
        )
      }));
      const t = getUser(techId);
      log("إسناد فني", apptId, `إسناد للفني ${t?.name}`);
      notify(`تم إسناد الموعد للفني ${t?.name}`);
    };

    // نموذج موعد جديد
    const ApptForm = () => {
      const [f, setF] = useState({
        clientId:"", city:cityFilter==="all"?"الرياض":cityFilter,
        serviceType:SERVICE_TYPES[0], priority:"normal",
        date:today(), time:"09:00", notes:"", amount:0
      });
      const save = () => {
        if (!f.clientId) return alert("اختر العميل");
        const a = { id:uid(), ...f, status:"new", techId:null, products:[], payMethod:"", createdBy:user.id, createdAt:new Date().toISOString() };
        setData(p => ({ ...p, appointments:[...p.appointments, a] }));
        log("إنشاء موعد", a.id, `${f.serviceType} - ${getClient(f.clientId)?.name}`);
        notify("تم إنشاء موعد جديد ✅");
        setShowForm(false);
      };
      return (
        <Modal title="✨ موعد جديد" onClose={() => setShowForm(false)} width={620}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>العميل *</label>
              <select style={inp} value={f.clientId} onChange={e => setF({...f, clientId:e.target.value})}>
                <option value="">— اختر العميل —</option>
                {data.clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone} ({c.city})</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>المدينة</label>
              <select style={inp} value={f.city} onChange={e => setF({...f, city:e.target.value})}>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
            </div>
            <div>
              <label style={lbl}>نوع الخدمة</label>
              <select style={inp} value={f.serviceType} onChange={e => setF({...f, serviceType:e.target.value})}>{SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label style={lbl}>الأولوية</label>
              <select style={inp} value={f.priority} onChange={e => setF({...f, priority:e.target.value})}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>التاريخ</label>
              <input type="date" style={inp} value={f.date} onChange={e => setF({...f, date:e.target.value})}/>
            </div>
            <div>
              <label style={lbl}>الوقت</label>
              <input type="time" style={inp} value={f.time} onChange={e => setF({...f, time:e.target.value})}/>
            </div>
            <div>
              <label style={lbl}>المبلغ (ر.س)</label>
              <input type="number" style={inp} value={f.amount} onChange={e => setF({...f, amount:+e.target.value})}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>ملاحظات</label>
              <textarea style={{ ...inp, minHeight:70, resize:"vertical" }} value={f.notes} onChange={e => setF({...f, notes:e.target.value})}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <button style={btnS} onClick={() => setShowForm(false)}>إلغاء</button>
            <button style={btnP} onClick={save}><Icon.Check/> حفظ الموعد</button>
          </div>
        </Modal>
      );
    };

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>إدارة المواعيد</h2>
          {user.role !== "technician" && (
            <button style={btnP} onClick={() => setShowForm(true)}><Icon.Plus/> موعد جديد</button>
          )}
        </div>

        {/* بحث + فلاتر */}
        <div style={{ marginBottom:16 }}>
          <div style={{ position:"relative", marginBottom:12, maxWidth:400 }}>
            <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:C.g400 }}><Icon.Search/></span>
            <input placeholder="بحث بالاسم أو الجوال..." style={{ ...inp, paddingRight:38 }} value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[{ id:"all", label:`الكل (${filteredAppts.length})` }, ...STATUSES.map(s => ({ ...s, label:`${s.label} (${filteredAppts.filter(a=>a.status===s.id).length})` }))].map(s => (
              <button key={s.id} onClick={() => setFilter(s.id)} style={{
                padding:"6px 14px", borderRadius:10, border:"none", fontSize:12, fontWeight:600, cursor:"pointer",
                background: filter===s.id ? (s.color||C.brand) : C.g100,
                color: filter===s.id ? C.white : C.g600,
                transition:"all .15s"
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* قائمة المواعيد */}
        <div style={{ background:C.white, borderRadius:16, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          {list.length === 0 ? (
            <div style={{ textAlign:"center", padding:"50px 0", color:C.g400 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
              <div>لا توجد مواعيد</div>
            </div>
          ) : list.map((appt, i) => {
            const cl = getClient(appt.clientId);
            const tech = appt.techId ? getUser(appt.techId) : null;
            const techs = data.users.filter(u => u.role==="technician" && (u.city===appt.city || u.city==="all"));
            return (
              <div key={appt.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"14px 18px", borderBottom: i<list.length-1 ? `1px solid ${C.g100}` : "none",
                cursor:"pointer", transition:"background .15s", gap:12, flexWrap:"wrap"
              }} onClick={() => setModal({ type:"appt", data:appt })}>
                <div style={{ display:"flex", alignItems:"center", gap:14, flex:1, minWidth:200 }}>
                  <div style={{
                    width:46, height:46, borderRadius:13, flexShrink:0,
                    background:`linear-gradient(135deg, ${C.brand}10, ${C.brandLight}10)`,
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:700, color:C.brand, lineHeight:1.3
                  }}>
                    <div>{appt.time}</div>
                    <div style={{ fontSize:9, color:C.g400, fontWeight:500 }}>{fmtDate(appt.date)}</div>
                  </div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:14, fontWeight:600, color:C.g900 }}>{cl?.name || "—"}</span>
                      <PriorityBadge priority={appt.priority}/>
                    </div>
                    <div style={{ fontSize:12, color:C.g500, marginTop:2 }}>
                      {appt.serviceType} • {appt.city} • {cl?.phone}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }} onClick={e => e.stopPropagation()}>
                  {tech ? (
                    <span style={{ fontSize:12, color:C.g600, background:C.g100, padding:"4px 10px", borderRadius:8 }}>🔧 {tech.name.split(" ").pop()}</span>
                  ) : (
                    <select style={{ ...inp, width:140, padding:"5px 8px", fontSize:12 }}
                      onChange={e => assignTech(appt.id, e.target.value)} value="">
                      <option value="">إسناد فني</option>
                      {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  <select style={{
                    ...inp, width:130, padding:"5px 8px", fontSize:12,
                    color: STATUSES.find(s=>s.id===appt.status)?.color, fontWeight:600
                  }}
                    onChange={e => changeStatus(appt.id, e.target.value)} value={appt.status}>
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        {showForm && <ApptForm/>}
      </div>
    );
  };

  // ═══════════════════════
  //  عرض تفاصيل الموعد
  // ═══════════════════════
  const ApptModal = ({ appt }) => {
    const cl = getClient(appt.clientId);
    const tech = appt.techId ? getUser(appt.techId) : null;
    const msgs = data.messages.filter(m => m.apptId === appt.id);
    const [msg, setMsg] = useState("");

    const sendMsg = () => {
      if (!msg.trim()) return;
      setData(p => ({ ...p, messages:[...p.messages, { id:uid(), apptId:appt.id, userId:user.id, text:msg, ts:new Date().toISOString() }] }));
      setMsg("");
    };

    return (
      <Modal title={`تفاصيل الموعد`} onClose={() => setModal(null)} width={680}>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:18, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:12, color:C.g500, marginBottom:3 }}>العميل</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.g900 }}>{cl?.name}</div>
            <div style={{ fontSize:13, color:C.g500 }}>{cl?.phone}</div>
            <div style={{ fontSize:12, color:C.g400, marginTop:3 }}>📍 {cl?.city} - {cl?.district}</div>
          </div>
          <div>
            <div style={{ fontSize:12, color:C.g500, marginBottom:3 }}>الموعد</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
              <StatusBadge status={appt.status}/>
              <PriorityBadge priority={appt.priority}/>
            </div>
            <div style={{ fontSize:13, color:C.g600 }}>
              {appt.serviceType}<br/>
              📅 {fmtDate(appt.date)} - {appt.time}<br/>
              🔧 {tech?.name || "غير مسند"}
            </div>
          </div>
        </div>

        {appt.amount > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderRadius:10, background:"#ECFDF5", marginBottom:16 }}>
            <span style={{ fontSize:13, color:C.g600 }}>المبلغ</span>
            <span style={{ fontSize:17, fontWeight:700, color:C.ok }}>{appt.amount} ر.س</span>
          </div>
        )}

        {appt.notes && (
          <div style={{ padding:"10px 16px", borderRadius:10, background:C.g50, marginBottom:16, fontSize:13, color:C.g700 }}>
            💡 {appt.notes}
          </div>
        )}

        {/* واتساب */}
        <button style={{ ...btnS, width:"100%", justifyContent:"center", marginBottom:16, color:"#25D366", borderColor:"#25D36633" }}
          onClick={() => window.open(`https://wa.me/966${cl?.phone?.slice(1)}?text=${encodeURIComponent(`مرحباً ${cl?.name}، بخصوص موعد ${appt.serviceType} بتاريخ ${fmtDate(appt.date)}`)}`, "_blank")}>
          <Icon.WhatsApp/> تواصل عبر واتساب
        </button>

        {/* محادثات داخلية */}
        <div style={{ borderTop:`1px solid ${C.g200}`, paddingTop:16 }}>
          <h4 style={{ margin:"0 0 10px", fontSize:14, fontWeight:700, color:C.g800 }}>💬 المحادثات الداخلية</h4>
          <div style={{ maxHeight:180, overflowY:"auto", marginBottom:10 }}>
            {msgs.length === 0 ? (
              <div style={{ textAlign:"center", padding:16, color:C.g400, fontSize:13 }}>لا توجد رسائل</div>
            ) : msgs.map(m => {
              const mu = getUser(m.userId);
              return (
                <div key={m.id} style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <div style={{
                    width:30, height:30, borderRadius:8, background:C.brand, flexShrink:0,
                    color:C.white, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:11, fontWeight:700
                  }}>{mu?.name?.charAt(0)}</div>
                  <div style={{ background:C.g50, borderRadius:"4px 12px 12px 12px", padding:"7px 11px", flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:C.g700 }}>{mu?.name}</span>
                      <span style={{ fontSize:10, color:C.g400 }}>{fmtDateTime(m.ts)}</span>
                    </div>
                    <div style={{ fontSize:13, color:C.g600 }}>{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...inp, flex:1 }} placeholder="اكتب رسالة..." value={msg}
              onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key==="Enter" && sendMsg()}/>
            <button onClick={sendMsg} style={{ ...btnP, padding:"9px 14px" }}><Icon.Send/></button>
          </div>
        </div>
      </Modal>
    );
  };

  // ═══════════════════════
  //  إدارة العملاء
  // ═══════════════════════
  const Clients = () => {
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const list = data.clients
      .filter(c => cityFilter === "all" || c.city === cityFilter)
      .filter(c => !search || c.name.includes(search) || c.phone.includes(search));

    const ClientForm = () => {
      const [f, setF] = useState({ name:"", phone:"", city: cityFilter === "all" ? "الرياض" : cityFilter, district:"", address:"", notes:"" });
      const save = () => {
        if (!f.name || !f.phone) return alert("أدخل الاسم والجوال");
        setData(p => ({ ...p, clients: [...p.clients, { id:uid(), ...f, devices:[], createdAt:today() }] }));
        log("إضافة عميل", f.name, f.name);
        notify("تم إضافة عميل ✅");
        setShowForm(false);
      };
      return (
        <Modal title="👤 عميل جديد" onClose={() => setShowForm(false)}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14 }}>
            <div><label style={lbl}>الاسم *</label><input style={inp} value={f.name} onChange={e => setF({...f, name:e.target.value})}/></div>
            <div><label style={lbl}>الجوال *</label><input style={inp} value={f.phone} onChange={e => setF({...f, phone:e.target.value})} placeholder="05XXXXXXXX"/></div>
            <div><label style={lbl}>المدينة</label><select style={inp} value={f.city} onChange={e => setF({...f, city:e.target.value})}>{CITIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>الحي</label><input style={inp} value={f.district} onChange={e => setF({...f, district:e.target.value})}/></div>
            <div style={{ gridColumn:"1/-1" }}><label style={lbl}>العنوان</label><input style={inp} value={f.address} onChange={e => setF({...f, address:e.target.value})}/></div>
            <div style={{ gridColumn:"1/-1" }}><label style={lbl}>ملاحظات</label><textarea style={{ ...inp, minHeight:50, resize:"vertical" }} value={f.notes} onChange={e => setF({...f, notes:e.target.value})}/></div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <button style={btnS} onClick={() => setShowForm(false)}>إلغاء</button>
            <button style={btnP} onClick={save}><Icon.Check/> حفظ</button>
          </div>
        </Modal>
      );
    };

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>العملاء ({list.length})</h2>
          <button style={btnP} onClick={() => setShowForm(true)}><Icon.Plus/> عميل جديد</button>
        </div>
        <div style={{ position:"relative", marginBottom:14, maxWidth:400 }}>
          <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:C.g400 }}><Icon.Search/></span>
          <input placeholder="بحث بالاسم أو الجوال..." style={{ ...inp, paddingRight:38 }} value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
          {list.map(c => {
            const doneCount = data.appointments.filter(a => a.clientId === c.id && a.status === "completed").length;
            const upCount = data.appointments.filter(a => a.clientId === c.id && !["completed","cancelled"].includes(a.status)).length;
            return (
              <div key={c.id} onClick={() => setModal({ type:"client", data:c })} style={{
                background:C.white, borderRadius:14, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
                border:`1px solid ${C.g200}`, cursor:"pointer", transition:"all .15s"
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg, ${C.brand}, ${C.brandLight})`, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:17, fontWeight:700, flexShrink:0 }}>{c.name.charAt(0)}</div>
                  <div><div style={{ fontSize:14, fontWeight:700, color:C.g900 }}>{c.name}</div><div style={{ fontSize:12, color:C.g500 }}>{c.phone}</div></div>
                </div>
                <div style={{ fontSize:11, padding:"2px 8px", borderRadius:6, background:C.brandBg, color:C.brand, fontWeight:600, display:"inline-block", marginBottom:8 }}>📍 {c.city} - {c.district}</div>
                <div style={{ display:"flex", gap:14, fontSize:11, color:C.g500 }}>
                  <span>✅ {doneCount} مكتمل</span><span>📅 {upCount} قادم</span><span>🔧 {c.devices.length} جهاز</span>
                </div>
              </div>
            );
          })}
        </div>
        {showForm && <ClientForm/>}
      </div>
    );
  };

  // ═══════════════════════
  //  المخزون
  // ═══════════════════════
  const Inventory = () => {
    const [selCity, setSelCity] = useState(cityFilter === "all" ? CITIES[0] : cityFilter);
    const items = data.inventory[selCity] || [];
    const changeQty = (productId, delta) => {
      setData(p => ({
        ...p, inventory: { ...p.inventory, [selCity]: p.inventory[selCity].map(i =>
          i.productId === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i
        )}
      }));
      log("تعديل مخزون", productId, (delta > 0 ? "+" : "") + delta + " " + getProduct(productId)?.name + " - " + selCity);
    };
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>📦 المخزون</h2>
          <select style={{ ...inp, width:200 }} value={selCity} onChange={e => setSelCity(e.target.value)}>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        <div style={{ background:C.white, borderRadius:16, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          {items.map((it, i) => {
            const p = getProduct(it.productId);
            const low = it.qty <= it.minQty;
            return (
              <div key={it.productId} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom: i < items.length - 1 ? `1px solid ${C.g100}` : "none", flexWrap:"wrap", gap:10 }}>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.g900 }}>{p?.name}</div>
                  <div style={{ fontSize:12, color:C.g500 }}>{p?.cat} • سعر: {p?.price} ر.س</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:22, fontWeight:800, color: low ? C.err : C.g900 }}>{it.qty}</span>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:6, background: low ? "#FEF2F2" : "#ECFDF5", color: low ? C.err : C.ok, fontWeight:600 }}>{low ? "⚠️ منخفض" : "✅ متوفر"}</span>
                  <button onClick={() => changeQty(it.productId, 10)} style={{ ...btnS, padding:"4px 12px", fontSize:12 }}>+10</button>
                  <button onClick={() => changeQty(it.productId, -1)} style={{ ...btnS, padding:"4px 12px", fontSize:12, color:C.err }}>-1</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════
  //  إدارة العهد
  // ═══════════════════════
  const Custody = () => {
    const isTech = user.role === "technician";
    const isManager = ["owner", "general_manager", "branch_manager"].includes(user.role);
    const techs = data.users.filter(u => u.role === "technician");
    const [selTech, setSelTech] = useState(isTech ? user.id : (techs[0]?.id || ""));
    const [showReqForm, setShowReqForm] = useState(false);
    const [showSendForm, setShowSendForm] = useState(false);

    const viewTech = isTech ? user.id : selTech;
    const techCust = data.custody.filter(c => c.techId === viewTech);
    const techUser = getUser(viewTech);
    const myRequests = data.custodyRequests.filter(r => isTech ? r.fromId === user.id : (isManager && r.status === "pending"));

    // فني يطلب عهدة
    const RequestForm = () => {
      const [f, setF] = useState({ productId: PRODUCTS[4].id, qty: 5, note: "" });
      const managerId = data.users.find(u => ["branch_manager","general_manager","owner"].includes(u.role) && (u.city === user.city || u.city === "all"))?.id;
      const send = () => {
        if (!managerId) return alert("لا يوجد مدير متاح");
        const req = { id:uid(), fromId:user.id, toId:managerId, productId:f.productId, qty:f.qty, status:"pending", note:f.note, createdAt:new Date().toISOString() };
        setData(p => ({ ...p, custodyRequests: [...p.custodyRequests, req] }));
        notify("تم إرسال طلب العهدة ✅");
        log("طلب عهدة", req.id, f.qty + " " + getProduct(f.productId)?.name);
        setShowReqForm(false);
      };
      return (
        <Modal title="📋 طلب عهدة جديدة" onClose={() => setShowReqForm(false)}>
          <div style={{ display:"grid", gap:14 }}>
            <div><label style={lbl}>المنتج</label><select style={inp} value={f.productId} onChange={e => setF({...f, productId:e.target.value})}>{PRODUCTS.filter(p => p.cat === "قطع غيار" || p.cat === "ملحقات").map(p => <option key={p.id} value={p.id}>{p.name} ({p.cat})</option>)}</select></div>
            <div><label style={lbl}>الكمية</label><input type="number" style={inp} value={f.qty} onChange={e => setF({...f, qty:Math.max(1,+e.target.value)})}/></div>
            <div><label style={lbl}>ملاحظة</label><input style={inp} value={f.note} onChange={e => setF({...f, note:e.target.value})} placeholder="سبب الطلب..."/></div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
            <button style={btnS} onClick={() => setShowReqForm(false)}>إلغاء</button>
            <button style={btnP} onClick={send}>📩 إرسال الطلب</button>
          </div>
        </Modal>
      );
    };

    // مدير يرسل عهدة لفني
    const SendForm = () => {
      const [f, setF] = useState({ techId: techs[0]?.id || "", productId: PRODUCTS[4].id, qty: 5 });
      const send = () => {
        const techTarget = getUser(f.techId);
        const existing = data.custody.find(c => c.techId === f.techId && c.productId === f.productId);
        if (existing) {
          setData(p => ({ ...p, custody: p.custody.map(c => c.id === existing.id ? { ...c, qty: c.qty + f.qty } : c) }));
        } else {
          setData(p => ({ ...p, custody: [...p.custody, { id:uid(), techId:f.techId, productId:f.productId, qty:f.qty, city:techTarget?.city || "", givenBy:user.id, givenAt:new Date().toISOString() }] }));
        }
        notify("تم تسليم العهدة ✅");
        log("تسليم عهدة", f.techId, f.qty + " " + getProduct(f.productId)?.name + " → " + techTarget?.name);
        setShowSendForm(false);
      };
      return (
        <Modal title="📦 تسليم عهدة لفني" onClose={() => setShowSendForm(false)}>
          <div style={{ display:"grid", gap:14 }}>
            <div><label style={lbl}>الفني</label><select style={inp} value={f.techId} onChange={e => setF({...f, techId:e.target.value})}>{techs.map(t => <option key={t.id} value={t.id}>{t.name} - {t.city}</option>)}</select></div>
            <div><label style={lbl}>المنتج</label><select style={inp} value={f.productId} onChange={e => setF({...f, productId:e.target.value})}>{PRODUCTS.filter(p => p.cat === "قطع غيار" || p.cat === "ملحقات").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={lbl}>الكمية</label><input type="number" style={inp} value={f.qty} onChange={e => setF({...f, qty:Math.max(1,+e.target.value)})}/></div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
            <button style={btnS} onClick={() => setShowSendForm(false)}>إلغاء</button>
            <button style={btnP} onClick={send}><Icon.Check/> تسليم</button>
          </div>
        </Modal>
      );
    };

    // قبول / رفض طلب
    const approveReq = (reqId) => {
      const req = data.custodyRequests.find(r => r.id === reqId);
      if (!req) return;
      const existing = data.custody.find(c => c.techId === req.fromId && c.productId === req.productId);
      if (existing) {
        setData(p => ({ ...p, custody: p.custody.map(c => c.id === existing.id ? { ...c, qty: c.qty + req.qty } : c), custodyRequests: p.custodyRequests.map(r => r.id === reqId ? { ...r, status:"approved" } : r) }));
      } else {
        setData(p => ({ ...p, custody: [...p.custody, { id:uid(), techId:req.fromId, productId:req.productId, qty:req.qty, city:getUser(req.fromId)?.city || "", givenBy:user.id, givenAt:new Date().toISOString() }], custodyRequests: p.custodyRequests.map(r => r.id === reqId ? { ...r, status:"approved" } : r) }));
      }
      notify("تم قبول الطلب وتسليم العهدة ✅");
      log("قبول طلب عهدة", reqId, req.qty + " " + getProduct(req.productId)?.name + " → " + getUser(req.fromId)?.name);
    };

    const rejectReq = (reqId) => {
      setData(p => ({ ...p, custodyRequests: p.custodyRequests.map(r => r.id === reqId ? { ...r, status:"rejected" } : r) }));
      notify("تم رفض الطلب");
    };

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>🛡️ {isTech ? "عهدتي" : "إدارة العهد"}</h2>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {isTech && <button style={btnP} onClick={() => setShowReqForm(true)}>📋 طلب عهدة</button>}
            {isManager && <button style={btnP} onClick={() => setShowSendForm(true)}>📦 تسليم عهدة</button>}
            {isManager && (
              <select style={{ ...inp, width:200 }} value={selTech} onChange={e => setSelTech(e.target.value)}>
                {techs.map(t => <option key={t.id} value={t.id}>{t.name} - {t.city}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* طلبات العهد المعلقة (للمدراء) */}
        {isManager && myRequests.length > 0 && (
          <div style={{ background:"#FFFBEB", borderRadius:14, padding:16, marginBottom:16, border:"1px solid #FDE68A" }}>
            <h4 style={{ margin:"0 0 10px", fontSize:14, fontWeight:700, color:"#92400E" }}>📬 طلبات عهدة معلقة ({myRequests.length})</h4>
            {myRequests.map(r => {
              const fromUser = getUser(r.fromId);
              const prod = getProduct(r.productId);
              return (
                <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:C.white, borderRadius:10, marginBottom:6, border:`1px solid ${C.g200}`, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.g900 }}>🔧 {fromUser?.name} يطلب: {r.qty} × {prod?.name}</div>
                    {r.note && <div style={{ fontSize:11, color:C.g500, marginTop:2 }}>💬 {r.note}</div>}
                    <div style={{ fontSize:10, color:C.g400, marginTop:2 }}>{fmtDateTime(r.createdAt)}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => approveReq(r.id)} style={{ ...btnP, padding:"6px 14px", fontSize:12 }}>✅ قبول</button>
                    <button onClick={() => rejectReq(r.id)} style={{ ...btnS, padding:"6px 14px", fontSize:12, color:C.err }}>❌ رفض</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* طلباتي (للفني) */}
        {isTech && myRequests.length > 0 && (
          <div style={{ background:C.brandBg, borderRadius:14, padding:16, marginBottom:16, border:`1px solid ${C.brandPale}` }}>
            <h4 style={{ margin:"0 0 10px", fontSize:14, fontWeight:700, color:C.brandDark }}>📋 طلباتي</h4>
            {myRequests.map(r => {
              const prod = getProduct(r.productId);
              const stColor = r.status === "pending" ? C.warn : r.status === "approved" ? C.ok : C.err;
              const stLabel = r.status === "pending" ? "قيد المراجعة" : r.status === "approved" ? "مقبول" : "مرفوض";
              return (
                <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:C.white, borderRadius:8, marginBottom:4, border:`1px solid ${C.g200}` }}>
                  <div style={{ fontSize:12 }}>{r.qty} × {prod?.name} {r.note && `• ${r.note}`}</div>
                  <span style={{ fontSize:11, fontWeight:600, color:stColor, background:stColor+"15", padding:"2px 8px", borderRadius:6 }}>{stLabel}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* عرض العهدة */}
        {techUser && (
          <div style={{ background:C.white, borderRadius:16, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
              <div style={{ width:50, height:50, borderRadius:14, background:`linear-gradient(135deg, ${C.brand}, ${C.brandLight})`, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:20, fontWeight:700 }}>{techUser.name.charAt(0)}</div>
              <div><div style={{ fontSize:16, fontWeight:700 }}>{techUser.name}</div><div style={{ fontSize:12, color:C.g500 }}>{techUser.city} • {techUser.phone}</div></div>
            </div>
            <h4 style={{ fontSize:14, fontWeight:700, marginBottom:10, color:C.g800 }}>📋 العهدة الحالية</h4>
            {techCust.length === 0 ? (
              <div style={{ textAlign:"center", padding:"30px 0", color:C.g400, fontSize:13 }}>لا توجد عهدة</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(170px, 1fr))", gap:10 }}>
                {techCust.map(c => {
                  const p = getProduct(c.productId);
                  return (
                    <div key={c.id} style={{ padding:14, borderRadius:12, background:C.g50, border:`1px solid ${C.g200}` }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.g900, marginBottom:4 }}>{p?.name}</div>
                      <div style={{ fontSize:28, fontWeight:800, color:C.brand }}>{c.qty}</div>
                      <div style={{ fontSize:10, color:C.g400, marginTop:2 }}>تسليم: {fmtDate(c.givenAt)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showReqForm && <RequestForm/>}
        {showSendForm && <SendForm/>}
      </div>
    );
  };

  // ═══════════════════════
  //  العقود
  // ═══════════════════════
  const Contracts = () => {
    return (
      <div>
        <h2 style={{ margin:"0 0 16px", fontSize:22, fontWeight:800, color:C.g900 }}>📄 العقود والاشتراكات</h2>
        <div style={{ display:"grid", gap:12 }}>
          {data.contracts.map(cn => {
            const cl = getClient(cn.clientId);
            const daysLeft = Math.ceil((new Date(cn.endDate) - new Date()) / 86400000);
            return (
              <div key={cn.id} style={{ background:C.white, borderRadius:14, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.05)", borderRight:`4px solid ${daysLeft < 30 ? C.warn : C.ok}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:C.g900, marginBottom:2 }}>{cl?.name}</div>
                    <div style={{ fontSize:12, color:C.g500 }}>عقد {cn.type} • {cn.totalVisits} زيارات</div>
                  </div>
                  <span style={{ padding:"3px 10px", borderRadius:8, fontSize:11, fontWeight:600, background: cn.status === "active" ? "#ECFDF5" : "#FEF2F2", color: cn.status === "active" ? C.ok : C.err }}>{cn.status === "active" ? "فعّال" : "منتهي"}</span>
                </div>
                <div style={{ display:"flex", gap:20, marginTop:12, fontSize:12, color:C.g600, flexWrap:"wrap" }}>
                  <span>📅 {fmtDate(cn.startDate)} → {fmtDate(cn.endDate)}</span>
                  <span>💰 {cn.amount} ر.س</span>
                  <span>✅ {cn.doneVisits}/{cn.totalVisits}</span>
                  <span style={{ color: daysLeft < 30 ? C.warn : C.g500 }}>⏳ {daysLeft} يوم متبقي</span>
                </div>
                {cn.notes && <div style={{ marginTop:8, fontSize:12, color:C.g500, background:C.g50, padding:"6px 10px", borderRadius:8 }}>💡 {cn.notes}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════
  //  التقارير
  // ═══════════════════════
  const Reports = () => {
    const completed = filteredAppts.filter(a => a.status === "completed");
    const totalRev = completed.reduce((s, a) => s + (a.amount || 0), 0);
    const avgRev = completed.length ? Math.round(totalRev / completed.length) : 0;

    const cityStats = CITIES.map(c => {
      const ca = data.appointments.filter(a => a.city === c);
      const cd = ca.filter(a => a.status === "completed");
      return { city: c, total: ca.length, done: cd.length, rev: cd.reduce((s, a) => s + (a.amount || 0), 0) };
    }).filter(c => c.total > 0).sort((a, b) => b.rev - a.rev);

    const techStats = data.users.filter(u => u.role === "technician").map(t => {
      const ta = data.appointments.filter(a => a.techId === t.id);
      const td = ta.filter(a => a.status === "completed");
      return { name: t.name, city: t.city, total: ta.length, done: td.length, rev: td.reduce((s, a) => s + (a.amount || 0), 0) };
    }).sort((a, b) => b.done - a.done);

    return (
      <div>
        <h2 style={{ margin:"0 0 16px", fontSize:22, fontWeight:800, color:C.g900 }}>📊 التقارير</h2>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap:14, marginBottom:24 }}>
          <StatCard title="إجمالي المواعيد" value={filteredAppts.length} color={C.brand} icon="📊"/>
          <StatCard title="مكتمل" value={completed.length} color={C.ok} icon="✅"/>
          <StatCard title="الإيرادات" value={totalRev.toLocaleString() + " ر.س"} color={C.purple} icon="💰"/>
          <StatCard title="متوسط الموعد" value={avgRev + " ر.س"} color={C.warn} icon="📈"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:16 }}>
          <div style={{ background:C.white, borderRadius:14, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:C.g900 }}>🏙️ أداء المدن</h3>
            {cityStats.map((cs, i) => (
              <div key={cs.city} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < cityStats.length - 1 ? `1px solid ${C.g100}` : "none" }}>
                <div><div style={{ fontSize:13, fontWeight:600, color:C.g900 }}>{cs.city}</div><div style={{ fontSize:11, color:C.g500 }}>{cs.done}/{cs.total} مكتمل</div></div>
                <div style={{ fontSize:14, fontWeight:700, color:C.brand }}>{cs.rev.toLocaleString()} ر.س</div>
              </div>
            ))}
          </div>
          <div style={{ background:C.white, borderRadius:14, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:C.g900 }}>👨‍🔧 أداء الفنيين</h3>
            {techStats.map((ts, i) => (
              <div key={ts.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < techStats.length - 1 ? `1px solid ${C.g100}` : "none" }}>
                <div><div style={{ fontSize:13, fontWeight:600, color:C.g900 }}>{ts.name}</div><div style={{ fontSize:11, color:C.g500 }}>{ts.city} • {ts.done}/{ts.total}</div></div>
                <div style={{ fontSize:14, fontWeight:700, color:C.ok }}>{ts.rev.toLocaleString()} ر.س</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════
  //  الحسابات المالية
  // ═══════════════════════
  const Finance = () => {
    const completed = filteredAppts.filter(a => a.status === "completed");
    const totalRev = completed.reduce((s, a) => s + (a.amount || 0), 0);
    const cash = completed.filter(a => a.payMethod === "نقدي").reduce((s, a) => s + (a.amount || 0), 0);
    const transfer = completed.filter(a => a.payMethod === "تحويل").reduce((s, a) => s + (a.amount || 0), 0);
    const card = completed.filter(a => a.payMethod === "شبكة").reduce((s, a) => s + (a.amount || 0), 0);
    const unpaid = completed.filter(a => !a.payMethod).reduce((s, a) => s + (a.amount || 0), 0);
    return (
      <div>
        <h2 style={{ margin:"0 0 16px", fontSize:22, fontWeight:800, color:C.g900 }}>💰 الحسابات المالية</h2>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap:14, marginBottom:24 }}>
          <StatCard title="إجمالي الإيرادات" value={totalRev.toLocaleString() + " ر.س"} color={C.ok} icon="💰"/>
          <StatCard title="نقدي" value={cash.toLocaleString() + " ر.س"} color={C.brand} icon="💵"/>
          <StatCard title="تحويل" value={transfer.toLocaleString() + " ر.س"} color={C.purple} icon="🏦"/>
          <StatCard title="غير مدفوع" value={unpaid.toLocaleString() + " ر.س"} color={C.err} icon="⏳"/>
        </div>
        <div style={{ background:C.white, borderRadius:16, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.g200}`, fontWeight:700, fontSize:15, color:C.g900 }}>المعاملات المكتملة</div>
          {completed.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:C.g400 }}>لا توجد معاملات</div>
          ) : completed.map((a, i) => {
            const cl = getClient(a.clientId);
            return (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 18px", borderBottom: i < completed.length - 1 ? `1px solid ${C.g100}` : "none", flexWrap:"wrap", gap:8 }}>
                <div><div style={{ fontSize:13, fontWeight:600, color:C.g900 }}>{cl?.name}</div><div style={{ fontSize:11, color:C.g500 }}>{a.serviceType} • {fmtDate(a.date)} • {a.city}</div></div>
                <div style={{ textAlign:"left" }}><div style={{ fontSize:16, fontWeight:700, color:C.ok }}>{a.amount} ر.س</div><div style={{ fontSize:10, color:C.g400 }}>{a.payMethod || "غير محدد"}</div></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════
  //  إدارة المستخدمين
  // ═══════════════════════
  const Users = () => {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    const UserForm = ({ editUser, onClose }) => {
      const [f, setF] = useState(editUser || { name:"", role:"customer_service", phone:"", city:"الرياض", permissions:[], active:true, pass:"" });
      const togglePerm = (permId) => {
        setF(p => ({ ...p, permissions: p.permissions.includes(permId) ? p.permissions.filter(x => x !== permId) : [...p.permissions, permId] }));
      };
      const save = () => {
        if (!f.name || !f.phone) return alert("أدخل البيانات");
        if (editUser) {
          setData(p => ({ ...p, users: p.users.map(u => u.id === editUser.id ? { ...u, ...f } : u) }));
        } else {
          setData(p => ({ ...p, users: [...p.users, { id:uid(), ...f }] }));
        }
        notify(editUser ? "تم التحديث ✅" : "تم إضافة مستخدم ✅");
        onClose();
      };
      return (
        <Modal title={editUser ? "✏️ تعديل مستخدم" : "👤 مستخدم جديد"} onClose={onClose} width={620}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14 }}>
            <div><label style={lbl}>الاسم *</label><input style={inp} value={f.name} onChange={e => setF({...f, name:e.target.value})}/></div>
            <div><label style={lbl}>الجوال *</label><input style={inp} value={f.phone} onChange={e => setF({...f, phone:e.target.value})}/></div>
            <div><label style={lbl}>الدور</label><select style={inp} value={f.role} onChange={e => setF({...f, role:e.target.value})}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
            <div><label style={lbl}>المدينة</label><select style={inp} value={f.city} onChange={e => setF({...f, city:e.target.value})}><option value="all">جميع المدن</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select></div>
            {!editUser && <div><label style={lbl}>كلمة المرور</label><input style={inp} value={f.pass} onChange={e => setF({...f, pass:e.target.value})}/></div>}
          </div>
          <div style={{ marginTop:14 }}>
            <label style={lbl}>الصلاحيات</label>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:6, marginTop:6 }}>
              {PERMISSIONS_LIST.map(pm => (
                <label key={pm} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px", borderRadius:8, background: f.permissions.includes(pm) ? C.brandBg : C.g50, border:`1px solid ${f.permissions.includes(pm) ? C.brandPale : C.g200}`, cursor:"pointer", fontSize:12 }}>
                  <input type="checkbox" checked={f.permissions.includes(pm)} onChange={() => togglePerm(pm)} style={{ accentColor:C.brand }}/>
                  {PERM_LABELS[pm] || pm}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
            <button style={btnS} onClick={onClose}>إلغاء</button>
            <button style={btnP} onClick={save}><Icon.Check/> حفظ</button>
          </div>
        </Modal>
      );
    };

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>👥 المستخدمين ({data.users.length})</h2>
          <button style={btnP} onClick={() => setShowForm(true)}><Icon.Plus/> مستخدم جديد</button>
        </div>
        <div style={{ display:"grid", gap:10 }}>
          {data.users.map(u => (
            <div key={u.id} style={{ background:C.white, borderRadius:12, padding:"14px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.g200}`, opacity: u.active ? 1 : 0.5, flexWrap:"wrap", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg, ${C.brand}, ${C.brandLight})`, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:15, fontWeight:700, flexShrink:0 }}>{u.name.charAt(0)}</div>
                <div><div style={{ fontSize:13, fontWeight:600, color:C.g900 }}>{u.name}</div><div style={{ fontSize:11, color:C.g500 }}>{roleName(u.role)} • {u.city === "all" ? "الكل" : u.city} • {u.phone}</div></div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:600, background: u.active ? "#ECFDF5" : "#FEF2F2", color: u.active ? C.ok : C.err }}>{u.active ? "فعّال" : "معطّل"}</span>
                <button onClick={() => setEditing(u)} style={{ border:"none", background:C.g100, borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.g500 }}><Icon.Edit/></button>
              </div>
            </div>
          ))}
        </div>
        {showForm && <UserForm onClose={() => setShowForm(false)}/>}
        {editing && <UserForm editUser={editing} onClose={() => setEditing(null)}/>}
      </div>
    );
  };

  // ═══════════════════════
  //  سجل التعديلات
  // ═══════════════════════
  const AuditLog = () => {
    return (
      <div>
        <h2 style={{ margin:"0 0 16px", fontSize:22, fontWeight:800, color:C.g900 }}>📝 سجل التعديلات</h2>
        <div style={{ background:C.white, borderRadius:16, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          {data.auditLog.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:C.g400 }}>لا توجد سجلات</div>
          ) : data.auditLog.map((lg, i) => {
            const u = getUser(lg.userId);
            return (
              <div key={lg.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", borderBottom: i < data.auditLog.length - 1 ? `1px solid ${C.g100}` : "none" }}>
                <div style={{ width:38, height:38, borderRadius:10, background:C.brandBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>📝</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.g900 }}>{lg.action}</div>
                  <div style={{ fontSize:11, color:C.g500, marginTop:1 }}>{lg.details}</div>
                </div>
                <div style={{ textAlign:"left", flexShrink:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:C.g600 }}>{u?.name || "النظام"}</div>
                  <div style={{ fontSize:10, color:C.g400 }}>{fmtDateTime(lg.ts)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════
  //  مودال تفاصيل العميل
  // ═══════════════════════
  const ClientModal = ({ client }) => {
    const clientAppts = data.appointments.filter(a => a.clientId === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
      <Modal title={"👤 " + client.name} onClose={() => setModal(null)} width={650}>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14, marginBottom:16 }}>
          <div><div style={{ fontSize:11, color:C.g500 }}>الاسم</div><div style={{ fontSize:14, fontWeight:600 }}>{client.name}</div></div>
          <div><div style={{ fontSize:11, color:C.g500 }}>الجوال</div><div style={{ fontSize:14, fontWeight:600 }}>{client.phone}</div></div>
          <div><div style={{ fontSize:11, color:C.g500 }}>المدينة</div><div style={{ fontSize:14, fontWeight:600 }}>{client.city} - {client.district}</div></div>
          <div><div style={{ fontSize:11, color:C.g500 }}>العنوان</div><div style={{ fontSize:14, fontWeight:600 }}>{client.address}</div></div>
          <div><div style={{ fontSize:11, color:C.g500 }}>الأجهزة</div><div style={{ fontSize:14, fontWeight:600 }}>{client.devices.length > 0 ? client.devices.join("، ") : "لا يوجد"}</div></div>
          <div><div style={{ fontSize:11, color:C.g500 }}>التسجيل</div><div style={{ fontSize:14, fontWeight:600 }}>{fmtDate(client.createdAt)}</div></div>
        </div>
        {client.notes && <div style={{ padding:"8px 14px", borderRadius:8, background:C.g50, marginBottom:14, fontSize:12, color:C.g700 }}>💡 {client.notes}</div>}
        <h4 style={{ fontSize:14, fontWeight:700, marginBottom:10, color:C.g800 }}>📋 سجل المواعيد ({clientAppts.length})</h4>
        {clientAppts.length === 0 ? (
          <div style={{ textAlign:"center", padding:20, color:C.g400, fontSize:13 }}>لا توجد مواعيد</div>
        ) : clientAppts.map(a => (
          <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:8, background:C.g50, marginBottom:6, border:`1px solid ${C.g200}` }}>
            <div><div style={{ fontSize:12, fontWeight:600, color:C.g900 }}>{a.serviceType}</div><div style={{ fontSize:11, color:C.g500 }}>{fmtDate(a.date)} - {a.time} • {a.city}</div></div>
            <StatusBadge status={a.status} small/>
          </div>
        ))}
      </Modal>
    );
  };

  // ═══════════════════════
  //  إدارة المنتجات (للإدارة فقط)
  // ═══════════════════════
  const ProductsPage = () => {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("all");

    const cats = [...new Set(PRODUCTS.map(p => p.cat))];
    const list = PRODUCTS.filter(p => {
      if (catFilter !== "all" && p.cat !== catFilter) return false;
      if (search && !p.name.includes(search)) return false;
      return true;
    });

    const ProdForm = ({ prod, onClose }) => {
      const [f, setF] = useState(prod ? { ...prod } : { name:"", cat:"فلاتر تحلية", price:0, oldPrice:0, desc:"", sku:"", features:"", image:"", minStock:5 });
      const save = () => {
        if (!f.name) return alert("أدخل اسم المنتج");
        if (prod) {
          const idx = PRODUCTS.findIndex(p => p.id === prod.id);
          if (idx >= 0) Object.assign(PRODUCTS[idx], f);
          notify("تم تحديث المنتج ✅");
        } else {
          PRODUCTS.push({ id: uid(), ...f });
          notify("تم إضافة المنتج ✅");
          log("إضافة منتج", f.name, f.name + " - " + f.cat);
        }
        onClose();
      };
      return (
        <Modal title={prod ? "✏️ تعديل منتج" : "📦 منتج جديد"} onClose={onClose} width={650}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14 }}>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><label style={lbl}>اسم المنتج *</label><input style={inp} value={f.name} onChange={e => setF({...f, name:e.target.value})} placeholder="مثال: فلتر نقاء 7 مراحل"/></div>
            <div><label style={lbl}>الفئة</label><select style={inp} value={f.cat} onChange={e => setF({...f, cat:e.target.value})}><option>فلاتر تحلية</option><option>برادات مياه</option><option>بكجات</option><option>قطع غيار</option><option>ملحقات</option></select></div>
            <div><label style={lbl}>رمز المنتج (SKU)</label><input style={inp} value={f.sku || ""} onChange={e => setF({...f, sku:e.target.value})} placeholder="PU-F7-001"/></div>
            <div><label style={lbl}>السعر (ر.س) *</label><input type="number" style={inp} value={f.price} onChange={e => setF({...f, price:+e.target.value})}/></div>
            <div><label style={lbl}>السعر قبل الخصم</label><input type="number" style={inp} value={f.oldPrice || 0} onChange={e => setF({...f, oldPrice:+e.target.value})} placeholder="0 = بدون خصم"/></div>
            <div><label style={lbl}>الحد الأدنى للمخزون</label><input type="number" style={inp} value={f.minStock || 5} onChange={e => setF({...f, minStock:+e.target.value})}/></div>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><label style={lbl}>رابط الصورة</label><input style={inp} value={f.image || ""} onChange={e => setF({...f, image:e.target.value})} placeholder="https://cdn.salla.sa/..."/></div>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><label style={lbl}>الوصف</label><textarea style={{ ...inp, minHeight:60, resize:"vertical" }} value={f.desc || ""} onChange={e => setF({...f, desc:e.target.value})} placeholder="وصف تفصيلي للمنتج..."/></div>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><label style={lbl}>المميزات (فصل بـ |)</label><textarea style={{ ...inp, minHeight:50, resize:"vertical" }} value={f.features || ""} onChange={e => setF({...f, features:e.target.value})} placeholder="ميزة 1 | ميزة 2 | ميزة 3"/></div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <button style={btnS} onClick={onClose}>إلغاء</button>
            <button style={btnP} onClick={save}><Icon.Check/> حفظ</button>
          </div>
        </Modal>
      );
    };

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>📦 إدارة المنتجات ({PRODUCTS.length})</h2>
          <button style={btnP} onClick={() => setShowForm(true)}><Icon.Plus/> منتج جديد</button>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:C.g400 }}><Icon.Search/></span>
            <input placeholder="بحث عن منتج..." style={{ ...inp, paddingRight:38 }} value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {["all", ...cats].map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{
                padding:"6px 14px", borderRadius:8, border:"none", fontSize:12, fontWeight:600, cursor:"pointer",
                background: catFilter === c ? C.brand : C.g100, color: catFilter === c ? C.white : C.g600
              }}>{c === "all" ? "الكل" : c}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
          {list.map(p => {
            const hasDiscount = p.oldPrice && p.oldPrice > p.price;
            const discountPct = hasDiscount ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
            return (
            <div key={p.id} style={{ background:C.white, borderRadius:14, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", border:`1px solid ${C.g200}` }}>
              {/* صورة المنتج */}
              <div style={{ height:160, background:`linear-gradient(135deg, ${C.brandBg}, ${C.brandPale})`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"contain", padding:10 }} onError={e => { e.target.style.display = "none"; e.target.nextSibling && (e.target.nextSibling.style.display = "flex"); }}/>
                ) : null}
                <span style={{ fontSize:48, opacity:0.3, display: p.image ? "none" : "flex" }}>📦</span>
                <span style={{ position:"absolute", top:10, right:10, padding:"3px 10px", borderRadius:6, fontSize:10, fontWeight:600, background:C.brand, color:C.white }}>{p.cat}</span>
                {hasDiscount && <span style={{ position:"absolute", top:10, left:10, padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, background:C.err, color:C.white }}>-{discountPct}%</span>}
              </div>
              <div style={{ padding:14 }}>
                <div style={{ fontSize:15, fontWeight:700, color:C.g900, marginBottom:4 }}>{p.name}</div>
                {p.desc && <div style={{ fontSize:11, color:C.g500, marginBottom:8, lineHeight:1.6, maxHeight:48, overflow:"hidden" }}>{p.desc}</div>}
                {p.sku && <div style={{ fontSize:10, color:C.g400, marginBottom:6 }}>SKU: {p.sku}</div>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
                  <div>
                    <span style={{ fontSize:20, fontWeight:800, color:C.brand }}>{p.price}</span>
                    <span style={{ fontSize:11, fontWeight:500, color:C.g500 }}> ر.س</span>
                    {hasDiscount && <span style={{ fontSize:12, color:C.g400, textDecoration:"line-through", marginRight:8 }}>{p.oldPrice}</span>}
                  </div>
                  <button onClick={() => setEditing(p)} style={{ ...btnS, padding:"6px 12px", fontSize:11 }}><Icon.Edit/> تعديل</button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {showForm && <ProdForm onClose={() => setShowForm(false)}/>}
        {editing && <ProdForm prod={editing} onClose={() => setEditing(null)}/>}
      </div>
    );
  };

  // ═══════════════════════
  //  إدارة المهام
  // ═══════════════════════
  const Tasks = () => {
    const isManager = ["owner", "general_manager", "branch_manager"].includes(user.role);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState("all");
    const [viewTask, setViewTask] = useState(null);

    const TASK_STATUSES = [
      { id:"new", label:"جديدة", color:"#3B82F6", bg:"#EFF6FF", icon:"🆕" },
      { id:"in_progress", label:"قيد التنفيذ", color:"#F59E0B", bg:"#FFFBEB", icon:"⏳" },
      { id:"completed", label:"مكتملة", color:"#10B981", bg:"#ECFDF5", icon:"✅" },
      { id:"cancelled", label:"ملغية", color:"#EF4444", bg:"#FEF2F2", icon:"❌" },
    ];

    const myTasks = data.tasks.filter(t => {
      if (isManager) return true;
      return t.assignedTo === user.id;
    }).filter(t => filter === "all" || t.status === filter).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const getStatusInfo = (sid) => TASK_STATUSES.find(s => s.id === sid) || TASK_STATUSES[0];
    const getPrioInfo = (pid) => PRIORITIES.find(p => p.id === pid) || PRIORITIES[0];

    const changeTaskStatus = (taskId, newStatus) => {
      setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t) }));
      const sl = getStatusInfo(newStatus).label;
      log("تحديث مهمة", taskId, "تغيير الحالة إلى " + sl);
      notify("تم تحديث المهمة: " + sl + " ✅");
    };

    const addComment = (taskId, text) => {
      if (!text.trim()) return;
      setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, { userId: user.id, text, ts: new Date().toISOString() }] } : t) }));
    };

    // نموذج إنشاء مهمة
    const TaskForm = () => {
      const allStaff = data.users.filter(u => u.active);
      const [f, setF] = useState({ title:"", desc:"", assignedTo: allStaff[0]?.id || "", priority:"normal", dueDate: today() });
      const save = () => {
        if (!f.title) return alert("أدخل عنوان المهمة");
        if (!f.assignedTo) return alert("اختر الموظف");
        const task = { id:uid(), ...f, assignedBy:user.id, status:"new", comments:[], createdAt:new Date().toISOString() };
        setData(p => ({ ...p, tasks: [...p.tasks, task] }));
        log("إنشاء مهمة", task.id, f.title + " → " + getUser(f.assignedTo)?.name);
        notify("تم إنشاء المهمة ✅");
        setShowForm(false);
      };
      return (
        <Modal title="📋 مهمة جديدة" onClose={() => setShowForm(false)} width={580}>
          <div style={{ display:"grid", gap:14 }}>
            <div><label style={lbl}>عنوان المهمة *</label><input style={inp} value={f.title} onChange={e => setF({...f, title:e.target.value})} placeholder="مثال: متابعة عميل..."/></div>
            <div><label style={lbl}>الوصف</label><textarea style={{ ...inp, minHeight:60, resize:"vertical" }} value={f.desc} onChange={e => setF({...f, desc:e.target.value})} placeholder="تفاصيل المهمة..."/></div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14 }}>
              <div><label style={lbl}>إسناد إلى *</label><select style={inp} value={f.assignedTo} onChange={e => setF({...f, assignedTo:e.target.value})}>{allStaff.map(u => <option key={u.id} value={u.id}>{u.name} ({roleName(u.role)})</option>)}</select></div>
              <div><label style={lbl}>الأولوية</label><select style={inp} value={f.priority} onChange={e => setF({...f, priority:e.target.value})}>{PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}</select></div>
              <div><label style={lbl}>تاريخ الاستحقاق</label><input type="date" style={inp} value={f.dueDate} onChange={e => setF({...f, dueDate:e.target.value})}/></div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:18 }}>
            <button style={btnS} onClick={() => setShowForm(false)}>إلغاء</button>
            <button style={btnP} onClick={save}><Icon.Check/> إنشاء المهمة</button>
          </div>
        </Modal>
      );
    };

    // مودال تفاصيل المهمة
    const TaskDetail = ({ task }) => {
      const [newComment, setNewComment] = useState("");
      const assignee = getUser(task.assignedTo);
      const assigner = getUser(task.assignedBy);
      const si = getStatusInfo(task.status);
      const pi = getPrioInfo(task.priority);
      const overdue = task.status !== "completed" && task.status !== "cancelled" && new Date(task.dueDate) < new Date();

      return (
        <Modal title={"📋 " + task.title} onClose={() => setViewTask(null)} width={620}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:14, marginBottom:16 }}>
            <div><div style={{ fontSize:11, color:C.g500 }}>الحالة</div><span style={{ padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:600, background:si.bg, color:si.color }}>{si.icon} {si.label}</span></div>
            <div><div style={{ fontSize:11, color:C.g500 }}>الأولوية</div><span style={{ padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:600, background:pi.bg, color:pi.color }}>{pi.icon} {pi.label}</span></div>
            <div><div style={{ fontSize:11, color:C.g500 }}>مسندة إلى</div><div style={{ fontSize:14, fontWeight:600 }}>{assignee?.name || "—"} ({roleName(assignee?.role)})</div></div>
            <div><div style={{ fontSize:11, color:C.g500 }}>أنشأها</div><div style={{ fontSize:14, fontWeight:600 }}>{assigner?.name || "النظام"}</div></div>
            <div><div style={{ fontSize:11, color:C.g500 }}>تاريخ الاستحقاق</div><div style={{ fontSize:14, fontWeight:600, color: overdue ? C.err : C.g900 }}>{fmtDate(task.dueDate)} {overdue ? "⚠️ متأخرة" : ""}</div></div>
            <div><div style={{ fontSize:11, color:C.g500 }}>تاريخ الإنشاء</div><div style={{ fontSize:14, fontWeight:600 }}>{fmtDateTime(task.createdAt)}</div></div>
          </div>
          {task.desc && <div style={{ padding:"10px 14px", borderRadius:10, background:C.g50, marginBottom:14, fontSize:13, color:C.g700, lineHeight:1.6 }}>{task.desc}</div>}

          {/* تغيير الحالة */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
            {TASK_STATUSES.filter(s => s.id !== task.status).map(s => (
              <button key={s.id} onClick={() => { changeTaskStatus(task.id, s.id); setViewTask({...task, status:s.id}); }} style={{ ...btnS, padding:"5px 12px", fontSize:11, color:s.color, borderColor:s.color+"40" }}>{s.icon} {s.label}</button>
            ))}
          </div>

          {/* التعليقات */}
          <h4 style={{ fontSize:14, fontWeight:700, marginBottom:8, color:C.g800 }}>💬 التعليقات ({task.comments.length})</h4>
          {task.comments.length === 0 ? (
            <div style={{ textAlign:"center", padding:"16px 0", color:C.g400, fontSize:12 }}>لا توجد تعليقات</div>
          ) : (
            <div style={{ display:"grid", gap:6, marginBottom:12 }}>
              {task.comments.map((c, i) => {
                const cu = getUser(c.userId);
                return (
                  <div key={i} style={{ padding:"8px 12px", borderRadius:8, background: c.userId === user.id ? C.brandBg : C.g50, border:`1px solid ${c.userId === user.id ? C.brandPale : C.g200}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:C.g800 }}>{cu?.name || "—"}</span>
                      <span style={{ fontSize:9, color:C.g400 }}>{fmtDateTime(c.ts)}</span>
                    </div>
                    <div style={{ fontSize:12, color:C.g700 }}>{c.text}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...inp, flex:1 }} value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="أضف تعليقاً..." onKeyDown={e => { if (e.key === "Enter" && newComment.trim()) { addComment(task.id, newComment); setNewComment(""); setViewTask({...task, comments:[...task.comments, { userId:user.id, text:newComment, ts:new Date().toISOString() }]}); } }}/>
            <button onClick={() => { if (newComment.trim()) { addComment(task.id, newComment); setNewComment(""); setViewTask({...task, comments:[...task.comments, { userId:user.id, text:newComment, ts:new Date().toISOString() }]}); } }} style={{ ...btnP, padding:"8px 16px" }}><Icon.Send/></button>
          </div>
        </Modal>
      );
    };

    const statCounts = {
      new: data.tasks.filter(t => isManager || t.assignedTo === user.id).filter(t => t.status === "new").length,
      in_progress: data.tasks.filter(t => isManager || t.assignedTo === user.id).filter(t => t.status === "in_progress").length,
      completed: data.tasks.filter(t => isManager || t.assignedTo === user.id).filter(t => t.status === "completed").length,
    };

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>📋 {isManager ? "إدارة المهام" : "مهامي"}</h2>
          {isManager && <button style={btnP} onClick={() => setShowForm(true)}><Icon.Plus/> مهمة جديدة</button>}
        </div>

        {/* إحصائيات سريعة */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(4, 1fr)", gap:10, marginBottom:18 }}>
          {[
            { label:"جديدة", count:statCounts.new, color:"#3B82F6", bg:"#EFF6FF" },
            { label:"قيد التنفيذ", count:statCounts.in_progress, color:"#F59E0B", bg:"#FFFBEB" },
            { label:"مكتملة", count:statCounts.completed, color:"#10B981", bg:"#ECFDF5" },
          ].map((s, i) => (
            <div key={i} style={{ background:s.bg, borderRadius:12, padding:"12px 14px", textAlign:"center", border:`1px solid ${s.color}20` }}>
              <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.count}</div>
              <div style={{ fontSize:11, fontWeight:600, color:s.color }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* فلتر */}
        <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
          {[{ id:"all", label:"الكل" }, ...TASK_STATUSES].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)} style={{
              padding:"5px 14px", borderRadius:8, border:"none", fontSize:12, fontWeight:600, cursor:"pointer",
              background: filter === s.id ? C.brand : C.g100, color: filter === s.id ? C.white : C.g600
            }}>{s.label || s.id}</button>
          ))}
        </div>

        {/* قائمة المهام */}
        <div style={{ display:"grid", gap:10 }}>
          {myTasks.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:C.g400, fontSize:13 }}>لا توجد مهام</div>
          ) : myTasks.map(t => {
            const assignee = getUser(t.assignedTo);
            const si = getStatusInfo(t.status);
            const pi = getPrioInfo(t.priority);
            const overdue = t.status !== "completed" && t.status !== "cancelled" && new Date(t.dueDate) < new Date();
            return (
              <div key={t.id} onClick={() => setViewTask(t)} style={{
                background:C.white, borderRadius:12, padding:"14px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
                border:`1px solid ${C.g200}`, borderRight:`4px solid ${si.color}`, cursor:"pointer", transition:"all .15s"
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:C.g900 }}>{t.title}</span>
                      <span style={{ padding:"1px 7px", borderRadius:5, fontSize:10, fontWeight:600, background:pi.bg, color:pi.color }}>{pi.icon} {pi.label}</span>
                    </div>
                    {t.desc && <div style={{ fontSize:12, color:C.g500, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.desc}</div>}
                  </div>
                  <span style={{ padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:600, background:si.bg, color:si.color, flexShrink:0 }}>{si.icon} {si.label}</span>
                </div>
                <div style={{ display:"flex", gap:14, fontSize:11, color:C.g500, flexWrap:"wrap" }}>
                  <span>👤 {assignee?.name}</span>
                  <span style={{ color: overdue ? C.err : C.g500 }}>📅 {fmtDate(t.dueDate)} {overdue ? "⚠️" : ""}</span>
                  {t.comments.length > 0 && <span>💬 {t.comments.length}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {showForm && <TaskForm/>}
        {viewTask && <TaskDetail task={viewTask}/>}
      </div>
    );
  };

  // ─── عرض الصفحة ───
  const renderPage = () => {
    switch(page) {
      case "dashboard": return <Dashboard/>;
      case "appointments": return <Appointments/>;
      case "tasks": return <Tasks/>;
      case "clients": return <Clients/>;
      case "products": return <ProductsPage/>;
      case "inventory": return <Inventory/>;
      case "custody": return <Custody/>;
      case "contracts": return <Contracts/>;
      case "reports": return <Reports/>;
      case "finance": return <Finance/>;
      case "users": return <Users/>;
      case "auditlog": return <AuditLog/>;
      default: return <Dashboard/>;
    }
  };

  // ═══════════════════════
  //  التخطيط الرئيسي
  // ═══════════════════════
  return (
    <div dir="rtl" style={{ display:"flex", minHeight:"100vh", fontFamily:"'Tajawal', sans-serif", background:C.g100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
        * { font-family:'Tajawal', sans-serif; box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:${C.g300}; border-radius:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        select { appearance:auto; }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes slideRight { from { transform:translateX(16px); opacity:0 } to { transform:translateX(0); opacity:1 } }
        button:hover { filter:brightness(0.95); }
        input:focus, select:focus, textarea:focus { border-color:${C.brand}; box-shadow:0 0 0 3px ${C.brand}15; }
      `}</style>

      {/* أوفرلاي الجوال */}
      {isMobile && sideOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:998 }} onClick={() => setSideOpen(false)}/>
      )}

      {/* ═══ الشريط الجانبي ═══ */}
      <aside style={{
        width: sideOpen ? 240 : 0,
        position: isMobile ? "fixed" : "relative",
        ...(isMobile ? { top:0, right:0, height:"100vh", zIndex:999 } : {}),
        background:`linear-gradient(180deg, ${C.brandDeep} 0%, #062e44 100%)`,
        color:C.white, transition:"width .3s cubic-bezier(.4,0,.2,1)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow: sideOpen ? "4px 0 20px rgba(0,0,0,0.15)" : "none", flexShrink:0
      }}>
        {/* الشعار */}
        <div style={{
          padding:"20px 16px", display:"flex", alignItems:"center", gap:12,
          borderBottom:"1px solid rgba(255,255,255,0.07)", minHeight:66
        }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:`linear-gradient(135deg, ${C.brand}, ${C.brandLight})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 4px 12px ${C.brand}44`
          }}>
            <Icon.Droplet s={18} style={{ color:C.white }}/>
          </div>
          <div style={{ overflow:"hidden", whiteSpace:"nowrap" }}>
            <div style={{ fontSize:15, fontWeight:800 }}>نقاء المتحدة</div>
            <div style={{ fontSize:9, opacity:0.5 }}>نظام إدارة الصيانة</div>
          </div>
        </div>

        {/* القائمة */}
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto", overflowX:"hidden" }}>
          {pages.map(p => {
            const active = page === p.id;
            return (
              <button key={p.id} onClick={() => goPage(p.id)} style={{
                display:"flex", alignItems:"center", gap:10,
                width:"100%", padding:"9px 12px",
                borderRadius:10, border:"none", cursor:"pointer",
                marginBottom:2, transition:"all .15s",
                background: active ? "rgba(255,255,255,0.12)" : "transparent",
                color: active ? C.white : "rgba(255,255,255,0.55)",
                fontSize:13, fontWeight: active ? 700 : 500,
              }}>
                <p.icon style={{ flexShrink:0 }}/>
                <span style={{ overflow:"hidden", whiteSpace:"nowrap" }}>{p.label}</span>
              </button>
            );
          })}
        </nav>

        {/* المستخدم + خروج */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", padding:"10px 8px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", marginBottom:6 }}>
            <div style={{
              width:30, height:30, borderRadius:8, flexShrink:0,
              background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, fontWeight:700
            }}>{user.name.charAt(0)}</div>
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:11, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name}</div>
              <div style={{ fontSize:9, opacity:0.5 }}>{roleName(user.role)}</div>
            </div>
          </div>
          <button onClick={() => { setUser(null); setPage("dashboard"); }} style={{
            width:"100%", padding:"7px", borderRadius:8, border:"none",
            background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:12
          }}><Icon.Logout s={16}/> تسجيل خروج</button>
        </div>
      </aside>

      {/* ═══ المحتوى الرئيسي ═══ */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* الشريط العلوي */}
        <header style={{
          background:C.white, padding: isMobile ? "0 12px" : "0 20px", height:56,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderBottom:`1px solid ${C.g200}`, flexShrink:0,
          boxShadow:"0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => setSideOpen(!sideOpen)} style={{
              width:36, height:36, borderRadius:10, border:`1px solid ${C.g200}`,
              background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.g500
            }}><Icon.Menu/></button>
            {(user.role === "owner" || user.role === "general_manager") && (
              <select style={{
                ...inp, width: isMobile ? 130 : 170, padding:"6px 10px", fontSize:12,
                background:C.brandBg, border:`1.5px solid ${C.brandPale}`, color:C.brandDark, fontWeight:600
              }} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
                <option value="all">🏙️ جميع المدن</option>
                {CITIES.map(c => <option key={c} value={c}>📍 {c}</option>)}
              </select>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowNotifs(!showNotifs)} style={{
                width:36, height:36, borderRadius:10, border:`1px solid ${C.g200}`,
                background:C.white, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                color:C.g500, position:"relative"
              }}>
                <Icon.Bell/>
                {unread > 0 && (
                  <span style={{
                    position:"absolute", top:-3, right:-3, width:16, height:16, borderRadius:"50%",
                    background:C.err, color:C.white, fontSize:9, fontWeight:700,
                    display:"flex", alignItems:"center", justifyContent:"center"
                  }}>{unread}</span>
                )}
              </button>
              {showNotifs && (
                <div style={{
                  position:"absolute", top:42, left:0, width: isMobile ? 280 : 320, maxHeight:360,
                  background:C.white, borderRadius:12, boxShadow:"0 10px 40px rgba(0,0,0,0.15)",
                  border:`1px solid ${C.g200}`, zIndex:100, overflow:"auto"
                }}>
                  <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.g100}`, fontWeight:700, fontSize:13 }}>🔔 الإشعارات</div>
                  {notifs.length === 0 ? (
                    <div style={{ padding:20, textAlign:"center", color:C.g400, fontSize:12 }}>لا توجد</div>
                  ) : notifs.slice(0,10).map(n => (
                    <div key={n.id} style={{ padding:"8px 14px", borderBottom:`1px solid ${C.g50}`, fontSize:12, color:C.g700 }}>
                      {n.msg}
                      <div style={{ fontSize:9, color:C.g400, marginTop:2 }}>{fmtDateTime(n.ts)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* محتوى الصفحة */}
        <div style={{ flex:1, padding: isMobile ? "12px 12px 80px" : 22, overflowY:"auto" }} onClick={() => showNotifs && setShowNotifs(false)}>
          <div key={page} style={{ animation:"fadeIn .2s" }}>
            {renderPage()}
          </div>
        </div>
      </main>

      {/* ═══ شريط التنقل السفلي للجوال ═══ */}
      {isMobile && (
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:997,
          background:C.white, borderTop:`1px solid ${C.g200}`,
          display:"flex", justifyContent:"space-around", alignItems:"center",
          height:60, padding:"0 4px",
          boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"
        }}>
          {[
            { id:"dashboard", label:"الرئيسية", emoji:"🏠" },
            { id:"appointments", label:"المواعيد", emoji:"📅" },
            { id:"clients", label:"العملاء", emoji:"👤" },
            { id:"inventory", label:"المخزون", emoji:"📦" },
            { id:"more", label:"المزيد", emoji:"☰" },
          ].map(item => {
            if (item.id === "more") {
              return (
                <button key="more" onClick={() => setSideOpen(true)} style={{
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  gap:2, border:"none", background:"transparent", cursor:"pointer",
                  padding:"6px 0", minWidth:56, color:C.g400, fontSize:10
                }}>
                  <span style={{ fontSize:20, lineHeight:1 }}>{item.emoji}</span>
                  <span style={{ fontWeight:500 }}>{item.label}</span>
                </button>
              );
            }
            const isActive = page === item.id;
            return (
              <button key={item.id} onClick={() => goPage(item.id)} style={{
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:2, border:"none", background:"transparent", cursor:"pointer",
                padding:"6px 0", minWidth:56,
                color: isActive ? C.brand : C.g400, fontSize:10,
                position:"relative"
              }}>
                {isActive && <div style={{
                  position:"absolute", top:-1, width:24, height:3, borderRadius:2,
                  background:C.brand
                }}/>}
                <span style={{ fontSize:20, lineHeight:1 }}>{item.emoji}</span>
                <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* المودالات */}
      {modal?.type === "appt" && <ApptModal appt={modal.data}/>}
      {modal?.type === "client" && <ClientModal client={modal.data}/>}
    </div>
  );
}

// ═══════════════════════
//  صفحة تسجيل الدخول
// ═══════════════════════
function LoginPage({ data, onLogin, supabase }) {
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!data) return;
    setError("");
    setLoading(true);
    try {
      // تسجيل الدخول عبر Supabase إذا متاح
      if (supabase) {
        const { data: rows, error: err } = await supabase
          .from('users')
          .select('*')
          .eq('phone', phone)
          .eq('password', pass)
          .eq('active', true)
          .single();
        if (!err && rows) {
          const u = {
            id: rows.id, name: rows.name, phone: rows.phone, pass: rows.password,
            role: rows.role, city: rows.city, permissions: rows.permissions || [], active: rows.active
          };
          onLogin(u);
          return;
        }
      }
      // fallback على البيانات المحلية
      const u = data.users.find(u => u.phone === phone && u.pass === pass);
      if (u) { onLogin(u); }
      else { setError("رقم الجوال أو كلمة المرور غير صحيحة"); }
    } catch (e) {
      const u = data.users.find(u => u.phone === phone && u.pass === pass);
      if (u) { onLogin(u); }
      else { setError("رقم الجوال أو كلمة المرور غير صحيحة"); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(135deg, ${C.brandDeep} 0%, #062e44 50%, ${C.brandDark} 100%)`,
      fontFamily:"'Tajawal', sans-serif", position:"relative", overflow:"hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
        * { font-family:'Tajawal', sans-serif; box-sizing:border-box; }
        @keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
        @keyframes fadeUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        input:focus { border-color:${C.brand}; box-shadow:0 0 0 3px ${C.brand}25; }
      `}</style>

      {/* خلفية زخرفية */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        {[...Array(6)].map((_,i) => (
          <div key={i} style={{
            position:"absolute", borderRadius:"50%",
            background:`radial-gradient(circle, ${C.brand}15, transparent 70%)`,
            width: 200 + i*100, height: 200 + i*100,
            top: `${10 + i*12}%`, left: `${5 + i*15}%`,
            animation:`float ${4 + i}s ease-in-out infinite`, animationDelay:`${i*0.5}s`
          }}/>
        ))}
      </div>

      <div style={{
        background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
        borderRadius:24, padding:"32px 24px", width:400, maxWidth:"92vw",
        boxShadow:"0 30px 80px rgba(0,0,0,0.25)", animation:"fadeUp .5s ease-out",
        position:"relative", zIndex:1
      }}>
        {/* الشعار */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            width:64, height:64, borderRadius:20, margin:"0 auto 16px",
            background:`linear-gradient(135deg, ${C.brand}, ${C.brandLight})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 8px 24px ${C.brand}33`
          }}>
            <Icon.Droplet s={32} style={{ color:C.white }}/>
          </div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.g900 }}>نقاء المتحدة</h1>
          <p style={{ margin:"6px 0 0", fontSize:13, color:C.g500 }}>نظام إدارة مواعيد الصيانة</p>
        </div>

        {/* النموذج */}
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>رقم الجوال</label>
          <input type="tel" placeholder="05XXXXXXXX" style={inp} value={phone}
            onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>كلمة المرور</label>
          <input type="password" placeholder="••••••" style={inp} value={pass}
            onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()}/>
        </div>

        {error && (
          <div style={{ padding:"10px 14px", borderRadius:10, background:"#FEF2F2", color:C.err, fontSize:13, fontWeight:600, marginBottom:16, textAlign:"center" }}>
            {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          ...btnP, width:"100%", justifyContent:"center", padding:"12px",
          fontSize:15, opacity: loading ? 0.7 : 1
        }}>
          {loading ? "جاري الدخول..." : "تسجيل الدخول"}
        </button>

        {/* حسابات تجريبية */}
        <div style={{ marginTop:28, padding:"16px", background:C.g50, borderRadius:14, border:`1px solid ${C.g200}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.g700, marginBottom:10 }}>🔑 حسابات تجريبية:</div>
          <div style={{ display:"grid", gap:6 }}>
            {[
              { label:"المالك", phone:"0501234567", pass:"owner" },
              { label:"مدير عام", phone:"0509876543", pass:"gm" },
              { label:"مدير فرع", phone:"0551112222", pass:"bm" },
              { label:"خدمة عملاء", phone:"0553334444", pass:"cs" },
              { label:"فني", phone:"0555556666", pass:"tech1" },
            ].map(acc => (
              <button key={acc.pass} onClick={() => { setPhone(acc.phone); setPass(acc.pass); }} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"7px 12px", borderRadius:8, border:`1px solid ${C.g200}`,
                background:C.white, cursor:"pointer", fontSize:12, color:C.g700,
                transition:"all .15s", width:"100%"
              }}>
                <span style={{ fontWeight:600 }}>{acc.label}</span>
                <span style={{ color:C.g400, direction:"ltr" }}>{acc.phone}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
