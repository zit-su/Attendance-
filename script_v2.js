// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
    apiKey: "AIzaSyDvj2N6tzE5x1GnaGdOcVv9QmKvWad8JeA",
    authDomain: "demoprobeta3.firebaseapp.com",
    projectId: "demoprobeta3",
    storageBucket: "demoprobeta3.appspot.com",
    messagingSenderId: "369529000980",
    appId: "1:369529000980:web:f6c97625b1b6c509d58301"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========== PERSISTENCE ==========
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ========== GLOBAL STATE ==========
let currentUser = null;
let userRole = 'user';
let todayAttendance = null;
let isEmailVerified = false;

// ========== DOM REFS ==========
const loadingScreen = document.getElementById('loadingScreen');
const authPage = document.getElementById('authPage');
const verifyReminder = document.getElementById('verifyReminder');
const dashboardPage = document.getElementById('dashboardPage');
const adminPage = document.getElementById('adminPage');
const toastEl = document.getElementById('toast');

// ========== UTILS ==========
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

function showAuthAlert(msg, type) {
    const alert = document.getElementById('authAlert');
    alert.textContent = msg;
    alert.className = `auth-alert ${type}`;
}

function formatTime(ts) {
    if (!ts) return '--';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ========== PAGE SWITCHING ==========
function showPage(page) {
    [authPage, verifyReminder, dashboardPage, adminPage].forEach(p => p.classList.add('hidden'));
    if (page === 'auth') authPage.classList.remove('hidden');
    else if (page === 'verify') verifyReminder.classList.remove('hidden');
    else if (page === 'dashboard') dashboardPage.classList.remove('hidden');
    else if (page === 'admin') adminPage.classList.remove('hidden');
}

// ========== AUTH ==========
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (!cred.user.emailVerified) {
            showPage('verify');
            document.getElementById('verifyEmail').textContent = email;
            showAuthAlert('Please verify your email first.', 'info');
        }
    } catch (err) {
        showAuthAlert(getError(err), 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name, email, role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await cred.user.sendEmailVerification();
        showPage('verify');
        document.getElementById('verifyEmail').textContent = email;
        showAuthAlert('Account created! Verify your email.', 'success');
    } catch (err) {
        showAuthAlert(getError(err), 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
}

async function checkVerification() {
    const btn = document.getElementById('checkVerifiedBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
        isEmailVerified = true;
        loadApp();
    } else {
        showToast('Email not verified yet. Check your inbox.');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> I\'ve Verified';
}

async function resendVerification() {
    try {
        await auth.currentUser.sendEmailVerification();
        showToast('Verification email sent!');
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

async function logout() {
    await auth.signOut();
    localStorage.removeItem('attendease_user');
    window.location.reload();
}

function getError(err) {
    const map = {
        'auth/user-not-found': 'No account found.',
        'auth/wrong-password': 'Wrong password.',
        'auth/email-already-in-use': 'Email already registered.',
        'auth/weak-password': 'Password too weak.',
        'auth/invalid-email': 'Invalid email.',
        'auth/too-many-requests': 'Too many attempts. Wait a moment.'
    };
    return map[err.code] || err.message;
}

// ========== LOAD APP ==========
async function loadApp() {
    currentUser = auth.currentUser;
    isEmailVerified = currentUser.emailVerified;
    
    // Get user role
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) userRole = doc.data().role || 'user';
    } catch (e) { userRole = 'user'; }

    // Save to localStorage for persistence
    localStorage.setItem('attendease_user', JSON.stringify({
        uid: currentUser.uid,
        email: currentUser.email,
        role: userRole
    }));

    if (userRole === 'admin') {
        showPage('admin');
        loadAdminData();
    } else {
        showPage('dashboard');
        loadDashboardData();
    }
}

// ========== DASHBOARD ==========
async function loadDashboardData() {
    document.getElementById('dashAvatar').textContent = (currentUser.email || 'U')[0].toUpperCase();
    document.getElementById('dashRole').textContent = userRole === 'admin' ? 'Admin' : 'Employee';
    document.getElementById('verifyBadge').textContent = isEmailVerified ? '✅ Verified' : '⚠️ Unverified';
    document.getElementById('verifyBadge').className = `status-badge ${isEmailVerified ? 'success' : 'warning'}`;
    document.getElementById('btnGoAdmin').style.display = userRole === 'admin' ? 'inline-flex' : 'none';
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            document.getElementById('dashName').textContent = doc.data().name;
            document.getElementById('dashAvatar').textContent = doc.data().name[0].toUpperCase();
        }
    } catch (e) {}

    await checkToday();
    await loadMyHistory();
}

async function checkToday() {
    const today = new Date().toISOString().split('T')[0];
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const statusEl = document.getElementById('attendanceStatus');

    try {
        const snap = await db.collection('attendance')
            .where('userId', '==', currentUser.uid)
            .where('date', '==', today)
            .limit(1).get();

        if (!snap.empty) {
            todayAttendance = { id: snap.docs[0].id, ...snap.docs[0].data() };
            statusEl.textContent = '✅ Checked in';
            checkInBtn.disabled = true;
            checkOutBtn.disabled = !!todayAttendance.checkOutTime;
            document.getElementById('checkTimeInfo').textContent =
                `In: ${formatTime(todayAttendance.checkInTime)}` +
                (todayAttendance.checkOutTime ? ` | Out: ${formatTime(todayAttendance.checkOutTime)}` : '');
        } else {
            todayAttendance = null;
            statusEl.textContent = 'Ready to check in';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
        }
    } catch (err) { console.error(err); }
}

async function markCheckIn() {
    if (!isEmailVerified) { showToast('Verify email first!'); return; }
    const btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const status = hour >= 9 ? 'late' : 'on-time';
    const type = 'full-day';

    try {
        let name = currentUser.email;
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) name = doc.data().name;

        await db.collection('attendance').add({
            userId: currentUser.uid,
            userName: name,
            userEmail: currentUser.email,
            date: today,
            checkInTime: firebase.firestore.FieldValue.serverTimestamp(),
            checkInTimeLocal: now.toISOString(),
            checkOutTime: null,
            checkOutTimeLocal: null,
            status, type
        });
        showToast('✅ Checked in!');
        await checkToday();
        await loadMyHistory();
    } catch (err) { showToast('Error: ' + err.message); }
    btn.disabled = false;
}

async function markCheckOut() {
    if (!todayAttendance) return;
    const btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    try {
        await db.collection('attendance').doc(todayAttendance.id).update({
            checkOutTime: firebase.firestore.FieldValue.serverTimestamp(),
            checkOutTimeLocal: new Date().toISOString()
        });
        showToast('🏁 Checked out!');
        await checkToday();
        await loadMyHistory();
    } catch (err) { showToast('Error: ' + err.message); }
    btn.disabled = false;
}

async function loadMyHistory() {
    const tbody = document.getElementById('myAttendanceBody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell"><div class="spinner"></div></td></tr>';
    try {
        const snap = await db.collection('attendance')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc').limit(50).get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No records yet.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${d.date}</td>
                    <td>${formatTime(d.checkInTime) || formatTime(d.checkInTimeLocal)}</td>
                    <td>${formatTime(d.checkOutTime) || formatTime(d.checkOutTimeLocal) || '--'}</td>
                    <td><span class="badge badge-info">${d.type || 'full-day'}</span></td>
                    <td><span class="badge badge-${d.status === 'on-time' ? 'success' : 'warning'}">${d.status}</span></td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

// ========== ADMIN ==========
async function loadAdminData() {
    document.getElementById('adminAvatar').textContent = (currentUser.email || 'A')[0].toUpperCase();
    document.getElementById('adminName').textContent = currentUser.email;
    await Promise.all([loadStats(), loadUsers(), loadAllAttendance()]);
}

async function loadStats() {
    try {
        const users = await db.collection('users').get();
        document.getElementById('statTotalUsers').textContent = users.size;
        const today = new Date().toISOString().split('T')[0];
        const todaySnap = await db.collection('attendance').where('date', '==', today).get();
        document.getElementById('statTodayCheckins').textContent = todaySnap.size;
        const all = await db.collection('attendance').get();
        document.getElementById('statTotalRecords').textContent = all.size;
        if (!todaySnap.empty) {
            let total = 0, count = 0;
            todaySnap.forEach(d => {
                if (d.data().checkInTimeLocal) {
                    total += new Date(d.data().checkInTimeLocal).getHours();
                    count++;
                }
            });
            const avg = Math.round(total / count);
            document.getElementById('statAvgCheckin').textContent = `${avg > 12 ? avg-12 : avg}:00 ${avg>=12?'PM':'AM'}`;
        }
    } catch (err) { console.error(err); }
}

async function loadUsers() {
    const tbody = document.getElementById('allUsersBody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell"><div class="spinner"></div></td></tr>';
    try {
        const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No users.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><strong>${d.name}</strong></td>
                    <td>${d.email}</td>
                    <td><span class="badge ${d.role==='admin'?'badge-info':'badge-success'}">${d.role}</span></td>
                    <td><i class="fas fa-${d.emailVerified?'check-circle text-green':'times-circle text-red'}"></i></td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="editUser('${doc.id}','${d.name}','${d.role}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-sm btn-delete" onclick="deleteUser('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

async function addUser(e) {
    e.preventDefault();
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;

    try {
        // Create auth user
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name, email, role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ User created!');
        document.getElementById('addUserForm').reset();
        await loadUsers();
        await loadStats();
        // Sign back in as admin
        await auth.signInWithEmailAndPassword(currentUser.email, prompt('Re-enter your admin password to continue:'));
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

function editUser(uid, name, role) {
    document.getElementById('editUserId').value = uid;
    document.getElementById('editUserName').value = name;
    document.getElementById('editUserRole').value = role;
    document.getElementById('editUserModal').classList.remove('hidden');
}

async function saveUserEdit(e) {
    e.preventDefault();
    const uid = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value;
    const role = document.getElementById('editUserRole').value;
    const type = document.getElementById('editUserType').value;

    try {
        await db.collection('users').doc(uid).update({ name, role });
        // Update today's attendance type
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection('attendance')
            .where('userId', '==', uid).where('date', '==', today).limit(1).get();
        if (!snap.empty) {
            await db.collection('attendance').doc(snap.docs[0].id).update({ type });
        }
        showToast('✅ User updated!');
        document.getElementById('editUserModal').classList.add('hidden');
        await loadUsers();
        await loadAllAttendance();
    } catch (err) { showToast('Error: ' + err.message); }
}

async function deleteUser(uid) {
    if (!confirm('Delete this user?')) return;
    try {
        await db.collection('users').doc(uid).delete();
        showToast('User deleted from database.');
        await loadUsers();
    } catch (err) { showToast('Error: ' + err.message); }
}

async function loadAllAttendance() {
    const tbody = document.getElementById('allAttendanceBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell"><div class="spinner"></div></td></tr>';
    try {
        const dateFilter = document.getElementById('filterDate').value;
        const userFilter = document.getElementById('filterUser').value.toLowerCase();
        const typeFilter = document.getElementById('filterType').value;

        let query = db.collection('attendance').orderBy('date', 'desc').limit(200);
        if (dateFilter) query = query.where('date', '==', dateFilter);

        const snap = await query.get();
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            if (userFilter && !d.userName?.toLowerCase().includes(userFilter) && !d.userEmail?.toLowerCase().includes(userFilter)) return;
            if (typeFilter && d.type !== typeFilter) return;
            tbody.innerHTML += `
                <tr>
                    <td>${d.userName}</td>
                    <td>${d.userEmail}</td>
                    <td>${d.date}</td>
                    <td>${formatTime(d.checkInTime) || formatTime(d.checkInTimeLocal)}</td>
                    <td>${formatTime(d.checkOutTime) || formatTime(d.checkOutTimeLocal) || '--'}</td>
                    <td><span class="badge badge-info">${d.type || 'full-day'}</span></td>
                    <td><span class="badge badge-${d.status==='on-time'?'success':'warning'}">${d.status}</span></td>
                </tr>`;
        });
        if (!tbody.innerHTML) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No records.</td></tr>';
    } catch (err) { console.error(err); }
}

// ========== EVENT LISTENERS ==========
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('registerForm').addEventListener('submit', handleRegister);
document.getElementById('checkVerifiedBtn').addEventListener('click', checkVerification);
document.getElementById('resendVerifyBtn').addEventListener('click', resendVerification);
document.getElementById('logoutFromVerify').addEventListener('click', logout);
document.getElementById('resendFromLogin').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    if (!email) return showAuthAlert('Enter your email first.', 'info');
    try {
        const methods = await auth.fetchSignInMethodsForEmail(email);
        if (methods.length === 0) return showAuthAlert('No account found.', 'error');
        showAuthAlert('Log in first, then use Resend from the verification screen.', 'info');
    } catch (err) { showAuthAlert('Error: ' + err.message, 'error'); }
});
document.getElementById('checkInBtn').addEventListener('click', markCheckIn);
document.getElementById('checkOutBtn').addEventListener('click', markCheckOut);
document.getElementById('dashLogoutBtn').addEventListener('click', logout);
document.getElementById('adminLogoutBtn').addEventListener('click', logout);
document.getElementById('btnGoAdmin').addEventListener('click', () => { showPage('admin'); loadAdminData(); });
document.getElementById('goDashboardBtn').addEventListener('click', () => { showPage('dashboard'); loadDashboardData(); });
document.getElementById('addUserForm').addEventListener('submit', addUser);
document.getElementById('editUserForm').addEventListener('submit', saveUserEdit);
document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editUserModal').classList.add('hidden'));
document.getElementById('filterDate').addEventListener('change', loadAllAttendance);
document.getElementById('filterUser').addEventListener('input', loadAllAttendance);
document.getElementById('filterType').addEventListener('change', loadAllAttendance);
document.getElementById('refreshAttendanceBtn').addEventListener('click', loadAllAttendance);

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const form = tab.dataset.tab;
        document.getElementById('loginForm').classList.toggle('hidden', form !== 'login');
        document.getElementById('registerForm').classList.toggle('hidden', form !== 'register');
        document.getElementById('authAlert').className = 'auth-alert';
    });
});

// ========== INIT ==========
auth.onAuthStateChanged(async (user) => {
    loadingScreen.classList.add('hidden');
    currentUser = user;
    if (user) {
        isEmailVerified = user.emailVerified;
        if (!isEmailVerified) {
            showPage('verify');
            document.getElementById('verifyEmail').textContent = user.email;
        } else {
            await loadApp();
        }
    } else {
        showPage('auth');
    }
});
