// admin.js – Full secured admin panel with PIN authentication

const adminApp = {
    init() {
        // Check if already authenticated (session flag)
        if (sessionStorage.getItem('adminAuthenticated') === 'true') {
            this.showDashboard();
            this.loadEmployees();
            this.loadTodayAttendance();
        } else {
            // Bind login form
            document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.verifyAdminPin(e));
        }
        
        // Dashboard buttons
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('addEmployeeBtn').addEventListener('click', () => this.showAddEmpModal());
        document.getElementById('cancelAddEmp').addEventListener('click', () => this.hideAddEmpModal());
        document.getElementById('addEmpForm').addEventListener('submit', (e) => this.addEmployee(e));
        document.getElementById('processPayoutBtn').addEventListener('click', () => this.processPayouts());
    },
    
    // ---------- Authentication ----------
    async verifyAdminPin(e) {
        e.preventDefault();
        const pin = document.getElementById('adminPin').value.trim();
        if (!pin) {
            this.showToast('Please enter the admin PIN', 'error');
            return;
        }
        
        this.showLoading(true);
        try {
            // Compare against stored master pin
            const snap = await db.ref('admin/masterPin').once('value');
            const masterPin = snap.val();
            if (masterPin === pin) {
                sessionStorage.setItem('adminAuthenticated', 'true');
                this.showDashboard();
                this.loadEmployees();
                this.loadTodayAttendance();
                this.showToast('Admin panel unlocked', 'success');
                document.getElementById('adminPin').value = '';
            } else {
                this.showToast('Incorrect PIN', 'error');
            }
        } catch (err) {
            this.showToast('Authentication error', 'error');
            console.error(err);
        } finally {
            this.showLoading(false);
        }
    },
    
    showDashboard() {
        document.getElementById('adminLoginScreen').classList.remove('active');
        document.getElementById('adminDashboard').classList.add('active');
    },
    
    logout() {
        sessionStorage.removeItem('adminAuthenticated');
        window.location.href = 'index.html';
    },
    
    // ---------- Employee Management ----------
    async loadEmployees() {
        try {
            const snap = await db.ref('employees').once('value');
            const data = snap.val();
            const container = document.getElementById('employeeListContainer');
            container.innerHTML = '';
            
            if (!data) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>No employees yet</p></div>';
                return;
            }
            
            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = '<thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Rate</th></tr></thead><tbody></tbody>';
            const tbody = table.querySelector('tbody');
            
            Object.entries(data).forEach(([id, emp]) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${id}</td>
                    <td>${emp.name}</td>
                    <td>${emp.department || '—'}</td>
                    <td>₹${emp.ratePerDay}</td>
                `;
            });
            
            container.appendChild(table);
        } catch (error) {
            this.showToast('Failed to load employees', 'error');
        }
    },
    
    showAddEmpModal() {
        document.getElementById('addEmpModal').style.display = 'flex';
    },
    
    hideAddEmpModal() {
        document.getElementById('addEmpModal').style.display = 'none';
    },
    
    async addEmployee(e) {
        e.preventDefault();
        const id = document.getElementById('newEmpId').value.trim().toUpperCase();
        const name = document.getElementById('newEmpName').value.trim();
        const dept = document.getElementById('newEmpDept').value.trim();
        const rate = document.getElementById('newEmpRate').value;
        const pin = document.getElementById('newEmpPin').value;
        
        if (!id || !name || !dept || !rate || !pin) {
            this.showToast('All fields are required', 'error');
            return;
        }
        
        this.showLoading(true);
        try {
            await db.ref(`employees/${id}`).set({
                name,
                department: dept,
                ratePerDay: parseFloat(rate),
                pin,
                email: '',
                role: 'employee'   // default role, not admin
            });
            this.showToast(`Employee ${id} added successfully!`, 'success');
            this.hideAddEmpModal();
            document.getElementById('addEmpForm').reset();
            this.loadEmployees();
        } catch (error) {
            this.showToast('Failed to add employee', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    // ---------- Attendance ----------
    async loadTodayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const snap = await db.ref('attendance').once('value');
            const allData = snap.val();
            const container = document.getElementById('todayAttendanceList');
            container.innerHTML = '';
            
            if (!allData) {
                container.innerHTML = '<div class="empty-state"><i class="far fa-calendar-alt"></i><p>No records for today</p></div>';
                return;
            }
            
            let hasRecords = false;
            Object.entries(allData).forEach(([empId, dates]) => {
                if (dates[today]) {
                    hasRecords = true;
                    const record = dates[today];
                    const inTime = record.checkIn
                        ? new Date(record.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—';
                    const outTime = record.checkOut
                        ? new Date(record.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—';
                    const div = document.createElement('div');
                    div.className = 'recent-item';
                    div.innerHTML = `
                        <strong>${empId}</strong>
                        <span>${inTime} - ${outTime}</span>
                        <span>${record.hoursWorked || '—'} hrs</span>
                    `;
                    container.appendChild(div);
                }
            });
            
            if (!hasRecords) {
                container.innerHTML = '<div class="empty-state"><i class="far fa-calendar-alt"></i><p>No attendance yet today</p></div>';
            }
        } catch (error) {
            this.showToast('Failed to load attendance', 'error');
        }
    },
    
    // ---------- Payout Processing ----------
    async processPayouts() {
        const monthInput = document.getElementById('payoutMonth').value;
        if (!monthInput) {
            this.showToast('Please select a month', 'error');
            return;
        }
        
        const [year, month] = monthInput.split('-');
        const monthKey = `${year}-${month}`;
        
        this.showLoading(true);
        try {
            // Get all employees
            const empSnap = await db.ref('employees').once('value');
            const employees = empSnap.val();
            if (!employees) {
                this.showToast('No employees found', 'error');
                return;
            }
            
            const payoutResultDiv = document.getElementById('payoutResult');
            payoutResultDiv.innerHTML = '';
            let resultsHtml = '<table class="admin-table"><thead><tr><th>Emp</th><th>Days</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
            
            for (const [empId, emp] of Object.entries(employees)) {
                // Get attendance for the selected month
                const attSnap = await db.ref(`attendance/${empId}`).once('value');
                const attData = attSnap.val();
                let totalDays = 0;
                let totalHours = 0;
                
                if (attData) {
                    Object.entries(attData).forEach(([date, record]) => {
                        if (date.startsWith(monthKey) && record.checkIn) {
                            totalDays++;
                            if (record.hoursWorked) {
                                totalHours += parseFloat(record.hoursWorked);
                            }
                        }
                    });
                }
                
                const amount = totalDays * (emp.ratePerDay || 0);
                
                // Check existing payout
                const payoutSnap = await db.ref(`payouts/${empId}/${monthKey}`).once('value');
                const existing = payoutSnap.val();
                
                // If not already paid, mark as paid
                if (!existing || existing.paid !== true) {
                    await db.ref(`payouts/${empId}/${monthKey}`).set({
                        totalDays,
                        totalHours: totalHours.toFixed(1),
                        amount,
                        paid: true,
                        paidDate: Date.now(),
                        ratePerDay: emp.ratePerDay
                    });
                }
                
                const paidStatus = existing?.paid ? '✅ Paid' : '🔄 Updated';
                resultsHtml += `
                    <tr>
                        <td>${empId}</td>
                        <td>${totalDays}</td>
                        <td>₹${amount}</td>
                        <td>${paidStatus}</td>
                    </tr>`;
            }
            
            resultsHtml += '</tbody></table>';
            payoutResultDiv.innerHTML = resultsHtml;
            this.showToast('Payouts processed!', 'success');
        } catch (error) {
            this.showToast('Payout processing failed', 'error');
            console.error(error);
        } finally {
            this.showLoading(false);
        }
    },
    
    // ---------- Helpers ----------
    showToast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => adminApp.init());
