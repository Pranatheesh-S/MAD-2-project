// ── Shared Layout Component ───────────────────────────────────────────────────
const AppLayout = {
  props: ['navItems', 'title'],
  template: `
  <div class="app-layout">
    <nav class="sidebar">
      <div class="sidebar-logo">⚡ PlacePro</div>
      <div class="sidebar-nav">
        <template v-for="section in navItems" :key="section.label">
          <div class="nav-section-label">{{section.label}}</div>
          <button v-for="item in section.items" :key="item.route"
            :class="['nav-item-link', router.current.value===item.route?'active':'']"
            @click="router.go(item.route)">
            <i :class="'bi bi-'+item.icon"></i> {{item.label}}
          </button>
        </template>
      </div>
      <div class="sidebar-footer">
        <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:.5rem">
          <i class="bi bi-person-circle me-1"></i>{{store.user?.username}}
          <span class="badge-ppa ms-2" :class="'badge-'+store.user?.role" style="font-size:.65rem">{{store.user?.role}}</span>
        </div>
        <button class="btn-outline-ppa w-100" style="font-size:.82rem;padding:.45rem 1rem" @click="logout">
          <i class="bi bi-box-arrow-left me-1"></i> Sign Out
        </button>
      </div>
    </nav>
    <div class="main-content">
      <div class="topbar">
        <h5 style="font-weight:700;margin:0">{{title}}</h5>
        <div style="font-size:.82rem;color:var(--text-muted)">
          <i class="bi bi-circle-fill me-1" style="color:var(--success);font-size:.5rem"></i>Online
        </div>
      </div>
      <div class="page-content">
        <slot></slot>
      </div>
    </div>
  </div>`,
  methods: {
    logout() { store.clearSession(); router.go('login'); }
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected',
    closed: 'badge-closed', applied: 'badge-applied', shortlisted: 'badge-shortlisted',
    selected: 'badge-selected', blacklisted: 'badge-rejected'
  };
  return `badge-ppa ${map[status] || 'badge-applied'}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="Admin Dashboard">
    <div v-if="loading" class="text-center py-5"><div class="spinner-border" style="color:var(--primary)"></div></div>
    <div v-else>
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg-3" v-for="s in statCards" :key="s.label">
          <div class="stat-card">
            <div class="stat-icon" :style="{background:s.bg}"><i :class="'bi bi-'+s.icon" :style="{color:s.color}"></i></div>
            <div>
              <div class="stat-value">{{stats[s.key]||0}}</div>
              <div class="stat-label">{{s.label}}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <div class="ppa-card">
            <h6 class="fw-bold mb-3"><i class="bi bi-building-check me-2" style="color:var(--primary)"></i>Pending Company Approvals</h6>
            <div v-if="!pending_companies.length" style="color:var(--text-muted);font-size:.88rem">No pending companies</div>
            <div v-for="c in pending_companies" :key="c.id" class="d-flex align-items-center justify-content-between py-2 border-bottom" style="border-color:var(--border)!important">
              <div>
                <div style="font-weight:600;font-size:.9rem">{{c.company_name}}</div>
                <div style="font-size:.78rem;color:var(--text-muted)">{{c.email}} · {{c.industry||'N/A'}}</div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm" style="background:rgba(16,185,129,.15);color:#10b981;border:none;border-radius:8px;font-size:.78rem" @click="companyAction(c.id,'approve')">Approve</button>
                <button class="btn btn-sm" style="background:rgba(239,68,68,.15);color:#ef4444;border:none;border-radius:8px;font-size:.78rem" @click="companyAction(c.id,'reject')">Reject</button>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="ppa-card">
            <h6 class="fw-bold mb-3"><i class="bi bi-briefcase-fill me-2" style="color:var(--secondary)"></i>Pending Drive Approvals</h6>
            <div v-if="!pending_drives.length" style="color:var(--text-muted);font-size:.88rem">No pending drives</div>
            <div v-for="d in pending_drives" :key="d.id" class="d-flex align-items-center justify-content-between py-2 border-bottom" style="border-color:var(--border)!important">
              <div>
                <div style="font-weight:600;font-size:.9rem">{{d.job_title}}</div>
                <div style="font-size:.78rem;color:var(--text-muted)">{{d.company_name}} · Deadline: {{fmtDate(d.deadline)}}</div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm" style="background:rgba(16,185,129,.15);color:#10b981;border:none;border-radius:8px;font-size:.78rem" @click="driveAction(d.id,'approve')">Approve</button>
                <button class="btn btn-sm" style="background:rgba(239,68,68,.15);color:#ef4444;border:none;border-radius:8px;font-size:.78rem" @click="driveAction(d.id,'reject')">Reject</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </app-layout>`,
  data() {
    return {
      loading: true, stats: {},
      pending_companies: [], pending_drives: [],
      nav: adminNav()
    };
  },
  methods: {
    fmtDate,
    async load() {
      this.loading = true;
      try {
        [this.stats, this.pending_companies, this.pending_drives] = await Promise.all([
          store.get('/api/admin/stats'),
          store.get('/api/admin/companies?status=pending'),
          store.get('/api/admin/drives?status=pending'),
        ]);
      } catch (e) { store.error(e.message); }
      finally { this.loading = false; }
    },
    async companyAction(id, action) {
      try {
        await store.put(`/api/admin/companies/${id}/approve`, { action });
        store.success(`Company ${action}d`);
        this.load();
      } catch (e) { store.error(e.message); }
    },
    async driveAction(id, action) {
      try {
        await store.put(`/api/admin/drives/${id}/approve`, { action });
        store.success(`Drive ${action}d`);
        this.load();
      } catch (e) { store.error(e.message); }
    },
    statCards() { }
  },
  computed: {
    statCards() {
      return [
        { key: 'total_students', label: 'Total Students', icon: 'people-fill', bg: 'rgba(99,102,241,.15)', color: 'var(--primary)' },
        { key: 'total_companies', label: 'Total Companies', icon: 'building', bg: 'rgba(6,182,212,.15)', color: 'var(--secondary)' },
        { key: 'total_drives', label: 'Total Placement Drives', icon: 'briefcase', bg: 'rgba(16,185,129,.15)', color: 'var(--success)' },
        { key: 'selected_students', label: 'Students Placed', icon: 'trophy-fill', bg: 'rgba(245,158,11,.15)', color: 'var(--warning)' },
      ];
    }
  },
  mounted() { this.load(); }
};

function adminNav() {
  return [
    {
      label: 'Overview', items: [
        { route: 'admin-dashboard', icon: 'speedometer2', label: 'Dashboard' },
        { route: 'admin-search', icon: 'search', label: 'Search' },
        { route: 'admin-applications', icon: 'file-earmark-text', label: 'All Applications' },
      ]
    },
    {
      label: 'Manage', items: [
        { route: 'admin-companies', icon: 'building', label: 'Companies' },
        { route: 'admin-students', icon: 'people', label: 'Students' },
        { route: 'admin-drives', icon: 'briefcase', label: 'Placement Drives' },
        { route: 'admin-jobs', icon: 'gear', label: 'Background Jobs' },
      ]
    },
  ];
}
