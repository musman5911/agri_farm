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
  Circle
} from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('crops'); 
  const [crops, setCrops] = useState([]);
  const [finance, setFinance] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });

  // Input Forms State
  const [cropName, setCropName] = useState('');
  const [finForm, setFinForm] = useState({ cat: '', amt: '', type: 'expense' });
  const [taskName, setTaskName] = useState('');
  
  // Loading & action locks
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null); // Tracks currently deleting/updating ID
  
  // Feedback alerts
  const [alertMsg, setAlertMsg] = useState({ text: '', isError: false });

  const showAlert = (text, isError = false) => {
    setAlertMsg({ text, isError });
    setTimeout(() => setAlertMsg({ text: '', isError: false }), 4000);
  };

  useEffect(() => { 
    if (token) { 
      setLoading(true);
      Promise.all([loadCrops(), loadFinance(), loadTasks()])
        .finally(() => setLoading(false));
    } 
  }, [token]);

  const loadCrops = () => {
    return api.getCrops()
      .then(res => setCrops(res.data))
      .catch(err => {
        console.error("Crops loading failed", err);
        if (err.response?.status === 401) handleLogout();
      });
  };

  const loadFinance = () => {
    return api.getFinance()
      .then(res => setFinance(res.data))
      .catch(err => {
        console.error("Finance loading failed", err);
        if (err.response?.status === 401) handleLogout();
      });
  };

  const loadTasks = () => {
    return api.getTasks()
      .then(res => setTasks(res.data))
      .catch(err => {
        console.error("Tasks loading failed", err);
        if (err.response?.status === 401) handleLogout();
      });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password || (isRegister && !authForm.username)) {
      showAlert("Please fill in all required fields.", true);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await api.signup(authForm.username, authForm.email, authForm.password);
        showAlert("Account created successfully! Please log in.");
        setIsRegister(false);
      } else {
        const res = await api.login(authForm.email, authForm.password);
        localStorage.setItem('token', res.data.access_token);
        setToken(res.data.access_token);
        showAlert("Logged in successfully!");
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
      showAlert(errMsg, true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    window.location.reload();
  };

  // --- Actions ---
  const handleAddCrop = async (e) => {
    e.preventDefault();
    if (!cropName.trim()) return showAlert("Crop name cannot be empty.", true);
    try {
      await api.addCrop({ name: cropName.trim(), status: 'Growing' });
      setCropName(''); 
      loadCrops();
      showAlert("Crop added successfully!");
    } catch (err) {
      showAlert("Failed to add crop. Server error.", true);
    }
  };

  const handleUpdateCropStatus = async (id, status) => {
    setActionId(id);
    try {
      await api.updateCropStatus(id, status);
      loadCrops();
      showAlert(`Crop status updated to ${status}!`);
    } catch (err) {
      showAlert("Failed to update status.", true);
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteCrop = async (id) => {
    if (!confirm("Are you sure you want to remove this crop from the farm list?")) return;
    setActionId(id);
    try {
      await api.deleteCrop(id);
      loadCrops();
      showAlert("Crop removed.");
    } catch (err) {
      showAlert("Failed to delete crop.", true);
    } finally {
      setActionId(null);
    }
  };

  const handleAddFinance = async (e) => {
    e.preventDefault();
    if (!finForm.cat.trim() || !finForm.amt) {
      return showAlert("Please provide an item description and amount.", true);
    }
    const amtFloat = parseFloat(finForm.amt);
    if (isNaN(amtFloat) || amtFloat <= 0) {
      return showAlert("Amount must be a positive number.", true);
    }

    try {
      await api.addFinance({ category: finForm.cat.trim(), amount: amtFloat, type: finForm.type });
      setFinForm({ cat: '', amt: '', type: 'expense' }); 
      loadFinance();
      showAlert("Finance log saved!");
    } catch (err) {
      showAlert("Failed to save finance log.", true);
    }
  };

  const handleDeleteFinance = async (id) => {
    if (!confirm("Delete this financial log?")) return;
    setActionId(id);
    try {
      await api.deleteFinance(id);
      loadFinance();
      showAlert("Financial entry deleted.");
    } catch (err) {
      showAlert("Failed to delete finance log.", true);
    } finally {
      setActionId(null);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return showAlert("Task description cannot be empty.", true);
    try {
      await api.addTask({ title: taskName.trim() });
      setTaskName(''); 
      loadTasks();
      showAlert("Task assigned successfully!");
    } catch (err) {
      showAlert("Failed to assign task.", true);
    }
  };

  const handleCompleteTask = async (id) => {
    setActionId(id);
    try {
      await api.completeTask(id);
      loadTasks();
      showAlert("Task marked as completed!");
    } catch (err) {
      showAlert("Failed to complete task.", true);
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Remove this task entirely?")) return;
    setActionId(id);
    try {
      await api.deleteTask(id);
      loadTasks();
      showAlert("Task removed.");
    } catch (err) {
      showAlert("Failed to delete task.", true);
    } finally {
      setActionId(null);
    }
  };

  const sendWhatsApp = () => {
    const activeCrops = crops.map(c => `${c.name} (${c.status})`).join(', ') || 'None';
    const pendingTasks = tasks.filter(t => t.status === 'Pending').map(t => t.title).join(', ') || 'None';
    const msg = `🚜 *AgriFarm Report Summary*%0A%0A🌱 *Crops:* ${crops.length} total (${activeCrops})%0A📝 *Pending Tasks:* ${tasks.filter(t=>t.status==='Pending').length} (${pendingTasks})`;
    window.open(`https://wa.me/?text=${msg}`);
  };

  // --- Auth View (Signup/Login) ---
  if (!token) return (
    <div style={{background: '#0d0d11', color: '#e4e4e7', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', fontFamily: 'sans-serif'}}>
      {alertMsg.text && (
        <div style={{
          ...styles.alert, 
          background: alertMsg.isError ? '#ef4444' : '#2d6a4f',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
            {alertMsg.isError ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>{alertMsg.text}</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleAuthSubmit} style={styles.authCard}>
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
          <div style={{background: '#2d6a4f', padding: '15px', borderRadius: '50%', color: '#80ed99'}}>
            <Sprout size={32} className="animate-bounce-soft" />
          </div>
        </div>
        <h2 style={{textAlign: 'center', color: '#80ed99', fontSize: '24px', margin: '0 0 8px 0'}}>
          AgriFarm Manager
        </h2>
        <p style={{textAlign: 'center', color: '#888', fontSize: '14px', marginBottom: '25px'}}>
          {isRegister ? "Register a new worker account" : "Sign in to manage farm operations"}
        </p>
        
        {isRegister && (
          <div style={styles.inputWrapper}>
            <input 
              style={styles.input} 
              placeholder="Username" 
              value={authForm.username}
              onChange={e => setAuthForm({...authForm, username: e.target.value})} 
            />
          </div>
        )}
        
        <input 
          style={styles.input} 
          type="email"
          placeholder="Email Address" 
          value={authForm.email}
          onChange={e => setAuthForm({...authForm, email: e.target.value})} 
        />
        
        <input 
          style={styles.input} 
          type="password" 
          placeholder="Password" 
          value={authForm.password}
          onChange={e => setAuthForm({...authForm, password: e.target.value})} 
        />
        
        <button style={styles.btnGreen} disabled={loading}>
          {loading ? (
            <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              <Loader size={18} className="animate-spin" /> Verifying...
            </span>
          ) : (
            <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
              {isRegister ? "Create Account" : "Access Dashboard"}
            </span>
          )}
        </button>
        
        <p style={{textAlign: 'center', fontSize: '14px', color: '#a8a8b3', marginTop: '20px', cursor: 'pointer', transition: 'color 0.2s'}} onClick={() => {
          setIsRegister(!isRegister);
          setAuthForm({ username: '', email: '', password: '' });
        }}>
          {isRegister ? "Already registered? Sign In" : "New worker? Register an account"}
        </p>
      </form>
    </div>
  );

  // --- Main Dashboard View ---
  return (
    <div style={{fontFamily: 'sans-serif', background: '#0d0d11', color: '#e4e4e7', minHeight: '100vh'}}>
      {/* Navbar */}
      <nav style={styles.nav}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{background: '#2d6a4f', padding: '8px', borderRadius: '10px', color: '#80ed99', display: 'flex'}}>
            <Sprout size={24} />
          </div>
          <h2 style={{color: '#80ed99', margin: 0, fontSize: '20px', fontWeight: 'bold'}}>AgriFarm</h2>
        </div>
        <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
            <button style={{...styles.navBtn, color: view === 'crops' ? '#80ed99' : 'white', background: view === 'crops' ? '#1b4332' : 'none'}} onClick={() => setView('crops')}>
              <Sprout size={16} /> Crops
            </button>
            <button style={{...styles.navBtn, color: view === 'finance' ? '#80ed99' : 'white', background: view === 'finance' ? '#1b4332' : 'none'}} onClick={() => setView('finance')}>
              <DollarSign size={16} /> Finance
            </button>
            <button style={{...styles.navBtn, color: view === 'tasks' ? '#80ed99' : 'white', background: view === 'tasks' ? '#1b4332' : 'none'}} onClick={() => setView('tasks')}>
              <CheckSquare size={16} /> Tasks
            </button>
            <button style={styles.navBtnLogout} onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
        </div>
      </nav>

      {/* Floating Notifications */}
      {alertMsg.text && (
        <div style={{
          ...styles.floatingAlert, 
          background: alertMsg.isError ? '#ef4444' : '#2d6a4f',
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            {alertMsg.isError ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>{alertMsg.text}</span>
          </div>
        </div>
      )}

      {/* Primary Dashboard Container */}
      <div style={{padding: '40px 20px', maxWidth: '850px', margin: '0 auto'}} className="animate-fade-in-up">
        
        {/* --- CROPS SECTION --- */}
        {view === 'crops' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: '15px', marginBottom: '25px'}}>
              <h3 style={{margin: 0, color: '#80ed99', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Sprout /> Crop Tracking Center
              </h3>
              <span style={styles.badge}>{crops.length} Crops Listed</span>
            </div>

            <form onSubmit={handleAddCrop} style={styles.formContainer}>
              <input 
                style={styles.inputInline} 
                placeholder="Enter crop name (e.g. Premium Basmati Rice)" 
                value={cropName} 
                onChange={e => setCropName(e.target.value)} 
              />
              <button style={styles.btnGreenSmall} type="submit">
                <Plus size={18} /> Add Crop
              </button>
            </form>

            <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {loading ? (
                  <p style={styles.emptyText}><Loader className="animate-spin" /> Fetching farm inventory...</p>
                ) : crops.length === 0 ? (
                  <p style={styles.emptyText}>No crops registered in this sector. Add one to get started.</p>
                ) : (
                  crops.map((c, idx) => (
                    <div key={c._id} style={styles.card} className="animate-fade-in" style={{animationDelay: `${idx * 0.05}s`}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                        <div>
                          <p style={{margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'white'}}>{c.name}</p>
                          <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <Calendar size={12} /> Status: <span style={{color: c.status === 'Growing' ? '#80ed99' : c.status === 'Harvesting' ? '#ffd166' : '#a855f7'}}>{c.status}</span>
                          </p>
                        </div>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          {/* Quick Status Modifiers */}
                          <select 
                            style={styles.cardSelect} 
                            value={c.status} 
                            onChange={(e) => handleUpdateCropStatus(c._id, e.target.value)}
                            disabled={actionId === c._id}
                          >
                            <option value="Growing">Growing</option>
                            <option value="Harvesting">Harvesting</option>
                            <option value="Completed">Completed</option>
                          </select>
                          
                          <button 
                            style={styles.btnDanger} 
                            onClick={() => handleDeleteCrop(c._id)}
                            disabled={actionId === c._id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
            </div>
          </div>
        )}

        {/* --- FINANCE SECTION --- */}
        {view === 'finance' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: '15px', marginBottom: '25px'}}>
              <h3 style={{margin: 0, color: '#80ed99', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <DollarSign /> Ledger & Invoices
              </h3>
              <span style={styles.badge}>{finance.length} Transactions</span>
            </div>

            {/* Quick Stat Summary cards */}
            <div style={styles.financeSummaryRow}>
              <div style={styles.financeSummaryCard}>
                <p style={{margin: 0, fontSize: '12px', color: '#888'}}>TOTAL INCOME</p>
                <h4 style={{margin: '5px 0 0 0', color: '#80ed99', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                  <TrendingUp size={20} />
                  ${finance.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0).toLocaleString()}
                </h4>
              </div>
              <div style={styles.financeSummaryCard}>
                <p style={{margin: 0, fontSize: '12px', color: '#888'}}>TOTAL OUTFLOW</p>
                <h4 style={{margin: '5px 0 0 0', color: '#ffadad', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                  <TrendingDown size={20} />
                  ${finance.filter(f => f.type === 'expense').reduce((a, b) => a + b.amount, 0).toLocaleString()}
                </h4>
              </div>
            </div>

            <form onSubmit={handleAddFinance} style={styles.formContainer}>
              <input 
                style={styles.inputInline} 
                placeholder="Item / Category Description" 
                value={finForm.cat} 
                onChange={e => setFinForm({...finForm, cat: e.target.value})} 
              />
              <input 
                style={{...styles.inputInline, maxWidth: '120px'}} 
                type="number" 
                placeholder="Amount ($)" 
                value={finForm.amt} 
                onChange={e => setFinForm({...finForm, amt: e.target.value})} 
              />
              <select 
                style={styles.selectInline} 
                value={finForm.type} 
                onChange={e => setFinForm({...finForm, type: e.target.value})}
              >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
              </select>
              <button style={styles.btnGreenSmall} type="submit">
                <Plus size={18} /> Save Log
              </button>
            </form>

            <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {loading ? (
                  <p style={styles.emptyText}><Loader className="animate-spin" /> Recalculating ledger...</p>
                ) : finance.length === 0 ? (
                  <p style={styles.emptyText}>No financial logs saved for this crop cycle.</p>
                ) : (
                  finance.map((f, idx) => (
                      <div key={f._id} style={styles.card} className="animate-fade-in" style={{animationDelay: `${idx * 0.05}s`}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div>
                            <p style={{margin: 0, fontSize: '15px', fontWeight: 'bold'}}>{f.category}</p>
                            <p style={{margin: '4px 0 0 0', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px'}}>
                              <Calendar size={12} /> Logged: {f.date}
                            </p>
                          </div>
                          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            <span style={{
                              color: f.type === 'expense' ? '#ffadad' : '#80ed99', 
                              fontSize: '16px', 
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {f.type === 'expense' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                              {f.type === 'expense' ? '-' : '+'}${f.amount.toLocaleString()}
                            </span>
                            
                            <button 
                              style={styles.btnDanger} 
                              onClick={() => handleDeleteFinance(f._id)}
                              disabled={actionId === f._id}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                  ))
                )}
            </div>
          </div>
        )}

        {/* --- TASKS SECTION --- */}
        {view === 'tasks' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: '15px', marginBottom: '25px'}}>
              <h3 style={{margin: 0, color: '#80ed99', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <CheckSquare /> Farm Duty Roster
              </h3>
              <span style={styles.badge}>{tasks.filter(t => t.status === 'Pending').length} Pending Tasks</span>
            </div>

            <form onSubmit={handleAddTask} style={styles.formContainer}>
              <input 
                style={styles.inputInline} 
                placeholder="Enter new farm assignment (e.g. Harvest Sector 3 Wheat)..." 
                value={taskName} 
                onChange={e => setTaskName(e.target.value)} 
              />
              <button style={styles.btnGreenSmall} type="submit">
                <Plus size={18} /> Assign Task
              </button>
            </form>

            <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {loading ? (
                  <p style={styles.emptyText}><Loader className="animate-spin" /> Reading assignments...</p>
                ) : tasks.length === 0 ? (
                  <p style={styles.emptyText}>Roster is currently empty. No worker duties recorded.</p>
                ) : (
                  tasks.map((t, idx) => (
                      <div key={t._id} style={{
                        ...styles.card,
                        borderLeftColor: t.status === 'Completed' ? '#444' : '#2d6a4f',
                        opacity: t.status === 'Completed' ? 0.6 : 1
                      }} className="animate-fade-in" style={{animationDelay: `${idx * 0.05}s`}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            {t.status === 'Completed' ? (
                              <CheckCircle size={18} style={{color: '#80ed99'}} />
                            ) : (
                              <Circle size={18} style={{color: '#888'}} />
                            )}
                            <div>
                              <p style={{
                                margin: 0, 
                                fontSize: '15px', 
                                textDecoration: t.status === 'Completed' ? 'line-through' : 'none', 
                                color: t.status === 'Completed' ? '#888' : 'white'
                              }}>{t.title}</p>
                              <span style={{
                                color: t.status === 'Completed' ? '#888' : '#e0aaff', 
                                fontSize: '12px',
                                display: 'block',
                                marginTop: '2px'
                              }}>
                                Status: {t.status}
                              </span>
                            </div>
                          </div>
                          <div style={{display: 'flex', gap: '8px'}}>
                            {t.status === 'Pending' && (
                              <button style={styles.btnDone} onClick={() => handleCompleteTask(t._id)} disabled={actionId === t._id}>
                                <CheckCircle size={14} /> Done
                              </button>
                            )}
                            <button 
                              style={styles.btnDanger} 
                              onClick={() => handleDeleteTask(t._id)}
                              disabled={actionId === t._id}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                  ))
                )}
            </div>
            
            <button onClick={sendWhatsApp} style={styles.btnWA}>
              <Send size={18} /> Send Roster Summary on WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
    nav: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', background: '#121217', borderBottom: '1px solid #222', flexWrap: 'wrap', gap: '10px'},
    navBtn: {background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'},
    navBtnLogout: {background: '#3a0c11', color: '#ff8a8a', border: '1px solid #5a181e', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'},
    authCard: {background: '#121217', padding: '40px', borderRadius: '15px', width: '340px', border: '1px solid #222', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'},
    input: {display: 'block', width: '100%', padding: '12px 16px', margin: '10px 0', background: '#1a1a24', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box'},
    inputInline: {padding: '12px 16px', background: '#121217', border: '1px solid #333', color: 'white', borderRadius: '8px', flex: '1', minWidth: '180px', outline: 'none', fontSize: '14px', transition: 'all 0.2s'},
    selectInline: {padding: '12px 16px', background: '#121217', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '14px'},
    cardSelect: {padding: '6px 12px', background: '#1a1a24', border: '1px solid #333', color: 'white', borderRadius: '6px', outline: 'none', fontSize: '12px', cursor: 'pointer'},
    formContainer: {display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', alignItems: 'center'},
    btnGreen: {width: '100%', padding: '12px', background: '#2d6a4f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'background 0.2s', marginTop: '10px'},
    btnGreenSmall: {padding: '12px 24px', background: '#2d6a4f', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', transition: 'background 0.2s'},
    btnDone: {background: '#1b4332', color: '#80ed99', border: '1px solid #2d6a4f', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s'},
    btnDanger: {background: '#3a0c11', color: '#ff8a8a', border: '1px solid #5a181e', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'},
    btnWA: {marginTop: '30px', width: '100%', padding: '15px', background: '#25D366', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s, box-shadow 0.2s'},
    card: {background: '#121217', padding: '18px 24px', borderRadius: '12px', borderLeft: '4px solid #2d6a4f', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'all 0.3s ease'},
    badge: {background: '#1b4332', color: '#80ed99', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(128, 237, 153, 0.2)'},
    financeSummaryRow: {display: 'flex', gap: '15px', marginBottom: '25px', width: '100%'},
    financeSummaryCard: {flex: '1', background: '#121217', padding: '20px', borderRadius: '12px', border: '1px solid #222', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'},
    emptyText: {color: '#555', textAlign: 'center', marginTop: '30px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'},
    alert: {padding: '14px 24px', borderRadius: '8px', color: 'white', fontSize: '14px', marginBottom: '20px', width: '340px', boxSizing: 'border-box', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'},
    floatingAlert: {position: 'fixed', top: '90px', right: '20px', padding: '14px 24px', borderRadius: '8px', color: 'white', fontSize: '14px', zIndex: 1000, boxShadow: '0 6px 20px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.3s ease-out'}
}

export default App;
