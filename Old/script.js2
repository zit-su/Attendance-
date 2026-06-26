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

function authError(err) {
    const m = {
        'auth/user-not-found': 'Account not found',
        'auth/wrong-password': 'Wrong password',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password too weak (min 6)',
        'auth/invalid-email': 'Invalid email',
        'auth/too-many-requests': 'Too many attempts. Wait.',
        'auth/invalid-credential': 'Invalid credentials',
        'auth/network-request-failed': 'Network error'
    };
    return m[err.code] || err.message;
}

// ========== LOGIN ==========
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing In...';
    try {
        await auth.signInWithEmailAndPassword(
            document.getElementById('loginEmail').value.trim(),
            document.getElementById('loginPassword').value
        );
    } catch (err) {
        document.getElementById('authMessage').textContent = authError(err);
        document.getElementById('authMessage').className = 'auth-message error';
    }
    btn.disabled = false;
    btn.textContent = 'Sign In';
};

// ========== REGISTER ==========
document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
        const cred = await auth.createUserWithEmailAndPassword(
            document.getElementById('regEmail').value.trim(),
            document.getElementById('regPassword').value
        );
        await db.ref('users/' + cred.user.uid).set({
            name: document.getElementById('regName').value.trim(),
            email: cred.user.email,
            role: 'user',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        await cred.user.sendEmailVerification();
        showScreen('verifyScreen');
        document.getElementById('verifyEmailDisplay').textContent = cred.user.email;
    } catch (err) {
        document.getElementById('authMessage').textContent = authError(err);
        document.getElementById('authMessage').className = 'auth-message error';
    }
    btn.disabled = false;
    btn.textContent = 'Create Account';
};

// ========== VERIFY ==========
document.getElementById('checkVerifiedBtn').onclick = async () => {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) initApp();
    else toast('Not verified yet. Check inbox & spam.');
};

document.getElementById('resendVerifyBtn').onclick = async () => {
    try { await auth.currentUser.sendEmailVerification(); toast('Email sent!'); }
    catch (err) { toast(err.message); }
};

document.getElementById('verifyLogoutBtn').onclick = () => auth.signOut();

// ========== TABS ==========
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

// ========== NAVIGATION ==========
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

// ========== INIT APP ==========
async function initApp() {
    currentUser = auth.currentUser;
    if (!currentUser) return showScreen('authScreen');

    // Get user profile
    const snap = await db.ref('users/' + currentUser.uid).once('value');
    if (snap.exists()) {
        userRole = snap.val().role || 'user';
    } else {
        await db.ref('users/' + currentUser.uid).set({
            name: currentUser.email,
            email: currentUser.email,
            role: 'user',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        userRole = 'user';
    }

    showScreen('appScreen');

    // Header
    const name = snap.exists() ? snap.val().name : currentUser.email;
    document.getElementById('appAvatar').textContent = name[0].toUpperCase();
    document.getElementById('appName').textContent = name;
    document.getElementById('appRole').textContent = userRole === 'admin' ? 'Admin' : 'Employee';
    
    const v = currentUser.emailVerified;
    document.getElementById('verifyBadge').textContent = v ? '✓ Verified' : '⚠ Unverified';
    document.getElementById('verifyBadge').className = `chip ${v ? 'chip-success' : 'chip-warning'}`;

    // Admin visibility
    const admin = userRole === 'admin';
    document.getElementById('headerAdminBtn').style.display = admin ? 'flex' : 'none';
    document.getElementById('navAdmin').style.display = admin ? 'flex' : 'none';

    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    document.getElementById('userView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
    document.getElementById('navHome').classList.add('active');
    document.getElementById('navAdmin').classList.remove('active');

    await checkToday();
    await loadHistory();
    if (admin) loadAdmin();
}

// ========== CHECK TODAY (FIXED - No complex query) ==========
async function checkToday() {
    const t = today();
    const uid = currentUser.uid;
    
    // Get ALL attendance records and filter manually
    const snap = await db.ref('attendance').once('value');
    
    const inBtn = document.getElementById('checkInBtn');
    const outBtn = document.getElementById('checkOutBtn');
    
    let found = false;
    
    if (snap.exists()) {
        snap.forEach(child => {
            const att = child.val();
            if (att.userId === uid && att.date === t) {
                found = true;
                todayAttendanceId = child.key;
                
                document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-success">Checked In</span>';
                inBtn.disabled = true;
                outBtn.disabled = !!att.checkOutTime;
                document.getElementById('checkTimeInfo').textContent = 
                    `In: ${fmtTime(att.checkInTime)}` + (att.checkOutTime ? ` • Out: ${fmtTime(att.checkOutTime)}` : '');
            }
        });
    }
    
    if (!found) {
        todayAttendanceId = null;
        document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-warning">Pending</span>';
        inBtn.disabled = false;
        outBtn.disabled = true;
        document.getElementById('checkTimeInfo').textContent = '';
    }
}

// ========== CHECK IN (SIMPLIFIED) ==========
document.getElementById('checkInBtn').onclick = async () => {
    if (!auth.currentUser.emailVerified) return toast('Verify email first!');
    
    const btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    
    const now = new Date();
    const t = today();
    
    try {
        const snap = await db.ref('users/' + currentUser.uid).once('value');
        const name = snap.exists() ? snap.val().name : currentUser.email;
        
        // Simple push - no complex keys
        const ref = db.ref('attendance').push();
        await ref.set({
            userId: currentUser.uid,
            userName: name,
            userEmail: currentUser.email,
            date: t,
            checkInTime: now.toISOString(),
            checkOutTime: null,
            status: now.getHours() >= 9 ? 'late' : 'on-time',
            type: 'full-day',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        toast('✅ Checked in!');
        await checkToday();
        await loadHistory();
    } catch (err) {
        console.error('Check-in error:', err);
        toast('❌ ' + err.message);
    }
    btn.disabled = false;
};

// ========== CHECK OUT ==========
document.getElementById('checkOutBtn').onclick = async () => {
    if (!todayAttendanceId) return;
    const btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    try {
        await db.ref('attendance/' + todayAttendanceId).update({ 
            checkOutTime: new Date().toISOString() 
        });
        toast('🏁 Checked out!');
        await checkToday();
        await loadHistory();
    } catch (err) { 
        console.error('Check-out error:', err);
        toast('❌ ' + err.message); 
    }
    btn.disabled = false;
};

// ========== HISTORY ==========
async function loadHistory() {
    const list = document.getElementById('myHistoryList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    
    const snap = await db.ref('attendance').once('value');
    if (!snap.exists()) { 
        list.innerHTML = '<div class="list-empty">No records yet</div>'; 
        return; 
    }
    
    // Filter user's records
    const records = [];
    snap.forEach(child => {
        const r = child.val();
        if (r.userId === currentUser.uid) records.push(r);
    });
    
    // Sort by date (newest first)
    records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const recent = records.slice(0, 30);
    
    if (recent.length === 0) {
        list.innerHTML = '<div class="list-empty">No records yet</div>';
        return;
    }
    
    list.innerHTML = recent.map(r => `
        <div class="list-item">
            <div class="list-item-left">
                <span class="list-item-title">${r.date}</span>
                <span class="list-item-subtitle">${fmtTime(r.checkInTime)} → ${fmtTime(r.checkOutTime) || '--'}</span>
            </div>
            <div class="list-item-right">
                <span class="chip chip-info" style="font-size:10px">${r.type || 'full-day'}</span>
                <span class="chip ${r.status === 'on-time' ? 'chip-success' : 'chip-warning'}" style="font-size:10px">${r.status}</span>
            </div>
        </div>
    `).join('');
}

// ========== ADMIN ==========
async function loadAdmin() {
    const [usersSnap, attSnap] = await Promise.all([
        db.ref('users').once('value'),
        db.ref('attendance').once('value')
    ]);
    
    // Stats
    document.getElementById('statTotalUsers').querySelector('.stat-num').textContent = usersSnap.numChildren();
    
    const t = today();
    let todayCount = 0;
    attSnap.forEach(c => { if (c.val().date === t) todayCount++; });
    document.getElementById('statTodayCheckins').querySelector('.stat-num').textContent = todayCount;
    document.getElementById('statTotalRecords').querySelector('.stat-num').textContent = attSnap.numChildren();

    // Users list
    const ulist = document.getElementById('adminUsersList');
    if (!usersSnap.exists()) { 
        ulist.innerHTML = '<div class="list-empty">No users</div>'; 
    } else {
        ulist.innerHTML = '';
        usersSnap.forEach(c => {
            const u = c.val();
            ulist.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${u.name}</span>
                        <span class="list-item-subtitle">${u.email}</span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip ${u.role === 'admin' ? 'chip-info' : 'chip-success'}" style="font-size:10px">${u.role}</span>
                        <button class="btn-xs btn-xs-edit" onclick="editUser('${c.key}')">✏️</button>
                        <button class="btn-xs btn-xs-del" onclick="deleteUser('${c.key}')">🗑️</button>
                    </div>
                </div>`;
        });
    }

    loadRecords();
}

async function loadRecords() {
    const list = document.getElementById('adminRecordsList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    
    const dateF = document.getElementById('filterDate').value;
    const userF = document.getElementById('filterUser').value.toLowerCase();
    const typeF = document.getElementById('filterType').value;
    
    const snap = await db.ref('attendance').once('value');
    if (!snap.exists()) { 
        list.innerHTML = '<div class="list-empty">No records</div>'; 
        return; 
    }
    
    const records = [];
    snap.forEach(c => {
        const r = c.val();
        if (dateF && r.date !== dateF) return;
        if (userF && !(r.userName || '').toLowerCase().includes(userF) && !(r.userEmail || '').toLowerCase().includes(userF)) return;
        if (typeF && r.type !== typeF) return;
        records.push(r);
    });
    
    records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    
    if (records.length === 0) {
        list.innerHTML = '<div class="list-empty">No matching records</div>';
        return;
    }
    
    list.innerHTML = records.map(r => `
        <div class="list-item">
            <div class="list-item-left">
                <span class="list-item-title">${r.userName}</span>
                <span class="list-item-subtitle">${r.date} • ${fmtTime(r.checkInTime)}</span>
            </div>
            <div class="list-item-right">
                <span class="chip chip-info" style="font-size:10px">${r.type || 'full-day'}</span>
                <span class="chip ${r.status === 'on-time' ? 'chip-success' : 'chip-warning'}" style="font-size:10px">${r.status}</span>
            </div>
        </div>
    `).join('');
}

// ========== ADD USER ==========
document.getElementById('addUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref('users/' + cred.user.uid).set({ 
            name, email, role, 
            createdAt: firebase.database.ServerValue.TIMESTAMP 
        });
        toast('✅ User created!');
        document.getElementById('addUserForm').reset();
        loadAdmin();
        const pass = prompt('Re-enter your admin password:');
        if (pass) await auth.signInWithEmailAndPassword(currentUser.email, pass);
    } catch (err) { toast(authError(err)); }
};

// ========== EDIT USER ==========
async function editUser(uid) {
    const snap = await db.ref('users/' + uid).once('value');
    if (!snap.exists()) return toast('User not found');
    const u = snap.val();
    document.getElementById('editUserId').value = uid;
    document.getElementById('editUserName').value = u.name || '';
    document.getElementById('editUserRole').value = u.role || 'user';
    document.getElementById('editModal').classList.remove('hidden');
}

document.getElementById('editUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const uid = document.getElementById('editUserId').value;
    await db.ref('users/' + uid).update({
        name: document.getElementById('editUserName').value.trim(),
        role: document.getElementById('editUserRole').value
    });
    toast('✅ Updated!');
    document.getElementById('editModal').classList.add('hidden');
    loadAdmin();
};

async function deleteUser(uid) {
    if (!confirm('Delete this user?')) return;
    await db.ref('users/' + uid).remove();
    toast('Deleted');
    loadAdmin();
}

document.getElementById('closeEditModal').onclick = () => document.getElementById('editModal').classList.add('hidden');

// ========== FILTERS ==========
document.getElementById('filterDate').onchange = loadRecords;
document.getElementById('filterUser').oninput = loadRecords;
document.getElementById('filterType').onchange = loadRecords;

// ========== AUTH OBSERVER ==========
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        if (!user.emailVerified) {
            showScreen('verifyScreen');
            document.getElementById('verifyEmailDisplay').textContent = user.email;
        } else {
            initApp();
        }
    } else {
        currentUser = null;
        userRole = 'user';
        todayAttendanceId = null;
        showScreen('authScreen');
    }
});
