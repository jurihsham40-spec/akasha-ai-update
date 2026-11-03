/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Upload, Search, FileText, Lock, Check, X, AlertCircle, Sparkles
} from 'lucide-react';
import { db, collection, addDoc, getDocs, query, where, serverTimestamp } from './firebase';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [foundFile, setFoundFile] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', fileData: '' });

  const isRouteAdmin = window.location.pathname === '/admin';

  const handleAdminLogin = () => {
    if (password === 'admin123') {
      setIsAdmin(true);
      fetchFiles();
    } else {
      alert('كلمة مرور خاطئة');
    }
  };

  const fetchFiles = async () => {
    const q = collection(db, 'files');
    const snapshot = await getDocs(q);
    setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await addDoc(collection(db, 'files'), {
      ...uploadForm,
      code,
      createdAt: serverTimestamp()
    });
    setUploadForm({ name: '', description: '', fileData: '' });
    fetchFiles();
    alert('تم رفع الملف بنجاح! كود الملف: ' + code);
  };

  const handleSearch = async () => {
    const q = query(collection(db, 'files'), where('code', '==', searchCode.toUpperCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      setFoundFile(snapshot.docs[0].data());
    } else {
      alert('كود الملف غير صحيح');
      setFoundFile(null);
    }
  };

  if (isRouteAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#16181E] flex items-center justify-center p-4">
        <div className="bg-[#1E2028] p-8 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-sm space-y-4">
          <h2 className="text-xl font-bold text-white">دخول المدير</h2>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-white" />
          <button onClick={handleAdminLogin} className="w-full py-3 bg-[#81B3B9] rounded-xl font-bold">دخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#16181E] text-slate-100 p-8">
      {isRouteAdmin ? (
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-white">لوحة تحكم المدير</h1>
          
          <div className="bg-[#1E2028] p-6 rounded-3xl border border-slate-700 space-y-4">
            <h2 className="text-xl font-bold text-white">تعديل بروفايل المدير</h2>
            <input type="text" placeholder="الاسم الجديد" className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-white" />
            <input type="file" className="text-white" />
            <button className="py-2 px-4 bg-emerald-600 rounded-xl font-bold">حفظ التغييرات</button>
          </div>

          <form onSubmit={handleUpload} className="bg-[#1E2028] p-6 rounded-3xl border border-slate-700 space-y-4">
            <h2 className="text-xl font-bold text-white">رفع ملف جديد</h2>
            <input type="text" value={uploadForm.name} onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})} placeholder="اسم الملف" className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-white" required />
            <textarea value={uploadForm.description} onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})} placeholder="وصف الملف" className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-white" />
            <input type="file" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setUploadForm({...uploadForm, fileData: reader.result as string});
                reader.readAsDataURL(file);
              }
            }} className="text-white" required />
            <button type="submit" className="w-full py-3 bg-[#81B3B9] rounded-xl font-bold">رفع الملف</button>
          </form>
          <div className="grid gap-4">
            {files.map(f => (
              <div key={f.id} className="bg-[#1E2028] p-4 rounded-xl border border-slate-700 flex justify-between">
                <span>{f.name} - كود: {f.code}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto text-center space-y-8 mt-20">
          <h1 className="text-4xl font-black text-white">AKASHA AI</h1>
          <div className="bg-[#1E2028] p-6 rounded-3xl border border-slate-700 space-y-4">
            <input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="أدخل كود الملف" className="w-full bg-[#16181E] border border-slate-700 rounded-xl px-4 py-3 text-center text-white" />
            <button onClick={handleSearch} className="w-full py-3 bg-[#81B3B9] rounded-xl font-bold">بحث</button>
          </div>
          {foundFile && (
            <div className="bg-[#1E2028] p-6 rounded-3xl border border-slate-700 space-y-4 text-left">
              <h2 className="text-xl font-bold text-white">{foundFile.name}</h2>
              <p className="text-slate-400">{foundFile.description}</p>
              <a href={foundFile.fileData} download={foundFile.name} className="inline-block py-2 px-4 bg-emerald-600 rounded-xl font-bold">تحميل</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
