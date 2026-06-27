const payoutApp = {
    currentEmpId: null,
    
    init() {
        // Use session storage to get logged-in employee
        this.currentEmpId = sessionStorage.getItem('tptEmpId');
        if (!this.currentEmpId) {
            window.location.href = 'index.html';
            return;
        }
        
        document.getElementById('payoutEmpId').textContent = this.currentEmpId;
        document.getElementById('payoutLogoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem('tptEmpId');
            window.location.href = 'index.html';
        });
        
        this.loadPayouts();
    },
    
    async loadPayouts() {
        this.showLoading(true);
        try {
            const snap = await db.ref(`payouts/${this.currentEmpId}`).once('value');
            const data = snap.val();
            const container = document.getElementById('payoutList');
            container.innerHTML = '';
            
            if (!data) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No payout history</p></div>';
                return;
            }
            
            // Sort months descending
            const months = Object.keys(data).sort().reverse();
            months.forEach(month => {
                const payout = data[month];
                const [year, monthNum] = month.split('-');
                const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                
                const div = document.createElement('div');
                div.className = 'card';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="margin:0;">${monthName}</h4>
                            <p style="margin:0.2rem 0; font-size:0.8rem; color:#64748b;">
                                ${payout.totalDays} days · ${payout.totalHours || '—'} hrs
                            </p>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:1.3rem; font-weight:700;">₹${payout.amount}</span>
                            <br>
                            <span style="font-size:0.7rem; color: ${payout.paid ? '#10b981' : '#ef4444'};">
                                ${payout.paid ? '✅ Paid' : '❌ Pending'}
                            </span>
                        </div>
                    </div>
                    ${payout.paidDate ? `<small style="color:#94a3b8;">Paid on: ${new Date(payout.paidDate).toLocaleDateString('en-IN')}</small>` : ''}
                `;
                container.appendChild(div);
            });
        } catch (error) {
            this.showToast('Failed to load payouts', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    showToast(msg, type) {
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

document.addEventListener('DOMContentLoaded', () => payoutApp.init());
