const STORAGE_KEY = 'shirKurmaaComplaints';

const STATUS_FLOW = [
  'Submitted',
  'Acknowledged',
  'In Review',
  'Assigned',
  'In Progress',
  'Resolved'
];

const CATEGORY_KEYWORDS = {
  'Pothole': ['pothole', 'road crack', 'road damage', 'bump', 'asphalt', 'uneven road', 'pavement', 'broken road'],
  'Garbage Collection': ['garbage', 'trash', 'waste', 'litter', 'dump', 'overflowing bin', 'rubbish', 'sanitation'],
  'Water Leakage': ['water leakage', 'leak', 'pipe burst', 'burst pipe', 'water pipe', 'dripping water', 'flooding', 'water logging'],
  'Street Light': ['street light', 'lamp', 'light pole', 'dark street', 'electricity', 'power outage', 'lighting'],
  'Drainage': ['drain', 'drainage', 'clogged drain', 'blocked drain', 'storm water', 'waterlogging', 'open drainage'],
  'Sewage': ['sewage', 'manhole', 'sewer', 'smell', 'toilet overflow', 'odor', 'sewer blockage'],
  'Traffic Signal': ['traffic signal', 'traffic light', 'junction', 'signal', 'crossing', 'road sign'],
};

const form = document.getElementById('complaintForm');
const titleInput = document.getElementById('title');
const reporterInput = document.getElementById('reporter');
const locationInput = document.getElementById('location');
const descriptionInput = document.getElementById('description');
const categorySelect = document.getElementById('category');
const generatedComplaintInput = document.getElementById('generatedComplaint');
const generateBtn = document.getElementById('generateBtn');
const complaintList = document.getElementById('complaintList');
const complaintCount = document.getElementById('complaintCount');

function getComplaints() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('Unable to read complaints:', error);
    return [];
  }
}

function saveComplaints(complaints) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
}

function normalizeText(value = '') {
  return value.toLowerCase().trim();
}

function suggestCategory(title, description) {
  const text = normalizeText(`${title} ${description}`);

  let bestMatch = 'General Civic Issue';
  let bestScore = 0;

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    const score = keywords.reduce((total, keyword) => {
      return total + (text.includes(normalizeText(keyword)) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  });

  return bestMatch;
}

function generateComplaintText({ title, reporter, location, category, description }) {
  const cleanCategory = category || suggestCategory(title, description);

  return [
    `Complaint Title: ${title || 'Untitled complaint'}`,
    `Reporter: ${reporter || 'Anonymous citizen'}`,
    `Location: ${location || 'Not specified'}`,
    `Category: ${cleanCategory}`,
    `Issue: ${description || 'No issue details provided'}`,
    `Request: Please inspect this civic issue and facilitate timely action for the safety and well-being of the community.`
  ].join('\n');
}

function updateGeneratedComplaint() {
  const nextCategory = suggestCategory(titleInput.value, descriptionInput.value);
  categorySelect.value = nextCategory;

  const generatedText = generateComplaintText({
    title: titleInput.value,
    reporter: reporterInput.value,
    location: locationInput.value,
    category: nextCategory,
    description: descriptionInput.value
  });

  generatedComplaintInput.value = generatedText;
}

function getStatusClass(status) {
  const safeStatus = String(status || '').trim();
  const className = safeStatus.toLowerCase().replace(/\s+/g, '-');
  return `status-${className}`;
}

function moveToNextStatus(id) {
  const complaints = getComplaints();
  const targetIndex = complaints.findIndex((item) => item.id === id);

  if (targetIndex === -1) {
    return;
  }

  const currentStatus = complaints[targetIndex].status;
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const nextIndex = Math.min(currentIndex + 1, STATUS_FLOW.length - 1);

  complaints[targetIndex].status = STATUS_FLOW[nextIndex];
  saveComplaints(complaints);
  renderComplaints();
}

function deleteComplaint(id) {
  const complaints = getComplaints().filter((item) => item.id !== id);
  saveComplaints(complaints);
  renderComplaints();
}

function renderComplaints() {
  const complaints = getComplaints();
  complaintCount.textContent = `${complaints.length} complaint${complaints.length === 1 ? '' : 's'}`;

  if (complaints.length === 0) {
    complaintList.innerHTML = '<div class="empty-state">No complaints filed yet. Submit the first civic issue to get started.</div>';
    return;
  }

  complaintList.innerHTML = complaints
    .map((complaint) => {
      const statusIndex = STATUS_FLOW.indexOf(complaint.status);
      const nextAvailableStatus = STATUS_FLOW[Math.min(statusIndex + 1, STATUS_FLOW.length - 1)];

      return `
        <article class="complaint-item" data-id="${complaint.id}">
          <div class="complaint-top">
            <h3 class="complaint-title">${complaint.title}</h3>
            <span class="category-badge">${complaint.category}</span>
          </div>

          <div class="meta-line">
            <span>By ${complaint.reporter}</span>
            <span>📍 ${complaint.location}</span>
            <span>🗓 ${new Date(complaint.createdAt).toLocaleDateString()}</span>
          </div>

          <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span>

          <p class="complaint-desc">${complaint.description}</p>
          <p class="complaint-generated"><strong>Generated complaint:</strong><br>${complaint.generatedComplaint.replace(/\n/g, '<br>')}</p>

          <div class="complaint-actions">
            <select data-status-select="${complaint.id}" aria-label="Change complaint status">
              ${STATUS_FLOW.map((status) => `
                <option value="${status}" ${status === complaint.status ? 'selected' : ''}>${status}</option>
              `).join('')}
            </select>
            <button type="button" data-action="next-status" data-id="${complaint.id}">Move to ${nextAvailableStatus}</button>
            <button type="button" class="secondary" data-action="delete" data-id="${complaint.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function handleFormSubmit(event) {
  event.preventDefault();

  const complaint = {
    id: Date.now(),
    title: titleInput.value.trim(),
    reporter: reporterInput.value.trim(),
    location: locationInput.value.trim(),
    category: categorySelect.value,
    description: descriptionInput.value.trim(),
    status: 'Submitted',
    createdAt: new Date().toISOString(),
    generatedComplaint: generatedComplaintInput.value.trim() || generateComplaintText({
      title: titleInput.value,
      reporter: reporterInput.value,
      location: locationInput.value,
      category: categorySelect.value,
      description: descriptionInput.value
    })
  };

  const complaints = [complaint, ...getComplaints()];
  saveComplaints(complaints);
  form.reset();
  generatedComplaintInput.value = '';
  renderComplaints();
}

function handleComplaintActions(event) {
  const target = event.target;
  const action = target.dataset.action;
  const complaintId = Number(target.dataset.id);

  if (!action || Number.isNaN(complaintId)) {
    return;
  }

  if (action === 'delete') {
    deleteComplaint(complaintId);
    return;
  }

  if (action === 'next-status') {
    moveToNextStatus(complaintId);
  }
}

function handleStatusSelect(event) {
  const select = event.target.closest('[data-status-select]');
  if (!select) {
    return;
  }

  const complaintId = Number(select.dataset.statusSelect);
  const selectedStatus = select.value;
  const complaints = getComplaints();
  const complaintToUpdate = complaints.find((item) => item.id === complaintId);

  if (!complaintToUpdate) {
    return;
  }

  complaintToUpdate.status = selectedStatus;
  saveComplaints(complaints);
  renderComplaints();
}

form.addEventListener('submit', handleFormSubmit);
generateBtn.addEventListener('click', updateGeneratedComplaint);

titleInput.addEventListener('input', updateGeneratedComplaint);
reporterInput.addEventListener('input', updateGeneratedComplaint);
locationInput.addEventListener('input', updateGeneratedComplaint);
descriptionInput.addEventListener('input', updateGeneratedComplaint);
categorySelect.addEventListener('change', updateGeneratedComplaint);
complaintList.addEventListener('click', handleComplaintActions);
complaintList.addEventListener('change', handleStatusSelect);

renderComplaints();

if (titleInput.value || reporterInput.value || locationInput.value || descriptionInput.value) {
  updateGeneratedComplaint();
}

console.log('Shir Kurmaa smart city civic app initialized.');
