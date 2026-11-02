import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

const DATA_FILE = path.join(__dirname, 'data.json');

const initialData = {
  users: [
    {
      id: 'usr_admin',
      name: 'أحمد الكاشا (مدير النظام)',
      email: 'admin@akasha.ai',
      accessCode: 'admin123',
      role: 'admin',
      company: 'AKASHA AI Corp',
      phone: '+966 50 000 0001',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      createdAt: '2026-01-10T08:00:00Z'
    },
    {
      id: 'usr_client_1',
      name: 'شركة النور التقنية',
      email: 'client@akasha.ai',
      accessCode: 'noor2026',
      role: 'client',
      company: 'Al Noor Tech Solutions',
      phone: '+966 55 123 4567',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      createdAt: '2026-03-15T10:00:00Z'
    },
    {
      id: 'usr_client_2',
      name: 'مؤسسة المستقبل الذكي',
      email: 'tech@future.sa',
      accessCode: 'future2026',
      role: 'client',
      company: 'Future Smart Est.',
      phone: '+966 54 987 6543',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      createdAt: '2026-05-20T12:00:00Z'
    },
    {
      id: 'usr_client_3',
      name: 'مجموعة الرواد الطبية',
      email: 'it@alruwad-med.com',
      accessCode: 'med2026',
      role: 'client',
      company: 'Al Ruwad Medical Group',
      phone: '+966 56 321 8899',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      createdAt: '2026-08-01T09:30:00Z'
    }
  ],
  systems: [
    {
      id: 'sys_1',
      name: 'Akasha Enterprise ERP Suite',
      code: 'AK-ERP-900',
      description: 'نظام إدارة الموارد المؤسسية والمالية الشامل للشركات والمصانع مع محرك تحليلات الذكاء الاصطناعي والتقارير الضريبية الفورية.',
      currentVersion: 'v3.5.2',
      lastUpdateDate: '2026-10-28',
      status: 'active',
      clientId: 'usr_client_1',
      icon: 'Building2',
      downloadUrl: '/api/download/up_1',
      requiresUninstallOld: false,
      customUpdateInstructions: 'قم بتحميل ملف التثبيت الجديد وتشغيله مباشرة فوق الإصدار الحالي دون حذف البرنامج القديم. سيقوم المثبت الذكي بترقية ملفات النظام تلقائياً.',
      backupInstructions: 'يقوم النظام بأخذ نسخة احتياطية تلقائية في المسار C:\\AkashaERP\\Backups قبل بدء أي عملية تحديث.'
    },
    {
      id: 'sys_2',
      name: 'Akasha AI Customer Support Bot',
      code: 'AK-BOT-400',
      description: 'مساعد خدمة العملاء الذكي متعدد اللغات المرتبط بالواتساب والمنصات السحابية مع لوحة تحكم محلية لسطح المكتب.',
      currentVersion: 'v2.1.0',
      lastUpdateDate: '2026-10-15',
      status: 'active',
      clientId: 'usr_client_1',
      icon: 'Bot',
      downloadUrl: '/api/download/up_3',
      requiresUninstallOld: false,
      customUpdateInstructions: 'أغلق تطبيق سطح المكتب من شريط المهام السفلي (System Tray) ثم شغّل ملف التحديث الجديد بصيغة EXE.',
      backupInstructions: 'جميع قوالب الردود وسجلات المحادثات محفوظة سحابياً ومحلياً في مجلد AppData\\Local\\AkashaBot ولا تتأثر بالتحديث.'
    },
    {
      id: 'sys_3',
      name: 'Akasha Medical AI Diagnostic',
      code: 'AK-MED-100',
      description: 'نظام التشخيص الطبي المساعد بالرؤية الحاسوبية والذكاء الاصطناعي لتحليل صور الأشعة المقطعية والرنين المغناطيسي.',
      currentVersion: 'v4.0.1',
      lastUpdateDate: '2026-11-01',
      status: 'active',
      clientId: 'usr_client_2',
      icon: 'Stethoscope',
      downloadUrl: '/api/download/up_2',
      requiresUninstallOld: true,
      customUpdateInstructions: 'نظراً لتحديث محرك المعالجة الرسومية في الإصدار v4.0+، يُرجى إيقاف خدمة AkashaMedService أو إزالة الإصدار v3 القديم قبل تثبيت الإصدار الجديد.',
      backupInstructions: 'تأكد من تصدير إعدادات DICOM المحلية من قائمة الإعدادات -> نسخ احتياطي قبل الترقية.'
    },
    {
      id: 'sys_4',
      name: 'Akasha Smart Logistics & Fleet AI',
      code: 'AK-LOG-750',
      description: 'منظومة إدارة الأسطول وسلاسل الإمداد الذكية مع تتبع المسارات اللحظي وتوقع الأعطال.',
      currentVersion: 'v1.8.0',
      lastUpdateDate: '2026-10-22',
      status: 'active',
      clientId: 'usr_client_3',
      icon: 'Cpu',
      downloadUrl: '/api/download/up_4',
      requiresUninstallOld: false,
      customUpdateInstructions: 'شغّل حزمة التحديث مباشرة واضغط على زر Upgrade عند ظهور معالج التثبيت.',
      backupInstructions: 'بيانات الخرائط والمسارات محفوظة في قاعدة البيانات المشفرة وتبقى آمنة تماماً أثناء التحديث.'
    }
  ],
  updates: [
    {
      id: 'up_1',
      systemId: 'sys_1',
      systemName: 'Akasha Enterprise ERP Suite',
      version: 'v3.5.2',
      releaseDate: '2026-10-28',
      description: 'تحديث أمني وتحسينات كبيرة على أداء التقارير المالية والربط المباشر مع هيئة الزكاة والضريبة والجمارك (الفاتورة الإلكترونية المرحلة الثانية).',
      features: [
        'إضافة تقارير ضريبية فورية متوافقة مع المرحلة الثانية للفوترة الإلكترونية',
        'تسريع استعلامات قواعد البيانات الضخمة بنسبة 45%',
        'لوحة مؤشرات مالية تفاعلية جديدة للمديرين التنفيذيين'
      ],
      bugFixes: [
        'إصلاح مشكلة بطء تصدير كشوف الحسابات التي تتجاوز 10,000 قيد',
        'حل خطأ مزامنة أسعار العملات الأجنبية في نهاية اليوم المالي'
      ],
      fileSize: '145 MB',
      fileType: 'Windows Installer (.exe)',
      fileName: 'Akasha-ERP-Suite-v3.5.2-Setup.exe',
      checksum: 'SHA256: 8f4b2e91c7a60d55e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
      downloadUrl: '/api/download/up_1',
      targetClientIds: ['usr_client_1']
    },
    {
      id: 'up_3',
      systemId: 'sys_2',
      systemName: 'Akasha AI Customer Support Bot',
      version: 'v2.1.0',
      releaseDate: '2026-10-15',
      description: 'دعم الفهم الصوتي باللهجات العربية المختلفة وتحسين سرعة الاستجابة الآلية للعملاء.',
      features: [
        'تحويل الرسائل الصوتية إلى نصوص والرد عليها آلياً بدقة 98%',
        'ربط مباشر مع نظام التذاكر الداخلي وإشعارات سطح المكتب',
        'إضافة قوالب ردود ذكية قابلة للتخصيص'
      ],
      bugFixes: [
        'معالجة انقطاع الاتصال المؤقت عند ضعف شبكة الإنترنت',
        'إصلاح عرض الإشعارات المنبثقة على شاشات 4K'
      ],
      fileSize: '88 MB',
      fileType: 'Windows Installer (.exe)',
      fileName: 'Akasha-SupportBot-v2.1.0-Setup.exe',
      checksum: 'SHA256: 3c9d1a77b5e20f11a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6',
      downloadUrl: '/api/download/up_3',
      targetClientIds: ['usr_client_1']
    },
    {
      id: 'up_2',
      systemId: 'sys_3',
      systemName: 'Akasha Medical AI Diagnostic',
      version: 'v4.0.1',
      releaseDate: '2026-11-01',
      description: 'إطلاق الجيل الرابع من نموذج الذكاء الاصطناعي الطبي لتحليل الأشعة المقطعية بدقة متناهية وسرعة معالجة فائقة.',
      features: [
        'دعم تحليل صور الأشعة المقطعية CT الثلاثية الأبعاد بوقت حقيقي',
        'تكامل كامل مع ملفات المرضى الإلكترونية (EMR / HL7)',
        'توليد مسودة التقرير الطبي تلقائياً باللغتين العربية والإنجليزية'
      ],
      bugFixes: [
        'إصلاح خطأ تدريج التباين اللوني في صور الأنسجة الدقيقة',
        'تحسين استهلاك الذاكرة العشوائية أثناء فتح ملفات DICOM متعددة'
      ],
      fileSize: '320 MB',
      fileType: 'Windows Installer (.exe)',
      fileName: 'Akasha-MedAI-v4.0.1-Setup.exe',
      checksum: 'SHA256: 7a1e5b88d4c39f22e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
      downloadUrl: '/api/download/up_2',
      targetClientIds: ['usr_client_2']
    },
    {
      id: 'up_4',
      systemId: 'sys_4',
      systemName: 'Akasha Smart Logistics & Fleet AI',
      version: 'v1.8.0',
      releaseDate: '2026-10-22',
      description: 'تحديث خوارزميات توجيه المركبات وتقليل استهلاك الوقود مع تنبيهات الصيانة التنبؤية.',
      features: [
        'خريطة حرارية لحركة الأسطول في الوقت الفعلي',
        'تنبيهات مبكرة لأعطال المحركات قبل حدوثها'
      ],
      bugFixes: [
        'إصلاح مزامنة إحداثيات GPS في المناطق ضعيفة التغطية'
      ],
      fileSize: '112 MB',
      fileType: 'Windows Installer (.exe)',
      fileName: 'Akasha-LogisticsAI-v1.8.0-Setup.exe',
      checksum: 'SHA256: 5d2c8f44a1b30e99c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5',
      downloadUrl: '/api/download/up_4',
      targetClientIds: ['usr_client_3']
    }
  ],
  notifications: [
    {
      id: 'notif_1',
      title: 'تحديث جديد متاح: Akasha Enterprise ERP Suite v3.5.2',
      message: 'تم إصدار التحديث الجديد لنظام ERP الخاص بكم مع تحسينات أمنية وتقارير الفاتورة الإلكترونية. يمكنك التحميل الآن.',
      type: 'update',
      date: '2026-10-28',
      read: false,
      clientId: 'usr_client_1'
    },
    {
      id: 'notif_2',
      title: 'صيانة مجدولة للخوادم السحابية',
      message: 'ستتم صيانة دورية لخوادم البنية التحتية يوم الجمعة القادم الساعة 2:00 صباحاً ولمدة 45 دقيقة لتحسين الأداء.',
      type: 'maintenance',
      date: '2026-10-30',
      read: false,
      clientId: 'all'
    },
    {
      id: 'notif_3',
      title: 'تحديث جديد متاح: Akasha Medical AI Diagnostic v4.0.1',
      message: 'إطلاق الإصدار 4.0.1 المخصص لمؤسستكم مع دعم الأشعة ثلاثية الأبعاد وتحليل أسرع.',
      type: 'update',
      date: '2026-11-01',
      read: false,
      clientId: 'usr_client_2'
    }
  ],
  tickets: [
    {
      id: 'tkt_101',
      clientId: 'usr_client_1',
      clientName: 'شركة النور التقنية',
      systemId: 'sys_1',
      systemName: 'Akasha Enterprise ERP Suite',
      subject: 'استفسار حول ربط شهادة التشفير الرقمية للفاتورة الإلكترونية',
      description: 'نحتاج إلى مساعدة في خطوة تفعيل شهادة التشفير الرقمية (CSID) بعد الترقية إلى الإصدار v3.5.2.',
      attachmentUrl: '',
      priority: 'high',
      status: 'in_progress',
      createdAt: '2026-10-29T10:30:00Z',
      messages: [
        {
          id: 'msg_1',
          sender: 'client',
          senderName: 'شركة النور التقنية',
          text: 'نحتاج إلى مساعدة في خطوة تفعيل شهادة التشفير الرقمية (CSID) بعد الترقية إلى الإصدار v3.5.2.',
          time: '2026-10-29 10:30 AM'
        },
        {
          id: 'msg_2',
          sender: 'admin',
          senderName: 'فريق الدعم الفني - AKASHA AI',
          text: 'مرحباً بكم. يمكنكم الدخول إلى إعدادات النظام -> الربط الضريبي -> لصق رمز OTP وسيتم توليد الشهادة تلقائياً. نحن معكم لأي استفسار.',
          time: '2026-10-29 11:15 AM'
        }
      ]
    }
  ],
  installGuides: [
    {
      id: 'guide_windows',
      title: 'دليل تثبيت وتحديث تطبيقات Windows الرسمي',
      systemCode: 'general_windows',
      steps: [
        {
          stepNumber: 1,
          title: 'الخطوة 1: اضغط على زر تحميل التطبيق',
          description: 'من داخل بوابة العملاء، توجه إلى النظام الخاص بك واضغط على زر "تحميل ملف التثبيت (EXE)" لتحميل أحدث نسخة مخصصة لحسابك.',
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80'
        },
        {
          stepNumber: 2,
          title: 'الخطوة 2: انتظر اكتمال تحميل ملف التثبيت بصيغة EXE',
          description: 'سيظهر شريط التحميل في متصفحك. انتظر حتى يكتمل تنزيل الحزمة بالكامل وتأكد من عدم إغلاق المتصفح أثناء التحميل.',
          imageUrl: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600&auto=format&fit=crop&q=80'
        },
        {
          stepNumber: 3,
          title: 'الخطوة 3: افتح مجلد التنزيلات (Downloads)',
          description: 'افتح مستكشف الملفات في نظام Windows وتوجه إلى مجلد Downloads (التنزيلات)، أو اضغط على Ctrl + J في المتصفح للوصول للملف.',
          imageUrl: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=600&auto=format&fit=crop&q=80'
        },
        {
          stepNumber: 4,
          title: 'الخطوة 4: اضغط مرتين على ملف التثبيت',
          description: 'انقر نقراً مزدوجاً (Double Click) بزر الفأرة الأيسر على ملف التثبيت الذي يحمل اسم نظام AKASHA AI لبدء تشغيل معالج التثبيت.',
          imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80'
        },
        {
          stepNumber: 5,
          title: 'الخطوة 5: التحقق من مصدر التطبيق في نافذة Windows Security',
          description: 'إذا ظهرت نافذة Windows Defender SmartScreen، اضغط على "More info" (مزيد من المعلومات) وتأكد أولاً من أن اسم الناشر المعتمد هو AKASHA AI CORP أو أن البصمة الرقمية (SHA-256) مطابقة للبصمة المعروضة في حسابك. لا تقم بتجاوز تحذيرات الأمان لأي برامج مجهولة المصدر.',
          imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80'
        },
        {
          stepNumber: 6,
          title: 'الخطوة 6: اتبع خطوات التثبيت',
          description: 'اختر لغة المعالج، ثم اضغط على "التالي" (Next)، وحدد مسار التثبيت الافتراضي ثم اضغط على "تثبيت" (Install) وانتظر اكتمال نسخ الملفات.',
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80'
        },
        {
          stepNumber: 7,
          title: 'الخطوة 7: بعد اكتمال التثبيت افتح التطبيق من سطح المكتب',
          description: 'اضغط على "إنهاء" (Finish)، وستجد أيقونة برنامج AKASHA AI جاهزة على سطح المكتب وفي قائمة ابدأ (Start Menu).',
          imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80'
        },
        {
          stepNumber: 8,
          title: 'الخطوة 8: أدخل بيانات الدخول لتفعيل النظام',
          description: 'عند تشغيل البرنامج لأول مرة، أدخل البريد الإلكتروني وكود التفعيل أو كلمة المرور الخاصة بحساب شركتك لدى AKASHA AI.',
          imageUrl: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?w=600&auto=format&fit=crop&q=80'
        }
      ],
      updateNotes: 'يقوم نظام التحديث الذكي في AKASHA AI بحفظ قواعد البيانات والإعدادات تلقائياً قبل أي ترقية. يرجى مراجعة بطاقة كل نظام لمعرفة ما إذا كان يتطلب الترقية المباشرة أو إزالة النسخة السابقة.'
    }
  ],
  auditLogs: [
    {
      id: 'log_1',
      action: 'نشر تحديث مخصص',
      details: 'تم إصدار Akasha Enterprise ERP Suite v3.5.2 وتخصيصه لشركة النور التقنية',
      adminName: 'أحمد الكاشا',
      timestamp: '2026-10-28T14:20:00Z'
    },
    {
      id: 'log_2',
      action: 'نشر تحديث مخصص',
      details: 'تم إصدار Akasha Medical AI Diagnostic v4.0.1 وتخصيصه لمؤسسة المستقبل الذكي',
      adminName: 'أحمد الكاشا',
      timestamp: '2026-11-01T09:15:00Z'
    }
  ]
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Ensure installGuides have imageUrl and systems have custom instructions
      if (parsed.installGuides?.[0]?.steps && !parsed.installGuides[0].steps[0].imageUrl) {
        parsed.installGuides = initialData.installGuides;
      }
      if (parsed.systems?.length && parsed.systems[0].customUpdateInstructions === undefined) {
        parsed.systems = initialData.systems;
      }
      if (parsed.updates?.length && parsed.updates[0].checksum === undefined) {
        parsed.updates = initialData.updates;
      }
      if (parsed.users?.length && parsed.users[0].accessCode === undefined) {
        parsed.users = initialData.users;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error reading data.json:', e);
  }
  saveData(initialData);
  return initialData;
}

function saveData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing data.json:', e);
  }
}

let db = loadData();

// Auth endpoint
app.post('/api/auth/login', (req, res) => {
  db = loadData();
  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const user = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(401).json({ error: 'البريد الإلكتروني غير مسجل في النظام' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'هذا الحساب موقوف مؤقتاً، يرجى التواصل مع الإدارة' });
  }
  // Verify accessCode if provided and not default mask
  if (password && password !== '••••••••' && user.accessCode && password !== user.accessCode) {
    return res.status(401).json({ error: 'كلمة المرور / كود الدخول غير صحيح' });
  }
  res.json({ success: true, user });
});

// Get all data
app.get('/api/data', (req, res) => {
  db = loadData();
  res.json(db);
});

// Download installer package endpoint
app.get('/api/download/:updateId', (req, res) => {
  db = loadData();
  const { updateId } = req.params;
  const update = db.updates.find((u: any) => u.id === updateId);
  const fileName = update?.fileName || `Akasha-AI-Installer-${update?.version || 'Setup'}.txt`;
  const manifestContent = [
    `===================================================================`,
    `AKASHA AI CORP - OFFICIAL SOFTWARE INSTALLATION PACKAGE`,
    `===================================================================`,
    `System Name    : ${update?.systemName || 'AKASHA AI System'}`,
    `Version        : ${update?.version || 'v1.0.0'}`,
    `Release Date   : ${update?.releaseDate || new Date().toISOString().split('T')[0]}`,
    `Package Type   : ${update?.fileType || 'Windows Installer (.exe)'}`,
    `Package Size   : ${update?.fileSize || '145 MB'}`,
    `Digital Sign   : Verified Publisher - AKASHA AI CORP`,
    `Integrity Hash : ${update?.checksum || 'SHA256: Verified'}`,
    `-------------------------------------------------------------------`,
    `Release Notes:`,
    `${update?.description || ''}`,
    ``,
    `New Features:`,
    ...(update?.features || []).map((f: string) => `  + ${f}`),
    ``,
    `Bug Fixes:`,
    ...(update?.bugFixes || []).map((b: string) => `  * ${b}`),
    `===================================================================`
  ].join('\r\n');

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.manifest.txt"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(manifestContent);
});

// Clients CRUD
app.post('/api/clients', (req, res) => {
  db = loadData();
  const { name, email, company, phone, accessCode, avatar, role } = req.body;
  const newClient = {
    id: 'usr_client_' + Date.now(),
    name,
    email,
    accessCode: accessCode || 'akasha2026',
    company: company || name,
    phone: phone || '',
    role: role === 'admin' ? 'admin' : 'client',
    status: 'active',
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    createdAt: new Date().toISOString()
  };
  db.users.push(newClient);
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'إضافة حساب عميل جديد',
    details: `تم إنشاء حساب العميل ${name} (${company || name}) بالبريد ${email}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, client: newClient });
});

app.put('/api/clients/:id', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const idx = db.users.findIndex((u: any) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'العميل غير موجود' });
  db.users[idx] = { ...db.users[idx], ...req.body };
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'تحديث بيانات عميل',
    details: `تم تحديث بيانات الحساب ${db.users[idx].name}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, client: db.users[idx] });
});

app.delete('/api/clients/:id', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const client = db.users.find((u: any) => u.id === id);
  db.users = db.users.filter((u: any) => u.id !== id);
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'حذف حساب عميل',
    details: `تم حذف حساب ${client?.name || id}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true });
});

// Systems CRUD
app.post('/api/systems', (req, res) => {
  db = loadData();
  const {
    name,
    code,
    description,
    currentVersion,
    clientId,
    icon,
    downloadUrl,
    status,
    requiresUninstallOld,
    customUpdateInstructions,
    backupInstructions
  } = req.body;
  const newSystem = {
    id: 'sys_' + Date.now(),
    name,
    code: code || ('AK-' + Math.floor(100 + Math.random() * 900)),
    description,
    currentVersion: currentVersion || 'v1.0.0',
    lastUpdateDate: new Date().toISOString().split('T')[0],
    status: status || 'active',
    clientId,
    icon: icon || 'Cpu',
    downloadUrl: downloadUrl || '#',
    requiresUninstallOld: Boolean(requiresUninstallOld),
    customUpdateInstructions: customUpdateInstructions || 'قم بتحميل الإصدار الجديد وتشغيله مباشرة لتحديث النظام تلقائياً.',
    backupInstructions: backupInstructions || 'يتم حفظ نسخة احتياطية من بياناتك تلقائياً قبل بدء التحديث.'
  };
  db.systems.push(newSystem);
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'إضافة نظام برمجي جديد',
    details: `تم إضافة النظام ${name} (${newSystem.code}) وربطه بالعميل`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, system: newSystem });
});

app.put('/api/systems/:id', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const idx = db.systems.findIndex((s: any) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'النظام غير موجود' });
  db.systems[idx] = { ...db.systems[idx], ...req.body };
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'تحديث إعدادات نظام',
    details: `تم تعديل النظام ${db.systems[idx].name}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, system: db.systems[idx] });
});

app.delete('/api/systems/:id', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const sys = db.systems.find((s: any) => s.id === id);
  db.systems = db.systems.filter((s: any) => s.id !== id);
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'حذف نظام برمجي',
    details: `تم حذف النظام ${sys?.name || id}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true });
});

// Updates / Releases CRUD
app.post('/api/updates', (req, res) => {
  db = loadData();
  const {
    systemId,
    version,
    description,
    features,
    bugFixes,
    fileSize,
    fileType,
    fileName,
    downloadUrl,
    targetClientIds
  } = req.body;
  const system = db.systems.find((s: any) => s.id === systemId);
  const systemName = system ? system.name : 'نظام برمجي';
  const updateId = 'up_' + Date.now();

  // If no targetClientIds explicitly provided, default to the owner client of the system
  const finalTargets = Array.isArray(targetClientIds) && targetClientIds.length > 0
    ? targetClientIds
    : (system?.clientId ? [system.clientId] : []);

  const newUpdate = {
    id: updateId,
    systemId,
    systemName,
    version,
    releaseDate: new Date().toISOString().split('T')[0],
    description,
    features: Array.isArray(features) ? features : (features ? [features] : []),
    bugFixes: Array.isArray(bugFixes) ? bugFixes : (bugFixes ? [bugFixes] : []),
    fileSize: fileSize || '120 MB',
    fileType: fileType || 'Windows Installer (.exe)',
    fileName: fileName || `${systemName.replace(/\s+/g, '-')}-${version}-Setup.exe`,
    checksum: 'SHA256: ' + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2),
    downloadUrl: downloadUrl && downloadUrl !== 'https://downloads.akasha.ai/setup.exe' ? downloadUrl : `/api/download/${updateId}`,
    targetClientIds: finalTargets
  };

  db.updates.unshift(newUpdate);

  if (system) {
    system.currentVersion = version;
    system.lastUpdateDate = new Date().toISOString().split('T')[0];
    system.downloadUrl = newUpdate.downloadUrl;
  }

  finalTargets.forEach((clientId: string) => {
    db.notifications.unshift({
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `تحديث جديد متاح: ${systemName} (${version})`,
      message: description || `تم إطلاق الإصدار ${version} المخصص لحسابكم. يمكنكم تحميله الآن من بوابة العملاء.`,
      type: 'update',
      date: new Date().toISOString().split('T')[0],
      read: false,
      clientId
    });
  });

  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'نشر إصدار وتحديث جديد',
    details: `تم نشر ${systemName} الإصدار ${version} وتخصيصه لـ (${finalTargets.length}) عميل`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });

  saveData(db);
  res.json({ success: true, update: newUpdate });
});

// Update target clients of an existing release ("ولكل حساب اعرض فقط التحديثات التي احددها له")
app.patch('/api/updates/:id/targets', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const { targetClientIds } = req.body;
  const update = db.updates.find((u: any) => u.id === id);
  if (!update) return res.status(404).json({ error: 'التحديث غير موجود' });

  update.targetClientIds = Array.isArray(targetClientIds) ? targetClientIds : [];
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'تعديل صلاحيات ظهور التحديث',
    details: `تم تحديث قائمة العملاء المستهدفين للإصدار ${update.systemName} ${update.version}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, update });
});

app.delete('/api/updates/:id', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const up = db.updates.find((u: any) => u.id === id);
  db.updates = db.updates.filter((u: any) => u.id !== id);
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'حذف إصدار',
    details: `تم حذف الإصدار ${up?.systemName || ''} ${up?.version || id}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true });
});

// Notifications CRUD
app.post('/api/notifications', (req, res) => {
  db = loadData();
  const { title, message, type, clientId } = req.body;
  const newNotif = {
    id: 'notif_' + Date.now(),
    title,
    message,
    type: type || 'update',
    date: new Date().toISOString().split('T')[0],
    read: false,
    clientId: clientId || 'all'
  };
  db.notifications.unshift(newNotif);
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'إرسال إشعار للعملاء',
    details: `تم إرسال إشعار: ${title}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, notification: newNotif });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const notif = db.notifications.find((n: any) => n.id === id);
  if (notif) {
    notif.read = true;
    saveData(db);
  }
  res.json({ success: true });
});

// Tickets endpoints
app.post('/api/tickets', (req, res) => {
  db = loadData();
  const { clientId, clientName, systemId, systemName, subject, description, priority, attachmentUrl } = req.body;
  const newTicket = {
    id: 'tkt_' + Math.floor(1000 + Math.random() * 9000),
    clientId,
    clientName: clientName || 'عميل AKASHA AI',
    systemId,
    systemName: systemName || 'النظام العام',
    subject,
    description,
    attachmentUrl: attachmentUrl || '',
    priority: priority || 'medium',
    status: 'new',
    createdAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg_' + Date.now(),
        sender: 'client',
        senderName: clientName || 'العميل',
        text: description,
        time: new Date().toLocaleString('ar-SA')
      }
    ]
  };
  db.tickets.unshift(newTicket);
  saveData(db);
  res.json({ success: true, ticket: newTicket });
});

app.post('/api/tickets/:id/messages', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const { text, sender, senderName } = req.body;
  const ticket = db.tickets.find((t: any) => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: 'التذكرة غير موجودة' });
  }

  ticket.messages.push({
    id: 'msg_' + Date.now(),
    sender: sender || 'client',
    senderName: senderName || (sender === 'admin' ? 'فريق الدعم الفني - AKASHA AI' : 'العميل'),
    text,
    time: new Date().toLocaleString('ar-SA')
  });

  if (sender === 'admin' && ticket.status === 'new') {
    ticket.status = 'in_progress';
  }

  saveData(db);
  res.json({ success: true, ticket });
});

app.patch('/api/tickets/:id/status', (req, res) => {
  db = loadData();
  const { id } = req.params;
  const { status } = req.body;
  const ticket = db.tickets.find((t: any) => t.id === id);
  if (!ticket) return res.status(404).json({ error: 'التذكرة غير موجودة' });
  ticket.status = status;
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'تحديث حالة تذكرة دعم',
    details: `تم تغيير حالة التذكرة #${id} إلى ${status}`,
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, ticket });
});

// Install Guides update (including step images replacement!)
app.put('/api/install-guides', (req, res) => {
  db = loadData();
  const { steps, updateNotes } = req.body;
  if (db.installGuides.length > 0) {
    if (steps) db.installGuides[0].steps = steps;
    if (updateNotes !== undefined) db.installGuides[0].updateNotes = updateNotes;
  } else {
    db.installGuides.push({
      id: 'guide_windows',
      title: 'دليل تثبيت وتحديث تطبيقات Windows',
      systemCode: 'general_windows',
      steps: steps || [],
      updateNotes: updateNotes || ''
    });
  }
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    action: 'تحديث دليل التثبيت والصور التوضيحية',
    details: 'تم تحديث خطوات وصور دليل تثبيت التطبيق من لوحة التحكم',
    adminName: 'مدير النظام',
    timestamp: new Date().toISOString()
  });
  saveData(db);
  res.json({ success: true, installGuide: db.installGuides[0] });
});

// Vite middleware integration in development
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true }
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
