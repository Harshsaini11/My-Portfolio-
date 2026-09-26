let globalProjects = [];
let globalInternships = [];
let globalExperience = [];
let globalServices = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch saved text content
    await loadCMSContent();

    // 2. Fetch Internships
    await loadInternships();

    // 3. Fetch Projects
    await loadProjects();

    // 4. Fetch Experience
    await loadExperience();
    if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
        setupExperienceModal();
    }

    // 5. Fetch Services
    await loadServices();
    if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
        setupServiceModal();
    }

    // 6. Admin Inline Edit Mode & Modals
    if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
        enableInlineEditing();
        setupProjectModal();
        setupInternshipModal();
        setupHeroImageModal();
        setupResumeModal();
    }

    // 7. Contact Form Setup
    setupContactForm();
});

// --- 1. Load CMS Content ---
async function loadCMSContent() {
    try {
        const res = await fetch('/api/content');
        const data = await res.json();
        
        Object.keys(data).forEach(key => {
            const el = document.querySelector(`[data-cms="${key}"]`);
            if (el) {
                if (el.tagName === 'IMG') {
                    if (data[key]) {
                        const timestamp = new Date().getTime();
                        const cleanUrl = data[key].split('?')[0]; 
                        el.src = `${cleanUrl}?t=${timestamp}`;
                    }
                } else {
                    el.innerHTML = data[key];
                }
            }

            if (key === 'resume_file_url' && data[key]) {
                updateResumeButtons(data[key]);
            }
        });
    } catch (err) {
        console.error('Error loading content:', err);
    }
}

// --- Hero Profile Image Modal Controls & Logic ---
function openHeroImgModal() {
    const currentSrc = document.getElementById('profile-img-preview')?.getAttribute('src') || '';
    document.getElementById('hero-img-url-input').value = currentSrc.split('?')[0];
    document.getElementById('edit-hero-img-modal').style.display = 'flex';
}

function closeHeroImgModal() {
    document.getElementById('edit-hero-img-modal').style.display = 'none';
}

function setupHeroImageModal() {
    const form = document.getElementById('modal-hero-img-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('hero-img-submit-btn');
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;

        const fileInput = document.getElementById('hero-img-file');
        const urlInput = document.getElementById('hero-img-url-input');

        let finalUrl = urlInput.value.trim();

        try {
            if (fileInput.files && fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);

                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();

                if (uploadRes.ok && uploadData.file_url) {
                    finalUrl = uploadData.file_url;
                } else {
                    alert('Upload failed: ' + (uploadData.message || 'Server Error'));
                    submitBtn.textContent = 'Update Profile Photo';
                    submitBtn.disabled = false;
                    return;
                }
            }

            if (!finalUrl) {
                alert('Kripya Image File upload karein ya Link enter karein!');
                submitBtn.textContent = 'Update Profile Photo';
                submitBtn.disabled = false;
                return;
            }

            const cleanPath = finalUrl.split('?')[0];
            const imgElement = document.getElementById('profile-img-preview');
            if (imgElement) {
                const timestamp = new Date().getTime();
                imgElement.src = `${cleanPath}?t=${timestamp}`;
            }

            const payload = { 'hero_profile_img': cleanPath };
            const res = await fetch('/api/content/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const resData = await res.json();

            if (res.ok) {
                closeHeroImgModal();
                fileInput.value = '';
                alert('Profile photo updated successfully!');
            } else {
                alert('Save failed: ' + (resData.message || 'Database error'));
            }
        } catch (err) {
            console.error('Error during photo update:', err);
            alert('An unexpected error occurred.');
        } finally {
            submitBtn.textContent = 'Update Profile Photo';
            submitBtn.disabled = false;
        }
    });
}

// --- 2. Enable Inline Editing ---
function enableInlineEditing() {
    const editableElements = document.querySelectorAll('[data-cms]');
    editableElements.forEach(el => el.setAttribute('contenteditable', 'true'));

    const saveBtn = document.getElementById('save-all-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const payload = {};
            document.querySelectorAll('[data-cms]').forEach(el => {
                const key = el.getAttribute('data-cms');
                if (el.tagName !== 'IMG') {
                    payload[key] = el.innerHTML.trim();
                }
            });

            saveBtn.textContent = 'Saving...';
            const res = await fetch('/api/content/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('All changes saved successfully!');
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
            } else {
                alert('Failed to save changes.');
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
            }
        });
    }

    const logoutBtn = document.getElementById('logout-admin-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }
}

// --- Load Internships ---
async function loadInternships() {
    const wrapper = document.getElementById('internships-wrapper');
    if (!wrapper) return;

    try {
        const res = await fetch('/api/internships');
        globalInternships = await res.json();

        let html = '';

        if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
            html += `
                <div class="project-card glass-card admin-add-card" onclick="openInternshipModalForAdd()">
                    <div class="add-icon-circle">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <h3>Add New Internship</h3>
                    <p>Click here to add an internship experience card</p>
                </div>
            `;
        }

        if (globalInternships.length === 0 && (typeof IS_ADMIN === 'undefined' || !IS_ADMIN)) {
            wrapper.innerHTML = '<p class="text-center-full">No internships added yet.</p>';
            return;
        }

        globalInternships.forEach(item => {
            let techHTML = '';
            if (Array.isArray(item.technologies)) {
                techHTML = item.technologies.map(t => `<span class="tag">${t.trim()}</span>`).join(' ');
            } else if (typeof item.technologies === 'string') {
                techHTML = item.technologies.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join(' ');
            }

            html += `
                <div class="project-card glass-card">
                    <div style="padding: 0.5rem 0;">
                        <h3 style="font-size: 1.8rem; font-weight: 700; text-align: left; margin-bottom: 0.5rem; margin-top:0px; color: var(--text); word-break: break-word;">
                            ${item.role}
                        </h3>
                        
                        <h4 style="color: #94A3B8; font-size: 0.95rem; font-weight: 500; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fa-solid fa-building" style="color: #2563EB;"></i> ${item.company}
                        </h4>

                        <div class="internship-duration-badge">
                            <i class="fa-regular fa-calendar-days"></i> ${item.duration}
                        </div>

                        <p style="margin-top: 0.8rem; line-height: 1.6;">${item.description}</p>
                        
                        <div class="tech" style="margin: 0.8rem 0;">${techHTML}</div>
                        
                        <div class="project-buttons" style="margin-top: 1rem; flex-wrap: wrap; gap: 8px;">
                            ${item.certificate_link && item.certificate_link !== '#' ? `
                                <a href="${item.certificate_link}" class="btn secondary" target="_blank">
                                    <i class="fa-solid fa-certificate"></i> View Certificate
                                </a>` : ''
                            }
                            
                            ${item.offer_letter_link && item.offer_letter_link !== '#' ? `
                                <a href="${item.offer_letter_link}" class="btn secondary" target="_blank" style="border-color: #38BDF8; color: #38BDF8;">
                                    <i class="fa-solid fa-file-contract"></i> View Offer Letter
                                </a>` : ''
                            }

                            ${typeof IS_ADMIN !== 'undefined' && IS_ADMIN ? `
                                <button onclick="editInternship('${item.id}')" class="btn-action-edit"><i class="fa-solid fa-pen"></i> Edit</button>
                                <button onclick="deleteInternship('${item.id}')" class="btn-action-delete"><i class="fa-solid fa-trash"></i> Delete</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        wrapper.innerHTML = html;

    } catch (err) {
        console.error('Error loading internships:', err);
    }
}

function editInternship(id) {
    const item = globalInternships.find(i => String(i.id) === String(id));
    if (!item) return;

    document.getElementById('i-id').value = item.id;
    document.getElementById('intern-modal-heading').textContent = 'Edit Internship';
    document.getElementById('i-role').value = item.role;
    document.getElementById('i-company').value = item.company;
    document.getElementById('i-duration').value = item.duration;
    document.getElementById('i-desc').value = item.description;
    document.getElementById('i-tech').value = Array.isArray(item.technologies) ? item.technologies.join(', ') : item.technologies;
    document.getElementById('i-cert').value = item.certificate_link || '#';
    document.getElementById('i-offer').value = item.offer_letter_link || '#';

    document.getElementById('add-internship-modal').style.display = 'flex';
}

function openResumeModal() {
    const currentHref = document.getElementById('resume-download-btn')?.getAttribute('href') || '';
    document.getElementById('resume-url-input').value = currentHref;
    document.getElementById('edit-resume-modal').style.display = 'flex';
}

function closeResumeModal() {
    document.getElementById('edit-resume-modal').style.display = 'none';
}

function setupResumeModal() {
    const form = document.getElementById('modal-resume-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('resume-submit-btn');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        const fileInput = document.getElementById('resume-file-input');
        const urlInput = document.getElementById('resume-url-input');

        let finalUrl = urlInput.value.trim();

        try {
            if (fileInput.files && fileInput.files.length > 0) {
                const uploadedPath = await uploadSingleFile(fileInput);
                if (uploadedPath) {
                    finalUrl = uploadedPath;
                } else {
                    alert('Resume PDF upload failed!');
                    submitBtn.textContent = 'Save Resume';
                    submitBtn.disabled = false;
                    return;
                }
            }

            if (!finalUrl) {
                alert('Kripya Resume File upload karein YA Link enter karein!');
                submitBtn.textContent = 'Save Resume';
                submitBtn.disabled = false;
                return;
            }

            const cleanPath = finalUrl.split('?')[0];
            updateResumeButtons(cleanPath);

            const payload = { 'resume_file_url': cleanPath };
            const res = await fetch('/api/content/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                closeResumeModal();
                fileInput.value = '';
                alert('Resume updated successfully!');
            } else {
                alert('Database me save nahi ho paya.');
            }
        } catch (err) {
            console.error('Error updating resume:', err);
            alert('An unexpected error occurred.');
        } finally {
            submitBtn.textContent = 'Save Resume';
            submitBtn.disabled = false;
        }
    });
}

function updateResumeButtons(path) {
    const viewBtn = document.getElementById('resume-view-btn');
    const downloadBtn = document.getElementById('resume-download-btn');
    if (!path) return;

    const cleanPath = path.trim().split('?')[0];

    if (viewBtn) {
        viewBtn.setAttribute('href', cleanPath);
        viewBtn.setAttribute('target', '_blank');
        viewBtn.setAttribute('rel', 'noopener noreferrer');
    }

    if (downloadBtn) {
        downloadBtn.setAttribute('href', cleanPath);
        if (cleanPath.startsWith('/static/')) {
            downloadBtn.setAttribute('download', 'Harsh_Kumar_Saini_Resume.pdf');
            downloadBtn.removeAttribute('target');
        } else {
            downloadBtn.removeAttribute('download');
            downloadBtn.setAttribute('target', '_blank');
        }
    }
}

async function uploadSingleFile(fileInput) {
    if (!fileInput || fileInput.files.length === 0) return null;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.file_url) {
            return data.file_url;
        }
    } catch (err) {
        console.error('Upload Error:', err);
    }
    return null;
}

function setupInternshipModal() {
    const modalForm = document.getElementById('modal-internship-form');
    if (!modalForm) return;

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const certFileInput = document.getElementById('i-cert-file');
        let certUrl = document.getElementById('i-cert').value.trim();

        const offerFileInput = document.getElementById('i-offer-file');
        let offerUrl = document.getElementById('i-offer').value.trim();

        if ((!certFileInput.files || certFileInput.files.length === 0) && !certUrl) {
            alert('Kripya Certificate ki File upload karein YA Link enter karein!');
            return;
        }

        const submitBtn = document.getElementById('i-submit-btn');
        submitBtn.textContent = 'Uploading & Saving...';

        if (certFileInput.files && certFileInput.files.length > 0) {
            const uploadedCert = await uploadSingleFile(certFileInput);
            if (uploadedCert) certUrl = uploadedCert;
            else {
                alert('Certificate upload fail ho gaya!');
                submitBtn.textContent = 'Save Internship';
                return;
            }
        }

        if (offerFileInput.files && offerFileInput.files.length > 0) {
            const uploadedOffer = await uploadSingleFile(offerFileInput);
            if (uploadedOffer) offerUrl = uploadedOffer;
            else {
                alert('Offer Letter upload fail ho gaya!');
                submitBtn.textContent = 'Save Internship';
                return;
            }
        }

        if (!offerUrl) offerUrl = '#';

        const internId = document.getElementById('i-id').value;
        const payload = {
            role: document.getElementById('i-role').value,
            company: document.getElementById('i-company').value,
            duration: document.getElementById('i-duration').value,
            description: document.getElementById('i-desc').value,
            technologies: document.getElementById('i-tech').value.split(',').map(t => t.trim()),
            certificate_link: certUrl,
            offer_letter_link: offerUrl
        };

        const isEdit = internId !== '';
        const url = isEdit ? `/api/internships/${internId}` : '/api/internships';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeInternshipModal();
            modalForm.reset();
            if (certFileInput) certFileInput.value = '';
            if (offerFileInput) offerFileInput.value = '';
            submitBtn.textContent = 'Save Internship';
            await loadInternships();
            alert('Internship details saved successfully!');
        } else {
            alert('Failed to save internship.');
            submitBtn.textContent = 'Save Internship';
        }
    });
}

// --- Load Projects ---
async function loadProjects() {
    const wrapper = document.getElementById('projects-wrapper');
    if (!wrapper) return;

    try {
        const res = await fetch('/api/projects');
        globalProjects = await res.json();

        let html = '';

        if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
            html += `
                <div class="project-card glass-card admin-add-card" onclick="openProjectModalForAdd()">
                    <div class="add-icon-circle">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <h3>Add New Project</h3>
                    <p>Click here to upload a new project card</p>
                </div>
            `;
        }

        if (globalProjects.length === 0 && (typeof IS_ADMIN === 'undefined' || !IS_ADMIN)) {
            wrapper.innerHTML = '<p class="text-center-full">No projects added yet.</p>';
            return;
        }

        globalProjects.forEach(p => {
            let techHTML = '';
            if (Array.isArray(p.tech_stack)) {
                techHTML = p.tech_stack.map(t => `<span class="tag">${t.trim()}</span>`).join(' ');
            } else if (typeof p.tech_stack === 'string') {
                techHTML = p.tech_stack.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join(' ');
            }

            html += `
                <div class="project-card glass-card">
                    <img src="${p.image_url}" alt="${p.title}" class="project-img">
                    <h3>${p.title}</h3>
                    <p>${p.description}</p>
                    <div class="tech">${techHTML}</div>
                    <div class="project-buttons">
                        <a href="${p.github_url}" class="btn" target="_blank"><i class="fa-brands fa-github"></i> GitHub</a>
                        <a href="${p.demo_url}" class="btn secondary" target="_blank">Live Demo</a>
                        ${typeof IS_ADMIN !== 'undefined' && IS_ADMIN ? `
                            <button onclick="editProject('${p.id}')" class="btn-action-edit"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button onclick="deleteProj('${p.id}')" class="btn-action-delete"><i class="fa-solid fa-trash"></i> Delete</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        wrapper.innerHTML = html;

    } catch (err) {
        console.error('Error loading projects:', err);
    }
}

function openProjectModalForAdd() {
    document.getElementById('m-id').value = '';
    document.getElementById('modal-heading').textContent = 'Add New Project';
    document.getElementById('modal-project-form').reset();
    document.getElementById('add-project-modal').style.display = 'flex';
}

function editProject(id) {
    const proj = globalProjects.find(p => String(p.id) === String(id));
    if (!proj) return;

    document.getElementById('m-id').value = proj.id;
    document.getElementById('modal-heading').textContent = 'Edit Project';
    document.getElementById('m-title').value = proj.title;
    document.getElementById('m-desc').value = proj.description;
    document.getElementById('m-tech').value = Array.isArray(proj.tech_stack) ? proj.tech_stack.join(', ') : proj.tech_stack;
    document.getElementById('m-img').value = proj.image_url;
    document.getElementById('m-github').value = proj.github_url;
    document.getElementById('m-demo').value = proj.demo_url;

    document.getElementById('add-project-modal').style.display = 'flex';
}

function closeProjectModal() {
    document.getElementById('add-project-modal').style.display = 'none';
}

function setupProjectModal() {
    const modalForm = document.getElementById('modal-project-form');
    if (!modalForm) return;

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('m-file');
        let imageUrl = document.getElementById('m-img').value.trim();

        if ((!fileInput.files || fileInput.files.length === 0) && !imageUrl) {
            alert('Kripya Image File upload karein YA Image Link enter karein!');
            return;
        }

        const submitBtn = document.getElementById('m-submit-btn');
        submitBtn.textContent = 'Saving...';

        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                
                if (uploadRes.ok && uploadData.file_url) {
                    imageUrl = uploadData.file_url;
                } else {
                    alert('Upload failed: ' + (uploadData.message || 'Server error'));
                    submitBtn.textContent = 'Save Project';
                    return;
                }
            } catch (err) {
                console.error('File upload failed:', err);
                alert('Server connection error during upload.');
                submitBtn.textContent = 'Save Project';
                return;
            }
        }

        const projId = document.getElementById('m-id').value;
        const payload = {
            title: document.getElementById('m-title').value,
            description: document.getElementById('m-desc').value,
            tech_stack: document.getElementById('m-tech').value.split(',').map(t => t.trim()),
            image_url: imageUrl,
            github_url: document.getElementById('m-github').value,
            demo_url: document.getElementById('m-demo').value || '#'
        };

        const isEdit = projId !== '';
        const url = isEdit ? `/api/projects/${projId}` : '/api/projects';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeProjectModal();
            modalForm.reset();
            if (fileInput) fileInput.value = '';
            submitBtn.textContent = 'Save Project';
            await loadProjects();
            alert('Project saved successfully!');
        } else {
            alert('Failed to save project.');
            submitBtn.textContent = 'Save Project';
        }
    });
}

window.deleteProj = async (id) => {
    if (confirm('Delete this project?')) {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        loadProjects();
    }
};

function openInternshipModalForAdd() {
    document.getElementById('i-id').value = '';
    document.getElementById('intern-modal-heading').textContent = 'Add New Internship';
    document.getElementById('modal-internship-form').reset();
    document.getElementById('add-internship-modal').style.display = 'flex';
}

function closeInternshipModal() {
    document.getElementById('add-internship-modal').style.display = 'none';
}

window.deleteInternship = async (id) => {
    if (confirm('Delete this internship?')) {
        await fetch(`/api/internships/${id}`, { method: 'DELETE' });
        loadInternships();
    }
};

// --- Experience Loader ---
async function loadExperience() {
    const wrapper = document.getElementById('experience-wrapper');
    if (!wrapper) return;

    try {
        const res = await fetch('/api/experience');
        globalExperience = await res.json();

        let html = '';

        if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
            html += `
                <div class="experience-card glass-card admin-add-card" onclick="openExperienceModalForAdd()">
                    <div class="add-icon-circle">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <h3>Add New Experience Card</h3>
                    <p style="font-size: 0.85rem; color: #94A3B8;">Heading, Subtitle, Bullet points, Tag add karein</p>
                </div>
            `;
        }

        if (globalExperience.length === 0 && (typeof IS_ADMIN === 'undefined' || !IS_ADMIN)) {
            wrapper.innerHTML = '<p class="text-center-full">No experience added yet.</p>';
            return;
        }

        globalExperience.forEach(item => {
            let pointsHTML = '';
            if (item.points && item.points.trim() !== '') {
                const pointsList = item.points.split('\n').filter(p => p.trim() !== '');
                pointsHTML = `<ul>${pointsList.map(p => `<li>${p.trim()}</li>`).join('')}</ul>`;
            }

            html += `
                <div class="experience-card glass-card">
                    <i class="fa-solid ${item.icon}"></i>
                    <h2>${item.title}</h2>
                    ${item.subtitle ? `<h4>${item.subtitle}</h4>` : ''}
                    ${item.description ? `<p>${item.description}</p>` : ''}
                    ${pointsHTML}
                    ${item.tag ? `<span>${item.tag}</span>` : ''}

                    ${typeof IS_ADMIN !== 'undefined' && IS_ADMIN ? `
                        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                            <button onclick="editExperience('${item.id}')" class="btn-action-edit"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button onclick="deleteExperience('${item.id}')" class="btn-action-delete"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        wrapper.innerHTML = html;

    } catch (err) {
        console.error('Error loading experience:', err);
    }
}

function openExperienceModalForAdd() {
    document.getElementById('exp-id').value = '';
    document.getElementById('exp-modal-heading').textContent = 'Add Experience Card';
    document.getElementById('modal-experience-form').reset();
    document.getElementById('add-experience-modal').style.display = 'flex';
}

function closeExperienceModal() {
    document.getElementById('add-experience-modal').style.display = 'none';
}

function editExperience(id) {
    const item = globalExperience.find(e => String(e.id) === String(id));
    if (!item) return;

    document.getElementById('exp-id').value = item.id;
    document.getElementById('exp-modal-heading').textContent = 'Edit Experience Card';
    document.getElementById('exp-icon').value = item.icon;
    document.getElementById('exp-title').value = item.title;
    document.getElementById('exp-subtitle').value = item.subtitle || '';
    document.getElementById('exp-desc').value = item.description || '';
    document.getElementById('exp-points').value = item.points || '';
    document.getElementById('exp-tag').value = item.tag || '';

    document.getElementById('add-experience-modal').style.display = 'flex';
}

function setupExperienceModal() {
    const modalForm = document.getElementById('modal-experience-form');
    if (!modalForm) return;

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const expId = document.getElementById('exp-id').value;
        const payload = {
            icon: document.getElementById('exp-icon').value,
            title: document.getElementById('exp-title').value,
            subtitle: document.getElementById('exp-subtitle').value,
            description: document.getElementById('exp-desc').value,
            points: document.getElementById('exp-points').value,
            tag: document.getElementById('exp-tag').value
        };

        const isEdit = expId !== '';
        const url = isEdit ? `/api/experience/${expId}` : '/api/experience';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeExperienceModal();
            modalForm.reset();
            await loadExperience();
            alert('Experience card saved successfully!');
        } else {
            alert('Failed to save experience card.');
        }
    });
}

// --- Services Loader ---
async function loadServices() {
    const wrapper = document.getElementById('services-wrapper');
    if (!wrapper) return;

    try {
        const res = await fetch('/api/services');
        globalServices = await res.json();

        let html = '';

        if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
            html += `
                <div class="service-card glass-card admin-add-card" onclick="openServiceModalForAdd()">
                    <div class="add-icon-circle">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <h3>Add New Service</h3>
                    <p style="font-size: 0.85rem; color: #94A3B8;">Click here to add a new service card</p>
                </div>
            `;
        }

        if (globalServices.length === 0 && (typeof IS_ADMIN === 'undefined' || !IS_ADMIN)) {
            wrapper.innerHTML = '<p class="text-center-full">No services added yet.</p>';
            return;
        }

        globalServices.forEach(item => {
            html += `
                <div class="service-card glass-card">
                    <i class="fa-solid ${item.icon}"></i>
                    <h3>${item.title}</h3>
                    <p style="text-align: left;">${item.description}</p>

                    ${typeof IS_ADMIN !== 'undefined' && IS_ADMIN ? `
                        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                            <button onclick="editService('${item.id}')" class="btn-action-edit"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button onclick="deleteService('${item.id}')" class="btn-action-delete"><i class="fa-solid fa-trash"></i> Delete</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        wrapper.innerHTML = html;

    } catch (err) {
        console.error('Error loading services:', err);
    }
}

function openServiceModalForAdd() {
    document.getElementById('srv-id').value = '';
    document.getElementById('srv-modal-heading').textContent = 'Add New Service';
    document.getElementById('modal-service-form').reset();
    document.getElementById('add-service-modal').style.display = 'flex';
}

function closeServiceModal() {
    document.getElementById('add-service-modal').style.display = 'none';
}

function editService(id) {
    const item = globalServices.find(s => String(s.id) === String(id));
    if (!item) return;

    document.getElementById('srv-id').value = item.id;
    document.getElementById('srv-modal-heading').textContent = 'Edit Service';
    document.getElementById('srv-icon').value = item.icon;
    document.getElementById('srv-title').value = item.title;
    document.getElementById('srv-desc').value = item.description;

    document.getElementById('add-service-modal').style.display = 'flex';
}

function setupServiceModal() {
    const modalForm = document.getElementById('modal-service-form');
    if (!modalForm) return;

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const srvId = document.getElementById('srv-id').value;
        const payload = {
            icon: document.getElementById('srv-icon').value,
            title: document.getElementById('srv-title').value,
            description: document.getElementById('srv-desc').value
        };

        const isEdit = srvId !== '';
        const url = isEdit ? `/api/services/${srvId}` : '/api/services';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeServiceModal();
            modalForm.reset();
            await loadServices();
            alert('Service card saved successfully!');
        } else {
            alert('Failed to save service card.');
        }
    });
}

window.deleteService = async (id) => {
    if (confirm('Delete this service card?')) {
        await fetch(`/api/services/${id}`, { method: 'DELETE' });
        loadServices();
    }
};

window.deleteExperience = async (id) => {
    if (confirm('Delete this experience card?')) {
        await fetch(`/api/experience/${id}`, { method: 'DELETE' });
        loadExperience();
    }
};

// --- Contact Form Submit Handler ---
function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';

        const payload = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Thank you! Your message has been sent successfully.');
                contactForm.reset();
            } else {
                alert('Failed to send message. Please try again later.');
            }
        } catch (err) {
            console.error('Contact Form Error:', err);
            alert('An error occurred. Please check your connection and try again.');
        } finally {
            submitBtn.textContent = originalText;
        }
    });
}

function openChangePasswordModal() {
    document.getElementById('update-password-modal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('update-password-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const updatePassForm = document.getElementById('update-password-form');
    if (updatePassForm) {
        updatePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const current_password = document.getElementById('current-pass').value;
            const new_password = document.getElementById('new-pass').value;

            const res = await fetch('/api/admin/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password, new_password })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                closeChangePasswordModal();
                updatePassForm.reset();
            } else {
                alert(data.message || 'Error updating password.');
            }
        });
    }
});

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}