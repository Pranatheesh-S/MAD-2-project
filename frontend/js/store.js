const API = '';
const store = {
  state: Vue.reactive({
    token: localStorage.getItem('ppa_token') || null,
    user: JSON.parse(localStorage.getItem('ppa_user') || 'null'),
    toasts: [],
    loading: false,
  }),

  get isLoggedIn() { return !!this.state.token; },
  get role() { return this.state.user?.role || null; },
  get user() { return this.state.user; },

  setSession(token, user) {
    this.state.token = token;
    this.state.user = user;
    localStorage.setItem('ppa_token', token);
    localStorage.setItem('ppa_user', JSON.stringify(user));
  },

  clearSession() {
    this.state.token = null;
    this.state.user = null;
    localStorage.removeItem('ppa_token');
    localStorage.removeItem('ppa_user');
  },

  async api(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.state.token) headers['Authorization'] = `Bearer ${this.state.token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  },

  get(path) { return this.api('GET', path); },
  post(path, body) { return this.api('POST', path, body); },
  put(path, body) { return this.api('PUT', path, body); },
  delete(path) { return this.api('DELETE', path); },

  toast(message, type = 'info') {
    const id = Date.now();
    this.state.toasts.push({ id, message, type });
    setTimeout(() => {
      const idx = this.state.toasts.findIndex(t => t.id === id);
      if (idx >= 0) this.state.toasts.splice(idx, 1);
    }, 4000);
  },
  success(msg) { this.toast(msg, 'success'); },
  error(msg) { this.toast(msg, 'error'); },
  info(msg) { this.toast(msg, 'info'); },
};
