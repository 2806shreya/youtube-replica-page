const subscribeButton = document.querySelector('.subscribe-btn');
const themeToggleButton = document.getElementById('theme-toggle');

if (subscribeButton) {
  subscribeButton.addEventListener('click', () => {
    alert('Thanks for subscribing to SRM Univ!');
  });
}

if (themeToggleButton) {
  themeToggleButton.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLightTheme = document.body.classList.contains('light-theme');
    themeToggleButton.textContent = isLightTheme ? '☀️' : '🌙';
    themeToggleButton.setAttribute('aria-pressed', String(isLightTheme));
  });
}
