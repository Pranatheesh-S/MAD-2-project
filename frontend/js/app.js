// ── Main Vue 3 App ────────────────────────────────────────────────────────────


// Toast Container Component
const ToastContainer = {
    template: `
  <div class="toast-container-ppa">
    <div v-for="t in store.state.toasts" :key="t.id" class="toast-ppa">
      <i :class="iconFor(t.type)" :style="{color: colorFor(t.type), fontSize:'1.1rem'}"></i>
      <span style="flex:1">{{t.message}}</span>
    </div>
  </div>`,
    methods: {
        iconFor(type) {
            return { success: 'bi bi-check-circle-fill', error: 'bi bi-x-circle-fill', info: 'bi bi-info-circle-fill' }[type] || 'bi bi-info-circle-fill';
        },
        colorFor(type) {
            return { success: 'var(--success)', error: 'var(--danger)', info: 'var(--primary)' }[type] || 'var(--primary)';
        }
    }
};

// Update router routes to include new views
Object.assign(router.routes, {
    'admin-applications': 'AdminApplications',
    'admin-jobs': 'AdminJobs',
    'student-history': 'StudentHistory',
});

// Root App Component
const App = {
    components: {
        ToastContainer,
        // Auth
        LoginView, RegisterView,
        // Admin
        AdminDashboard, AdminCompanies, AdminStudents, AdminDrives, AdminSearch,
        AdminApplications, AdminJobs,
        // Company
        CompanyDashboard, CompanyDrives, CompanyApplications, CompanyNewApplications, CompanyProfile,
        // Student
        StudentDashboard, StudentDrives, StudentApplications, StudentHistory, StudentProfile,
    },
    template: `
    <toast-container />
    <component :is="currentView" />
  `,
    computed: {
        currentView() {
            const route = router.current.value;
            const role = store.role;

            // Public routes
            if (!store.isLoggedIn) return route === 'register' ? 'RegisterView' : 'LoginView';
            if (route === 'login' || route === 'register') {
                router.redirectByRole(role);
                return role === 'admin' ? 'AdminDashboard' : role === 'company' ? 'CompanyDashboard' : 'StudentDashboard';
            }

            const adminRoutes = {
                'admin-dashboard': 'AdminDashboard', 'admin-companies': 'AdminCompanies',
                'admin-students': 'AdminStudents', 'admin-drives': 'AdminDrives',
                'admin-search': 'AdminSearch', 'admin-applications': 'AdminApplications',
                'admin-jobs': 'AdminJobs'
            };
            const companyRoutes = {
                'company-dashboard': 'CompanyDashboard', 'company-drives': 'CompanyDrives',
                'company-applications': 'CompanyApplications', 'company-new-applications': 'CompanyNewApplications', 'company-profile': 'CompanyProfile'
            };
            const studentRoutes = {
                'student-dashboard': 'StudentDashboard', 'student-drives': 'StudentDrives',
                'student-applications': 'StudentApplications', 'student-history': 'StudentHistory',
                'student-profile': 'StudentProfile'
            };

            if (role === 'admin' && adminRoutes[route]) return adminRoutes[route];
            if (role === 'company' && companyRoutes[route]) return companyRoutes[route];
            if (role === 'student' && studentRoutes[route]) return studentRoutes[route];

            router.redirectByRole(role);
            return role === 'admin' ? 'AdminDashboard' : role === 'company' ? 'CompanyDashboard' : 'StudentDashboard';
        }
    },
    mounted() {
        if (store.isLoggedIn) {
            const route = router.current.value;
            if (['login', 'register', ''].includes(route)) {
                router.redirectByRole(store.role);
            }
        }
    }
};

// Inject helper styles
const style = document.createElement('style');
style.textContent = `
  .active-tab { border-color: var(--primary) !important; color: var(--primary) !important; background: rgba(99,102,241,0.1) !important; }
  .badge-admin { background: rgba(245,158,11,.15); color: #f59e0b; border: 1px solid rgba(245,158,11,.3); }
  .badge-company { background: rgba(6,182,212,.15); color: #06b6d4; border: 1px solid rgba(6,182,212,.3); }
  .badge-student { background: rgba(99,102,241,.15); color: #818cf8; border: 1px solid rgba(99,102,241,.3); }
  .fw-600 { font-weight: 600; }
`;
document.head.appendChild(style);

const app = Vue.createApp(App);
app.config.globalProperties.store = store;
app.config.globalProperties.router = router;
app.mount('#app');
