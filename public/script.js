// Global variables
let facultyData = [];
let currentEditId = null;

// DOM Elements
const sections = document.querySelectorAll('.section');
const navButtons = document.querySelectorAll('.nav-btn');
const facultyForm = document.getElementById('facultyForm');
const loading = document.getElementById('loading');
const messageDiv = document.getElementById('message');

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Faculty Management System initialized');
    
    // Setup navigation
    setupNavigation();
    
    // Setup form submission
    setupFormSubmission();
    
    // Setup filters
    setupFilters();
    
    // Setup phone formatting and validation
    setupPhoneFormatting();
    
    // Load initial data
    await loadFacultyData();
    
    // Update dashboard
    updateDashboard();
    
    // Test backend connection
    testBackendConnection();
    
    console.log('✅ App initialization complete');
});

// CRITICAL: API Functions for Backend Communication
async function loadFacultyData() {
    try {
        showLoading(true);
        console.log('📡 Loading faculty data from backend...');
        
        const response = await fetch('/api/faculty');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            facultyData = result.data;
            console.log(`✅ Loaded ${facultyData.length} faculty records`);
            displayFacultyList();
            updateDashboard();
        } else {
            throw new Error(result.message || 'Failed to load faculty data');
        }
        
    } catch (error) {
        console.error('❌ Error loading faculty data:', error);
        showMessage('Error loading faculty data: ' + error.message, 'error');
        facultyData = [];
    } finally {
        showLoading(false);
    }
}

async function saveFaculty(facultyData) {
    try {
        showLoading(true);
        console.log('💾 Saving faculty data:', facultyData);
        
        const response = await fetch('/api/faculty', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(facultyData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            console.log('✅ Faculty saved successfully:', result.data);
            showMessage('Faculty added successfully!', 'success');
            
            // Reload data to get updated list
            await loadFacultyData();
            
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to save faculty');
        }
        
    } catch (error) {
        console.error('❌ Error saving faculty:', error);
        showMessage('Error saving faculty: ' + error.message, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deleteFaculty(id) {
    try {
        showLoading(true);
        console.log('🗑️ Deleting faculty ID:', id);
        
        const response = await fetch(`/api/faculty/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            console.log('✅ Faculty deleted successfully');
            showMessage('Faculty deleted successfully!', 'success');
            
            // Reload data
            await loadFacultyData();
        } else {
            throw new Error(result.message || 'Failed to delete faculty');
        }
        
    } catch (error) {
        console.error('❌ Error deleting faculty:', error);
        showMessage('Error deleting faculty: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// FIXED Form submission handler
function setupFormSubmission() {
    const facultyForm = document.getElementById('facultyForm');
    
    if (!facultyForm) {
        console.error('Faculty form not found!');
        return;
    }
    
    facultyForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // CRITICAL: Prevent page reload
        
        console.log('📝 Form submitted - processing data...');
        
        try {
            // Show loading
            showLoading(true);
            
            // Get form data using form elements directly
            const formElements = e.target.elements;
            
            // Extract data from form elements
            const data = {
                firstName: formElements.firstName?.value?.trim() || '',
                lastName: formElements.lastName?.value?.trim() || '',
                email: formElements.email?.value?.trim() || '',
                employeeId: formElements.employeeId?.value?.trim() || '',
                department: formElements.department?.value?.trim() || '',
                designation: formElements.designation?.value?.trim() || '',
                dateOfJoining: formElements.dateOfJoining?.value?.trim() || '',
                qualifications: formElements.qualifications?.value?.trim() || '',
                teachingExperience: formElements.teachingExperience?.value?.trim() || '0',
                industryExperience: formElements.industryExperience?.value?.trim() || '0',
                researchExperience: formElements.researchExperience?.value?.trim() || '0',
                journals: formElements.journals?.value?.trim() || '0',
                conferences: formElements.conferences?.value?.trim() || '0',
                books: formElements.books?.value?.trim() || '0',
                phone: formElements.phone?.value?.trim() || ''
            };
            
            console.log('📊 Raw form data:', data);
            
            // Validate required fields
            const requiredFields = {
                'firstName': 'First Name',
                'lastName': 'Last Name', 
                'email': 'Email',
                'employeeId': 'Employee ID',
                'department': 'Department',
                'designation': 'Designation',
                'dateOfJoining': 'Date of Joining',
                'qualifications': 'Qualifications',
                'teachingExperience': 'Teaching Experience',
                'phone': 'Phone Number'
            };
            
            // Check for missing fields
            const missingFields = [];
            for (let [field, label] of Object.entries(requiredFields)) {
                if (!data[field] || data[field] === '') {
                    missingFields.push(label);
                }
            }
            
            if (missingFields.length > 0) {
                throw new Error(`Please fill in the following required fields: ${missingFields.join(', ')}`);
            }
            
            // Validate and format phone number - FIXED VERSION
            let phoneNumber = data.phone.replace(/\D/g, ''); // Remove all non-digits
            
            if (phoneNumber.length === 10) {
                // Valid 10-digit number
                if (!/^[6-9]/.test(phoneNumber)) {
                    throw new Error('Phone number must start with 6, 7, 8, or 9');
                }
                phoneNumber = '+91-' + phoneNumber;
            } else if (phoneNumber.length === 12 && phoneNumber.startsWith('91')) {
                // 12-digit number starting with 91
                const mobileNumber = phoneNumber.substring(2);
                if (!/^[6-9]/.test(mobileNumber)) {
                    throw new Error('Phone number must start with 6, 7, 8, or 9');
                }
                phoneNumber = '+91-' + mobileNumber;
            } else {
                throw new Error('Phone number must be exactly 10 digits (e.g., 9988665544)');
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                throw new Error('Please enter a valid email address');
            }
            
            // Process qualifications
            const qualifications = data.qualifications
                .split(',')
                .map(q => q.trim())
                .filter(q => q.length > 0);
            
            if (qualifications.length === 0) {
                throw new Error('Please enter at least one qualification');
            }
            
            // Structure the data according to your backend schema
            const facultyData = {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email.toLowerCase(),
                employeeId: data.employeeId.toUpperCase(),
                department: data.department,
                designation: data.designation,
                dateOfJoining: data.dateOfJoining,
                qualifications: qualifications,
                experience: {
                    teaching: parseInt(data.teachingExperience) || 0,
                    industry: parseInt(data.industryExperience) || 0,
                    research: parseInt(data.researchExperience) || 0
                },
                publications: {
                    journals: parseInt(data.journals) || 0,
                    conferences: parseInt(data.conferences) || 0,
                    books: parseInt(data.books) || 0
                },
                phone: phoneNumber,
                status: 'Active'
            };
            
            console.log('📊 Structured faculty data for backend:', facultyData);
            
            // Check if we're in edit mode or add mode
            if (currentEditId) {
                // UPDATE existing faculty
                console.log('🔄 Updating existing faculty with ID:', currentEditId);
                
                const response = await fetch(`/api/faculty/${currentEditId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(facultyData)
                });
                
                console.log('🌐 Update response status:', response.status);
                
                const result = await response.json();
                console.log('📦 Backend update response:', result);
                
                if (!response.ok) {
                    if (response.status === 400 && result.error) {
                        if (Array.isArray(result.error)) {
                            throw new Error('Validation errors: ' + result.error.join(', '));
                        } else if (typeof result.error === 'string') {
                            throw new Error(result.error);
                        } else {
                            throw new Error(result.message || 'Validation failed');
                        }
                    } else {
                        throw new Error(result.message || `Server error: ${response.status}`);
                    }
                }
                
                if (result.success) {
                    console.log('✅ Faculty updated successfully:', result.data);
                    showMessage('✅ Faculty member updated successfully!', 'success');
                    
                    // Reset edit mode
                    currentEditId = null;
                    updateFormForEditMode(false);
                    
                    // Reset form
                    e.target.reset();
                    clearFormValidation();
                    
                    // Reload data
                    await loadFacultyData();
                    
                    // Switch to faculty list view
                    showSection('viewFaculty');
                    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                    document.getElementById('viewFacultyBtn').classList.add('active');
                    
                } else {
                    throw new Error(result.message || 'Failed to update faculty data');
                }
                
            } else {
                // ADD new faculty
                console.log('➕ Adding new faculty');
                
                const response = await fetch('/api/faculty', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(facultyData)
                });
                
                console.log('🌐 Response status:', response.status);
                
                const result = await response.json();
                console.log('📦 Backend response:', result);
                
                if (!response.ok) {
                    // Handle different types of errors
                    if (response.status === 400 && result.error) {
                        if (Array.isArray(result.error)) {
                            throw new Error('Validation errors: ' + result.error.join(', '));
                        } else if (typeof result.error === 'string') {
                            throw new Error(result.error);
                        } else {
                            throw new Error(result.message || 'Validation failed');
                        }
                    } else {
                        throw new Error(result.message || `Server error: ${response.status}`);
                    }
                }
                
                if (result.success) {
                    console.log('✅ Faculty saved successfully:', result.data);
                    showMessage('✅ Faculty member added successfully!', 'success');
                    
                    // Reset form
                    e.target.reset();
                    clearFormValidation();
                    
                    // Reload data to refresh the display
                    await loadFacultyData();
                    
                    // Switch to faculty list view to see the new entry
                    showSection('viewFaculty');
                    
                    // Update navigation
                    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                    document.getElementById('viewFacultyBtn').classList.add('active');
                    
                } else {
                    throw new Error(result.message || 'Failed to save faculty data');
                }
            }
            
        } catch (error) {
            console.error('❌ Form submission error:', error);
            showMessage('❌ Error: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    });
}

// Clear form validation styling
function clearFormValidation() {
    const inputs = document.querySelectorAll('#facultyForm input, #facultyForm select, #facultyForm textarea');
    inputs.forEach(input => {
        input.style.borderColor = '';
        input.setCustomValidity('');
    });
}

// FIXED Phone number formatting and validation
function setupPhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;
    
    // Remove any HTML5 validation pattern to avoid conflicts
    phoneInput.removeAttribute('pattern');
    phoneInput.removeAttribute('title');
    
    // Input event - format as user types
    phoneInput.addEventListener('input', function(e) {
        let value = this.value.replace(/\D/g, ''); // Remove all non-digits
        
        // Limit to 10 digits
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        
        this.value = value;
        
        // Clear custom validity while typing
        this.setCustomValidity('');
        this.style.borderColor = '';
    });
    
    // Blur event - validate and format
    phoneInput.addEventListener('blur', function() {
        const value = this.value.replace(/\D/g, '');
        
        if (value === '') {
            this.setCustomValidity('Phone number is required');
            this.style.borderColor = '#e53e3e';
            return;
        }
        
        if (value.length !== 10) {
            this.setCustomValidity('Phone number must be exactly 10 digits');
            this.style.borderColor = '#e53e3e';
            return;
        }
        
        if (!/^[6-9]/.test(value)) {
            this.setCustomValidity('Phone number must start with 6, 7, 8, or 9');
            this.style.borderColor = '#e53e3e';
            return;
        }
        
        // Valid phone number
        this.setCustomValidity('');
        this.style.borderColor = '#48bb78';
        
        // Format display (optional - you can remove this if you want just digits)
        // this.value = value.replace(/(\d{5})(\d{5})/, '$1-$2');
    });
    
    // Focus event - show just digits
    phoneInput.addEventListener('focus', function() {
        let value = this.value.replace(/\D/g, '');
        this.value = value;
    });
}

// Enhanced validation for other fields
function setupFormValidation() {
    const emailField = document.getElementById('email');
    const employeeIdField = document.getElementById('employeeId');
    
    if (emailField) {
        emailField.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.setCustomValidity('Please enter a valid email address');
                this.style.borderColor = '#e53e3e';
            } else {
                this.setCustomValidity('');
                this.style.borderColor = this.value ? '#48bb78' : '';
            }
        });
        
        emailField.addEventListener('input', function() {
            this.setCustomValidity('');
            this.style.borderColor = '';
        });
    }
    
    if (employeeIdField) {
        employeeIdField.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            this.setCustomValidity('');
            this.style.borderColor = '';
        });
        
        employeeIdField.addEventListener('blur', function() {
            if (this.value && this.value.trim().length < 3) {
                this.setCustomValidity('Employee ID must be at least 3 characters');
                this.style.borderColor = '#e53e3e';
            } else {
                this.setCustomValidity('');
                this.style.borderColor = this.value ? '#48bb78' : '';
            }
        });
    }
}

// Navigation setup
function setupNavigation() {
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.id.replace('Btn', '');
            showSection(targetSection);
            
            // Update active nav button
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

// Show specific section
function showSection(sectionName) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load section-specific data
    if (sectionName === 'viewFaculty') {
        displayFacultyList();
    } else if (sectionName === 'ratification') {
        loadRatificationData();
    } else if (sectionName === 'dashboard') {
        updateDashboard();
    }
}

// Display faculty list
function displayFacultyList() {
    const container = document.getElementById('facultyList');
    
    if (!facultyData || facultyData.length === 0) {
        container.innerHTML = '<div class="no-data">No faculty records found. Add some faculty members to get started.</div>';
        return;
    }
    
    const html = facultyData.map(faculty => `
        <div class="faculty-card" data-id="${faculty._id}">
            <div class="faculty-header">
                <h3>${faculty.firstName} ${faculty.lastName}</h3>
                <div class="faculty-actions">
                    <button onclick="editFaculty('${faculty._id}')" class="btn-edit">✏️ Edit</button>
                    <button onclick="deleteFacultyConfirm('${faculty._id}')" class="btn-delete">🗑️ Delete</button>
                </div>
            </div>
            <div class="faculty-details">
                <p><strong>Employee ID:</strong> ${faculty.employeeId}</p>
                <p><strong>Email:</strong> ${faculty.email}</p>
                <p><strong>Department:</strong> ${faculty.department}</p>
                <p><strong>Designation:</strong> ${faculty.designation}</p>
                <p><strong>Phone:</strong> ${faculty.phone}</p>
                <p><strong>Experience:</strong> ${faculty.experience?.teaching || 0} years teaching</p>
                <p><strong>Publications:</strong> ${(faculty.publications?.journals || 0) + (faculty.publications?.conferences || 0) + (faculty.publications?.books || 0)} total</p>
                <p><strong>Status:</strong> <span class="status ${faculty.status?.toLowerCase()}">${faculty.status || 'Active'}</span></p>
                <p><strong>Ratified:</strong> <span class="ratification ${faculty.ratificationStatus?.isRatified ? 'yes' : 'no'}">${faculty.ratificationStatus?.isRatified ? 'Yes' : 'No'}</span></p>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Update dashboard statistics
function updateDashboard() {
    if (!facultyData) return;
    
    const stats = {
        total: facultyData.length,
        professors: facultyData.filter(f => f.designation === 'Professor').length,
        associate: facultyData.filter(f => f.designation === 'Associate Professor').length,
        assistant: facultyData.filter(f => f.designation === 'Assistant Professor').length
    };
    
    document.getElementById('totalFaculty').textContent = stats.total;
    document.getElementById('professors').textContent = stats.professors;
    document.getElementById('associateProfessors').textContent = stats.associate;
    document.getElementById('assistantProfessors').textContent = stats.assistant;
    
    // Update department chart
    updateDepartmentChart();
}

// Update department distribution chart
function updateDepartmentChart() {
    const chartContainer = document.getElementById('departmentChart');
    
    if (!facultyData || facultyData.length === 0) {
        chartContainer.innerHTML = '<p>No data available</p>';
        return;
    }
    
    // Group by department
    const departmentStats = facultyData.reduce((acc, faculty) => {
        const dept = faculty.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
    }, {});
    
    // Create simple bar chart
    const maxCount = Math.max(...Object.values(departmentStats));
    const chartHtml = Object.entries(departmentStats).map(([dept, count]) => {
        const percentage = (count / maxCount) * 100;
        return `
            <div class="chart-bar">
                <div class="bar-label">${dept}</div>
                <div class="bar-container">
                    <div class="bar" style="width: ${percentage}%"></div>
                    <span class="bar-value">${count}</span>
                </div>
            </div>
        `;
    }).join('');
    
    chartContainer.innerHTML = chartHtml;
}

// Delete confirmation
function deleteFacultyConfirm(id) {
    if (confirm('Are you sure you want to delete this faculty member? This action cannot be undone.')) {
        deleteFaculty(id);
    }
}

// Setup filters
function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const departmentFilter = document.getElementById('departmentFilter');
    const designationFilter = document.getElementById('designationFilter');
    
    [searchInput, departmentFilter, designationFilter].forEach(element => {
        if (element) {
            element.addEventListener('input', filterFaculty);
        }
    });
}

// Filter faculty based on search and filters
function filterFaculty() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const departmentFilter = document.getElementById('departmentFilter')?.value || '';
    const designationFilter = document.getElementById('designationFilter')?.value || '';
    
    const filteredData = facultyData.filter(faculty => {
        const matchesSearch = searchTerm === '' || 
            faculty.firstName?.toLowerCase().includes(searchTerm) ||
            faculty.lastName?.toLowerCase().includes(searchTerm) ||
            faculty.email?.toLowerCase().includes(searchTerm) ||
            faculty.employeeId?.toLowerCase().includes(searchTerm);
        
        const matchesDepartment = departmentFilter === '' || faculty.department === departmentFilter;
        const matchesDesignation = designationFilter === '' || faculty.designation === designationFilter;
        
        return matchesSearch && matchesDepartment && matchesDesignation;
    });

    // Update display with filtered data
    const container = document.getElementById('facultyList');
    if (filteredData.length === 0) {
        container.innerHTML = '<div class="no-data">No faculty members match your search criteria.</div>';
    } else {
        const html = filteredData.map(faculty => `
            <div class="faculty-card" data-id="${faculty._id}">
                <div class="faculty-header">
                    <h3>${faculty.firstName} ${faculty.lastName}</h3>
                    <div class="faculty-actions">
                        <button onclick="editFaculty('${faculty._id}')" class="btn-edit">✏️ Edit</button>
                        <button onclick="deleteFacultyConfirm('${faculty._id}')" class="btn-delete">🗑️ Delete</button>
                    </div>
                </div>
                <div class="faculty-details">
                    <p><strong>Employee ID:</strong> ${faculty.employeeId}</p>
                    <p><strong>Email:</strong> ${faculty.email}</p>
                    <p><strong>Department:</strong> ${faculty.department}</p>
                    <p><strong>Designation:</strong> ${faculty.designation}</p>
                    <p><strong>Phone:</strong> ${faculty.phone}</p>
                    <p><strong>Experience:</strong> ${faculty.experience?.teaching || 0} years teaching</p>
                    <p><strong>Publications:</strong> ${(faculty.publications?.journals || 0) + (faculty.publications?.conferences || 0) + (faculty.publications?.books || 0)} total</p>
                    <p><strong>Status:</strong> <span class="status ${faculty.status?.toLowerCase()}">${faculty.status || 'Active'}</span></p>
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    }
}

// Enhanced error handling and user feedback
function showMessage(message, type = 'info', duration = 5000) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // Set colors based on type
    if (type === 'success') {
        messageDiv.style.background = '#c6f6d5';
        messageDiv.style.color = '#22543d';
        messageDiv.style.border = '1px solid #9ae6b4';
    } else if (type === 'error') {
        messageDiv.style.background = '#fed7d7';
        messageDiv.style.color = '#742a2a';
        messageDiv.style.border = '1px solid #fc8181';
    } else {
        messageDiv.style.background = '#bee3f8';
        messageDiv.style.color = '#2a4365';
        messageDiv.style.border = '1px solid #90cdf4';
    }
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Auto hide after duration
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, duration);
    
    console.log(`${type.toUpperCase()}: ${message}`);
}

function showLoading(show) {
    let loading = document.getElementById('loading');
    
    if (!loading) {
        // Create loading element if it doesn't exist
        loading = document.createElement('div');
        loading.id = 'loading';
        loading.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; color: white;">
                <div style="width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.3); border-top: 5px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
                <p>Loading...</p>
            </div>
        `;
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(loading);
    }
    
    loading.style.display = show ? 'flex' : 'none';
}

// Debug function to test backend connection
async function testBackendConnection() {
    try {
        console.log('🧪 Testing backend connection...');
        
        const response = await fetch('/api/health');
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Backend health check:', result);
            showMessage('Backend connection successful!', 'success', 3000);
            return result;
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        showMessage('Backend connection failed. Please ensure your server is running.', 'error', 8000);
        return null;
    }
}

// Load ratification data
async function loadRatificationData() {
    try {
        const response = await fetch('/api/ratification/eligible');
        const result = await response.json();
        
        if (result.success) {
            displayRatificationList(result.data);
        }
    } catch (error) {
        console.error('Error loading ratification data:', error);
    }
}

// Display ratification list
function displayRatificationList(eligibleFaculty) {
    const container = document.getElementById('ratificationList');
    
    if (!eligibleFaculty || eligibleFaculty.length === 0) {
        container.innerHTML = '<div class="no-data">No faculty members are currently eligible for ratification.</div>';
        return;
    }
    
    const html = eligibleFaculty.map(faculty => `
        <div class="ratification-card">
            <h3>${faculty.firstName} ${faculty.lastName}</h3>
            <p><strong>Department:</strong> ${faculty.department}</p>
            <p><strong>Designation:</strong> ${faculty.designation}</p>
            <p><strong>Teaching Experience:</strong> ${faculty.experience.teaching} years</p>
            <p><strong>Total Publications:</strong> ${faculty.publications.journals + faculty.publications.conferences + faculty.publications.books}</p>
            <button onclick="ratifyFaculty('${faculty._id}')" class="btn-ratify">✅ Ratify</button>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Edit faculty function - COMPLETE IMPLEMENTATION
function editFaculty(id) {
    console.log('🔧 Edit faculty:', id);
    
    // Find the faculty member to edit
    const faculty = facultyData.find(f => f._id === id);
    
    if (!faculty) {
        showMessage('Faculty member not found!', 'error');
        return;
    }
    
    console.log('📝 Found faculty to edit:', faculty);
    
    // Set edit mode
    currentEditId = id;
    
    // Populate the form with existing data
    populateFormForEdit(faculty);
    
    // Switch to add faculty section
    showSection('addFaculty');
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('addFacultyBtn').classList.add('active');
    
    // Update form title and button text
    updateFormForEditMode(true);
    
    showMessage('✏️ Editing faculty member. Make changes and save.', 'info');
}

// Populate form with faculty data for editing
function populateFormForEdit(faculty) {
    const form = document.getElementById('facultyForm');
    if (!form) return;
    
    // Basic information
    form.elements.firstName.value = faculty.firstName || '';
    form.elements.lastName.value = faculty.lastName || '';
    form.elements.email.value = faculty.email || '';
    form.elements.employeeId.value = faculty.employeeId || '';
    form.elements.department.value = faculty.department || '';
    form.elements.designation.value = faculty.designation || '';
    form.elements.dateOfJoining.value = faculty.dateOfJoining || '';
    
    // Qualifications - join array with commas
    form.elements.qualifications.value = Array.isArray(faculty.qualifications) 
        ? faculty.qualifications.join(', ') 
        : faculty.qualifications || '';
    
    // Experience
    form.elements.teachingExperience.value = faculty.experience?.teaching || 0;
    form.elements.industryExperience.value = faculty.experience?.industry || 0;
    form.elements.researchExperience.value = faculty.experience?.research || 0;
    
    // Publications
    form.elements.journals.value = faculty.publications?.journals || 0;
    form.elements.conferences.value = faculty.publications?.conferences || 0;
    form.elements.books.value = faculty.publications?.books || 0;
    
    // Phone - remove +91- prefix for editing
    let phoneForEdit = faculty.phone || '';
    if (phoneForEdit.startsWith('+91-')) {
        phoneForEdit = phoneForEdit.substring(4);
    }
    form.elements.phone.value = phoneForEdit;
    
    console.log('✅ Form populated with faculty data');
}

// Update form UI for edit mode
function updateFormForEditMode(isEditMode) {
    const formTitle = document.querySelector('#addFaculty h2');
    const submitButton = document.querySelector('#facultyForm button[type="submit"]');
    const cancelButton = document.getElementById('cancelEditBtn');
    
    if (isEditMode) {
        // Update title
        if (formTitle) {
            formTitle.innerHTML = '✏️ Edit Faculty Member';
        }
        
        // Update submit button
        if (submitButton) {
            submitButton.innerHTML = '💾 Update Faculty';
            submitButton.style.background = '#f6ad55';
        }
        
        // Show cancel button
        if (!cancelButton) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = 'cancelEditBtn';
            cancelBtn.innerHTML = '❌ Cancel Edit';
            cancelBtn.className = 'btn-secondary';
            cancelBtn.style.cssText = `
                background: #e2e8f0;
                color: #2d3748;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
                margin-left: 1rem;
                font-weight: 600;
            `;
            cancelBtn.onclick = cancelEdit;
            submitButton.parentNode.appendChild(cancelBtn);
        }
        
    } else {
        // Reset to add mode
        if (formTitle) {
            formTitle.innerHTML = '➕ Add New Faculty';
        }
        
        if (submitButton) {
            submitButton.innerHTML = '💾 Save Faculty';
            submitButton.style.background = '';
        }
        
        // Remove cancel button
        if (cancelButton) {
            cancelButton.remove();
        }
    }
}

// Cancel edit mode
function cancelEdit() {
    console.log('❌ Cancelling edit mode');
    
    currentEditId = null;
    
    // Clear form
    document.getElementById('facultyForm').reset();
    clearFormValidation();
    
    // Reset form UI
    updateFormForEditMode(false);
    
    // Go back to faculty list
    showSection('viewFaculty');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('viewFacultyBtn').classList.add('active');
    
    showMessage('✅ Edit cancelled', 'info');
}

// Update faculty function
async function updateFaculty(id, facultyData) {
    try {
        showLoading(true);
        console.log('🔄 Updating faculty ID:', id, 'with data:', facultyData);
        
        const response = await fetch(`/api/faculty/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(facultyData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            console.log('✅ Faculty updated successfully:', result.data);
            showMessage('✅ Faculty member updated successfully!', 'success');
            
            // Reset edit mode
            currentEditId = null;
            updateFormForEditMode(false);
            
            // Reload data
            await loadFacultyData();
            
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to update faculty');
        }
        
    } catch (error) {
        console.error('❌ Error updating faculty:', error);
        showMessage('❌ Error updating faculty: ' + error.message, 'error');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Ratify faculty function
async function ratifyFaculty(id) {
    try {
        const ratifiedBy = prompt('Enter your name/ID for ratification:');
        if (!ratifiedBy) return;
        
        const comments = prompt('Enter any comments (optional):') || '';
        
        const response = await fetch(`/api/ratification/ratify/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ratifiedBy,
                comments
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Faculty ratified successfully!', 'success');
            loadRatificationData(); // Refresh the list
            loadFacultyData(); // Refresh main faculty data
        } else {
            showMessage('Error ratifying faculty: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error ratifying faculty:', error);
        showMessage('Error ratifying faculty: ' + error.message, 'error');
    }
}

// Enhanced initialization with proper event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Setup form validation for all fields
    setupFormValidation();
    
    // Add real-time validation feedback
    const requiredFields = document.querySelectorAll('#facultyForm [required]');
    requiredFields.forEach(field => {
        field.addEventListener('invalid', function(e) {
            e.preventDefault();
            this.style.borderColor = '#e53e3e';
            
            if (this.validity.valueMissing) {
                this.setCustomValidity('This field is required');
            }
        });
        
        field.addEventListener('input', function() {
            if (this.validity.valid) {
                this.style.borderColor = '#48bb78';
                this.setCustomValidity('');
            }
        });
    });
});

// Utility functions for validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhoneNumber(phone) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's exactly 10 digits and starts with 6-9
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
        return true;
    }
    
    // If it's 12 digits and starts with 91, check the mobile number part
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        const mobileNumber = cleanPhone.substring(2);
        return /^[6-9]/.test(mobileNumber);
    }
    
    return false;
}

function validateEmployeeId(employeeId) {
    // Should not be empty and should be at least 3 characters
    return employeeId && employeeId.trim().length >= 3;
}

// Format phone number for display
function formatPhoneNumber(input) {
    // Remove all non-digit characters
    let phone = input.replace(/\D/g, '');
    
    // Handle different input formats
    if (phone.length === 10) {
        return '+91-' + phone;
    } else if (phone.length === 12 && phone.startsWith('91')) {
        return '+91-' + phone.substring(2);
    }
    
    return input; // Return original if can't format
}

// Additional helper function for form reset
function resetFormStyles() {
    const formInputs = document.querySelectorAll('#facultyForm input, #facultyForm select, #facultyForm textarea');
    formInputs.forEach(input => {
        input.style.borderColor = '';
        input.setCustomValidity('');
    });
}

console.log('📜 Enhanced script.js loaded successfully with fixed phone validation');