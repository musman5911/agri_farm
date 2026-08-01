import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = "http://localhost:8000";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('crops'); 
  const [crops, setCrops] = useState([]);
  const [finance, setFinance] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // Forms
  const [cropName, setCropName] = useState('');
  const [finForm, setFinForm] = useState({ cat: '', amt: '', type: 'expense' });
  const [taskName, setTaskName] = useState('');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });

  useEffect(() => { 
    if (token) { loadCrops(); loadFinance(); loadTasks(); } 
  }, [token]);

  const loadCrops = () => axios.get(`${API}/crops`).then(res => setCrops(res.data));
  const loadFinance = () => axios.get(`${API}/finance`).then(res => setFinance(res.data));
  const loadTasks = () => axios.get(`${API}/tasks`).then(res => setTasks(res.data));

  const handleLogin = async (e) => {
    e.preventDefault();
    const data = new URLSearchParams();
    data.append('username', authForm.email); data.append('password', authForm.password);
    try {
      const res = await axios.post(`${API}/login`, data);
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
    } catch { alert("Login Failed"); }
  };

  const addCrop = async () => {
    await axios.post(`${API}/crops`, { name: cropName, status: 'Growing' });
    setCropName(''); loadCrops();
  };

  const addFinance = async () => {
    await axios.post(`${API}/finance`, { category: finForm.cat, amount: finForm.amt, type: finForm.type });
    setFinForm({cat: '', amt: '', type: 'expense'}); loadFinance();
  };

  const addTask = async () => {
    await axios.post(`${API}/tasks`, { title: taskName });
    setTaskName(''); loadTasks();
  };

  const completeTask = async (id) => {
    await axios.patch(`${API}/tasks/${id}`);
    loadTasks();
  };

  const sendWhatsApp = () => {
    const msg = `🚜 *Farm Report*%0A- Crops: ${crops.length}%0A- Pending Tasks: ${tasks.filter(t=>t.status==='Pending').length}`;
    window.open(`https://wa.me/?text=${msg}`);
  };

  if (!token) return (
    <div style={{background: '#121212', color: 'white', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif'}}>
      <form onSubmit={handleLogin} style={{background: '#1e1e1e', padding: '40px', borderRadius: '15px', width: '300px'}}>
        <h2 style={{textAlign: 'center', color: '#80ed99'}}>Farm Login</h2>
        <input style={styles.input} placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
        <input style={styles.input} type="password" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
        <button style={styles.btnGreen}>Login</button>
      </form>
    </div>
  );

  return (
    <div style={{fontFamily: 'sans-serif', background: '#121212', color: 'white', minHeight: '100vh'}}>
      <nav style={styles.nav}>
        <h2 style={{color: '#80ed99'}}>🚜 FarmManager</h2>
        <div style={{display: 'flex', gap: '15px'}}>
            <button style={styles.navBtn} onClick={() => setView('crops')}>Crops</button>
            <button style={styles.navBtn} onClick={() => setView('finance')}>Finance</button>
            <button style={styles.navBtn} onClick={() => setView('tasks')}>Tasks</button>
            <button style={styles.navBtnLogout} onClick={() => {localStorage.clear(); window.location.reload()}}>Logout</button>
        </div>
      </nav>

      <div style={{padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
        
        {view === 'crops' && (
          <div>
            <h3>🌱 Manage Crops</h3>
            <input style={styles.inputInline} placeholder="Crop Name" value={cropName} onChange={e => setCropName(e.target.value)} />
            <button style={styles.btnGreenSmall} onClick={addCrop}>Add Crop</button>
            <div style={{marginTop: '20px'}}>
                {crops.map(c => <div key={c._id} style={styles.card}>{c.name} <span style={{color: '#80ed99'}}>• {c.status}</span></div>)}
            </div>
          </div>
        )}

        {view === 'finance' && (
          <div>
            <h3>💰 Finance Logs</h3>
            <input style={styles.inputInline} placeholder="Item" value={finForm.cat} onChange={e => setFinForm({...finForm, cat: e.target.value})} />
            <input style={styles.inputInline} type="number" placeholder="Amount" value={finForm.amt} onChange={e => setFinForm({...finForm, amt: e.target.value})} />
            <select style={styles.inputInline} onChange={e => setFinForm({...finForm, type: e.target.value})}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
            </select>
            <button style={styles.btnGreenSmall} onClick={addFinance}>Save</button>
            <div style={{marginTop: '20px'}}>
                {finance.map(f => (
                    <div key={f._id} style={styles.card}>
                        {f.date}: {f.category} <span style={{color: f.type==='expense'?'#ffadad':'#80ed99', float: 'right'}}>${f.amount}</span>
                    </div>
                ))}
            </div>
          </div>
        )}

        {view === 'tasks' && (
          <div>
            <h3>📝 Worker Tasks</h3>
            <input style={styles.inputInline} placeholder="New Task..." value={taskName} onChange={e => setTaskName(e.target.value)} />
            <button style={styles.btnGreenSmall} onClick={addTask}>Assign</button>
            <div style={{marginTop: '20px'}}>
                {tasks.map(t => (
                    <div key={t._id} style={styles.card}>
                        <span style={{textDecoration: t.status==='Completed'?'line-through':''}}>{t.title}</span>
                        {t.status === 'Pending' && <button style={{float: 'right', background: '#2d6a4f', color: 'white', border: 'none'}} onClick={() => completeTask(t._id)}>Done</button>}
                    </div>
                ))}
            </div>
            <button onClick={sendWhatsApp} style={styles.btnWA}>Send WhatsApp Summary</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
    nav: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 40px', background: '#1e1e1e', borderBottom: '1px solid #333'},
    navBtn: {background: 'none', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px'},
    navBtnLogout: {background: '#444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer'},
    input: {display: 'block', width: '90%', padding: '12px', margin: '15px 0', background: '#333', border: 'none', color: 'white', borderRadius: '5px'},
    inputInline: {padding: '10px', background: '#333', border: 'none', color: 'white', marginRight: '10px', marginBottom: '10px'},
    btnGreen: {width: '100%', padding: '12px', background: '#2d6a4f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'},
    btnGreenSmall: {padding: '10px 20px', background: '#2d6a4f', color: 'white', border: 'none', cursor: 'pointer'},
    btnWA: {marginTop: '40px', width: '100%', padding: '15px', background: '#25D366', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'},
    card: {background: '#1e1e1e', padding: '15px', margin: '10px 0', borderRadius: '8px', borderLeft: '4px solid #2d6a4f'}
}

export default App;