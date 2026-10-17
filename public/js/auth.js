const handleAuthSubmit = async (event, type) => {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const payload = {
    email: document.getElementById(type === 'register' ? 'registerEmail' : 'loginEmail').value.trim(),
    password: document.getElementById(type === 'register' ? 'registerPassword' : 'loginPassword').value,
  };

  if (type === 'register') {
    payload.name = document.getElementById('registerName').value.trim();
  }

  submitButton.disabled = true;
  submitButton.textContent = type === 'register' ? 'Creating account…' : 'Signing in…';

  try {
    const data = await apiFetch(`${API_BASE}/auth/${type}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveAuthData(data.token, data.user);
    showToast(type === 'register' ? 'Account created.' : 'Signed in.', 'success');
    redirectByRole(data.user.role);
  } catch (error) {
    showToast(error.message, 'error', 6000);
    submitButton.disabled = false;
    submitButton.textContent = type === 'register' ? 'Create account' : 'Login';
  }
};

document.getElementById('registerForm')?.addEventListener('submit', (event) => handleAuthSubmit(event, 'register'));
document.getElementById('loginForm')?.addEventListener('submit', (event) => handleAuthSubmit(event, 'login'));

const user = getUser();
if (user && getToken() && /(login|register)\.html$/.test(window.location.pathname)) {
  redirectByRole(user.role);
}
