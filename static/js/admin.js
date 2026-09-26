document.addEventListener('DOMContentLoaded', () => {
    // 1. Admin Login Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const errEl = document.getElementById('login-err') || document.getElementById('error-msg');

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: passwordInput.value.trim()
                })
            });

            if (res.ok) {
                window.location.href = '/admin';
            } else {
                const data = await res.json().catch(() => ({}));
                if (errEl) {
                    errEl.textContent = data.message || 'Invalid Username or Password';
                } else {
                    alert(data.message || 'Invalid Username or Password');
                }
            }
        });
    }

    // 2. Admin Logout Handler
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('logout-admin-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }

    // 3. Standalone Admin Dashboard Loaders (Agar Form Elements Page Par Maujood Hon)
    if (document.getElementById('project-form') || document.getElementById('projects-list')) {
        loadProjectsList();
    }
    if (document.getElementById('exp-form') || document.getElementById('exp-list')) {
        loadExperienceList();
    }

    // 4. Standalone Project Form Submit
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: document.getElementById('proj-title').value,
                description: document.getElementById('proj-desc').value,
                tech_stack: document.getElementById('proj-tech').value.split(',').map(t => t.trim()),
                image_url: document.getElementById('proj-img').value,
                github_url: document.getElementById('proj-github').value,
                demo_url: document.getElementById('proj-demo').value || '#'
            };

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                projectForm.reset();
                loadProjectsList();
                alert('Project added successfully!');
            } else {
                alert('Failed to add project.');
            }
        });
    }

    // 5. Standalone Experience Form Submit
    const expForm = document.getElementById('exp-form');
    if (expForm) {
        expForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                icon: document.getElementById('exp-icon') ? document.getElementById('exp-icon').value : 'fa-briefcase',
                title: document.getElementById('exp-title').value,
                subtitle: document.getElementById('exp-company') ? document.getElementById('exp-company').value : '',
                description: document.getElementById('exp-desc').value,
                points: document.getElementById('exp-period') ? document.getElementById('exp-period').value : '',
                tag: ''
            };

            const res = await fetch('/api/experience', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                expForm.reset();
                loadExperienceList();
                alert('Experience card added successfully!');
            } else {
                alert('Failed to add experience.');
            }
        });
    }
});

// MongoDB String IDs ke sath delete aur load functions
async function loadProjectsList() {
    const listEl = document.getElementById('projects-list');
    if (!listEl) return;

    const res = await fetch('/api/projects');
    const data = await res.json();
    listEl.innerHTML = data.map(p => `
        <div class="data-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <span><strong>${p.title}</strong></span>
            <button class="btn-del" onclick="deleteProj('${p.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">Delete</button>
        </div>
    `).join('');
}

async function loadExperienceList() {
    const listEl = document.getElementById('exp-list');
    if (!listEl) return;

    const res = await fetch('/api/experience');
    const data = await res.json();
    listEl.innerHTML = data.map(e => `
        <div class="data-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <span><strong>${e.title}</strong> ${e.subtitle ? `(${e.subtitle})` : ''}</span>
            <button class="btn-del" onclick="deleteExp('${e.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">Delete</button>
        </div>
    `).join('');
}

window.deleteProj = async (id) => {
    if (confirm('Delete this project?')) {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        loadProjectsList();
    }
};

window.deleteExp = async (id) => {
    if (confirm('Delete this experience?')) {
        await fetch(`/api/experience/${id}`, { method: 'DELETE' });
        loadExperienceList();
    }
};