const API_BASE = '/api';

const getToken = () => localStorage.getItem('token');
const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');

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

const createToastContainer = () => {
  if (document.getElementById('toastContainer')) {
    return document.getElementById('toastContainer');
  }

  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
};

const showToast = (message, type = 'success', duration = 4500) => {
  const toastContainer = createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button type="button" aria-label="Dismiss toast">×</button>
  `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.remove();
  });

  toastContainer.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, duration);
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
    if (response.status === 401) {
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

const fetchWithAuth = authFetch;

const showConfirm = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <h3>${title}</h3>
      <p class="modal-detail">${message}</p>
      <div class="modal-actions">
        <button class="btn secondary cancel-button">${cancelText}</button>
        <button class="btn primary confirm-button">${confirmText}</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const cleanup = () => {
      backdrop.remove();
    };

    modal.querySelector('.cancel-button').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    modal.querySelector('.confirm-button').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
};

const showFormModal = ({ title, fields, submitText = 'Save', cancelText = 'Cancel' }) => {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <h3>${title}</h3>
      <form class="modal-form">
        ${fields
          .map((field) => {
            const value = field.value ?? '';
            if (field.type === 'textarea') {
              return `
                <label class="input-group">
                  <span>${field.label}</span>
                  <textarea name="${field.name}" ${field.disabled ? 'disabled' : ''} rows="4">${value}</textarea>
                </label>
              `;
            }
            return `
              <label class="input-group">
                <span>${field.label}</span>
                <input
                  name="${field.name}"
                  type="${field.type}"
                  value="${value}"
                  ${field.disabled ? 'disabled' : ''}
                />
              </label>
            `;
          })
          .join('')}
        <div class="modal-actions">
          <button type="button" class="btn secondary cancel-button">${cancelText}</button>
          <button type="submit" class="btn primary confirm-button">${submitText}</button>
        </div>
      </form>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const cleanup = () => {
      backdrop.remove();
    };

    modal.querySelector('.cancel-button').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    modal.querySelector('.modal-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const result = {};
      fields.forEach((field) => {
        result[field.name] = formData.get(field.name);
        if (field.type === 'number') {
          result[field.name] = Number(result[field.name]);
        }
      });
      cleanup();
      resolve(result);
    });
  });
};

const logoutCurrentUser = () => {
  clearAuthData();
  window.location.href = 'login.html';
};

const setPageTitle = (title) => {
  const suffix = 'Northstar Portal';
  document.title = title ? `${title} | ${suffix}` : suffix;
};
