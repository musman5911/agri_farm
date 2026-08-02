import React, { useState, useEffect } from 'react';
import * as api from './api';
import DetailModal from './components/DetailModal';
import AdminMenu from './components/AdminMenu';
import { 
  Sprout, 
  DollarSign, 
  CheckSquare, 
  LogOut, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  UserPlus, 
  LogIn, 
  AlertTriangle,
  Send,
  Loader,
  Circle,
  LayoutDashboard,
  Settings,
  Users,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  X,
  ShieldCheck,
  MapPin,
  Scale,
  Sun,
  Moon,
  BarChart3,
  HeartPulse,
  Type,
  Lock,
  Mail,
  Key
} from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'worker');
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Worker');
  
  // Custom states for theme, tabs, and text settings
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [textSize, setTextSize] = useState(localStorage.getItem('text_size') || 'base'); // sm, base, md, lg
  const [modal, setModal] = useState(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Authentication & Password Recovery States
  const [setupDone, setSetupDone] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot_send', 'forgot_reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPw, setResetNewPw] = useState('');
  
  const [crops, setCrops] = useState([]);
  const [finance, setFinance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); // Worker management (admin only)
  
  // Loading & action locks
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null); 
  
  // Modals
  const [showCropModal, setShowCropModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // Edit records storage
  const [editingCrop, setEditingCrop] = useState(null);
  const [editingFinance, setEditingFinance] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  // Form states
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  
  const [cropForm, setCropForm] = useState({ name: '', variety: '', status: 'Growing', plant_date: '', harvest_date: '', field: '', yield_kg: '', notes: '' });
  const [finForm, setFinForm] = useState({ category: '', amount: '', type: 'expense', crop_id: 'farm-wide', notes: '' });
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '' });
  const [newWorkerForm, setNewWorkerForm] = useState({ username: '', password: '', role: 'worker' });

  // Filter States
  const [cropFilter, setCropFilter] = useState('all');
  const [financeFilter, setFinanceFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  // Feedback Alert
  const [alertMsg, setAlertMsg] = useState({ text: '', isError: false });

  const showAlert = (text, isError = false) => {
    setAlertMsg({ text, isError });
    setTimeout(() => setAlertMsg({ text: '', isError: false }), 4000);
  };

  // Sync setup state on launch
  useEffect(() => {
    api.checkSetup()
      .then(res => {
        const done = res.data.setup_done;
        setSetupDone(done);
        if (!done) {
          setAuthMode('register');
        } else {
          setAuthMode('login');
        }
      })
      .catch(() => {
        setSetupDone(true);
        setAuthMode('login');
      });
  }, [token]);

  // Sync isDark with document element & body
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Text size configuration helper
  const textClassMap = {
    sm: 'text-xs md:text-sm',
    base: 'text-sm md:text-base',
    md: 'text-base md:text-lg',
    lg: 'text-lg md:text-xl'
  };

  const titleClassMap = {
    sm: 'text-base md:text-lg font-black',
    base: 'text-lg md:text-xl font-black',
    md: 'text-xl md:text-2xl font-black',
    lg: 'text-2xl md:text-3xl font-black'
  };

  useEffect(() => { 
    if (token) { 
      setLoading(true);
      refreshData().finally(() => setLoading(false));
    } 
  }, [token]);

  const refreshData = async () => {
    try {
      const cropsRes = await api.getCrops(); setCrops(cropsRes.data);
      const finRes = await api.getFinance(); setFinance(finRes.data);
      const tasksRes = await api.getTasks(); setTasks(tasksRes.data);
      if (userRole === 'admin') {
        const usersRes = await api.getUsers(); setUsers(usersRes.data);
      }
    } catch (err) {
      console.error("Data refresh failed:", err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUserRole('worker');
    setUsername('Worker');
    window.location.reload();
  };

  // --- Login / Signup Actions ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authMode === 'register') {
      if (!authForm.username || !authForm.email || !authForm.password) {
        return showAlert("Please complete all initial signup fields.", true);
      }
    } else {
      if (!authForm.username || !authForm.password) {
        return showAlert("Please enter your login credentials.", true);
      }
    }

    setLoading(true);
    try {
      if (authMode === 'register') {
        // Initial setup signup: first user created is always an administrator!
        await api.signup(authForm.username, authForm.email, authForm.password, 'admin');
        showAlert("Administrator registered successfully! Please log in.");
        setAuthForm({ username: '', email: '', password: '' });
        setAuthMode('login');
        setSetupDone(true);
      } else {
        // Login: accepts email or username
        const res = await api.login(authForm.username, authForm.password);
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('role', res.data.role);
        
        const cleanName = res.data.username || authForm.username.split('@')[0];
        localStorage.setItem('username', cleanName);

        setToken(res.data.access_token);
        setUserRole(res.data.role);
        setUsername(cleanName);
        showAlert("Welcome back to AgriFarm Command!");
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
      showAlert(errMsg, true);
    } finally {
      setLoading(false);
    }
  };

  // --- Password Recovery (Admin Only) ---
  const handleForgotSendCode = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return showAlert("Administrator email is required.", true);
    setLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      showAlert("Verification code emailed to you successfully!");
      setAuthMode('forgot_reset');
    } catch (err) {
      showAlert(err.response?.data?.detail || "Failed to trigger email code.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetPw = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !resetCode || !resetNewPw) {
      return showAlert("Please complete all fields.", true);
    }
    setLoading(true);
    try {
      await api.resetPassword(forgotEmail, resetCode, resetNewPw);
      showAlert("Password successfully reset! Please log in.");
      setForgotEmail('');
      setResetCode('');
      setResetNewPw('');
      setAuthMode('login');
    } catch (err) {
      showAlert(err.response?.data?.detail || "Reset verification failed.", true);
    } finally {
      setLoading(false);
    }
  };

  // --- Worker Management (Admin Only) ---
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerForm.username || !newWorkerForm.password) {
      return showAlert("Please complete all worker fields.", true);
    }
    try {
      // Workers do not use email! Email is passed as empty string.
      await api.signup(newWorkerForm.username, "", newWorkerForm.password, "worker");
      showAlert(`Worker account '${newWorkerForm.username}' registered!`);
      setNewWorkerForm({ username: '', password: '', role: 'worker' });
      refreshData();
    } catch (err) {
      showAlert(err.response?.data?.detail || "Failed to add worker account.", true);
    }
  };

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

  // --- Crops Actions ---
  const handleCropSubmit = async (e) => {
    e.preventDefault();
    if (!cropForm.name.trim()) return showAlert("Crop name is required.", true);
    try {
      const payload = {
        ...cropForm,
        yield_kg: cropForm.yield_kg ? parseFloat(cropForm.yield_kg) : 0.0
      };
      if (editingCrop) {
        await api.updateCrop(editingCrop._id, payload);
        showAlert("Crop updated!");
      } else {
        await api.addCrop(payload);
        showAlert("Crop successfully planted & logged!");
      }
      setCropForm({ name: '', variety: '', status: 'Growing', plant_date: '', harvest_date: '', field: '', yield_kg: '', notes: '' });
      setEditingCrop(null);
      setShowCropModal(false);
      refreshData();
    } catch (err) {
      showAlert("Failed to save crop entry.", true);
    }
  };

  const handleEditCrop = (crop) => {
    setEditingCrop(crop);
    setCropForm({
      name: crop.name,
      variety: crop.variety || '',
      status: crop.status || 'Growing',
      plant_date: crop.plant_date || '',
      harvest_date: crop.harvest_date || '',
      field: crop.field || '',
      yield_kg: crop.yield_kg || '',
      notes: crop.notes || ''
    });
    setShowCropModal(true);
  };

  const handleDeleteCrop = async (id) => {
    if (!confirm("Delete this crop and all associated history? This cannot be undone.")) return;
    setActionId(id);
    try {
      await api.deleteCrop(id);
      showAlert("Crop record removed.");
      refreshData();
    } catch (err) {
      showAlert("Failed to remove crop.", true);
    } finally {
      setActionId(null);
    }
  };

  // --- Finance Actions ---
  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    if (!finForm.category.trim() || !finForm.amount) {
      return showAlert("Please complete description and amount fields.", true);
    }
    const amt = parseFloat(finForm.amount);
    if (isNaN(amt) || amt <= 0) return showAlert("Amount must be a positive number.", true);

    try {
      const payload = {
        ...finForm,
        amount: amt,
        crop_id: finForm.crop_id === 'farm-wide' ? null : finForm.crop_id
      };
      if (editingFinance) {
        await api.updateFinance(editingFinance._id, payload);
        showAlert("Ledger transaction updated!");
      } else {
        await api.addFinance(payload);
        showAlert("Transaction successfully recorded!");
      }
      setFinForm({ category: '', amount: '', type: 'expense', crop_id: 'farm-wide', notes: '' });
      setEditingFinance(null);
      setShowFinanceModal(false);
      refreshData();
    } catch (err) {
      showAlert("Failed to save ledger entry.", true);
    }
  };

  const handleEditFinance = (f) => {
    setEditingFinance(f);
    setFinForm({
      category: f.category,
      amount: f.amount.toString(),
      type: f.type,
      crop_id: f.crop_id || 'farm-wide',
      notes: f.notes || ''
    });
    setShowFinanceModal(true);
  };

  const handleDeleteFinance = async (id) => {
    if (!confirm("Remove this transaction log?")) return;
    setActionId(id);
    try {
      await api.deleteFinance(id);
      showAlert("Transaction removed from ledger.");
      refreshData();
    } catch (err) {
      showAlert("Failed to delete transaction.", true);
    } finally {
      setActionId(null);
    }
  };

  // --- Task Actions ---
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return showAlert("Task title/assignment is required.", true);
    try {
      const payload = { ...taskForm, status: editingTask ? editingTask.status : 'Pending' };
      if (editingTask) {
        await api.updateTask(editingTask._id, payload);
        showAlert("Care roster assignment updated!");
      } else {
        await api.addTask(payload);
        showAlert("Task added to health & care roster!");
      }
      setTaskForm({ title: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '' });
      setEditingTask(null);
      setShowTaskModal(false);
      refreshData();
    } catch (err) {
      showAlert("Failed to save assignment.", true);
    }
  };

  const handleEditTask = (t) => {
    setEditingTask(t);
    setTaskForm({
      title: t.title,
      due_date: t.due_date || '',
      assigned_to: t.assigned_to || '',
      priority: t.priority || 'Medium',
      notes: t.notes || ''
    });
    setShowTaskModal(true);
  };

  const handleCompleteTask = async (id) => {
    setActionId(id);
    try {
      await api.completeTask(id);
      showAlert("Task completed! Confetti on the farm!");
      refreshData();
    } catch (err) {
      showAlert("Failed to update task status.", true);
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Delete this duty roster task?")) return;
    setActionId(id);
    try {
      await api.deleteTask(id);
      showAlert("Task deleted.");
      refreshData();
    } catch (err) {
      showAlert("Failed to delete task.", true);
    } finally {
      setActionId(null);
    }
  };

  // --- Backup & Restore (Admin Only) ---
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

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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

  const handleTextSizeChange = (size) => {
    setTextSize(size);
    localStorage.setItem('text_size', size);
  };

  // --- Helper Calculations ---
  const totalIncome = finance.filter(f => f.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = finance.filter(f => f.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const filteredCrops = crops.filter(c => cropFilter === 'all' ? true : c.status === cropFilter);
  const filteredFinance = finance.filter(f => financeFilter === 'all' ? true : f.type === financeFilter);
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'Pending') return t.status === 'Pending';
    if (taskFilter === 'Completed') return t.status === 'Completed';
    return true;
  });

  const sendWhatsApp = () => {
    const cropSummary = crops.map(c => `${c.name} (${c.status})`).join(', ') || 'None';
    const pendingCount = tasks.filter(t => t.status === 'Pending').length;
    const msg = `🚜 *AgriFarm Command Report Summary*%0A%0A🌱 *Crops Register:* ${crops.length} total (${cropSummary})%0A💰 *Ledger:* Income $${totalIncome.toLocaleString()} | Expense $${totalExpense.toLocaleString()} (Net: $${netProfit.toLocaleString()})%0A📝 *Worker Roster:* ${pendingCount} pending task assignments.`;
    window.open(`https://wa.me/?text=${msg}`);
  };

  // Tab configurations
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crops', label: 'Crops Register', icon: Sprout },
    { id: 'finance', label: 'Financial Ledger', icon: DollarSign },
    { id: 'tasks', label: 'Care & Health', icon: HeartPulse },
    { id: 'summary', label: 'Monthly Summary', icon: BarChart3 },
  ];

  // --- RENDER AUTHENTICATION & LOGIN ---
  if (!token) return (
    <div className="min-h-screen bg-[#070b13] dark:bg-[#070b13] bg-slate-50 flex flex-col justify-center items-center px-4 transition-colors">
      {alertMsg.text && (
        <div className={`mb-6 p-4 rounded-xl shadow-lg border text-sm max-w-sm w-full animate-fade-in ${
          alertMsg.isError ? 'bg-red-950/80 border-red-500 text-red-200' : 'bg-farm-950/80 border-farm-500 text-farm-200'
        }`}>
          <div className="flex items-center gap-3">
            {alertMsg.isError ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>{alertMsg.text}</span>
          </div>
        </div>
      )}
      
      {/* ─── PANE 1: DEFAULT LOGIN SCREEN ─── */}
      {authMode === 'login' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover">
          <div className="flex justify-center mb-4">
            <div className="bg-farm-900/20 text-farm-400 p-4 rounded-full border border-farm-500/20">
              <Sprout size={36} className="animate-bounce-soft" />
            </div>
          </div>
          <h2 className="text-center text-farm-500 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
            AgriFarm Command Hub
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs mb-8 uppercase tracking-widest font-semibold">
            Secure Sign-In Interface
          </p>
          
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Username or Email</label>
              <input 
                type="text"
                required
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="operative_id" 
                value={authForm.username}
                onChange={e => setAuthForm({...authForm, username: e.target.value})} 
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access Password</label>
                <button 
                  type="button" 
                  onClick={() => setAuthMode('forgot_send')}
                  className="text-[11px] text-farm-600 hover:text-farm-500 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                type="password" 
                required
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="••••••••" 
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})} 
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full py-3 bg-farm-600 hover:bg-farm-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-farm-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
              disabled={loading}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              Access Console
            </button>
          </form>
        </div>
      )}

      {/* ─── PANE 2: FIRST-TIME SETUP REGISTRATION (ADMIN CREATION) ─── */}
      {authMode === 'register' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="bg-farm-900/20 text-farm-400 p-4 rounded-full border border-farm-500/20">
              <Sprout size={36} className="animate-bounce-soft" />
            </div>
          </div>
          <h2 className="text-center text-farm-500 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
            Initialize AgriFarm
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs mb-8 uppercase tracking-widest font-semibold">
            First-time Administrative Setup
          </p>
          
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Admin Username</label>
              <input 
                type="text"
                required
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="e.g. admin" 
                value={authForm.username}
                onChange={e => setAuthForm({...authForm, username: e.target.value})} 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Admin Email</label>
              <input 
                type="email"
                required
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="admin@farm.com" 
                value={authForm.email}
                onChange={e => setAuthForm({...authForm, email: e.target.value})} 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Setup Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="Min 4 characters" 
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})} 
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full py-3 bg-farm-600 hover:bg-farm-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-farm-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
              disabled={loading}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <UserPlus size={18} />}
              Initialize & Register Admin
            </button>
          </form>
        </div>
      )}

      {/* ─── PANE 3: FORGOT PASSWORD (REQUEST RESET CODE) ─── */}
      {authMode === 'forgot_send' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="bg-farm-900/20 text-farm-400 p-4 rounded-full border border-farm-500/20">
              <Mail size={36} className="animate-bounce-soft" />
            </div>
          </div>
          <h2 className="text-center text-farm-500 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
            Admin Password Reset
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs mb-8 uppercase tracking-widest font-semibold">
            Send Verification Code
          </p>
          
          <form onSubmit={handleForgotSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Admin Email Address</label>
              <input 
                type="email"
                required
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="admin@farm.com" 
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)} 
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full py-3 bg-farm-600 hover:bg-farm-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              disabled={loading}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
              Send Verification Code
            </button>
            
            <button 
              type="button" 
              onClick={() => setAuthMode('login')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all text-xs uppercase tracking-wider mt-2 cursor-pointer"
            >
              Back to Login
            </button>
          </form>
        </div>
      )}

      {/* ─── PANE 4: AUTHORIZE RESET PASSWORD WITH CODE ─── */}
      {authMode === 'forgot_reset' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="bg-farm-900/20 text-farm-400 p-4 rounded-full border border-farm-500/20">
              <Key size={36} className="animate-bounce-soft" />
            </div>
          </div>
          <h2 className="text-center text-farm-500 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
            Authorize Password Reset
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs mb-8 uppercase tracking-widest font-semibold">
            Input Reset Code
          </p>
          
          <form onSubmit={handleForgotResetPw} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
              <input 
                type="email"
                required
                readOnly
                className="w-full bg-slate-100/50 border border-slate-200 text-slate-500 dark:bg-[#1a2333]/50 dark:border-slate-850 dark:text-slate-400 rounded-lg px-4 py-3 text-sm focus:outline-none"
                value={forgotEmail}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">6-Digit Verification Code</label>
              <input 
                type="text"
                required
                maxLength="6"
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors text-center tracking-widest font-extrabold text-base"
                placeholder="123456" 
                value={resetCode}
                onChange={e => setResetCode(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">New Access Password</label>
              <input 
                type="password"
                required
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="Min 4 characters" 
                value={resetNewPw}
                onChange={e => setResetNewPw(e.target.value)} 
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full py-3 bg-farm-600 hover:bg-farm-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              disabled={loading}
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              Verify & Reset Password
            </button>
            
            <button 
              type="button" 
              onClick={() => setAuthMode('forgot_send')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-all text-xs uppercase tracking-wider mt-2 cursor-pointer"
            >
              Request New Code
            </button>
          </form>
        </div>
      )}
    </div>
  );

  // --- RENDER MAIN INTERFACE ---
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-[#070b13] text-slate-100' : 'bg-slate-50 text-slate-800'
    } ${textClassMap[textSize]}`}>
      
      {/* Container wrapper matching flock_farm */}
      <div className="max-w-[1100px] w-full mx-auto px-4 md:px-6 py-4 space-y-4 flex-1 flex flex-col">
        
        {/* Header Block with adjusted left and right sides */}
        <header className={`flex items-center justify-between pb-3 border-b transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          {/* Left side: Logo, brand and subtitle */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm shrink-0" 
              onError={(e) => { e.target.src = "https://raw.githubusercontent.com/musman5911/flock_farm/main/public/logo-icon.png"; }}
            />
            <div>
              <h1 className={`font-black tracking-tight leading-none text-base md:text-lg ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Usman Agri Farm
              </h1>
              <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                Advanced Crop Management System
              </p>
            </div>
          </div>
          
          {/* Right side: quick actions */}
          <div className="flex items-center gap-2.5">
            {/* Dark/Light mode toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isDark 
                  ? 'border-slate-800 bg-slate-900 text-yellow-400 hover:bg-slate-800' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Admin Menu popup toggle */}
            <button 
              onClick={() => setAdminMenuOpen(true)}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isDark 
                  ? 'border-slate-800 bg-slate-900 text-farm-400 hover:bg-slate-800 hover:text-farm-300' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-farm-600'
              }`}
              title="Settings & Admin"
            >
              <Settings size={15} />
            </button>

            {/* Logout button */}
            <button 
              onClick={handleLogout}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isDark 
                  ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400' 
                  : 'border-slate-200 bg-white text-slate-500 hover:text-red-600'
              }`}
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* ─── HORIZONTAL SCROLLABLE TABS ─── */}
        <div className={`flex items-center gap-1 overflow-x-auto border-b pb-1.5 shrink-0 select-none custom-scrollbar ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold tracking-tight transition cursor-pointer whitespace-nowrap shrink-0 border ${
                  active
                    ? 'bg-farm-600 border-farm-500 text-white shadow-sm shadow-farm-500/10'
                    : isDark
                      ? 'bg-[#0f172a] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab views content area */}
        <div className="flex-1 min-h-0 flex flex-col">
          
          {/* ───────────────── VIEW: DASHBOARD ───────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in flex-1">
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                isDark 
                  ? 'bg-gradient-to-r from-farm-900/20 via-slate-950 to-slate-950 border-farm-500/20' 
                  : 'bg-gradient-to-r from-farm-50 via-white to-white border-farm-200'
              }`}>
                <div>
                  <h2 className={`font-black leading-tight ${isDark ? 'text-white' : 'text-slate-950'} ${titleClassMap[textSize]}`}>
                    Telemetry Operations: {username}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Real-time indicators, operational financials, and scheduled crop cares are fully operational.</p>
                </div>
                <span className="bg-farm-900/30 text-farm-400 border border-farm-500/20 px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shrink-0">
                  <ShieldCheck size={14} /> System Secure
                </span>
              </div>

              {/* Status Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                  onClick={() => setModal('crops_planted')}
                  className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm transition-all cursor-pointer hover:scale-[1.02] duration-200 hover:shadow-lg ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Crops Planted</p>
                    <p className={`font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'} ${titleClassMap[textSize]}`}>{crops.length}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{crops.filter(c => c.status === 'Growing').length} Growing phase</p>
                  </div>
                  <div className="bg-farm-900/20 text-farm-400 p-3 rounded-xl border border-farm-500/10">
                    <Sprout size={20} />
                  </div>
                </div>

                <div 
                  onClick={() => setModal('ledger_profit')}
                  className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm transition-all cursor-pointer hover:scale-[1.02] duration-200 hover:shadow-lg ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Operational Profit</p>
                    <p className={`font-black mt-1 ${titleClassMap[textSize]} ${netProfit >= 0 ? 'text-farm-400' : 'text-red-400'}`}>
                      ${netProfit.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Income vs Outflow ledger</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${netProfit >= 0 ? 'bg-farm-900/20 text-farm-400 border-farm-500/10' : 'bg-red-950/40 text-red-400 border-red-900/20'}`}>
                    {netProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                </div>

                <div 
                  onClick={() => setModal('pending_duties')}
                  className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm transition-all cursor-pointer hover:scale-[1.02] duration-200 hover:shadow-lg ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Duties scheduled</p>
                    <p className={`font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'} ${titleClassMap[textSize]}`}>{tasks.filter(t => t.status === 'Pending').length}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{tasks.filter(t => t.status === 'Completed').length} Duties completed</p>
                  </div>
                  <div className="bg-indigo-900/20 text-indigo-400 p-3 rounded-xl border border-indigo-900/20">
                    <CheckSquare size={20} />
                  </div>
                </div>

                <div 
                  onClick={() => setModal('worker_operatives')}
                  className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm transition-all cursor-pointer hover:scale-[1.02] duration-200 hover:shadow-lg ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Authorized users</p>
                    <p className={`font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'} ${titleClassMap[textSize]}`}>{users.length || 1}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Active worker logins</p>
                  </div>
                  <div className="bg-teal-900/20 text-teal-400 p-3 rounded-xl border border-teal-900/20">
                    <Users size={20} />
                  </div>
                </div>
              </div>

              {/* Sub-panels for Quick Actions & Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Active crops preview card */}
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center border-b border-slate-800/10 dark:border-slate-800 pb-3 mb-4">
                    <h4 className="font-extrabold flex items-center gap-2"><Sprout size={16} className="text-farm-400" /> Planted Sectors</h4>
                    <button onClick={() => setActiveTab('crops')} className="text-xs text-farm-500 hover:text-farm-400 font-bold uppercase tracking-wider cursor-pointer">View All</button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {crops.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-8">No crops currently registered.</p>
                    ) : crops.slice(0, 4).map(c => (
                      <div key={c._id} className={`flex justify-between items-center p-3 rounded-xl border ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <p className="text-xs font-bold">{c.name}</p>
                          <p className="text-[10px] text-slate-400">Plot sector: {c.field || 'General'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          c.status === 'Growing' ? 'bg-farm-900/20 text-farm-400 border border-farm-900/30' : 'bg-indigo-950 text-indigo-400 border border-indigo-900/30'
                        }`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duty board preview card */}
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center border-b border-slate-800/10 dark:border-slate-800 pb-3 mb-4">
                    <h4 className="font-extrabold flex items-center gap-2"><HeartPulse size={16} className="text-farm-400" /> Care & Operations Roster</h4>
                    <button onClick={() => setActiveTab('tasks')} className="text-xs text-farm-500 hover:text-farm-400 font-bold uppercase tracking-wider cursor-pointer">Open Board</button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {tasks.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-8">Care roster is clean.</p>
                    ) : tasks.filter(t => t.status !== 'Completed').slice(0, 4).map(t => (
                      <div key={t._id} className={`flex justify-between items-center p-3 rounded-xl border ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Circle size={14} className="text-slate-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">{t.title}</p>
                            <p className="text-[10px] text-slate-400">Assigned: {t.assigned_to || 'General'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          t.priority === 'High' ? 'bg-red-950 text-red-400 border border-red-900/20' : 'bg-slate-800 text-slate-400'
                        }`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── VIEW: CROPS REGISTER ───────────────── */}
          {activeTab === 'crops' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className="text-base md:text-lg font-black">Crops & Sector Registries</h3>
                  <p className="text-slate-500 text-xs">Verify variety classification, physical plots, and yield development phases.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                    value={cropFilter}
                    onChange={e => setCropFilter(e.target.value)}
                  >
                    <option value="all">All Phases</option>
                    <option value="Planted">Planted</option>
                    <option value="Growing">Growing</option>
                    <option value="Harvesting">Harvesting</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <button 
                    onClick={() => { setEditingCrop(null); setCropForm({ name: '', variety: '', status: 'Growing', plant_date: '', harvest_date: '', field: '', yield_kg: '', notes: '' }); setShowCropModal(true); }}
                    className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg cursor-pointer transition-transform hover:scale-105 ml-auto shrink-0"
                  >
                    <Plus size={16} /> Log Crop
                  </button>
                </div>
              </div>

              {/* Crops Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crops.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No crops logged. Get started by planting your first crop.
                  </div>
                ) : filteredCrops.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No crops matching this phase filter were found.
                  </div>
                ) : filteredCrops.map((c, idx) => (
                  <div key={c._id} className={`border rounded-2xl p-5 shadow-sm hover:border-slate-400 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between animate-fade-in ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`} style={{animationDelay: `${idx * 0.05}s`}}>
                    <div className="space-y-4">
                      {/* Name & Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className={`font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.name}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Variety: {c.variety || 'Standard'}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          c.status === 'Growing' ? 'bg-farm-900/20 text-farm-400 border border-farm-900/30' :
                          c.status === 'Harvesting' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20' :
                          c.status === 'Completed' ? 'bg-purple-950/40 text-purple-400 border border-purple-900/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>{c.status}</span>
                      </div>

                      {/* Info grid */}
                      <div className={`grid grid-cols-2 gap-3 text-xs border-y py-3 ${
                        isDark ? 'border-slate-800' : 'border-slate-200/60'
                      }`}>
                        <div className="space-y-1">
                          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1"><MapPin size={10} /> Field/Area</p>
                          <p className="font-semibold">{c.field || 'Farm-wide'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1"><Scale size={10} /> Yield harvested</p>
                          <p className="font-semibold">{c.yield_kg ? `${c.yield_kg.toLocaleString()} kg` : '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1"><Calendar size={10} /> Planted</p>
                          <p className="font-semibold">{c.plant_date || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1"><Calendar size={10} /> Harvest Target</p>
                          <p className="font-semibold">{c.harvest_date || '-'}</p>
                        </div>
                      </div>

                      {c.notes && (
                        <p className={`text-[11px] line-clamp-2 p-2.5 rounded-lg border ${
                          isDark ? 'text-slate-400 bg-slate-900/40 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
                        }`}>
                          {c.notes}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className={`flex justify-end gap-1.5 mt-5 pt-3 border-t ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <button onClick={() => handleEditCrop(c)} className="p-1.5 text-slate-400 hover:text-farm-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteCrop(c._id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────── VIEW: FINANCIAL LEDGER ───────────────── */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className="text-base md:text-lg font-black">Financial Ledger Book</h3>
                  <p className="text-slate-500 text-xs">Verify seed logistics, operational fuels, wages, and harvest sales ledger flows.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                    value={financeFilter}
                    onChange={e => setFinanceFilter(e.target.value)}
                  >
                    <option value="all">All Flows</option>
                    <option value="income">Revenue Only</option>
                    <option value="expense">Expense Only</option>
                  </select>
                  <button 
                    onClick={() => { setEditingFinance(null); setFinForm({ category: '', amount: '', type: 'expense', crop_id: 'farm-wide', notes: '' }); setShowFinanceModal(true); }}
                    className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg cursor-pointer transition-transform hover:scale-105 ml-auto shrink-0"
                  >
                    <Plus size={16} /> Log Entry
                  </button>
                </div>
              </div>

              {/* Financial Breakdown Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Gross Income</p>
                  <h4 className="text-2xl font-black text-farm-400 mt-1">${totalIncome.toLocaleString()}</h4>
                </div>
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Expenditures</p>
                  <h4 className="text-2xl font-black text-red-400 mt-1">${totalExpense.toLocaleString()}</h4>
                </div>
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Net profit margin</p>
                  <h4 className={`text-2xl font-black mt-1 ${netProfit >= 0 ? 'text-farm-400' : 'text-red-400'}`}>
                    ${netProfit.toLocaleString()}
                  </h4>
                </div>
              </div>

              {/* Finance list table */}
              <div className={`border rounded-2xl overflow-hidden shadow-sm ${
                isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className={`text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-b ${
                      isDark ? 'bg-[#121b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Sector/Crop Link</th>
                        <th className="px-6 py-4 text-right">Ledger Flow</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs md:text-sm ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {finance.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Financial ledger contains no logs.</td></tr>
                      ) : filteredFinance.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No logs found matching this ledger flow filter.</td></tr>
                      ) : filteredFinance.map(f => {
                        const linkedCrop = crops.find(c => c._id === f.crop_id);
                        return (
                        <tr key={f._id} className="hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors animate-fade-in">
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{f.date}</td>
                          <td className="px-6 py-4">
                            <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{f.category}</div>
                            {f.notes && <div className="text-[11px] text-slate-400 max-w-xs truncate mt-0.5">{f.notes}</div>}
                          </td>
                          <td className="px-6 py-4">
                            {linkedCrop ? (
                              <span className="inline-flex items-center gap-1 bg-farm-900/20 text-farm-500 dark:text-farm-400 border border-farm-500/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                <Sprout size={10} /> {linkedCrop.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Farm-wide</span>
                            )}
                          </td>
                          <td className={`px-6 py-4 text-right font-extrabold whitespace-nowrap ${f.type === 'expense' ? 'text-red-400' : 'text-farm-500 dark:text-farm-400'}`}>
                            <div className="inline-flex items-center gap-1">
                              {f.type === 'expense' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                              ${f.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1">
                              <button onClick={() => handleEditFinance(f)} className="p-1.5 text-slate-400 hover:text-farm-500 rounded-lg cursor-pointer">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => handleDeleteFinance(f._id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer">
                                <Trash2 size={14} />
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
            </div>
          )}

          {/* ───────────────── VIEW: CARE & HEALTH PORTAL ───────────────── */}
          {activeTab === 'tasks' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className="text-base md:text-lg font-black">Crop Care & Health Portal</h3>
                  <p className="text-slate-500 text-xs">Assign and monitor soil checkups, crop watering schedules, and organic pesticide treatments.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                    value={taskFilter}
                    onChange={e => setTaskFilter(e.target.value)}
                  >
                    <option value="all">All Assignments</option>
                    <option value="Pending">Pending / In-Progress</option>
                    <option value="Completed">Completed Duties</option>
                  </select>
                  <button 
                    onClick={() => { setEditingTask(null); setTaskForm({ title: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '' }); setShowTaskModal(true); }}
                    className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg cursor-pointer transition-transform hover:scale-105 ml-auto shrink-0"
                  >
                    <Plus size={16} /> Schedule Care
                  </button>
                </div>
              </div>

              {/* Tasks Roster Board */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    Duty care roster is currently clean.
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No duty assignments found matching this status.
                  </div>
                ) : filteredTasks.map((t, idx) => (
                  <div key={t._id} className={`border rounded-2xl p-5 shadow-sm flex flex-col justify-between ${
                    isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`} style={{
                    borderLeft: `4px solid ${t.status === 'Completed' ? '#475569' : t.priority === 'High' ? '#ef4444' : '#22c55e'}`,
                    opacity: t.status === 'Completed' ? 0.6 : 1,
                    animation: 'fadeIn 0.3s ease-out',
                    animationDelay: `${idx * 0.05}s`
                  }}>
                    <div className="space-y-4">
                      {/* Priority Tag & Completion Checkbox */}
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          t.priority === 'High' ? 'bg-red-950 text-red-400 border border-red-900/20' :
                          t.priority === 'Low' ? 'bg-slate-800 text-slate-400' :
                          'bg-farm-900/20 text-farm-400 border border-farm-900/30'
                        }`}>{t.priority} Priority</span>
                        
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          t.status === 'Completed' ? 'bg-slate-800 text-slate-500' : 'bg-farm-900/20 text-farm-400 border border-farm-900/30'
                        }`}>{t.status}</span>
                      </div>

                      {/* Main Title */}
                      <div>
                        <h4 className={`text-sm md:text-base font-black ${t.status === 'Completed' ? 'line-through text-slate-500' : isDark ? 'text-white' : 'text-slate-900'}`}>{t.title}</h4>
                        {t.notes && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.notes}</p>}
                      </div>

                      {/* Info lines */}
                      <div className={`border-t pt-3 space-y-1.5 text-xs ${
                        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200/60 text-slate-500'
                      }`}>
                        <p className="flex items-center gap-2"><Users size={12} className="text-slate-400" /> Worker: <span className="font-semibold text-slate-700 dark:text-slate-200">{t.assigned_to || 'Broadcast Duty'}</span></p>
                        <p className="flex items-center gap-2"><Calendar size={12} className="text-slate-400" /> Due Date: <span className="font-semibold text-slate-700 dark:text-slate-200">{t.due_date || 'None / Ongoing'}</span></p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className={`flex justify-between items-center mt-5 pt-3 border-t ${
                      isDark ? 'border-slate-800/60' : 'border-slate-200/60'
                    }`}>
                      {t.status === 'Pending' ? (
                        <button 
                          onClick={() => handleCompleteTask(t._id)}
                          className="text-xs text-farm-500 hover:text-farm-400 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle size={14} /> Complete
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle size={12} /> Duties Completed</span>
                      )}
                      
                      <div className="flex gap-1">
                        <button onClick={() => handleEditTask(t)} className="p-1.5 text-slate-400 hover:text-farm-500 rounded-lg transition-colors cursor-pointer">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDeleteTask(t._id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────── VIEW: MONTHLY SUMMARY ───────────────── */}
          {activeTab === 'summary' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`border-b pb-5 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <h3 className="text-base md:text-lg font-black">Monthly Performance Summary</h3>
                <p className="text-slate-500 text-xs">Aggregated analytics and development trend data for crops yield and operational ledger budgets.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Operations Health Checklist */}
                <div className={`border p-6 rounded-2xl shadow-sm space-y-4 ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <h4 className="font-extrabold text-sm md:text-base border-b border-slate-800/10 dark:border-slate-800 pb-3">Operational Milestones</h4>
                  <ul className="space-y-3 text-xs md:text-sm">
                    <li className="flex items-center gap-3">
                      <CheckCircle size={16} className="text-farm-500" />
                      <span>Planted Sectors Fully Registerized ({crops.length} items)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle size={16} className="text-farm-500" />
                      <span>Ledger flow bookkeeping validated and up-to-date</span>
                    </li>
                    <li className="flex items-center gap-3">
                      {tasks.filter(t => t.status === 'Pending').length === 0 ? (
                        <CheckCircle size={16} className="text-farm-500" />
                      ) : (
                        <Circle size={16} className="text-slate-400" />
                      )}
                      <span>All active duty roster tasks completed ({tasks.filter(t => t.status === 'Pending').length} pending)</span>
                    </li>
                  </ul>
                </div>

                {/* Ledger Breakdown */}
                <div className={`border p-6 rounded-2xl shadow-sm space-y-4 ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <h4 className="font-extrabold text-sm md:text-base border-b border-slate-800/10 dark:border-slate-800 pb-3">Yield Classification</h4>
                  <div className="space-y-3">
                    {crops.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-4">No yield telemetry recorded.</p>
                    ) : crops.filter(c => c.yield_kg > 0).map(c => {
                      return (
                        <div key={c._id} className="flex justify-between items-center text-xs md:text-sm">
                          <span className="font-semibold">{c.name} ({c.variety || 'variety'})</span>
                          <span className="font-bold text-farm-600 dark:text-farm-400">{c.yield_kg.toLocaleString()} kg</span>
                        </div>
                      );
                    })}
                    {crops.filter(c => c.yield_kg > 0).length === 0 && (
                      <p className="text-slate-500 text-xs text-center py-4">Yields are pending harvest development phases.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly Ledger Flow Timeline */}
              <div className={`border p-6 rounded-2xl shadow-sm ${
                isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h4 className="font-extrabold text-sm md:text-base border-b border-slate-800/10 dark:border-slate-800 pb-3 mb-4">Operations Ledger Log History</h4>
                <div className="space-y-3">
                  {finance.map((f, idx) => (
                    <div key={f._id} className="flex justify-between items-center text-xs md:text-sm p-2.5 rounded-lg hover:bg-slate-800/10 dark:hover:bg-slate-900/30 animate-fade-in">
                      <span className="text-slate-500">{f.date}</span>
                      <span className="font-semibold flex-1 ml-4">{f.category}</span>
                      <span className={`font-bold ${f.type === 'expense' ? 'text-red-400' : 'text-farm-600 dark:text-farm-400'}`}>
                        {f.type === 'expense' ? '-' : '+'}${f.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {finance.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-6">Ledger book timeline is empty.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* CROP FORM MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/70 flex justify-center items-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowCropModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={20} /></button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Sprout className="text-farm-400" /> {editingCrop ? "Modify Crop Cycle" : "Log New Crop cycle"}</h3>
            
            <form onSubmit={handleCropSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Crop Name *</label>
                  <input required className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.name} onChange={e => setCropForm({...cropForm, name: e.target.value})} placeholder="e.g. Premium Rice" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Variety / Classification</label>
                  <input className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.variety} onChange={e => setCropForm({...cropForm, variety: e.target.value})} placeholder="e.g. Basmati 370" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Field / Plot Sector</label>
                  <input className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.field} onChange={e => setCropForm({...cropForm, field: e.target.value})} placeholder="e.g. Sector 3A" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Estimated Yield (kg)</label>
                  <input type="number" step="0.1" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.yield_kg} onChange={e => setCropForm({...cropForm, yield_kg: e.target.value})} placeholder="0.0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Planted Date</label>
                  <input type="date" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium" value={cropForm.plant_date} onChange={e => setCropForm({...cropForm, plant_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Harvest Date Target</label>
                  <input type="date" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium" value={cropForm.harvest_date} onChange={e => setCropForm({...cropForm, harvest_date: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider font-semibold">Current Cycle Status</label>
                <select 
                  className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium cursor-pointer"
                  value={cropForm.status}
                  onChange={e => setCropForm({...cropForm, status: e.target.value})}
                >
                  <option value="Planted">Planted</option>
                  <option value="Growing">Growing</option>
                  <option value="Harvesting">Harvesting</option>
                  <option value="Completed">Completed (Inactive)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Notes / Soil Details</label>
                <textarea rows="2" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.notes} onChange={e => setCropForm({...cropForm, notes: e.target.value})} placeholder="Soil pH is 6.5, added organic fertilizer..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowCropModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer">
                  <CheckCircle size={14} /> {editingCrop ? "Update Crop" : "Plant Crop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FINANCE FORM MODAL */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/70 flex justify-center items-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowFinanceModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={20} /></button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><DollarSign className="text-farm-400" /> {editingFinance ? "Modify Transaction" : "Record Book Log"}</h3>
            
            <form onSubmit={handleFinanceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Ledger Flow *</label>
                  <select 
                    className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium cursor-pointer"
                    value={finForm.type}
                    onChange={e => setFinForm({...finForm, type: e.target.value})}
                  >
                    <option value="expense">Expenditure / Outflow (-)</option>
                    <option value="income">Revenue / Inflow (+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Amount ($) *</label>
                  <input required type="number" step="0.01" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={finForm.amount} onChange={e => setFinForm({...finForm, amount: e.target.value})} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Item Description / Category *</label>
                <input required className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={finForm.category} onChange={e => setFinForm({...finForm, category: e.target.value})} placeholder="e.g. High-efficiency Sprinkler Purchase" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Associate with Crop Sector</label>
                <select 
                  className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium cursor-pointer"
                  value={finForm.crop_id}
                  onChange={e => setFinForm({...finForm, crop_id: e.target.value})}
                >
                  <option value="farm-wide">General / Farm-Wide Operational</option>
                  {crops.map(c => (
                    <option key={c._id} value={c._id}>Crop: {c.name} ({c.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Ledger Notes</label>
                <textarea rows="2" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={finForm.notes} onChange={e => setFinForm({...finForm, notes: e.target.value})} placeholder="Purchase verified by musman, receipt attached..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowFinanceModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer">
                  <CheckCircle size={14} /> {editingFinance ? "Update Ledger" : "Record Book Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK FORM MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/70 flex justify-center items-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowTaskModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={20} /></button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><CheckSquare className="text-farm-400" /> {editingTask ? "Modify Task Assignment" : "Assign Farm Duty"}</h3>
            
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Duty Description / Assignment Title *</label>
                <input required className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="e.g. Fertilize Sector 3 Wheat" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Assign to Worker</label>
                  <select 
                    className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium cursor-pointer"
                    value={taskForm.assigned_to}
                    onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})}
                  >
                    <option value="">General / Broadcast Task</option>
                    {users.map(u => (
                      <option key={u._id} value={u.username}>{u.username} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Priority Level</label>
                  <select 
                    className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium cursor-pointer"
                    value={taskForm.priority}
                    onChange={e => setTaskForm({...taskForm, priority: e.target.value})}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Duty Due Date</label>
                <input type="date" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Task Guidelines / Operational Instructions</label>
                <textarea rows="2" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={taskForm.notes} onChange={e => setTaskForm({...taskForm, notes: e.target.value})} placeholder="Ensure irrigation valves are closed after 2 hours..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer">
                  <CheckCircle size={14} /> {editingTask ? "Update Assignment" : "Assign Duty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADMIN HUB POPUP MODAL ─── */}
      <AdminMenu
        open={adminMenuOpen}
        onClose={() => setAdminMenuOpen(false)}
        userRole={userRole}
        username={username}
        isDark={isDark}
        onToggleDark={setIsDark}
        textSize={textSize}
        onTextSizeChange={handleTextSizeChange}
        users={users}
        refreshData={refreshData}
        showAlert={showAlert}
      />

      {/* ─── DETAIL POPUPS (Dashboard Stat Card clicks) ─── */}
      
      {/* 1. Crops Planted Detail */}
      <DetailModal
        open={modal === 'crops_planted'}
        onClose={() => setModal(null)}
        title="Crop Inventory Sectors"
        subtitle={`${crops.length} Planted Crops`}
        icon={<Sprout size={16} />}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Below is a breakdown of all crop segments currently registerized inside the farm database:</p>
          <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {crops.map(c => (
              <div key={c._id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-extrabold text-slate-800 dark:text-white">{c.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-farm-900/20 text-farm-400 border border-farm-900/30 uppercase">{c.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <p>Variety: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.variety || 'N/A'}</span></p>
                  <p>Plot: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.field || 'N/A'}</span></p>
                  <p>Planted: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.plant_date || 'N/A'}</span></p>
                  <p>Yield: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.yield_kg ? `${c.yield_kg.toLocaleString()} kg` : 'N/A'}</span></p>
                </div>
              </div>
            ))}
            {crops.length === 0 && <p className="text-center text-xs text-slate-500 py-6">No crop logs available.</p>}
          </div>
        </div>
      </DetailModal>

      {/* 2. Operational Profit Ledger Detail */}
      <DetailModal
        open={modal === 'ledger_profit'}
        onClose={() => setModal(null)}
        title="Operational Ledger Flow"
        subtitle={`Net Profit: $${netProfit.toLocaleString()}`}
        icon={<DollarSign size={16} />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Revenue</p>
              <h5 className="text-lg font-black text-farm-400">${totalIncome.toLocaleString()}</h5>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Expenditures</p>
              <h5 className="text-lg font-black text-red-400">${totalExpense.toLocaleString()}</h5>
            </div>
          </div>
          <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
            {finance.slice(0, 15).map(f => (
              <div key={f._id} className="flex justify-between items-center text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 text-slate-800 dark:text-slate-100">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{f.category}</p>
                  <p className="text-[10px] text-slate-400">{f.date}</p>
                </div>
                <span className={`font-extrabold ${f.type === 'expense' ? 'text-red-400' : 'text-farm-400'}`}>
                  {f.type === 'expense' ? '-' : '+'}${f.amount.toLocaleString()}
                </span>
              </div>
            ))}
            {finance.length === 0 && <p className="text-center text-xs text-slate-500 py-6">No transaction logs available.</p>}
          </div>
        </div>
      </DetailModal>

      {/* 3. Pending Care Duties Detail */}
      <DetailModal
        open={modal === 'pending_duties'}
        onClose={() => setModal(null)}
        title="Active Care & Duties"
        subtitle={`${tasks.filter(t => t.status === 'Pending').length} Pending Tasks`}
        icon={<CheckSquare size={16} />}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Active tasks on the roster requiring operative action:</p>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {tasks.filter(t => t.status === 'Pending').map(t => (
              <div key={t._id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-extrabold text-slate-800 dark:text-white">{t.title}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-900/20 uppercase">{t.priority} Priority</span>
                </div>
                {t.notes && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-2.5">{t.notes}</p>}
                <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
                  <span>Operative: <strong className="text-slate-700 dark:text-slate-300">{t.assigned_to || 'General'}</strong></span>
                  <span>Due: <strong className="text-slate-700 dark:text-slate-300">{t.due_date || 'N/A'}</strong></span>
                </div>
              </div>
            ))}
            {tasks.filter(t => t.status === 'Pending').length === 0 && (
              <p className="text-center text-xs text-slate-500 py-6">All tasks completed! Duty roster is clean.</p>
            )}
          </div>
        </div>
      </DetailModal>

      {/* 4. Registered Operatives Detail */}
      <DetailModal
        open={modal === 'worker_operatives'}
        onClose={() => setModal(null)}
        title="Authorized Operatives"
        subtitle={`${users.length || 1} Farm Users`}
        icon={<Users size={16} />}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">List of worker credentials currently granted access to AgriFarm systems:</p>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/20 text-slate-800 dark:text-slate-100">
            {users.map(u => (
              <div key={u._id} className="flex justify-between items-center p-4">
                <div>
                  <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">
                    {u.username} 
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 ml-2">{u.role}</span>
                  </p>
                  {u.email && <p className="text-[11px] text-slate-500">{u.email}</p>}
                </div>
                <span className="text-[10px] text-farm-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={14} /> Verified
                </span>
              </div>
            ))}
            {users.length === 0 && (
              <div className="flex justify-between items-center p-4">
                <div>
                  <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white">
                    admin 
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 ml-2">admin</span>
                  </p>
                  <p className="text-[11px] text-slate-500">admin@farm.com</p>
                </div>
                <span className="text-[10px] text-farm-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={14} /> Verified
                </span>
              </div>
            )}
          </div>
        </div>
      </DetailModal>

    </div>
  );
}

export default App;
