import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from './api';
import DetailModal from './components/DetailModal';
import AdminMenu from './components/AdminMenu';
import { useConfirm } from './components/ConfirmProvider';
import { 
  Sprout, 
  DollarSign, 
  CheckSquare, 
  Search,
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
  Key,
  Sparkles,
  Download,
  Printer,
  Home,
  Bell,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Zap,
  CloudSun,
  Leaf,
  Droplets,
  Clock
} from 'lucide-react';

function App() {
  const confirm = useConfirm();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'worker');
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Worker');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isDbMock, setIsDbMock] = useState(false);
  
  // Custom states for theme, tabs, and text settings
  const [activeTab, setActiveTab] = useState('dashboard');
  // Top navbar selection is intentionally separate from content tabs because
  // several navigation items share the same existing feature view.
  const [activeNav, setActiveNav] = useState('dashboard');
  const navigateTo = (tab, navKey = tab) => {
    setActiveTab(tab);
    setActiveNav(navKey);
  };
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
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
  
  const [cropsPage, setCropsPage] = useState(1);
  const [financePage, setFinancePage] = useState(1);
  const [tasksPage, setTasksPage] = useState(1);
  const [summaryPeriod, setSummaryPeriod] = useState(3); // 3, 6, or 12 months
  
  const [offlineQueueSize, setOfflineQueueSize] = useState(() => {
    try {
      const queue = JSON.parse(localStorage.getItem('offline_request_queue') || '[]');
      return queue.length;
    } catch {
      return 0;
    }
  });
  
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
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  
  const [cropForm, setCropForm] = useState({ name: '', variety: '', status: 'Growing', plant_date: '', harvest_date: '', field: '', yield_kg: '', notes: '' });
  const [finForm, setFinForm] = useState({ category: '', amount: '', type: 'expense', crop_id: 'farm-wide', notes: '', date: new Date().toISOString().split('T')[0] });
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '' });
  const [newWorkerForm, setNewWorkerForm] = useState({ username: '', password: '', role: 'worker' });

  // Filter States
  const [cropFilter, setCropFilter] = useState('all');
  const [cropSearch, setCropSearch] = useState('');
  const [cropFieldFilter, setCropFieldFilter] = useState('all');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedFinance, setSelectedFinance] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedMonthRow, setSelectedMonthRow] = useState(null);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [financeFilter, setFinanceFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  // Feedback Alert
  const [alertMsg, setAlertMsg] = useState({ text: '', isError: false });

  const showAlert = (text, isError = false) => {
    const cleanText = typeof text === 'string' ? text : JSON.stringify(text);
    setAlertMsg({ text: cleanText, isError });
    setTimeout(() => setAlertMsg({ text: '', isError: false }), 4000);
  };

  // --- PWA Offline Synchronization ---
  const syncOfflineQueue = async () => {
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem('offline_request_queue') || '[]');
    } catch {
      return;
    }
    if (queue.length === 0) return;
    
    showAlert(`📶 Connection restored! Syncing ${queue.length} offline changes to server...`);
    
    let successCount = 0;
    const failedItems = [];
    
    for (const req of queue) {
      try {
        await api.default.request({
          url: req.url,
          method: req.method,
          data: req.data
        });
        successCount++;
      } catch (err) {
        console.error("Failed to replay offline request:", req, err);
        failedItems.push(req);
      }
    }
    
    localStorage.setItem('offline_request_queue', JSON.stringify(failedItems));
    setOfflineQueueSize(failedItems.length);
    
    if (failedItems.length > 0) {
      showAlert(`⚠️ Synced: ${successCount} logs saved. ${failedItems.length} changes failed and will be retried when online.`, true);
    } else {
      showAlert(`✅ Synced! All ${successCount} offline logs successfully saved in database.`);
    }
    refreshData();
  };

  useEffect(() => {
    const handleQueued = (e) => {
      setOfflineQueueSize(e.detail);
      showAlert(`📶 Offline Mode: Operational data saved locally! Auto-syncs on reconnect.`);
    };
    window.addEventListener('offline-request-queued', handleQueued);
    window.addEventListener('online', syncOfflineQueue);
    return () => {
      window.removeEventListener('offline-request-queued', handleQueued);
      window.removeEventListener('online', syncOfflineQueue);
    };
  }, []);

  // Sync setup state on launch
  useEffect(() => {
    api.checkSetup()
      .then(res => {
        const done = res.data.setup_done;
        setSetupDone(done);
        setIsDbMock(res.data.is_mock || false);
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

  const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cropImageMap = {
    wheat: '/crop_cards/wheat.jpg',
    corn: '/crop_cards/corn.jpg',
    bajra: '/crop_cards/bajra.jpg',
    mattar: '/crop_cards/mattar.jpg',
    peas: '/crop_cards/mattar.jpg',
    jundra: '/crop_cards/jundra.jpg'
  };

  const getCropImage = (name = '') => {
    const key = String(name).toLowerCase().trim();
    return cropImageMap[key] || '/crop_cards/wheat.jpg';
  };

  const getCropProgress = (crop) => {
    if (!crop) return 0;
    if (crop.status === 'Completed') return 100;
    if (crop.status === 'Harvesting') return 82;
    if (crop.status === 'Growing') return 58;
    return 0;
  };

  useEffect(() => { 
    if (token) { 
      setLoading(true);
      refreshData().finally(() => setLoading(false));
    } 
  }, [token, cropsPage, financePage, tasksPage]);

  const refreshData = async () => {
    try {
      const cropsRes = await api.getCrops((cropsPage - 1) * 100, 100); setCrops(cropsRes.data);
      const finRes = await api.getFinance((financePage - 1) * 100, 100); setFinance(finRes.data);
      const tasksRes = await api.getTasks((tasksPage - 1) * 100, 100); setTasks(tasksRes.data);
      if (userRole === 'admin') {
        const usersRes = await api.getUsers(); setUsers(usersRes.data);
      }
      try {
        const meRes = await api.getMe();
        setCurrentUserEmail(meRes.data.email || '');
      } catch (meErr) {
        console.warn("Could not load current user profile:", meErr);
      }
    } catch (err) {
      console.error("Data refresh failed:", err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of Usman Agri Farm Command Hub?',
      tone: 'warning',
      confirmLabel: 'Sign Out',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;
    
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
      if (!authForm.username || !authForm.email || !authForm.password || !authForm.confirmPassword) {
        return showAlert("Please complete all initial signup fields.", true);
      }
      if (authForm.password !== authForm.confirmPassword) {
        return showAlert("Passwords do not match. Please verify your password confirmation.", true);
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
      let errMsg = "Authentication failed. Please verify credentials.";
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errMsg = detail;
        } else if (Array.isArray(detail)) {
          // Cleanly extract the first Pydantic validation error message
          errMsg = detail[0]?.msg || JSON.stringify(detail);
        } else {
          errMsg = JSON.stringify(detail);
        }
      }
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
    const ok = await confirm({
      title: 'Delete Worker Account',
      message: 'Are you sure you want to delete this worker account? They will lose access immediately.',
      tone: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;
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
        showAlert("Crop developments updated successfully!");
      } else {
        await api.addCrop(payload);
        showAlert("Crop cycle successfully planted & logged!");
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
    const ok = await confirm({
      title: 'Delete Crop Record',
      message: 'Delete this crop and all associated history? This cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;
    setActionId(id);
    try {
      await api.deleteCrop(id);
      showAlert("Crop cycle record removed successfully!");
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
        showAlert("Ledger transaction successfully updated!");
      } else {
        await api.addFinance(payload);
        showAlert("Financial transaction successfully recorded!");
      }
      setFinForm({ category: '', amount: '', type: 'expense', crop_id: 'farm-wide', notes: '', date: new Date().toISOString().split('T')[0] });
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
      notes: f.notes || '',
      date: f.date || new Date().toISOString().split('T')[0]
    });
    setShowFinanceModal(true);
  };

  const handleDeleteFinance = async (id) => {
    const ok = await confirm({
      title: 'Remove Transaction',
      message: 'Remove this transaction log? This will modify your gross totals.',
      tone: 'danger',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;
    setActionId(id);
    try {
      await api.deleteFinance(id);
      showAlert("Transaction successfully removed from ledger!");
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
        showAlert("Care roster assignment updated successfully!");
      } else {
        await api.addTask(payload);
        showAlert("Care duty successfully scheduled!");
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
      showAlert("Task completed successfully! Confetti on the farm!");
      refreshData();
    } catch (err) {
      showAlert("Failed to update task status.", true);
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteTask = async (id) => {
    const ok = await confirm({
      title: 'Delete Care Task',
      message: 'Delete this duty roster task? This cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;
    setActionId(id);
    try {
      await api.deleteTask(id);
      showAlert("Care task assignment removed successfully!");
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

  // --- Helper Calculations ---
  const totalIncome = finance.filter(f => f.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = finance.filter(f => f.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // --- Premium Monthly Summary & Analytics ---
  const getCutoffDate = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().slice(0, 10);
  };

  const filteredPeriodFinance = finance.filter(f => {
    if (!f.date) return true; // fallback for non-dated farm-wide entries
    return f.date >= getCutoffDate(summaryPeriod);
  });

  const periodIncome = filteredPeriodFinance.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
  const periodExpense = filteredPeriodFinance.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
  const periodNet = periodIncome - periodExpense;
  const periodMargin = periodIncome > 0 ? ((periodNet / periodIncome) * 100).toFixed(1) : '0.0';

  const monthlyComparisonRows = (() => {
    const monthsData = {};
    const now = new Date();
    
    // Seed selected range of months (newest to oldest)
    for (let i = 0; i < summaryPeriod; i++) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mKey = d.toISOString().slice(0, 7); // YYYY-MM
      monthsData[mKey] = { income: 0, expense: 0, cropsCount: 0 };
    }

    // Accumulate ledger entries
    finance.forEach(f => {
      if (f.date && typeof f.date === 'string' && f.date.length >= 7) {
        const mKey = f.date.slice(0, 7);
        if (monthsData[mKey]) {
          if (f.type === 'income') monthsData[mKey].income += f.amount;
          if (f.type === 'expense') monthsData[mKey].expense += f.amount;
        }
      }
    });

    // Accumulate crop cycles
    crops.forEach(c => {
      if (c.plant_date && typeof c.plant_date === 'string' && c.plant_date.length >= 7) {
        const mKey = c.plant_date.slice(0, 7);
        if (monthsData[mKey]) {
          monthsData[mKey].cropsCount += 1;
        }
      }
    });

    return Object.entries(monthsData).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const expenseBreakdown = (() => {
    const categories = {};
    const periodExpenses = filteredPeriodFinance.filter(f => f.type === 'expense');
    periodExpenses.forEach(f => {
      categories[f.category] = (categories[f.category] || 0) + f.amount;
    });
    const totalCatExpense = Object.values(categories).reduce((sum, val) => sum + val, 0);
    return Object.entries(categories)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalCatExpense > 0 ? Math.round((amt / totalCatExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  })();

  const uniqueFields = [...new Set(crops.map(c => c.field).filter(Boolean))];

  const filteredCrops = crops.filter(c => {
    // 1. Status Filter
    if (cropFilter !== 'all' && c.status !== cropFilter) return false;
    
    // 2. Search Filter (by name, variety, or field)
    if (cropSearch) {
      const q = cropSearch.toLowerCase().trim();
      const matchName = String(c.name || '').toLowerCase().includes(q);
      const matchVariety = String(c.variety || '').toLowerCase().includes(q);
      const matchField = String(c.field || '').toLowerCase().includes(q);
      if (!matchName && !matchVariety && !matchField) return false;
    }
    
    // 3. Field Filter
    if (cropFieldFilter !== 'all' && c.field !== cropFieldFilter) return false;
    
    return true;
  });
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
    const msg = `🚜 *AgriFarm Command Report Summary*%0A%0A🌱 *Crops Register:* ${crops.length} total (${cropSummary})%0A💰 *Ledger:* Income $${formatCurrency(totalIncome)} | Expense $${formatCurrency(totalExpense)} (Net: $${formatCurrency(netProfit)})%0A📝 *Worker Roster:* ${pendingCount} pending task assignments.`;
    window.open(`https://wa.me/?text=${msg}`);
  };

  const handleExportMonthlyCSV = () => {
    let csv = "Month,Crops Planted,Income,Expense,Net Profit\n";
    monthlyComparisonRows.forEach(([month, val]) => {
      csv += `"${month}",${val.cropsCount},$${formatCurrency(val.income)},$${formatCurrency(val.expense)},$${formatCurrency(val.income - val.expense)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `agrifarm-monthly-summary-${summaryPeriod}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert("Monthly comparison ledger statement successfully exported to CSV!");
  };

  const handlePrintMonthlyPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return showAlert("Popup blocker active! Please allow popups to print report.", true);
    
    const totalInc = monthlyComparisonRows.reduce((sum, [_, val]) => sum + val.income, 0);
    const totalExp = monthlyComparisonRows.reduce((sum, [_, val]) => sum + val.expense, 0);
    
    const rowsHTML = monthlyComparisonRows.map(([month, val]) => `
      <tr>
        <td><strong>${month}</strong></td>
        <td>${val.cropsCount} cycles</td>
        <td>$${formatCurrency(val.income)}</td>
        <td>$${formatCurrency(val.expense)}</td>
        <td style="color: ${val.income - val.expense >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">
          $${formatCurrency(val.income - val.expense)}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Performance Summary (${summaryPeriod} Months)</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 45px;
            font-size: 13.5px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .title { font-size: 24px; font-weight: 800; color: #14532d; margin: 0; }
          .subtitle { font-size: 11px; color: #15803d; text-transform: uppercase; font-weight: bold; margin-top: 4px; }
          .meta { text-align: right; font-size: 11px; color: #64748b; }
          .summary-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 25px;
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; }
          th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Usman Agri Farm</h1>
            <p class="subtitle">Monthly Performance Summary</p>
          </div>
          <div class="meta">
            <p><strong>Period:</strong> Last ${summaryPeriod} Months</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="summary-box">
          <h3 style="margin-top:0;color:#14532d;">Period Financial Overview</h3>
          <p><strong>Total Income:</strong> $${formatCurrency(totalInc)}</p>
          <p><strong>Total Expense:</strong> $${formatCurrency(totalExp)}</p>
          <p><strong>Period Net Profit:</strong> <span style="font-weight:bold;color:${totalInc - totalExp >= 0 ? '#16a34a' : '#dc2626'}">$${formatCurrency(totalInc - totalExp)}</span></p>
        </div>
        
        <h3>Month-by-Month comparative table</h3>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Crops Planted</th>
              <th>Income</th>
              <th>Expense</th>
              <th>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
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
    <div className="min-h-screen bg-[#faf9f6] dark:bg-[#070b13] flex flex-col justify-center items-center px-4 transition-colors">
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
        <div className="bg-[#fcfbf9] dark:bg-[#0f172a] border border-[#e2dfdb] dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md shrink-0 animate-bounce-soft" 
              onError={(e) => { e.target.onerror = null; e.target.src = "/favicon.svg"; }}
            />
          </div>
          <h2 className="text-center text-slate-800 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
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
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg pl-4 pr-11 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                  placeholder="••••••••" 
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
        <div className="bg-[#fcfbf9] dark:bg-[#0f172a] border border-[#e2dfdb] dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover animate-fade-in">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md shrink-0 animate-bounce-soft" 
              onError={(e) => { e.target.onerror = null; e.target.src = "/favicon.svg"; }}
            />
          </div>
          <h2 className="text-center text-slate-800 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
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
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg pl-4 pr-11 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                  placeholder="Min 6 characters" 
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required
                  className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg pl-4 pr-11 py-3 text-sm focus:outline-none focus:border-farm-500 transition-colors"
                  placeholder="Confirm your password" 
                  value={authForm.confirmPassword || ''}
                  onChange={e => setAuthForm({...authForm, confirmPassword: e.target.value})} 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
        <div className="bg-[#fcfbf9] dark:bg-[#0f172a] border border-[#e2dfdb] dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover animate-fade-in">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md shrink-0 animate-bounce-soft" 
              onError={(e) => { e.target.onerror = null; e.target.src = "/favicon.svg"; }}
            />
          </div>
          <h2 className="text-center text-slate-800 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
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
        <div className="bg-[#fcfbf9] dark:bg-[#0f172a] border border-[#e2dfdb] dark:border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl flex flex-col transition-all pulse-border-hover animate-fade-in">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md shrink-0 animate-bounce-soft" 
              onError={(e) => { e.target.onerror = null; e.target.src = "/favicon.svg"; }}
            />
          </div>
          <h2 className="text-center text-slate-800 dark:text-farm-400 text-2xl font-extrabold tracking-tight mb-1">
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
                placeholder="Min 6 characters" 
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
    <div className={`agri-image02-app min-h-screen flex flex-col transition-colors duration-300 text-xs sm:text-sm md:text-base ${
      isDark ? 'bg-[#070b13] text-slate-100' : 'bg-[#fcfaf2] text-[#1c1917]'
    }`}>
      
      {/* Container wrapper matching flock_farm */}
      <div className="agri-app-shell w-full flex-1 flex">
        
        {/* IMAGE 02 SHELL: premium farm header + left navigation */}
        <div className="agri-image02-layout w-full min-h-screen">
          <header className="agri-image02-header">
            <div className="agri-header-brand">
              <img src="/logo.png" className="agri-brand-logo" onError={(e) => { e.target.onerror = null; e.target.src = "/favicon.svg"; }} alt="Usman Agri Farm" />
              <div>
                <h1>Usman Agri Farm</h1>
                <p>Smart Farming • Better Harvest</p>
              </div>
            </div>
            <div className="agri-header-actions">
              {offlineQueueSize > 0 && (
                <button onClick={syncOfflineQueue} className="agri-icon-button agri-queue" title="Sync offline changes"><Clock size={18}/><span>{offlineQueueSize}</span></button>
              )}
              <button className="agri-icon-button" title="Notifications" aria-label="Notifications"><Bell size={19}/></button>
              
              <button 
                className="agri-icon-button" 
                onClick={() => setIsDark(!isDark)} 
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} 
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={19}/> : <Moon size={19}/>} 
              </button>

              <button className="agri-profile" onClick={() => setAdminMenuOpen(true)} title="Open administrator panel" aria-label="Open administrator panel">
                <span className="agri-avatar"><Users size={18}/></span>
                <span><strong>Welcome - {username}</strong><small>{userRole === 'admin' ? 'Administrator' : 'Worker'}</small></span>
                <ChevronDown size={17}/>
              </button>
              <button className="agri-icon-button agri-logout" onClick={handleLogout} title="Logout" aria-label="Logout"><LogOut size={18}/></button>
            </div>
          </header>

          <nav className="agri-top-nav" aria-label="Primary navigation">
            <div className="agri-top-nav-scroll">
              {[
                ['dashboard', 'Dashboard', Home, 'dashboard'],
                ['crops', 'Crop Manager', Sprout, 'crops'],
                ['finance', 'Financial Ledger', FileText, 'finance'],
                ['tasks', 'Care & Tasks', HeartPulse, 'tasks'],
                ['summary', 'Reports', BarChart3, 'summary']
              ].map(([id, label, Icon, navKey]) => (
                <button
                  key={navKey}
                  type="button"
                  className={`agri-nav-link ${activeNav === navKey ? 'active' : ''}`}
                  onClick={() => {
                    if (navKey === 'summary' && userRole !== 'admin') {
                      showAlert("Access Denied: Only administrators can access the Reports/Summary panel.", true);
                    } else {
                      navigateTo(id, navKey);
                    }
                  }}
                >
                  <Icon size={17}/><span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="agri-body-frame">
            <main className="agri-main-content">
              {isDbMock && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs font-medium shadow-sm animate-fade-in shrink-0">
                  <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 animate-pulse"/><span><strong>Warning: Unreachable MongoDB.</strong> The system is using temporary in-memory storage.</span></div>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">Memory Mode</span>
                </div>
              )}

              <div className="agri-breadcrumb">
                <Home size={17}/><span>Dashboard</span><ChevronRight size={16}/><strong>{activeTab === 'crops' ? 'Crop Manager' : activeTab === 'finance' ? 'Financial Ledger' : activeTab === 'tasks' ? 'Care & Health' : activeTab === 'summary' ? 'Reports' : 'Dashboard'}</strong>
              </div>

              {/* Tab views content area */}
              <div className="flex-1 min-h-0 flex flex-col">
          
          {/* ───────────────── VIEW: DASHBOARD ───────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in flex-1">
              {/* Status Grid Cards using grid-cols-3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div 
                  onClick={() => setModal('crops_planted')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon green"><Sprout size={22}/></span>
                  <div>
                    <small>Crops Planted</small>
                    <strong>{crops.length}</strong>
                    <p>{crops.filter(c => c.status === 'Growing').length} Growing phase</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className={`agri-kpi-icon ${netProfit >= 0 ? 'green' : 'wheat'}`}><TrendingUp size={22}/></span>
                  <div>
                    <small>Operational Profit</small>
                    <strong className={netProfit >= 0 ? 'text-farm-600 dark:text-farm-400' : 'text-red-400'}>
                      ${formatCurrency(netProfit)}
                    </strong>
                    <p>Income vs Outflow ledger</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('pending_duties')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon blue"><CheckSquare size={22}/></span>
                  <div>
                    <small>Duties Scheduled</small>
                    <strong>{tasks.filter(t => t.status === 'Pending').length}</strong>
                    <p>{tasks.filter(t => t.status === 'Completed').length} Duties completed</p>
                  </div>
                </div>
              </div>

              {/* Sub-panels for Quick Actions & Overview */}
              <div className="agri-lower-grid">
                
                {/* Active crops preview card */}
                <section className="agri-panel">
                  <div className="agri-panel-heading">
                    <div>
                      <h3><Sprout size={21} /> Planted Sectors</h3>
                      <p>Latest active crop cycles in the soil.</p>
                    </div>
                    <button onClick={() => navigateTo('crops')} className="agri-text-action">View All <ArrowUpRight size={17}/></button>
                  </div>
                  <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
                    {crops.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-8">No crops currently registered.</p>
                    ) : crops.slice(0, 4).map(c => (
                      <div key={c._id} className={`flex justify-between items-center p-3 rounded-xl border ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <p className="text-xs font-bold">{c.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Plot sector: {c.field || 'General'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          c.status === 'Growing' ? 'bg-farm-900/20 text-farm-600 dark:text-farm-400 border border-farm-900/30' : 'bg-indigo-950 text-indigo-400 border border-indigo-900/30'
                        }`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Duty board preview card */}
                <section className="agri-panel">
                  <div className="agri-panel-heading">
                    <div>
                      <h3><HeartPulse size={21} /> Care & Operations Roster</h3>
                      <p>Current pending care duty schedules.</p>
                    </div>
                    <button onClick={() => navigateTo('tasks')} className="agri-text-action">Open Board <ArrowUpRight size={17}/></button>
                  </div>
                  <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-8">Care roster is clean.</p>
                    ) : tasks.filter(t => t.status !== 'Completed').slice(0, 4).map(t => (
                      <div key={t._id} className={`flex justify-between items-center p-3 rounded-xl border ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Circle size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">{t.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Assigned: {t.assigned_to || 'General'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          t.priority === 'High' ? 'bg-red-950 text-red-400 border border-red-900/20' : 'bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ───────────────── VIEW: CROP MANAGER / IMAGE 02 ───────────────── */}
          {activeTab === 'crops' && (
            <div className="agri-crop-manager animate-fade-in">
              <div className="agri-page-hero">
                <div className="agri-page-title">
                  <div className="agri-title-icon"><Sprout size={30}/></div>
                  <div><h2>Crop Manager</h2><p>Plan • Monitor • Maximize Your Harvest</p></div>
                </div>
                <button onClick={() => { setEditingCrop(null); setCropForm({ name: '', variety: '', status: 'Growing', plant_date: '', harvest_date: '', field: '', yield_kg: '', notes: '' }); setShowCropModal(true); }} className="agri-primary-action"><Plus size={19}/> Add New Crop Record</button>
              </div>

              <div className="agri-kpi-grid">
                <div 
                  onClick={() => setModal('crops_planted')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon wheat"><Sprout size={22}/></span>
                  <div>
                    <small>Total Cropped Area</small>
                    <strong>{crops.length ? `${crops.length}` : '0'} <em>{crops.length === 1 ? 'Crop' : 'Crops'}</em></strong>
                    <p className="up">↗ Live register</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('crops_planted')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon green"><Leaf size={22}/></span>
                  <div>
                    <small>Total Production (Est.)</small>
                    <strong>{(crops.reduce((n,c)=>n+(Number(c.yield_kg)||0),0)/1000).toFixed(1)} <em>Ton</em></strong>
                    <p className="up">↗ From crop records</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('crops_planted')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon green"><Sprout size={22}/></span>
                  <div>
                    <small>Active Crops</small>
                    <strong>{crops.filter(c => ['Growing','Planted','Harvesting'].includes(c.status)).length}</strong>
                    <p>{crops.slice(0,3).map(c=>c.name).filter(Boolean).join(', ') || 'No crops registered'}</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('pending_duties')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon blue"><Droplets size={22}/></span>
                  <div>
                    <small>Care Duties</small>
                    <strong>{tasks.filter(t=>t.status==='Pending').length}</strong>
                    <p>This Month</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon gold"><FileText size={22}/></span>
                  <div>
                    <small>Ledger Entries</small>
                    <strong>{finance.length}</strong>
                    <p>{finance.length ? 'Recorded' : 'No entries yet'}</p>
                  </div>
                </div>
              </div>

              <section className="agri-panel agri-my-crops">
                <div className="agri-panel-heading"><div><h3><Leaf size={21}/> My Crops</h3><p>Monitor every crop record from planting to harvest.</p></div><button onClick={() => { setCropFilter('all'); setCropSearch(''); setCropFieldFilter('all'); }} className="agri-text-action">View All Crops <ArrowUpRight size={17}/></button></div>
                
                {/* Search & Dynamic Filters Bar */}
                <div className={`p-4 mx-5 mt-4 rounded-xl border flex flex-col sm:flex-row gap-3 items-center ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  {/* Search Input */}
                  <div className="relative w-full sm:flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                      <Search size={16} />
                    </span>
                    <input 
                      type="text"
                      placeholder="Search crop, variety, or field plot..."
                      className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none focus:border-farm-500 transition-colors ${
                        isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      value={cropSearch}
                      onChange={(e) => setCropSearch(e.target.value)}
                    />
                  </div>
                  
                  {/* Phase Filter Dropdown */}
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <select 
                      className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 cursor-pointer ${
                        isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      value={cropFilter}
                      onChange={(e) => setCropFilter(e.target.value)}
                    >
                      <option value="all">All Phases</option>
                      <option value="Planted">Planted</option>
                      <option value="Growing">Growing</option>
                      <option value="Harvesting">Harvesting</option>
                      <option value="Completed">Completed</option>
                    </select>

                    {/* Field Plot Filter Dropdown */}
                    <select 
                      className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 cursor-pointer ${
                        isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      value={cropFieldFilter}
                      onChange={(e) => setCropFieldFilter(e.target.value)}
                    >
                      <option value="all">All Fields</option>
                      {uniqueFields.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="agri-crop-grid">
                  {crops.length === 0 ? (
                    <div className="agri-empty-crops"><div><Sprout size={36}/></div><h4>No crop records yet</h4><p>Add your first wheat, corn, bajra, mattar, jundra, or any other crop.</p><button onClick={() => { setEditingCrop(null); setCropForm({ name: '', variety: '', status: 'Growing', plant_date: '', harvest_date: '', field: '', yield_kg: '', notes: '' }); setShowCropModal(true); }} className="agri-primary-action small"><Plus size={16}/> Add Crop</button></div>
                  ) : filteredCrops.length === 0 ? (
                    <div className="agri-empty-crops"><div><Sprout size={36}/></div><h4>No crops match this filter</h4><p>Change the crop phase filter to see other records.</p></div>
                  ) : filteredCrops.map((c, idx) => {
                    const progress = getCropProgress(c);
                    return (
                      <article key={c._id} className="agri-crop-card">
                        <div 
                          className="agri-crop-photo cursor-pointer hover:scale-[1.01] transition-transform" 
                          style={{backgroundImage:`url(${getCropImage(c.name)})`}}
                          onClick={() => setSelectedCrop(c)}
                        >
                          <span className={`agri-status ${String(c.status).toLowerCase()}`}>{c.status}</span>
                          <span className="agri-crop-round-icon"><Sprout size={20}/></span>
                        </div>
                        <div className="agri-crop-card-body">
                          <div className="agri-crop-name cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedCrop(c)}>
                            <div><h4>{c.name}</h4><p>{c.variety || 'Standard Variety'}</p></div>
                            <span className="agri-season">{c.status === 'Planted' ? 'Planned' : c.status}</span>
                          </div>
                          <div className="agri-crop-stats" onClick={() => setSelectedCrop(c)}><span><MapPin size={14}/>{c.field || 'Farm-wide'}</span><span><Scale size={14}/>{c.yield_kg ? `${Number(c.yield_kg).toLocaleString()} kg` : 'Yield pending'}</span></div>
                          <div className="agri-progress" onClick={() => setSelectedCrop(c)}><div><span>Crop Progress</span><strong>{progress}%</strong></div><div className="agri-progress-track"><span style={{width:`${progress}%`}}/></div></div>
                          <div className="agri-crop-actions">
                            <button onClick={() => setSelectedCrop(c)} className="agri-detail-btn"><Eye size={15}/> Details</button>
                            <button onClick={() => handleEditCrop(c)} className="agri-record-btn"><FileText size={15}/> Records</button>
                            {userRole === 'admin' && (
                              <>
                                <button onClick={() => handleEditCrop(c)} className="agri-mini-icon" title="Edit"><Edit3 size={15}/></button>
                                <button onClick={() => handleDeleteCrop(c._id)} className="agri-mini-icon danger" title="Delete"><Trash2 size={15}/></button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className="agri-lower-grid">
                <section className="agri-panel agri-activities"><div className="agri-panel-heading"><div><h3><Calendar size={20}/> Recent Activities</h3></div><button onClick={() => navigateTo('tasks')} className="agri-text-action">View All Activities <ArrowUpRight size={17}/></button></div><div className="agri-activity-list">
                  {tasks.length === 0 && finance.length === 0 && <div className="agri-activity-empty">No activities recorded yet. Your farm activity will appear here automatically.</div>}
                  {tasks.slice(0,3).map(t => <div className="agri-activity-row" key={t._id}><span className="agri-activity-icon green"><Sprout size={17}/></span><div><strong>{t.title}</strong><small>{t.due_date || 'Scheduled duty'}</small></div><b>{t.status || 'Pending'}</b></div>)}
                  {finance.slice(0,2).map(f => <div className="agri-activity-row" key={f._id}><span className="agri-activity-icon purple"><DollarSign size={17}/></span><div><strong>{f.category}</strong><small>{f.date || 'Ledger entry'}</small></div><b>{f.type === 'expense' ? 'Expense' : 'Income'}</b></div>)}
                </div></section>
                <div className="agri-right-stack">
                  <section className="agri-panel agri-weather"><div className="agri-panel-heading"><h3><CloudSun size={20}/> Weather & Farming Tips</h3></div><div className="agri-weather-row"><div className="agri-weather-temp"><Sun size={34}/><div><strong>32°C</strong><span>Partly Cloudy</span><small><MapPin size={12}/> Haripur, Pakistan</small></div></div><div className="agri-tip"><Leaf size={19}/><div><strong>Farming Tip</strong><p>Keep your crops healthy with timely irrigation and balanced fertilizer use.</p></div></div></div></section>
                  <section className="agri-panel agri-quick"><div className="agri-panel-heading"><h3><Zap size={20}/> Quick Actions</h3></div><div className="agri-quick-grid"><button onClick={() => { setEditingCrop(null); setCropForm({ name:'', variety:'', status:'Growing', plant_date:'', harvest_date:'', field:'', yield_kg:'', notes:'' }); setShowCropModal(true); }}><Sprout size={20}/>Add Crop</button><button onClick={() => navigateTo('tasks')}><Calendar size={20}/>Plan Care</button><button onClick={() => navigateTo('finance')}><FileText size={20}/>Ledger</button><button onClick={() => userRole === 'admin' ? navigateTo('summary', 'reports') : setAdminMenuOpen(true)}><BarChart3 size={20}/>View Reports</button></div></section>
                </div>
              </div>

              <div className="agri-crop-filter-bar"><span>Page {cropsPage}</span><button onClick={() => setCropsPage(p=>Math.max(1,p-1))} disabled={cropsPage===1}>Previous</button><button onClick={() => setCropsPage(p=>p+1)} disabled={crops.length<100}>Next</button></div>
            </div>
          )}

          {/* ───────────────── VIEW: FINANCIAL LEDGER ───────────────── */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-fade-in flex-1">
              <div className="agri-page-hero">
                <div className="agri-page-title">
                  <div className="agri-title-icon"><FileText size={30}/></div>
                  <div>
                    <h2>Financial Ledger Book</h2>
                    <p>Verify seed logistics, operational fuels, wages, and harvest sales ledger flows.</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingFinance(null); setFinForm({ category: '', amount: '', type: 'expense', crop_id: 'farm-wide', notes: '', date: new Date().toISOString().split('T')[0] }); setShowFinanceModal(true); }}
                  className="agri-primary-action"
                >
                  <Plus size={19}/> Log Entry
                </button>
              </div>

              {/* Financial Breakdown Panel */}
              <div className="agri-kpi-grid">
                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon green"><TrendingUp size={22}/></span>
                  <div>
                    <small>Gross Income</small>
                    <strong>${formatCurrency(totalIncome)}</strong>
                    <p className="up">↗ Live revenue</p>
                  </div>
                </div>
                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon wheat"><TrendingDown size={22}/></span>
                  <div>
                    <small>Expenditures</small>
                    <strong>${formatCurrency(totalExpense)}</strong>
                    <p className="down text-red-500">↘ Direct outlays</p>
                  </div>
                </div>
                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className={`agri-kpi-icon ${netProfit >= 0 ? 'green' : 'blue'}`}><Scale size={22}/></span>
                  <div>
                    <small>Net Profit Margin</small>
                    <strong className={netProfit >= 0 ? 'text-farm-600 dark:text-farm-400' : 'text-red-400'}>
                      ${formatCurrency(netProfit)}
                    </strong>
                    <p>{netProfit >= 0 ? '↗ Healthy balance' : '⚠️ Deficit status'}</p>
                  </div>
                </div>
              </div>

              {/* Finance list table inside .agri-panel */}
              <section className="agri-panel">
                <div className="agri-panel-heading">
                  <div>
                    <h3><FileText size={21}/> Transaction History</h3>
                    <p>Track direct field expenses and agricultural sales.</p>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 cursor-pointer ${
                        isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      value={financeFilter}
                      onChange={e => setFinanceFilter(e.target.value)}
                    >
                      <option value="all">All Flows</option>
                      <option value="income">Revenue Only</option>
                      <option value="expense">Expense Only</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto p-5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Sector / Crop Link</th>
                        <th className="px-4 py-3 text-right">Ledger Flow</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs md:text-sm ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                    }`}>
                      {finance.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Financial ledger contains no logs.</td></tr>
                      ) : filteredFinance.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No logs found matching this ledger flow filter.</td></tr>
                      ) : filteredFinance.map(f => {
                        const linkedCrop = crops.find(c => c._id === f.crop_id);
                        return (
                          <tr 
                            key={f._id} 
                            onClick={() => setSelectedFinance(f)}
                            className="hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors animate-fade-in cursor-pointer"
                          >
                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{f.date}</td>
                            <td className="px-4 py-4">
                              <div className="font-extrabold text-slate-800 dark:text-slate-100">{f.category}</div>
                              {f.notes && <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate mt-0.5">{f.notes}</div>}
                            </td>
                            <td className="px-4 py-4">
                              {linkedCrop ? (
                                <span className="inline-flex items-center gap-1 bg-farm-900/20 text-farm-600 dark:text-farm-400 border border-farm-900/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  <Sprout size={10} /> {linkedCrop.name}
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 text-xs">Farm-wide</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                                f.type === 'expense' 
                                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {f.type === 'expense' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                ${formatCurrency(f.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right whitespace-nowrap">
                              {userRole === 'admin' ? (
                                <div className="inline-flex gap-1 justify-end">
                                  <button onClick={(e) => { e.stopPropagation(); handleEditFinance(f); }} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-farm-500 rounded-lg cursor-pointer transition-colors" title="Edit Log">
                                    <Edit3 size={14} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFinance(f._id); }} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-400 rounded-lg cursor-pointer transition-colors" title="Delete Log">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 text-xs italic">Read-only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer bar inside panel */}
                <div className="agri-crop-filter-bar px-5 pb-5">
                  <span>Page {financePage}</span>
                  <button onClick={() => setFinancePage(p => Math.max(1, p - 1))} disabled={financePage === 1}>Previous</button>
                  <button onClick={() => setFinancePage(p => p + 1)} disabled={finance.length < 100}>Next</button>
                </div>
              </section>
            </div>
          )}

          {/* ───────────────── VIEW: CARE & HEALTH PORTAL ───────────────── */}
          {activeTab === 'tasks' && (
            <div className="space-y-6 animate-fade-in flex-1">
              <div className="agri-page-hero">
                <div className="agri-page-title">
                  <div className="agri-title-icon"><HeartPulse size={30}/></div>
                  <div>
                    <h2>Crop Care & Health Portal</h2>
                    <p>Assign and monitor soil checkups, crop watering schedules, and organic pesticide treatments.</p>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <button 
                    onClick={() => { setEditingTask(null); setTaskForm({ title: '', due_date: '', assigned_to: '', priority: 'Medium', notes: '' }); setShowTaskModal(true); }}
                    className="agri-primary-action animate-fade-in"
                  >
                    <Plus size={19} /> Schedule Care
                  </button>
                )}
              </div>

              {/* Tasks Roster Board inside an .agri-panel */}
              <section className="agri-panel">
                <div className="agri-panel-heading">
                  <div>
                    <h3><HeartPulse size={21}/> Duty Care Roster</h3>
                    <p>Monitor fertilizer applications, soil checkups, and water rosters.</p>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 cursor-pointer ${
                        isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      value={taskFilter}
                      onChange={e => setTaskFilter(e.target.value)}
                    >
                      <option value="all">All Assignments</option>
                      <option value="Pending">Pending / In-Progress</option>
                      <option value="Completed">Completed Duties</option>
                    </select>
                  </div>
                </div>

                <div className="agri-crop-grid">
                  {tasks.length === 0 ? (
                    <div className="agri-empty-crops">
                      <div><HeartPulse size={36}/></div>
                      <h4>Duty care roster is clean</h4>
                      <p>No active care schedules or tasks registered in the database.</p>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="agri-empty-crops">
                      <div><HeartPulse size={36}/></div>
                      <h4>No duties match filter</h4>
                      <p>Try switching to another status or scheduled care assignment filter.</p>
                    </div>
                  ) : filteredTasks.map((t, idx) => (
                    <article 
                      key={t._id} 
                      className="agri-crop-card cursor-pointer hover:scale-[1.01] transition-transform" 
                      style={{
                        animationDelay: `${idx * .06}s`,
                        opacity: t.status === 'Completed' ? 0.75 : 1
                      }}
                      onClick={() => setSelectedTask(t)}
                    >
                      {/* Card Header styling matching Crop Manager but using icons */}
                      <div className={`h-24 relative flex items-center justify-center ${
                        t.status === 'Completed' 
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' 
                          : t.priority === 'High' 
                            ? 'bg-red-500 dark:bg-red-900/30 text-white' 
                            : 'bg-farm-600 dark:bg-farm-900/30 text-white'
                      }`}>
                        <span className={`agri-status ${t.status === 'Completed' ? 'completed' : t.status === 'Pending' ? 'growing' : 'harvesting'}`}>{t.status}</span>
                        <span className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md text-white border border-white/25 shadow-sm">
                          {t.priority === 'High' ? <AlertTriangle size={24} /> : <HeartPulse size={24} />}
                        </span>
                      </div>

                      <div className="agri-crop-card-body">
                        {/* Title & Priority Tag */}
                        <div className="agri-crop-name">
                          <div>
                            <h4 className={`${t.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>{t.title}</h4>
                            <p className="font-extrabold uppercase text-[9px] tracking-wider text-slate-500 mt-1">
                              {t.priority} Priority
                            </p>
                          </div>
                        </div>

                        {/* Notes / Description */}
                        {t.notes && (
                          <p className={`text-[11px] line-clamp-2 p-2 rounded-lg border my-3 ${
                            isDark ? 'text-slate-400 bg-slate-900/40 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
                          }`}>
                            {t.notes}
                          </p>
                        )}

                        {/* Assignment Details */}
                        <div className="agri-crop-stats pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <span><Users size={14}/> {t.assigned_to || 'Broadcast Duty'}</span>
                          <span><Calendar size={14}/> {t.due_date || 'Ongoing care'}</span>
                        </div>

                        {/* Actions Footer */}
                        <div className="agri-crop-actions border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-3">
                          {t.status === 'Pending' ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleCompleteTask(t._id); }}
                              className="agri-detail-btn flex items-center gap-1.5"
                            >
                              <CheckCircle size={13} /> Complete
                            </button>
                          ) : (
                            <span className="flex-1 text-center py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                              ✓ Done
                            </span>
                          )}

                          {userRole === 'admin' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleEditTask(t); }} className="agri-mini-icon" title="Edit Task">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(t._id); }} className="agri-mini-icon danger" title="Delete Task">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination footer inside panel */}
                <div className="agri-crop-filter-bar px-5 pb-5">
                  <span>Page {tasksPage}</span>
                  <button onClick={() => setTasksPage(p => Math.max(1, p - 1))} disabled={tasksPage === 1}>Previous</button>
                  <button onClick={() => setTasksPage(p => p + 1)} disabled={tasks.length < 100}>Next</button>
                </div>
              </section>
            </div>
          )}

          {/* ───────────────── VIEW: MONTHLY SUMMARY ───────────────── */}
          {/* ───────────────── VIEW: MONTHLY SUMMARY / REPORTS ───────────────── */}
          {activeTab === 'summary' && userRole === 'admin' && (
            <div className="space-y-6 animate-fade-in flex-1">
              <div className="agri-page-hero">
                <div className="agri-page-title">
                  <div className="agri-title-icon"><BarChart3 size={30}/></div>
                  <div>
                    <h2>Monthly Performance Summary</h2>
                    <p>Aggregated analytics and development trend data for crops yield and operational ledger budgets.</p>
                  </div>
                </div>
                
                {/* Period Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analysis Range:</span>
                  <select 
                    className={`border rounded-lg text-xs px-3 py-2 outline-none focus:border-farm-500 font-bold cursor-pointer ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                    value={summaryPeriod}
                    onChange={e => setSummaryPeriod(Number(e.target.value))}
                  >
                    <option value={3}>Last 3 Months</option>
                    <option value={6}>Last 6 Months</option>
                    <option value={12}>Last 12 Months (1 Year)</option>
                  </select>
                </div>
              </div>

              {/* Period Stats Grid using .agri-kpi-grid */}
              <div className="agri-kpi-grid">
                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon green"><TrendingUp size={22}/></span>
                  <div>
                    <small>Period Income</small>
                    <strong>${formatCurrency(periodIncome)}</strong>
                    <p className="up">↗ Live period revenue</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon wheat"><TrendingDown size={22}/></span>
                  <div>
                    <small>Period Expense</small>
                    <strong>${formatCurrency(periodExpense)}</strong>
                    <p className="down text-red-500">↘ Direct period outlays</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className={`agri-kpi-icon ${periodNet >= 0 ? 'green' : 'blue'}`}><Scale size={22}/></span>
                  <div>
                    <small>Operating Profit</small>
                    <strong className={periodNet >= 0 ? 'text-farm-600 dark:text-farm-400' : 'text-red-400'}>
                      ${formatCurrency(periodNet)}
                    </strong>
                    <p>{periodNet >= 0 ? '↗ Period surplus' : '⚠️ Period deficit'}</p>
                  </div>
                </div>

                <div 
                  onClick={() => setModal('ledger_profit')}
                  className="agri-kpi-card cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <span className="agri-kpi-icon gold"><CheckCircle size={22}/></span>
                  <div>
                    <small>Operating Margin</small>
                    <strong>{periodMargin}%</strong>
                    <p>Financial efficiency</p>
                  </div>
                </div>
              </div>

              <div className="agri-lower-grid">
                
                {/* Month-by-Month comparative table inside .agri-panel */}
                <section className="agri-panel">
                  <div className="agri-panel-heading">
                    <div>
                      <h3><BarChart3 size={21}/> Month-by-Month Trends</h3>
                      <p>Comparative crops and ledger cashflows per month (Click to drill down).</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto p-5">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr>
                          <th className="px-4 py-3">Month</th>
                          <th className="px-4 py-3">Crops Planted</th>
                          <th className="px-4 py-3">Income</th>
                          <th className="px-4 py-3">Expense</th>
                          <th className="px-4 py-3 text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-xs md:text-sm ${
                        isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'
                      }`}>
                        {monthlyComparisonRows.map(([month, val]) => (
                          <tr 
                            key={month} 
                            onClick={() => setSelectedMonthRow([month, val])}
                            className="hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors animate-fade-in cursor-pointer"
                          >
                            <td className="px-4 py-4 font-extrabold text-slate-700 dark:text-slate-300">{month}</td>
                            <td className="px-4 py-4 text-slate-500">{val.cropsCount} cycles</td>
                            <td className="px-4 py-4 text-farm-600 dark:text-farm-400 font-bold">${formatCurrency(val.income)}</td>
                            <td className="px-4 py-4 text-red-500 dark:text-red-400 font-bold">${formatCurrency(val.expense)}</td>
                            <td className={`px-4 py-4 text-right font-black ${val.income - val.expense >= 0 ? 'text-farm-500' : 'text-red-500'}`}>
                              ${formatCurrency(val.income - val.expense)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Expense Category Percentage Breakdown inside .agri-panel */}
                <section className="agri-panel">
                  <div className="agri-panel-heading">
                    <div>
                      <h3><TrendingDown size={21}/> Outflow Breakdown</h3>
                      <p>Direct expenditure category analysis (Click to drill down).</p>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-4 overflow-y-auto max-h-[350px]">
                    {expenseBreakdown.map(item => (
                      <div 
                        key={item.category} 
                        onClick={() => setSelectedExpenseCategory(item)}
                        className="space-y-1.5 cursor-pointer hover:bg-slate-100/40 dark:hover:bg-slate-900/10 p-2 rounded-lg transition-colors"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{item.category}</span>
                          <span className="text-slate-500 font-bold">${formatCurrency(item.amount)} ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {expenseBreakdown.length === 0 && (
                      <p className="text-slate-500 text-xs text-center py-8 italic">No expenditures logged during this period range.</p>
                    )}
                  </div>
                </section>

              </div>

              {/* PDF / CSV Exports Row */}
              <div className="flex gap-2 flex-wrap pt-2">
                <button 
                  onClick={handleExportMonthlyCSV}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <Download size={14} /> Export CSV Statement
                </button>
                <button 
                  onClick={handlePrintMonthlyPDF}
                  className="px-4 py-2 bg-farm-600 hover:bg-farm-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Printer size={14} /> Print PDF Performance Statement
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      </div> {/* closes agri-body-frame */}
      </div> {/* closes agri-image02-layout */}
      </div> {/* closes agri-app-shell */}

      {/* Floating Action/Saving Toast Indicator */}
      <AnimatePresence>
        {alertMsg.text && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-[9999] p-4 rounded-xl shadow-2xl border text-xs md:text-sm font-bold flex items-center gap-3 max-w-sm w-full ${
              alertMsg.isError 
                ? 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200' 
                : 'bg-farm-50 dark:bg-farm-950/90 border-farm-200 dark:border-farm-900/60 text-farm-800 dark:text-farm-200'
            }`}
          >
            {alertMsg.isError ? <AlertTriangle size={18} className="text-red-500 shrink-0" /> : <CheckCircle size={18} className="text-farm-500 shrink-0" />}
            <span>{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODALS ─── */}

      {/* CROP FORM MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/70 flex justify-center items-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowCropModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={20} /></button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Sprout className="text-farm-600 dark:text-farm-400" /> {editingCrop ? "Modify Crop Cycle" : "Log New Crop cycle"}</h3>
            
            <form onSubmit={handleCropSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Crop Name *</label>
                  <input required className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.name} onChange={e => setCropForm({...cropForm, name: e.target.value})} placeholder="e.g. Premium Rice" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Variety / Classification</label>
                  <input className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.variety} onChange={e => setCropForm({...cropForm, variety: e.target.value})} placeholder="e.g. Basmati 370" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Field / Plot Sector</label>
                  <input className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.field} onChange={e => setCropForm({...cropForm, field: e.target.value})} placeholder="e.g. Sector 3A" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Estimated Yield (kg)</label>
                  <input type="number" step="0.1" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500" value={cropForm.yield_kg} onChange={e => setCropForm({...cropForm, yield_kg: e.target.value})} placeholder="0.0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Planted Date</label>
                  <input type="date" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium" value={cropForm.plant_date} onChange={e => setCropForm({...cropForm, plant_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Harvest Date Target</label>
                  <input type="date" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium" value={cropForm.harvest_date} onChange={e => setCropForm({...cropForm, harvest_date: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Current Cycle Status</label>
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
                <button type="button" onClick={() => setShowCropModal(false)} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
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
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><DollarSign className="text-farm-600 dark:text-farm-400" /> {editingFinance ? "Modify Transaction" : "Record Book Log"}</h3>
            
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
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Transaction Date *</label>
                <input required type="date" className="w-full bg-slate-100 border border-slate-200 text-slate-900 dark:bg-[#1e293b] dark:border-slate-700 dark:text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-medium" value={finForm.date || ''} onChange={e => setFinForm({...finForm, date: e.target.value})} />
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
                <button type="button" onClick={() => setShowFinanceModal(false)} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
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
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><CheckSquare className="text-farm-600 dark:text-farm-400" /> {editingTask ? "Modify Task Assignment" : "Assign Farm Duty"}</h3>
            
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
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
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
        currentUserEmail={currentUserEmail}
        onUpdateEmail={setCurrentUserEmail}
        isDark={isDark}
        onToggleDark={setIsDark}
        users={users}
        crops={crops}
        finance={finance}
        tasks={tasks}
        refreshData={refreshData}
        showAlert={showAlert}
      />

      {/* ─── DETAIL POPUPS (Dashboard Stat Card clicks) ─── */}

      {/* Financial Ledger Entry Detail */}
      <DetailModal
        open={!!selectedFinance}
        onClose={() => setSelectedFinance(null)}
        title={selectedFinance ? `Ledger Entry: ${selectedFinance.category}` : "Ledger Entry"}
        subtitle={selectedFinance ? `Date: ${selectedFinance.date}` : ""}
        icon={<FileText size={16} />}
      >
        {selectedFinance && (
          <div className="space-y-4 text-slate-800 dark:text-slate-100">
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><FileText size={10} /> Category</p>
                <p className="font-extrabold">{selectedFinance.category}</p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Scale size={10} /> Ledger Flow</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                  selectedFinance.type === 'expense' 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400' 
                    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {selectedFinance.type === 'expense' ? 'Expense' : 'Income'}: ${formatCurrency(selectedFinance.amount)}
                </span>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Sprout size={10} /> Associated Crop</p>
                <p className="font-extrabold">
                  {crops.find(c => c._id === selectedFinance.crop_id)?.name || 'Farm-wide'}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Date Logged</p>
                <p className="font-extrabold">{selectedFinance.date}</p>
              </div>
            </div>
            {selectedFinance.notes && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Additional Notes / Specifications</p>
                <p className="text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-300 italic">"{selectedFinance.notes}"</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Care & Tasks Duty Detail */}
      <DetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask ? `Duty Task: ${selectedTask.title}` : "Duty Task"}
        subtitle={selectedTask ? `Due: ${selectedTask.due_date || 'Ongoing Care'}` : ""}
        icon={<HeartPulse size={16} />}
      >
        {selectedTask && (
          <div className="space-y-4 text-slate-800 dark:text-slate-100">
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Users size={10} /> Assigned Worker</p>
                <p className="font-extrabold">{selectedTask.assigned_to || 'Broadcast Duty'}</p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Task Status</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                  selectedTask.status === 'Completed' 
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400' 
                    : 'bg-farm-50 dark:bg-farm-950/20 border-farm-200 dark:border-farm-900/30 text-farm-600 dark:text-farm-400'
                }`}>
                  {selectedTask.status}
                </span>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> Task Priority</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                  selectedTask.priority === 'High' 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                }`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Due Date</p>
                <p className="font-extrabold">{selectedTask.due_date || 'Ongoing care'}</p>
              </div>
            </div>
            {selectedTask.notes && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Guidelines & Directions</p>
                <p className="text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-300 italic">"{selectedTask.notes}"</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Month Drilled-down Detail */}
      <DetailModal
        open={!!selectedMonthRow}
        onClose={() => setSelectedMonthRow(null)}
        title={selectedMonthRow ? `Monthly Breakdown: ${selectedMonthRow[0]}` : "Monthly Breakdown"}
        subtitle={selectedMonthRow ? `Analysis Summary` : ""}
        icon={<BarChart3 size={16} />}
      >
        {selectedMonthRow && (
          <div className="space-y-4 text-slate-800 dark:text-slate-100">
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Monthly Income</p>
                <p className="font-extrabold text-farm-600 dark:text-farm-400">${formatCurrency(selectedMonthRow[1].income)}</p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Monthly Expense</p>
                <p className="font-extrabold text-red-500">${formatCurrency(selectedMonthRow[1].expense)}</p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Monthly Net Profit</p>
                <p className={`font-extrabold ${selectedMonthRow[1].income - selectedMonthRow[1].expense >= 0 ? 'text-farm-600 dark:text-farm-400' : 'text-red-500'}`}>
                  ${formatCurrency(selectedMonthRow[1].income - selectedMonthRow[1].expense)}
                </p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Crops Cycles Active</p>
                <p className="font-extrabold">{selectedMonthRow[1].cropsCount} active cycles</p>
              </div>
            </div>
            
            {/* List crops matching this month */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Crops Planted / Monitored in {selectedMonthRow[0]}</p>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1 text-xs">
                {crops.filter(c => String(c.plant_date || '').startsWith(selectedMonthRow[0].slice(0, 7))).map(c => (
                  <div key={c._id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 flex justify-between items-center">
                    <span className="font-bold">{c.name} ({c.variety || 'Standard'})</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-farm-900/20 text-farm-600 dark:text-farm-400 border border-farm-900/30">{c.status}</span>
                  </div>
                ))}
                {crops.filter(c => String(c.plant_date || '').startsWith(selectedMonthRow[0].slice(0, 7))).length === 0 && (
                  <p className="text-slate-500 italic py-2">No new crop cycle registrations logged in this month.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Expense Category Drilled-down Detail */}
      <DetailModal
        open={!!selectedExpenseCategory}
        onClose={() => setSelectedExpenseCategory(null)}
        title={selectedExpenseCategory ? `Category: ${selectedExpenseCategory.category}` : "Category Breakdown"}
        subtitle={selectedExpenseCategory ? `Total: $${formatCurrency(selectedExpenseCategory.amount)}` : ""}
        icon={<TrendingDown size={16} />}
      >
        {selectedExpenseCategory && (
          <div className="space-y-4 text-slate-800 dark:text-slate-100">
            <p className="text-xs text-slate-500 dark:text-slate-400">All direct outlays and ledger transactions matching this expenditure category:</p>
            <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 text-xs">
              {finance.filter(f => f.type === 'expense' && f.category === selectedExpenseCategory.category).map(f => (
                <div key={f._id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 dark:text-white">{f.date}</span>
                    <span className="font-black text-red-500 dark:text-red-400">${formatCurrency(f.amount)}</span>
                  </div>
                  {f.notes && <p className="text-slate-500 leading-relaxed font-semibold italic">"{f.notes}"</p>}
                  <p className="text-[10px] text-slate-400">Crop sector: {crops.find(c => c._id === f.crop_id)?.name || 'Farm-wide'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailModal>

      {/* 0. Individual Crop Detail with timeline */}
      <DetailModal
        open={!!selectedCrop}
        onClose={() => setSelectedCrop(null)}
        title={selectedCrop ? `Crop Profile: ${selectedCrop.name}` : "Crop Profile"}
        subtitle={selectedCrop ? `Variety: ${selectedCrop.variety || 'Standard Variety'}` : ""}
        icon={<Sprout size={16} />}
      >
        {selectedCrop && (
          <div className="space-y-6 text-slate-800 dark:text-slate-100">
            {/* Timeline Row */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/20 space-y-3">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Growth Timeline Stage</p>
              <div className="flex items-center justify-between relative pt-2">
                {/* Connecting Line */}
                <div className="absolute top-5 left-2 right-2 h-1 bg-slate-200 dark:bg-slate-800 -z-0 rounded-full">
                  <div 
                    className="h-full bg-farm-600 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${
                        selectedCrop.status === 'Planted' ? '0%' :
                        selectedCrop.status === 'Growing' ? '58%' :
                        selectedCrop.status === 'Harvesting' ? '82%' :
                        selectedCrop.status === 'Completed' ? '100%' : '0%'
                      }` 
                    }}
                  />
                </div>
                
                {/* Timeline nodes */}
                {["Planted", "Growing", "Harvesting", "Completed"].map((stage, idx) => {
                  const isPassedOrCurrent = 
                    (selectedCrop.status === 'Planted' && idx <= 0) ||
                    (selectedCrop.status === 'Growing' && idx <= 1) ||
                    (selectedCrop.status === 'Harvesting' && idx <= 2) ||
                    (selectedCrop.status === 'Completed' && idx <= 3);
                  
                  return (
                    <div key={stage} className="flex flex-col items-center space-y-1.5 z-10 relative">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-[10px] shadow-sm ${
                        isPassedOrCurrent 
                          ? 'bg-farm-600 border-farm-500 text-white' 
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                        isPassedOrCurrent ? 'text-farm-600 dark:text-farm-400' : 'text-slate-400'
                      }`}>{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><MapPin size={10} /> Sector Plot</p>
                <p className="font-extrabold">{selectedCrop.field || 'Farm-wide'}</p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Scale size={10} /> Yield harvested</p>
                <p className="font-extrabold">{selectedCrop.yield_kg ? `${Number(selectedCrop.yield_kg).toLocaleString()} kg` : 'None yet'}</p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Planting Date</p>
                <p className="font-extrabold">{selectedCrop.plant_date || 'N/A'}</p>
              </div>
              <div className="space-y-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Expected Harvest</p>
                <p className="font-extrabold">{selectedCrop.harvest_date || 'N/A'}</p>
              </div>
            </div>

            {selectedCrop.notes && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Additional Notes & Comments</p>
                <p className="text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-300 italic">"{selectedCrop.notes}"</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-farm-900/20 text-farm-600 dark:text-farm-400 border border-farm-900/30 uppercase">{c.status}</span>
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
        subtitle={`Net Profit: $${formatCurrency(netProfit)}`}
        icon={<DollarSign size={16} />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Revenue</p>
              <h5 className="text-lg font-black text-farm-600 dark:text-farm-400">${formatCurrency(totalIncome)}</h5>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Expenditures</p>
              <h5 className="text-lg font-black text-red-400">${formatCurrency(totalExpense)}</h5>
            </div>
          </div>
          <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
            {finance.slice(0, 15).map(f => (
              <div key={f._id} className="flex justify-between items-center text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 text-slate-800 dark:text-slate-100">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{f.category}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{f.date}</p>
                </div>
                <span className={`font-extrabold ${f.type === 'expense' ? 'text-red-400' : 'text-farm-600 dark:text-farm-400'}`}>
                  {f.type === 'expense' ? '-' : '+'}${formatCurrency(f.amount)}
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
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
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
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-700 ml-2">admin</span>
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
