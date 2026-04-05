// ── Admin Companies View ──────────────────────────────────────────────────────
const AdminCompanies = {
    components: { AppLayout },
    template: `
  <app-layout :nav-items="nav" title="Companies">
    <div class="ppa-card">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div class="d-flex gap-2">
          <select v-model="filter" class="form-select form-select-sm" style="width:140px" @change="load">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <span class="badge-ppa badge-approved" style="font-size:.8rem">{{companies.length}} companies</span>
      </div>
      <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
      <div v-else class="table-responsive">
        <table class="ppa-table">
          <thead><tr>
            <th>Company</th><th>HR Contact</th><th>Industry</th><th>Status</th><th>Blacklisted</th><th>Actions</th>
          </tr></thead>
          <tbody>
            <tr v-if="!companies.length"><td colspan="6" class="text-center py-4" style="color:var(--text-muted)">No companies found</td></tr>
            <tr v-for="c in companies" :key="c.id">
              <td>
                <div style="font-weight:600">{{c.company_name}}</div>
                <div style="font-size:.78rem;color:var(--text-muted)">{{c.email}}</div>
              </td>
              <td style="font-size:.85rem">{{c.hr_contact||'—'}}</td>
              <td style="font-size:.85rem">{{c.industry||'—'}}</td>
              <td><span :class="statusBadge(c.approval_status)" class="badge-ppa">{{c.approval_status}}</span></td>
              <td><span :class="c.is_blacklisted?'badge-ppa badge-rejected':'badge-ppa badge-approved'">{{c.is_blacklisted?'Yes':'No'}}</span></td>
              <td>
                <div class="d-flex gap-1">
                  <button v-if="c.approval_status==='pending'" class="btn btn-sm" style="background:rgba(16,185,129,.15);color:#10b981;border:none;border-radius:6px;font-size:.75rem" @click="action(c.id,'approve')">Approve</button>
                  <button v-if="c.approval_status==='pending'" class="btn btn-sm" style="background:rgba(239,68,68,.15);color:#ef4444;border:none;border-radius:6px;font-size:.75rem" @click="action(c.id,'reject')">Reject</button>
                  <button class="btn btn-sm" :style="c.is_blacklisted?'background:rgba(16,185,129,.15);color:#10b981':'background:rgba(239,68,68,.15);color:#ef4444'" style="border:none;border-radius:6px;font-size:.75rem" @click="toggleBlacklist(c)">{{c.is_blacklisted?'Unblock':'Blacklist'}}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </app-layout>`,
    data() { return { companies: [], loading: true, filter: '', nav: adminNav() }; },
    methods: {
        statusBadge,
        async load() {
            this.loading = true;
            try { this.companies = await store.get('/api/admin/companies' + (this.filter ? `?status=${this.filter}` : '')); }
            catch (e) { store.error(e.message); } finally { this.loading = false; }
        },
        async action(id, act) {
            try { await store.put(`/api/admin/companies/${id}/approve`, { action: act }); store.success(`Company ${act}d`); this.load(); }
            catch (e) { store.error(e.message); }
        },
        async toggleBlacklist(c) {
            try { await store.put(`/api/admin/companies/${c.id}/blacklist`, { blacklist: !c.is_blacklisted }); store.success('Updated'); this.load(); }
            catch (e) { store.error(e.message); }
        }
    },
    mounted() { this.load(); }
};

// ── Admin Students View ───────────────────────────────────────────────────────
const AdminStudents = {
    components: { AppLayout },
    template: `
  <app-layout :nav-items="nav" title="Students">
    <div class="ppa-card">
      <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
      <div v-else class="table-responsive">
        <table class="ppa-table">
          <thead><tr><th>Name</th><th>Email</th><th>Branch</th><th>CGPA</th><th>Year</th><th>Blacklisted</th><th>Action</th></tr></thead>
          <tbody>
            <tr v-if="!students.length"><td colspan="7" class="text-center py-4" style="color:var(--text-muted)">No students</td></tr>
            <tr v-for="s in students" :key="s.id">
              <td style="font-weight:600">{{s.name}}</td>
              <td style="font-size:.85rem;color:var(--text-muted)">{{s.email}}</td>
              <td><span class="badge-ppa badge-applied">{{s.branch||'—'}}</span></td>
              <td style="font-weight:600;color:var(--primary)">{{s.cgpa}}</td>
              <td>Year {{s.year}}</td>
              <td><span :class="s.is_blacklisted?'badge-ppa badge-rejected':'badge-ppa badge-approved'">{{s.is_blacklisted?'Yes':'No'}}</span></td>
              <td><button class="btn btn-sm" :style="s.is_blacklisted?'background:rgba(16,185,129,.15);color:#10b981':'background:rgba(239,68,68,.15);color:#ef4444'" style="border:none;border-radius:6px;font-size:.75rem" @click="toggle(s)">{{s.is_blacklisted?'Unblock':'Blacklist'}}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </app-layout>`,
    data() { return { students: [], loading: true, nav: adminNav() }; },
    methods: {
        async load() {
            this.loading = true;
            try { this.students = await store.get('/api/admin/students'); }
            catch (e) { store.error(e.message); } finally { this.loading = false; }
        },
        async toggle(s) {
            try { await store.put(`/api/admin/students/${s.id}/blacklist`, { blacklist: !s.is_blacklisted }); store.success('Updated'); this.load(); }
            catch (e) { store.error(e.message); }
        }
    },
    mounted() { this.load(); }
};

// ── Admin Drives View ─────────────────────────────────────────────────────────
const AdminDrives = {
    components: { AppLayout },
    template: `
  <app-layout :nav-items="nav" title="Placement Drives">
    <div class="ppa-card">
      <div class="d-flex gap-2 mb-3">
        <select v-model="filter" class="form-select form-select-sm" style="width:140px" @change="load">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
        <span class="badge-ppa badge-approved align-self-center" style="font-size:.8rem">{{drives.length}} drives</span>
      </div>
      <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
      <div v-else class="table-responsive">
        <table class="ppa-table">
          <thead><tr><th>Job Title</th><th>Company</th><th>Package</th><th>Deadline</th><th>Applications</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-if="!drives.length"><td colspan="7" class="text-center py-4" style="color:var(--text-muted)">No drives found</td></tr>
            <tr v-for="d in drives" :key="d.id">
              <td style="font-weight:600">{{d.job_title}}</td>
              <td style="font-size:.85rem;color:var(--secondary)">{{d.company_name}}</td>
              <td style="font-weight:600;color:var(--success)">{{d.package_lpa ? d.package_lpa+' LPA' : '—'}}</td>
              <td style="font-size:.82rem">{{fmtDate(d.deadline)}}</td>
              <td style="text-align:center"><span class="badge-ppa badge-applied">{{d.application_count}}</span></td>
              <td><span :class="statusBadge(d.status)" class="badge-ppa">{{d.status}}</span></td>
              <td>
                <div class="d-flex gap-1">
                  <button v-if="d.status==='pending'" class="btn btn-sm" style="background:rgba(16,185,129,.15);color:#10b981;border:none;border-radius:6px;font-size:.75rem" @click="action(d.id,'approve')">Approve</button>
                  <button v-if="d.status==='pending'" class="btn btn-sm" style="background:rgba(239,68,68,.15);color:#ef4444;border:none;border-radius:6px;font-size:.75rem" @click="action(d.id,'reject')">Reject</button>
                  <button v-if="d.status==='approved'" class="btn btn-sm" style="background:rgba(148,163,184,.15);color:#94a3b8;border:none;border-radius:6px;font-size:.75rem" @click="action(d.id,'close')">Close</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </app-layout>`,
    data() { return { drives: [], loading: true, filter: '', nav: adminNav() }; },
    methods: {
        statusBadge, fmtDate,
        async load() {
            this.loading = true;
            try { this.drives = await store.get('/api/admin/drives' + (this.filter ? `?status=${this.filter}` : '')); }
            catch (e) { store.error(e.message); } finally { this.loading = false; }
        },
        async action(id, act) {
            try { await store.put(`/api/admin/drives/${id}/approve`, { action: act }); store.success(`Drive ${act}d`); this.load(); }
            catch (e) { store.error(e.message); }
        }
    },
    mounted() { this.load(); }
};

// ── Admin Search ──────────────────────────────────────────────────────────────
const AdminSearch = {
    components: { AppLayout },
    template: `
  <app-layout :nav-items="nav" title="Search">
    <div class="ppa-card mb-4">
      <div class="d-flex gap-2">
        <input v-model="q" class="form-control" placeholder="Search students, companies, or drives…" @keyup.enter="search" />
        <select v-model="type" class="form-select" style="width:140px">
          <option value="all">All</option>
          <option value="student">Students</option>
          <option value="company">Companies</option>
          <option value="drive">Drives</option>
        </select>
        <button class="btn-primary-ppa px-4" @click="search" :disabled="loading">
          <i class="bi bi-search"></i>
        </button>
      </div>
    </div>
    <div v-if="results">
      <div v-if="results.students && results.students.length" class="ppa-card mb-3">
        <h6 class="fw-bold mb-3"><i class="bi bi-people me-2" style="color:var(--primary)"></i>Students ({{results.students.length}})</h6>
        <div class="row g-2">
          <div class="col-md-6" v-for="s in results.students" :key="s.id">
            <div style="background:var(--bg-surface);border-radius:10px;padding:1rem;border:1px solid var(--border)">
              <div style="font-weight:600">{{s.name}}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">{{s.email}} · {{s.branch}} · CGPA {{s.cgpa}}</div>
              <span :class="s.is_blacklisted?'badge-ppa badge-rejected':'badge-ppa badge-approved'" style="font-size:.7rem;margin-top:.3rem;display:inline-block">{{s.is_blacklisted?'Blacklisted':'Active'}}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="results.companies && results.companies.length" class="ppa-card mb-3">
        <h6 class="fw-bold mb-3"><i class="bi bi-building me-2" style="color:var(--secondary)"></i>Companies ({{results.companies.length}})</h6>
        <div class="row g-2">
          <div class="col-md-6" v-for="c in results.companies" :key="c.id">
            <div style="background:var(--bg-surface);border-radius:10px;padding:1rem;border:1px solid var(--border)">
              <div style="font-weight:600">{{c.company_name}}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">{{c.email}} · {{c.industry||'N/A'}}</div>
              <span :class="statusBadge(c.approval_status)" class="badge-ppa" style="font-size:.7rem;margin-top:.3rem">{{c.approval_status}}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="results.drives && results.drives.length" class="ppa-card">
        <h6 class="fw-bold mb-3"><i class="bi bi-briefcase me-2" style="color:var(--success)"></i>Placement Drives ({{results.drives.length}})</h6>
        <div class="row g-2">
          <div class="col-md-6" v-for="d in results.drives" :key="d.id">
            <div style="background:var(--bg-surface);border-radius:10px;padding:1rem;border:1px solid var(--border)">
              <div style="font-weight:600">{{d.job_title}}</div>
              <div style="font-size:.8rem;color:var(--text-muted)">{{d.company_name}} · {{d.location||'N/A'}}</div>
              <span :class="statusBadge(d.status)" class="badge-ppa" style="font-size:.7rem;margin-top:.3rem">{{d.status}}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="searched && !results.students?.length && !results.companies?.length && !results.drives?.length" class="text-center py-5" style="color:var(--text-muted)">
        <i class="bi bi-search" style="font-size:2rem;display:block;margin-bottom:.5rem"></i>No results found
      </div>
    </div>
  </app-layout>`,
    data() { return { q: '', type: 'all', results: null, loading: false, searched: false, nav: adminNav() }; },
    methods: {
        statusBadge,
        async search() {
            if (!this.q.trim()) return;
            this.loading = true; this.searched = true;
            try { this.results = await store.get(`/api/admin/search?q=${encodeURIComponent(this.q)}&type=${this.type}`); }
            catch (e) { store.error(e.message); } finally { this.loading = false; }
        }
    }
};

// ── Admin All Applications ────────────────────────────────────────────────────
const AdminApplications = {
    components: { AppLayout },
    template: `
  <app-layout :nav-items="nav" title="All Applications">
    <div class="d-flex gap-2 mb-3">
      <select v-model="filter" class="form-select form-select-sm" style="width:150px" @change="load">
        <option value="">All Status</option>
        <option value="applied">Applied</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="selected">Selected</option>
        <option value="rejected">Rejected</option>
      </select>
      <span class="badge-ppa badge-approved align-self-center">{{apps.length}} applications</span>
    </div>
    <div class="ppa-card">
      <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
      <div v-else class="table-responsive">
        <table class="ppa-table">
          <thead><tr><th>Student</th><th>Branch/CGPA</th><th>Job Title</th><th>Company</th><th>Applied</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-if="!apps.length"><td colspan="6" class="text-center py-4" style="color:var(--text-muted)">No applications</td></tr>
            <tr v-for="a in apps" :key="a.id">
              <td style="font-weight:600">{{a.student_name}}</td>
              <td style="font-size:.82rem"><span class="badge-ppa badge-applied">{{a.student_branch||'—'}}</span> <span style="color:var(--primary);font-weight:600">{{a.student_cgpa}}</span></td>
              <td style="font-weight:600;font-size:.9rem">{{a.job_title}}</td>
              <td style="color:var(--secondary);font-size:.85rem">{{a.company_name}}</td>
              <td style="font-size:.82rem;color:var(--text-muted)">{{fmtDate(a.applied_at)}}</td>
              <td><span :class="statusBadge(a.status)" class="badge-ppa">{{a.status}}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </app-layout>`,
    data() { return { apps: [], loading: true, filter: '', nav: adminNav() }; },
    methods: {
        statusBadge, fmtDate,
        async load() {
            this.loading = true;
            try { this.apps = await store.get('/api/admin/applications' + (this.filter ? `?status=${this.filter}` : '')); }
            catch (e) { store.error(e.message); } finally { this.loading = false; }
        }
    },
    mounted() { this.load(); }
};

// ── Admin Background Jobs ─────────────────────────────────────────────────────
const AdminJobs = {
    components: { AppLayout },
    template: `
  <app-layout :nav-items="nav" title="Background Jobs">
    <div class="ppa-alert ppa-alert-info mb-4">
      <i class="bi bi-info-circle me-2"></i>
      Run batch jobs manually for demo. In production these run automatically via Celery Beat.
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-4" v-for="job in jobs" :key="job.key">
        <div class="ppa-card">
          <div class="d-flex align-items-start gap-3">
            <div class="stat-icon" :style="{background:job.bg}"><i :class="'bi bi-'+job.icon" :style="{color:job.color}"></i></div>
            <div class="flex-fill">
              <div style="font-weight:700;font-size:.95rem">{{job.title}}</div>
              <div style="font-size:.8rem;color:var(--text-muted);margin:.3rem 0">{{job.desc}}</div>
              <div style="font-size:.75rem;color:var(--text-muted)"><i class="bi bi-clock me-1"></i>{{job.schedule}}</div>
            </div>
          </div>
          <button class="btn-primary-ppa w-100 mt-3" style="font-size:.85rem"
            :disabled="running===job.key" @click="trigger(job.key)">
            <span v-if="running===job.key" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-play-fill me-1"></i> Run Now
          </button>
          <div v-if="results[job.key]" class="ppa-alert ppa-alert-success mt-2" style="font-size:.78rem">
            <i class="bi bi-check-circle me-1"></i>{{results[job.key]}}
          </div>
        </div>
      </div>
    </div>
    <div class="ppa-card">
      <h6 class="fw-bold mb-3"><i class="bi bi-file-earmark-csv me-2" style="color:var(--success)"></i>Exported CSV Files</h6>
      <div v-if="!exports.length" style="color:var(--text-muted);font-size:.88rem">No exports yet.</div>
      <div v-for="f in exports" :key="f" class="d-flex align-items-center justify-content-between py-2 border-bottom" style="border-color:var(--border)!important">
        <div style="font-size:.85rem"><i class="bi bi-file-earmark-spreadsheet me-2" style="color:var(--success)"></i>{{f}}</div>
      </div>
    </div>
  </app-layout>`,
    data() {
        return {
            running: null, results: {}, exports: [], nav: adminNav(),
            jobs: [
                { key: 'daily_reminders', title: 'Daily Deadline Reminders', desc: 'Sends email + G-Chat notifications to students about upcoming drives.', schedule: 'Daily at 08:00 AM', icon: 'bell-fill', bg: 'rgba(99,102,241,.15)', color: 'var(--primary)' },
                { key: 'monthly_report', title: 'Monthly Activity Report', desc: 'Generates HTML report and emails to admin on 1st of every month.', schedule: '1st of each month', icon: 'bar-chart-fill', bg: 'rgba(6,182,212,.15)', color: 'var(--secondary)' },
                { key: 'close_expired', title: 'Close Expired Drives', desc: 'Automatically closes placement drives whose deadline has passed.', schedule: 'Daily at midnight', icon: 'calendar-x-fill', bg: 'rgba(239,68,68,.15)', color: 'var(--danger)' },
            ]
        };
    },
    methods: {
        async trigger(key) {
            this.running = key;
            try {
                const res = await store.post('/api/admin/jobs/trigger', { job: key });
                this.results[key] = res.message || 'Job triggered successfully';
                store.success(res.message || 'Job triggered!');
            } catch (e) { store.error(e.message); }
            finally { this.running = null; this.loadExports(); }
        },
        async loadExports() {
            try { this.exports = await store.get('/api/admin/exports'); }
            catch (e) { }
        }
    },
    mounted() { this.loadExports(); }
};

