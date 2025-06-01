document.addEventListener('DOMContentLoaded', () => {
    // Only run profile code if we're on the profile page
    if (window.location.pathname.includes('profile.html')) {
        console.log("Profile page loaded");
        
        // Debug JWT token
        const token = localStorage.getItem('jwt');
        console.log("Current JWT token:", token);
        console.log("Token parts:", token ? token.split('.').length : 0);
        
        // Note: loadProfileData() will be called from profile.js
    }
});

// Authentication handling
const API_DOMAIN = "learn.reboot01.com"; // Your actual domain
const AUTH_ENDPOINT = `https://${API_DOMAIN}/api/auth/signin`;
const GRAPHQL_ENDPOINT = `https://${API_DOMAIN}/api/graphql-engine/v1/graphql`;

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('jwt');
    if (!token) return false;
    
    // Basic JWT format validation
    const parts = token.split('.');
    if (parts.length !== 3) {
        // Invalid token format, remove it
        localStorage.removeItem('jwt');
        return false;
    }
    
    return true;
}

// Redirect if not logged in
function requireAuth() {
    if (!isLoggedIn() && !window.location.pathname.includes('index.html')) {
        console.log("Not authenticated, redirecting to login");
        window.location.replace('index.html');
    }
}

// Redirect if already logged in
function redirectIfLoggedIn() {
    if (isLoggedIn() && window.location.pathname.includes('index.html')) {
        console.log("Already authenticated, redirecting to profile");
        window.location.replace('profile.html');
    }
}

// Setup login form
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    if (!loginForm || !errorMessage) {
        console.error("Login form or error message element not found");
        return;
    }
    
    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Login form submitted");
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log("Attempting login with username:", username);
        
        // Hide any previous error messages
        errorMessage.classList.add('hidden');
        
        // Create Basic auth token
        const credentials = btoa(`${username}:${password}`);
        
        try {
            console.log("Sending authentication request to:", AUTH_ENDPOINT);
            
            const response = await fetch(AUTH_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                },
                // Add empty body to ensure proper POST request
                body: JSON.stringify({})
            });
            
            console.log("Auth response status:", response.status);
            
            if (!response.ok) {
                console.error("Authentication failed with status:", response.status);
                throw new Error(`Invalid credentials (Status: ${response.status})`);
            }
            
            const responseText = await response.text();
            console.log("Auth response body:", responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log("Parsed auth response:", data);
                
                // Log the full structure of the response for debugging
                console.log("Response structure:", JSON.stringify(data, null, 2));
            } catch (e) {
                console.error("Failed to parse auth response as JSON:", e);
                throw new Error('Invalid server response format');
            }
            
            // Handle different token response formats
            // Some APIs return "token", others might use "jwt", "access_token", etc.
            let token = null;
            
            if (data.token) {
                token = data.token;
            } else if (data.jwt) {
                token = data.jwt;
            } else if (data.access_token) {
                token = data.access_token;
            } else if (typeof data === 'string' && data.split('.').length === 3) {
                // Check if the response itself is directly a JWT token
                // JWT tokens typically have 3 parts separated by dots
                token = data;
                console.log("Response appears to be a direct JWT token");
            } else {
                // Look for any property that might contain a token
                const findToken = (obj, depth = 0) => {
                    // Prevent infinite recursion with objects that might have circular references
                    if (depth > 3) return null;
                    
                    // Check if this is an object
                    if (obj && typeof obj === 'object') {
                        // First check direct properties
                        for (const key in obj) {
                            // Check if property looks like a token
                            if (typeof obj[key] === 'string') {
                                if (key.includes('token') || key.includes('jwt') || key.includes('auth')) {
                                    console.log(`Found potential token in property: ${key}`);
                                    return obj[key];
                                }
                                
                                // Check if the value looks like a JWT (has 3 parts separated by dots)
                                if (obj[key].split('.').length === 3) {
                                    console.log(`Found potential JWT token value in property: ${key}`);
                                    return obj[key];
                                }
                            }
                            
                            // Recursively check nested objects
                            if (obj[key] && typeof obj[key] === 'object') {
                                const nestedToken = findToken(obj[key], depth + 1);
                                if (nestedToken) return nestedToken;
                            }
                        }
                    }
                    return null;
                };
                
                token = findToken(data);
            }
            
            if (!token) {
                console.error("No token found in response:", data);
                throw new Error('No authentication token received. Please check server response format.');
            }
            
            // Store JWT token
            localStorage.setItem('jwt', token);
            console.log("JWT token stored in localStorage");
            
            // Redirect immediately using replace to prevent back navigation
            console.log("Redirecting to profile page...");
            window.location.replace('profile.html');
            
        } catch (error) {
            console.error("Login error:", error);
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        }
    });
}

// Handle logout
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log("Logout button clicked");
            performLogout();
        });
    }
}

// Perform logout action
function performLogout() {
    // Clear authentication data
    localStorage.removeItem('jwt');
    
    // Clear any other stored data that might persist user state
    sessionStorage.clear();
    
    // Force page reload and redirect to prevent cached state
    console.log("Logging out and redirecting to login page");
    window.location.replace('index.html');
}

// Prevent back navigation to authenticated pages after logout
function preventBackNavigation() {
    // Add state to prevent back navigation
    window.history.pushState(null, null, window.location.href);
    
    window.addEventListener('popstate', function(event) {
        // If user is not logged in and tries to navigate back to a protected page
        if (!isLoggedIn() && window.location.pathname.includes('profile.html')) {
            window.location.replace('index.html');
        }
        // Push state again to prevent further back navigation
        window.history.pushState(null, null, window.location.href);
    });
}

// Initialize authentication
function initAuth() {
    if (window.location.pathname.includes('index.html')) {
        redirectIfLoggedIn();
        setupLoginForm();
    } else if (window.location.pathname.includes('profile.html')) {
        requireAuth();
        setupLogout();
        preventBackNavigation();
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', initAuth);

// Run on page show (handles back/forward navigation)
window.addEventListener('pageshow', function(event) {
    // If page is restored from cache, check authentication again
    if (event.persisted) {
        console.log("Page restored from cache, checking authentication");
        
        if (window.location.pathname.includes('profile.html')) {
            // If on profile page but not logged in, redirect
            if (!isLoggedIn()) {
                console.log("Not authenticated on cached page, redirecting");
                window.location.replace('index.html');
            }
        } else if (window.location.pathname.includes('index.html')) {
            // If on login page but already logged in, redirect
            if (isLoggedIn()) {
                console.log("Already authenticated on cached page, redirecting");
                window.location.replace('profile.html');
            }
        }
    }
});