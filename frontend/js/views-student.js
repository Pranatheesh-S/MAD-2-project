// ── Student Nav ───────────────────────────────────────────────────────────────
function studentNav() {
  return [
    { label: 'Overview', items: [{ route: 'student-dashboard', icon: 'speedometer2', label: 'Dashboard' }] },
    {
      label: 'Placement', items: [
        { route: 'student-drives', icon: 'briefcase', label: 'Browse Drives' },
        { route: 'student-applications', icon: 'file-earmark-check', label: 'My Applications' },
        { route: 'student-history', icon: 'clock-history', label: 'Placement History' },
        { route: 'student-profile', icon: 'person-circle', label: 'My Profile' },
      ]
    },
  ];
}

// ── Student Dashboard ─────────────────────────────────────────────────────────
const StudentDashboard = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="Student Dashboard">
    <div v-if="profile && profile.is_blacklisted" class="ppa-alert ppa-alert-error mb-4">
      <i class="bi bi-exclamation-triangle-fill"></i>
      Your account has been <strong>blacklisted</strong>. Contact the placement cell.
    </div>
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-md-3" v-for="s in statCards" :key="s.label">
        <div class="stat-card">
          <div class="stat-icon" :style="{background:s.bg}"><i :class="'bi bi-'+s.icon" :style="{color:s.color}"></i></div>
          <div><div class="stat-value">{{s.value}}</div><div class="stat-label">{{s.label}}</div></div>
        </div>
      </div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-5">
        <div class="ppa-card h-100">
          <h6 class="fw-bold mb-3"><i class="bi bi-person-badge me-2" style="color:var(--primary)"></i>My Profile</h6>
          <div v-if="profile">
            <div style="text-align:center;padding:1rem">
              <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:inline-flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:.5rem">{{profile.name?profile.name[0].toUpperCase():'?'}}</div>
              <div style="font-weight:700;font-size:1.05rem">{{profile.name}}</div>
              <div style="font-size:.82rem;color:var(--text-muted)">{{profile.email}}</div>
            </div>
            <div style="background:var(--bg-surface);border-radius:10px;padding:.8rem;font-size:.85rem">
              <div class="d-flex justify-content-between mb-1"><span style="color:var(--text-muted)">Branch</span><span class="fw-600">{{profile.branch||'—'}}</span></div>
              <div class="d-flex justify-content-between mb-1"><span style="color:var(--text-muted)">CGPA</span><span style="color:var(--primary);font-weight:700">{{profile.cgpa}}</span></div>
              <div class="d-flex justify-content-between mb-1"><span style="color:var(--text-muted)">Year</span><span>Year {{profile.year}}</span></div>
            </div>
            <div class="d-flex gap-2 mt-3">
              <button class="btn-outline-ppa flex-fill" style="font-size:.82rem" @click="router.go('student-profile')"><i class="bi bi-pencil me-1"></i>Edit Profile</button>
              <button class="btn-outline-ppa flex-fill" style="font-size:.82rem" @click="exportCSV" :disabled="exporting">
                <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-download me-1"></i>Export CSV
              </button>
            </div>
            <div v-if="exportMsg" class="ppa-alert ppa-alert-success mt-2" style="font-size:.8rem"><i class="bi bi-check-circle"></i>{{exportMsg}}</div>
          </div>
        </div>
      </div>
      <div class="col-md-7">
        <div class="ppa-card h-100">
          <h6 class="fw-bold mb-3"><i class="bi bi-clock-history me-2" style="color:var(--secondary)"></i>Recent Applications</h6>
          <div v-if="!apps.length" style="color:var(--text-muted);font-size:.88rem">No applications yet. Browse drives below.</div>
          <div v-for="a in apps.slice(0,5)" :key="a.id" class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:var(--border)!important">
            <div>
              <div style="font-weight:600;font-size:.9rem">{{a.job_title}}</div>
              <div style="font-size:.78rem;color:var(--secondary)">{{a.company_name}} · {{fmtDate(a.applied_at)}}</div>
            </div>
            <span :class="statusBadge(a.status)" class="badge-ppa">{{a.status}}</span>
          </div>
          <button v-if="apps.length > 5" class="btn-outline-ppa w-100 mt-2" style="font-size:.82rem" @click="router.go('student-applications')">View all {{apps.length}} applications</button>
        </div>
      </div>
    </div>

    <!-- Approved Placement Drives with Search -->
    <div class="ppa-card mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h6 class="fw-bold mb-0"><i class="bi bi-briefcase me-2" style="color:var(--success)"></i>Approved Placement Drives</h6>
        <div class="d-flex gap-2" style="max-width:350px; flex:1">
          <input v-model="searchQ" class="form-control form-control-sm" placeholder="Search title, company…" @keyup.enter="loadDrives" />
          <button class="btn-primary-ppa px-3 py-1" @click="loadDrives"><i class="bi bi-search"></i></button>
        </div>
      </div>
      <div class="ppa-alert ppa-alert-info mb-3 py-2" style="font-size:.8rem; margin-bottom:1rem">
        <i class="bi bi-funnel me-1"></i> These drives are automatically filtered to match your eligibility (Branch, Year, CGPA).
      </div>
      <div v-if="loadingDrives" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
      <div v-else-if="!filteredDrives.length" class="text-center py-4" style="color:var(--text-muted)">
        <i class="bi bi-briefcase" style="font-size:2rem;display:block;margin-bottom:1rem;opacity:.3"></i>
        No eligible drives available right now.
      </div>
      <div v-else class="row g-3">
        <div class="col-md-6 col-lg-4" v-for="d in filteredDrives.slice(0, 6)" :key="d.id">
          <div class="drive-card">
            <div class="drive-company">{{d.company_name}}</div>
            <div class="drive-title">{{d.job_title}}</div>
            <div class="drive-meta mt-2">
              <div v-if="d.location"><i class="bi bi-geo-alt me-1"></i>{{d.location}}</div>
              <div v-if="d.package_lpa"><i class="bi bi-currency-rupee me-1"></i>{{d.package_lpa}} LPA</div>
              <div><i class="bi bi-calendar3 me-1"></i>Deadline: {{fmtDate(d.deadline)}}</div>
            </div>
            <button class="btn-primary-ppa w-100 mt-3" style="font-size:.8rem; padding:.4rem"
              :disabled="applying===d.id || appliedIds.has(d.id)"
              @click="apply(d.id)">
              <span v-if="applying===d.id" class="spinner-border spinner-border-sm me-2"></span>
              <span v-if="appliedIds.has(d.id)"><i class="bi bi-check-lg me-1"></i>Applied</span>
              <span v-else>Apply Now</span>
            </button>
          </div>
        </div>
      </div>
      <div v-if="drives.length > 6" class="text-center mt-3">
        <button class="btn-outline-ppa" style="font-size:.82rem" @click="router.go('student-drives')">View All {{drives.length}} Drives</button>
      </div>
    </div>
  </app-layout>`,
  data() { return { profile: null, apps: [], drives: [], loading: true, loadingDrives: true, exporting: false, exportMsg: '', searchQ: '', applying: null, nav: studentNav() }; },
  computed: {
    appliedIds() { return new Set(this.apps.map(a => a.drive_id)); },
    filteredDrives() {
      if (!this.searchQ) return this.drives;
      const q = this.searchQ.toLowerCase();
      return this.drives.filter(d => d.job_title.toLowerCase().includes(q) || d.company_name.toLowerCase().includes(q));
    },
    statCards() {
      const applied = this.apps.length;
      const shortlisted = this.apps.filter(a => a.status === 'shortlisted').length;
      const selected = this.apps.filter(a => a.status === 'selected').length;
      return [
        { label: 'Applied', value: applied, icon: 'send', bg: 'rgba(99,102,241,.15)', color: 'var(--primary)' },
        { label: 'Shortlisted', value: shortlisted, icon: 'star', bg: 'rgba(6,182,212,.15)', color: 'var(--secondary)' },
        { label: 'Selected', value: selected, icon: 'trophy', bg: 'rgba(16,185,129,.15)', color: 'var(--success)' },
        { label: 'CGPA', value: this.profile?.cgpa || '—', icon: 'bar-chart', bg: 'rgba(245,158,11,.15)', color: 'var(--warning)' },
      ];
    }
  },
  methods: {
    statusBadge, fmtDate,
    async load() {
      this.loading = true;
      try {
        [this.profile, this.apps] = await Promise.all([
          store.get('/api/student/profile'),
          store.get('/api/student/applications'),
        ]);
        await this.loadDrives();
      } catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    async loadDrives() {
      this.loadingDrives = true;
      try {
        this.drives = await store.get('/api/student/drives' + (this.searchQ ? `?q=${encodeURIComponent(this.searchQ)}` : ''));
      } catch (e) { } finally { this.loadingDrives = false; }
    },
    async apply(driveId) {
      this.applying = driveId;
      try {
        await store.post(`/api/student/apply/${driveId}`);
        store.success('Applied successfully! A confirmation email is being sent.');
        this.apps.unshift({ drive_id: driveId, status: 'applied', job_title: 'Updating...', company_name: 'Updating...' });
        this.load();
      } catch (e) { store.error(e.message); } finally { this.applying = null; }
    },
    async exportCSV() {
      this.exporting = true; this.exportMsg = '';
      try {
        const res = await store.post('/api/student/export');
        if (res.download_url) {
          window.location.href = res.download_url;
          this.exportMsg = `Export ready! Downloading...`;
        } else {
          this.exportMsg = res.message || 'Export triggered! You will be notified by email.';
        }
      } catch (e) { store.error(e.message); } finally { this.exporting = false; }
    }
  },
  mounted() { this.load(); }
};

// ── Student Drives ────────────────────────────────────────────────────────────
const StudentDrives = {
  components: { AppLayout },
  template: `
    <app-layout :nav-items="nav" title="Available Drives">
          <div class="ppa-card mb-3">
            <div class="d-flex gap-2">
              <input v-model="searchQ" class="form-control" placeholder="Search by title, company, location…" @keyup.enter="load" />
              <button class="btn-primary-ppa px-4" @click="load"><i class="bi bi-search"></i></button>
            <button v-if="searchQ" class="btn-outline-ppa" @click="searchQ='';load()"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>
    <div v-if="loading" class="text-center py-5"><div class="spinner-border" style="color:var(--primary)"></div></div>
    <div v-else>
      <div class="ppa-alert ppa-alert-info mb-3" style="font-size:.85rem">
        <i class="bi bi-funnel me-1"></i> Showing <strong>{{drives.length}}</strong> drives you are eligible for (branch, year, CGPA matched).
      </div>
      <div v-if="!drives.length" class="text-center py-5" style="color:var(--text-muted)">
        <i class="bi bi-briefcase" style="font-size:3rem;display:block;margin-bottom:1rem;opacity:.3"></i>
        No eligible drives found{{searchQ?' matching your search':''}}.
      </div>
      <div class="row g-3">
        <div class="col-md-6 col-lg-4" v-for="d in drives" :key="d.id">
          <div class="drive-card">
            <div class="drive-company">{{d.company_name}}</div>
            <div class="drive-title">{{d.job_title}}</div>
            <div class="drive-meta mt-2">
              <div v-if="d.location"><i class="bi bi-geo-alt me-1"></i>{{d.location}}</div>
              <div v-if="d.package_lpa"><i class="bi bi-currency-rupee me-1"></i>{{d.package_lpa}} LPA</div>
              <div><i class="bi bi-mortarboard me-1"></i>Min CGPA: {{d.eligibility_cgpa||'None'}}</div>
              <div v-if="d.eligibility_year"><i class="bi bi-person me-1"></i>Year {{d.eligibility_year}} only</div>
              <div><i class="bi bi-calendar3 me-1"></i>Deadline: {{fmtDate(d.deadline)}}</div>
              <div v-if="d.eligibility_branch && d.eligibility_branch!=='ALL'" style="font-size:.78rem"><i class="bi bi-building me-1"></i>{{d.eligibility_branch}}</div>
            </div>
            <div v-if="d.job_description" style="font-size:.8rem;color:var(--text-muted);margin-top:.75rem;line-height:1.5">{{d.job_description.slice(0,120)}}{{d.job_description.length>120?'…':''}}</div>
            <button class="btn-primary-ppa w-100 mt-3" style="font-size:.85rem"
              :disabled="applying===d.id || appliedIds.has(d.id)"
              @click="apply(d.id)">
              <span v-if="applying===d.id" class="spinner-border spinner-border-sm me-2"></span>
              <span v-if="appliedIds.has(d.id)"><i class="bi bi-check-lg me-1"></i>Applied</span>
              <span v-else>Apply Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </app-layout>`,
  data() { return { drives: [], myApps: [], loading: true, applying: null, searchQ: '', nav: studentNav() }; },
  computed: {
    appliedIds() { return new Set(this.myApps.map(a => a.drive_id)); }
  },
  methods: {
    fmtDate,
    async load() {
      this.loading = true;
      try {
        const url = '/api/student/drives' + (this.searchQ ? `?q=${encodeURIComponent(this.searchQ)}` : '');
        [this.drives, this.myApps] = await Promise.all([
          store.get(url),
          store.get('/api/student/applications')
        ]);
      } catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    async apply(driveId) {
      this.applying = driveId;
      try {
        await store.post(`/api/student/apply/${driveId}`);
        store.success('Applied successfully! A confirmation email is being sent.');
        this.myApps.push({ drive_id: driveId, status: 'applied' });
      } catch (e) { store.error(e.message); } finally { this.applying = null; }
    }
  },
  mounted() { this.load(); }
};

// ── Student Applications ──────────────────────────────────────────────────────
const StudentApplications = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="My Applications">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <span class="badge-ppa badge-approved me-2" style="font-size:.82rem">{{ apps.length }} total</span>
        <span class="badge-ppa badge-applied me-2" style="font-size:.82rem">{{ counts.applied }} applied</span>
        <span class="badge-ppa badge-shortlisted me-2" style="font-size:.82rem">{{ counts.shortlisted }} shortlisted</span>
        <span class="badge-ppa badge-selected" style="font-size:.82rem">{{ counts.selected }} selected</span>
      </div>
      <button class="btn-outline-ppa" style="font-size:.82rem" @click="exportCSV" :disabled="exporting">
      <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
      <i v-else class="bi bi-download me-1"></i> Export CSV
    </button>
    </div>
    <div v-if="loading" class="text-center py-5"><div class="spinner-border" style="color:var(--primary)"></div></div>
    <div v-else-if="!apps.length" class="text-center py-5" style="color:var(--text-muted)">
      <i class="bi bi-file-earmark-x" style="font-size:3rem;display:block;margin-bottom:1rem;opacity:.3"></i>
      No applications yet. <a href="#" @click.prevent="router.go('student-drives')" style="color:var(--primary)">Explore drives</a>
    </div>
  <div v-else class="row g-3">
    <div class="col-md-6 col-lg-4" v-for="a in apps" :key="a.id">
    <div class="ppa-card">
      <div class="d-flex justify-content-between mb-2">
        <span :class="statusBadge(a.status)" class="badge-ppa">{{ a.status }}</span>
      <span style="font-size:.75rem;color:var(--text-muted)">{{ fmtDate(a.applied_at)}}</span>
    </div>
    <div style="font-weight:700;font-size:1rem">{{ a.job_title }}</div>
    <div style="font-size:.82rem;color:var(--secondary);font-weight:600;margin-top:.2rem">{{ a.company_name }}</div>
    <div v-if="a.interview_date" class="mt-2" style="font-size:.82rem;background:rgba(99,102,241,.1);border-radius:8px;padding:.5rem .75rem;border:1px solid rgba(99,102,241,.2)">
      <i class="bi bi-calendar-event me-1" style="color:var(--primary)"></i>Interview: {{ fmtDate(a.interview_date)}}
    </div>
    <div v-if="a.notes" class="mt-2" style="font-size:.8rem;color:var(--text-muted)">📝 {{ a.notes }}</div>
  </div>
      </div>
    </div>
  </app-layout>`,
  data() { return { apps: [], loading: true, exporting: false, nav: studentNav() }; },
  computed: {
    counts() {
      return {
        applied: this.apps.filter(a => a.status === 'applied').length,
        shortlisted: this.apps.filter(a => a.status === 'shortlisted').length,
        selected: this.apps.filter(a => a.status === 'selected').length,
      };
    }
  },
  methods: {
    statusBadge, fmtDate,
    async load() {
      this.loading = true;
      try { this.apps = await store.get('/api/student/applications'); }
      catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    async exportCSV() {
      this.exporting = true;
      try {
        const res = await store.post('/api/student/export');
        if (res.download_url) window.location.href = res.download_url;
        else store.success(res.message || 'Export triggered! Check your email.');
      } catch (e) { store.error(e.message); } finally { this.exporting = false; }
    }
  },
  mounted() { this.load(); }
};

// ── Student Placement History ─────────────────────────────────────────────────
const StudentHistory = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="Placement History">
    <div v-if="loading" class="text-center py-5"><div class="spinner-border" style="color:var(--primary)"></div></div>
    <div v-else>
      <!-- Summary cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(99,102,241,.15)"><i class="bi bi-send" style="color:var(--primary)"></i></div>
            <div><div class="stat-value">{{summary.total_applied}}</div><div class="stat-label">Total Applied</div></div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(6,182,212,.15)"><i class="bi bi-star" style="color:var(--secondary)"></i></div>
            <div><div class="stat-value">{{summary.shortlisted}}</div><div class="stat-label">Shortlisted</div></div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(16,185,129,.15)"><i class="bi bi-trophy" style="color:var(--success)"></i></div>
            <div><div class="stat-value">{{summary.selected}}</div><div class="stat-label">Selected</div></div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(239,68,68,.15)"><i class="bi bi-x-circle" style="color:var(--danger)"></i></div>
            <div><div class="stat-value">{{summary.rejected}}</div><div class="stat-label">Rejected</div></div>
          </div>
        </div>
      </div>

      <!-- History Table -->
      <div class="ppa-card">
        <h6 class="fw-bold mb-3"><i class="bi bi-clock-history me-2" style="color:var(--primary)"></i>Complete Application History</h6>
        <div v-if="!history.length" style="color:var(--text-muted);font-size:.88rem">No history yet.</div>
        <div class="table-responsive">
          <table class="ppa-table">
            <thead><tr><th>Company</th><th>Job Title</th><th>Applied On</th><th>Interview</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td style="color:var(--secondary);font-weight:600;font-size:.88rem">{{h.company_name}}</td>
                <td style="font-weight:600;font-size:.9rem">{{h.job_title}}</td>
                <td style="font-size:.82rem;color:var(--text-muted)">{{fmtDate(h.applied_at)}}</td>
                <td style="font-size:.82rem">{{h.interview_date ? fmtDate(h.interview_date) : '—'}}</td>
                <td><span :class="statusBadge(h.status)" class="badge-ppa">{{h.status}}</span></td>
                <td style="font-size:.8rem;color:var(--text-muted)">{{h.notes||'—'}}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </app-layout>`,
  data() { return { history: [], summary: { total_applied: 0, shortlisted: 0, selected: 0, rejected: 0 }, loading: true, nav: studentNav() }; },
  methods: {
    statusBadge, fmtDate,
    async load() {
      this.loading = true;
      try {
        const res = await store.get('/api/student/history');
        this.history = res.history;
        this.summary = res.summary;
      } catch (e) { store.error(e.message); } finally { this.loading = false; }
    }
  },
  mounted() { this.load(); }
};

// ── Student Profile ───────────────────────────────────────────────────────────
const StudentProfile = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="My Profile">
    <div class="ppa-card" style="max-width:600px">
      <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
      <form v-else @submit.prevent="save">
        <div v-if="msg" class="ppa-alert ppa-alert-success mb-3"><i class="bi bi-check-circle"></i>{{msg}}</div>
        <div style="text-align:center;margin-bottom:1.5rem">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:inline-flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:#fff">{{form.name?form.name[0].toUpperCase():'?'}}</div>
          <div style="margin-top:.5rem;font-size:.8rem;color:var(--text-muted)">{{form.email}}</div>
        </div>
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label small text-muted">Full Name</label>
            <input v-model="form.name" class="form-control" required /></div>
          <div class="col-md-6"><label class="form-label small text-muted">Phone</label>
            <input v-model="form.phone" class="form-control" /></div>
          <div class="col-md-6"><label class="form-label small text-muted">Branch</label>
            <select v-model="form.branch" class="form-select">
              <option v-for="b in branches" :key="b">{{b}}</option>
            </select></div>
          <div class="col-md-3"><label class="form-label small text-muted">CGPA</label>
            <input v-model="form.cgpa" type="number" step="0.01" min="0" max="10" class="form-control" /></div>
          <div class="col-md-3"><label class="form-label small text-muted">Year</label>
            <select v-model="form.year" class="form-select">
              <option v-for="y in [1,2,3,4]" :key="y" :value="y">Year {{y}}</option>
            </select></div>
          <div class="col-12">
            <label class="form-label small text-muted">Resume Link <span style="color:var(--text-muted);font-size:.78rem">(Google Drive or any URL)</span></label>
            <div class="d-flex gap-2">
              <input v-model="form.resume_url" class="form-control" placeholder="https://drive.google.com/…" />
              <a v-if="form.resume_url" :href="form.resume_url" target="_blank" class="btn-outline-ppa" style="padding:.6rem .8rem;white-space:nowrap"><i class="bi bi-eye me-1"></i>View</a>
            </div>
          </div>
          <div class="col-12"><label class="form-label small text-muted">Skills</label>
    <textarea v-model="form.skills" class="form-control" rows="2" placeholder="Python, Django, React, SQL…"></textarea></div>
        </div>
  <button type="submit" class="btn-primary-ppa mt-4 px-4" :disabled="saving">
    <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>Save Profile
  </button>
      </form>
    </div>
  </app-layout>`,
  data() {
    return {
      form: {}, loading: true, saving: false, msg: '', nav: studentNav(),
      branches: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Chemical', 'Biotech', 'MBA', 'MCA']
    };
  },
  methods: {
    async load() {
      this.loading = true;
      try { this.form = await store.get('/api/student/profile'); }
      catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    async save() {
      this.saving = true; this.msg = '';
      try { await store.put('/api/student/profile', this.form); this.msg = 'Profile updated successfully!'; }
      catch (e) { store.error(e.message); } finally { this.saving = false; }
    }
  },
  mounted() { this.load(); }
};
