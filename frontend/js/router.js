const router = {
    current: Vue.ref('login'),
    params: Vue.reactive({}),

    routes: {
        // Auth
        login: 'LoginView',
        register: 'RegisterView',

        // Admin
        'admin-dashboard': 'AdminDashboard',
        'admin-companies': 'AdminCompanies',
        'admin-students': 'AdminStudents',
        'admin-drives': 'AdminDrives',
        'admin-search': 'AdminSearch',

        // Company
        'company-dashboard': 'CompanyDashboard',
        'company-drives': 'CompanyDrives',
        'company-applications': 'CompanyApplications',
        'company-new-applications': 'CompanyNewApplications',
        'company-new-applications': 'CompanyNewApplications',
        'company-profile': 'CompanyProfile',

        // Student
        'student-dashboard': 'StudentDashboard',
        'student-drives': 'StudentDrives',
        'student-applications': 'StudentApplications',
        'student-profile': 'StudentProfile',
    },

    go(route, params = {}) {
        this.current.value = route;
        Object.assign(this.params, params);
        window.location.hash = route;
    },

    init() {
        const hash = window.location.hash.replace('#', '') || 'login';
        this.current.value = hash;
        window.addEventListener('hashchange', () => {
            this.current.value = window.location.hash.replace('#', '') || 'login';
        });
    },

    redirectByRole(role) {
        const map = { admin: 'admin-dashboard', company: 'company-dashboard', student: 'student-dashboard' };
        this.go(map[role] || 'login');
    },
};

router.init();
