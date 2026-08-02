import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Users, 
  Database, 
  Sun, 
  Moon, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  Lock, 
  Check, 
  Type,
  Loader,
  AlertTriangle,
  Mail,
  Clock,
  FileText,
  Printer,
  Download,
  Bell,
  Sparkles
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import * as api from '../api';

const ADMIN_TABS = [
  { id: 'general', icon: Settings, label: 'General' },
  { id: 'users', icon: Users, label: 'Workers' },
  { id: 'automations', icon: Clock, label: 'Automations' },
  { id: 'reports', icon: FileText, label: 'Reports' },
  { id: 'backup', icon: Database, label: 'Backup' },
];

export default function AdminMenu({
  open,
  onClose,
  userRole,
  username,
  currentUserEmail,
  onUpdateEmail,
  isDark,
  onToggleDark,
  textSize,
  onTextSizeChange,
  users,
  crops = [],
  finance = [],
  tasks = [],
  refreshData,
  showAlert,
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);

  // Email state & Secure Code Verification
  const [myEmail, setMyEmail] = useState(currentUserEmail || '');
  const [emailMsg, setEmailMsg] = useState(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  // Password Form States & Secure Code Verification
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [pwCode, setPwCode] = useState('');
  const [pwCodeSent, setPwCodeSent] = useState(false);
  const [pwVerifyMethod, setPwVerifyMethod] = useState('password'); // 'password' or 'email'

  // New Worker Form States
  const [workerForm, setWorkerForm] = useState({ username: '', email: '', password: '', role: 'worker' });
  const [resetWorkerId, setResetWorkerId] = useState(null);
  const [workerNewPw, setWorkerNewPw] = useState('');
  const [workerNewUsername, setWorkerNewUsername] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Automations & Alerts State
  const [autoSettings, setAutoSettings] = useState({
    cron_enabled: true,
    schedule: '0 8 * * *',
    alert_soil: true,
    alert_finance: true,
    alert_tasks: true,
    recipient: ''
  });
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [autoMsg, setAutoMsg] = useState(null);

  // Fetch automations when switching tabs
  useEffect(() => {
    if (open && activeTab === 'automations') {
      setLoadingAuto(true);
      api.getAutomations()
        .then(res => {
          setAutoSettings(res.data);
        })
        .catch(err => {
          console.error("Failed to load automations:", err);
        })
        .finally(() => {
          setLoadingAuto(false);
        });
    }
  }, [open, activeTab]);

  useEffect(() => {
    if (open) {
      setActiveTab('general');
      setCurPw('');
      setNewPw('');
      setPwMsg(null);
      setPwCode('');
      setPwCodeSent(false);
      setPwVerifyMethod('password');
      setMyEmail(currentUserEmail || '');
      setEmailMsg(null);
      setEmailCode('');
      setEmailCodeSent(false);
      setWorkerForm({ username: '', email: '', password: '', role: 'worker' });
      setResetWorkerId(null);
      setWorkerNewPw('');
      setWorkerNewUsername('');
      setAdminConfirmPassword('');
      setAutoMsg(null);
    }
  }, [open, currentUserEmail]);

  // Lock body scrolling when modal open (prevent background scroll bleed)
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body._adminScrollY = scrollY;
    
    return () => {
      const sy = document.body._adminScrollY || 0;
      document.documentElement.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, sy);
    };
  }, [open]);

  if (!open) return null;

  const isAdmin = userRole === 'admin';

  // --- Password Change ---
  const handleRequestPwCode = async () => {
    setPwMsg(null);
    setSubmitting(true);
    try {
      await api.requestProfileCode();
      setPwCodeSent(true);
      setPwMsg({ type: 'ok', text: 'Verification authorization code has been successfully sent to your email.' });
    } catch (err) {
      setPwMsg({ type: 'err', text: err.response?.data?.detail || 'Failed to deliver code.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (!curPw || !newPw) {
      return setPwMsg({ type: 'err', text: 'Please fill out both fields.' });
    }
    if (newPw.length < 4) {
      return setPwMsg({ type: 'err', text: 'New password must be at least 4 characters.' });
    }
    if (!pwCode) {
      return setPwMsg({ type: 'err', text: 'Verification code is mandatory. Please request a code and input it.' });
    }
    setSubmitting(true);
    try {
      await api.changePassword(curPw, newPw, pwCode);
      setCurPw('');
      setNewPw('');
      setPwCode('');
      setPwCodeSent(false);
      setPwMsg({ type: 'ok', text: 'Administrative access password updated successfully!' });
    } catch (err) {
      setPwMsg({ type: 'err', text: err.response?.data?.detail || 'Failed to update password.' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Email Change ---
  const handleRequestEmailCode = async () => {
    setEmailMsg(null);
    setSubmitting(true);
    try {
      await api.requestProfileCode();
      setEmailCodeSent(true);
      setEmailMsg({ type: 'ok', text: 'Verification authorization code has been successfully sent to your email.' });
    } catch (err) {
      setEmailMsg({ type: 'err', text: err.response?.data?.detail || 'Failed to deliver code.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!myEmail.trim()) {
      return setEmailMsg({ type: 'err', text: 'Email cannot be empty.' });
    }
    if (!emailCode) {
      return setEmailMsg({ type: 'err', text: 'Verification code is mandatory. Please request a code and input it.' });
    }
    setSubmitting(true);
    setEmailMsg(null);
    try {
      await api.updateMe(myEmail, emailCode);
      setEmailMsg({ type: 'ok', text: 'Administrator profile email updated successfully!' });
      setEmailCode('');
      setEmailCodeSent(false);
      if (onUpdateEmail) {
        onUpdateEmail(myEmail);
      }
    } catch (err) {
      setEmailMsg({ type: 'err', text: err.response?.data?.detail || 'Failed to update email.' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Automations Settings ---
  const handleSaveAutomations = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAutoMsg(null);
    try {
      await api.saveAutomations(autoSettings);
      setAutoMsg({ type: 'ok', text: 'Automation configurations successfully saved to the database!' });
    } catch (err) {
      setAutoMsg({ type: 'err', text: err.response?.data?.detail || 'Failed to save automation configurations.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerImmediateDigest = async () => {
    setSubmitting(true);
    setAutoMsg(null);
    try {
      const res = await api.triggerImmediateDigest();
      setAutoMsg({ type: 'ok', text: res.data.message || 'Immediate email digest dispatched successfully!' });
    } catch (err) {
      setAutoMsg({ type: 'err', text: err.response?.data?.detail || 'Failed to dispatch email digest.' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- PDF Reports Generation & Printing ---
  const handleExportPDF = (type, cropId = null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert("Popup blocker active! Please allow popups to export PDF reports.", true);
      return;
    }

    let reportTitle = "";
    let reportContentHTML = "";

    if (type === 'monthly') {
      reportTitle = "Monthly Agricultural Operations Digest";
      const totalIncomeVal = finance.filter(f => f.type === 'income').reduce((sum, item) => sum + item.amount, 0);
      const totalExpenseVal = finance.filter(f => f.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
      const netVal = totalIncomeVal - totalExpenseVal;

      reportContentHTML = `
        <div class="summary-box">
          <h3>Ledger Overview</h3>
          <p><strong>Total Income:</strong> $${totalIncomeVal.toLocaleString()}</p>
          <p><strong>Total Expenses:</strong> $${totalExpenseVal.toLocaleString()}</p>
          <p><strong>Net Operational Profit:</strong> <span style="color: ${netVal >= 0 ? '#16a34a' : '#dc2626'}">$${netVal.toLocaleString()}</span></p>
        </div>
        
        <h3>Finances Ledger Statement</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th>Notes</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${finance.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No financial logs stored in system.</td></tr>' : finance.map(f => `
              <tr>
                <td><strong>${f.category}</strong></td>
                <td style="color: ${f.type === 'income' ? '#16a34a' : '#dc2626'}; font-weight: bold; text-transform: uppercase;">${f.type}</td>
                <td>${f.notes || ''}</td>
                <td><strong>$${f.amount.toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>Care & Health Duties Roster</h3>
        <table>
          <thead>
            <tr>
              <th>Assigned Title</th>
              <th>Worker Operative</th>
              <th>Due Date</th>
              <th>Roster Status</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No scheduled care rosters stored.</td></tr>' : tasks.map(t => `
              <tr>
                <td>${t.title}</td>
                <td>${t.assigned_to || 'Unassigned / Broadcasted'}</td>
                <td>${t.due_date || 'Ongoing Care'}</td>
                <td style="font-weight: bold; color: ${t.status === 'Completed' ? '#16a34a' : '#ea580c'};">${t.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'seasonal') {
      reportTitle = "Seasonal Harvest & Yield Analytics";
      const totalYield = crops.reduce((sum, c) => sum + (Number(c.yield_kg) || 0), 0);
      const growingCrops = crops.filter(c => c.status === 'Growing').length;
      const harvestedCrops = crops.filter(c => c.status === 'Completed' || c.status === 'Harvesting').length;

      reportContentHTML = `
        <div class="summary-box">
          <h3>Harvest Overview</h3>
          <p><strong>Total Harvested Yield:</strong> ${totalYield.toLocaleString()} kg</p>
          <p><strong>Active Crops in Ground:</strong> ${growingCrops} sectors</p>
          <p><strong>Completed Cycles:</strong> ${harvestedCrops} batches</p>
        </div>
        
        <h3>Crops Register</h3>
        <table>
          <thead>
            <tr>
              <th>Crop Name</th>
              <th>Variety</th>
              <th>Field / Plot</th>
              <th>Plant Date</th>
              <th>Roster Status</th>
              <th>Harvest Yield</th>
            </tr>
          </thead>
          <tbody>
            ${crops.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No crop cycles registered in database.</td></tr>' : crops.map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.variety || 'Standard'}</td>
                <td>${c.field || 'N/A'}</td>
                <td>${c.plant_date || 'N/A'}</td>
                <td>${c.status}</td>
                <td><strong>${c.yield_kg ? `${c.yield_kg.toLocaleString()} kg` : '0 kg'}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'crop') {
      const crop = crops.find(c => c._id === cropId);
      if (!crop) return;
      reportTitle = `Crop Cycle Report: ${crop.name}`;
      
      const cropExpenses = finance.filter(f => f.crop_id === crop._id);
      const totalExpenses = cropExpenses.reduce((sum, item) => sum + item.amount, 0);

      reportContentHTML = `
        <div class="summary-box">
          <h3>Cycle Specifications</h3>
          <p><strong>Crop Name:</strong> ${crop.name}</p>
          <p><strong>Variety:</strong> ${crop.variety || 'N/A'}</p>
          <p><strong>Sector Field:</strong> ${crop.field || 'N/A'}</p>
          <p><strong>Planting Date:</strong> ${crop.plant_date || 'N/A'}</p>
          <p><strong>Harvest Date:</strong> ${crop.harvest_date || 'N/A'}</p>
          <p><strong>Growth Status:</strong> ${crop.status}</p>
          <p><strong>Total Yield:</strong> ${crop.yield_kg ? `${crop.yield_kg.toLocaleString()} kg` : '0 kg'}</p>
          <p><strong>Direct Expenses Logged:</strong> $${totalExpenses.toLocaleString()}</p>
        </div>

        <h3>Crop Ledger Log</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${cropExpenses.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#64748b;">No financial entries linked to this crop cycle.</td></tr>' : cropExpenses.map(e => `
              <tr>
                <td><strong>${e.category}</strong></td>
                <td><strong>$${e.amount.toLocaleString()}</strong></td>
                <td>${e.notes || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            margin: 45px;
            font-size: 13.5px;
            line-height: 1.6;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand-title {
            font-size: 26px;
            font-weight: 800;
            color: #14532d;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #15803d;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: bold;
            margin: 4px 0 0 0;
          }
          .report-meta {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .report-heading {
            font-size: 20px;
            font-weight: 800;
            color: #1e293b;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .summary-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .summary-box h3 {
            color: #14532d;
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 15px;
          }
          .summary-box p {
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
          }
          tr:hover {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { margin: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div>
            <h1 class="brand-title">Usman Agri Farm</h1>
            <p class="brand-subtitle">Advanced Crop Management System</p>
          </div>
          <div class="report-meta">
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Authority:</strong> System Administrator</p>
          </div>
        </div>

        <h2 class="report-heading">${reportTitle}</h2>
        ${reportContentHTML}

        <div class="footer">
          <p>© ${new Date().getFullYear()} Usman Agri Farm Command Hub. This document is system-generated and verified for official farming operations.</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- Add Worker ---
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!workerForm.username || !workerForm.password) {
      return showAlert("Please complete all required fields.", true);
    }
    if (workerForm.role === 'admin' && !workerForm.email) {
      return showAlert("Email address is mandatory for administrator accounts.", true);
    }
    setSubmitting(true);
    try {
      const emailVal = workerForm.role === 'admin' ? workerForm.email : "";
      await api.signup(workerForm.username, emailVal, workerForm.password, workerForm.role);
      showAlert(`Account '${workerForm.username}' registered successfully!`);
      setWorkerForm({ username: '', email: '', password: '', role: 'worker' });
      refreshData();
    } catch (err) {
      showAlert(err.response?.data?.detail || "Failed to register account.", true);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Admin Edit Worker Profile (Username and Password) ---
  const handleEditWorkerProfile = async (id, oldName) => {
    if (!workerNewUsername.trim()) {
      return showAlert("Username cannot be empty.", true);
    }
    if (!adminConfirmPassword) {
      return showAlert("Please enter your current administrator password to confirm.", true);
    }
    setSubmitting(true);
    setActionId(id);
    try {
      await api.editWorkerProfile(id, workerNewUsername, workerNewPw, adminConfirmPassword);
      showAlert(`Profile for operative '${oldName}' updated successfully!`);
      setResetWorkerId(null);
      setWorkerNewPw('');
      setWorkerNewUsername('');
      setAdminConfirmPassword('');
      refreshData();
    } catch (err) {
      showAlert(err.response?.data?.detail || "Failed to update profile.", true);
    } finally {
      setSubmitting(false);
      setActionId(null);
    }
  };

  // --- Delete User ---
  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this worker account? They will lose access immediately.")) return;
    setActionId(id);
    try {
      await api.deleteUser(id);
      showAlert("Worker account deleted successfully.");
      refreshData();
    } catch (err) {
      showAlert(err.response?.data?.detail || "Failed to delete user.", true);
    } finally {
      setActionId(null);
    }
  };

  // --- Backup Export ---
  const handleExportBackup = async () => {
    try {
      const res = await api.getBackup();
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agrifarm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showAlert("JSON Database Backup exported successfully!");
    } catch (err) {
      showAlert("Backup export failed.", true);
    }
  };

  // --- Backup Restore ---
  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Restore database from file? Warning: This will overwrite all your current farm data!")) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse(event.target.result);
        await api.restoreBackup(payload);
        showAlert("Database restored successfully!");
        refreshData();
      } catch (err) {
        showAlert("Database restore failed. Ensure valid JSON structure.", true);
      }
    };
    reader.readAsText(file);
  };

  const filteredTabs = ADMIN_TABS.filter(tab => {
    if (!isAdmin && tab.id !== 'general') return false;
    return true;
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-800 dark:text-slate-100"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-farm-900/20 text-farm-500 dark:text-farm-400 rounded-xl">
                  {isAdmin ? <Settings size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {isAdmin ? "Settings & Admin Hub" : "Worker Operations Hub"}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {isAdmin ? "Control Panel" : "Standard Access Portal"}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inner Tabs Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 shrink-0 select-none custom-scrollbar bg-slate-50 dark:bg-slate-900/40">
              {filteredTabs.map(({ id, icon: Icon, label }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition cursor-pointer whitespace-nowrap shrink-0 border ${
                      active
                        ? 'bg-farm-600 border-farm-500 text-white shadow-sm'
                        : 'bg-white dark:bg-[#1a2333] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ─── TAB: GENERAL ─── */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Theme Presets */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Sun size={14} /> Active Theme Presets
                    </h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onToggleDark(false)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          !isDark 
                            ? 'bg-farm-600 border-farm-500 text-white' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        Light Mode
                      </button>
                      <button 
                        onClick={() => onToggleDark(true)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-farm-600 border-farm-500 text-white' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        Dark Mode
                      </button>
                    </div>
                  </div>

                  {/* Typography Settings */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Type size={14} /> Typography Font Scaling
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {['sm', 'base', 'md', 'lg'].map(size => (
                        <button 
                          key={size}
                          onClick={() => onTextSizeChange(size)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            textSize === size 
                              ? 'bg-farm-600 border-farm-500 text-white' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {size === 'sm' ? "Small" : size === 'base' ? "Normal" : size === 'md' ? "Medium" : "Large"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Administrator Profile Email Form */}
                  {isAdmin && (
                    <form onSubmit={handleUpdateEmail} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Mail size={14} /> Administrator Email
                      </h4>
                      {emailMsg && (
                        <div className={`p-3 rounded-lg text-xs border ${
                          emailMsg.type === 'ok' ? 'bg-farm-950/40 border-farm-500 text-farm-300' : 'bg-red-950/40 border-red-500 text-red-300'
                        }`}>
                          {emailMsg.text}
                        </div>
                      )}
                      
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                          <input 
                            type="email"
                            className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:border-farm-500 transition-colors"
                            placeholder="admin@farm.com"
                            value={myEmail}
                            onChange={e => setMyEmail(e.target.value)}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={handleRequestEmailCode}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-all h-8 cursor-pointer flex items-center gap-1 shrink-0"
                          disabled={submitting}
                        >
                          {submitting ? <Loader size={12} className="animate-spin" /> : <Clock size={12} />} Request Code
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">6-Digit Verification Code *</label>
                        <input 
                          type="text"
                          maxLength={6}
                          className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:border-farm-500 transition-colors"
                          placeholder="e.g. 123456"
                          value={emailCode}
                          onChange={e => setEmailCode(e.target.value)}
                        />
                      </div>

                      <button 
                        type="submit"
                        className="px-4 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer"
                        disabled={submitting}
                      >
                        {submitting ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} Update Email
                      </button>
                    </form>
                  )}

                  {/* Account Password change Form */}
                  {isAdmin ? (
                    <form onSubmit={handleChangePw} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Lock size={14} /> Change Access Password
                        </h4>
                        <button 
                          type="button"
                          onClick={() => {
                            setPwVerifyMethod(pwVerifyMethod === 'password' ? 'email' : 'password');
                            setCurPw('');
                            setPwCode('');
                          }}
                          className="text-[10px] font-bold text-farm-600 hover:text-farm-500 uppercase tracking-wider underline cursor-pointer"
                        >
                          Verify via {pwVerifyMethod === 'password' ? 'Email Code' : 'Current Password'}
                        </button>
                      </div>
                      {pwMsg && (
                        <div className={`p-3 rounded-lg text-xs border ${
                          pwMsg.type === 'ok' ? 'bg-farm-950/40 border-farm-500 text-farm-300' : 'bg-red-950/40 border-red-500 text-red-300'
                        }`}>
                          {pwMsg.text}
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {pwVerifyMethod === 'password' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Current Password *</label>
                              <input 
                                required
                                type="password"
                                className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:border-farm-500 transition-colors"
                                placeholder="••••••••"
                                value={curPw}
                                onChange={e => setCurPw(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">New Password *</label>
                              <input 
                                required
                                type="password"
                                className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:border-farm-500 transition-colors"
                                placeholder="Min 4 characters"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">New Password *</label>
                              <input 
                                required
                                type="password"
                                className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:border-farm-500 transition-colors"
                                placeholder="Min 4 characters"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                              />
                            </div>
                            
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">6-Digit Verification Code *</label>
                                <input 
                                  required
                                  type="text"
                                  maxLength={6}
                                  className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs outline-none focus:border-farm-500 transition-colors"
                                  placeholder="e.g. 123456"
                                  value={pwCode}
                                  onChange={e => setPwCode(e.target.value)}
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={handleRequestPwCode}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-all h-8 cursor-pointer flex items-center gap-1 shrink-0"
                                disabled={submitting}
                              >
                                {submitting ? <Loader size={12} className="animate-spin" /> : <Clock size={12} />} Request Code
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        type="submit"
                        className="px-4 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer"
                        disabled={submitting}
                      >
                        {submitting ? <Loader size={14} className="animate-spin" /> : <Lock size={14} />} Update Password
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 flex items-center gap-3 text-slate-500 dark:text-slate-400">
                      <Lock size={18} />
                      <p className="text-xs font-semibold leading-relaxed">
                        Your password can only be updated or reset by the System Administrator.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: USERS ─── */}
              {activeTab === 'users' && (
                <div className="space-y-6 animate-fade-in">
                  {isAdmin ? (
                    <>
                      {/* Register Worker Account */}
                      <form onSubmit={handleAddWorker} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <UserPlus size={14} /> Register New Worker Account
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Username *</label>
                            <input 
                              required
                              className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white"
                              placeholder="e.g. johan"
                              value={workerForm.username}
                              onChange={e => setWorkerForm({...workerForm, username: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Password *</label>
                            <input 
                              required
                              type="password"
                              className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white"
                              placeholder="Min 4 characters"
                              value={workerForm.password}
                              onChange={e => setWorkerForm({...workerForm, password: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        {workerForm.role === 'admin' && (
                          <div className="animate-fade-in">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Email Address (Mandatory for Admin) *</label>
                            <input 
                              required
                              type="email"
                              className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white"
                              placeholder="e.g. admin_email@farm.com"
                              value={workerForm.email || ''}
                              onChange={e => setWorkerForm({...workerForm, email: e.target.value})}
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Access Level Role</label>
                          <select 
                            className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white font-medium cursor-pointer"
                            value={workerForm.role}
                            onChange={e => setWorkerForm({...workerForm, role: e.target.value})}
                          >
                            <option value="worker">Worker (Standard Access)</option>
                            <option value="admin">Administrator (Command Access)</option>
                          </select>
                        </div>

                        <button 
                          type="submit"
                          className="px-4 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer"
                          disabled={submitting}
                        >
                          {submitting ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />} Register Worker
                        </button>
                      </form>

                      {/* Worker registries listing */}
                      <div className="space-y-3">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Registered Operatives ({users.length})</p>
                        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-900/10 dark:bg-[#151d30]/20">
                          {users.map(u => (
                            <div key={u._id} className="flex flex-col p-4 space-y-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                                    {u.username} 
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 ml-2">{u.role}</span>
                                  </p>
                                  {u.email && <p className="text-xs text-slate-500">{u.email}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                  {u.username !== 'admin' && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          if (resetWorkerId === u._id) {
                                            setResetWorkerId(null);
                                          } else {
                                            setResetWorkerId(u._id);
                                            setWorkerNewUsername(u.username);
                                            setWorkerNewPw('');
                                            setAdminConfirmPassword('');
                                          }
                                        }}
                                        className={`p-2 rounded-lg cursor-pointer ${
                                          resetWorkerId === u._id 
                                            ? 'text-farm-500 bg-farm-900/10' 
                                            : 'text-slate-400 hover:text-farm-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                        title="Edit Profile"
                                      >
                                        <Settings size={15} />
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleDeleteUser(u._id)} 
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                        disabled={actionId === u._id}
                                      >
                                        {actionId === u._id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={15} />}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Inline Profile Edit Box */}
                              {resetWorkerId === u._id && (
                                <div className="space-y-3 bg-slate-900/10 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800/80 animate-fade-in">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Edit Operative Profile</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">New Username</label>
                                      <input 
                                        type="text"
                                        className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white font-medium"
                                        placeholder="New username"
                                        value={workerNewUsername}
                                        onChange={e => setWorkerNewUsername(e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">New Password (Optional)</label>
                                      <input 
                                        type="password"
                                        className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white"
                                        placeholder="Leave blank to keep current"
                                        value={workerNewPw}
                                        onChange={e => setWorkerNewPw(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                      <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Your Admin Current Password *</label>
                                      <input 
                                        type="password"
                                        className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white"
                                        placeholder="Enter your password to authorize"
                                        value={adminConfirmPassword}
                                        onChange={e => setAdminConfirmPassword(e.target.value)}
                                      />
                                    </div>
                                    <button 
                                      onClick={() => handleEditWorkerProfile(u._id, u.username)}
                                      className="px-4 py-1.5 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer h-[30px]"
                                      disabled={submitting}
                                    >
                                      {submitting && actionId === u._id ? <Loader size={12} className="animate-spin" /> : <Check size={14} />} Save
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-slate-500 flex items-center gap-3">
                      <ShieldCheck size={20} />
                      <p className="text-xs font-medium">Worker account access level detected. Worker registry management panel is restricted to Administrators.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: AUTOMATIONS ─── */}
              {activeTab === 'automations' && (
                <div className="space-y-6 animate-fade-in">
                  {isAdmin ? (
                    <form onSubmit={handleSaveAutomations} className="space-y-6">
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Clock className="text-farm-500" size={14} /> Automated Email Alert & Digests
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Configure scheduled system tasks (cronjobs) that automatically calculate harvest yields, ledger flows, and scheduled water/fertilizer rosters, emailing them directly as a PDF digest.</p>
                        
                        {autoMsg && (
                          <div className={`p-3 rounded-lg text-xs border ${
                            autoMsg.type === 'ok' ? 'bg-farm-950/40 border-farm-500 text-farm-300' : 'bg-red-950/40 border-red-500 text-red-300'
                          }`}>
                            {autoMsg.text}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            id="cron_enabled"
                            className="w-4 h-4 text-farm-600 border-slate-300 dark:border-slate-700 rounded focus:ring-farm-500 cursor-pointer"
                            checked={autoSettings.cron_enabled}
                            onChange={e => setAutoSettings({...autoSettings, cron_enabled: e.target.checked})}
                          />
                          <label htmlFor="cron_enabled" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Activate Scheduled Cronjob Engine</label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Cron Schedule Interval</label>
                            <select 
                              className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white"
                              value={autoSettings.schedule}
                              onChange={e => setAutoSettings({...autoSettings, schedule: e.target.value})}
                              disabled={!autoSettings.cron_enabled}
                            >
                              <option value="0 8 * * *">Daily Morning (08:00 AM)</option>
                              <option value="0 8 * * 0">Weekly Sunday Summary (08:00 AM)</option>
                              <option value="0 8 1 * *">Monthly Full Ledger (1st at 08:00 AM)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Recipient Alert Emails (Comma-separated for multiple) *</label>
                            <input 
                              type="text"
                              required
                              className="w-full bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white"
                              placeholder="e.g. manager@farm.com, owner@farm.com"
                              value={autoSettings.recipient || ''}
                              onChange={e => setAutoSettings({...autoSettings, recipient: e.target.value})}
                              disabled={!autoSettings.cron_enabled}
                            />
                          </div>
                        </div>

                        <div className="pt-2 space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Include System Triggers</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101625]/20 text-xs cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={autoSettings.alert_soil}
                                onChange={e => setAutoSettings({...autoSettings, alert_soil: e.target.checked})}
                              />
                              <span className="text-slate-700 dark:text-slate-300">Soil Moisture Warnings</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101625]/20 text-xs cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={autoSettings.alert_finance}
                                onChange={e => setAutoSettings({...autoSettings, alert_finance: e.target.checked})}
                              />
                              <span className="text-slate-700 dark:text-slate-300">Ledger Balances Alerts</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101625]/20 text-xs cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={autoSettings.alert_tasks}
                                onChange={e => setAutoSettings({...autoSettings, alert_tasks: e.target.checked})}
                              />
                              <span className="text-slate-700 dark:text-slate-300">Watering Rosters Alerts</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button 
                          type="submit"
                          className="px-5 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-md"
                          disabled={submitting}
                        >
                          {submitting ? <Loader size={14} className="animate-spin" /> : <Check size={14} />} Save Automation Rules
                        </button>
                        
                        <button 
                          type="button"
                          onClick={handleTriggerImmediateDigest}
                          className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-md border border-slate-200 dark:border-slate-700"
                          disabled={submitting}
                        >
                          {submitting ? <Loader size={14} className="animate-spin" /> : <Mail size={14} />} Send Test Alert Now
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-6 text-slate-500 flex items-center gap-3">
                      <ShieldCheck size={20} />
                      <p className="text-xs font-medium">Cronjob automation and triggers configuration is restricted to Administrators.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: REPORTS ─── */}
              {activeTab === 'reports' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="text-farm-500" size={14} /> Official Farm Export Center
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Download and export legal PDF statements containing crop-growing phase analytics, transactional cashflows ledger, and care roster details suitable for printing or physical filing.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Report 1 */}
                      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101625]/20 flex flex-col justify-between space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Monthly Operational Statement</p>
                          <p className="text-[11px] text-slate-500">Fully itemized summary of incomes vs expenses, net operational values, scheduled crop assignments and duties completed.</p>
                        </div>
                        <button 
                          onClick={() => handleExportPDF('monthly')}
                          className="px-3 py-1.5 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 self-start cursor-pointer transition-colors"
                        >
                          <Printer size={13} /> Export PDF Report
                        </button>
                      </div>

                      {/* Report 2 */}
                      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101625]/20 flex flex-col justify-between space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Seasonal Harvest Yield Report</p>
                          <p className="text-[11px] text-slate-500">Includes complete variety registration, planted field dimensions, and aggregate crop yield in kg for the active seasonal cycle.</p>
                        </div>
                        <button 
                          onClick={() => handleExportPDF('seasonal')}
                          className="px-3 py-1.5 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 self-start cursor-pointer transition-colors"
                        >
                          <Printer size={13} /> Export PDF Report
                        </button>
                      </div>
                    </div>

                    {/* Report 3: Crop based exports */}
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101625]/20 space-y-4">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Crop-Specific Cycle Summary</p>
                        <p className="text-[11px] text-slate-500">Select an individual crop sector to generate a complete historical lifecycle report showing its direct ledger expenses, variety status, and projected harvest mass.</p>
                      </div>
                      
                      {crops.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No crop cycles registered yet. Seed or create crops to enable export.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                          <select 
                            id="pdf-crop-select"
                            className="bg-white dark:bg-[#1a2333] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-farm-500 text-slate-900 dark:text-white font-medium cursor-pointer"
                          >
                            {crops.map(c => (
                              <option key={c._id} value={c._id}>{c.name} ({c.field || 'Sector'})</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => {
                              const selectEl = document.getElementById('pdf-crop-select');
                              if (selectEl) handleExportPDF('crop', selectEl.value);
                            }}
                            className="px-3 py-1.5 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Printer size={13} /> Export Crop PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB: BACKUP ─── */}
              {activeTab === 'backup' && (
                <div className="space-y-6 animate-fade-in">
                  {isAdmin ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Export Backup File */}
                      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/10 dark:bg-[#151d30]/30 space-y-3">
                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">Database Backup Export</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">Download a single-file atomic JSON backup containing all crops, financial logs, duties rosters, and worker lists.</p>
                      <button onClick={handleExportBackup} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer">
                        <Database size={14} /> Download JSON Backup
                      </button>
                      </div>

                      {/* Upload & Restore database */}
                      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/10 dark:bg-[#151d30]/30 space-y-3">
                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">Database Recovery Restore</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">Restore all databases atomically from a previously downloaded AgriFarm backup file. Warning: This clears all existing tables.</p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-farm-900/30 hover:bg-farm-900/50 text-farm-500 dark:text-farm-300 border border-farm-200 dark:border-farm-800 hover:border-farm-700 text-xs font-bold rounded-lg cursor-pointer transition-all">
                          <Database size={14} /> Upload & Restore Database
                          <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-slate-500 flex items-center gap-3">
                      <ShieldCheck size={20} />
                      <p className="text-xs font-medium">Worker account access level detected. Database backup and restore center is restricted to Administrators.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
