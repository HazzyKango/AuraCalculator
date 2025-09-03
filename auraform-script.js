class AuraCalculator {
  constructor() {
    this.form = document.getElementById('auraForm');
    this.resultContainer = document.getElementById('resultContainer');
    this.auraScore = document.getElementById('auraScore');
    this.breakdown = document.getElementById('breakdown');
    this.retakeBtn = document.getElementById('retakeBtn');
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    
    // Simple navigation
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
      });
      
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
          navToggle.classList.remove('active');
          navMenu.classList.remove('active');
        });
      });
    }
  }
  
  setupEventListeners() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.calculateAura();
    });
    
    this.retakeBtn.addEventListener('click', () => {
      this.resetForm();
    });
  }
  
  calculateAura() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);
    
    // Validate all fields are filled
    if (!this.validateForm(data)) {
      alert('Please fill in all fields');
      return;
    }
    
    const score = this.computeAuraScore(data);
    this.displayResults(score, data);
  }
  
  validateForm(data) {
    return data.name && data.age && data.income && data.height && data.relationship && data.weight;
  }
  
  computeAuraScore(data) {
    let score = 0;
    const breakdown = [];
    
    // Age scoring (peak at 25-30)
    const age = parseInt(data.age);
    let ageScore = 0;
    if (age >= 25 && age <= 30) {
      ageScore = 200000000; // Peak aura age
    } else if (age >= 20 && age <= 35) {
      ageScore = 150000000;
    } else if (age >= 18 && age <= 40) {
      ageScore = -100000000;
    } else {
      ageScore = -50000000;
    }
    score += ageScore;
    breakdown.push({ label: 'Age Factor', value: ageScore });
    
    // Income scoring
    const income = parseInt(data.income);
    let incomeScore = 0;
    if (income >= 200000) {
      incomeScore = 300000000;
    } else if (income >= 150000) {
      incomeScore = 250000000;
    } else if (income >= 100000) {
      incomeScore = 200000000;
    } else if (income >= 80000) {
      incomeScore = 150000000;
    } else if (income >= 60000) {
      incomeScore = 100000000;
    } else if (income >= 40000) {
      incomeScore = -50000000;
    } else {
      incomeScore = -25000000;
    }
    score += incomeScore;
    breakdown.push({ label: 'Income Level', value: incomeScore });
    
    // Height scoring (taller = more aura)
    const height = parseInt(data.height);
    let heightScore = 0;
    if (height >= 72) {
      heightScore = 150000000; // 6'0" or taller
    } else if (height >= 71) {
      heightScore = 100000000; // 5'11"
    } else if (height >= 65) {
      heightScore = -75000000; // 5'5"
    } else {
      heightScore = -50000000; // 5'0" or shorter
    }
    score += heightScore;
    breakdown.push({ label: 'Height Bonus', value: heightScore });
    
    // Relationship status
    let relationshipScore = 0;
    if (data.relationship === 'taken') {
      relationshipScore = 100000000; // Being in a relationship shows social skills
    } else if (data.relationship === 'single') {
      relationshipScore = -75000000; // Independence can be attractive
    } else {
      relationshipScore = -25000000; // Complicated = less aura
    }
    score += relationshipScore;
    breakdown.push({ label: 'Relationship Status', value: relationshipScore });
    
    // Weight/fitness scoring (optimal range)
    const weight = parseInt(data.weight);
    let fitnessScore = 0;
    if (weight >= 140 && weight <= 200) {
      fitnessScore = 150000000; // Optimal fitness range
    } else if (weight >= 120 && weight <= 240) {
      fitnessScore = 100000000; // Good range
    } else if (weight >= 100 && weight <= 280) {
      fitnessScore = -75000000; // Acceptable range
    } else {
      fitnessScore = -25000000; // Outside optimal range
    }
    score += fitnessScore;
    breakdown.push({ label: 'Fitness Level', value: fitnessScore });
    
    // Charisma bonus (based on name length - fun factor)
    const charismaScore = Math.min(data.name.length * 5000000, 50000000);
    score += charismaScore;
    breakdown.push({ label: 'Charisma Factor', value: charismaScore });
    
    return { total: score, breakdown };
  }
  
  displayResults(scoreData, userData) {
    // Hide form and show results
    this.form.style.display = 'none';
    this.resultContainer.style.display = 'block';
    
    // Animate score counting up
    this.animateScore(scoreData.total);
    
    // Display breakdown
    this.displayBreakdown(scoreData.breakdown);
    
    // Save result to localStorage
    this.saveResult(scoreData.total, userData);
  }
  
  animateScore(finalScore) {
    let currentScore = 0;
    const increment = finalScore / 100;
    const duration = 2000; // 2 seconds
    const stepTime = duration / 100;
    
    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= finalScore) {
        currentScore = finalScore;
        clearInterval(timer);
      }
      this.auraScore.textContent = this.formatNumber(Math.round(currentScore));
    }, stepTime);
  }
  
  displayBreakdown(breakdown) {
    this.breakdown.innerHTML = '';
    
    breakdown.forEach(item => {
      const breakdownItem = document.createElement('div');
      breakdownItem.className = 'breakdown-item';
      
      const isPositive = item.value > 0;
      const valueClass = isPositive ? 'positive' : 'negative';
      
      breakdownItem.innerHTML = `
        <span class="breakdown-label">${item.label}</span>
        <span class="breakdown-value ${valueClass}">${this.formatNumber(item.value)}</span>
      `;
      
      this.breakdown.appendChild(breakdownItem);
    });
  }
  
  formatNumber(num) {
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '+';
    
    if (absNum >= 1000000000) {
      return `${sign}${(absNum / 1000000000).toFixed(2)}B`;
    } else if (absNum >= 1000000) {
      return `${sign}${(absNum / 1000000).toFixed(1)}M`;
    } else if (absNum >= 1000) {
      return `${sign}${(absNum / 1000).toFixed(1)}K`;
    } else {
      return `${sign}${Math.round(absNum)}`;
    }
  }
  
  saveResult(score, userData) {
    const result = {
      score: score,
      userData: userData,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('lastAuraResult', JSON.stringify(result));
  }
  
  resetForm() {
    this.form.style.display = 'block';
    this.resultContainer.style.display = 'none';
    this.form.reset();
    
    // Reset button states
    const calculateBtn = this.form.querySelector('.calculate-btn');
    calculateBtn.disabled = false;
    calculateBtn.classList.remove('loading');
  }
}

// Initialize the aura calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new AuraCalculator();
});

console.log('Aura Calculator loaded!');