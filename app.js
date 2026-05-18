let selectedType = 'call';
let selectedExercise = 'european';

function selectType(type, button) {
    selectedType = type;
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function selectExercise(exercise, button) {
    selectedExercise = exercise;
    document.querySelectorAll('.exercise-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function updateStepLabel() {
    const steps = document.getElementById('treeSteps').value;
    document.getElementById('stepLabel').textContent = steps + ' steps';
}

function calculateBinomial() {
    // Get inputs
    const S = parseFloat(document.getElementById('stockPrice').value);
    const K = parseFloat(document.getElementById('strikePrice').value);
    const T = parseFloat(document.getElementById('timeToExp').value);
    const r = parseFloat(document.getElementById('riskFreeRate').value) / 100;
    const sigma = parseFloat(document.getElementById('volatility').value) / 100;
    const q = parseFloat(document.getElementById('dividendYield').value) / 100;
    const n = parseInt(document.getElementById('treeSteps').value);

    // Validate
    if (!S || !K || !T || sigma <= 0) {
        alert('Please fill in all fields correctly');
        return;
    }

    // Calculate binomial parameters
    const dt = T / n;
    const u = Math.exp(sigma * Math.sqrt(dt));
    const d = 1 / u;
    const a = Math.exp((r - q) * dt);
    const p = (a - d) / (u - d);
    const discountFactor = Math.exp(-r * dt);

    // Validate risk-neutral probability
    if (p < 0 || p > 1) {
        alert('Invalid parameters: risk-neutral probability out of bounds. Try different inputs.');
        return;
    }

    // Build stock price tree
    const stockTree = [];
    for (let i = 0; i <= n; i++) {
        stockTree[i] = [];
        for (let j = 0; j <= i; j++) {
            stockTree[i][j] = S * Math.pow(u, i - j) * Math.pow(d, j);
        }
    }

    // Build option value tree
    const optionTree = [];
    for (let i = 0; i <= n; i++) {
        optionTree[i] = [];
    }

    // Calculate final payoffs at expiration
    for (let j = 0; j <= n; j++) {
        const ST = stockTree[n][j];
        if (selectedType === 'call') {
            optionTree[n][j] = Math.max(ST - K, 0);
        } else {
            optionTree[n][j] = Math.max(K - ST, 0);
        }
    }

    // Work backward through tree
    for (let i = n - 1; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
            const S_ij = stockTree[i][j];
            const discountedValue = discountFactor * (p * optionTree[i + 1][j] + (1 - p) * optionTree[i + 1][j + 1]);
            
            if (selectedExercise === 'american') {
                // For American options, check early exercise
                let intrinsic;
                if (selectedType === 'call') {
                    intrinsic = Math.max(S_ij - K, 0);
                } else {
                    intrinsic = Math.max(K - S_ij, 0);
                }
                optionTree[i][j] = Math.max(intrinsic, discountedValue);
            } else {
                // European options
                optionTree[i][j] = discountedValue;
            }
        }
    }

    const optionPrice = optionTree[0][0];

    // Calculate intrinsic and time value
    let intrinsic;
    if (selectedType === 'call') {
        intrinsic = Math.max(S - K, 0);
    } else {
        intrinsic = Math.max(K - S, 0);
    }
    const timeValue = Math.max(optionPrice - intrinsic, 0);

    // Stock price range at expiration
    const minStock = S * Math.pow(d, n);
    const maxStock = S * Math.pow(u, n);

    // Display results
    document.getElementById('optionPrice').textContent = '$' + optionPrice.toFixed(2);
    document.getElementById('intrinsicValue').textContent = '$' + intrinsic.toFixed(2);
    document.getElementById('timeValue').textContent = '$' + timeValue.toFixed(2);
    document.getElementById('stockRange').textContent = '$' + minStock.toFixed(2) + ' - $' + maxStock.toFixed(2);

    // Display binomial parameters
    document.getElementById('upFactor').textContent = u.toFixed(4);
    document.getElementById('downFactor').textContent = d.toFixed(4);
    document.getElementById('riskNeutralProb').textContent = (p * 100).toFixed(2) + '%';
    document.getElementById('timeStep').textContent = dt.toFixed(4) + ' years (' + (dt * 365).toFixed(0) + ' days)';
    document.getElementById('discountFactor').textContent = discountFactor.toFixed(4);

    // Display final payoffs
    generatePayoffTable(stockTree[n], selectedType, K);

    // Display tree visualization
    displayTreeVisualization(stockTree, optionTree, n);

    // Comparison text
    const comparisonText = `With ${n} steps, the binomial model price is $${optionPrice.toFixed(2)}. ` +
        `Intrinsic value is $${intrinsic.toFixed(2)}, so time value is $${timeValue.toFixed(2)}. ` +
        `As you increase steps to 10+, this price converges to the Black-Scholes equivalent.`;
    document.getElementById('comparisonText').textContent = comparisonText;

    // Show results
    document.getElementById('binomialResults').style.display = 'block';
    document.getElementById('binomialResults').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function generatePayoffTable(finalStocks, type, K) {
    const tbody = document.getElementById('payoffBody');
    tbody.innerHTML = '';

    for (let j = 0; j < finalStocks.length; j++) {
        const S = finalStocks[j];
        let payoff;
        if (type === 'call') {
            payoff = Math.max(S - K, 0);
        } else {
            payoff = Math.max(K - S, 0);
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>$${S.toFixed(2)}</td>
            <td style="font-weight: 600; color: ${payoff > 0 ? '#10b981' : '#6b7280'};">
                $${payoff.toFixed(2)}
            </td>
        `;
        tbody.appendChild(row);
    }
}

function displayTreeVisualization(stockTree, optionTree, n) {
    const canvas = document.getElementById('treeCanvas');
    let html = '<strong>Binomial Tree Structure (Stock Prices / Option Values)</strong>\n\n';

    // Show only first 3 levels for clarity
    const levels = Math.min(4, n + 1);
    
    for (let i = 0; i < levels; i++) {
        html += 't=' + i + ': ';
        for (let j = 0; j <= i; j++) {
            const stock = stockTree[i][j].toFixed(1);
            const option = optionTree[i][j].toFixed(2);
            html += `[${stock}/${option}]  `;
        }
        html += '\n';
    }

    if (n >= 4) {
        html += '\n... (' + (n - 3) + ' more levels) ...\n';
        html += 't=' + n + ': ';
        for (let j = 0; j <= n; j++) {
            const stock = stockTree[n][j].toFixed(1);
            const option = optionTree[n][j].toFixed(2);
            html += `[${stock}/${option}]  `;
            if (j > 5) {
                html += '...';
                break;
            }
        }
    }

    canvas.textContent = html;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateStepLabel();
});
