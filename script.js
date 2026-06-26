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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ========== FORCE HIDE SPLASH AFTER TIMEOUT ==========
setTimeout(() => {
    document.getElementById('splashScreen').classList.add('hidden');
    console.log('⚠️ Splash force-hidden after timeout');
}, 5000);

// ========== GLOBAL STATE ==========
let currentUser = null;
let userRole = 'user';
let todayAttendance = null;
let todayAttendanceId = null;
let isVerified = false;

const screens = ['splashScreen', 'authScreen', 'verifyScreen', 'appScreen'];

// ========== UTILS ==========
function showScreen(id) {
    console.log('📱 Showing screen:', id);
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.error('❌ Screen not found:', id);
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function formatTime(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
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
        const cred = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login successful:', cred.user.email);
        if (!cred.user.emailVerified) {
            showScreen('verifyScreen');
            document.getElementById('verifyEmailDisplay').textContent = email;
        }
    } catch (err) {
        console.error('❌ Login error:', err);
        showAuthMsg(getError(err), 'error');
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
        console.log('✅ Account created:', cred.user.uid);
        
        // Save to Realtime DB
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
        showAuthMsg(getError(err), 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span>';
});

document.getElementById('checkVerifiedBtn').addEventListener('click', async () => {
    const btn = document.getElementById('checkVerifiedBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>Checking...</span>';
    try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
            isVerified = true;
            console.log('✅ Email verified!');
            await initApp();
        } else {
            showToast('⚠️ Not verified yet. Check inbox & spam folder.');
        }
    } catch (err) {
        console.error('❌ Check error:', err);
        showToast('Error checking verification status');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> I\'ve Verified';
});

document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
    try {
        await auth.currentUser.sendEmailVerification();
        showToast('📧 Verification email sent!');
    } catch (err) { 
        console.error('❌ Resend error:', err);
        showToast('❌ ' + err.message); 
    }
});

document.getElementById('verifyLogoutBtn').addEventListener('click', () => {
    auth.signOut();
});

document.getElementById('resendFromLogin').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) {
        showAuthMsg('Enter your email first.', 'info');
        return;
    }
    showAuthMsg('Login first, then use "Resend" from verification screen.', 'info');
});

function showAuthMsg(msg, type) {
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'auth-message ' + type;
    setTimeout(() => { el.className = 'auth-message'; }, 5000);
}

function getError(err) {
    const map = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/invalid-email': 'Please enter a valid email',
        'auth/too-many-requests': 'Too many attempts. Please wait.',
        'auth/network-request-failed': 'Network error. Check connection.',
        'auth/invalid-credential': 'Invalid email or password'
    };
    return map[err.code] || err.message;
}

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

// ========== BOTTOM NAV ==========
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('userView').classList.add('hidden');
        document.getElementById('adminView').classList.add('hidden');
        document.getElementById(item.dataset.view).classList.remove('hidden');
        if (item.dataset.view === 'adminView') loadAdminData();
    });
});

document.getElementById('navLogout').addEventListener('click', () => auth.signOut());

document.getElementById('headerAdminBtn').addEventListener('click', () => {
    document.getElementById('userView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('navAdmin').classList.add('active');
    loadAdminData();
});

// ========== INIT APP ==========
async function initApp() {
    console.log('🚀 Initializing app...');
    currentUser = auth.currentUser;
    
    if (!currentUser) {
        console.error('❌ No current user');
        showScreen('authScreen');
        return;
    }
    
    isVerified = currentUser.emailVerified;
    console.log('👤 User:', currentUser.email, '| Verified:', isVerified);

    // Get user role
    try {
        const snap = await db.ref('users/' + currentUser.uid).once('value');
        if (snap.exists()) {
            userRole = snap.val().role || 'user';
            console.log('✅ Role:', userRole);
        } else {
            // Create user profile
            await db.ref('users/' + currentUser.uid).set({
                name: currentUser.displayName || currentUser.email,
                email: currentUser.email,
                role: 'user',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            userRole = 'user';
            console.log('✅ Created user profile');
        }
    } catch (e) {
        console.error('❌ Role fetch error:', e);
        userRole = 'user';
    }

    // Save session
    localStorage.setItem('ae_user', JSON.stringify({ 
        uid: currentUser.uid, 
        email: currentUser.email, 
        role: userRole 
    }));

    // Show app screen
    showScreen('appScreen');

    // Update header
    document.getElementById('appAvatar').textContent = (currentUser.email || 'U')[0].toUpperCase();
    document.getElementById('appRole').textContent = userRole === 'admin' ? 'Admin' : 'Employee';
    document.getElementById('verifyBadge').textContent = isVerified ? '✓ Verified' : '⚠ Unverified';
    document.getElementById('verifyBadge').className = `chip ${isVerified ? 'chip-success' : 'chip-warning'}`;

    // Admin visibility
    const isAdmin = userRole === 'admin';
    document.getElementById('headerAdminBtn').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('navAdmin').style.display = isAdmin ? 'flex' : 'none';

    // Default views
    document.getElementById('userView').classList.remove('hidden');
    document.getElementById('adminView').classList.add('hidden');
    document.querySelector('.nav-item[data-view="userView"]').classList.add('active');
    if (document.getElementById('navAdmin')) {
        document.getElementById('navAdmin').classList.remove('active');
    }

    // Get user name
    try {
        const snap = await db.ref('users/' + currentUser.uid).once('value');
        if (snap.exists()) {
            const name = snap.val().name || currentUser.email;
            document.getElementById('appName').textContent = name;
            document.getElementById('appAvatar').textContent = name[0].toUpperCase();
        }
    } catch (e) {
        console.error('❌ Name fetch error:', e);
    }

    // Set date
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    console.log('✅ App initialized');

    await checkToday();
    await loadHistory();
    if (isAdmin) await loadAdminData();
}

// ========== CHECK TODAY ==========
async function checkToday() {
    const today = getTodayStr();
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const badge = document.getElementById('attendanceStatusBadge');
    const timeInfo = document.getElementById('checkTimeInfo');

    try {
        const snap = await db.ref('attendance')
            .orderByChild('userId_date')
            .equalTo(currentUser.uid + '_' + today)
            .once('value');

        if (snap.exists()) {
            const entries = Object.entries(snap.val());
            const firstEntry = entries[0];
            todayAttendance = firstEntry[1];
            todayAttendanceId = firstEntry[0];

            badge.innerHTML = '<span class="chip chip-success">Checked In</span>';
            checkInBtn.disabled = true;
            checkOutBtn.disabled = !!todayAttendance.checkOutTime;
            timeInfo.textContent = `In: ${formatTime(todayAttendance.checkInTime)}` +
                (todayAttendance.checkOutTime ? ` • Out: ${formatTime(todayAttendance.checkOutTime)}` : '');
        } else {
            todayAttendance = null;
            todayAttendanceId = null;
            badge.innerHTML = '<span class="chip chip-warning">Pending</span>';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
            timeInfo.textContent = '';
        }
    } catch (err) {
        console.error('❌ Check today error:', err);
    }
}

// ========== CHECK IN ==========
document.getElementById('checkInBtn').addEventListener('click', async () => {
    if (!isVerified) {
        showToast('⚠️ Verify your email first!');
        return;
    }
    const btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    const now = new Date();
    const today = getTodayStr();
    const status = now.getHours() >= 9 ? 'late' : 'on-time';

    try {
        let userName = currentUser.email;
        const userSnap = await db.ref('users/' + currentUser.uid).once('value');
        if (userSnap.exists()) {
            userName = userSnap.val().name || currentUser.email;
        }

        const newRef = db.ref('attendance').push();
        await newRef.set({
            userId: currentUser.uid,
            userId_date: currentUser.uid + '_' + today,
            userName: userName,
            userEmail: currentUser.email,
            date: today,
            checkInTime: now.toISOString(),
            checkOutTime: null,
            status: status,
            type: 'full-day',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

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
    if (!todayAttendanceId) {
        showToast('⚠️ No check-in found');
        return;
    }
    const btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    try {
        await db.ref('attendance/' + todayAttendanceId).update({
            checkOutTime: new Date().toISOString()
        });
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
    const list = document.getElementById('myHistoryList');
    if (!list) return;
    list.innerHTML = '<div class="list-empty">Loading...</div>';

    try {
        const snap = await db.ref('attendance')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .once('value');

        if (!snap.exists()) {
            list.innerHTML = '<div class="list-empty">No records yet</div>';
            return;
        }

        const records = Object.entries(snap.val())
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 30);

        if (records.length === 0) {
            list.innerHTML = '<div class="list-empty">No records yet</div>';
            return;
        }

        list.innerHTML = '';
        records.forEach(record => {
            const statusClass = record.status === 'on-time' ? 'chip-success' : 'chip-warning';
            list.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${record.date || 'N/A'}</span>
                        <span class="list-item-subtitle">
                            ${formatTime(record.checkInTime)} → ${formatTime(record.checkOutTime) || '--'}
                        </span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip chip-info" style="font-size:10px;">${record.type || 'full-day'}</span>
                        <span class="chip ${statusClass}" style="font-size:10px;">${record.status || 'pending'}</span>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error('❌ History error:', err);
        list.innerHTML = '<div class="list-empty">Error loading</div>';
    }
}

// ========== ADMIN ==========
async function loadAdminData() {
    await Promise.all([loadStats(), loadUsers(), loadRecords()]);
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

        if (todaySnap.exists()) {
            let total = 0, count = 0;
            todaySnap.forEach(child => {
                const data = child.val();
                if (data.checkInTime) {
                    total += new Date(data.checkInTime).getHours();
                    count++;
                }
            });
            if (count > 0) {
                const avg = Math.round(total / count);
                const display = avg > 12 ? avg - 12 : (avg === 0 ? 12 : avg);
                const ampm = avg >= 12 ? 'PM' : 'AM';
                document.getElementById('statAvgCheckin').querySelector('.stat-num').textContent = `${display}:00 ${ampm}`;
            }
        }
    } catch (err) {
        console.error('❌ Stats error:', err);
    }
}

async function loadUsers() {
    const list = document.getElementById('adminUsersList');
    if (!list) return;
    list.innerHTML = '<div class="list-empty">Loading...</div>';

    try {
        const snap = await db.ref('users').once('value');
        if (!snap.exists()) {
            list.innerHTML = '<div class="list-empty">No users</div>';
            return;
        }
        list.innerHTML = '';
        snap.forEach(child => {
            const user = child.val();
            const uid = child.key;
            const roleClass = user.role === 'admin' ? 'chip-info' : 'chip-success';
            list.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${user.name || 'N/A'}</span>
                        <span class="list-item-subtitle">${user.email || ''}</span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip ${roleClass}" style="font-size:10px;">${user.role || 'user'}</span>
                        <div class="list-item-actions">
                            <button class="btn-xs btn-xs-edit" onclick="editUser('${uid}')">✏️</button>
                            <button class="btn-xs btn-xs-del" onclick="deleteUser('${uid}')">🗑️</button>
                        </div>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error('❌ Users error:', err);
    }
}

async function loadRecords() {
    const list = document.getElementById('adminRecordsList');
    if (!list) return;
    list.innerHTML = '<div class="list-empty">Loading...</div>';

    try {
        const dateFilter = document.getElementById('filterDate').value;
        const userFilter = document.getElementById('filterUser').value.trim().toLowerCase();
        const typeFilter = document.getElementById('filterType').value;

        let snap;
        if (dateFilter) {
            snap = await db.ref('attendance').orderByChild('date').equalTo(dateFilter).once('value');
        } else {
            snap = await db.ref('attendance').limitToLast(100).once('value');
        }

        if (!snap.exists()) {
            list.innerHTML = '<div class="list-empty">No records</div>';
            return;
        }

        const records = Object.entries(snap.val())
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        list.innerHTML = '';
        let shown = 0;
        records.forEach(record => {
            if (userFilter) {
                const nameMatch = (record.userName || '').toLowerCase().includes(userFilter);
                const emailMatch = (record.userEmail || '').toLowerCase().includes(userFilter);
                if (!nameMatch && !emailMatch) return;
            }
            if (typeFilter && record.type !== typeFilter) return;
            shown++;
            const statusClass = record.status === 'on-time' ? 'chip-success' : 'chip-warning';
            list.innerHTML += `
                <div class="list-item">
                    <div class="list-item-left">
                        <span class="list-item-title">${record.userName || 'N/A'}</span>
                        <span class="list-item-subtitle">${record.date} • ${formatTime(record.checkInTime)}</span>
                    </div>
                    <div class="list-item-right">
                        <span class="chip chip-info" style="font-size:10px;">${record.type || 'full-day'}</span>
                        <span class="chip ${statusClass}" style="font-size:10px;">${record.status || 'pending'}</span>
                    </div>
                </div>`;
        });
        if (shown === 0) list.innerHTML = '<div class="list-empty">No matching records</div>';
    } catch (err) {
        console.error('❌ Records error:', err);
    }
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
        await db.ref('users/' + cred.user.uid).set({
            name, email, role,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        showToast('✅ User created!');
        document.getElementById('addUserForm').reset();
        await loadUsers();
        await loadStats();
        const adminPass = prompt('Re-enter your admin password:');
        if (adminPass) {
            await auth.signInWithEmailAndPassword(currentUser.email, adminPass);
        }
    } catch (err) {
        showToast('❌ ' + getError(err));
    }
});

// ========== EDIT USER ==========
async function editUser(uid) {
    try {
        const snap = await db.ref('users/' + uid).once('value');
        if (!snap.exists()) { showToast('User not found'); return; }
        const user = snap.val();
        document.getElementById('editUserId').value = uid;
        document.getElementById('editUserName').value = user.name || '';
        document.getElementById('editUserRole').value = user.role || 'user';
        document.getElementById('editModal').classList.remove('hidden');
    } catch (err) {
        showToast('Error loading user');
    }
}

document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value.trim();
    const role = document.getElementById('editUserRole').value;
    const type = document.getElementById('editUserType').value;

    try {
        await db.ref('users/' + uid).update({ name, role });
        const today = getTodayStr();
        const snap = await db.ref('attendance')
            .orderByChild('userId_date')
            .equalTo(uid + '_' + today)
            .once('value');
        if (snap.exists()) {
            const attId = Object.keys(snap.val())[0];
            await db.ref('attendance/' + attId).update({ type });
        }
        showToast('✅ Updated!');
        document.getElementById('editModal').classList.add('hidden');
        await loadUsers();
        await loadRecords();
    } catch (err) {
        showToast('❌ ' + err.message);
    }
});

async function deleteUser(uid) {
    if (!confirm('Delete this user?')) return;
    try {
        await db.ref('users/' + uid).remove();
        showToast('🗑️ Deleted');
        await loadUsers();
        await loadStats();
    } catch (err) {
        showToast('❌ ' + err.message);
    }
}

document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editModal').classList.add('hidden');
});

document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) {
        document.getElementById('editModal').classList.add('hidden');
    }
});

// ========== FILTERS ==========
document.getElementById('filterDate').addEventListener('change', loadRecords);
document.getElementById('filterUser').addEventListener('input', loadRecords);
document.getElementById('filterType').addEventListener('change', loadRecords);

// ========== AUTH STATE OBSERVER ==========
console.log('🔌 Setting up auth observer...');

auth.onAuthStateChanged((user) => {
    console.log('🔄 Auth state changed:', user ? user.email : 'No user');
    
    // Hide splash immediately
    document.getElementById('splashScreen').classList.add('hidden');
    
    currentUser = user;
    
    if (user) {
        isVerified = user.emailVerified;
        if (!isVerified) {
            showScreen('verifyScreen');
            document.getElementById('verifyEmailDisplay').textContent = user.email;
        } else {
            initApp().catch(err => {
                console.error('❌ Init failed:', err);
                showScreen('authScreen');
            });
        }
    } else {
        currentUser = null;
        userRole = 'user';
        todayAttendance = null;
        todayAttendanceId = null;
        localStorage.removeItem('ae_user');
        showScreen('authScreen');
    }
});

// ========== INITIAL STATE ==========
console.log('📦 App loaded, waiting for auth...');
