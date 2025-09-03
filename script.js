// Aura Tracker - Number Line Interface
import { supabase } from './src/supabase.js';
import { RoomManager } from './src/room-manager.js';

class NumberLine {
  constructor() {
    this.users = [];
    this.selectedUser = null;
    this.isDragging = false;
    this.supabase = supabase;
    
    this.userCircles = document.getElementById('userCircles');
    this.selectedUserInfo = document.getElementById('selectedUserInfo');
    this.selectedUserName = document.getElementById('selectedUserName');
    this.selectedUserPosition = document.getElementById('selectedUserPosition');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateUI();
    this.updateRankingTable();
    
    // Initialize room manager
    this.roomManager = new RoomManager(this);
  }

  setupEventListeners() {
    // Add user button
    const addUserBtn = document.getElementById('addUserBtn');
    const userNameInput = document.getElementById('userName');
    
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => this.handleAddUser());
    }
    
    if (userNameInput) {
      userNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleAddUser();
      });
    }

    // Aura adjustment buttons
    const gainBtn = document.getElementById('gainBtn');
    const lossBtn = document.getElementById('lossBtn');
    const deleteBtn = document.getElementById('deleteUserBtn');
    
    if (gainBtn) gainBtn.addEventListener('click', () => this.adjustAura(true));
    if (lossBtn) lossBtn.addEventListener('click', () => this.adjustAura(false));
    if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteSelectedUser());

    // Clear selection when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-circle') && !e.target.closest('.selected-user-info')) {
        this.clearSelection();
      }
    });
  }

  async handleAddUser() {
    const nameInput = document.getElementById('userName');
    const imageInput = document.getElementById('userImage');
    const name = nameInput.value.trim();
    
    if (!name) {
      alert('Please enter a user name');
      return;
    }

    if (this.users.length >= 5) {
      alert('Maximum 5 users allowed');
      return;
    }

    let imageUrl = null;
    
    // Handle image upload if provided
    if (imageInput.files && imageInput.files[0]) {
      const file = imageInput.files[0];
      
      if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
        alert('Please upload a JPEG image');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }

      // Convert to base64 for display
      imageUrl = await this.fileToBase64(file);
    }

    // Create user object
    const user = {
      id: Date.now() + Math.random(),
      name,
      image: imageUrl,
      position: 50, // Start at center
      value: 0,
      isFromDatabase: false
    };

    // Add to database if in a room
    if (this.roomManager && this.roomManager.isInRoom()) {
      try {
        const dbUser = await this.roomManager.addUserToDatabase(name, imageUrl);
        user.id = dbUser.id;
        user.isFromDatabase = true;
      } catch (error) {
        console.error('Failed to add user to database:', error);
      }
    }

    this.users.push(user);
    this.createUserCircle(user);
    this.updateUI();
    this.updateRankingTable();

    // Clear form
    nameInput.value = '';
    imageInput.value = '';
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  createUserCircle(user) {
    const circle = document.createElement('div');
    circle.className = 'user-circle';
    circle.style.left = `${user.position}%`;
    circle.dataset.userId = user.id;

    const imageHtml = user.image 
      ? `<div class="circle-image"><img src="${user.image}" alt="${user.name}" /></div>`
      : `<div class="placeholder-icon">👤</div>`;

    circle.innerHTML = `
      ${imageHtml}
      <div class="circle-name">${user.name}</div>
    `;

    // Click to select
    circle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectUser(user);
    });

    // Drag functionality
    this.setupDragHandlers(circle, user);
    
    this.userCircles.appendChild(circle);
  }

  setupDragHandlers(circle, user) {
    let isDragging = false;
    let startX = 0;
    let startPosition = user.position;

    circle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startPosition = user.position;
      circle.classList.add('dragging');
      e.preventDefault();
    });

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const numberLineRect = document.querySelector('.number-line').getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / numberLineRect.width) * 100;
      let newPosition = Math.max(0, Math.min(100, startPosition + deltaPercent));
      
      // Check for overlaps and adjust position
      newPosition = this.adjustPositionForOverlap(user, newPosition);

      user.position = newPosition;
      user.value = this.positionToValue(newPosition);
      circle.style.left = `${newPosition}%`;
      
      // Update selected user info if this user is selected
      if (this.selectedUser && this.selectedUser.id === user.id) {
        this.selectedUserPosition.textContent = this.formatNumber(user.value);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        circle.classList.remove('dragging');
        
        // Save to database if in room
        if (this.roomManager && user.isFromDatabase) {
          this.roomManager.saveUserToDatabase(user);
        }
        
        this.updateRankingTable();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  adjustPositionForOverlap(currentUser, newPosition) {
    const minDistance = 8; // Minimum distance between circles (in percentage)
    let adjustedPosition = newPosition;
    
    // Check against all other users
    for (const otherUser of this.users) {
      if (otherUser.id === currentUser.id) continue;
      
      const distance = Math.abs(adjustedPosition - otherUser.position);
      
      if (distance < minDistance) {
        // Determine which direction to move
        if (adjustedPosition > otherUser.position) {
          // Move right
          adjustedPosition = Math.min(100, otherUser.position + minDistance);
        } else {
          // Move left
          adjustedPosition = Math.max(0, otherUser.position - minDistance);
        }
      }
    }
    
    return adjustedPosition;
  }
  selectUser(user) {
    this.selectedUser = user;
    
    // Update visual selection
    document.querySelectorAll('.user-circle').forEach(circle => {
      circle.classList.remove('selected');
    });
    
    const selectedCircle = document.querySelector(`[data-user-id="${user.id}"]`);
    if (selectedCircle) {
      selectedCircle.classList.add('selected');
    }
    
    // Show user info
    this.selectedUserName.textContent = user.name;
    this.selectedUserPosition.textContent = this.formatNumber(user.value);
    this.selectedUserInfo.style.display = 'block';
  }

  clearSelection() {
    this.selectedUser = null;
    document.querySelectorAll('.user-circle').forEach(circle => {
      circle.classList.remove('selected');
    });
    this.selectedUserInfo.style.display = 'none';
  }

  adjustAura(isGain) {
    if (!this.selectedUser) return;

    const amountInput = document.getElementById('auraAmount');
    const amount = parseInt(amountInput.value) || 1000000;
    const adjustedAmount = isGain ? amount : -amount;

    // Update user value
    this.selectedUser.value = Math.max(-1000000000, Math.min(1000000000, this.selectedUser.value + adjustedAmount));
    this.selectedUser.position = this.valueToPosition(this.selectedUser.value);
    
    // Update circle position
    const circle = document.querySelector(`[data-user-id="${this.selectedUser.id}"]`);
    if (circle) {
      circle.style.left = `${this.selectedUser.position}%`;
    }
    
    // Update selected user display
    this.selectedUserPosition.textContent = this.formatNumber(this.selectedUser.value);
    
    // Save to database if in room
    if (this.roomManager && this.selectedUser.isFromDatabase) {
      this.roomManager.saveUserToDatabase(this.selectedUser);
    }
    
    this.updateRankingTable();
  }

  deleteSelectedUser() {
    if (!this.selectedUser) return;
    
    if (confirm(`Are you sure you want to remove ${this.selectedUser.name}?`)) {
      // Remove from database if needed
      if (this.roomManager && this.selectedUser.isFromDatabase) {
        this.roomManager.deleteUserFromDatabase(this.selectedUser.id);
      }
      
      // Remove from local array
      this.users = this.users.filter(u => u.id !== this.selectedUser.id);
      
      // Remove from DOM
      const circle = document.querySelector(`[data-user-id="${this.selectedUser.id}"]`);
      if (circle) circle.remove();
      
      this.clearSelection();
      this.updateRankingTable();
    }
  }

  valueToPosition(value) {
    return ((value + 1000000000) / 2000000000) * 100;
  }

  positionToValue(position) {
    return Math.round((position / 100) * 2000000000 - 1000000000);
  }

  formatNumber(value) {
    const absValue = Math.abs(value);
    const sign = value >= 0 ? '+' : '-';
    
    if (absValue >= 1000000000) {
      return `${sign}${(absValue / 1000000000).toFixed(1)}B`;
    } else if (absValue >= 1000000) {
      return `${sign}${(absValue / 1000000).toFixed(1)}M`;
    } else if (absValue >= 1000) {
      return `${sign}${(absValue / 1000).toFixed(1)}K`;
    } else {
      return `${sign}${absValue}`;
    }
  }

  updateUI() {
    // Update any UI elements that need refreshing
  }

  updateRankingTable() {
    const rankingsBody = document.getElementById('rankingsBody');
    if (!rankingsBody) return;

    if (this.users.length === 0) {
      rankingsBody.innerHTML = `
        <div class="empty-state">
          <p>No users added yet. Add some users to see rankings!</p>
        </div>
      `;
      return;
    }

    // Sort users by value (highest first)
    const sortedUsers = [...this.users].sort((a, b) => b.value - a.value);
    
    rankingsBody.innerHTML = sortedUsers.map((user, index) => {
      const imageHtml = user.image 
        ? `<img src="${user.image}" alt="${user.name}" class="table-user-image" />`
        : `<div class="table-placeholder">👤</div>`;
      
      return `
        <div class="table-row">
          <div class="rank-col">${index + 1}</div>
          <div class="user-col">
            ${imageHtml}
            ${user.name}
          </div>
          <div class="aura-col ${user.value >= 0 ? 'positive' : 'negative'}">
            ${this.formatNumber(user.value)}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  window.numberLine = new NumberLine();
});