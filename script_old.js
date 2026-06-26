// ========== FIREBASE CONFIG (YOUR PROJECT) ==========
const firebaseConfig = {
    apiKey: "AIzaSyDvj2N6tzE5x1GnaGdOcVv9QmKvWad8JeA",
    authDomain: "demoprobeta3.firebaseapp.com",
    projectId: "demoprobeta3",
    storageBucket: "demoprobeta3.appspot.com",
    messagingSenderId: "369529000980",
    appId: "1:369529000980:web:f6c97625b1b6c509d58301"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========== GLOBAL STATE ==========
let currentUser = null;
let userRole = 'user';
let todayAttendance = null;

// ========== DOM ELEMENTS ==========
const authPage = document.getElementById('authPage');
const dashboardPage = document.getElementById('dashboardPage');
const adminPage = document.getElementById('adminPage');
const alertBox = document.getElementById('alertBox');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// ========== TOAST ==========
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ========== ALERT ==========
function showAlert(msg, type = 'error') {
    alertBox.textContent = msg;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => { alertBox.style.display = 'none'; }, 6000);
}

// ========== TAB SWITCHING ==========
function switchTab(tab) {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
    }
    alertBox.style.display = 'none';
}

// ========== AUTH HANDLERS ==========
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing In...';
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (!cred.user.emailVerified) {
            showAlert('⚠️ Email not verified. Check your inbox (and spam). Use "Resend Verification" if needed.', 'info');
        }
    } catch (err) {
        showAlert(getFriendlyError(err.code), 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Sign In';
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.textContent = 'Creating Account...';
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name: name,
            email: email,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await cred.user.sendEmailVerification();
        showAlert('✅ Account created! Verification email sent. Check your inbox.', 'success');
        switchTab('login');
        document.getElementById('loginEmail').value = email;
    } catch (err) {
        showAlert(getFriendlyError(err.code), 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Create Account';
}

async function resendVerification() {
    const user = auth.currentUser;
    if (!user) {
        const email = document.getElementById('loginEmail').value.trim();
        if (!email) {
            showAlert('Please enter your email in the login form first.', 'info');
            return;
        }
        showAlert('Please log in first, then use the Resend button from the dashboard.', 'info');
        return;
    }
    if (user.emailVerified) {
        showAlert('Your email is already verified!', 'success');
        return;
    }
    try {
        await user.sendEmailVerification();
        showAlert('✅ Verification email resent! Check your inbox.', 'success');
    } catch (err) {
        showAlert('Failed to resend: ' + err.message, 'error');
    }
}

async function handleLogout() {
    await auth.signOut();
    window.location.reload();
}

function getFriendlyError(code) {
    const map = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your internet connection.'
    };
    return map[code] || 'An error occurred: ' + code;
}

// ========== PAGE NAVIGATION ==========
function showAuthPage() {
    authPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
    adminPage.classList.add('hidden');
}

function showDashboardPage() {
    authPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    adminPage.classList.add('hidden');
    loadDashboardData();
}

function showAdminPage() {
    authPage.classList.add('hidden');
    dashboardPage.classList.add('hidden');
    adminPage.classList.remove('hidden');
    loadAdminData();
}

function goToAdmin() {
    if (userRole === 'admin') showAdminPage();
    else showToast('Access denied. Admin only.');
}

function goToDashboard() {
    showDashboardPage();
}

// ========== DASHBOARD LOGIC ==========
async function loadDashboardData() {
    if (!currentUser) return;
    document.getElementById('dashAvatar').textContent = (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase();
    document.getElementById('dashRole').textContent = userRole;
    document.getElementById('verifyBadge').textContent = currentUser.emailVerified ? '✅ Verified' : '⚠️ Unverified';
    document.getElementById('verifyBadge').className = currentUser.emailVerified ? 'badge badge-verified' : 'badge badge-unverified';
    document.getElementById('btnGoAdmin').style.display = userRole === 'admin' ? 'inline-block' : 'none';

    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            document.getElementById('dashName').textContent = userDoc.data().name || 'User';
            document.getElementById('dashAvatar').textContent = (userDoc.data().name || 'U').charAt(0).toUpperCase();
        } else {
            document.getElementById('dashName').textContent = currentUser.email;
        }
    } catch (e) {
        document.getElementById('dashName').textContent = currentUser.email;
    }

    document.getElementById('todayDate').textContent = '📅 ' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    await checkTodayAttendance();
    await loadMyHistory();
}

async function checkTodayAttendance() {
    const todayStr = new Date().toISOString().split('T')[0];
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const statusEl = document.getElementById('attendanceStatus');
    const timeInfoEl = document.getElementById('checkTimeInfo');

    try {
        const snap = await db.collection('attendance')
            .where('userId', '==', currentUser.uid)
            .where('date', '==', todayStr)
            .limit(1)
            .get();

        if (!snap.empty) {
            todayAttendance = { id: snap.docs[0].id, ...snap.docs[0].data() };
            const data = todayAttendance;
            statusEl.textContent = '✅ You checked in today';
            statusEl.style.color = '#10b981';
            checkInBtn.disabled = true;
            checkInBtn.style.opacity = '0.5';
            checkOutBtn.disabled = !!data.checkOutTime;
            timeInfoEl.textContent = 'Check-in: ' + formatTime(data.checkInTime) +
                (data.checkOutTime ? ' | Check-out: ' + formatTime(data.checkOutTime) : '');
            if (data.checkOutTime) {
                statusEl.textContent = '🎉 Day complete! You checked in and out.';
                checkOutBtn.disabled = true;
                checkOutBtn.style.opacity = '0.5';
            }
        } else {
            todayAttendance = null;
            statusEl.textContent = '⏳ You haven\'t checked in yet today';
            statusEl.style.color = '#f59e0b';
            checkInBtn.disabled = false;
            checkInBtn.style.opacity = '1';
            checkOutBtn.disabled = true;
            checkOutBtn.style.opacity = '0.5';
            timeInfoEl.textContent = '';
        }
    } catch (err) {
        console.error('Check today error:', err);
        statusEl.textContent = 'Error loading status';
    }
}

async function markCheckIn() {
    if (!currentUser.emailVerified) {
        showToast('⚠️ Please verify your email before marking attendance.');
        return;
    }
    const btn = document.getElementById('checkInBtn');
    btn.disabled = true;
    btn.textContent = '⏳';
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const hour = now.getHours();
        const status = hour >= 9 ? 'late' : 'present';

        let userName = currentUser.email;
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) userName = userDoc.data().name || currentUser.email;
        } catch (e) {}

        await db.collection('attendance').add({
            userId: currentUser.uid,
            userName: userName,
            userEmail: currentUser.email,
            date: todayStr,
            checkInTime: firebase.firestore.FieldValue.serverTimestamp(),
            checkInTimeLocal: now.toISOString(),
            checkOutTime: null,
            checkOutTimeLocal: null,
            status: status
        });
        showToast('✅ Checked in successfully!');
        await checkTodayAttendance();
        await loadMyHistory();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
    btn.disabled = false;
    btn.textContent = '✅ Check In';
}

async function markCheckOut() {
    if (!todayAttendance || !todayAttendance.id) {
        showToast('No check-in record found for today.');
        return;
    }
    const btn = document.getElementById('checkOutBtn');
    btn.disabled = true;
    btn.textContent = '⏳';
    try {
        const now = new Date();
        await db.collection('attendance').doc(todayAttendance.id).update({
            checkOutTime: firebase.firestore.FieldValue.serverTimestamp(),
            checkOutTimeLocal: now.toISOString()
        });
        showToast('🏁 Checked out successfully!');
        await checkTodayAttendance();
        await loadMyHistory();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
    btn.disabled = false;
    btn.textContent = '🏁 Check Out';
}

async function loadMyHistory() {
    const tbody = document.getElementById('myAttendanceBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading"><div class="spinner"></div>Loading...</td></tr>';
    try {
        const snap = await db.collection('attendance')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .limit(50)
            .get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:30px;color:var(--text-light);">No attendance records yet.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${d.date}</td>
                <td>${formatTime(d.checkInTime) || formatTimeLocal(d.checkInTimeLocal) || '-'}</td>
                <td>${formatTime(d.checkOutTime) || formatTimeLocal(d.checkOutTimeLocal) || '—'}</td>
                <td><span class="badge badge-${d.status || 'present'}">${d.status || 'present'}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading history.</td></tr>';
        console.error(err);
    }
}

function formatTime(timestamp) {
    if (!timestamp || !timestamp.toDate) return null;
    return timestamp.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeLocal(isoStr) {
    if (!isoStr) return null;
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ========== ADMIN LOGIC ==========
async function loadAdminData() {
    if (!currentUser || userRole !== 'admin') {
        showToast('Access denied.');
        showDashboardPage();
        return;
    }
    document.getElementById('adminAvatar').textContent = (currentUser.displayName || currentUser.email || 'A').charAt(0).toUpperCase();
    document.getElementById('adminName').textContent = currentUser.displayName || currentUser.email;
    await Promise.all([loadAdminStats(), loadAllUsers(), loadAllAttendance()]);
}

async function loadAdminStats() {
    try {
        const usersSnap = await db.collection('users').get();
        document.getElementById('statTotalUsers').textContent = usersSnap.size;
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySnap = await db.collection('attendance').where('date', '==', todayStr).get();
        document.getElementById('statTodayCheckins').textContent = todaySnap.size;
        const allSnap = await db.collection('attendance').get();
        document.getElementById('statTotalRecords').textContent = allSnap.size;
        if (!todaySnap.empty) {
            let totalH = 0, count = 0;
            todaySnap.forEach(doc => {
                const d = doc.data();
                if (d.checkInTimeLocal) {
                    const h = new Date(d.checkInTimeLocal).getHours();
                    totalH += h;
                    count++;
                }
            });
            const avgH = Math.round(totalH / count);
            const ampm = avgH >= 12 ? 'PM' : 'AM';
            const dispH = avgH > 12 ? avgH - 12 : (avgH === 0 ? 12 : avgH);
            document.getElementById('statAvgCheckin').textContent = dispH + ':00 ' + ampm;
        } else {
            document.getElementById('statAvgCheckin').textContent = 'N/A';
        }
    } catch (err) {
        console.error('Stats error:', err);
    }
}

async function loadAllUsers() {
    const tbody = document.getElementById('allUsersBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading"><div class="spinner"></div>Loading...</td></tr>';
    try {
        const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px;">No users found.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${d.name || 'N/A'}</strong></td>
                <td>${d.email}</td>
                <td><span class="badge ${d.role==='admin'?'badge-admin':'badge-present'}">${d.role||'user'}</span></td>
                <td>${d.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading users.</td></tr>';
    }
}

async function loadAllAttendance() {
    const tbody = document.getElementById('allAttendanceBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div>Loading...</td></tr>';
    try {
        const filterDateVal = document.getElementById('filterDate').value;
        const filterUserVal = document.getElementById('filterUser').value.trim().toLowerCase();
        let query = db.collection('attendance').orderBy('date', 'desc').limit(100);
        if (filterDateVal) {
            query = db.collection('attendance').where('date', '==', filterDateVal).orderBy('checkInTimeLocal', 'desc').limit(100);
        }
        const snap = await query.get();
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px;">No records found.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            if (filterUserVal) {
                const nameMatch = (d.userName || '').toLowerCase().includes(filterUserVal);
                const emailMatch = (d.userEmail || '').toLowerCase().includes(filterUserVal);
                if (!nameMatch && !emailMatch) return;
            }
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${d.userName || 'N/A'}</strong></td>
                <td>${d.userEmail}</td>
                <td>${d.date}</td>
                <td>${formatTimeLocal(d.checkInTimeLocal) || '-'}</td>
                <td>${formatTimeLocal(d.checkOutTimeLocal) || '—'}</td>
                <td><span class="badge badge-${d.status||'present'}">${d.status||'present'}</span></td>
            `;
            tbody.appendChild(row);
        });
        if (tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px;">No matching records.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading records.</td></tr>';
        console.error(err);
    }
}

// ========== EVENT LISTENERS ==========
document.getElementById('tabLogin').addEventListener('click', () => switchTab('login'));
document.getElementById('tabRegister').addEventListener('click', () => switchTab('register'));
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
document.getElementById('resendVerifyBtn').addEventListener('click', resendVerification);
document.getElementById('resendVerifyDashBtn').addEventListener('click', resendVerification);
document.getElementById('logoutBtn').addEventListener('click', handleLogout);
document.getElementById('adminLogoutBtn').addEventListener('click', handleLogout);
document.getElementById('checkInBtn').addEventListener('click', markCheckIn);
document.getElementById('checkOutBtn').addEventListener('click', markCheckOut);
document.getElementById('btnGoAdmin').addEventListener('click', goToAdmin);
document.getElementById('goDashboardBtn').addEventListener('click', goToDashboard);
document.getElementById('filterDate').addEventListener('change', loadAllAttendance);
document.getElementById('filterUser').addEventListener('input', loadAllAttendance);
document.getElementById('refreshAttendanceBtn').addEventListener('click', loadAllAttendance);

// ========== AUTH STATE OBSERVER ==========
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                userRole = userDoc.data().role || 'user';
            } else {
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName || user.email,
                    email: user.email,
                    role: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                userRole = 'user';
            }
        } catch (e) {
            userRole = 'user';
        }
        if (userRole === 'admin') {
            showAdminPage();
        } else {
            showDashboardPage();
        }
    } else {
        currentUser = null;
        userRole = 'user';
        todayAttendance = null;
        showAuthPage();
    }
});

// Start on auth page
showAuthPage();
