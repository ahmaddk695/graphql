/**
 * Execute a GraphQL query with authentication
 * @param {string} query - The GraphQL query string
 * @param {object} variables - Query variables
 * @returns {Promise<object>} - Query result data
 */
async function executeQuery(query, variables = {}) {
    const token = localStorage.getItem('jwt');
    
    if (!token) {
        throw new Error('Not authenticated');
    }
    
    // Validate JWT token format (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        localStorage.removeItem('jwt');
        throw new Error('Invalid token format');
    }
    
    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query,
                variables
            })
        });
        
        if (!response.ok) {
            throw new Error(`GraphQL request failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        
        return result.data;
    } catch (error) {
        console.error('GraphQL Error:', error);
        throw error;
    }
}

/**
 * Get basic user information
 * @returns {Promise<object>} User data including login, campus, and attributes
 */
async function getUserInfo() {
    const query = `
        {
            user {
                id
                login
                campus
                attrs
                profile
            }
        }
    `;
    
    return executeQuery(query);
}

/**
 * Get user XP transactions (excluding exercises)
 * Filters for projects, piscines, and other XP-earning activities
 * @returns {Promise<object>} XP transaction data
 */
async function getUserXP() {
    const userInfo = await getUserInfo();
    const userId = userInfo.user[0].id;
    
    const query = `
        query {
            transaction(
                where: {
                    userId: {_eq: "${userId}"}, 
                    type: {_eq: "xp"}, 
                    object: {type: {_neq: "exercise"}}
                }, 
                order_by: {createdAt: desc}
            ) {
                id
                amount
                createdAt
                path
                object {
                    id
                    name
                    type
                }
            }
        }
    `;
    
    return executeQuery(query);
}

/**
 * Get user progress data for all activities
 * @returns {Promise<object>} Progress data including grades and completion status
 */
async function getUserProgress() {
    const userInfo = await getUserInfo();
    const userId = userInfo.user[0].id;
    
    const query = `
        query {
            progress(
                where: {userId: {_eq: "${userId}"}}, 
                order_by: {createdAt: desc}
            ) {
                id
                grade
                createdAt
                path
                object {
                    id
                    name
                    type
                }
            }
        }
    `;
    
    return executeQuery(query);
}

/**
 * Get pass/fail ratio data for visualization
 * @returns {Promise<object>} Progress data for ratio calculations
 */
async function getPassFailRatio() {
    return getUserProgress(); // Same data, different use case
}