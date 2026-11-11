// ==========================================
// ChaiUI Theme Controller (Dark default + Light)
// ==========================================
(function initTheme() {
    try {
        const savedTheme = localStorage.getItem('theme');
        // Default to dark as per ChaiUI specification
        const isDark = savedTheme ? savedTheme === 'dark' : true;
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }
    } catch (e) {
        document.documentElement.classList.add('dark');
    }
})();

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('theme', 'dark');
    }
    updateThemeToggleUI();
}

function updateThemeToggleUI() {
    const isDark = document.documentElement.classList.contains('dark');
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
        }
        const label = btn.querySelector('.theme-label');
        if (label) {
            label.textContent = isDark ? 'Light' : 'Dark';
        }
    });
}

window.addEventListener('DOMContentLoaded', updateThemeToggleUI);
