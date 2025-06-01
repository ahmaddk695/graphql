/**
 * Create a line chart for XP progression over time
 * @param {Array} transactions - Array of XP transaction data
 */
function createXPGraph(transactions) {
    if (!transactions || transactions.length === 0) {
        document.getElementById('xp-graph').innerHTML = 'No XP data available';
        return;
    }
    
    // Process and prepare data for visualization
    const graphData = processXPData(transactions);
    
    // SVG configuration
    const width = 700;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Calculate data ranges for scaling
    const dates = graphData.map(d => new Date(d.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const maxXP = Math.max(...graphData.map(d => d.cumulativeXP));
    
    // Scaling functions for converting data to SVG coordinates
    const xScale = d => {
        const range = maxDate - minDate;
        const percent = (d - minDate) / range;
        return margin.left + percent * innerWidth;
    };
    
    const yScale = d => {
        return innerHeight + margin.top - (d / maxXP) * innerHeight;
    };
    
    // Build the SVG chart
    let svg = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
            <!-- Chart Title -->
            <text x="${width/2}" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="white">
                XP Progress Over Time
            </text>
            
            <!-- Chart Axes -->
            <line x1="${margin.left}" y1="${margin.top + innerHeight}" 
                  x2="${margin.left + innerWidth}" y2="${margin.top + innerHeight}" 
                  stroke="#ccc" stroke-width="2" />
            <line x1="${margin.left}" y1="${margin.top}" 
                  x2="${margin.left}" y2="${margin.top + innerHeight}" 
                  stroke="#ccc" stroke-width="2" />
            
            <!-- Axis Labels -->
            <text x="${margin.left + innerWidth / 2}" y="${height - 10}" 
                  text-anchor="middle" font-size="14" fill="white">Date</text>
            <text x="15" y="${margin.top + innerHeight / 2}" text-anchor="middle" font-size="14" fill="white" 
                  transform="rotate(-90, 15, ${margin.top + innerHeight / 2})">Cumulative XP</text>
    `;
    
    // Add X-axis ticks
    const numXTicks = 5;
    for (let i = 0; i <= numXTicks; i++) {
        const tickDate = new Date(minDate.getTime() + (maxDate - minDate) * (i / numXTicks));
        const x = xScale(tickDate);
        const label = tickDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        svg += `
            <line x1="${x}" y1="${margin.top + innerHeight}" x2="${x}" y2="${margin.top + innerHeight + 5}" stroke="#ccc" stroke-width="2" />
            <text x="${x}" y="${margin.top + innerHeight + 20}" text-anchor="middle" font-size="12" fill="white">${label}</text>
        `;
    }
    
    // Add Y-axis ticks
    const numYTicks = 5;
    for (let i = 0; i <= numYTicks; i++) {
        const tickValue = (maxXP * i) / numYTicks;
        const y = yScale(tickValue);
        
        svg += `
            <line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#ccc" stroke-width="2" />
            <text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" font-size="12" fill="white">${Math.round(tickValue)}</text>
        `;
    }
    
    // Draw the line
    let pathD = 'M';
    graphData.forEach((d, i) => {
        const x = xScale(new Date(d.date));
        const y = yScale(d.cumulativeXP);
        
        if (i === 0) {
            pathD += `${x},${y}`;
        } else {
            pathD += ` L${x},${y}`;
        }
    });
    
    svg += `
        <path d="${pathD}" fill="none" stroke="#3498db" stroke-width="3" />
    `;
    
    // Add data points
    graphData.forEach(d => {
        const x = xScale(new Date(d.date));
        const y = yScale(d.cumulativeXP);
        
        svg += `
            <circle cx="${x}" cy="${y}" r="5" fill="#3498db" />
            <circle cx="${x}" cy="${y}" r="5" fill="#3498db" opacity="0.3" class="hover-point">
                <title>Date: ${new Date(d.date).toLocaleDateString()}\nXP: ${d.cumulativeXP}</title>
            </circle>
        `;
    });
    
    svg += '</svg>';
    
    document.getElementById('xp-graph').innerHTML = svg;
}

/**
 * Process XP transaction data for graph visualization
 * @param {Array} transactions - Raw transaction data
 * @returns {Array} Processed data with cumulative XP by date
 */
function processXPData(transactions) {
    // Sort transactions chronologically
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    // Calculate cumulative XP by date
    const dateMap = new Map();
    let cumulativeXP = 0;
    
    sortedTransactions.forEach(tx => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const xpAmount = Number(tx.amount);
        
        if (isNaN(xpAmount)) {
            return; // Skip invalid transactions
        }
        
        cumulativeXP += xpAmount;
        dateMap.set(date, cumulativeXP);
    });
    
    // Convert to array format for the chart
    return Array.from(dateMap, ([date, xp]) => ({
        date,
        cumulativeXP: xp
    }));
}