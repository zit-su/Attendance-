// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
    apiKey: "AIzaSyDvj2N6tzE5x1GnaGdOcVv9QmKvWad8JeA",
    authDomain: "demoprobeta3.firebaseapp.com",
    databaseURL: "https://demoprobeta3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "demoprobeta3",
    storageBucket: "demoprobeta3.appspot.com",
    messagingSenderId: "369529000980",
    appId: "1:369529000980:web:f6c97625b1b6c509d58301"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ========== GLOBAL STATE ==========
let currentUser = null;
let userRole = 'user';
let todayAttendanceId = null;
let isProcessing = false;

// ========== HELPERS ==========
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function fmtTime(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

function authError(err) {
    const map = { 'auth/user-not-found': 'Account not found', 'auth/wrong-password': 'Wrong password', 'auth/email-already-in-use': 'Email registered', 'auth/weak-password': 'Password too weak', 'auth/invalid-email': 'Invalid email', 'auth/too-many-requests': 'Too many attempts', 'auth/invalid-credential': 'Invalid credentials', 'auth/network-request-failed': 'Network error' };
    return map[err.code] || err.message;
}

// Income multiplier
function getMultiplier(type) {
    if (type === 'half-day') return 0.5;
    if (type === 'ot') return 1.5;
    return 1; // full-day
}

// ========== AUTH ==========
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Signing In...';
    try {
        await auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPassword').value);
    } catch (err) {
        document.getElementById('authMessage').textContent = authError(err);
        document.getElementById('authMessage').className = 'auth-message error';
    }
    btn.disabled = false; btn.textContent = 'Sign In';
};

document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    btn.disabled = true; btn.textContent = 'Creating...';
    try {
        const cred = await auth.createUserWithEmailAndPassword(document.getElementById('regEmail').value.trim(), document.getElementById('regPassword').value);
        await db.ref('users/' + cred.user.uid).set({
            name: document.getElementById('regName').value.trim(),
            email: cred.user.email, role: 'user', dailyWage: 500, shiftStart: '09:00', shiftEnd: '17:00',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        await cred.user.sendEmailVerification();
        showScreen('verifyScreen');
        document.getElementById('verifyEmailDisplay').textContent = cred.user.email;
    } catch (err) {
        document.getElementById('authMessage').textContent = authError(err);
        document.getElementById('authMessage').className = 'auth-message error';
    }
    btn.disabled = false; btn.textContent = 'Create Account';
};

document.getElementById('checkVerifiedBtn').onclick = async () => {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) initApp(); else toast('Not verified yet.');
};
document.getElementById('resendVerifyBtn').onclick = async () => {
    try { await auth.currentUser.sendEmailVerification(); toast('Email sent!'); } catch (err) { toast(err.message); }
};
document.getElementById('verifyLogoutBtn').onclick = () => auth.signOut();

// Tabs
document.getElementById('tabLoginBtn').onclick = () => {
    document.getElementById('tabLoginBtn').classList.add('active');
    document.getElementById('tabRegisterBtn').classList.remove('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
};
document.getElementById('tabRegisterBtn').onclick = () => {
    document.getElementById('tabRegisterBtn').classList.add('active');
    document.getElementById('tabLoginBtn').classList.remove('active');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
};

// Navigation
document.getElementById('navHome').onclick = () => {
    document.getElementById('navHome').classList.add('active');
    document.getElementById('navAdmin').classList.remove('active');
    document.getElementById('userView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
};
document.getElementById('navAdmin').onclick = () => {
    document.getElementById('navAdmin').classList.add('active');
    document.getElementById('navHome').classList.remove('active');
    document.getElementById('userView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    loadAdmin();
};
document.getElementById('navLogout').onclick = () => auth.signOut();
document.getElementById('headerAdminBtn').onclick = () => document.getElementById('navAdmin').click();

// ========== INIT ==========
async function initApp() {
    currentUser = auth.currentUser;
    if (!currentUser) return showScreen('authScreen');
    const snap = await db.ref('users/' + currentUser.uid).once('value');
    if (snap.exists()) {
        userRole = snap.val().role || 'user';
    } else {
        await db.ref('users/' + currentUser.uid).set({
            name: currentUser.email, email: currentUser.email, role: 'user', dailyWage: 500, shiftStart: '09:00', shiftEnd: '17:00',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        userRole = 'user';
    }
    showScreen('appScreen');
    const name = snap.exists() ? snap.val().name : currentUser.email;
    document.getElementById('appAvatar').textContent = name[0].toUpperCase();
    document.getElementById('appName').textContent = name;
    document.getElementById('appRole').textContent = userRole === 'admin' ? 'Admin' : 'Employee';
    const v = currentUser.emailVerified;
    document.getElementById('verifyBadge').textContent = v ? '✓ Verified' : '⚠ Unverified';
    document.getElementById('verifyBadge').className = `chip ${v ? 'chip-success' : 'chip-warning'}`;
    const admin = userRole === 'admin';
    document.getElementById('headerAdminBtn').style.display = admin ? 'flex' : 'none';
    document.getElementById('navAdmin').style.display = admin ? 'flex' : 'none';
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    document.getElementById('userView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
    document.getElementById('navHome').classList.add('active');
    document.getElementById('navAdmin').classList.remove('active');
    await loadUserDashboard();
    await checkToday();
    await loadHistory();
    if (admin) loadAdmin();
}

async function loadUserDashboard() {
    const snap = await db.ref('users/' + currentUser.uid).once('value');
    if (snap.exists()) {
        const u = snap.val();
        document.getElementById('userDailyWage').textContent = '₹' + (u.dailyWage || 500);
        await updateMonthlyIncome();
    }
}

async function updateMonthlyIncome() {
    const month = currentMonth();
    const snap = await db.ref('attendance/' + currentUser.uid + '/' + month).once('value');
    const userSnap = await db.ref('users/' + currentUser.uid).once('value');
    const wage = userSnap.val().dailyWage || 500;
    let total = 0;
    if (snap.exists()) {
        snap.forEach(day => {
            const d = day.val();
            if (d.checkInTime) {
                total += wage * getMultiplier(d.type || 'full-day');
            }
        });
    }
    document.getElementById('userMonthlyIncome').textContent = '₹' + total;
    // Today's income
    const t = today();
    let todayIncome = 0;
    if (snap.exists()) {
        snap.forEach(day => {
            const d = day.val();
            if (d.date === t && d.checkInTime) {
                todayIncome = wage * getMultiplier(d.type || 'full-day');
            }
        });
    }
    document.getElementById('userTodayIncome').textContent = todayIncome > 0 ? '₹' + todayIncome : '--';
}

// ========== CHECK TODAY ==========
async function checkToday() {
    const t = today();
    const month = currentMonth();
    const uid = currentUser.uid;
    const snap = await db.ref('attendance/' + uid + '/' + month).once('value');
    const inBtn = document.getElementById('checkInBtn');
    const outBtn = document.getElementById('checkOutBtn');
    let found = false;
    if (snap.exists()) {
        snap.forEach(child => {
            const att = child.val();
            if (att.date === t && !att.checkOutTime) {
                found = true; todayAttendanceId = child.key;
                document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-success">Checked In</span>';
                inBtn.disabled = true; outBtn.disabled = false;
                document.getElementById('checkTimeInfo').textContent = `In: ${fmtTime(att.checkInTime)}`;
            } else if (att.date === t && att.checkOutTime) {
                found = true; todayAttendanceId = child.key;
                document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-success">Completed</span>';
                inBtn.disabled = true; outBtn.disabled = true;
                document.getElementById('checkTimeInfo').textContent = `In: ${fmtTime(att.checkInTime)} • Out: ${fmtTime(att.checkOutTime)}`;
            }
        });
    }
    if (!found) {
        todayAttendanceId = null;
        document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-warning">Pending</span>';
        inBtn.disabled = false; outBtn.disabled = true;
        document.getElementById('checkTimeInfo').textContent = '';
    }
}

// ========== CHECK IN ==========
document.getElementById('checkInBtn').onclick = async () => {
    if (isProcessing) return;
    if (!auth.currentUser.emailVerified) return toast('Verify email first!');
    isProcessing = true;
    const btn = document.getElementById('checkInBtn');
    btn.disabled = true; btn.style.opacity = '0.5';
    const now = new Date();
    const t = today();
    const month = currentMonth();
    try {
        const snap = await db.ref('attendance/' + currentUser.uid + '/' + month).once('value');
        let already = false;
        if (snap.exists()) snap.forEach(c => { if (c.val().date === t && !c.val().checkOutTime) already = true; });
        if (already) { toast('Already checked in!'); await checkToday(); isProcessing = false; return; }
        const userSnap = await db.ref('users/' + currentUser.uid).once('value');
        const name = userSnap.val().name;
        const shiftStart = userSnap.val().shiftStart || '09:00';
        const late = now.getHours() + now.getMinutes()/60 > parseInt(shiftStart.split(':')[0]) + parseInt(shiftStart.split(':')[1])/60;
        const ref = db.ref('attendance/' + currentUser.uid + '/' + month).push();
        await ref.set({
            userName: name, userEmail: currentUser.email, date: t,
            checkInTime: now.toISOString(), checkOutTime: null,
            status: late ? 'late' : 'on-time', type: 'full-day',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        toast('✅ Checked in!');
        document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-success">Checked In</span>';
        document.getElementById('checkOutBtn').disabled = false;
        await checkToday(); await loadHistory(); await loadUserDashboard();
    } catch (err) { toast(err.message); btn.disabled = false; btn.style.opacity = '1'; }
    isProcessing = false;
};

// ========== CHECK OUT ==========
document.getElementById('checkOutBtn').onclick = async () => {
    if (isProcessing || !todayAttendanceId) return;
    isProcessing = true;
    const btn = document.getElementById('checkOutBtn');
    btn.disabled = true; btn.style.opacity = '0.5';
    try {
        await db.ref(`attendance/${currentUser.uid}/${currentMonth()}/${todayAttendanceId}`).update({ checkOutTime: new Date().toISOString() });
        toast('🏁 Checked out!');
        await checkToday(); await loadHistory(); await loadUserDashboard();
    } catch (err) { toast(err.message); btn.disabled = false; btn.style.opacity = '1'; }
    isProcessing = false;
};

// ========== HISTORY ==========
async function loadHistory() {
    const list = document.getElementById('myHistoryList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    const snap = await db.ref('attendance/' + currentUser.uid).once('value');
    if (!snap.exists()) { list.innerHTML = '<div class="list-empty">No records</div>'; return; }
    const userSnap = await db.ref('users/' + currentUser.uid).once('value');
    const wage = userSnap.val().dailyWage || 500;
    const records = [];
    snap.forEach(monthSnap => monthSnap.forEach(daySnap => records.push(daySnap.val())));
    records.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    const recent = records.slice(0, 50);
    let monthLabel = '';
    list.innerHTML = '';
    recent.forEach(r => {
        const ml = r.date ? r.date.substring(0,7) : '';
        if (ml !== monthLabel) {
            monthLabel = ml;
            const mName = new Date(r.date+'T00:00:00').toLocaleDateString('en-US', { year:'numeric', month:'long' });
            list.innerHTML += `<div style="padding:12px 0 4px;font-weight:700;color:var(--primary);font-size:13px;">📅 ${mName}</div>`;
        }
        const amt = wage * getMultiplier(r.type||'full-day');
        list.innerHTML += `<div class="list-item">
            <div class="list-item-left">
                <span class="list-item-title">${r.date}</span>
                <span class="list-item-subtitle">${fmtTime(r.checkInTime)} → ${fmtTime(r.checkOutTime)||'--'}</span>
            </div>
            <div class="list-item-right">
                <span style="font-weight:600;font-size:13px;">₹${amt}</span>
                <span class="chip chip-info" style="font-size:10px;">${r.type||'full-day'}</span>
            </div>
        </div>`;
    });
}

// ========== ADMIN ==========
async function loadAdmin() {
    const [usersSnap, attSnap] = await Promise.all([db.ref('users').once('value'), db.ref('attendance').once('value')]);
    document.getElementById('statTotalUsers').querySelector('.stat-num').textContent = usersSnap.numChildren();
    const t = today(); let todayC = 0, totalR = 0;
    if (attSnap.exists()) attSnap.forEach(u => u.forEach(m => m.forEach(d => { totalR++; if (d.val().date===t) todayC++; })));
    document.getElementById('statTodayCheckins').querySelector('.stat-num').textContent = todayC;
    document.getElementById('statTotalRecords').querySelector('.stat-num').textContent = totalR;
    // Users list
    const ulist = document.getElementById('adminUsersList');
    ulist.innerHTML = '';
    if (usersSnap.exists()) {
        usersSnap.forEach(c => {
            const u = c.val(); const uid = c.key;
            ulist.innerHTML += `<div class="list-item">
                <div class="list-item-left"><span class="list-item-title">${u.name}</span><span class="list-item-subtitle">₹${u.dailyWage||500}/day • ${u.shiftStart||'09:00'}-${u.shiftEnd||'17:00'}</span></div>
                <div class="list-item-right">
                    <button class="btn-xs btn-xs-edit" onclick="editUser('${uid}')">✏️</button>
                    <button class="btn-xs btn-xs-del" onclick="deleteUser('${uid}')">🗑️</button>
                </div>
            </div>`;
        });
    }
    // Populate user dropdown for attendance form
    const sel = document.getElementById('adminAttUser');
    sel.innerHTML = '<option value="">Select User</option>';
    if (usersSnap.exists()) usersSnap.forEach(c => { sel.innerHTML += `<option value="${c.key}">${c.val().name}</option>`; });
    loadRecords();
}

async function loadRecords() {
    const list = document.getElementById('adminRecordsList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    const dateF = document.getElementById('filterDate').value;
    const userF = document.getElementById('filterUser').value.toLowerCase();
    const typeF = document.getElementById('filterType').value;
    const snap = await db.ref('attendance').once('value');
    if (!snap.exists()) { list.innerHTML = '<div class="list-empty">No records</div>'; return; }
    const records = [];
    snap.forEach(u => u.forEach(m => m.forEach(d => {
        const r = d.val(); r._uid = u.key; r._month = m.key; r._id = d.key;
        if (dateF && r.date!==dateF) return;
        if (userF && !r.userName?.toLowerCase().includes(userF) && !r.userEmail?.toLowerCase().includes(userF)) return;
        if (typeF && r.type!==typeF) return;
        records.push(r);
    })));
    records.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    if (records.length===0) { list.innerHTML = '<div class="list-empty">No matching</div>'; return; }
    list.innerHTML = records.map(r => `<div class="list-item">
        <div class="list-item-left"><span class="list-item-title">${r.userName}</span><span class="list-item-subtitle">${r.date} • ${fmtTime(r.checkInTime)}</span></div>
        <div class="list-item-right">
            <button class="btn-xs btn-xs-edit" onclick="editAttendance('${r._uid}','${r._month}','${r._id}')">✏️</button>
            <button class="btn-xs btn-xs-del" onclick="deleteAttendance('${r._uid}','${r._month}','${r._id}')">🗑️</button>
        </div>
    </div>`).join('');
}

// ========== ADMIN ADD ATTENDANCE ==========
document.getElementById('adminAddAttendanceForm').onsubmit = async (e) => {
    e.preventDefault();
    const uid = document.getElementById('adminAttUser').value;
    const date = document.getElementById('adminAttDate').value;
    const inTime = document.getElementById('adminAttIn').value;
    const outTime = document.getElementById('adminAttOut').value;
    const type = document.getElementById('adminAttType').value;
    if (!uid || !date) return toast('Select user and date');
    const month = date.substring(0,7);
    const userSnap = await db.ref('users/' + uid).once('value');
    const u = userSnap.val();
    const ref = db.ref(`attendance/${uid}/${month}`).push();
    await ref.set({
        userName: u.name, userEmail: u.email, date,
        checkInTime: inTime ? new Date(date+'T'+inTime+':00').toISOString() : null,
        checkOutTime: outTime ? new Date(date+'T'+outTime+':00').toISOString() : null,
        status: 'manual', type, timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    toast('✅ Record added');
    document.getElementById('adminAddAttendanceForm').reset();
    loadRecords();
    loadAdmin();
};

// Edit user (wage/shift)
async function editUser(uid) {
    const snap = await db.ref('users/' + uid).once('value');
    if (!snap.exists()) return;
    const u = snap.val();
    document.getElementById('editUserId').value = uid;
    document.getElementById('editUserName').value = u.name || '';
    document.getElementById('editUserRole').value = u.role || 'user';
    document.getElementById('editUserWage').value = u.dailyWage || 500;
    document.getElementById('editShiftStart').value = u.shiftStart || '09:00';
    document.getElementById('editShiftEnd').value = u.shiftEnd || '17:00';
    document.getElementById('editUserModal').classList.remove('hidden');
}
document.getElementById('editUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const uid = document.getElementById('editUserId').value;
    await db.ref('users/' + uid).update({
        name: document.getElementById('editUserName').value.trim(),
        role: document.getElementById('editUserRole').value,
        dailyWage: parseInt(document.getElementById('editUserWage').value) || 500,
        shiftStart: document.getElementById('editShiftStart').value,
        shiftEnd: document.getElementById('editShiftEnd').value
    });
    toast('✅ Updated');
    document.getElementById('editUserModal').classList.add('hidden');
    loadAdmin();
};
document.getElementById('closeEditModal').onclick = () => document.getElementById('editUserModal').classList.add('hidden');

// Edit attendance
function editAttendance(uid, month, attId) {
    db.ref(`attendance/${uid}/${month}/${attId}`).once('value').then(snap => {
        const a = snap.val();
        document.getElementById('editAttId').value = attId;
        document.getElementById('editAttUserId').value = uid;
        document.getElementById('editAttDate').value = a.date;
        document.getElementById('editAttIn').value = a.checkInTime ? new Date(a.checkInTime).toTimeString().slice(0,5) : '';
        document.getElementById('editAttOut').value = a.checkOutTime ? new Date(a.checkOutTime).toTimeString().slice(0,5) : '';
        document.getElementById('editAttType').value = a.type || 'full-day';
        document.getElementById('editAttModal').classList.remove('hidden');
    });
}
document.getElementById('editAttForm').onsubmit = async (e) => {
    e.preventDefault();
    const uid = document.getElementById('editAttUserId').value;
    const attId = document.getElementById('editAttId').value;
    const date = document.getElementById('editAttDate').value;
    const month = date.substring(0,7);
    const inTime = document.getElementById('editAttIn').value;
    const outTime = document.getElementById('editAttOut').value;
    const type = document.getElementById('editAttType').value;
    const updates = {
        date,
        checkInTime: inTime ? new Date(date+'T'+inTime+':00').toISOString() : null,
        checkOutTime: outTime ? new Date(date+'T'+outTime+':00').toISOString() : null,
        type
    };
    // If month changed, we need to move record (delete and re-add)
    const oldMonth = (await db.ref(`attendance/${uid}`).once('value')).val();
    // Simplified: just update in place (same month)
    await db.ref(`attendance/${uid}/${month}/${attId}`).update(updates);
    toast('✅ Updated');
    document.getElementById('editAttModal').classList.add('hidden');
    loadRecords();
};
document.getElementById('closeEditAttModal').onclick = () => document.getElementById('editAttModal').classList.add('hidden');

async function deleteAttendance(uid, month, attId) {
    if (!confirm('Delete this record?')) return;
    await db.ref(`attendance/${uid}/${month}/${attId}`).remove();
    toast('Deleted');
    loadRecords();
    loadAdmin();
}

async function deleteUser(uid) {
    if (!confirm('Delete user and all data?')) return;
    await db.ref('users/' + uid).remove();
    await db.ref('attendance/' + uid).remove();
    toast('User deleted');
    loadAdmin();
}

// Filters
document.getElementById('filterDate').onchange = loadRecords;
document.getElementById('filterUser').oninput = loadRecords;
document.getElementById('filterType').onchange = loadRecords;

// Auth observer
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        if (!user.emailVerified) { showScreen('verifyScreen'); document.getElementById('verifyEmailDisplay').textContent = user.email; }
        else initApp();
    } else {
        currentUser = null; userRole = 'user'; todayAttendanceId = null;
        showScreen('authScreen');
    }
});
