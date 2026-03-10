const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const btnExpense = document.getElementById('btn-expense');
const btnIncome = document.getElementById('btn-income');
const monthFilter = document.getElementById('month-filter');

let currentMonthFilter = 'all';

// Extract Month and Year from date string
function getMonthYear(dateString) {
    if (!dateString) return 'Unknown';
    const parts = dateString.split(' ');
    if (parts.length >= 3) {
        return `${parts[0]} ${parts[2]}`;
    }
    return 'Unknown';
}

// Populate Month Filter Dropdown
function populateMonthFilter() {
    const months = new Set();
    transactions.forEach(t => {
        months.add(getMonthYear(t.date));
    });

    const currentFilter = monthFilter.value;
    monthFilter.innerHTML = '<option value="all">All Time</option>';

    // Convert to Date objects to sort descending correctly
    const sortedMonths = Array.from(months)
        .filter(m => m !== 'Unknown')
        .sort((a, b) => new Date('1 ' + b) - new Date('1 ' + a));

    sortedMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.innerText = month;
        monthFilter.appendChild(option);
    });

    if (months.has(currentFilter) || currentFilter === 'all') {
        monthFilter.value = currentFilter;
        currentMonthFilter = currentFilter;
    } else {
        monthFilter.value = 'all';
        currentMonthFilter = 'all';
    }
}

// Handle Filter Change
monthFilter.addEventListener('change', (e) => {
    currentMonthFilter = e.target.value;
    updateDOM();
});

// Get Filtered Transactions
function getFilteredTransactions() {
    if (currentMonthFilter === 'all') {
        return transactions;
    }
    return transactions.filter(t => getMonthYear(t.date) === currentMonthFilter);
}

// Update entire DOM based on filtered transactions
function updateDOM() {
    list.innerHTML = '';
    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
        list.innerHTML = '<li style="background:transparent; border:none; justify-content:center; padding:1rem;" class="empty-state">No transactions yet</li>';
    } else {
        [...filtered].forEach(addTransactionDOM);
    }

    updateValues(filtered);
    updateChart(filtered);
}

// Chart initialization variables
let expenseChartCanvas = document.getElementById('expenseChart');
let myChart;

let isExpense = true; // Default to true because mostly we add expenses

// Local Storage
const localStorageTransactions = JSON.parse(
    localStorage.getItem('transactions')
);

let transactions =
    localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

// Initialize Type Toggle
btnExpense.addEventListener('click', () => {
    isExpense = true;
    btnExpense.classList.add('active');
    btnIncome.classList.remove('active');
    // If user previously entered a number, toggle its sign visually by focusing
    amount.focus();
});

btnIncome.addEventListener('click', () => {
    isExpense = false;
    btnIncome.classList.add('active');
    btnExpense.classList.remove('active');
    amount.focus();
});


// Add transaction
function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '') {
        // We could show a custom toast here but alert is okay for now
        // Let's implement a quick native animation or just let required attr do its job
        setTimeout(() => {
            text.style.borderColor = 'var(--danger-color)';
            amount.style.borderColor = 'var(--danger-color)';
        }, 100);
        return;
    }

    // Reset styles
    text.style.borderColor = 'var(--card-border)';
    amount.style.borderColor = 'var(--card-border)';

    let parsedAmount = parseFloat(amount.value);

    // Automatically adjust sign based on selected type if user hasn't explicitly added negative/positive that contradicts
    if (isExpense && parsedAmount > 0) {
        parsedAmount = -parsedAmount;
    } else if (!isExpense && parsedAmount < 0) {
        parsedAmount = Math.abs(parsedAmount);
    }

    const transaction = {
        id: generateID(),
        text: text.value,
        amount: parsedAmount,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    };

    transactions.push(transaction);

    updateLocalStorage();

    // Update filter options in case a new month was added
    populateMonthFilter();
    updateDOM();

    text.value = '';
    amount.value = '';
}

// Generate random ID
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
    // Determine sign
    const sign = transaction.amount < 0 ? '-' : '+';

    const item = document.createElement('li');

    // Add class based on value
    item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');

    item.innerHTML = `
        <div class="transaction-info">
            <span class="transaction-desc">${transaction.text}</span>
            <span class="transaction-date">${transaction.date || 'Today'}</span>
        </div>
        <span>${sign}$${Math.abs(transaction.amount).toFixed(2)}</span>
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})"><i class="fa-solid fa-trash"></i></button>
    `;

    // Add at the beginning
    list.prepend(item);
}

// Update the balance, income and expense
function updateValues(filteredTransactions) {
    const amounts = filteredTransactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);

    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    const expense = (
        amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
        -1
    ).toFixed(2);

    // Animate numbers (simple counter effect omitted for brevity, but could be added)
    balance.innerText = `$${total}`;
    money_plus.innerText = `+$${income}`;
    money_minus.innerText = `-$${expense}`;

    // If balance is negative, add a class to color it red
    if (total < 0) {
        balance.style.color = 'var(--danger-color)';
    } else {
        balance.style.color = 'var(--text-primary)';
    }
}

// Remove transaction by ID
function removeTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);

    updateLocalStorage();

    // Re-populate filter and update DOM
    populateMonthFilter();
    updateDOM();
}

// Update local storage transactions
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Init app
function init() {
    populateMonthFilter();
    updateDOM();
}

// Chart.js Setup
function updateChart(filteredTransactions) {
    const ctx = expenseChartCanvas.getContext('2d');

    const amounts = filteredTransactions.map(transaction => transaction.amount);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

    // Use Chart.js defaults for darker theme
    Chart.defaults.color = '#a3b3cc';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    if (myChart) {
        myChart.destroy();
    }

    if (income === 0 && expense === 0) {
        // Empty state chart
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
        return;
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                label: 'Amount',
                data: [income, expense],
                backgroundColor: [
                    '#2ea043', // success-color
                    '#f85149'  // danger-color
                ],
                borderColor: '#161b22', // Match card bg
                borderWidth: 4,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(22, 27, 34, 0.9)',
                    titleFont: { size: 14, family: "'Outfit', sans-serif" },
                    bodyFont: { size: 14, family: "'Outfit', sans-serif" },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

init();

form.addEventListener('submit', addTransaction);

// Calculator Logic
const calcInput = document.getElementById('calc-input');
let calcCurrentVal = '0';
let calcPrevVal = '';
let calcOperator = '';
let newNumberWait = false;

function calcAction(action) {
    if (action === 'clear') {
        calcCurrentVal = '0';
        calcPrevVal = '';
        calcOperator = '';
        updateCalcDisplay();
        return;
    }

    if (action === 'delete') {
        if (newNumberWait) return;
        if (calcCurrentVal.length === 1 || (calcCurrentVal.length === 2 && calcCurrentVal.startsWith('-'))) {
            calcCurrentVal = '0';
        } else {
            calcCurrentVal = calcCurrentVal.slice(0, -1);
        }
        updateCalcDisplay();
        return;
    }

    if (['+', '-', '*', '/', '%'].includes(action)) {
        if (calcOperator && !newNumberWait) {
            calcAction('=');
        }
        calcPrevVal = calcCurrentVal;
        calcOperator = action;
        newNumberWait = true;
        return;
    }

    if (action === '=') {
        if (!calcOperator || !calcPrevVal) return;
        let num1 = parseFloat(calcPrevVal);
        let num2 = parseFloat(calcCurrentVal);
        let result = 0;
        switch (calcOperator) {
            case '+': result = num1 + num2; break;
            case '-': result = num1 - num2; break;
            case '*': result = num1 * num2; break;
            case '/': result = num2 !== 0 ? num1 / num2 : 0; break;
            case '%': result = num1 % num2; break;
        }
        // format nicely and round to 2 decimals at most to fix floating point issues
        result = Math.round(result * 100) / 100;
        calcCurrentVal = result.toString();
        calcOperator = '';
        calcPrevVal = '';
        newNumberWait = true;
        updateCalcDisplay();
        return;
    }

    // Numbers or decimal
    if (newNumberWait) {
        if (action === '.') {
            calcCurrentVal = '0.';
        } else {
            calcCurrentVal = action === '00' ? '0' : action;
        }
        newNumberWait = false;
    } else {
        if (action === '.') {
            if (!calcCurrentVal.includes('.')) {
                calcCurrentVal += '.';
            }
        } else {
            if (calcCurrentVal === '0') {
                calcCurrentVal = action === '00' ? '0' : action;
            } else {
                calcCurrentVal += action;
            }
        }
    }
    updateCalcDisplay();
}

function updateCalcDisplay() {
    if (calcInput) {
        calcInput.value = calcCurrentVal;
    }
}

function useCalcAmount() {
    const amountField = document.getElementById('amount');
    amountField.value = parseFloat(calcCurrentVal);
    // Focus amount field
    amountField.focus();

    // Smooth visual feedback on the button
    const btn = document.querySelector('.calc-use-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = 'Copied! <i class="fa-solid fa-check"></i>';
    btn.style.background = 'var(--success-color)';

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.style.background = '';
    }, 1500);
}
