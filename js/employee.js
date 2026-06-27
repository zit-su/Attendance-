// TPT Attendance - Employee Script
const employeeApp = {
    currentEmpId: null,
    currentEmpData: null,
    todayDateStr: new Date().toISOString().split('T')[0],
    
    // UI Elements
    loginScreen: document.getElementById('loginScreen'),
    dashboardScreen: document.getElementById('dashboardScreen'),
    loginForm: document.getElementById('employeeLoginForm'),
    
    init() {
        this.todayDateStr = new Date().toISOString().split('T')[0];
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('bottomLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('checkInBtn').addEventListener('click', () => this.checkIn());
        document.getElementById('checkOutBtn').addEventListener('click', () => this.checkOut());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadDashboard());
        
        // Check if already logged in (session)
        const storedEmp = sessionStorage.getItem('tptEmpId');
        if (storedEmp) {
            this.currentEmpId = storedEmp;
            this.showDashboard();
            this.loadDashboard();
        }
    },
    
    async handleLogin(e) {
        e.preventDefault();
        const empId = document.getElementById('employeeId').value.trim().toUpperCase();
        const pin = document.getElementById('employeePin').value.trim();
        
        if (!empId || !pin) {
            this.showToast('Please fill all fields', 'error');
            return;
        }
        
        this.showLoading(true);
        try {
            const snapshot = await db.ref(`employees/${empId}`).once('value');
            const empData = snapshot.val();
            
            if (!empData) {
                throw new Error('Employee not found');
            }
            
            if (empData.pin !== pin) {
                throw new Error('Invalid PIN');
            }
            
            this.currentEmpId = empId;
            this.currentEmpData = empData;
            sessionStorage.setItem('tptEmpId', empId);
            this.showDashboard();
            this.loadDashboard();
            this.showToast(`Welcome, ${empData.name}!`, 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    showDashboard() {
        this.loginScreen.classList.remove('active');
        this.dashboardScreen.classList.add('active');
        document.getElementById('headerEmpId').textContent = this.currentEmpId;
    },
    
    async loadDashboard() {
        if (!this.currentEmpId) return;
        this.showLoading(true);
        
        try {
            // Load employee info
            const empSnap = await db.ref(`employees/${this.currentEmpId}`).once('value');
            this.currentEmpData = empSnap.val();
            
            document.getElementById('empInitials').textContent = 
                (this.currentEmpData.name || '').split(' ').map(n => n[0]).join('').toUpperCase() || '?';
            document.getElementById('empName').textContent = this.currentEmpData.name || '—';
            document.getElementById('empDept').textContent = this.currentEmpData.department || '—';
            document.getElementById('empRate').textContent = `₹${this.currentEmpData.ratePerDay || 0}/day`;
            
            // Load today's attendance
            const todaySnap = await db.ref(`attendance/${this.currentEmpId}/${this.todayDateStr}`).once('value');
            const todayData = todaySnap.val();
            
            this.updateTodayStatus(todayData);
            
            // Load recent attendance (last 7 days)
            const attendSnap = await db.ref(`attendance/${this.currentEmpId}`)
                .orderByKey()
                .limitToLast(7)
                .once('value');
            this.renderRecentAttendance(attendSnap.val());
            
            document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-IN', { 
                day: 'numeric', month: 'short', year: 'numeric' 
            });
        } catch (error) {
            this.showToast('Failed to load dashboard', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    updateTodayStatus(data) {
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        const statusIcon = document.getElementById('statusIcon');
        const statusLabel = document.getElementById('statusLabel');
        const statusTime = document.getElementById('statusTime');
        const checkInTime = document.getElementById('checkInTime');
        const checkOutTime = document.getElementById('checkOutTime');
        const hoursBadge = document.getElementById('hoursBadge');
        const hoursWorked = document.getElementById('hoursWorked');
        
        if (data && data.checkIn) {
            // Checked in
            statusIcon.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
            statusIcon.style.background = '#ecfdf5';
            statusIcon.style.color = '#10b981';
            statusLabel.textContent = 'Checked In';
            statusTime.textContent = new Date(data.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            checkInTime.textContent = statusTime.textContent;
            checkInBtn.disabled = true;
            checkOutBtn.disabled = false;
            
            if (data.checkOut) {
                // Checked out
                statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                statusIcon.style.background = '#e0e7ff';
                statusIcon.style.color = '#4f46e5';
                statusLabel.textContent = 'Completed';
                const outTime = new Date(data.checkOut);
                statusTime.textContent = outTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                checkOutTime.textContent = statusTime.textContent;
                checkOutBtn.disabled = true;
                
                // Show hours
                const hours = data.hoursWorked || 
                    ((data.checkOut - data.checkIn) / (1000 * 60 * 60)).toFixed(1);
                hoursBadge.style.display = 'inline-flex';
                const h = Math.floor(hours);
                const m = Math.round((hours - h) * 60);
                hoursWorked.textContent = `${h}h ${m}m`;
            } else {
                checkOutTime.textContent = '—:—';
                hoursBadge.style.display = 'none';
            }
        } else {
            // Not checked in
            statusIcon.innerHTML = '<i class="far fa-clock"></i>';
            statusIcon.style.background = '#f1f5f9';
            statusIcon.style.color = '#64748b';
            statusLabel.textContent = 'Not Checked In';
            statusTime.textContent = '—';
            checkInTime.textContent = '—:—';
            checkOutTime.textContent = '—:—';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
            hoursBadge.style.display = 'none';
        }
    },
    
    renderRecentAttendance(data) {
        const container = document.getElementById('recentAttendance');
        container.innerHTML = '';
        if (!data) {
            container.innerHTML = '<div class="empty-state"><i class="far fa-calendar-alt"></i><p>No recent records</p></div>';
            return;
        }
        
        // Sort dates descending
        const dates = Object.keys(data).sort().reverse().slice(0, 7);
        dates.forEach(date => {
            const record = data[date];
            if (record && record.checkIn) {
                const inTime = new Date(record.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const outTime = record.checkOut ? 
                    new Date(record.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                const hours = record.hoursWorked || 
                    (record.checkOut ? ((record.checkOut - record.checkIn) / (1000 * 60 * 60)).toFixed(1) : '—');
                
                const div = document.createElement('div');
                div.className = 'recent-item';
                div.innerHTML = `
                    <div><strong>${new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong></div>
                    <div>${inTime} - ${outTime}</div>
                    <div>${hours !== '—' ? hours + 'h' : '—'}</div>
                `;
                container.appendChild(div);
            }
        });
        if (container.children.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="far fa-calendar-alt"></i><p>No recent records</p></div>';
        }
    },
    
    async checkIn() {
        if (!this.currentEmpId) return;
        this.showLoading(true);
        try {
            const now = Date.now();
            await db.ref(`attendance/${this.currentEmpId}/${this.todayDateStr}`).set({
                checkIn: now,
                checkOut: null,
                hoursWorked: null,
                approved: false
            });
            this.showToast('Checked in successfully!', 'success');
            this.loadDashboard();
        } catch (error) {
            this.showToast('Check-in failed', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    async checkOut() {
        if (!this.currentEmpId) return;
        this.showLoading(true);
        try {
            const snap = await db.ref(`attendance/${this.currentEmpId}/${this.todayDateStr}`).once('value');
            const data = snap.val();
            if (!data || !data.checkIn) {
                throw new Error('You must check in first');
            }
            const now = Date.now();
            const hoursWorked = ((now - data.checkIn) / (1000 * 60 * 60)).toFixed(2);
            await db.ref(`attendance/${this.currentEmpId}/${this.todayDateStr}`).update({
                checkOut: now,
                hoursWorked: parseFloat(hoursWorked)
            });
            this.showToast('Checked out!', 'success');
            this.loadDashboard();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    logout() {
        sessionStorage.removeItem('tptEmpId');
        this.currentEmpId = null;
        this.currentEmpData = null;
        this.dashboardScreen.classList.remove('active');
        this.loginScreen.classList.add('active');
        document.getElementById('employeeId').value = '';
        document.getElementById('employeePin').value = '';
    },
    
    showToast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => employeeApp.init());
