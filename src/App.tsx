/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Cpu, Bot, Building2, Stethoscope, Download, ShieldCheck, CheckCircle2,
  AlertCircle, Clock, LifeBuoy, User, Lock, LogOut, Bell, FileText,
  Check, Plus, Search, Settings, Layers, MessageSquare, Send, Terminal,
  HelpCircle, Globe, ChevronRight, RefreshCw, ArrowRight, Shield, X,
  Sparkles, AlertTriangle, Upload, Image as ImageIcon, Trash2, Edit3,
  Eye, Key, HardDrive, CheckSquare, Square, FileCheck, Filter
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  deleteDoc,
  OperationType,
  handleFirestoreError
} from './firebase';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  // Allows Admin to preview the portal as a specific client while staying logged in as Admin
  const [previewClient, setPreviewClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'portal' | 'install' | 'support' | 'admin'>('home');
  const [publicInstallPreview, setPublicInstallPreview] = useState<boolean>(false);

  const [data, setData] = useState<any>({
    users: [],
    systems: [],
    updates: [],
    notifications: [],
    tickets: [],
    installGuides: [],
    auditLogs: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // External Login Screen States
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<any>(null);

  // Notifications & Modals
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [newClientModal, setNewClientModal] = useState(false);
  const [newSystemModal, setNewSystemModal] = useState(false);
  const [newUpdateModal, setNewUpdateModal] = useState(false);
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [newNotificationModal, setNewNotificationModal] = useState(false);
  const [adminTab, setAdminTab] = useState<'clients' | 'systems' | 'updates' | 'notifications' | 'guides' | 'tickets' | 'logs'>('updates');

  // Selected system in Install Guide for custom update instructions
  const [selectedGuideSystemId, setSelectedGuideSystemId] = useState<string>('all');

  // Installed version tracking per client in localStorage
  const [installedVersions, setInstalledVersions] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('akasha_installed_versions') || '{}');
    } catch {
      return {};
    }
  });

  // Form inputs
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    accessCode: 'akasha2026',
    role: 'client'
  });

  const [systemForm, setSystemForm] = useState({
    name: '',
    code: '',
    description: '',
    clientId: '',
    currentVersion: 'v1.0.0',
    icon: 'Building2',
    status: 'active',
    requiresUninstallOld: false,
    customUpdateInstructions: 'قم بتحميل ملف التثبيت الجديد وتشغيله مباشرة لترقية النظام تلقائياً مع حفظ كافة البيانات.',
    backupInstructions: 'يقوم النظام بأخذ نسخة احتياطية تلقائية لقاعدة البيانات قبل بدء التحديث.'
  });

  const [updateForm, setUpdateForm] = useState({
    systemId: '',
    version: '',
    description: '',
    features: '',
    bugFixes: '',
    fileSize: '148 MB',
    fileType: 'Windows Installer (.exe)',
    fileName: '',
    downloadUrl: '',
    targetClientIds: [] as string[]
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'update',
    clientId: 'all'
  });

  const [ticketForm, setTicketForm] = useState({
    systemId: '',
    subject: '',
    description: '',
    priority: 'medium',
    attachmentUrl: ''
  });

  const [replyText, setReplyText] = useState('');
  const [activeTicket, setActiveTicket] = useState<any>(null);

  // Editable install guide state for Admin
  const [editableSteps, setEditableSteps] = useState<any[]>([]);
  const [editableUpdateNotes, setEditableUpdateNotes] = useState<string>('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseAuthUser(fbUser);
    });
    return () => unsubscribe();
  }, []);

  const syncToFirestoreIfSignedIn = async (collectionName: string, docId: string, payload: any, op: OperationType = OperationType.WRITE) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, collectionName, docId), payload, { merge: true });
    } catch (error) {
      try {
        handleFirestoreError(error, op, `${collectionName}/${docId}`);
      } catch (loggedErr) {
        console.warn('Firestore sync warning:', loggedErr);
      }
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
      if (json.installGuides?.[0]) {
        setEditableSteps(json.installGuides[0].steps || []);
        setEditableUpdateNotes(json.installGuides[0].updateNotes || '');
      }
      setLoading(false);
    } catch (e) {
      console.error('Error fetching data:', e);
      setLoading(false);
    }
  };

  // Effective user (either the logged in user, or the client being previewed by Admin)
  const effectiveUser = previewClient || user;

  // Handle Google Sign-In via Firebase Auth
  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const email = (fbUser.email || '').toLowerCase();

      // Check if user exists in our portal database
      let matchedUser = data.users.find((u: any) => u.email.toLowerCase() === email);

      if (!matchedUser) {
        // If this is the bootstrapped admin email, make them admin; otherwise create a client profile
        const isSuperAdmin = email === 'abysamaldynkasht@gmail.com';
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fbUser.displayName || (isSuperAdmin ? 'المدير العام (AKASHA AI)' : 'عميل AKASHA AI'),
            email: fbUser.email,
            company: isSuperAdmin ? 'AKASHA AI Corp' : 'شركة شريكة',
            avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            role: isSuperAdmin ? 'admin' : 'client',
            accessCode: 'firebase-auth'
          })
        });
        const created = await res.json();
        matchedUser = created.client;
        await fetchData();
      }

      // Sync user profile to Firestore
      if (matchedUser) {
        await syncToFirestoreIfSignedIn('users', fbUser.uid, {
          id: fbUser.uid,
          name: matchedUser.name,
          email: matchedUser.email,
          role: matchedUser.role,
          company: matchedUser.company || 'AKASHA AI',
          createdAt: matchedUser.createdAt || new Date().toISOString()
        }, OperationType.WRITE);

        setUser(matchedUser);
        setPreviewClient(null);
        setPublicInstallPreview(false);
        setActiveTab(matchedUser.role === 'admin' ? 'admin' : 'portal');
        showToast(lang === 'ar' ? `مرحباً بك ${matchedUser.name}` : `Welcome ${matchedUser.name}`);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setLoginError(lang === 'ar' ? 'تعذر إكمال تسجيل الدخول عبر نافذة Google، يمكنك استخدام الدخول المباشر بالحسابات أدناه.' : 'Google Sign-In popup closed or blocked. You can sign in directly below.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const json = await res.json();
      if (json.success) {
        setUser(json.user);
        setPreviewClient(null);
        setPublicInstallPreview(false);
        setActiveTab(json.user.role === 'admin' ? 'admin' : 'portal');
        showToast(lang === 'ar' ? `تم تسجيل الدخول: ${json.user.name}` : `Signed in as ${json.user.name}`);
      } else {
        setLoginError(json.error || 'بيانات الدخول غير صحيحة');
      }
    } catch {
      setLoginError('حدث خطأ أثناء الاتصال بالخادم');
    }
  };

  const handleQuickLogin = (selectedUser: any) => {
    setLoginError('');
    setUser(selectedUser);
    setPreviewClient(null);
    setPublicInstallPreview(false);
    setActiveTab(selectedUser.role === 'admin' ? 'admin' : 'portal');
    showToast(lang === 'ar' ? `تم الدخول بحساب: ${selectedUser.name}` : `Signed in as: ${selectedUser.name}`);
  };

  const handleLogout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setPreviewClient(null);
    setActiveTab('home');
  };

  // Admin: Create Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientForm)
    });
    const json = await res.json();
    if (json.success) {
      await syncToFirestoreIfSignedIn('users', json.client.id, {
        id: json.client.id,
        name: json.client.name,
        email: json.client.email,
        role: json.client.role,
        company: json.client.company,
        createdAt: json.client.createdAt
      }, OperationType.CREATE);
      setNewClientModal(false);
      setClientForm({ name: '', email: '', company: '', phone: '', accessCode: 'akasha2026', role: 'client' });
      fetchData();
      showToast(lang === 'ar' ? 'تم إنشاء حساب العميل بنجاح' : 'Client account created successfully');
    }
  };

  const handleDeleteClient = async (id: string) => {
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {
        console.warn(e);
      }
    }
    fetchData();
    showToast(lang === 'ar' ? 'تم حذف حساب العميل' : 'Client deleted');
  };

  // Admin: Create System
  const handleCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemForm)
    });
    const json = await res.json();
    if (json.success) {
      await syncToFirestoreIfSignedIn('systems', json.system.id, json.system, OperationType.CREATE);
      setNewSystemModal(false);
      setSystemForm({
        name: '',
        code: '',
        description: '',
        clientId: '',
        currentVersion: 'v1.0.0',
        icon: 'Building2',
        status: 'active',
        requiresUninstallOld: false,
        customUpdateInstructions: 'قم بتحميل ملف التثبيت الجديد وتشغيله مباشرة لترقية النظام تلقائياً مع حفظ كافة البيانات.',
        backupInstructions: 'يقوم النظام بأخذ نسخة احتياطية تلقائية لقاعدة البيانات قبل بدء التحديث.'
      });
      fetchData();
      showToast(lang === 'ar' ? 'تم إضافة النظام وربطه بالعميل بنجاح' : 'System added and linked to client');
    }
  };

  const handleDeleteSystem = async (id: string) => {
    await fetch(`/api/systems/${id}`, { method: 'DELETE' });
    fetchData();
    showToast(lang === 'ar' ? 'تم حذف النظام البرمجي' : 'System deleted');
  };

  // Admin: Publish Targeted Update
  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateForm.targetClientIds.length === 0) {
      showToast(lang === 'ar' ? 'يرجى تحديد عميل واحد على الأقل ليصله هذا التحديث' : 'Please select at least one target client', 'error');
      return;
    }
    const res = await fetch('/api/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updateForm,
        features: updateForm.features.split('\n').filter(Boolean),
        bugFixes: updateForm.bugFixes.split('\n').filter(Boolean),
        targetClientIds: updateForm.targetClientIds
      })
    });
    const json = await res.json();
    if (json.success) {
      await syncToFirestoreIfSignedIn('updates', json.update.id, json.update, OperationType.CREATE);
      setNewUpdateModal(false);
      setUpdateForm({
        systemId: '',
        version: '',
        description: '',
        features: '',
        bugFixes: '',
        fileSize: '148 MB',
        fileType: 'Windows Installer (.exe)',
        fileName: '',
        downloadUrl: '',
        targetClientIds: []
      });
      fetchData();
      showToast(lang === 'ar' ? 'تم نشر الإصدار وإرسال الإشعارات للعملاء المحددين فقط' : 'Release published to selected clients');
    }
  };

  // Admin: Toggle which client can see a specific existing update ("ولكل حساب اعرض فقط التحديثات التي احددها له")
  const handleToggleUpdateClientTarget = async (update: any, clientId: string) => {
    const currentTargets: string[] = Array.isArray(update.targetClientIds) ? [...update.targetClientIds] : [];
    let updatedTargets: string[] = [];

    if (clientId === 'all') {
      updatedTargets = currentTargets.includes('all') ? [] : ['all'];
    } else {
      const withoutAll = currentTargets.filter((id) => id !== 'all');
      if (withoutAll.includes(clientId)) {
        updatedTargets = withoutAll.filter((id) => id !== clientId);
      } else {
        updatedTargets = [...withoutAll, clientId];
      }
    }

    const res = await fetch(`/api/updates/${update.id}/targets`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetClientIds: updatedTargets })
    });
    const json = await res.json();
    if (json.success) {
      await syncToFirestoreIfSignedIn('updates', update.id, json.update, OperationType.UPDATE);
      fetchData();
      showToast(lang === 'ar' ? 'تم تحديث صلاحيات عرض الإصدار للعميل بنجاح' : 'Updated client visibility for this release');
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    await fetch(`/api/updates/${id}`, { method: 'DELETE' });
    fetchData();
    showToast(lang === 'ar' ? 'تم حذف الإصدار' : 'Release deleted');
  };

  // Admin: Send Custom Notification
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationForm)
    });
    const json = await res.json();
    if (json.success) {
      await syncToFirestoreIfSignedIn('notifications', json.notification.id, json.notification, OperationType.CREATE);
      setNewNotificationModal(false);
      setNotificationForm({ title: '', message: '', type: 'update', clientId: 'all' });
      fetchData();
      showToast(lang === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent');
    }
  };

  // Admin: Save Install Guide Steps & Images
  const handleSaveInstallGuide = async () => {
    const res = await fetch('/api/install-guides', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps: editableSteps,
        updateNotes: editableUpdateNotes
      })
    });
    const json = await res.json();
    if (json.success) {
      await syncToFirestoreIfSignedIn('portal_state', 'guide_windows', json.installGuide, OperationType.UPDATE);
      fetchData();
      showToast(lang === 'ar' ? 'تم حفظ دليل التثبيت والصور التوضيحية بنجاح' : 'Installation guide & images saved');
    }
  };

  const handleStepImageUpload = (stepIndex: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const updated = [...editableSteps];
      updated[stepIndex] = { ...updated[stepIndex], imageUrl: String(reader.result) };
      setEditableSteps(updated);
    };
    reader.readAsDataURL(file);
  };

  // Client: Upload Update File in Admin Modal
  const handleUpdateFileUpload = (file: File | null) => {
    if (!file) return;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setUpdateForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileSize: file.size > 1024 * 1024 ? sizeMB : Math.round(file.size / 1024) + ' KB'
    }));
    showToast(lang === 'ar' ? `تم إرفاق ملف التحديث: ${file.name}` : `Attached installer: ${file.name}`);
  };

  // Support Tickets
  const handleTicketImageUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTicketForm((prev) => ({ ...prev, attachmentUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const sys = data.systems.find((s: any) => s.id === ticketForm.systemId);
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: effectiveUser.id,
        clientName: effectiveUser.name,
        systemId: ticketForm.systemId || 'general',
        systemName: sys ? sys.name : 'النظام العام',
        subject: ticketForm.subject,
        description: ticketForm.description,
        priority: ticketForm.priority,
        attachmentUrl: ticketForm.attachmentUrl
      })
    });
    const json = await res.json();
    if (json.success) {
      await syncToFirestoreIfSignedIn('tickets', json.ticket.id, json.ticket, OperationType.CREATE);
      setNewTicketModal(false);
      setTicketForm({ systemId: '', subject: '', description: '', priority: 'medium', attachmentUrl: '' });
      setActiveTicket(json.ticket);
      fetchData();
      showToast(lang === 'ar' ? `تم فتح تذكرة الدعم رقم #${json.ticket.id}` : `Support ticket #${json.ticket.id} created`);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    const isAdm = user?.role === 'admin' && !previewClient;
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: replyText,
        sender: isAdm ? 'admin' : 'client',
        senderName: isAdm ? 'فريق الدعم الفني - AKASHA AI' : effectiveUser.name
      })
    });
    const json = await res.json();
    if (json.success) {
      setReplyText('');
      setActiveTicket(json.ticket);
      fetchData();
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    const res = await fetch(`/api/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (json.success) {
      setActiveTicket(json.ticket);
      fetchData();
      showToast(lang === 'ar' ? 'تم تحديث حالة التذكرة' : 'Ticket status updated');
    }
  };

  const markNotificationRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    fetchData();
  };

  const markVersionInstalled = (systemId: string, version: string) => {
    const key = `${effectiveUser?.id}_${systemId}`;
    const updated = { ...installedVersions, [key]: version };
    setInstalledVersions(updated);
    localStorage.setItem('akasha_installed_versions', JSON.stringify(updated));
    showToast(lang === 'ar' ? `تم تأكيد تثبيت الإصدار ${version} بنجاح` : `Confirmed installation of ${version}`);
  };

  // Translations
  const t = {
    ar: {
      brand: 'AKASHA AI',
      subtitle: 'بوابة العملاء وإدارة التحديثات الرسمية',
      home: 'الرئيسية',
      portal: 'بوابة العميل',
      install: 'كيفية تثبيت التطبيق',
      support: 'مركز الدعم الفني',
      admin: 'لوحة تحكم المدير',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      welcome: 'مرحباً بك',
      heroTitle: 'جميع تحديثات نظامك في مكان واحد',
      heroDesc: 'تابع تحديثات برنامجك، واكتشف الميزات الجديدة، واحصل على تعليمات التثبيت والتحديث بسهولة وأمان.',
      enterPortal: 'دخول بوابة العملاء',
      howToInstall: 'كيفية تثبيت التطبيق',
      latestUpdates: 'آخر التحديثات المخصصة لحسابك',
      availableSystems: 'الأنظمة المرتبطة بحسابك',
      systemVersion: 'الإصدار الحالي',
      lastUpdate: 'تاريخ آخر تحديث',
      downloadUpdate: 'تحميل ملف التثبيت (EXE)',
      systemStatus: 'حالة النظام',
      active: 'نشط ومستقر',
      maintenance: 'تحت الصيانة',
      features: 'الميزات الجديدة',
      bugFixes: 'الأخطاء التي تم إصلاحها',
      clientDashboard: 'لوحة العميل الخاصة',
      supportTickets: 'مركز الدعم الفني والتذاكر',
      newTicket: 'إرسال طلب دعم فني جديد',
      ticketStatus: 'حالة الطلب',
      priority: 'الأولوية',
      subject: 'عنوان المشكلة',
      description: 'وصف المشكلة بالتفصيل',
      send: 'إرسال',
      reply: 'اكتب رسالتك للدعم الفني...',
      notifications: 'مركز الإشعارات',
      adminPanel: 'لوحة تحكم المدير (Admin Dashboard)',
      totalClients: 'إجمالي العملاء',
      totalSystems: 'إجمالي الأنظمة',
      publishedVersions: 'الإصدارات المنشورة',
      openTickets: 'طلبات الدعم المفتوحة',
      addClient: 'إضافة عميل جديد',
      addSystem: 'إضافة نظام برمجي',
      publishUpdate: 'رفع إصدار وتحديث جديد',
      sendNotification: 'إرسال إشعار جديد',
      stepBystepGuide: 'How to Install Your Application – دليل تثبيت وتحديث التطبيق',
      footerText: '© 2026 AKASHA AI – Client Portal. جميع الحقوق محفوظة. متصل بقاعدة بيانات Firebase السحابية.'
    },
    en: {
      brand: 'AKASHA AI',
      subtitle: 'Official Client Updates & Installation Portal',
      home: 'Home',
      portal: 'Client Portal',
      install: 'How to Install Your Application',
      support: 'Support Center',
      admin: 'Admin Dashboard',
      login: 'Sign In',
      logout: 'Sign Out',
      welcome: 'Welcome',
      heroTitle: 'All Your System Updates in One Place',
      heroDesc: 'Track your software updates, discover new features, and get step-by-step installation and update instructions easily.',
      enterPortal: 'Enter Client Portal',
      howToInstall: 'How to Install Application',
      latestUpdates: 'Latest Updates Assigned to Your Account',
      availableSystems: 'Systems Linked to Your Account',
      systemVersion: 'Current Version',
      lastUpdate: 'Last Update Date',
      downloadUpdate: 'Download Installer (EXE)',
      systemStatus: 'System Status',
      active: 'Active & Stable',
      maintenance: 'Under Maintenance',
      features: 'New Features',
      bugFixes: 'Bug Fixes',
      clientDashboard: 'Client Portal Dashboard',
      supportTickets: 'Technical Support Center',
      newTicket: 'Submit New Support Request',
      ticketStatus: 'Request Status',
      priority: 'Priority',
      subject: 'Issue Subject',
      description: 'Detailed Problem Description',
      send: 'Send',
      reply: 'Type your reply to support...',
      notifications: 'Notification Center',
      adminPanel: 'Admin Control Dashboard',
      totalClients: 'Total Clients',
      totalSystems: 'Total Systems',
      publishedVersions: 'Published Releases',
      openTickets: 'Open Support Tickets',
      addClient: 'Add New Client',
      addSystem: 'Add Software System',
      publishUpdate: 'Upload New Version / Update',
      sendNotification: 'Broadcast Notification',
      stepBystepGuide: 'How to Install Your Application – Visual Step-by-Step Guide',
      footerText: '© 2026 AKASHA AI – Client Portal. All rights reserved. Powered by Firebase Cloud Database.'
    }
  }[lang];

  // STRICT PER-ACCOUNT FILTERING ("ولكل حساب اعرض فقط التحديثات التي احددها له")
  const isViewingAsAdmin = effectiveUser?.role === 'admin';

  const clientSystems = isViewingAsAdmin
    ? data.systems
    : data.systems.filter((s: any) => s.clientId === effectiveUser?.id);

  const clientUpdates = isViewingAsAdmin
    ? data.updates
    : data.updates.filter((u: any) => {
        const isTargetedToThisClient =
          Array.isArray(u.targetClientIds) &&
          (u.targetClientIds.includes(effectiveUser?.id) || u.targetClientIds.includes('all'));
        return isTargetedToThisClient;
      });

  const clientNotifications = isViewingAsAdmin
    ? data.notifications
    : data.notifications.filter((n: any) => n.clientId === 'all' || n.clientId === effectiveUser?.id);

  const clientTickets = isViewingAsAdmin
    ? data.tickets
    : data.tickets.filter((tkt: any) => tkt.clientId === effectiveUser?.id);

  const allClientsList = data.users.filter((u: any) => u.role === 'client');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#16181E] flex items-center justify-center text-[#81B3B9]">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="w-12 h-12 animate-spin text-[#81B3B9]" />
          <p className="text-lg font-bold text-slate-200">AKASHA AI – Client Portal</p>
          <p className="text-xs text-slate-400">جاري تحميل قاعدة بيانات البوابة...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // EXTERNAL LOGIN GATE ("صفحه تسجيل لدخول بالخارج من ثم يفتح التطبيق")
  // ============================================================================
  if (!user) {
    return (
      <div className={`min-h-screen bg-[#16181E] text-slate-100 flex flex-col justify-between p-4 sm:p-8 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Top Bar on Login Screen */}
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#81B3B9] to-cyan-400 flex items-center justify-center text-[#16181E] font-bold shadow-lg shadow-[#81B3B9]/25">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-wide text-white">
                AKASHA <span className="text-[#81B3B9]">AI</span>
              </h1>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPublicInstallPreview(!publicInstallPreview)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E2028] hover:bg-slate-800 text-[#81B3B9] text-xs font-bold border border-[#81B3B9]/30 transition-all"
            >
              <Terminal className="w-4 h-4" />
              {publicInstallPreview
                ? (lang === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Sign In')
                : t.howToInstall}
            </button>
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E2028] hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
            >
              <Globe className="w-4 h-4 text-[#81B3B9]" />
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </div>

        {/* Public Install Guide Preview (if toggled from login screen) */}
        {publicInstallPreview ? (
          <div className="max-w-5xl mx-auto w-full my-8 bg-[#1E2028] border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
              <div>
                <span className="text-xs font-bold text-[#81B3B9] uppercase tracking-wider">How to Install Your Application</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">{t.stepBystepGuide}</h2>
              </div>
              <button
                onClick={() => setPublicInstallPreview(false)}
                className="px-4 py-2 bg-[#81B3B9] text-[#16181E] rounded-xl font-bold text-xs"
              >
                {lang === 'ar' ? 'تسجيل الدخول للبوابة' : 'Sign In to Portal'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.installGuides[0]?.steps.map((step: any) => (
                <div key={step.stepNumber} className="bg-[#16181E] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                  {step.imageUrl && (
                    <img src={step.imageUrl} alt={step.title} className="w-full h-40 object-cover border-b border-slate-800" />
                  )}
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#81B3B9] text-[#16181E] font-black text-xs flex items-center justify-center">
                        {step.stepNumber}
                      </span>
                      <h3 className="font-bold text-sm text-white">{step.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* External Login Main Grid */
          <div className="max-w-6xl mx-auto w-full my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left / Right Branding & Security Info */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#81B3B9]/10 border border-[#81B3B9]/30 text-[#81B3B9] text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                {lang === 'ar' ? 'بوابة رسمية محمية ومرتبطة بـ Firebase' : 'Official Portal Secured by Firebase'}
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                {t.heroTitle}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {t.heroDesc}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-[#1E2028] border border-slate-800/90 p-4 rounded-2xl space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-[#81B3B9]/10 text-[#81B3B9] flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white">
                    {lang === 'ar' ? 'تحديثات مخصصة لكل عميل' : 'Per-Account Targeted Updates'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'ar'
                      ? 'يعرض النظام لكل حساب عميل فقط البرامج والإصدارات التي يحددها له مدير النظام.'
                      : 'Each client account only sees the software systems and releases assigned to them.'}
                  </p>
                </div>

                <div className="bg-[#1E2028] border border-slate-800/90 p-4 rounded-2xl space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-[#81B3B9]/10 text-[#81B3B9] flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white">
                    {lang === 'ar' ? 'أدلة تثبيت وتحديث مرئية' : 'Visual Installation Guides'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'ar'
                      ? 'شرح خطوة بخطوة بالصور لتثبيت ملفات EXE والتحقق من شهادة الأمان وتحديث النظام.'
                      : 'Step-by-step visual instructions for EXE installation, security verification, and updates.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Login Box Card */}
            <div className="lg:col-span-6 bg-[#1E2028] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-white">
                    {lang === 'ar' ? 'تسجيل الدخول إلى البوابة' : 'Sign In to Portal'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'ar' ? 'أدخل البريد الإلكتروني وكلمة المرور الخاصة بحسابك للمتابعة' : 'Enter your account email and password to continue'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#81B3B9]/10 border border-[#81B3B9]/30 flex items-center justify-center text-[#81B3B9]">
                  <Lock className="w-5 h-5" />
                </div>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Email & Access Code Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {lang === 'ar' ? 'البريد الإلكتروني للحساب' : 'Account Email Address'}
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#81B3B9]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {lang === 'ar' ? 'كلمة المرور / كود الدخول' : 'Password / Access Code'}
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#81B3B9]"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#81B3B9] hover:bg-[#6c9fa4] text-[#16181E] rounded-xl font-black text-xs transition-all shadow-lg shadow-[#81B3B9]/20 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4 rtl:rotate-180" />
                    {lang === 'ar' ? 'دخول وفتح التطبيق' : 'Sign In & Open Portal'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-3.5 bg-[#16181E] hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-[#81B3B9]" />
                    {lang === 'ar' ? 'دخول عبر Google (Firebase)' : 'Sign in with Google'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-500 py-2">
          {t.footerText}
        </footer>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED PORTAL APPLICATION
  // ============================================================================
  return (
    <div className={`min-h-screen bg-[#16181E] text-slate-100 flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl border bg-[#1E2028] border-[#81B3B9] text-white text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#81B3B9]" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Admin Impersonation / Client Preview Banner */}
      {user?.role === 'admin' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Eye className="w-4 h-4" />
              <span>
                {previewClient
                  ? (lang === 'ar'
                      ? `وضع المعاينة النشط: أنت تشاهد الموقع الآن كما يراه العميل "${previewClient.name}" (تظهر فقط التحديثات المحددة له)`
                      : `Preview Mode: Viewing portal as client "${previewClient.name}"`)
                  : (lang === 'ar'
                      ? 'وضع مدير النظام: يمكنك معاينة الموقع بأي حساب عميل للتأكد من التحديثات المخصصة له:'
                      : 'Admin Mode: Switch to any client account to verify their targeted updates:')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  setPreviewClient(null);
                  setActiveTab('admin');
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  !previewClient
                    ? 'bg-amber-400 text-[#16181E]'
                    : 'bg-[#1E2028] text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                {lang === 'ar' ? 'لوحة المدير العام' : 'Admin View'}
              </button>
              {allClientsList.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setPreviewClient(c);
                    setActiveTab('portal');
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    previewClient?.id === c.id
                      ? 'bg-[#81B3B9] text-[#16181E]'
                      : 'bg-[#1E2028] text-slate-300 border border-slate-700 hover:border-[#81B3B9]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#1E2028]/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#81B3B9] to-cyan-500 flex items-center justify-center text-[#16181E] font-bold shadow-lg shadow-[#81B3B9]/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-white flex items-center gap-2">
                AKASHA <span className="text-[#81B3B9]">AI</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">{t.subtitle}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 bg-[#16181E] p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'home' ? 'bg-[#81B3B9] text-[#16181E] shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {t.home}
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'portal' ? 'bg-[#81B3B9] text-[#16181E] shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {t.portal}
            </button>
            <button
              onClick={() => setActiveTab('install')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'install' ? 'bg-[#81B3B9] text-[#16181E] shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {t.install}
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'support' ? 'bg-[#81B3B9] text-[#16181E] shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {t.support}
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  setPreviewClient(null);
                  setActiveTab('admin');
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'admin' ? 'bg-amber-500 text-[#16181E] shadow' : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {t.admin}
              </button>
            )}
          </nav>

          {/* Actions & Profile */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-[#81B3B9]" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              >
                <Bell className="w-5 h-5 text-[#81B3B9]" />
                {clientNotifications.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {clientNotifications.filter((n: any) => !n.read).length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-[#1E2028] border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#81B3B9]" />
                      {t.notifications}
                    </h3>
                    <span className="text-xs bg-slate-800 text-[#81B3B9] px-2.5 py-0.5 rounded-full font-bold">
                      {clientNotifications.filter((n: any) => !n.read).length} جديد
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {clientNotifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">لا توجد إشعارات حالياً لهذا الحساب.</p>
                    ) : (
                      clientNotifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            notif.read
                              ? 'bg-[#16181E]/40 border-slate-800 opacity-70'
                              : 'bg-[#16181E] border-[#81B3B9]/40 shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              notif.type === 'maintenance' ? 'bg-amber-500/20 text-amber-300' :
                              notif.type === 'bugfix' ? 'bg-emerald-500/20 text-emerald-300' :
                              'bg-[#81B3B9]/20 text-[#81B3B9]'
                            }`}>
                              {notif.type === 'update' ? 'تحديث جديد' :
                               notif.type === 'feature' ? 'ميزة جديدة' :
                               notif.type === 'bugfix' ? 'إصلاح مشكلة' :
                               notif.type === 'maintenance' ? 'صيانة مجدولة' : 'ملف جديد'}
                            </span>
                            <span className="text-[10px] text-slate-400">{notif.date}</span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-100 mt-1.5">{notif.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active Account Pill & Logout */}
            <div className="flex items-center gap-2.5 bg-[#16181E] border border-slate-800 px-3 py-1.5 rounded-xl">
              <img src={effectiveUser.avatar} alt={effectiveUser.name} className="w-8 h-8 rounded-full object-cover border border-[#81B3B9]" />
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-white truncate max-w-[130px]">{effectiveUser.name}</p>
                <p className="text-[10px] text-[#81B3B9] truncate max-w-[130px]">{effectiveUser.company}</p>
              </div>
              <button
                onClick={handleLogout}
                title={t.logout}
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* ====================================================================
            1. HOME PAGE VIEW
           ==================================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-14 pb-16">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-20 px-4 bg-gradient-to-b from-[#1E2028] to-[#16181E] border-b border-slate-800">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(129,179,185,0.1),transparent_55%)]"></div>
              <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#81B3B9]/10 border border-[#81B3B9]/30 text-[#81B3B9] text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  {lang === 'ar'
                    ? `مرحباً ${effectiveUser.name} — تعرض هذه البوابة التحديثات والأنظمة المخصصة لحسابك فقط`
                    : `Welcome ${effectiveUser.name} — Viewing updates and systems assigned to your account`}
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                  {t.heroTitle}
                </h1>
                <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  {t.heroDesc}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
                  <button
                    onClick={() => setActiveTab('portal')}
                    className="flex items-center gap-2 px-8 py-3.5 bg-[#81B3B9] text-[#16181E] rounded-xl font-extrabold text-sm hover:bg-[#6c9fa4] transition-all shadow-xl shadow-[#81B3B9]/20"
                  >
                    {t.enterPortal}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                  <button
                    onClick={() => setActiveTab('install')}
                    className="flex items-center gap-2 px-8 py-3.5 bg-[#1E2028] hover:bg-slate-800 text-slate-100 border border-slate-700 rounded-xl font-bold text-sm transition-all"
                  >
                    <Terminal className="w-4 h-4 text-[#81B3B9]" />
                    {t.howToInstall}
                  </button>
                </div>
              </div>
            </section>

            {/* Latest Updates Section (Strictly filtered for this account!) */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-[#81B3B9]" />
                    {t.latestUpdates}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'ar'
                      ? 'الإصدارات والتحديثات المعتمدة والموجهة لحساب شركتكم'
                      : 'Releases and updates specifically assigned to your company account'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('portal')}
                  className="text-xs font-bold text-[#81B3B9] hover:underline flex items-center gap-1"
                >
                  {lang === 'ar' ? 'فتح لوحة العميل الكاملة' : 'Open Client Portal'}
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>

              {clientUpdates.length === 0 ? (
                <div className="bg-[#1E2028] border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#81B3B9] mx-auto" />
                  <h3 className="font-bold text-base text-white">
                    {lang === 'ar' ? 'لا توجد تحديثات معلقة لحسابك حالياً' : 'No pending updates assigned to your account'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'سيقوم مدير النظام بتخصيص التحديثات الجديدة لحسابك فور صدورها.'
                      : 'Your system administrator will assign new releases to your account as soon as they are ready.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {clientUpdates.map((update: any) => (
                    <div key={update.id} className="bg-[#1E2028] border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-[#81B3B9]/50 transition-all flex flex-col justify-between space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-3 py-1 bg-[#81B3B9]/15 text-[#81B3B9] rounded-full text-xs font-extrabold border border-[#81B3B9]/30">
                            {update.version}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#81B3B9]" />
                            {update.releaseDate}
                          </span>
                        </div>

                        <h3 className="font-black text-lg text-white mb-2">{update.systemName}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed mb-4">{update.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {update.features?.length > 0 && (
                            <div className="bg-[#16181E] p-3.5 rounded-2xl border border-slate-800/80 space-y-1.5">
                              <p className="text-[11px] font-bold text-[#81B3B9] flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> {t.features}:
                              </p>
                              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                {update.features.map((feat: string, i: number) => (
                                  <li key={i}>{feat}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {update.bugFixes?.length > 0 && (
                            <div className="bg-[#16181E] p-3.5 rounded-2xl border border-slate-800/80 space-y-1.5">
                              <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {t.bugFixes}:
                              </p>
                              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                {update.bugFixes.map((fix: string, i: number) => (
                                  <li key={i}>{fix}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-400">
                          <span className="font-bold text-slate-200">{update.fileName || 'Setup.exe'}</span> • {update.fileSize}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedGuideSystemId(update.systemId);
                              setActiveTab('install');
                            }}
                            className="px-3.5 py-2 bg-[#16181E] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
                          >
                            {lang === 'ar' ? 'طريقة التثبيت' : 'Install Guide'}
                          </button>
                          <a
                            href={update.downloadUrl}
                            download
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#81B3B9] hover:bg-[#6c9fa4] text-[#16181E] rounded-xl font-black text-xs transition-colors shadow-md"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {t.downloadUpdate}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Assigned Systems Section */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 space-y-6">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Layers className="w-6 h-6 text-[#81B3B9]" />
                  {t.availableSystems}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'ar' ? 'الأنظمة المرخصة والمرتبطة بحسابكم لدى AKASHA AI' : 'Software systems licensed and linked to your AKASHA AI account'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientSystems.map((sys: any) => (
                  <div key={sys.id} className="bg-[#1E2028] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#81B3B9]/10 border border-[#81B3B9]/30 flex items-center justify-center text-[#81B3B9]">
                          {sys.icon === 'Bot' ? <Bot className="w-6 h-6" /> : sys.icon === 'Stethoscope' ? <Stethoscope className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                        </div>
                        <span className="text-xs bg-[#16181E] border border-slate-800 text-[#81B3B9] px-3 py-1 rounded-xl font-mono font-bold">
                          {sys.code}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white mb-2">{sys.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{sys.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {t.systemVersion}: <strong className="text-white font-mono">{sys.currentVersion}</strong>
                      </span>
                      <button
                        onClick={() => setActiveTab('portal')}
                        className="text-[#81B3B9] font-bold hover:underline flex items-center gap-1"
                      >
                        {lang === 'ar' ? 'إدارة وتحميل' : 'Manage & Download'}
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ====================================================================
            2. CLIENT PORTAL DASHBOARD ("بوابة العملاء")
           ==================================================================== */}
        {activeTab === 'portal' && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-10">
            {/* Client Account Header Card */}
            <div className="bg-gradient-to-r from-[#1E2028] to-[#16181E] border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
              <div className="flex items-center gap-4">
                <img src={effectiveUser.avatar} alt={effectiveUser.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[#81B3B9]" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#81B3B9]/15 text-[#81B3B9]">
                      {effectiveUser.role === 'admin' ? 'حساب مدير النظام' : 'حساب عميل معتمد'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {effectiveUser.id}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">{effectiveUser.name}</h2>
                  <p className="text-xs text-slate-300 mt-0.5">{effectiveUser.company} • {effectiveUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                <div className="bg-[#16181E] border border-slate-800 px-4 py-3 rounded-2xl text-center">
                  <p className="text-[10px] text-slate-400">{lang === 'ar' ? 'أنظمتك المشتراة' : 'Your Systems'}</p>
                  <p className="text-xl font-black text-white mt-0.5">{clientSystems.length}</p>
                </div>
                <div className="bg-[#16181E] border border-slate-800 px-4 py-3 rounded-2xl text-center">
                  <p className="text-[10px] text-slate-400">{lang === 'ar' ? 'تحديثات مخصصة لك' : 'Assigned Updates'}</p>
                  <p className="text-xl font-black text-[#81B3B9] mt-0.5">{clientUpdates.length}</p>
                </div>
                <div className="bg-[#16181E] border border-slate-800 px-4 py-3 rounded-2xl text-center">
                  <p className="text-[10px] text-slate-400">{lang === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">{clientTickets.length}</p>
                </div>
              </div>
            </div>

            {/* Client Purchased Systems & Targeted Updates */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-[#81B3B9]" />
                    {lang === 'ar' ? 'الأنظمة المرتبطة بحسابك والتحديثات المتاحة' : 'Your Linked Systems & Available Updates'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'تظهر هنا فقط الأنظمة والتحديثات الموجهة لحسابك، مع ملفات التثبيت وسجل الإصدارات الكامل'
                      : 'Showing only systems and updates targeted to your account, with installation files and changelog'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('install')}
                  className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E2028] border border-[#81B3B9]/40 text-[#81B3B9] text-xs font-bold hover:bg-slate-800"
                >
                  <HelpCircle className="w-4 h-4" />
                  {lang === 'ar' ? 'شرح تثبيت وتحديث التطبيق بالصور' : 'Visual Installation & Update Guide'}
                </button>
              </div>

              {clientSystems.length === 0 ? (
                <div className="bg-[#1E2028] border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs">
                  {lang === 'ar' ? 'لا توجد أنظمة مرتبطة بهذا الحساب حالياً.' : 'No systems linked to this account yet.'}
                </div>
              ) : (
                <div className="space-y-8">
                  {clientSystems.map((sys: any) => {
                    const sysUpdates = clientUpdates.filter((u: any) => u.systemId === sys.id);
                    const latestUp = sysUpdates[0];
                    const installedVer = installedVersions[`${effectiveUser?.id}_${sys.id}`];
                    const currentVer = latestUp ? latestUp.version : sys.currentVersion;
                    const hasNewerUpdate = latestUp && installedVer !== latestUp.version;

                    return (
                      <div key={sys.id} className="bg-[#1E2028] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                        {/* System Top Info */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                                sys.status === 'maintenance'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {sys.status === 'maintenance' ? t.maintenance : t.active}
                              </span>
                              <span className="text-xs font-mono bg-[#16181E] border border-slate-800 text-[#81B3B9] px-3 py-1 rounded-lg font-bold">
                                {sys.code}
                              </span>
                              {hasNewerUpdate && (
                                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#81B3B9] text-[#16181E] animate-pulse">
                                  {lang === 'ar' ? `تحديث جديد متاح (${latestUp.version})` : `New Update Available (${latestUp.version})`}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xl font-black text-white">{sys.name}</h4>
                            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{sys.description}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-[#16181E] border border-slate-800 px-4 py-2.5 rounded-2xl">
                              <span className="text-[10px] text-slate-400 block">{t.systemVersion}</span>
                              <strong className="text-white font-mono text-sm">{currentVer}</strong>
                            </div>
                            <div className="bg-[#16181E] border border-slate-800 px-4 py-2.5 rounded-2xl">
                              <span className="text-[10px] text-slate-400 block">{t.lastUpdate}</span>
                              <strong className="text-white text-sm">{latestUp ? latestUp.releaseDate : sys.lastUpdateDate}</strong>
                            </div>
                            <a
                              href={latestUp ? latestUp.downloadUrl : sys.downloadUrl}
                              download
                              className="flex items-center gap-2 px-6 py-3.5 bg-[#81B3B9] hover:bg-[#6c9fa4] text-[#16181E] rounded-2xl font-black text-xs transition-all shadow-lg shadow-[#81B3B9]/20"
                            >
                              <Download className="w-4 h-4" />
                              {t.downloadUpdate}
                            </a>
                          </div>
                        </div>

                        {/* System-Specific Update & Backup Instructions Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#16181E] p-4 rounded-2xl border border-slate-800/90 text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-[#81B3B9] flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5" />
                              {lang === 'ar' ? 'تعليمات التحديث الخاصة بهذا النظام:' : 'System Update Method:'}
                            </span>
                            <p className="text-slate-300 leading-relaxed">
                              {sys.requiresUninstallOld
                                ? (lang === 'ar' ? '⚠️ يتطلب إزالة الإصدار القديم قبل التثبيت: ' : '⚠️ Requires uninstalling old version: ')
                                : (lang === 'ar' ? '✅ ترقية مباشرة (لا تحتاج لحذف الإصدار القديم): ' : '✅ Direct in-place upgrade (do not uninstall old version): ')}
                              {sys.customUpdateInstructions}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <HardDrive className="w-3.5 h-3.5" />
                              {lang === 'ar' ? 'حماية البيانات والنسخ الاحتياطي:' : 'Data Preservation & Backup:'}
                            </span>
                            <p className="text-slate-300 leading-relaxed">{sys.backupInstructions}</p>
                          </div>
                        </div>

                        {/* Version History & Targeted Releases for this System ("سجل التحديثات") */}
                        <div className="space-y-3">
                          <h5 className="font-bold text-sm text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#81B3B9]" />
                            {lang === 'ar' ? 'سجل التحديثات والإصدارات المخصصة لحسابك:' : 'Release History Assigned to Your Account:'}
                          </h5>

                          {sysUpdates.length === 0 ? (
                            <p className="text-xs text-slate-400 bg-[#16181E] p-4 rounded-2xl border border-slate-800">
                              {lang === 'ar' ? 'لا توجد تحديثات مخصصة لهذا النظام على حسابك بعد.' : 'No updates assigned for this system on your account yet.'}
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {sysUpdates.map((up: any, index: number) => {
                                const isInstalled = installedVer === up.version;
                                return (
                                  <div
                                    key={up.id}
                                    className={`p-5 rounded-2xl border transition-all ${
                                      index === 0
                                        ? 'bg-[#16181E] border-[#81B3B9]/50 shadow-lg'
                                        : 'bg-[#16181E]/60 border-slate-800'
                                    }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                                      <div className="flex flex-wrap items-center gap-2.5">
                                        <span className="px-3 py-1 bg-[#81B3B9]/15 text-[#81B3B9] rounded-lg font-mono font-black text-xs">
                                          {up.version}
                                        </span>
                                        {index === 0 && (
                                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                                            {lang === 'ar' ? 'أحدث إصدار' : 'Latest Release'}
                                          </span>
                                        )}
                                        <span className="text-xs text-slate-400">{up.releaseDate}</span>
                                        <span className="text-xs text-slate-500">• {up.fileSize} ({up.fileType})</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => markVersionInstalled(sys.id, up.version)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                            isInstalled
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                          }`}
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          {isInstalled
                                            ? (lang === 'ar' ? 'مثبت لديك حالياً' : 'Installed')
                                            : (lang === 'ar' ? 'تأكيد التثبيت' : 'Mark as Installed')}
                                        </button>
                                        <a
                                          href={up.downloadUrl}
                                          download
                                          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#81B3B9] hover:bg-[#6c9fa4] text-[#16181E] rounded-xl font-bold text-xs"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          {lang === 'ar' ? 'تنزيل الحزمة' : 'Download'}
                                        </a>
                                      </div>
                                    </div>

                                    <p className="text-xs text-slate-200 mt-3 leading-relaxed">{up.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                      {up.features?.length > 0 && (
                                        <div className="space-y-1">
                                          <span className="text-[11px] font-bold text-[#81B3B9] block">{t.features}:</span>
                                          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                            {up.features.map((f: string, idx: number) => (
                                              <li key={idx}>{f}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {up.bugFixes?.length > 0 && (
                                        <div className="space-y-1">
                                          <span className="text-[11px] font-bold text-emerald-400 block">{t.bugFixes}:</span>
                                          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                            {up.bugFixes.map((b: string, idx: number) => (
                                              <li key={idx}>{b}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {up.checksum && (
                                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                        <span>Publisher: AKASHA AI CORP (Verified Digital Signature)</span>
                                        <span className="truncate max-w-xs">{up.checksum}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            3. HOW TO INSTALL YOUR APPLICATION ("قسم تثبيت التطبيق")
           ==================================================================== */}
        {activeTab === 'install' && (
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12 space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#81B3B9]/10 border border-[#81B3B9]/30 text-[#81B3B9] text-xs font-bold">
                <Terminal className="w-4 h-4" />
                How to Install Your Application
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">{t.stepBystepGuide}</h2>
              <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {lang === 'ar'
                  ? 'شرح مرئي واضح خطوة بخطوة لتثبيت تطبيقات Windows بصيغة EXE والتحقق من الأمان وتحديث النظام بدون أي خبرة تقنية مسبقة.'
                  : 'Clear visual step-by-step guide to installing EXE applications on Windows, verifying publisher security, and updating your system.'}
              </p>
            </div>

            {/* 8 Visual Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.installGuides[0]?.steps.map((step: any) => (
                <div
                  key={step.stepNumber}
                  className="bg-[#1E2028] border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {step.imageUrl && (
                      <div className="relative h-48 bg-[#16181E] border-b border-slate-800 overflow-hidden">
                        <img
                          src={step.imageUrl}
                          alt={step.title}
                          className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-[#81B3B9] text-[#16181E] font-black text-sm flex items-center justify-center shadow-lg">
                          {step.stepNumber}
                        </div>
                      </div>
                    )}
                    <div className="p-6 space-y-3">
                      <h3 className="text-base font-black text-white">{step.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>

                      {step.stepNumber === 5 && (
                        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs text-amber-200">
                          <div className="flex items-center gap-2 font-bold text-amber-300">
                            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                            <span>
                              {lang === 'ar'
                                ? 'كيف تتحقق من مصدر التطبيق في Windows Security؟'
                                : 'How to Verify Publisher Identity in Windows Security:'}
                            </span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-100/90">
                            <li>
                              {lang === 'ar'
                                ? 'لا تتجاوز تحذيرات الأمان بشكل عشوائي لأي ملف غير معروف.'
                                : 'Never blindly bypass security warnings for unknown files.'}
                            </li>
                            <li>
                              {lang === 'ar'
                                ? 'تأكد من أنك قمت بتحميل الملف مباشرة من داخل حسابك الرسمي في بوابة AKASHA AI.'
                                : 'Verify the installer was downloaded directly from your official AKASHA AI Portal.'}
                            </li>
                            <li>
                              {lang === 'ar'
                                ? 'اضغط بزر الفأرة الأيمن على ملف EXE -> خصائص (Properties) -> التوقيعات الرقمية (Digital Signatures) وتأكد من وجود اسم AKASHA AI CORP.'
                                : 'Right-click EXE -> Properties -> Digital Signatures and verify AKASHA AI CORP.'}
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Customizable Per-System Update Instructions ("تحديث التطبيق") */}
            <div className="bg-[#1E2028] border border-[#81B3B9]/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-[#81B3B9]" />
                    {lang === 'ar' ? 'كيفية تحديث التطبيق والمحافظة على البيانات' : 'How to Update Your Application & Preserve Data'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'ar'
                      ? 'تعليمات التحديث مخصصة لكل نظام برمجي حسب بنيته الهندسية'
                      : 'Update instructions are tailored specifically to each software system'}
                  </p>
                </div>

                <select
                  value={selectedGuideSystemId}
                  onChange={(e) => setSelectedGuideSystemId(e.target.value)}
                  className="bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-[#81B3B9] focus:outline-none"
                >
                  <option value="all">{lang === 'ar' ? 'عرض جميع أنظمتي' : 'Show All My Systems'}</option>
                  {clientSystems.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              {/* 5 Key Questions Answered Clearly */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#16181E] p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-xs font-black text-[#81B3B9]">1. كيف أعرف أن هناك تحديثاً جديداً؟</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ستصلك إشعارات فورية في "مركز الإشعارات" أعلى البوابة، كما ستظهر شارة "تحديث جديد متاح" بجانب اسم نظامك في لوحة العميل.
                  </p>
                </div>
                <div className="bg-[#16181E] p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-xs font-black text-[#81B3B9]">2. كيف أحمل وأثبت الإصدار الجديد؟</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    من تبويب "بوابة العميل"، اضغط على زر "تحميل ملف التثبيت (EXE)" الخاص بالإصدار الجديد، ثم شغّل الملف باتباع التعليمات المخصصة للنظام أدناه.
                  </p>
                </div>
                <div className="bg-[#16181E] p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-xs font-black text-[#81B3B9]">3. كيف أحافظ على بياناتي أثناء التحديث؟</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {data.installGuides[0]?.updateNotes}
                  </p>
                </div>
              </div>

              {/* Per-System Specific Update Rules */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white">
                  {lang === 'ar' ? 'طريقة التحديث المخصصة حسب النظام:' : 'System-Specific Update Instructions:'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedGuideSystemId === 'all'
                    ? clientSystems
                    : clientSystems.filter((s: any) => s.id === selectedGuideSystemId)
                  ).map((sys: any) => (
                    <div key={sys.id} className="bg-[#16181E] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-sm text-white">{sys.name}</h5>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                          sys.requiresUninstallOld
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {sys.requiresUninstallOld
                            ? (lang === 'ar' ? 'يتطلب حذف الإصدار القديم أولاً' : 'Uninstall Old Version First')
                            : (lang === 'ar' ? 'لا يحتاج لحذف الإصدار القديم' : 'No Uninstall Needed')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-[#81B3B9]">{lang === 'ar' ? 'خطوات التحديث: ' : 'Update Steps: '}</strong>
                        {sys.customUpdateInstructions}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-emerald-400">{lang === 'ar' ? 'حفظ البيانات: ' : 'Data Backup: '}</strong>
                        {sys.backupInstructions}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            4. SUPPORT CENTER ("مركز الدعم الفني")
           ==================================================================== */}
        {activeTab === 'support' && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <LifeBuoy className="w-6 h-6 text-[#81B3B9]" />
                  {t.supportTickets}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'ar'
                    ? 'أرسل طلب دعم فني، أرفق صورة للمشكلة، وتابع حالة الطلب ومحادثات الدعم مباشرة'
                    : 'Submit support tickets, attach screenshots, and chat directly with AKASHA AI support'}
                </p>
              </div>
              <button
                onClick={() => setNewTicketModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs hover:bg-[#6c9fa4] transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                {t.newTicket}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tickets List */}
              <div className="lg:col-span-1 space-y-3">
                {clientTickets.length === 0 ? (
                  <div className="bg-[#1E2028] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                    {lang === 'ar' ? 'لا توجد تذاكر دعم مسجلة لهذا الحساب.' : 'No support tickets found.'}
                  </div>
                ) : (
                  clientTickets.map((tkt: any) => (
                    <div
                      key={tkt.id}
                      onClick={() => setActiveTicket(tkt)}
                      className={`bg-[#1E2028] border rounded-2xl p-4 cursor-pointer transition-all ${
                        activeTicket?.id === tkt.id
                          ? 'border-[#81B3B9] shadow-lg shadow-[#81B3B9]/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-[#81B3B9]">#{tkt.id}</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          tkt.status === 'resolved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : tkt.status === 'in_progress'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {tkt.status === 'resolved' ? 'تم الحل' : tkt.status === 'in_progress' ? 'قيد المعالجة' : 'جديد'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white mb-1 truncate">{tkt.subject}</h4>
                      <p className="text-xs text-slate-400 mb-3">{tkt.systemName}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{tkt.clientName}</span>
                        <span>{new Date(tkt.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Ticket Conversation Thread */}
              <div className="lg:col-span-2 bg-[#1E2028] border border-slate-800 rounded-3xl p-6 flex flex-col h-[600px]">
                {activeTicket ? (
                  <>
                    <div className="pb-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#81B3B9]">#{activeTicket.id}</span>
                          <span className="text-xs text-slate-400">• {activeTicket.systemName}</span>
                        </div>
                        <h3 className="font-bold text-base text-white mt-0.5">{activeTicket.subject}</h3>
                      </div>

                      {/* Admin Status Switcher or Client Status Badge */}
                      {user?.role === 'admin' && !previewClient ? (
                        <div className="flex items-center gap-1.5">
                          {(['new', 'in_progress', 'resolved'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleUpdateTicketStatus(activeTicket.id, st)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                activeTicket.status === st
                                  ? 'bg-[#81B3B9] text-[#16181E]'
                                  : 'bg-[#16181E] text-slate-400 border border-slate-700'
                              }`}
                            >
                              {st === 'new' ? 'جديد' : st === 'in_progress' ? 'قيد المعالجة' : 'تم الحل'}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          activeTicket.status === 'resolved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : activeTicket.status === 'in_progress'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {activeTicket.status === 'resolved' ? 'تم الحل' : activeTicket.status === 'in_progress' ? 'قيد المعالجة' : 'جديد'}
                        </span>
                      )}
                    </div>

                    {/* Attached Problem Image if any */}
                    {activeTicket.attachmentUrl && (
                      <div className="my-3 p-3 bg-[#16181E] border border-slate-800 rounded-2xl flex items-center gap-3">
                        <img
                          src={activeTicket.attachmentUrl}
                          alt="Problem screenshot"
                          className="w-20 h-14 object-cover rounded-lg border border-slate-700"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-white">صورة مرفقة للمشكلة</p>
                          <a
                            href={activeTicket.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#81B3B9] hover:underline text-[11px]"
                          >
                            عرض الصورة بالحجم الكامل
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
                      {activeTicket.messages.map((msg: any) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'admin' ? 'items-start' : 'items-end'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-300">{msg.senderName}</span>
                            <span className="text-[10px] text-slate-500">{msg.time}</span>
                          </div>
                          <div className={`p-4 rounded-2xl text-xs max-w-md leading-relaxed ${
                            msg.sender === 'admin'
                              ? 'bg-[#16181E] border border-[#81B3B9]/30 text-slate-200'
                              : 'bg-[#81B3B9] text-[#16181E] font-semibold'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply Input */}
                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply(activeTicket.id)}
                        placeholder={t.reply}
                        className="flex-1 bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#81B3B9]"
                      />
                      <button
                        onClick={() => handleSendReply(activeTicket.id)}
                        className="px-4 py-3 bg-[#81B3B9] hover:bg-[#6c9fa4] text-[#16181E] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-4 h-4 rtl:rotate-180" />
                        {t.send}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
                    <MessageSquare className="w-12 h-12 text-slate-600" />
                    <p className="text-xs">
                      {lang === 'ar'
                        ? 'اختر تذكرة من القائمة لعرض سجل المحادثات أو اضغط على "إرسال طلب دعم فني جديد".'
                        : 'Select a ticket from the list to view conversation history or create a new request.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            5. ADMIN DASHBOARD ("لوحة تحكم المدير")
           ==================================================================== */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-8">
            {/* Top Admin Header & Quick Action Buttons */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#1E2028] border border-slate-800 p-6 rounded-3xl">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-amber-400" />
                  {t.adminPanel}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'ar'
                    ? 'إدارة شاملة للعملاء، الأنظمة، رفع الإصدارات، وتحديد التحديثات التي تظهر لكل عميل على حدة'
                    : 'Full control over clients, systems, releases, and per-account update targeting'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setNewClientModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#16181E] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#81B3B9]" />
                  {t.addClient}
                </button>
                <button
                  onClick={() => setNewSystemModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#16181E] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#81B3B9]" />
                  {t.addSystem}
                </button>
                <button
                  onClick={() => setNewNotificationModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#16181E] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs"
                >
                  <Bell className="w-3.5 h-3.5 text-[#81B3B9]" />
                  {t.sendNotification}
                </button>
                <button
                  onClick={() => setNewUpdateModal(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#81B3B9] hover:bg-[#6c9fa4] text-[#16181E] rounded-xl font-black text-xs shadow-lg shadow-[#81B3B9]/20"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t.publishUpdate}
                </button>
              </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1E2028] border border-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-400">{t.totalClients}</p>
                <p className="text-3xl font-black text-white mt-1">{allClientsList.length}</p>
              </div>
              <div className="bg-[#1E2028] border border-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-400">{t.totalSystems}</p>
                <p className="text-3xl font-black text-[#81B3B9] mt-1">{data.systems.length}</p>
              </div>
              <div className="bg-[#1E2028] border border-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-400">{t.publishedVersions}</p>
                <p className="text-3xl font-black text-emerald-400 mt-1">{data.updates.length}</p>
              </div>
              <div className="bg-[#1E2028] border border-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-400">{t.openTickets}</p>
                <p className="text-3xl font-black text-amber-400 mt-1">
                  {data.tickets.filter((tkt: any) => tkt.status !== 'resolved').length}
                </p>
              </div>
            </div>

            {/* Admin Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
              {[
                { id: 'updates', label: lang === 'ar' ? 'إدارة الإصدارات وتخصيص العملاء' : 'Releases & Client Targeting' },
                { id: 'clients', label: lang === 'ar' ? 'إدارة العملاء والصلاحيات' : 'Manage Clients & Roles' },
                { id: 'systems', label: lang === 'ar' ? 'إدارة الأنظمة البرمجية' : 'Manage Systems' },
                { id: 'guides', label: lang === 'ar' ? 'إدارة أدلة التثبيت والصور' : 'Manage Install Guides & Images' },
                { id: 'notifications', label: lang === 'ar' ? 'إدارة الإشعارات' : 'Manage Notifications' },
                { id: 'tickets', label: lang === 'ar' ? 'طلبات الدعم الفني' : 'Support Tickets' },
                { id: 'logs', label: lang === 'ar' ? 'سجل العمليات (Audit Logs)' : 'Audit Logs' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    adminTab === tab.id
                      ? 'bg-[#81B3B9] text-[#16181E] shadow'
                      : 'bg-[#1E2028] text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Admin Content Panel */}
            <div className="bg-[#1E2028] border border-slate-800 rounded-3xl p-6 sm:p-8">
              {/* TAB 1: RELEASES & PER-CLIENT TARGETING ("ولكل حساب اعرض فقط التحديثات التي احددها له") */}
              {adminTab === 'updates' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-lg text-white">
                        {lang === 'ar'
                          ? 'سجل الإصدارات وتحديد العملاء الذين يظهر لهم كل تحديث'
                          : 'Release Management & Per-Account Update Visibility'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === 'ar'
                          ? 'اضغط على اسم أي عميل أسفل أي تحديث لتفعيل أو إيقاف ظهور هذا التحديث في حسابه فوراً'
                          : 'Click any client button under a release to immediately grant or revoke access to that update'}
                      </p>
                    </div>
                    <button
                      onClick={() => setNewUpdateModal(true)}
                      className="px-4 py-2.5 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs flex items-center gap-1.5 self-start"
                    >
                      <Plus className="w-4 h-4" />
                      {t.publishUpdate}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {data.updates.map((up: any) => (
                      <div key={up.id} className="bg-[#16181E] border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <span className="px-3 py-0.5 bg-[#81B3B9]/15 text-[#81B3B9] rounded-lg text-xs font-black font-mono">
                                {up.version}
                              </span>
                              <h4 className="font-bold text-base text-white">{up.systemName}</h4>
                              <span className="text-xs text-slate-500">({up.releaseDate})</span>
                            </div>
                            <p className="text-xs text-slate-300">{up.description}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={up.downloadUrl}
                              download
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#81B3B9] rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {up.fileSize}
                            </a>
                            <button
                              onClick={() => handleDeleteUpdate(up.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                              title="حذف الإصدار"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Client Target Selector Pills */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-[#81B3B9] flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5" />
                            {lang === 'ar'
                              ? 'الحسابات المسموح لها بمشاهدة وتحميل هذا التحديث (اضغط للتبديل):'
                              : 'Accounts permitted to view & download this update (click to toggle):'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleUpdateClientTarget(up, 'all')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                                up.targetClientIds?.includes('all')
                                  ? 'bg-[#81B3B9] text-[#16181E] border-[#81B3B9]'
                                  : 'bg-[#1E2028] text-slate-400 border-slate-700 hover:border-slate-500'
                              }`}
                            >
                              {up.targetClientIds?.includes('all') ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                              <span>{lang === 'ar' ? 'جميع العملاء' : 'All Clients'}</span>
                            </button>

                            {allClientsList.map((client: any) => {
                              const isSelected = up.targetClientIds?.includes(client.id) || up.targetClientIds?.includes('all');
                              return (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleToggleUpdateClientTarget(up, client.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                                    isSelected
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-[#1E2028] text-slate-400 border-slate-800 hover:border-slate-600'
                                  }`}
                                >
                                  {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Square className="w-3.5 h-3.5" />}
                                  <span>{client.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: CLIENTS & PERMISSIONS */}
              {adminTab === 'clients' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-base text-white">
                      {lang === 'ar' ? 'إدارة حسابات العملاء وصلاحيات الدخول' : 'Client Accounts & Access Credentials'}
                    </h3>
                    <button
                      onClick={() => setNewClientModal(true)}
                      className="px-4 py-2 bg-[#81B3B9] text-[#16181E] rounded-xl font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      {t.addClient}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-3 pr-4">{lang === 'ar' ? 'العميل / الشركة' : 'Client / Company'}</th>
                          <th className="pb-3 px-4">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                          <th className="pb-3 px-4">{lang === 'ar' ? 'كود الدخول' : 'Access Code'}</th>
                          <th className="pb-3 px-4">{lang === 'ar' ? 'التحديثات المخصصة له' : 'Targeted Updates'}</th>
                          <th className="pb-3 px-4">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {allClientsList.map((c: any) => {
                          const count = data.updates.filter(
                            (u: any) => u.targetClientIds?.includes(c.id) || u.targetClientIds?.includes('all')
                          ).length;
                          return (
                            <tr key={c.id} className="hover:bg-slate-800/30">
                              <td className="py-4 pr-4">
                                <div className="flex items-center gap-2.5">
                                  <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  <div>
                                    <p className="font-bold text-white">{c.name}</p>
                                    <p className="text-[10px] text-slate-400">{c.company}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-[#81B3B9] font-mono">{c.email}</td>
                              <td className="py-4 px-4 font-mono text-slate-300">{c.accessCode || 'akasha2026'}</td>
                              <td className="py-4 px-4">
                                <span className="px-2.5 py-1 rounded-full bg-[#81B3B9]/15 text-[#81B3B9] font-bold">
                                  {count} {lang === 'ar' ? 'إصدار' : 'releases'}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setPreviewClient(c);
                                      setActiveTab('portal');
                                    }}
                                    className="px-3 py-1.5 bg-[#16181E] hover:bg-slate-800 text-[#81B3B9] border border-[#81B3B9]/30 rounded-lg font-bold flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    {lang === 'ar' ? 'معاينة حساب العميل' : 'Preview Portal'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClient(c.id)}
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SOFTWARE SYSTEMS */}
              {adminTab === 'systems' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-base text-white">
                      {lang === 'ar' ? 'إدارة الأنظمة البرمجية وربطها بالعملاء' : 'Software Systems & Client Mapping'}
                    </h3>
                    <button
                      onClick={() => setNewSystemModal(true)}
                      className="px-4 py-2 bg-[#81B3B9] text-[#16181E] rounded-xl font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      {t.addSystem}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.systems.map((sys: any) => {
                      const client = data.users.find((u: any) => u.id === sys.clientId);
                      return (
                        <div key={sys.id} className="bg-[#16181E] border border-slate-800 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-base text-white">{sys.name}</span>
                              <span className="mr-2 text-xs font-mono bg-slate-800 text-[#81B3B9] px-2 py-0.5 rounded">
                                {sys.code}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteSystem(sys.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{sys.description}</p>
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              {lang === 'ar' ? 'العميل المرتبط:' : 'Linked Client:'}{' '}
                              <strong className="text-white">{client?.name || 'غير محدد'}</strong>
                            </span>
                            <span className="text-emerald-400 font-mono font-bold">{sys.currentVersion}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: INSTALL GUIDES & STEP IMAGE REPLACEMENT ("مع إمكانية استبدال الصور من لوحة تحكم المدير") */}
              {adminTab === 'guides' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-black text-base text-white">
                        {lang === 'ar'
                          ? 'تعديل خطوات دليل التثبيت واستبدال الصور التوضيحية'
                          : 'Edit Installation Steps & Replace Step Illustrations'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === 'ar'
                          ? 'يمكنك تعديل نص كل خطوة أو رفع صورة جديدة من جهازك لكل خطوة من خطوات التثبيت الثمانية'
                          : 'Customize step text or upload a replacement image for any of the 8 installation steps'}
                      </p>
                    </div>
                    <button
                      onClick={handleSaveInstallGuide}
                      className="px-5 py-2.5 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs flex items-center gap-1.5 self-start"
                    >
                      <Check className="w-4 h-4" />
                      {lang === 'ar' ? 'حفظ التعديلات والصور' : 'Save Guide & Images'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editableSteps.map((step: any, idx: number) => (
                      <div key={step.stepNumber} className="bg-[#16181E] border border-slate-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#81B3B9]">الخطوة #{step.stepNumber}</span>
                          <label className="cursor-pointer px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-[#81B3B9]" />
                            <span>{lang === 'ar' ? 'استبدال الصورة' : 'Replace Image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleStepImageUpload(idx, e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>

                        {step.imageUrl && (
                          <img src={step.imageUrl} alt={step.title} className="w-full h-32 object-cover rounded-xl border border-slate-800" />
                        )}

                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...editableSteps];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setEditableSteps(updated);
                          }}
                          className="w-full bg-[#1E2028] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                        />

                        <textarea
                          value={step.description}
                          onChange={(e) => {
                            const updated = [...editableSteps];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setEditableSteps(updated);
                          }}
                          rows={2}
                          className="w-full bg-[#1E2028] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: NOTIFICATIONS MANAGEMENT */}
              {adminTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-base text-white">
                      {lang === 'ar' ? 'سجل الإشعارات المرسلة للعملاء' : 'Broadcasted Client Notifications'}
                    </h3>
                    <button
                      onClick={() => setNewNotificationModal(true)}
                      className="px-4 py-2 bg-[#81B3B9] text-[#16181E] rounded-xl font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      {t.sendNotification}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {data.notifications.map((n: any) => {
                      const targetClient = data.users.find((u: any) => u.id === n.clientId);
                      return (
                        <div key={n.id} className="bg-[#16181E] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#81B3B9]/15 text-[#81B3B9] font-bold">
                                {n.type}
                              </span>
                              <h4 className="font-bold text-sm text-white">{n.title}</h4>
                            </div>
                            <p className="text-xs text-slate-400">{n.message}</p>
                          </div>
                          <div className="text-left text-xs text-slate-400">
                            <span className="block text-[#81B3B9] font-bold">
                              {n.clientId === 'all' ? 'جميع العملاء' : targetClient?.name || n.clientId}
                            </span>
                            <span className="text-[10px]">{n.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: SUPPORT TICKETS */}
              {adminTab === 'tickets' && (
                <div className="space-y-4">
                  <h3 className="font-black text-base text-white mb-4">
                    {lang === 'ar' ? 'إدارة طلبات الدعم الفني للعملاء' : 'Client Support Requests'}
                  </h3>
                  <div className="space-y-3">
                    {data.tickets.map((tkt: any) => (
                      <div key={tkt.id} className="bg-[#16181E] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-bold text-[#81B3B9]">#{tkt.id}</span>
                            <h4 className="font-bold text-sm text-white">{tkt.subject}</h4>
                          </div>
                          <p className="text-xs text-slate-400">{tkt.clientName} • {tkt.systemName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                            tkt.status === 'resolved'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : tkt.status === 'in_progress'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-blue-500/15 text-blue-400'
                          }`}>
                            {tkt.status === 'resolved' ? 'تم الحل' : tkt.status === 'in_progress' ? 'قيد المعالجة' : 'جديد'}
                          </span>
                          <button
                            onClick={() => {
                              setActiveTicket(tkt);
                              setActiveTab('support');
                            }}
                            className="px-4 py-1.5 bg-[#81B3B9] text-[#16181E] rounded-xl font-bold text-xs"
                          >
                            {lang === 'ar' ? 'فتح والرد' : 'Open & Reply'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: AUDIT LOGS */}
              {adminTab === 'logs' && (
                <div className="space-y-3">
                  <h3 className="font-black text-base text-white mb-4">
                    {lang === 'ar' ? 'سجل العمليات الإدارية والأمنية' : 'Administrative Security Audit Logs'}
                  </h3>
                  {data.auditLogs.map((log: any) => (
                    <div key={log.id} className="bg-[#16181E] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-[#81B3B9] ml-2">{log.action}:</strong>
                        <span className="text-slate-200">{log.details}</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1E2028] border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-400">
        <p>{t.footerText}</p>
      </footer>

      {/* ====================================================================
          MODALS (Add Client, Add System, Publish Targeted Update, Notification, Ticket)
         ==================================================================== */}

      {/* 1. NEW CLIENT MODAL */}
      {newClientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E2028] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">{t.addClient}</h3>
              <button onClick={() => setNewClientModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">اسم العميل / الجهة</label>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="مثال: شركة الصقر للحلول"
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">اسم الشركة الرسمي</label>
                <input
                  type="text"
                  value={clientForm.company}
                  onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
                  placeholder="Al Saqr Solutions Co."
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">البريد الإلكتروني لتسجيل الدخول</label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  placeholder="client@company.com"
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">كلمة المرور / كود الدخول الخاص بالعميل</label>
                <input
                  type="text"
                  value={clientForm.accessCode}
                  onChange={(e) => setClientForm({ ...clientForm, accessCode: e.target.value })}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  required
                />
              </div>
              <button type="submit" className="w-full py-3 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs">
                إنشاء حساب العميل وحفظه في قاعدة البيانات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. NEW SYSTEM MODAL */}
      {newSystemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E2028] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">{t.addSystem}</h3>
              <button onClick={() => setNewSystemModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSystem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">اسم النظام البرمجي</label>
                  <input
                    type="text"
                    value={systemForm.name}
                    onChange={(e) => setSystemForm({ ...systemForm, name: e.target.value })}
                    placeholder="Akasha Smart POS"
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">رمز النظام (Code)</label>
                  <input
                    type="text"
                    value={systemForm.code}
                    onChange={(e) => setSystemForm({ ...systemForm, code: e.target.value })}
                    placeholder="AK-POS-300"
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">ربط النظام بالعميل المحدد</label>
                <select
                  value={systemForm.clientId}
                  onChange={(e) => setSystemForm({ ...systemForm, clientId: e.target.value })}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  required
                >
                  <option value="">اختر حساب العميل...</option>
                  {allClientsList.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">وصف النظام</label>
                <textarea
                  value={systemForm.description}
                  onChange={(e) => setSystemForm({ ...systemForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  required
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqUninstall"
                  checked={systemForm.requiresUninstallOld}
                  onChange={(e) => setSystemForm({ ...systemForm, requiresUninstallOld: e.target.checked })}
                  className="accent-[#81B3B9]"
                />
                <label htmlFor="reqUninstall" className="text-xs text-slate-300 cursor-pointer">
                  هل يحتاج العميل إلى حذف الإصدار القديم قبل تثبيت التحديث؟
                </label>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">تعليمات التحديث المخصصة لهذا النظام</label>
                <textarea
                  value={systemForm.customUpdateInstructions}
                  onChange={(e) => setSystemForm({ ...systemForm, customUpdateInstructions: e.target.value })}
                  rows={2}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs">
                حفظ النظام وربطه بحساب العميل
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. NEW TARGETED UPDATE / RELEASE MODAL */}
      {newUpdateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E2028] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">{t.publishUpdate}</h3>
              <button onClick={() => setNewUpdateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">اختر النظام البرمجي</label>
                  <select
                    value={updateForm.systemId}
                    onChange={(e) => {
                      const sysId = e.target.value;
                      const sys = data.systems.find((s: any) => s.id === sysId);
                      setUpdateForm({
                        ...updateForm,
                        systemId: sysId,
                        // Automatically pre-select the owning client of this system!
                        targetClientIds: sys?.clientId ? [sys.clientId] : updateForm.targetClientIds
                      });
                    }}
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    required
                  >
                    <option value="">اختر النظام...</option>
                    {data.systems.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">رقم الإصدار (Version)</label>
                  <input
                    type="text"
                    value={updateForm.version}
                    onChange={(e) => setUpdateForm({ ...updateForm, version: e.target.value })}
                    placeholder="v3.6.0"
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Client Targeting Selector */}
              <div className="bg-[#16181E] p-4 rounded-2xl border border-[#81B3B9]/40 space-y-2">
                <label className="block text-xs font-black text-[#81B3B9]">
                  تحديد العملاء الذين سيظهر لهم هذا التحديث فقط:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pt-1">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer bg-[#1E2028] p-2 rounded-lg border border-slate-800">
                    <input
                      type="checkbox"
                      checked={updateForm.targetClientIds.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) setUpdateForm({ ...updateForm, targetClientIds: ['all'] });
                        else setUpdateForm({ ...updateForm, targetClientIds: [] });
                      }}
                      className="accent-[#81B3B9]"
                    />
                    <span className="font-bold">جميع العملاء (All Clients)</span>
                  </label>
                  {allClientsList.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer bg-[#1E2028] p-2 rounded-lg border border-slate-800">
                      <input
                        type="checkbox"
                        checked={updateForm.targetClientIds.includes(c.id)}
                        onChange={(e) => {
                          let ids = updateForm.targetClientIds.filter((id) => id !== 'all');
                          if (e.target.checked) ids.push(c.id);
                          else ids = ids.filter((id) => id !== c.id);
                          setUpdateForm({ ...updateForm, targetClientIds: ids });
                        }}
                        className="accent-[#81B3B9]"
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">وصف التحديث</label>
                <textarea
                  value={updateForm.description}
                  onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">الميزات الجديدة (كل ميزة في سطر)</label>
                  <textarea
                    value={updateForm.features}
                    onChange={(e) => setUpdateForm({ ...updateForm, features: e.target.value })}
                    rows={3}
                    placeholder="إضافة تقارير ذكية..."
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">الأخطاء التي تم إصلاحها (كل إصلاح في سطر)</label>
                  <textarea
                    value={updateForm.bugFixes}
                    onChange={(e) => setUpdateForm({ ...updateForm, bugFixes: e.target.value })}
                    rows={3}
                    placeholder="إصلاح سرعة المزامنة..."
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Upload Installer File or URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">رفع ملف التحديث (EXE / ZIP)</label>
                  <label className="cursor-pointer w-full bg-[#16181E] border border-dashed border-[#81B3B9]/50 rounded-xl px-3.5 py-2.5 text-xs text-[#81B3B9] flex items-center justify-center gap-2 hover:bg-slate-800/50">
                    <Upload className="w-4 h-4" />
                    <span className="truncate">{updateForm.fileName || 'اختر ملف التثبيت من جهازك'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUpdateFileUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">أو رابط تنزيل مباشر (اختياري)</label>
                  <input
                    type="text"
                    value={updateForm.downloadUrl}
                    onChange={(e) => setUpdateForm({ ...updateForm, downloadUrl: e.target.value })}
                    placeholder="اتركه فارغاً لتوليد حزمة تلقائية"
                    className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs shadow-lg">
                نشر التحديث وإشعار العملاء المحددين فقط
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. NEW NOTIFICATION MODAL */}
      {newNotificationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E2028] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">{t.sendNotification}</h3>
              <button onClick={() => setNewNotificationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateNotification} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">نوع الإشعار</label>
                <select
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="update">توفر تحديث جديد</option>
                  <option value="feature">إضافة ميزة جديدة</option>
                  <option value="bugfix">إصلاح مشكلة تقنية</option>
                  <option value="maintenance">صيانة مجدولة</option>
                  <option value="file">توفر ملف جديد للتحميل</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">العميل المستهدف</label>
                <select
                  value={notificationForm.clientId}
                  onChange={(e) => setNotificationForm({ ...notificationForm, clientId: e.target.value })}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="all">جميع العملاء</option>
                  {allClientsList.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">عنوان الإشعار</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">نص الإشعار</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  rows={3}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  required
                />
              </div>
              <button type="submit" className="w-full py-3 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs">
                إرسال الإشعار الآن
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. NEW SUPPORT TICKET MODAL (With Problem Screenshot Attachment) */}
      {newTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E2028] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">{t.newTicket}</h3>
              <button onClick={() => setNewTicketModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">النظام المتعلق بالطلب</label>
                <select
                  value={ticketForm.systemId}
                  onChange={(e) => setTicketForm({ ...ticketForm, systemId: e.target.value })}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  required
                >
                  <option value="">اختر النظام...</option>
                  {clientSystems.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">{t.subject}</label>
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">{t.description}</label>
                <textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">إرفاق صورة للمشكلة (اختياري)</label>
                <label className="cursor-pointer w-full bg-[#16181E] border border-dashed border-slate-700 rounded-xl p-3 text-xs text-slate-300 flex items-center justify-center gap-2 hover:border-[#81B3B9]">
                  <ImageIcon className="w-4 h-4 text-[#81B3B9]" />
                  <span>{ticketForm.attachmentUrl ? 'تم إرفاق الصورة بنجاح' : 'اضغط لرفع لقطة شاشة للمشكلة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleTicketImageUpload(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <button type="submit" className="w-full py-3 bg-[#81B3B9] text-[#16181E] rounded-xl font-black text-xs">
                إرسال طلب الدعم الفني
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
