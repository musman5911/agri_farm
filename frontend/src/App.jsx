import React, { useState, useEffect } from 'react';
import * as api from './api';
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
  Tag,
  MapPin,
  Scale,
  Sun,
  Moon,
  BarChart3,
  HeartPulse,
  Type
} from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'worker');
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Worker');
  
  // Custom states for theme, tabs, and text settings
  const [view, setView] = useState('dashboard'); 
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [textSize, setTextSize] = useState(localStorage.getItem('text_size') || 'base'); // sm, base, md, lg
  
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
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', role: 'worker' });
  const [isRegister, setIsRegister] = useState(false);
  
  const [cropForm, setCropForm] = useState({ name: '', variety: '', status: 'Growing', plant_date: '', harvest_date: '', field: '', yield_kg: '', notes: '' });
  const [finForm, setFinForm] = useState({ category: '', amount: '', type: 'expense', crop_id: 'farm-wide', notes: '' });
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '' });
  const [newWorkerForm, setNewWorkerForm] = useState({ username: '', email: '', password: '', role: 'worker' });

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

  // Theme Sync on body
  useEffect(() => {
    const root = window.document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.backgroundColor = '#070b13';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc';
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password || (isRegister && !authForm.username)) {
      return showAlert("Please fill in all required fields.", true);
    }
    setLoading(true);
    try {
      if (isRegister) {
        await api.signup(authForm.username, authForm.email, authForm.password, authForm.role);
        showAlert("Account created successfully! Please log in.");
        setIsRegister(false);
      } else {
        const res = await api.login(authForm.email, authForm.password);
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('role', res.data.role);
        
        const cleanName = authForm.email.split('@')[0];
        localStorage.setItem('username', cleanName);

        setToken(res.data.access_token);
        setUserRole(res.data.role);
        setUsername(cleanName);
        showAlert("Welcome back to AgriFarm Command!");
      }
    } catch (err) {
      showAlert(err.response?.data?.detail || "Authentication failed. Make sure your database is connected.", true);
    } finally {
      setLoading(false);
    }
  };

  // --- Worker Management (Admin Only) ---
  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerForm.username || !newWorkerForm.email || !newWorkerForm.password) {
      return showAlert("Please complete all worker fields.", true);
    }
    try {
      await api.signup(newWorkerForm.username, newWorkerForm.email, newWorkerForm.password, newWorkerForm.role);
      showAlert(`Worker account '${newWorkerForm.username}' registered!`);
      setNewWorkerForm({ username: '', email: '', password: '', role: 'worker' });
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

  // --- RENDER AUTHENTICATION ---
  if (!token) return (
    <div className="min-h-screen bg-[#070b13] dark:bg-[#070b13] light:bg-slate-100 flex flex-col justify-center items-center px-4">
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
      
      <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover">
        <div className="flex justify-center mb-4">
          <div className="bg-farm-900/40 p-4 rounded-full border border-farm-500/20 text-farm-400">
            <Sprout size={36} className="animate-bounce-soft" />
          </div>
        </div>
        <h2 className="text-center text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
          AgriFarm Command Hub
        </h2>
        <p className="text-center text-slate-500 text-xs mb-8 uppercase tracking-widest font-semibold">
          {isRegister ? "Register a new operative" : "Secure Sign-In Interface"}
        </p>
        
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Username</label>
              <input 
                type="text"
                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-farm-500 transition-colors"
                placeholder="e.g. musman" 
                value={authForm.username}
                onChange={e => setAuthForm({...authForm, username: e.target.value})} 
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
            <input 
              type="email"
              className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-farm-500 transition-colors"
              placeholder="worker@farm.com" 
              value={authForm.email}
              onChange={e => setAuthForm({...authForm, email: e.target.value})} 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Access Password</label>
            <input 
              type="password" 
              className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-farm-500 transition-colors"
              placeholder="••••••••" 
              value={authForm.password}
              onChange={e => setAuthForm({...authForm, password: e.target.value})} 
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Access Level (Role)</label>
              <select 
                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-farm-500 transition-colors"
                value={authForm.role}
                onChange={e => setAuthForm({...authForm, role: e.target.value})}
              >
                <option value="worker">Worker (Standard Access)</option>
                <option value="admin">Administrator (Command Access)</option>
              </select>
            </div>
          )}
          
          <button 
            type="submit" 
            className="w-full py-3 bg-farm-600 hover:bg-farm-700 text-white font-bold rounded-lg transition-colors shadow-lg hover:shadow-farm-500/10 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {isRegister ? "Initiate Operative" : "Access Console"}
          </button>
        </form>
        
        <p className="text-center text-xs text-slate-400 mt-6 cursor-pointer hover:text-slate-200 transition-colors uppercase font-bold tracking-wider" onClick={() => {
          setIsRegister(!isRegister);
          setAuthForm({ username: '', email: '', password: '', role: 'worker' });
        }}>
          {isRegister ? "🔐 Existing Operative? Login" : "Don't have an account? Sign Up"}
        </p>
      </div>
    </div>
  );

  // --- RENDER DASHBOARD ---
  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#070b13] text-slate-100' : 'bg-slate-50 text-slate-800'
    } ${textClassMap[textSize]}`}>
      
      {/* ─── SIDEBAR ─── */}
      <aside className={`w-full md:w-64 flex flex-col justify-between py-6 px-4 shrink-0 shadow-xl border-r ${
        theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-farm-900/50 p-2 rounded-xl border border-farm-500/20 text-farm-400">
              <Sprout size={24} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight m-0 p-0 leading-tight">AgriFarm</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Command Center</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                view === 'dashboard' 
                  ? 'bg-farm-900/40 text-farm-300 border-l-4 border-farm-500' 
                  : 'text-slate-400 hover:bg-slate-800/10 dark:hover:bg-slate-800/40 hover:text-farm-500'
              }`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button 
              onClick={() => setView('crops')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                view === 'crops' 
                  ? 'bg-farm-900/40 text-farm-300 border-l-4 border-farm-500' 
                  : 'text-slate-400 hover:bg-slate-800/10 dark:hover:bg-slate-800/40 hover:text-farm-500'
              }`}
            >
              <Sprout size={16} /> Crops Register
            </button>
            <button 
              onClick={() => setView('finance')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                view === 'finance' 
                  ? 'bg-farm-900/40 text-farm-300 border-l-4 border-farm-500' 
                  : 'text-slate-400 hover:bg-slate-800/10 dark:hover:bg-slate-800/40 hover:text-farm-500'
              }`}
            >
              <DollarSign size={16} /> Financial Ledger
            </button>
            <button 
              onClick={() => setView('tasks')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                view === 'tasks' 
                  ? 'bg-farm-900/40 text-farm-300 border-l-4 border-farm-500' 
                  : 'text-slate-400 hover:bg-slate-800/10 dark:hover:bg-slate-800/40 hover:text-farm-500'
              }`}
            >
              <HeartPulse size={16} /> Care & Health
            </button>
            <button 
              onClick={() => setView('summary')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                view === 'summary' 
                  ? 'bg-farm-900/40 text-farm-300 border-l-4 border-farm-500' 
                  : 'text-slate-400 hover:bg-slate-800/10 dark:hover:bg-slate-800/40 hover:text-farm-500'
              }`}
            >
              <BarChart3 size={16} /> Monthly Summary
            </button>
            <button 
              onClick={() => setView('settings')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                view === 'settings' 
                  ? 'bg-farm-900/40 text-farm-300 border-l-4 border-farm-500' 
                  : 'text-slate-400 hover:bg-slate-800/10 dark:hover:bg-slate-800/40 hover:text-farm-500'
              }`}
            >
              <Settings size={16} /> Settings & Admin
            </button>
          </nav>
        </div>

        {/* User Badge & Logout */}
        <div className="border-t border-slate-800 pt-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{userRole} LEVEL</p>
              <p className="text-xs font-black truncate max-w-[130px]">{username}</p>
            </div>
            <div className="bg-slate-800/40 p-2 rounded-lg text-farm-400 border border-slate-700/50">
              <ShieldCheck size={16} />
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT PANEL ─── */}
      <main className="flex-1 min-w-0 flex flex-col">
        
        {/* Top Header */}
        <header className={`border-b py-4 px-6 md:px-8 flex justify-between items-center shrink-0 transition-colors ${
          theme === 'dark' ? 'bg-[#0f172a]/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <h2 className={`font-black uppercase tracking-wider capitalize ${titleClassMap[textSize]}`}>{view}</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2.5 rounded-xl border transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button onClick={sendWhatsApp} className="hidden sm:flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-transform hover:scale-105 shadow-md">
              <Send size={14} /> WhatsApp Report
            </button>
          </div>
        </header>

        {/* Dynamic Content Views */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* ───────────────── VIEW: DASHBOARD ───────────────── */}
          {view === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-farm-900/20 via-slate-900 to-slate-900 border-farm-500/20' 
                  : 'bg-gradient-to-r from-farm-50 via-white to-white border-farm-200'
              }`}>
                <div>
                  <h2 className="text-xl md:text-2xl font-black leading-tight">Welcome to Command Center, {username}!</h2>
                  <p className="text-slate-400 text-xs mt-1">Telemetry registers, agricultural ledger boards, and worker rosters are successfully synced.</p>
                </div>
                <span className="bg-farm-900/40 text-farm-300 border border-farm-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shrink-0">
                  <ShieldCheck size={14} /> Core Operations Online
                </span>
              </div>

              {/* Status Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Crops Planted</p>
                    <p className="text-2xl md:text-3xl font-black mt-1">{crops.length}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{crops.filter(c => c.status === 'Growing').length} Growing phase</p>
                  </div>
                  <div className="bg-farm-950 text-farm-400 p-3 rounded-xl border border-farm-900/30">
                    <Sprout size={22} />
                  </div>
                </div>

                <div className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ledger Net Profit</p>
                    <p className={`text-2xl md:text-3xl font-black mt-1 ${netProfit >= 0 ? 'text-farm-400' : 'text-red-400'}`}>
                      ${netProfit.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Inflow vs Expense ledger</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${netProfit >= 0 ? 'bg-farm-950 text-farm-400 border-farm-900/30' : 'bg-red-950/40 text-red-400 border-red-900/20'}`}>
                    {netProfit >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                  </div>
                </div>

                <div className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Care roster</p>
                    <p className="text-2xl md:text-3xl font-black mt-1">{tasks.filter(t => t.status === 'Pending').length}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{tasks.filter(t => t.status === 'Completed').length} Duties completed</p>
                  </div>
                  <div className="bg-indigo-950 text-indigo-400 p-3 rounded-xl border border-indigo-900/30">
                    <CheckSquare size={22} />
                  </div>
                </div>

                <div className={`border p-5 rounded-2xl flex items-center justify-between shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Operatives</p>
                    <p className="text-2xl md:text-3xl font-black mt-1">{users.length || 1}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Active worker log registries</p>
                  </div>
                  <div className="bg-teal-950 text-teal-400 p-3 rounded-xl border border-teal-900/30">
                    <Users size={22} />
                  </div>
                </div>
              </div>

              {/* Sub-panels for Quick Actions & Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Active crops preview card */}
                <div className={`border p-6 rounded-2xl shadow-md ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center border-b border-slate-800/10 dark:border-slate-800 pb-4 mb-4">
                    <h4 className="font-bold flex items-center gap-2"><Sprout size={18} className="text-farm-400" /> Planted Sectors</h4>
                    <button onClick={() => setView('crops')} className="text-xs text-farm-500 hover:text-farm-400 font-bold uppercase tracking-wider">View All</button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {crops.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-8">No crops currently registered.</p>
                    ) : crops.slice(0, 4).map(c => (
                      <div key={c._id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/10 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                        <div>
                          <p className="text-xs font-extrabold">{c.name}</p>
                          <p className="text-[10px] text-slate-500">Plot location: {c.field || 'General'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          c.status === 'Growing' ? 'bg-farm-900/20 text-farm-400 border border-farm-900/30' : 'bg-indigo-950 text-indigo-400 border border-indigo-900/30'
                        }`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duty board preview card */}
                <div className={`border p-6 rounded-2xl shadow-md ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center border-b border-slate-800/10 dark:border-slate-800 pb-4 mb-4">
                    <h4 className="font-bold flex items-center gap-2"><HeartPulse size={18} className="text-farm-400" /> Active Care Roster</h4>
                    <button onClick={() => setView('tasks')} className="text-xs text-farm-500 hover:text-farm-400 font-bold uppercase tracking-wider">Open Portal</button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {tasks.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-8">Roster is empty. No care tasks assigned.</p>
                    ) : tasks.filter(t => t.status !== 'Completed').slice(0, 4).map(t => (
                      <div key={t._id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/10 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <Circle size={14} className="text-slate-500 shrink-0" />
                          <div>
                            <p className="text-xs font-extrabold">{t.title}</p>
                            <p className="text-[10px] text-slate-500">Assigned worker: {t.assigned_to || 'Broadcast'}</p>
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
          {view === 'crops' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className="text-lg font-black">Crops & Sector Register</h3>
                  <p className="text-slate-500 text-xs">Analyze crop classification variety, field locations, yields, and cycles.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 ${
                      theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
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
                    className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-transform hover:scale-105 ml-auto shrink-0"
                  >
                    <Plus size={16} /> Log Crop
                  </button>
                </div>
              </div>

              {/* Crops Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crops.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No crops logged. Get started by planting your first crop.
                  </div>
                ) : filteredCrops.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No crops matching this phase filter were found.
                  </div>
                ) : filteredCrops.map((c, idx) => (
                  <div key={c._id} className={`border rounded-2xl p-5 shadow-md hover:border-slate-500/40 transition-all flex flex-col justify-between animate-fade-in ${
                    theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`} style={{animationDelay: `${idx * 0.05}s`}}>
                    <div className="space-y-4">
                      {/* Name & Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-white dark:text-white light:text-slate-900 text-sm md:text-base tracking-tight">{c.name}</h4>
                          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Variety: {c.variety || 'Standard'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          c.status === 'Growing' ? 'bg-farm-900/30 text-farm-400 border border-farm-900/30' :
                          c.status === 'Harvesting' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20' :
                          c.status === 'Completed' ? 'bg-purple-950/40 text-purple-400 border border-purple-900/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>{c.status}</span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] border-y border-slate-800/10 dark:border-slate-800 py-3">
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
                          theme === 'dark' ? 'text-slate-400 bg-slate-900/40 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
                        }`}>
                          {c.notes}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-1.5 mt-5 pt-3 border-t border-slate-800/10 dark:border-slate-800">
                      <button onClick={() => handleEditCrop(c)} className="p-1.5 text-slate-400 hover:text-farm-500 rounded-lg transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteCrop(c._id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────── VIEW: FINANCIAL LEDGER ───────────────── */}
          {view === 'finance' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className="text-lg font-black">Financial Ledger</h3>
                  <p className="text-slate-500 text-xs">Complete bookkeeping for crop seeds, fertilizers, tractor fuels, worker wages, and harvests.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 ${
                      theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
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
                    className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-transform hover:scale-105 ml-auto shrink-0"
                  >
                    <Plus size={16} /> Log Entry
                  </button>
                </div>
              </div>

              {/* Financial Breakdown Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Gross Revenue</p>
                  <h4 className="text-2xl font-black text-farm-400 mt-1">${totalIncome.toLocaleString()}</h4>
                </div>
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Expenditures</p>
                  <h4 className="text-2xl font-black text-red-400 mt-1">${totalExpense.toLocaleString()}</h4>
                </div>
                <div className={`border p-5 rounded-2xl shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Net Operations profit</p>
                  <h4 className={`text-2xl font-black mt-1 ${netProfit >= 0 ? 'text-farm-400' : 'text-red-400'}`}>
                    ${netProfit.toLocaleString()}
                  </h4>
                </div>
              </div>

              {/* Finance list table */}
              <div className={`border rounded-2xl overflow-hidden shadow-md ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className={`text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-b ${
                      theme === 'dark' ? 'bg-[#121b2d] border-slate-800' : 'bg-slate-50 border-slate-200'
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
                      theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'
                    }`}>
                      {finance.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Financial ledger contains no logs.</td></tr>
                      ) : filteredFinance.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No logs found matching this ledger flow filter.</td></tr>
                      ) : filteredFinance.map(f => {
                        const linkedCrop = crops.find(c => c._id === f.crop_id);
                        return (
                        <tr key={f._id} className="hover:bg-slate-800/10 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{f.date}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold">{f.category}</div>
                            {f.notes && <div className="text-[11px] text-slate-400 max-w-xs truncate">{f.notes}</div>}
                          </td>
                          <td className="px-6 py-4">
                            {linkedCrop ? (
                              <span className="inline-flex items-center gap-1.5 bg-farm-900/20 text-farm-400 border border-farm-900/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                <Sprout size={10} /> {linkedCrop.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Farm-wide</span>
                            )}
                          </td>
                          <td className={`px-6 py-4 text-right font-extrabold whitespace-nowrap ${f.type === 'expense' ? 'text-red-400' : 'text-farm-400'}`}>
                            <div className="inline-flex items-center gap-1">
                              {f.type === 'expense' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                              ${f.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1">
                              <button onClick={() => handleEditFinance(f)} className="p-1.5 text-slate-400 hover:text-farm-500 rounded-lg">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => handleDeleteFinance(f._id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg">
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
          {view === 'tasks' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h3 className="text-lg font-black">Crop Care & Health Portal</h3>
                  <p className="text-slate-500 text-xs">Assign and monitor soil checkups, crop watering schedules, and organic pesticide treatments.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 ${
                      theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
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
                    className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-transform hover:scale-105 ml-auto shrink-0"
                  >
                    <Plus size={16} /> Schedule Care
                  </button>
                </div>
              </div>

              {/* Tasks Roster Board */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    Duty care roster is currently clean.
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className={`col-span-full border py-12 rounded-2xl text-center text-slate-500 text-xs font-medium ${
                    theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No duty assignments found matching this status.
                  </div>
                ) : filteredTasks.map((t, idx) => (
                  <div key={t._id} className={`border rounded-2xl p-5 shadow-md flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
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
                        <h4 className={`text-sm md:text-base font-black ${t.status === 'Completed' ? 'line-through text-slate-500' : ''}`}>{t.title}</h4>
                        {t.notes && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.notes}</p>}
                      </div>

                      {/* Info lines */}
                      <div className="border-t border-slate-800/10 dark:border-slate-800/60 pt-3 space-y-1.5 text-xs text-slate-400">
                        <p className="flex items-center gap-2"><Users size={12} className="text-slate-500" /> Operative: <span className="font-semibold">{t.assigned_to || 'Broadcast Duty'}</span></p>
                        <p className="flex items-center gap-2"><Calendar size={12} className="text-slate-500" /> Due Date: <span className="font-semibold">{t.due_date || 'None / Ongoing'}</span></p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-800/10 dark:border-slate-800/60">
                      {t.status === 'Pending' ? (
                        <button 
                          onClick={() => handleCompleteTask(t._id)}
                          className="text-xs text-farm-500 hover:text-farm-400 font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle size={14} /> Complete
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle size={12} /> Duties Completed</span>
                      )}
                      
                      <div className="flex gap-1">
                        <button onClick={() => handleEditTask(t)} className="p-1.5 text-slate-400 hover:text-farm-500 rounded-lg transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDeleteTask(t._id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
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
          {view === 'summary' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-800 pb-5">
                <h3 className="text-lg font-black text-white dark:text-white light:text-slate-900">Monthly Performance Summary</h3>
                <p className="text-slate-500 text-xs">Aggregated analytics and development trend data for crops yield and operational ledger budgets.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Operations Health Checklist */}
                <div className={`border p-6 rounded-2xl shadow-sm space-y-4 ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <h4 className="font-extrabold text-sm md:text-base border-b border-slate-800 pb-3">Operational Milestones Checklist</h4>
                  <ul className="space-y-3 text-xs md:text-sm">
                    <li className="flex items-center gap-3">
                      <CheckCircle size={16} className="text-farm-400" />
                      <span>Planted Sectors Fully Registerized ({crops.length} items)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle size={16} className="text-farm-400" />
                      <span>Ledger flow bookkeeping validated and up-to-date</span>
                    </li>
                    <li className="flex items-center gap-3">
                      {tasks.filter(t => t.status === 'Pending').length === 0 ? (
                        <CheckCircle size={16} className="text-farm-400" />
                      ) : (
                        <Circle size={16} className="text-slate-500" />
                      )}
                      <span>All active duty roster tasks completed ({tasks.filter(t => t.status === 'Pending').length} pending)</span>
                    </li>
                  </ul>
                </div>

                {/* Ledger Breakdown */}
                <div className={`border p-6 rounded-2xl shadow-sm space-y-4 ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <h4 className="font-extrabold text-sm md:text-base border-b border-slate-800 pb-3">Yield Classification Yields</h4>
                  <div className="space-y-3">
                    {crops.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-4">No yield telemetry recorded.</p>
                    ) : crops.filter(c => c.yield_kg > 0).map(c => {
                      return (
                        <div key={c._id} className="flex justify-between items-center text-xs md:text-sm">
                          <span className="font-semibold">{c.name} ({c.variety || 'variety'})</span>
                          <span className="font-bold text-farm-400">{c.yield_kg.toLocaleString()} kg</span>
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
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h4 className="font-extrabold text-sm md:text-base border-b border-slate-800 pb-3 mb-4">Operations Ledger Log History</h4>
                <div className="space-y-3">
                  {finance.map((f, idx) => (
                    <div key={f._id} className="flex justify-between items-center text-xs md:text-sm p-2.5 rounded-lg hover:bg-slate-800/10 dark:hover:bg-slate-900/30">
                      <span className="text-slate-500">{f.date}</span>
                      <span className="font-semibold flex-1 ml-4">{f.category}</span>
                      <span className={`font-bold ${f.type === 'expense' ? 'text-red-400' : 'text-farm-400'}`}>
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

          {/* ───────────────── VIEW: SETTINGS & ADMIN ───────────────── */}
          {view === 'settings' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-800 pb-5">
                <h3 className="text-lg font-black">Settings & System Admin Portal</h3>
                <p className="text-slate-500 text-xs">Configure responsive layouts, account passwords, database atomic backups, and worker registries.</p>
              </div>

              {/* Typography Adjuster */}
              <div className={`border p-6 rounded-2xl shadow-md space-y-4 ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-3 border-b border-slate-800/10 dark:border-slate-800 pb-3">
                  <Type className="text-farm-400" />
                  <div>
                    <h4 className="font-extrabold text-sm md:text-base">Display & Typography Settings</h4>
                    <p className="text-xs text-slate-500">Configure global dashboard font size presentation scales.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {['sm', 'base', 'md', 'lg'].map(size => (
                    <button 
                      key={size}
                      onClick={() => handleTextSizeChange(size)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                        textSize === size 
                          ? 'bg-farm-600 border-farm-500 text-white' 
                          : theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {size === 'sm' ? "Small Font" : size === 'base' ? "Normal Font" : size === 'md' ? "Medium Font" : "Large Font"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Worker Accounts Management Panel (Admin Only) */}
              {userRole === 'admin' ? (
                <div className={`border rounded-2xl p-6 shadow-md space-y-6 ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 border-b border-slate-800/10 dark:border-slate-800 pb-4">
                    <Users className="text-farm-400" />
                    <div>
                      <h4 className="font-extrabold text-sm md:text-base">Worker Account Registries (Admin Privileged)</h4>
                      <p className="text-xs text-slate-500">Create new worker logins, configure access scales, and remove worker registry records.</p>
                    </div>
                  </div>

                  {/* Creation Form */}
                  <form onSubmit={handleAddWorker} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end bg-slate-900/10 dark:bg-[#151d30]/40 p-4 rounded-xl border border-slate-300 dark:border-slate-800">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Username</label>
                      <input 
                        className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500"
                        placeholder="e.g. johan"
                        value={newWorkerForm.username}
                        onChange={e => setNewWorkerForm({...newWorkerForm, username: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Email</label>
                      <input 
                        type="email"
                        className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500"
                        placeholder="johan@farm.com"
                        value={newWorkerForm.email}
                        onChange={e => setNewWorkerForm({...newWorkerForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Password</label>
                      <input 
                        type="password"
                        className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500"
                        placeholder="Secret word"
                        value={newWorkerForm.password}
                        onChange={e => setNewWorkerForm({...newWorkerForm, password: e.target.value})}
                      />
                    </div>
                    <button className="py-2 px-4 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
                      <UserPlus size={14} /> Add Worker
                    </button>
                  </form>

                  {/* Worker Accounts Listing */}
                  <div className="space-y-3">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Registered Operatives ({users.length})</p>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-900/10 dark:bg-[#151d30]/20">
                      {users.map(u => (
                        <div key={u._id} className="flex justify-between items-center p-4">
                          <div>
                            <p className="text-sm font-bold">{u.username} <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 ml-2">{u.role}</span></p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          {u.username !== 'admin' && (
                            <button onClick={() => handleDeleteUser(u._id)} className="p-2 text-slate-400 hover:text-red-400 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`border p-6 rounded-2xl shadow-md text-slate-500 flex items-center gap-3 ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <ShieldCheck size={20} />
                  <p className="text-xs font-medium">Worker account access level detected. Worker registry management panel is restricted to Administrators.</p>
                </div>
              )}

              {/* Database Backup & Restore Center (Admin Only) */}
              {userRole === 'admin' ? (
                <div className={`border rounded-2xl p-6 shadow-md space-y-6 ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 border-b border-slate-800/10 dark:border-slate-800 pb-4">
                    <Database className="text-farm-400" />
                    <div>
                      <h4 className="font-extrabold text-sm md:text-base">Database Backup & Recovery Control (Admin Privileged)</h4>
                      <p className="text-xs text-slate-500">Atomic full-database backup exports and backup recovery restoration.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export */}
                    <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/10 dark:bg-[#151d30]/30 space-y-3">
                      <h5 className="text-sm font-bold">Database Backup Export</h5>
                      <p className="text-xs text-slate-500 leading-relaxed">Download a single-file atomic JSON backup containing all crops, financial logs, duties rosters, and worker lists.</p>
                      <button onClick={handleExportBackup} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all">
                        <Database size={14} /> Download JSON Backup
                      </button>
                    </div>

                    {/* Import/Restore */}
                    <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/10 dark:bg-[#151d30]/30 space-y-3">
                      <h5 className="text-sm font-bold">Database Recovery Restore</h5>
                      <p className="text-xs text-slate-500 leading-relaxed">Restore all databases atomically from a previously downloaded AgriFarm backup file. Warning: This clears all existing tables.</p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-farm-900/30 hover:bg-farm-900/50 text-farm-300 border border-farm-800 hover:border-farm-700 text-xs font-bold rounded-lg cursor-pointer transition-all">
                        <Database size={14} /> Upload & Restore Database
                        <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`border p-6 rounded-2xl shadow-md text-slate-500 flex items-center gap-3 ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <ShieldCheck size={20} />
                  <p className="text-xs font-medium">Worker account access level detected. Database backup and restore center is restricted to Administrators.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ─── MODALS ─── */}

      {/* CROP FORM MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/70 flex justify-center items-center p-4 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowCropModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={20} /></button>
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><Sprout className="text-farm-400" /> {editingCrop ? "Modify Crop Cycle" : "Log New Crop cycle"}</h3>
            
            <form onSubmit={handleCropSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Crop Name *</label>
                  <input required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={cropForm.name} onChange={e => setCropForm({...cropForm, name: e.target.value})} placeholder="e.g. Premium Rice" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Variety / Classification</label>
                  <input className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={cropForm.variety} onChange={e => setCropForm({...cropForm, variety: e.target.value})} placeholder="e.g. Basmati 370" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Field / Plot Sector</label>
                  <input className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={cropForm.field} onChange={e => setCropForm({...cropForm, field: e.target.value})} placeholder="e.g. Sector 3A" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Estimated Yield (kg)</label>
                  <input type="number" step="0.1" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={cropForm.yield_kg} onChange={e => setCropForm({...cropForm, yield_kg: e.target.value})} placeholder="0.0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Planted Date</label>
                  <input type="date" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={cropForm.plant_date} onChange={e => setCropForm({...cropForm, plant_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Harvest Date Target</label>
                  <input type="date" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={cropForm.harvest_date} onChange={e => setCropForm({...cropForm, harvest_date: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Current Cycle Status</label>
                <select 
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500"
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
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Notes / Soil Details</label>
                <textarea rows="2" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={cropForm.notes} onChange={e => setCropForm({...cropForm, notes: e.target.value})} placeholder="Soil pH is 6.5, added organic fertilizer..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowCropModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-bold uppercase tracking-wider">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
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
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowFinanceModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={20} /></button>
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><DollarSign className="text-farm-400" /> {editingFinance ? "Modify Transaction" : "Record Book Log"}</h3>
            
            <form onSubmit={handleFinanceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Ledger Flow *</label>
                  <select 
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500"
                    value={finForm.type}
                    onChange={e => setFinForm({...finForm, type: e.target.value})}
                  >
                    <option value="expense">Expenditure / Outflow (-)</option>
                    <option value="income">Revenue / Inflow (+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Amount ($) *</label>
                  <input required type="number" step="0.01" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={finForm.amount} onChange={e => setFinForm({...finForm, amount: e.target.value})} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Item Description / Category *</label>
                <input required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={finForm.category} onChange={e => setFinForm({...finForm, category: e.target.value})} placeholder="e.g. High-efficiency Sprinkler Purchase" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Associate with Crop Sector</label>
                <select 
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500 font-medium"
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
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Ledger Notes</label>
                <textarea rows="2" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={finForm.notes} onChange={e => setFinForm({...finForm, notes: e.target.value})} placeholder="Purchase verified by musman, receipt attached..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowFinanceModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-bold uppercase tracking-wider">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
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
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowTaskModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={20} /></button>
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2"><CheckSquare className="text-farm-400" /> {editingTask ? "Modify Task Assignment" : "Assign Farm Duty"}</h3>
            
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Duty Description / Assignment Title *</label>
                <input required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="e.g. Fertilize Sector 3 Wheat" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Assign to Worker</label>
                  <select 
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500 font-medium"
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
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Priority Level</label>
                  <select 
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500"
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
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Duty Due Date</label>
                <input type="date" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Task Guidelines / Operational Instructions</label>
                <textarea rows="2" className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-farm-500" value={taskForm.notes} onChange={e => setTaskForm({...taskForm, notes: e.target.value})} placeholder="Ensure irrigation valves are closed after 2 hours..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-bold uppercase tracking-wider">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
                  <CheckCircle size={14} /> {editingTask ? "Update Assignment" : "Assign Duty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
