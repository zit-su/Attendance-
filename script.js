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

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized');
} catch (err) {
    console.error('❌ Firebase init failed:', err);
    document.body.innerHTML = '<h1 style="text-align:center;margin-top:100px;">Firebase init failed: ' + err.message + '</h1>';
}

const auth = firebase.auth();
const db = firebase.database();

console.log('✅ Auth and DB references created');

// ========== FORCE HIDE SPLASH AFTER 3 SECONDS ==========
setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash && !splash.classList.contains('hidden')) {
        splash.classList.add('hidden');
        console.log('⚠️ Splash force-hidden after timeout');
        // Show auth screen if nothing else is showing
        if (document.getElementById('authScreen').classList.contains('hidden') &&
            document.getElementById('verifyScreen').classList.contains('hidden') &&
            document.getElementById('appScreen').classList.contains('hidden')) {
            document.getElementById('authScreen').classList.remove('hidden');
            console.log('⚠️ Force-showing auth screen');
        }
    }
}, 3000);

// ========== GLOBAL STATE ==========
let currentUser = null;
let userRole = 'user';
let todayAttendance = null;
let todayAttendanceId = null;
let isVerified = false;

// ========== UTILS ==========
function showScreen(id) {
    console.log('📱 showScreen:', id);
    const allScreens = ['splashScreen', 'authScreen', 'verifyScreen', 'appScreen'];
    allScreens.forEach(screenId => {
        const el = document.getElementById(screenId);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        console.log('✅ Screen shown:', id);
    } else {
        console.error('❌ Screen element not found:', id);
    }
}

function showToast(msg) {
    console.log('🔔 Toast:', msg);
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function formatTime(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function getError(err) {
    const map = {
        'auth/user-not-found': 'Account not found',
        'auth/wrong-password': 'Wrong password',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password too weak (min 6)',
        'auth/invalid-email': 'Invalid email',
        'auth/too-many-requests': 'Too many attempts. Wait.',
        'auth/invalid-credential': 'Invalid credentials',
        'auth/network-request-failed': 'Network error. Check internet.'
    };
    return map[err.code] || err.message;
}

// ========== AUTH HANDLERS ==========
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔑 Login attempt...');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Signing In...</span>';
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login success:', cred.user.email);
    } catch (err) {
        console.error('❌ Login error:', err);
        const msg = document.getElementById('authMessage');
        msg.textContent = getError(err);
        msg.className = 'auth-message error';
    }
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span>';
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📝 Register attempt...');
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Creating...</span>';
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        console.log('✅ Account created:', cred.user.uid);
        
        await db.ref('users/' + cred.user.uid).set({
            name, email, role: 'user',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        console.log('✅ User saved to DB');
        
        await cred.user.sendEmailVerification();
        console.log('✅ Verification email sent');
        
        showScreen('verifyScreen');
        document.getElementById('verifyEmailDisplay').textContent = email;
    } catch (err) {
        console.error('❌ Register error:', err);
        const msg = document.getElementById('authMessage');
        msg.textContent = getError(err);
        msg.className = 'auth-message error';
    }
    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span>';
});

document.getElementById('checkVerifiedBtn').addEventListener('click', async () => {
    console.log('🔍 Checking verification...');
    const btn = document.getElementById('checkVerifiedBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Checking...</span>';
    try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
            console.log('✅ Email verified!');
            isVerified = true;
            await initApp();
        } else {
            console.log('⚠️ Not verified yet');
            showToast('⚠️ Not verified yet. Check inbox & spam.');
        }
    } catch (err) {
        console.error('❌ Check error:', err);
        showToast('Error: ' + err.message);
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> I\'ve Verified';
});

document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
    console.log('📧 Resending verification...');
    try {
        await auth.currentUser.sendEmailVerification();
        showToast('📧 Verification sent!');
    } catch (err) { 
        console.error('❌ Resend error:', err);
        showToast('❌ ' + err.message); 
    }
});

document.getElementById('verifyLogoutBtn').addEventListener('click', () => {
    console.log('🚪 Logging out from verify...');
    auth.signOut();
});

// ========== TABS ==========
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isLogin = tab.dataset.tab === 'login';
        document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
        document.getElementById('registerForm').classList.toggle('hidden', isLogin);
        document.getElementById('authMessage').className = 'auth-message';
    });
});

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('userView').classList.toggle('hidden', item.dataset.view !== 'userView');
        document.getElementById('adminView').classList.toggle('hidden', item.dataset.view !== 'adminView');
        if (item.dataset.view === 'adminView') loadAdminData();
    });
});

document.getElementById('navLogout').addEventListener('click', () => {
    console.log('🚪 Logging out...');
    auth.signOut();
});

document.getElementById('headerAdminBtn').addEventListener('click', () => {
    document.getElementById('userView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    document.getElementById('navAdmin').classList.add('active');
    document.querySelector('.nav-item[data-view="userView"]').classList.remove('active');
    loadAdminData();
});

// ========== INIT APP ==========
async function initApp() {
    console.log('🚀 initApp() called');
    currentUser = auth.currentUser;
    
    if (!currentUser) {
        console.error('❌ No current user in initApp');
        showScreen('authScreen');
        return;
    }
    
    console.log('👤 User:', currentUser.email, '| UID:', currentUser.uid);
    isVerified = currentUser.emailVerified;
    console.log('📧 Verified:', isVerified);

    // Get user data
    try {
        const snap = await db.ref('users/' + currentUser.uid).once('value');
        if (snap.exists()) {
            userRole = snap.val().role || 'user';
            console.log('✅ Role:', userRole);
        } else {
            console.log('⚠️ No user profile, creating...');
            await db.ref('users/' + currentUser.uid).set({
                name: currentUser.email,
                email: currentUser.email,
                role: 'user',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            userRole = 'user';
            console.log('✅ Profile created');
        }
    } catch (e) {
        console.error('❌ Role fetch error:', e);
        userRole = 'user';
    }

    showScreen('appScreen');
    console.log('✅ App screen shown');

    // Update header
    document.getElementById('appAvatar').textContent = (currentUser.email || 'U')[0].toUpperCase();
    document.getElementById('appRole').textContent = userRole === 'admin' ? 'Admin' : 'Employee';
    document.getElementById('verifyBadge').textContent = isVerified ? '✓ Verified' : '⚠ Unverified';
    document.getElementById('verifyBadge').className = `chip ${isVerified ? 'chip-success' : 'chip-warning'}`;

    // Admin buttons
    const isAdmin = userRole === 'admin';
    document.getElementById('headerAdminBtn').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('navAdmin').style.display = isAdmin ? 'flex' : 'none';
    console.log('👑 Is Admin:', isAdmin);

    // Get name
    try {
        const snap = await db.ref('users/' + currentUser.uid).once('value');
        if (snap.exists()) {
            document.getElementById('appName').textContent = snap.val().name || currentUser.email;
            document.getElementById('appAvatar').textContent = (snap.val().name || 'U')[0].toUpperCase();
        }
    } catch (e) {}

    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    // Reset views
    document.getElementById('userView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
    document.querySelector('.nav-item[data-view="userView"]').classList.add('active');
    document.getElementById('navAdmin').classList.remove('active');

    await checkToday();
    await loadHistory();
    if (isAdmin) await loadAdminData();
    
    console.log('✅ initApp() complete');
}

// ========== CHECK TODAY ==========
async function checkToday() {
    console.log('📅 Checking today...');
    const today = getTodayStr();
    try {
        const snap = await db.ref('attendance')
            .orderByChild('userId_date')
            .equalTo(currentUser.uid + '_' + today)
            .once('value');

        if (snap.exists()) {
            const data = Object.entries(snap.val())[0];
            todayAttendance = data[1];
            todayAttendanceId = data[0];
            document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-success">Checked In</span>';
            document.getElementById('checkInBtn').disabled = true;
            document.getElementById('checkOutBtn').disabled = !!todayAttendance.checkOutTime;
            document.getElementById('checkTimeInfo').textContent = 
                `In: ${formatTime(todayAttendance.checkInTime)}` +
                (todayAttendance.checkOutTime ? ` • Out: ${formatTime(todayAttendance.checkOutTime)}` : '');
            console.log('✅ Already checked in');
        } else {
            todayAttendance = null;
            todayAttendanceId = null;
            document.getElementById('attendanceStatusBadge').innerHTML = '<span class="chip chip-warning">Pending</span>';
            document.getElementById('checkInBtn').disabled = false;
            document.getElementById('checkOutBtn').disabled = true;
            document.getElementById('checkTimeInfo').textContent = '';
            console.log('⚠️ Not checked in yet');
        }
    } catch (err) {
        console.error('❌ Check today error:', err);
    }
}

// ========== CHECK IN ==========
document.getElementById('checkInBtn').addEventListener('click', async () => {
    if (!isVerified) { showToast('⚠️ Verify email first!'); return; }
    console.log('✅ Check-in clicked');
    const btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    const now = new Date();
    const today = getTodayStr();

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
        console.log('✅ Check-in saved');
        showToast('✅ Checked in!');
        await checkToday();
        await loadHistory();
    } catch (err) { 
        console.error('❌ Check-in error:', err);
        showToast('❌ ' + err.message); 
    }
    btn.disabled = false;
});

// ========== CHECK OUT ==========
document.getElementById('checkOutBtn').addEventListener('click', async () => {
    if (!todayAttendanceId) return;
    console.log('🏁 Check-out clicked');
    const btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    try {
        await db.ref('attendance/' + todayAttendanceId).update({ checkOutTime: new Date().toISOString() });
        console.log('✅ Check-out saved');
        showToast('🏁 Checked out!');
        await checkToday();
        await loadHistory();
    } catch (err) { 
        console.error('❌ Check-out error:', err);
        showToast('❌ ' + err.message); 
    }
    btn.disabled = false;
});

// ========== HISTORY ==========
async function loadHistory() {
    console.log('📜 Loading history...');
    const list = document.getElementById('myHistoryList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    try {
        const snap = await db.ref('attendance').orderByChild('userId').equalTo(currentUser.uid).once('value');
        if (!snap.exists()) { 
            list.innerHTML = '<div class="list-empty">No records</div>'; 
            return; 
        }

        const records = Object.entries(snap.val())
            .sort((a, b) => (b[1].date || '').localeCompare(a[1].date || ''))
            .slice(0, 30);

        list.innerHTML = '';
        records.forEach(([id, r]) => {
            list.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${r.date}</span>
                        <span class="list-item-subtitle">${formatTime(r.checkInTime)} → ${formatTime(r.checkOutTime) || '--'}</span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip chip-info" style="font-size:10px;">${r.type || 'full-day'}</span>
                        <span class="chip ${r.status==='on-time'?'chip-success':'chip-warning'}" style="font-size:10px;">${r.status}</span>
                    </div>
                </div>`;
        });
        console.log('✅ History loaded:', records.length, 'records');
    } catch (err) { 
        console.error('❌ History error:', err);
        list.innerHTML = '<div class="list-empty">Error</div>'; 
    }
}

// ========== ADMIN ==========
async function loadAdminData() {
    console.log('👑 Loading admin data...');
    await loadStats();
    await loadUsers();
    await loadRecords();
}

async function loadStats() {
    try {
        const usersSnap = await db.ref('users').once('value');
        document.getElementById('statTotalUsers').querySelector('.stat-num').textContent = usersSnap.numChildren();

        const today = getTodayStr();
        const todaySnap = await db.ref('attendance').orderByChild('date').equalTo(today).once('value');
        document.getElementById('statTodayCheckins').querySelector('.stat-num').textContent = todaySnap.numChildren();

        const allSnap = await db.ref('attendance').once('value');
        document.getElementById('statTotalRecords').querySelector('.stat-num').textContent = allSnap.numChildren();
        console.log('✅ Stats loaded');
    } catch (err) { console.error('❌ Stats error:', err); }
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
        console.log('✅ Users loaded');
    } catch (err) { console.error('❌ Users error:', err); }
}

async function loadRecords() {
    const list = document.getElementById('adminRecordsList');
    list.innerHTML = '<div class="list-empty">Loading...</div>';
    try {
        const dateF = document.getElementById('filterDate').value;
        const userF = document.getElementById('filterUser').value.toLowerCase();
        const typeF = document.getElementById('filterType').value;

        const snap = dateF
            ? await db.ref('attendance').orderByChild('date').equalTo(dateF).once('value')
            : await db.ref('attendance').limitToLast(100).once('value');

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
        console.log('✅ Records loaded:', count);
    } catch (err) { console.error('❌ Records error:', err); }
}

// ========== ADD USER ==========
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('👤 Adding user...');
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref('users/' + cred.user.uid).set({ name, email, role, createdAt: firebase.database.ServerValue.TIMESTAMP });
        showToast('✅ User created!');
        document.getElementById('addUserForm').reset();
        await loadUsers();
        await loadStats();
        const pass = prompt('Re-enter your admin password:');
        if (pass) await auth.signInWithEmailAndPassword(currentUser.email, pass);
    } catch (err) { showToast('❌ ' + getError(err)); }
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
        const today = getTodayStr();
        const snap = await db.ref('attendance').orderByChild('userId_date').equalTo(uid + '_' + today).once('value');
        if (snap.exists()) {
            await db.ref('attendance/' + Object.keys(snap.val())[0]).update({ type: document.getElementById('editUserType').value });
        }
        showToast('✅ Updated!');
        document.getElementById('editModal').classList.add('hidden');
        await loadUsers();
        await loadRecords();
    } catch (err) { showToast('❌ ' + err.message); }
});

async function deleteUser(uid) {
    if (!confirm('Delete this user?')) return;
    try {
        await db.ref('users/' + uid).remove();
        showToast('🗑️ Deleted');
        await loadUsers();
        await loadStats();
    } catch (err) { showToast('❌ ' + err.message); }
}

document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editModal').classList.add('hidden'));

// ========== FILTERS ==========
document.getElementById('filterDate').addEventListener('change', loadRecords);
document.getElementById('filterUser').addEventListener('input', loadRecords);
document.getElementById('filterType').addEventListener('change', loadRecords);

// ========== AUTH STATE OBSERVER ==========
console.log('🔌 Setting up auth observer...');

auth.onAuthStateChanged((user) => {
    console.log('🔄 Auth state changed! User:', user ? user.email : 'null');
    
    // IMMEDIATELY hide splash
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('hidden');
        console.log('✅ Splash hidden via observer');
    }
    
    currentUser = user;
    
    if (user) {
        isVerified = user.emailVerified;
        console.log('📧 Email verified:', isVerified);
        
        if (!isVerified) {
            showScreen('verifyScreen');
            document.getElementById('verifyEmailDisplay').textContent = user.email;
        } else {
            initApp().catch(err => {
                console.error('❌ initApp() failed:', err);
                showScreen('authScreen');
            });
        }
    } else {
        console.log('👋 No user, showing auth screen');
        currentUser = null;
        userRole = 'user';
        todayAttendance = null;
        todayAttendanceId = null;
        showScreen('authScreen');
    }
});

// ========== CHECK IF ALREADY LOGGED IN ==========
console.log('🔍 Checking current auth state...');
console.log('Current user:', auth.currentUser ? auth.currentUser.email : 'null');

// Force auth state check after 1 second
setTimeout(() => {
    const user = auth.currentUser;
    console.log('⏰ 1s check - Current user:', user ? user.email : 'null');
    if (user && user.emailVerified) {
        console.log('⚠️ Auth observer may have missed the state, forcing initApp');
        initApp();
    }
}, 1000);

console.log('📦 Script loaded, waiting for auth state change...');
