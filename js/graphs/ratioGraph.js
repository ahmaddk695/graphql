/**
 * Create a pie chart visualization for pass/fail ratio
 * @param {Array} results - Array of progress data from GraphQL
 */
function createRatioGraph(results) {
    if (!results || results.length === 0) {
        document.getElementById('ratio-graph').innerHTML = 'No results data available';
        return;
    }
    
    // Filter for projects only (excluding exercises and other types)
    const projects = results.filter(r => 
        r.object && r.object.type && 
        r.object.type.toLowerCase() === 'project'
    );
    
    if (projects.length === 0) {
        document.getElementById('ratio-graph').innerHTML = 'No project results available';
        return;
    }
    
    // Calculate pass/fail statistics
    // Grade >= 1 = PASS, Grade < 1 = FAIL (Reboot01 grading system)
    const gradedProjects = projects.filter(r => 
        r.grade !== null && r.grade !== undefined
    );
    
    const passed = gradedProjects.filter(r => Number(r.grade) >= 1).length;
    const failed = gradedProjects.filter(r => Number(r.grade) < 1).length;
    const total = passed + failed;
    
    // Calculate percentages for display
    const passPercent = total > 0 ? (passed / total) * 100 : 0;
    const failPercent = total > 0 ? (failed / total) * 100 : 0;
    
    // SVG configuration
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Color scheme (Reboot01 brand colors)
    const passColor = '#8CC63F';  // Green for passed
    const failColor = '#4A2882';  // Purple for failed
    
    // Calculate angles for pie slices
    const passAngle = (passPercent / 100) * 360;
    
    /**
     * Helper function to create SVG path for pie slice
     * @param {number} startAngle - Starting angle in degrees
     * @param {number} endAngle - Ending angle in degrees  
     * @param {string} color - Fill color for the slice
     * @returns {string} SVG path element
     */
    function createSlice(startAngle, endAngle, color) {
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        
        const x1 = radius * Math.cos(startRad);
        const y1 = radius * Math.sin(startRad);
        const x2 = radius * Math.cos(endRad);
        const y2 = radius * Math.sin(endRad);
        
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        
        return `
            <path d="M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" 
                  fill="${color}" stroke="white" stroke-width="2" />
        `;
    }
    
    // Build the SVG pie chart
    let svg = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
            <!-- Title -->
            <text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="white">
                Pass/Fail Ratio
            </text>
            
            <!-- Pie chart slices -->
            <g transform="translate(${centerX}, ${centerY})">
    `;
    
    // Add pie slices (only if there's data to show)
    if (passed > 0) {
        svg += createSlice(0, passAngle, passColor);
    }
    if (failed > 0) {
        svg += createSlice(passAngle, 360, failColor);
    }
    
    svg += `
            </g>
            
            <!-- Legend -->
            <g transform="translate(${width - 110}, ${height - 60})">
                <rect width="20" height="20" fill="${passColor}" />
                <text x="30" y="15" font-size="14" fill="white">Pass (${Math.round(passPercent)}%)</text>
                
                <rect y="30" width="20" height="20" fill="${failColor}" />
                <text x="30" y="45" font-size="14" fill="white">Fail (${Math.round(failPercent)}%)</text>
            </g>
        </svg>
    `;
    
    document.getElementById('ratio-graph').innerHTML = svg;
}