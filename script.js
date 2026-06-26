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

// ========== SCREEN MANAGEMENT ==========
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function formatTime(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getToday() { return new Date().toISOString().split('T')[0]; }

function getError(err) {
    const map = {
        'auth/user-not-found': 'Account not found',
        'auth/wrong-password': 'Wrong password',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password too weak (min 6)',
        'auth/invalid-email': 'Invalid email',
        'auth/too-many-requests': 'Too many attempts. Wait.',
        'auth/invalid-credential': 'Invalid credentials',
        'auth/network-request-failed': 'Network error'
    };
    return map[err.code] || err.message;
}

// ========== AUTH ==========
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Signing In...</span>';
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        document.getElementById('authMessage').textContent = getError(err);
        document.getElementById('authMessage').className = 'auth-message error';
    }
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span>';
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Creating...</span>';
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref('users/' + cred.user.uid).set({
            name, email, role: 'user',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        await cred.user.sendEmailVerification();
        showScreen('verifyScreen');
        document.getElementById('verifyEmailDisplay').textContent = email;
    } catch (err) {
        document.getElementById('authMessage').textContent = getError(err);
        document.getElementById('authMessage').className = 'auth-message error';
    }
    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span>';
});

document.getElementById('checkVerifiedBtn').addEventListener('click', async () => {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
        await initApp();
    } else {
        showToast('Not verified yet. Check inbox & spam.');
    }
});

document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
    try {
        await auth.currentUser.sendEmailVerification();
        showToast('Verification sent!');
    } catch (err) { showToast(err.message); }
});

document.getElementById('verifyLogoutBtn').addEventListener('click', () => auth.signOut());

// ========== TABS ==========
document.getElementById('tabLoginBtn').addEventListener('click', () => {
    document.getElementById('tabLoginBtn').classList.add('active');
    document.getElementById('tabRegisterBtn').classList.remove('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('authMessage').className = 'auth-message';
});

document.getElementById('tabRegisterBtn').addEventListener('click', () => {
    document.getElementById('tabRegisterBtn').classList.add('active');
    document.getElementById('tabLoginBtn').classList.remove('active');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('authMessage').className = 'auth-message';
});

// ========== NAVIGATION ==========
document.getElementById('navHome').addEventListener('click', () => {
    document.getElementById('navHome').classList.add('active');
    document.getElementById('navAdmin').classList.remove('active');
    document.getElementById('userView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
});

document.getElementById('navAdmin').addEventListener('click', () => {
    document.getElementById('navAdmin').classList.add('active');
    document.getElementById('navHome').classList.remove('active');
    document.getElementById('userView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    loadAdminData();
});

document.getElementById('navLogout').addEventListener('click', () => auth.signOut());

document.getElementById('headerAdminBtn').addEventListener('click', () => {
    document.getElementById('navAdmin').classList.add('active');
    document.getElementById('navHome').classList.remove('active');
    document.getElementById('userView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    loadAdminData();
});

// ========== INIT APP ==========
async function initApp() {
    currentUser = auth.currentUser;
    const isVerified = currentUser.emailVerified;

    // Get user data
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
    document.getElementById('appAvatar').textContent = (currentUser.email || 'U')[0].toUpperCase();
    document.getElementById('appRole').textContent = userRole === 'admin' ? 'Admin' : 'Employee';
    document.getElementById('verifyBadge').textContent = isVerified ? '✓ Verified' : '⚠ Unverified';
    document.getElementById('verifyBadge').className = `chip ${isVerified ? 'chip-success' : 'chip-warning'}`;

    // Admin
    const isAdmin = userRole === 'admin';
    document.getElementById('headerAdminBtn').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('navAdmin').style.display = isAdmin ? 'flex' : 'none';

    // Name
    if (snap.exists()) {
        document.getElementById('appName').textContent = snap.val().name || currentUser.email;
        document.getElementById('appAvatar').textContent = (snap.val().name || 'U')[0].toUpperCase();
    }

    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    // Reset views
    document.getElementById('userView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
    document.getElementById('navHome').classList.add('active');
    document.getElementById('navAdmin').classList.remove('active');

    await checkToday();
    await loadHistory();
    if (isAdmin) await loadAdminData();
}

// ========== CHECK TODAY ==========
async function checkToday() {
    const today = getToday();
    const uid = currentUser.uid;
    try {
        const snap = await db.ref('attendance').orderByChild('userId_date').equalTo(uid + '_' + today).once('value');
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');

        if (snap.exists()) {
            const data = Object.entries(snap.val())[0];
            todayAttendanceId = data[0];
            const att = data[1];
            document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-success">Checked In</span>';
            checkInBtn.disabled = true;
            checkOutBtn.disabled = !!att.checkOutTime;
            document.getElementById('checkTimeInfo').textContent =
                `In: ${formatTime(att.checkInTime)}` + (att.checkOutTime ? ` • Out: ${formatTime(att.checkOutTime)}` : '');
        } else {
            todayAttendanceId = null;
            document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-warning">Pending</span>';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
            document.getElementById('checkTimeInfo').textContent = '';
        }
    } catch (err) { console.error(err); }
}

// ========== CHECK IN ==========
document.getElementById('checkInBtn').addEventListener('click', async () => {
    if (!auth.currentUser.emailVerified) { showToast('Verify email first!'); return; }
    const btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    const now = new Date();
    const today = getToday();
    try {
        const userSnap = await db.ref('users/' + currentUser.uid).once('value');
        const userName = userSnap.exists() ? userSnap.val().name : currentUser.email;
        const ref = db.ref('attendance').push();
        await ref.set({
            userId: currentUser.uid,
            userId_date: currentUser.uid + '_' + today,
            userName, userEmail: currentUser.email,
            date: today,
            checkInTime: now.toISOString(),
            checkOutTime: null,
            status: now.getHours() >= 9 ? 'late' : 'on-time',
            type: 'full-day',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        showToast('Checked in!');
        await checkToday();
        await loadHistory();
    } catch (err) { showToast(err.message); }
    btn.disabled = false;
});

// ========== CHECK OUT ==========
document.getElementById('checkOutBtn').addEventListener('click', async () => {
    if (!todayAttendanceId) return;
    const btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    try {
        await db.ref('attendance/' + todayAttendanceId).update({ checkOutTime: new Date().toISOString() });
        showToast('Checked out!');
        await checkToday();
        await loadHistory();
    } catch (err) { showToast(err.message); }
    btn.disabled = false;
});

// ========== HISTORY ==========
async function loadHistory() {
    const list = document.getElementById('myHistoryList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    try {
        const snap = await db.ref('attendance').orderByChild('userId').equalTo(currentUser.uid).once('value');
        if (!snap.exists()) { list.innerHTML = '<div class="list-empty">No records</div>'; return; }
        const records = Object.entries(snap.val()).sort((a, b) => (b[1].date||'').localeCompare(a[1].date||'')).slice(0, 30);
        list.innerHTML = '';
        records.forEach(([id, r]) => {
            list.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${r.date}</span>
                        <span class="list-item-subtitle">${formatTime(r.checkInTime)} → ${formatTime(r.checkOutTime)||'--'}</span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip chip-info" style="font-size:10px;">${r.type||'full-day'}</span>
                        <span class="chip ${r.status==='on-time'?'chip-success':'chip-warning'}" style="font-size:10px;">${r.status}</span>
                    </div>
                </div>`;
        });
    } catch (err) { list.innerHTML = '<div class="list-empty">Error</div>'; }
}

// ========== ADMIN ==========
async function loadAdminData() {
    await loadStats();
    await loadUsers();
    await loadRecords();
}

async function loadStats() {
    try {
        const usersSnap = await db.ref('users').once('value');
        document.getElementById('statTotalUsers').querySelector('.stat-num').textContent = usersSnap.numChildren();
        const today = getToday();
        const todaySnap = await db.ref('attendance').orderByChild('date').equalTo(today).once('value');
        document.getElementById('statTodayCheckins').querySelector('.stat-num').textContent = todaySnap.numChildren();
        const allSnap = await db.ref('attendance').once('value');
        document.getElementById('statTotalRecords').querySelector('.stat-num').textContent = allSnap.numChildren();
    } catch (err) { console.error(err); }
}

async function loadUsers() {
    const list = document.getElementById('adminUsersList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    try {
        const snap = await db.ref('users').once('value');
        if (!snap.exists()) { list.innerHTML = '<div class="list-empty">No users</div>'; return; }
        list.innerHTML = '';
        snap.forEach(child => {
            const u = child.val();
            list.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${u.name}</span>
                        <span class="list-item-subtitle">${u.email}</span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip ${u.role==='admin'?'chip-info':'chip-success'}" style="font-size:10px;">${u.role}</span>
                        <button class="btn-xs btn-xs-edit" onclick="editUser('${child.key}')">✏️</button>
                        <button class="btn-xs btn-xs-del" onclick="deleteUser('${child.key}')">🗑️</button>
                    </div>
                </div>`;
        });
    } catch (err) { console.error(err); }
}

async function loadRecords() {
    const list = document.getElementById('adminRecordsList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    try {
        const dateF = document.getElementById('filterDate').value;
        const userF = document.getElementById('filterUser').value.toLowerCase();
        const typeF = document.getElementById('filterType').value;
        const snap = dateF ? await db.ref('attendance').orderByChild('date').equalTo(dateF).once('value') : await db.ref('attendance').limitToLast(100).once('value');
        if (!snap.exists()) { list.innerHTML = '<div class="list-empty">No records</div>'; return; }
        const records = Object.entries(snap.val()).sort((a, b) => (b[1].date||'').localeCompare(a[1].date||''));
        list.innerHTML = '';
        let count = 0;
        records.forEach(([id, r]) => {
            if (userF && !(r.userName||'').toLowerCase().includes(userF) && !(r.userEmail||'').toLowerCase().includes(userF)) return;
            if (typeF && r.type !== typeF) return;
            count++;
            list.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${r.userName}</span>
                        <span class="list-item-subtitle">${r.date} • ${formatTime(r.checkInTime)}</span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip chip-info" style="font-size:10px;">${r.type||'full-day'}</span>
                        <span class="chip ${r.status==='on-time'?'chip-success':'chip-warning'}" style="font-size:10px;">${r.status}</span>
                    </div>
                </div>`;
        });
        if (!count) list.innerHTML = '<div class="list-empty">No matching records</div>';
    } catch (err) { console.error(err); }
}

// ========== ADD USER ==========
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref('users/' + cred.user.uid).set({ name, email, role, createdAt: firebase.database.ServerValue.TIMESTAMP });
        showToast('User created!');
        document.getElementById('addUserForm').reset();
        await loadUsers();
        await loadStats();
        const pass = prompt('Re-enter your admin password:');
        if (pass) await auth.signInWithEmailAndPassword(currentUser.email, pass);
    } catch (err) { showToast(getError(err)); }
});

// ========== EDIT/DELETE USER ==========
async function editUser(uid) {
    const snap = await db.ref('users/' + uid).once('value');
    if (!snap.exists()) return showToast('User not found');
    const u = snap.val();
    document.getElementById('editUserId').value = uid;
    document.getElementById('editUserName').value = u.name || '';
    document.getElementById('editUserRole').value = u.role || 'user';
    document.getElementById('editModal').classList.remove('hidden');
}

document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('editUserId').value;
    try {
        await db.ref('users/' + uid).update({
            name: document.getElementById('editUserName').value.trim(),
            role: document.getElementById('editUserRole').value
        });
        const today = getToday();
        const snap = await db.ref('attendance').orderByChild('userId_date').equalTo(uid + '_' + today).once('value');
        if (snap.exists()) {
            await db.ref('attendance/' + Object.keys(snap.val())[0]).update({ type: document.getElementById('editUserType').value });
        }
        showToast('Updated!');
        document.getElementById('editModal').classList.add('hidden');
        await loadUsers();
        await loadRecords();
    } catch (err) { showToast(err.message); }
});

async function deleteUser(uid) {
    if (!confirm('Delete this user?')) return;
    try {
        await db.ref('users/' + uid).remove();
        showToast('Deleted');
        await loadUsers();
        await loadStats();
    } catch (err) { showToast(err.message); }
}

document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editModal').classList.add('hidden'));

// ========== FILTERS ==========
document.getElementById('filterDate').addEventListener('change', loadRecords);
document.getElementById('filterUser').addEventListener('input', loadRecords);
document.getElementById('filterType').addEventListener('change', loadRecords);

// ========== AUTH OBSERVER ==========
auth.onAuthStateChanged((user) => {
    if (user) {
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
