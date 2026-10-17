const API_BASE = '/api';

const getToken = () => localStorage.getItem('token');
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const saveAuthData = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const redirectToLogin = () => {
  clearAuthData();
  window.location.href = 'login.html';
};

const redirectByRole = (role) => {
  if (role === 'admin') {
    window.location.href = 'admin-dashboard.html';
  } else {
    window.location.href = 'student-dashboard.html';
  }
};

// Escapes text before it is placed inside an innerHTML template, so course or user data can't inject markup.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Parses "HH:MM" into minutes from midnight, or null if missing/invalid.
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const debounce = (fn, delay = 250) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const createToastContainer = () => {
  if (document.getElementById('toastContainer')) {
    return document.getElementById('toastContainer');
  }

  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
};

const showToast = (message, type = 'success', duration = 4500) => {
  const toastContainer = createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const text = document.createElement('span');
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '×';
  close.addEventListener('click', () => toast.remove());

  toast.append(text, close);
  toastContainer.appendChild(toast);
  window.setTimeout(() => toast.remove(), duration);
};

const apiFetch = async (url, options = {}) => {
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Only an authenticated request means the session expired; a 401 from the login form is a wrong password.
    if (response.status === 401 && headers.Authorization) {
      showToast('Session expired. Please log in again.', 'warning');
      setTimeout(() => redirectToLogin(), 800);
    }
    throw new Error(data.message || response.statusText || 'Request failed');
  }

  return data;
};

const authFetch = async (url, options = {}) => {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    throw new Error('Authentication required.');
  }

  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return apiFetch(url, options);
};

// Opens a modal and resolves with `onSubmit(form)`'s result, or null if cancelled (button, backdrop or Escape).
const openModal = (innerHtml, onSubmit) => {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = innerHtml;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const onKey = (event) => {
      if (event.key === 'Escape') finish(null);
    };
    const finish = (value) => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      resolve(value);
    };

    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) finish(null);
    });
    modal.querySelector('.cancel-button').addEventListener('click', () => finish(null));
    modal.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      finish(onSubmit(event.target));
    });

    (modal.querySelector('input:not([disabled]), textarea, select') || modal.querySelector('.confirm-button')).focus();
  });
};

const showConfirm = async ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) => {
  const result = await openModal(
    `
      <h3>${escapeHtml(title)}</h3>
      <p class="modal-detail">${escapeHtml(message)}</p>
      <form class="modal-actions">
        <button type="button" class="btn btn-secondary cancel-button">${escapeHtml(cancelText)}</button>
        <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'} confirm-button">${escapeHtml(confirmText)}</button>
      </form>
    `,
    () => true
  );
  return Boolean(result);
};

const showFormModal = ({ title, fields, submitText = 'Save', cancelText = 'Cancel' }) => {
  const renderField = (field) => {
    const value = escapeHtml(field.value ?? '');
    const attrs = [
      `name="${escapeHtml(field.name)}"`,
      field.disabled ? 'disabled' : '',
      field.required ? 'required' : '',
      field.min !== undefined ? `min="${field.min}"` : '',
      field.max !== undefined ? `max="${field.max}"` : '',
    ].join(' ');

    let control;
    if (field.type === 'textarea') {
      control = `<textarea ${attrs} rows="4">${value}</textarea>`;
    } else if (field.type === 'select') {
      control = `<select ${attrs}>${field.options
        .map((opt) => `<option value="${escapeHtml(opt)}" ${opt === field.value ? 'selected' : ''}>${escapeHtml(opt)}</option>`)
        .join('')}</select>`;
    } else {
      control = `<input type="${field.type}" value="${value}" ${attrs} />`;
    }
    return `<label class="input-group"><span>${escapeHtml(field.label)}</span>${control}</label>`;
  };

  return openModal(
    `
      <h3>${escapeHtml(title)}</h3>
      <form class="modal-form">
        ${fields.map(renderField).join('')}
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary cancel-button">${escapeHtml(cancelText)}</button>
          <button type="submit" class="btn btn-primary confirm-button">${escapeHtml(submitText)}</button>
        </div>
      </form>
    `,
    (form) => {
      const formData = new FormData(form);
      const result = {};
      fields
        .filter((field) => !field.disabled)
        .forEach((field) => {
          result[field.name] = field.type === 'number' ? Number(formData.get(field.name)) : formData.get(field.name);
        });
      return result;
    }
  );
};

const logoutCurrentUser = () => {
  clearAuthData();
  window.location.href = 'login.html';
};

const setPageTitle = (title) => {
  const suffix = 'Northstar Portal';
  document.title = title ? `${title} | ${suffix}` : suffix;
};
