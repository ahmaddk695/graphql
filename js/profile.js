/**
 * Main function to load all profile data and initialize the dashboard
 */
async function loadProfileData() {
    try {
        // Validate authentication before proceeding
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }
        
        // Load all data sections
        await Promise.all([
            loadUserProfile(),
            loadXPData(),
            loadProgressData(),
            loadCharts()
        ]);
        
        // Setup UI interactions
        setupLogoutHandler();
        
    } catch (error) {
        handleLoadError(error);
    }
}

/**
 * Check if user is properly authenticated
 * @returns {boolean} Authentication status
 */
function isAuthenticated() {
    const token = localStorage.getItem('jwt');
    return token && token.split('.').length === 3;
}

/**
 * Redirect user to login page
 */
function redirectToLogin() {
    localStorage.removeItem('jwt');
    window.location.replace('index.html');
}

/**
 * Load and display user profile information
 */
async function loadUserProfile() {
    const userInfoData = await getUserInfo();
    displayUserInfo(userInfoData);
}

/**
 * Load and display XP data
 */
async function loadXPData() {
    const xpData = await getUserXP();
    displayXPInfo(xpData);
    return xpData;
}

/**
 * Load and display progress data
 */
async function loadProgressData() {
    const progressData = await getUserProgress();
    displayProgressInfo(progressData);
    return progressData;
}

/**
 * Load and create interactive charts
 */
async function loadCharts() {
    const [xpData, ratioData] = await Promise.all([
        getUserXP(),
        getPassFailRatio()
    ]);
    
    // Create charts if data is available
    if (xpData?.transaction) {
        createXPGraph(xpData.transaction);
    } else {
        document.getElementById('xp-graph').innerHTML = 'No XP data available';
    }
    
    if (ratioData?.progress) {
        createRatioGraph(ratioData.progress);
    } else {
        document.getElementById('ratio-graph').innerHTML = 'No ratio data available';
    }
}

/**
 * Handle errors during data loading
 * @param {Error} error - The error that occurred
 */
function handleLoadError(error) {
    console.error('Error loading profile data:', error);
    
    if (error.message === 'Not authenticated' || 
        error.message.includes('Invalid token') || 
        error.message.includes('unauthorized')) {
        redirectToLogin();
    } else {
        // Display error message on the page
        const containers = ['user-info', 'xp-info', 'progress-info', 'xp-graph', 'ratio-graph'];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
            }
        });
    }
}

/**
 * Setup logout button functionality
 */
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn && !logoutBtn.hasAttribute('data-logout-setup')) {
        logoutBtn.setAttribute('data-logout-setup', 'true');
        
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Clear all authentication data
            localStorage.removeItem('jwt');
            sessionStorage.clear();
            
            // Clear browser cache if supported
            if (typeof caches !== 'undefined') {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            
            // Redirect to login
            window.location.replace('index.html');
        });
    }
}

/**
 * Display user profile information in a clean card format
 * @param {Object} data - User data from GraphQL query
 */
function displayUserInfo(data) {
    const userInfoElement = document.getElementById('user-info');
    
    if (data && data.user && data.user.length > 0) {
        const user = data.user[0];
        let attrs = {};
        
        // Parse user attributes safely
        if (user.attrs) {
            try {
                attrs = typeof user.attrs === 'string' ? JSON.parse(user.attrs) : user.attrs;
            } catch (e) {
                console.error("Error parsing user attributes:", e);
            }
        }
        
        userInfoElement.innerHTML = createUserProfileHTML(user, attrs);
    } else {
        userInfoElement.innerHTML = 'No user information available';
    }
}

/**
 * Generate HTML for user profile display
 * @param {Object} user - User object
 * @param {Object} attrs - User attributes
 * @returns {string} HTML string
 */
function createUserProfileHTML(user, attrs) {
    const avatar = user.login ? user.login.charAt(0).toUpperCase() : '?';
    const fullName = `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim() || 'Not provided';
    
    return `
        <div class="profile-header">
            <div class="profile-avatar">${avatar}</div>
            <div class="profile-details">
                <h3>${user.login || 'N/A'}</h3>
                <div class="profile-subtitle">Student</div>
            </div>
        </div>
        <div class="info-grid">
            <div class="info-item">
                <i class="info-icon">📧</i>
                <div class="info-content">
                    <div class="info-label">Email</div>
                    <div class="info-value">${attrs.email || 'Not provided'}</div>
                </div>
            </div>
            <div class="info-item">
                <i class="info-icon">🏢</i>
                <div class="info-content">
                    <div class="info-label">Campus</div>
                    <div class="info-value">${user.campus || 'Not specified'}</div>
                </div>
            </div>
            <div class="info-item">
                <i class="info-icon">👤</i>
                <div class="info-content">
                    <div class="info-label">Name</div>
                    <div class="info-value">${fullName}</div>
                </div>
            </div>
            <div class="info-item">
                <i class="info-icon">🆔</i>
                <div class="info-content">
                    <div class="info-label">User ID</div>
                    <div class="info-value">${user.id || 'Unknown'}</div>
                </div>
            </div>
        </div>
        ${createBackgroundSection(attrs)}
    `;
}

/**
 * Create background information section if data exists
 * @param {Object} attrs - User attributes
 * @returns {string} HTML string for background section
 */
function createBackgroundSection(attrs) {
    const hasBackground = attrs.education || attrs.background || attrs.skills;
    
    if (!hasBackground) return '';
    
    return `
        <div class="info-section">
            <h4>Background</h4>
            <div class="background-info">
                ${attrs.education ? `<div class="background-item"><strong>Education:</strong> ${attrs.education}</div>` : ''}
                ${attrs.background ? `<div class="background-item"><strong>Experience:</strong> ${attrs.background}</div>` : ''}
                ${attrs.skills ? `<div class="background-item"><strong>Skills:</strong> ${attrs.skills}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Display XP information with recent transactions
 * @param {Object} data - XP transaction data from GraphQL
 */
function displayXPInfo(data) {
    const xpInfoElement = document.getElementById('xp-info');
    
    if (data && data.transaction && data.transaction.length > 0) {
        const transactions = data.transaction;
        const totalXP = calculateTotalXP(transactions);
        const latestTransaction = transactions[0]; // Already sorted by createdAt desc
        
        xpInfoElement.innerHTML = createXPInfoHTML(totalXP, latestTransaction, transactions);
    } else {
        xpInfoElement.innerHTML = 'No XP information available';
    }
}

/**
 * Calculate total XP from transactions (exercises excluded)
 * @param {Array} transactions - Array of XP transactions
 * @returns {number} Total XP amount
 */
function calculateTotalXP(transactions) {
    return transactions.reduce((sum, tx) => {
        const amount = Number(tx.amount);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
}

/**
 * Format XP amount for display (bytes to KB/MB)
 * @param {number} xp - XP amount in bytes
 * @returns {string} Formatted XP string
 */
function formatXP(xp) {
    if (xp >= 1000000) {
        return (xp / 1000000).toFixed(2) + ' MB';
    } else if (xp >= 1000) {
        return (xp / 1000).toFixed(2) + ' KB';
    } else {
        return xp + ' B';
    }
}

/**
 * Create HTML for XP information display (exercises excluded)
 * @param {number} totalXP - Total XP amount (exercises excluded)
 * @param {Object} latestTransaction - Most recent XP transaction
 * @param {Array} transactions - All transactions for recent list
 * @returns {string} HTML string
 */
function createXPInfoHTML(totalXP, latestTransaction, transactions) {
    const latestAmount = Number(latestTransaction.amount);
    
    return `
        <div class="info-item">
            <strong>Project XP (Exercises Excluded):</strong> ${formatXP(totalXP)} (${totalXP.toLocaleString()} bytes)
        </div>
        <div class="info-item">
            <strong>Latest XP earned:</strong> ${formatXP(latestAmount)}
            (${new Date(latestTransaction.createdAt).toLocaleDateString()})
        </div>
        <div class="info-item">
            <strong>Recent XP Transactions:</strong>
            <div class="transaction-list">
                ${createRecentTransactionsHTML(transactions.slice(0, 5))}
            </div>
        </div>
    `;
}

/**
 * Create HTML for recent transactions list
 * @param {Array} transactions - Recent transactions to display
 * @returns {string} HTML string
 */
function createRecentTransactionsHTML(transactions) {
    return transactions.map(tx => {
        const amount = Number(tx.amount);
        const objectName = tx.object ? tx.object.name : 'Unknown';
        const objectType = tx.object ? tx.object.type : '';
        const date = new Date(tx.createdAt).toLocaleDateString();
        
        return `
            <div class="transaction-item">
                <div class="transaction-name">${objectName}</div>
                <div class="transaction-details">
                    <span class="transaction-type">${objectType}</span>
                    <span class="transaction-xp">${formatXP(amount)}</span>
                    <span class="transaction-date">${date}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Display progress information with project statistics
 * @param {Object} data - Progress data from GraphQL
 */
function displayProgressInfo(data) {
    const progressInfoElement = document.getElementById('progress-info');
    
    if (data && data.progress && data.progress.length > 0) {
        const projects = filterProjects(data.progress);
        const stats = calculateProjectStats(projects);
        
        progressInfoElement.innerHTML = createProgressInfoHTML(stats, projects);
    } else {
        progressInfoElement.innerHTML = 'No progress information available';
    }
}

/**
 * Filter for actual projects only (excluding exercises, etc.)
 * @param {Array} progress - All progress data
 * @returns {Array} Filtered project data
 */
function filterProjects(progress) {
    return progress.filter(item => 
        item.object && 
        item.object.type && 
        item.object.type.toLowerCase() === 'project'
    );
}

/**
 * Calculate project statistics
 * @param {Array} projects - Array of project data
 * @returns {Object} Statistics object
 */
function calculateProjectStats(projects) {
    // Reboot01 grading: grade >= 1 = PASS, grade < 1 = FAIL
    const passed = projects.filter(item => 
        item.grade !== null && item.grade !== undefined && Number(item.grade) >= 1
    ).length;
    
    const failed = projects.filter(item => 
        item.grade !== null && item.grade !== undefined && Number(item.grade) < 1
    ).length;
    
    const inProgress = projects.filter(item => 
        item.grade === null || item.grade === undefined
    ).length;
    
    const attempted = passed + failed;
    const successRate = attempted > 0 ? Math.round((passed / attempted) * 100) : 0;
    
    return { passed, failed, inProgress, attempted, successRate };
}

/**
 * Create HTML for progress information display
 * @param {Object} stats - Project statistics
 * @param {Array} projects - Project data for recent list
 * @returns {string} HTML string
 */
function createProgressInfoHTML(stats, projects) {
    return `
        <div class="info-item">
            <strong>Total projects attempted:</strong> ${stats.attempted}
        </div>
        <div class="info-item">
            <strong>Projects passed:</strong> ${stats.passed}
        </div>
        <div class="info-item">
            <strong>Projects failed:</strong> ${stats.failed}
        </div>
        <div class="info-item">
            <strong>Success rate:</strong> ${stats.successRate}%
        </div>
        <div class="info-item">
            <strong>In Progress:</strong> ${stats.inProgress}
        </div>
        <div class="info-item">
            <strong>Recent Projects</strong>
            <div class="project-list">
                ${createRecentProjectsHTML(projects.slice(0, 3))}
            </div>
        </div>
    `;
}

/**
 * Create HTML for recent projects list
 * @param {Array} projects - Recent projects to display
 * @returns {string} HTML string
 */
function createRecentProjectsHTML(projects) {
    return projects.map(item => {
        const { status, statusClass } = getProjectStatus(item.grade);
        const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No date';
        
        return `
            <div class="project-item">
                <div class="project-name">${item.object.name}</div>
                <div class="project-details">
                    <span class="project-status ${statusClass}">${status}</span>
                    <span class="project-date">${date}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Determine project status based on grade
 * @param {number|null} grade - Project grade
 * @returns {Object} Status and CSS class
 */
function getProjectStatus(grade) {
    if (grade === null || grade === undefined) {
        return { status: "In Progress", statusClass: "status-progress" };
    }
    
    const numericGrade = Number(grade);
    if (numericGrade >= 1) {
        return { status: "Passed", statusClass: "status-passed" };
    } else {
        return { status: "Failed", statusClass: "status-failed" };
    }
}

/**
 * Initialize the profile page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('profile.html')) {
        loadProfileData();
    }
});