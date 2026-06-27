const adminApp = {
    init() {
        document.getElementById('adminLogoutBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        document.getElementById('addEmployeeBtn').addEventListener('click', () => this.showAddEmpModal());
        document.getElementById('cancelAddEmp').addEventListener('click', () => this.hideAddEmpModal());
        document.getElementById('addEmpForm').addEventListener('submit', (e) => this.addEmployee(e));
        document.getElementById('processPayoutBtn').addEventListener('click', () => this.processPayouts());
        
        this.loadEmployees();
        this.loadTodayAttendance();
    },
    
    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    },
    
    showToast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    async loadEmployees() {
        try {
            const snap = await db.ref('employees').once('value');
            const data = snap.val();
            const container = document.getElementById('employeeListContainer');
            container.innerHTML = '';
            
            if (!data) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>No employees</p></div>';
                return;
            }
            
            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = '<thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Rate</th></tr></thead><tbody></tbody>';
            const tbody = table.querySelector('tbody');
            
            Object.entries(data).forEach(([id, emp]) => {
                const row = tbody.insertRow();
                row.innerHTML = `<td>${id}</td><td>${emp.name}</td><td>${emp.department}</td><td>₹${emp.ratePerDay}</td>`;
            });
            
            container.appendChild(table);
        } catch (error) {
            this.showToast('Failed to load employees', 'error');
        }
    },
    
    async loadTodayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const snap = await db.ref('attendance').once('value');
            const allData = snap.val();
            const container = document.getElementById('todayAttendanceList');
            container.innerHTML = '';
            
            if (!allData) {
                container.innerHTML = '<div class="empty-state"><i class="far fa-calendar-alt"></i><p>No records</p></div>';
                return;
            }
            
            let hasRecords = false;
            Object.entries(allData).forEach(([empId, dates]) => {
                if (dates[today]) {
                    hasRecords = true;
                    const record = dates[today];
                    const inTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const outTime = record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const div = document.createElement('div');
                    div.className = 'recent-item';
                    div.innerHTML = `<strong>${empId}</strong> <span>${inTime} - ${outTime}</span>`;
                    container.appendChild(div);
                }
            });
            
            if (!hasRecords) {
                container.innerHTML = '<div class="empty-state"><i class="far fa-calendar-alt"></i><p>No attendance today</p></div>';
            }
        } catch (error) {
            this.showToast('Failed to load attendance', 'error');
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
            this.showToast('All fields required', 'error');
            return;
        }
        
        this.showLoading(true);
        try {
            await db.ref(`employees/${id}`).set({
                name,
                department: dept,
                ratePerDay: parseFloat(rate),
                pin,
                email: ''
            });
            this.showToast('Employee added!', 'success');
            this.hideAddEmpModal();
            document.getElementById('addEmpForm').reset();
            this.loadEmployees();
        } catch (error) {
            this.showToast('Failed to add employee', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    async processPayouts() {
        const monthInput = document.getElementById('payoutMonth').value;
        if (!monthInput) {
            this.showToast('Select a month', 'error');
            return;
        }
        // Format: YYYY-MM
        const [year, month] = monthInput.split('-');
        const monthKey = `${year}-${month}`;
        
        this.showLoading(true);
        try {
            // Get all employees
            const empSnap = await db.ref('employees').once('value');
            const employees = empSnap.val();
            if (!employees) {
                this.showToast('No employees', 'error');
                return;
            }
            
            const payoutResultDiv = document.getElementById('payoutResult');
            payoutResultDiv.innerHTML = '';
            let resultsHtml = '<table class="admin-table"><thead><tr><th>Emp</th><th>Days</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
            
            for (const [empId, emp] of Object.entries(employees)) {
                // Get all attendance for that month
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
                
                // Check if already paid
                const payoutSnap = await db.ref(`payouts/${empId}/${monthKey}`).once('value');
                const existing = payoutSnap.val();
                
                if (!existing || existing.paid !== true) {
                    // Mark as paid now
                    await db.ref(`payouts/${empId}/${monthKey}`).set({
                        totalDays,
                        totalHours: totalHours.toFixed(1),
                        amount,
                        paid: true,
                        paidDate: Date.now(),
                        ratePerDay: emp.ratePerDay
                    });
                }
                
                const paidStatus = existing?.paid ? '✅ Paid' : '🔄 Processing';
                resultsHtml += `<tr>
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
        } finally {
            this.showLoading(false);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => adminApp.init());
