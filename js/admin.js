// admin.js – Full secured admin panel with OT, half-day, absent correction

const adminApp = {
    init() {
        // Login persistence – use localStorage so refresh keeps you in
        const auth = localStorage.getItem('adminAuthenticated');
        if (auth === 'true') {
            this.showDashboard();
            this.loadAll();
        } else {
            document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.verifyAdminPin(e));
        }

        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('addEmployeeBtn').addEventListener('click', () => this.showAddEmpModal());
        document.getElementById('cancelAddEmp').addEventListener('click', () => this.hideAddEmpModal());
        document.getElementById('addEmpForm').addEventListener('submit', (e) => this.addEmployee(e));
        document.getElementById('processPayoutBtn').addEventListener('click', () => this.processPayouts());

        // Correction events
        document.getElementById('markHalfDayBtn').addEventListener('click', () => this.correctStatus('halfday'));
        document.getElementById('markAbsentBtn').addEventListener('click', () => this.correctStatus('absent'));
        document.getElementById('setOTBtn').addEventListener('click', () => {
            document.getElementById('otInputArea').style.display = 'block';
        });
        document.getElementById('saveOTBtn').addEventListener('click', () => this.saveOT());
        document.getElementById('correctionEmp').addEventListener('change', () => this.loadCorrectionDate());
        document.getElementById('correctionDate').addEventListener('change', () => this.loadCorrectionDate());
    },

    // Load all needed data after login
    loadAll() {
        this.loadEmployees();
        this.loadTodayAttendance();
        this.populateEmployeeDropdown();
    },

    // ---------- Authentication ----------
    async verifyAdminPin(e) {
        e.preventDefault();
        const pin = document.getElementById('adminPin').value.trim();
        if (!pin) return;
        this.showLoading(true);
        try {
            const snap = await db.ref('admin/masterPin').once('value');
            const masterPin = snap.val();
            if (String(masterPin) === pin) {
                localStorage.setItem('adminAuthenticated', 'true');
                this.showDashboard();
                this.loadAll();
                this.showToast('Admin panel unlocked', 'success');
                document.getElementById('adminPin').value = '';
            } else {
                this.showToast('Incorrect PIN', 'error');
            }
        } catch (err) {
            this.showToast('Auth error', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    showDashboard() {
        document.getElementById('adminLoginScreen').classList.remove('active');
        document.getElementById('adminDashboard').classList.add('active');
    },

    logout() {
        localStorage.removeItem('adminAuthenticated');
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
                container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>No employees</p></div>';
                return;
            }
            const table = document.createElement('table');
            table.className = 'admin-table';
            table.innerHTML = '<thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Rate</th></tr></thead><tbody></tbody>';
            const tbody = table.querySelector('tbody');
            Object.entries(data).forEach(([id, emp]) => {
                const row = tbody.insertRow();
                row.innerHTML = `<td>${id}</td><td>${emp.name}</td><td>${emp.department || '—'}</td><td>₹${emp.ratePerDay}</td>`;
            });
            container.appendChild(table);
        } catch (error) {
            this.showToast('Failed to load employees', 'error');
        }
    },

    showAddEmpModal() { document.getElementById('addEmpModal').style.display = 'flex'; },
    hideAddEmpModal() { document.getElementById('addEmpModal').style.display = 'none'; },

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
                name, department: dept, ratePerDay: parseFloat(rate), pin, email: '', role: 'employee'
            });
            this.showToast(`Employee ${id} added!`, 'success');
            this.hideAddEmpModal();
            document.getElementById('addEmpForm').reset();
            this.loadEmployees();
            this.populateEmployeeDropdown();
        } catch (error) {
            this.showToast('Failed to add', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    // ---------- Attendance Overview ----------
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
            let has = false;
            Object.entries(allData).forEach(([empId, dates]) => {
                if (dates[today]) {
                    has = true;
                    const r = dates[today];
                    const inT = r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const outT = r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const st = r.status || 'present';
                    const div = document.createElement('div');
                    div.className = 'recent-item';
                    div.innerHTML = `<strong>${empId}</strong> <span>${inT} - ${outT}</span> <span>${st}</span>`;
                    container.appendChild(div);
                }
            });
            if (!has) container.innerHTML = '<div class="empty-state"><i class="far fa-calendar-alt"></i><p>No attendance today</p></div>';
        } catch (e) {
            this.showToast('Error loading attendance', 'error');
        }
    },

    // ---------- Attendance Correction ----------
    async populateEmployeeDropdown() {
        try {
            const snap = await db.ref('employees').once('value');
            const data = snap.val();
            const select = document.getElementById('correctionEmp');
            select.innerHTML = '<option value="">— Choose —</option>';
            if (data) {
                Object.entries(data).forEach(([id, emp]) => {
                    select.innerHTML += `<option value="${id}">${emp.name} (${id})</option>`;
                });
            }
        } catch (e) {
            console.error(e);
        }
    },

    async loadCorrectionDate() {
        const empId = document.getElementById('correctionEmp').value;
        const date = document.getElementById('correctionDate').value;
        const curDiv = document.getElementById('correctionCurrent');
        if (!empId || !date) {
            curDiv.innerHTML = '';
            return;
        }
        try {
            const snap = await db.ref(`attendance/${empId}/${date}`).once('value');
            const data = snap.val();
            if (data) {
                const status = data.status || 'present';
                const ot = data.otAmount || 0;
                curDiv.innerHTML = `Current: <strong>${status}</strong>, OT: ₹${ot}`;
            } else {
                curDiv.innerHTML = 'No record yet.';
            }
        } catch (e) {
            curDiv.innerHTML = 'Error loading.';
        }
    },

    async correctStatus(statusType) {
        const empId = document.getElementById('correctionEmp').value;
        const date = document.getElementById('correctionDate').value;
        if (!empId || !date) {
            this.showToast('Select employee and date', 'error');
            return;
        }
        this.showLoading(true);
        try {
            const ref = db.ref(`attendance/${empId}/${date}`);
            const snap = await ref.once('value');
            const existing = snap.val() || {};
            await ref.set({
                ...existing,
                status: statusType,
                // Ensure we don't lose checkIn/checkOut
                checkIn: existing.checkIn || null,
                checkOut: existing.checkOut || null,
                hoursWorked: existing.hoursWorked || null,
                otAmount: existing.otAmount || 0
            });
            this.showToast(`Marked as ${statusType}`, 'success');
            this.loadCorrectionDate();
        } catch (e) {
            this.showToast('Failed to update', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    async saveOT() {
        const empId = document.getElementById('correctionEmp').value;
        const date = document.getElementById('correctionDate').value;
        const otAmount = document.getElementById('otAmount').value;
        if (!empId || !date || otAmount === '') {
            this.showToast('Fill all fields', 'error');
            return;
        }
        this.showLoading(true);
        try {
            const ref = db.ref(`attendance/${empId}/${date}`);
            const snap = await ref.once('value');
            const existing = snap.val() || {};
            await ref.set({
                ...existing,
                otAmount: parseFloat(otAmount)
            });
            this.showToast(`OT set to ₹${otAmount}`, 'success');
            document.getElementById('otInputArea').style.display = 'none';
            this.loadCorrectionDate();
        } catch (e) {
            this.showToast('Failed to save OT', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    // ---------- Payout Processing (now respects status & OT) ----------
    async processPayouts() {
        const monthInput = document.getElementById('payoutMonth').value;
        if (!monthInput) {
            this.showToast('Select a month', 'error');
            return;
        }
        const [year, month] = monthInput.split('-');
        const monthKey = `${year}-${month}`;

        this.showLoading(true);
        try {
            const empSnap = await db.ref('employees').once('value');
            const employees = empSnap.val();
            if (!employees) {
                this.showToast('No employees', 'error');
                return;
            }
            const payoutResultDiv = document.getElementById('payoutResult');
            payoutResultDiv.innerHTML = '';
            let html = '<table class="admin-table"><thead><tr><th>Emp</th><th>Days</th><th>OT Total</th><th>Amount</th><th>Status</th></tr></thead><tbody>';

            for (const [empId, emp] of Object.entries(employees)) {
                const attSnap = await db.ref(`attendance/${empId}`).once('value');
                const attData = attSnap.val();
                let totalDays = 0;
                let totalOT = 0;

                if (attData) {
                    Object.entries(attData).forEach(([date, record]) => {
                        if (date.startsWith(monthKey)) {
                            const status = record.status || 'present';
                            if (status === 'absent') return; // skip
                            if (status === 'halfday') {
                                totalDays += 0.5;
                            } else {
                                // present or default
                                totalDays += 1;
                            }
                            totalOT += record.otAmount || 0;
                        }
                    });
                }

                const basePay = totalDays * (emp.ratePerDay || 0);
                const amount = basePay + totalOT;

                const payoutRef = db.ref(`payouts/${empId}/${monthKey}`);
                const payoutSnap = await payoutRef.once('value');
                const existing = payoutSnap.val();

                // Mark as paid
                await payoutRef.set({
                    totalDays,
                    totalOT,
                    amount,
                    paid: true,
                    paidDate: Date.now(),
                    ratePerDay: emp.ratePerDay
                });

                const paidStatus = existing?.paid ? '✅ Paid' : '🔄 Updated';
                html += `<tr>
                    <td>${empId}</td>
                    <td>${totalDays}</td>
                    <td>₹${totalOT}</td>
                    <td>₹${amount}</td>
                    <td>${paidStatus}</td>
                </tr>`;
            }

            html += '</tbody></table>';
            payoutResultDiv.innerHTML = html;
            this.showToast('Payouts processed with OT & half-days!', 'success');
        } catch (error) {
            this.showToast('Payout processing failed', 'error');
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
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => adminApp.init());
