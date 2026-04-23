const LoginView = {
    template: `
  <div class="auth-wrapper">
    <div class="auth-card">
      <div class="text-center mb-4">
        <div class="auth-logo mb-2">PlacePro</div>
        <p style="color:var(--text-muted);font-size:.9rem">Sign in to your account</p>
      </div>
      <div v-if="error" class="ppa-alert ppa-alert-error mb-3"><i class="bi bi-exclamation-circle"></i>{{error}}</div>
      <form @submit.prevent="login">
        <div class="mb-3">
          <label class="form-label" style="color:var(--text-muted);font-size:.85rem">Email</label>
          <input v-model="form.email" type="email" class="form-control" placeholder="you@example.com" required />
        </div>
        <div class="mb-4">
          <label class="form-label" style="color:var(--text-muted);font-size:.85rem">Password</label>
          <input v-model="form.password" type="password" class="form-control" placeholder="••••••••" required />
        </div>
        <button type="submit" class="btn-primary-ppa w-100 py-2" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          Sign In
        </button>
      </form>
      <hr style="border-color:var(--border);margin:1.5rem 0">
      <p style="text-align:center;font-size:.85rem;color:var(--text-muted)">
        New company? <a href="#" @click.prevent="router.go('register',{tab:'company'})" style="color:var(--primary)">Register</a> &nbsp;|&nbsp;
        Student? <a href="#" @click.prevent="router.go('register',{tab:'student'})" style="color:var(--primary)">Register</a>
      </p>
      <div class="ppa-alert ppa-alert-info mt-3" style="font-size:.8rem">
        <i class="bi bi-info-circle"></i> Admin: admin@ppa.edu / admin123
      </div>
    </div>
  </div>`,
    data() { return { form: { email: '', password: '' }, error: '', loading: false }; },
    methods: {
        async login() {
            this.error = ''; this.loading = true;
            try {
                const res = await store.post('/api/auth/login', this.form);
                store.setSession(res.token, res.user);
                router.redirectByRole(res.user.role);
            } catch (e) { this.error = e.message; }
            finally { this.loading = false; }
        }
    }
};

const RegisterView = {
    template: `
  <div class="auth-wrapper">
    <div class="auth-card" style="max-width:520px">
      <div class="text-center mb-4">
        <div class="auth-logo mb-2">PlacePro</div>
        <p style="color:var(--text-muted);font-size:.9rem">Create your account</p>
      </div>
      <div class="d-flex gap-2 mb-4">
        <button @click="tab='student'" :class="['btn-outline-ppa flex-fill py-2', tab==='student'?'active-tab':'']">
          <i class="bi bi-mortarboard me-2"></i>Student
        </button>
        <button @click="tab='company'" :class="['btn-outline-ppa flex-fill py-2', tab==='company'?'active-tab':'']">
          <i class="bi bi-building me-2"></i>Company
        </button>
      </div>
      <div v-if="error" class="ppa-alert ppa-alert-error mb-3"><i class="bi bi-exclamation-circle"></i>{{error}}</div>

      <!-- Student Form -->
      <form v-if="tab==='student'" @submit.prevent="register('student')">
        <div class="row g-3">
          <div class="col-6"><label class="form-label small text-muted">Username</label>
            <input v-model="s.username" class="form-control" placeholder="Username" required />
          </div>
          <div class="col-6"><label class="form-label small text-muted">Full Name</label>
            <input v-model="s.name" class="form-control" placeholder="Full Name" required />
          </div>
          <div class="col-12"><label class="form-label small text-muted">Email</label>
            <input v-model="s.email" type="email" class="form-control" placeholder="Email" required />
          </div>
          <div class="col-12"><label class="form-label small text-muted">Password</label>
            <input v-model="s.password" type="password" class="form-control" placeholder="Password" required />
          </div>
          <div class="col-6"><label class="form-label small text-muted">Branch</label>
            <select v-model="s.branch" class="form-select" required>
              <option value="">Select</option>
              <option v-for="b in branches" :key="b">{{b}}</option>
            </select>
          </div>
          <div class="col-3"><label class="form-label small text-muted">CGPA</label>
            <input v-model="s.cgpa" type="number" step="0.01" min="0" max="10" class="form-control" placeholder="8.5" required />
          </div>
          <div class="col-3"><label class="form-label small text-muted">Year</label>
            <select v-model="s.year" class="form-select" required>
              <option v-for="y in [1,2,3,4]" :key="y">{{y}}</option>
            </select>
          </div>
          <div class="col-12"><label class="form-label small text-muted">Phone (optional)</label>
            <input v-model="s.phone" class="form-control" placeholder="+91 9876543210" />
          </div>
        </div>
        <button type="submit" class="btn-primary-ppa w-100 py-2 mt-4" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>Create Student Account
        </button>
      </form>

      <!-- Company Form -->
      <form v-else @submit.prevent="register('company')">
        <div class="row g-3">
          <div class="col-6"><label class="form-label small text-muted">Username</label>
            <input v-model="c.username" class="form-control" placeholder="Username" required />
          </div>
          <div class="col-6"><label class="form-label small text-muted">Company Name</label>
            <input v-model="c.company_name" class="form-control" placeholder="Acme Corp" required />
          </div>
          <div class="col-12"><label class="form-label small text-muted">Email</label>
            <input v-model="c.email" type="email" class="form-control" placeholder="hr@company.com" required />
          </div>
          <div class="col-12"><label class="form-label small text-muted">Password</label>
            <input v-model="c.password" type="password" class="form-control" placeholder="Password" required />
          </div>
          <div class="col-6"><label class="form-label small text-muted">HR Contact</label>
            <input v-model="c.hr_contact" class="form-control" placeholder="hr@company.com" required />
          </div>
          <div class="col-6"><label class="form-label small text-muted">Industry</label>
            <input v-model="c.industry" class="form-control" placeholder="IT / Finance" />
          </div>
          <div class="col-12"><label class="form-label small text-muted">Website</label>
            <input v-model="c.website" class="form-control" placeholder="https://company.com" />
          </div>
          <div class="col-12"><label class="form-label small text-muted">Description</label>
            <textarea v-model="c.description" class="form-control" rows="2" placeholder="About your company"></textarea>
          </div>
        </div>
        <button type="submit" class="btn-primary-ppa w-100 py-2 mt-4" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>Register Company
        </button>
      </form>

      <p class="text-center mt-3" style="font-size:.85rem;color:var(--text-muted)">
        Already have an account? <a href="#" @click.prevent="router.go('login')" style="color:var(--primary)">Sign In</a>
      </p>
    </div>
  </div>`,
    data() {
        return {
            tab: router.params.tab || 'student',
            error: '', loading: false,
            branches: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Chemical', 'Biotech', 'MBA', 'MCA'],
            s: { username: '', email: '', password: '', name: '', branch: '', cgpa: '', year: 1, phone: '' },
            c: { username: '', email: '', password: '', company_name: '', hr_contact: '', website: '', industry: '', description: '' }
        };
    },
    methods: {
        async register(type) {
            this.error = ''; this.loading = true;
            try {
                const payload = type === 'student' ? this.s : this.c;
                const res = await store.post(`/api/auth/register/${type}`, payload);
                store.setSession(res.token, res.user);
                store.success('Account created successfully!');
                router.redirectByRole(res.user.role);
            } catch (e) { this.error = e.message; }
            finally { this.loading = false; }
        }
    }
};
