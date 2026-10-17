const handleAuthSubmit = async (event, type) => {
  event.preventDefault();

  const payload = {
    email: document.getElementById(type === 'register' ? 'registerEmail' : 'loginEmail').value,
    password: document.getElementById(type === 'register' ? 'registerPassword' : 'loginPassword').value,
  };

  if (type === 'register') {
    payload.name = document.getElementById('registerName').value;
  }

  try {
    const data = await apiFetch(`${API_BASE}/auth/${type}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveAuthData(data.token, data.user);
    showToast('Successfully signed in.', 'success');
    redirectByRole(data.user.role);
  } catch (error) {
    showToast(error.message, 'error');
  }
};

document.getElementById('registerForm')?.addEventListener('submit', (event) => handleAuthSubmit(event, 'register'));
document.getElementById('loginForm')?.addEventListener('submit', (event) => handleAuthSubmit(event, 'login'));

const user = getUser();
if (user && window.location.pathname.includes('login.html')) {
  redirectByRole(user.role);
}
