// ── Company Nav helper ────────────────────────────────────────────────────────
function companyNav() {
  return [
    { label: 'Overview', items: [{ route: 'company-dashboard', icon: 'speedometer2', label: 'Dashboard' }] },
    {
      label: 'Manage', items: [
        { route: 'company-drives', icon: 'briefcase', label: 'My Drives' },
        { route: 'company-new-applications', icon: 'person-plus', label: 'New Apps' },
        { route: 'company-applications', icon: 'people', label: 'Approved Apps' },
        { route: 'company-profile', icon: 'building', label: 'Company Profile' },
      ]
    },
  ];
}

// ── Company Dashboard ─────────────────────────────────────────────────────────
const CompanyDashboard = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="Company Dashboard">
    <div v-if="!approved" class="ppa-alert ppa-alert-info mb-4">
      <i class="bi bi-clock-history"></i>
      Your company registration is <strong>pending admin approval</strong>. You can create drives once approved.
    </div>
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-lg-3" v-for="s in stats" :key="s.label">
        <div class="stat-card">
          <div class="stat-icon" :style="{background:s.bg}"><i :class="'bi bi-'+s.icon" :style="{color:s.color}"></i></div>
          <div><div class="stat-value">{{s.value}}</div><div class="stat-label">{{s.label}}</div></div>
        </div>
      </div>
    </div>
    <div class="row g-3">
      <div class="col-md-5">
        <div class="ppa-card h-100">
          <h6 class="fw-bold mb-3"><i class="bi bi-building me-2" style="color:var(--secondary)"></i>Company Details</h6>
          <div v-if="profile" style="background:var(--bg-surface);border-radius:10px;padding:1rem;font-size:14px;border:1px solid var(--border)">
            <div style="font-weight:700;font-size:1.1rem;margin-bottom:.5rem">{{profile.company_name}}</div>
            <div class="d-flex justify-content-between mb-1"><span style="color:var(--text-muted)">Industry</span><span class="fw-600">{{profile.industry||'—'}}</span></div>
            <div class="d-flex justify-content-between mb-1"><span style="color:var(--text-muted)">HR Contact</span><span>{{profile.email}}</span></div>
            <div class="d-flex justify-content-between mb-1"><span style="color:var(--text-muted)">Website</span><span style="color:var(--primary)">{{profile.website||'—'}}</span></div>
            <div class="d-flex gap-2 mt-4">
              <button class="btn-outline-ppa w-100" style="font-size:.82rem" @click="router.go('company-profile')">Edit Profile</button>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-7">
        <div class="ppa-card h-100">
          <h6 class="fw-bold mb-3"><i class="bi bi-briefcase me-2" style="color:var(--primary)"></i>Created Placement Drives</h6>
          <div v-if="loading" class="text-center py-3"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
          <div v-else-if="!drives.length" style="color:var(--text-muted);font-size:.88rem">No drives yet. <a href="#" @click.prevent="router.go('company-drives')" style="color:var(--primary)">Create one</a></div>
          <div v-for="d in drives.slice(0,5)" :key="d.id" class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:var(--border)!important">
            <div>
              <div style="font-weight:600;font-size:.9rem">{{d.job_title}}</div>
              <div style="font-size:.78rem;color:var(--text-muted)">Deadline: {{fmtDate(d.deadline)}} · <strong style="color:var(--primary)">{{d.application_count}} applicants</strong></div>
            </div>
            <span :class="statusBadge(d.status)" class="badge-ppa">{{d.status}}</span>
          </div>
        </div>
      </div>
    </div>
  </app-layout>`,
  data() { return { drives: [], loading: true, profile: null, nav: companyNav() }; },
  computed: {
    approved() { return this.profile?.approval_status === 'approved'; },
    stats() {
      const total = this.drives.length;
      const approved = this.drives.filter(d => d.status === 'approved').length;
      const totalApps = this.drives.reduce((a, d) => a + d.application_count, 0);
      return [
        { label: 'Total Drives', value: total, icon: 'briefcase-fill', bg: 'rgba(99,102,241,.15)', color: 'var(--primary)' },
        { label: 'Approved Drives', value: approved, icon: 'briefcase-check', bg: 'rgba(16,185,129,.15)', color: 'var(--success)' },
        { label: 'Total Applications', value: totalApps, icon: 'people-fill', bg: 'rgba(6,182,212,.15)', color: 'var(--secondary)' },
        { label: 'Profile Status', value: this.profile?.approval_status || '—', icon: 'building-check', bg: 'rgba(245,158,11,.15)', color: 'var(--warning)' },
      ];
    }
  },
  methods: {
    statusBadge, fmtDate,
    async load() {
      this.loading = true;
      try {
        [this.profile, this.drives] = await Promise.all([
          store.get('/api/company/profile'),
          store.get('/api/company/drives')
        ]);
      } catch (e) { store.error(e.message); } finally { this.loading = false; }
    }
  },
  mounted() { this.load(); }
};

// ── Company Drives ────────────────────────────────────────────────────────────
const CompanyDrives = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="My Placement Drives">
    <div class="d-flex justify-content-end mb-3">
      <button class="btn-primary-ppa" @click="showModal=true"><i class="bi bi-plus-lg me-2"></i>New Drive</button>
    </div>
    <div v-if="loading" class="text-center py-5"><div class="spinner-border" style="color:var(--primary)"></div></div>
    <div v-else class="row g-3">
      <div v-if="!drives.length" class="col-12 text-center py-5" style="color:var(--text-muted)">No drives yet. Create your first placement drive!</div>
      <div class="col-md-6 col-lg-4" v-for="d in drives" :key="d.id">
        <div class="drive-card">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span :class="statusBadge(d.status)" class="badge-ppa">{{d.status}}</span>
            <span style="font-size:.78rem;color:var(--text-muted)">{{d.application_count}} applied</span>
          </div>
          <div class="drive-title">{{d.job_title}}</div>
          <div class="drive-meta mt-2">
            <div><i class="bi bi-geo-alt me-1"></i>{{d.location||'Remote/Any'}}</div>
            <div><i class="bi bi-currency-rupee me-1"></i>{{d.package_lpa ? d.package_lpa+' LPA':' Not specified'}}</div>
            <div><i class="bi bi-calendar3 me-1"></i>Deadline: {{fmtDate(d.deadline)}}</div>
            <div><i class="bi bi-mortarboard me-1"></i>Min CGPA: {{d.eligibility_cgpa||'None'}}</div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn-outline-ppa flex-fill" style="font-size:.8rem;padding:.4rem" @click="viewApps(d)">
              <i class="bi bi-people me-1"></i>Applications
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Drive Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-box">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h5 class="fw-bold mb-0">Create New Drive</h5>
          <button class="btn-outline-ppa" style="padding:.3rem .7rem" @click="showModal=false"><i class="bi bi-x-lg"></i></button>
        </div>
        <div v-if="err" class="ppa-alert ppa-alert-error mb-3"><i class="bi bi-exclamation-circle"></i>{{err}}</div>
        <form @submit.prevent="create">
          <div class="row g-3">
            <div class="col-12"><label class="form-label small text-muted">Job Title *</label>
              <input v-model="form.job_title" class="form-control" placeholder="Software Engineer" required /></div>
            <div class="col-md-6"><label class="form-label small text-muted">Location</label>
              <input v-model="form.location" class="form-control" placeholder="Bangalore / Remote" /></div>
            <div class="col-md-6"><label class="form-label small text-muted">Package (LPA)</label>
              <input v-model="form.package_lpa" type="number" step="0.5" class="form-control" placeholder="12" /></div>
            <div class="col-md-4"><label class="form-label small text-muted">Min CGPA</label>
              <input v-model="form.eligibility_cgpa" type="number" step="0.1" min="0" max="10" class="form-control" placeholder="7.0" /></div>
            <div class="col-md-4"><label class="form-label" style="color: #fff; font-weight: 600; font-size: 0.88rem;">Year</label>
              <select v-model="form.eligibility_year" class="form-select" required>
                <option v-for="y in [1,2,3,4]" :key="y" :value="y">Year {{y}}</option>
              </select></div>
            <div class="col-md-4"><label class="form-label small text-muted">Deadline *</label>
              <input v-model="form.deadline" type="datetime-local" class="form-control" required /></div>
            <div class="col-12"><label class="form-label small text-muted">Eligible Branches (comma separated or ALL)</label>
              <input v-model="form.eligibility_branch" class="form-control" placeholder="CSE,IT,ECE or ALL" /></div>
            <div class="col-12"><label class="form-label small text-muted">Job Description</label>
              <textarea v-model="form.job_description" class="form-control" rows="3" placeholder="Describe the role…"></textarea></div>
          </div>
          <button type="submit" class="btn-primary-ppa w-100 py-2 mt-4" :disabled="creating">
            <span v-if="creating" class="spinner-border spinner-border-sm me-2"></span>Create Drive
          </button>
        </form>
      </div>
    </div>
  </app-layout>`,
  data() {
    return {
      drives: [], loading: true, showModal: false, creating: false, err: '', nav: companyNav(),
      form: {
        job_title: '', location: '', package_lpa: '', eligibility_cgpa: '', eligibility_year: 4,
        deadline: '', eligibility_branch: 'ALL', job_description: ''
      }
    };
  },
  methods: {
    statusBadge, fmtDate,
    async load() {
      this.loading = true;
      try { this.drives = await store.get('/api/company/drives'); }
      catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    async create() {
      this.err = ''; this.creating = true;
      try {
        const payload = { ...this.form };
        if (payload.deadline) payload.deadline = new Date(payload.deadline).toISOString();
        await store.post('/api/company/drives', payload);
        store.success('Drive created! Awaiting admin approval.');
        this.showModal = false;
        this.form = { job_title: '', location: '', package_lpa: '', eligibility_cgpa: '', eligibility_year: 4, deadline: '', eligibility_branch: 'ALL', job_description: '' };
        this.load();
      } catch (e) { this.err = e.message; } finally { this.creating = false; }
    },
    viewApps(d) { router.go('company-applications', { drive_id: d.id }); }
  },
  mounted() { this.load(); }
};


// ── Company New Applications ──────────────────────────────────────────────────
const CompanyNewApplications = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="New Applications">
    <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
    <div v-else class="ppa-card">
      <div v-if="!apps.length" style="color:var(--text-muted);font-size:.88rem">No new applications.</div>
      <div class="table-responsive" v-else>
        <table class="ppa-table">
          <thead><tr><th>Student</th><th>Branch</th><th>CGPA</th><th>Applied For</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr v-for="a in apps" :key="a.id">
              <td>
                <div style="font-weight:600">{{a.student_name}}</div>
              </td>
              <td><span class="badge-ppa badge-applied">{{a.student_branch||'—'}}</span></td>
              <td style="font-weight:600;color:var(--primary)">{{a.student_cgpa}}</td>
              <td style="font-size:.88rem">{{a.job_title}}</td>
              <td><span class="badge-ppa badge-applied mb-1 d-inline-block">{{a.status}}</span></td>
              <td><button class="btn-outline-ppa" style="font-size:.75rem;padding:.3rem .6rem" @click="openStatusModal(a)">Update</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Update Status Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-box" style="max-width:500px">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h6 class="fw-bold mb-0">Update Application: {{currentApp.student_name}}</h6>
          <button class="btn-outline-ppa" style="padding:.2rem .5rem" @click="showModal=false"><i class="bi bi-x-lg"></i></button>
        </div>
        <form @submit.prevent="saveStatus">
          <div class="mb-3">
            <label class="form-label" style="color: #fff; font-weight: 600; font-size: 0.88rem;">Status</label>
            <select v-model="statusForm.status" class="form-select">
              <option value="applied">Applied</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button type="submit" class="btn-primary-ppa w-100 py-2" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>Save Updates
          </button>
        </form>
      </div>
    </div>
  </app-layout>`,
  data() { return { apps: [], loading: true, nav: companyNav(), showModal: false, saving: false, currentApp: null, statusForm: { status: 'approved' } }; },
  methods: {
    statusBadge, fmtDate,
    async loadApps() {
      this.loading = true;
      try { this.apps = await store.get('/api/company/applications/new'); }
      catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    openStatusModal(app) { this.currentApp = app; this.statusForm = { status: 'approved' }; this.showModal = true; },
    async saveStatus() {
      this.saving = true;
      try {
        await store.put(`/api/company/applications/${this.currentApp.id}/status`, { status: this.statusForm.status, interview_date: null, notes: '' });
        store.success('Application updated successfully');
        this.showModal = false;
        this.loadApps();
      } catch (e) { store.error(e.message); } finally { this.saving = false; }
    }
  },
  mounted() { this.loadApps(); }
};

// ── Company Applications ──────────────────────────────────────────────────────
const CompanyApplications = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="Approved Applications">
    <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
    <div v-else class="ppa-card">
      <div v-if="!apps.length" style="color:var(--text-muted);font-size:.88rem">No approved applications yet.</div>
      <div class="table-responsive" v-else>
        <table class="ppa-table">
          <thead><tr><th>Student</th><th>Branch</th><th>CGPA</th><th>Applied For</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr v-for="a in apps" :key="a.id">
              <td>
                <div style="font-weight:600">{{a.student_name}}</div>
                <div style="font-size:.8rem;color:var(--text-muted)">
                   <a v-if="a.student_resume" :href="a.student_resume" target="_blank" style="text-decoration:none;color:var(--primary)"><i class="bi bi-file-earmark-person me-1"></i>Resume</a>
                </div>
              </td>
              <td><span class="badge-ppa badge-applied">{{a.student_branch||'—'}}</span></td>
              <td style="font-weight:600;color:var(--primary)">{{a.student_cgpa}}</td>
              <td style="font-size:.88rem">{{a.job_title}}</td>
              <td>
                <span :class="statusBadge(a.status)" class="badge-ppa mb-1 d-inline-block">{{a.status}}</span>
                <div v-if="a.interview_date" style="font-size:.75rem;color:var(--text-muted)"><i class="bi bi-calendar-event me-1"></i>{{fmtDate(a.interview_date)}}</div>
              </td>
              <td><button class="btn-outline-ppa" style="font-size:.75rem;padding:.3rem .6rem" @click="openStatusModal(a)">Update</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Update Status Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-box" style="max-width:500px">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h6 class="fw-bold mb-0">Update Application: {{currentApp.student_name}}</h6>
          <button class="btn-outline-ppa" style="padding:.2rem .5rem" @click="showModal=false"><i class="bi bi-x-lg"></i></button>
        </div>
        <form @submit.prevent="saveStatus">
          <div class="mb-3">
            <label class="form-label small text-muted">Status</label>
            <select v-model="statusForm.status" class="form-select">
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label small text-muted">Interview Date (Optional)</label>
            <input v-model="statusForm.interview_date" type="datetime-local" class="form-control" />
          </div>
          <div class="mb-4">
            <label class="form-label small text-muted">Notes / Feedback (Optional)</label>
            <textarea v-model="statusForm.notes" class="form-control" rows="2" placeholder="Interview link, feedback..."></textarea>
          </div>
          <button type="submit" class="btn-primary-ppa w-100 py-2" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>Save Updates
          </button>
        </form>
      </div>
    </div>
  </app-layout>`,
  data() { return { apps: [], loading: true, nav: companyNav(), showModal: false, saving: false, currentApp: null, statusForm: { status: 'approved', interview_date: '', notes: '' } }; },
  methods: {
    statusBadge, fmtDate,
    async loadApps() {
      this.loading = true;
      try { this.apps = await store.get('/api/company/applications/approved'); }
      catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    openStatusModal(app) { 
      this.currentApp = app; 
      let ivDate = '';
      if (app.interview_date) {
        const d = new Date(app.interview_date);
        if (!isNaN(d)) ivDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      this.statusForm = { status: app.status, interview_date: ivDate, notes: app.notes || '' }; 
      this.showModal = true; 
    },
    async saveStatus() {
      this.saving = true;
      try {
        const payload = { status: this.statusForm.status, notes: this.statusForm.notes };
        if (this.statusForm.interview_date) {
          payload.interview_date = new Date(this.statusForm.interview_date).toISOString();
        } else {
          payload.interview_date = null;
        }
        await store.put(`/api/company/applications/${this.currentApp.id}/status`, payload);
        store.success('Application updated successfully');
        this.showModal = false;
        this.loadApps();
      } catch (e) { store.error(e.message); } finally { this.saving = false; }
    }
  },
  mounted() { this.loadApps(); }
};

// ── Company Profile ───────────────────────────────────────────────────────────

const CompanyProfile = {
  components: { AppLayout },
  template: `
  <app-layout :nav-items="nav" title="Company Profile">
    <div class="ppa-card" style="max-width:600px">
      <div v-if="loading" class="text-center py-4"><div class="spinner-border spinner-border-sm" style="color:var(--primary)"></div></div>
      <form v-else @submit.prevent="save">
        <div v-if="msg" class="ppa-alert ppa-alert-success mb-3"><i class="bi bi-check-circle"></i>{{msg}}</div>
        <div class="row g-3">
          <div class="col-12">
            <div class="d-flex align-items-center gap-3 mb-3 p-3" style="background:var(--bg-surface);border-radius:12px;border:1px solid var(--border)">
              <div style="width:52px;height:52px;border-radius:12px;background:rgba(99,102,241,.2);display:flex;align-items:center;justify-content:center;font-size:1.5rem">🏢</div>
              <div>
                <div style="font-weight:700;font-size:1.1rem">{{form.company_name||'Your Company'}}</div>
                <span :class="statusBadge(form.approval_status)" class="badge-ppa" style="font-size:.7rem">{{form.approval_status}}</span>
              </div>
            </div>
          </div>
          <div class="col-12"><label class="form-label small text-muted">Company Name</label>
            <input v-model="form.company_name" class="form-control" required /></div>
          <div class="col-md-6"><label class="form-label small text-muted">HR Contact Email</label>
            <input v-model="form.hr_contact" class="form-control" /></div>
          <div class="col-md-6"><label class="form-label small text-muted">Industry</label>
            <input v-model="form.industry" class="form-control" /></div>
          <div class="col-12"><label class="form-label small text-muted">Website</label>
            <input v-model="form.website" class="form-control" /></div>
          <div class="col-12"><label class="form-label small text-muted">Description</label>
            <textarea v-model="form.description" class="form-control" rows="3"></textarea></div>
        </div>
        <button type="submit" class="btn-primary-ppa mt-4 px-4" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>Save Changes
        </button>
      </form>
    </div>
  </app-layout>`,
  data() { return { form: {}, loading: true, saving: false, msg: '', nav: companyNav() }; },
  methods: {
    statusBadge,
    async load() {
      this.loading = true;
      try { this.form = await store.get('/api/company/profile'); }
      catch (e) { store.error(e.message); } finally { this.loading = false; }
    },
    async save() {
      this.saving = true; this.msg = '';
      try { await store.put('/api/company/profile', this.form); this.msg = 'Profile updated successfully!'; }
      catch (e) { store.error(e.message); } finally { this.saving = false; }
    }
  },
  mounted() { this.load(); }
};
