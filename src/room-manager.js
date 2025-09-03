import { 
  getCurrentUser, 
  createRoom, 
  joinRoom, 
  getRoomUsers, 
  addUserToRoom, 
  updateUserPosition, 
  deleteRoomUser, 
  subscribeToRoomUsers,
  signOut 
} from './supabase.js';

export class RoomManager {
  constructor(numberLine) {
    this.numberLine = numberLine;
    this.currentRoom = null;
    this.currentUser = null;
    this.subscription = null;
    
    this.setupUI();
    this.checkAuth();
  }
  
  async checkAuth() {
    try {
      this.currentUser = await getCurrentUser();
      if (!this.currentUser) {
        window.location.href = 'auth.html';
        return;
      }
      
      // Check if there's a saved room
      const savedRoomId = localStorage.getItem('currentRoomId');
      if (savedRoomId) {
        await this.loadRoom(savedRoomId);
      } else {
        this.showRoomSelection();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = 'auth.html';
    }
  }
  
  setupUI() {
    // Add room management UI to the page
    const container = document.querySelector('.container');
    const roomUI = document.createElement('div');
    roomUI.className = 'room-management';
    roomUI.innerHTML = `
      <div class="room-header" id="roomHeader" style="display: none;">
        <div class="room-info">
          <h3 id="roomName">Room Name</h3>
          <div class="room-details">
            <span class="invite-code">Invite Code: <strong id="inviteCode">ABC123</strong></span>
            <button id="copyInviteBtn" class="copy-btn">Copy</button>
            <button id="leaveRoomBtn" class="leave-btn">Leave Room</button>
            <button id="signOutBtn" class="sign-out-btn">Sign Out</button>
          </div>
        </div>
      </div>
      
      <div class="room-selection" id="roomSelection">
        <div class="room-options">
          <div class="room-option">
            <h3>Create New Room</h3>
            <div class="room-form">
              <input type="text" id="roomNameInput" placeholder="Enter room name..." maxlength="50" />
              <button id="createRoomBtn" class="create-btn">Create Room</button>
            </div>
          </div>
          
          <div class="room-divider">OR</div>
          
          <div class="room-option">
            <h3>Join Existing Room</h3>
            <div class="room-form">
              <input type="text" id="inviteCodeInput" placeholder="Enter invite code..." maxlength="6" />
              <button id="joinRoomBtn" class="join-btn">Join Room</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Insert before the logo container
    const logoContainer = container.querySelector('.logo-container');
    container.insertBefore(roomUI, logoContainer);
    
    this.setupRoomEventListeners();
  }
  
  setupRoomEventListeners() {
    document.getElementById('createRoomBtn').addEventListener('click', () => this.handleCreateRoom());
    document.getElementById('joinRoomBtn').addEventListener('click', () => this.handleJoinRoom());
    document.getElementById('copyInviteBtn').addEventListener('click', () => this.copyInviteCode());
    document.getElementById('leaveRoomBtn').addEventListener('click', () => this.leaveRoom());
    document.getElementById('signOutBtn').addEventListener('click', () => this.handleSignOut());
    
    // Enter key support
    document.getElementById('roomNameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleCreateRoom();
    });
    
    document.getElementById('inviteCodeInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleJoinRoom();
    });
  }
  
  async handleCreateRoom() {
    const nameInput = document.getElementById('roomNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
      alert('Please enter a room name');
      return;
    }
    
    const btn = document.getElementById('createRoomBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    
    try {
      const room = await createRoom(name);
      await this.joinRoomById(room.id);
      nameInput.value = '';
    } catch (error) {
      alert(`Failed to create room: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Room';
    }
  }
  
  async handleJoinRoom() {
    const codeInput = document.getElementById('inviteCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
      alert('Please enter an invite code');
      return;
    }
    
    const btn = document.getElementById('joinRoomBtn');
    btn.disabled = true;
    btn.textContent = 'Joining...';
    
    try {
      const room = await joinRoom(code);
      await this.joinRoomById(room.id);
      codeInput.value = '';
    } catch (error) {
      alert(`Failed to join room: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Join Room';
    }
  }
  
  async joinRoomById(roomId) {
    try {
      // Load room data
      const { data: room, error } = await this.numberLine.supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
        
      if (error) throw error;
      
      this.currentRoom = room;
      localStorage.setItem('currentRoomId', roomId);
      
      // Load room users
      await this.loadRoomUsers();
      
      // Setup real-time subscription
      this.setupRealtimeSubscription();
      
      // Update UI
      this.showRoomHeader();
      this.hideRoomSelection();
      
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room');
    }
  }
  
  async loadRoom(roomId) {
    try {
      const { data: room, error } = await this.numberLine.supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
        
      if (error) throw error;
      
      this.currentRoom = room;
      await this.loadRoomUsers();
      this.setupRealtimeSubscription();
      this.showRoomHeader();
      this.hideRoomSelection();
    } catch (error) {
      console.error('Failed to load room:', error);
      localStorage.removeItem('currentRoomId');
      this.showRoomSelection();
    }
  }
  
  async loadRoomUsers() {
    try {
      const users = await getRoomUsers(this.currentRoom.id);
      
      // Clear existing users and UI
      this.numberLine.users = [];
      this.numberLine.selectedUser = null;
      this.numberLine.userCircles.innerHTML = '';
      this.numberLine.selectedUserInfo.style.display = 'none';
      
      // Convert room users to number line format
      users.forEach(user => {
        const numberLineUser = {
          id: user.id,
          name: user.name,
          image: user.image_url,
          position: parseFloat(user.position),
          value: parseInt(user.value),
          isFromDatabase: true
        };
        
        this.numberLine.users.push(numberLineUser);
        this.numberLine.createUserCircle(numberLineUser);
      });
      
      this.numberLine.updateUI();
      this.numberLine.updateRankingTable();
    } catch (error) {
      console.error('Failed to load room users:', error);
    }
  }
  
  setupRealtimeSubscription() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    
    this.subscription = subscribeToRoomUsers(this.currentRoom.id, (payload) => {
      this.handleRealtimeUpdate(payload);
    });
  }
  
  handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        this.handleUserAdded(newRecord);
        break;
      case 'UPDATE':
        this.handleUserUpdated(newRecord);
        break;
      case 'DELETE':
        this.handleUserDeleted(oldRecord);
        break;
    }
  }
  
  handleUserAdded(user) {
    // Check if user already exists locally
    const existingUser = this.numberLine.users.find(u => u.id === user.id);
    if (existingUser) return;
    
    const numberLineUser = {
      id: user.id,
      name: user.name,
      image: user.image_url,
      position: parseFloat(user.position),
      value: parseInt(user.value),
      isFromDatabase: true
    };
    
    this.numberLine.users.push(numberLineUser);
    this.numberLine.createUserCircle(numberLineUser);
    this.numberLine.updateUI();
    this.numberLine.updateRankingTable();
  }
  
  handleUserUpdated(user) {
    const localUser = this.numberLine.users.find(u => u.id === user.id);
    if (!localUser) return;
    
    // Update local user data
    localUser.name = user.name;
    localUser.image = user.image_url;
    localUser.position = parseFloat(user.position);
    localUser.value = parseInt(user.value);
    
    // Update UI
    const circle = document.querySelector(`[data-user-id="${user.id}"]`);
    if (circle) {
      circle.style.left = `${localUser.position}%`;
      
      // Update circle content
      const nameElement = circle.querySelector('.circle-name');
      if (nameElement) nameElement.textContent = localUser.name;
      
      const imageElement = circle.querySelector('.circle-image img');
      const placeholderElement = circle.querySelector('.placeholder-icon');
      
      if (localUser.image) {
        if (imageElement) {
          imageElement.src = localUser.image;
        } else if (placeholderElement) {
          placeholderElement.parentElement.innerHTML = `<img src="${localUser.image}" alt="${localUser.name}" />`;
        }
      }
    }
    
    // Update selected user info if this user is selected
    if (this.numberLine.selectedUser && this.numberLine.selectedUser.id === user.id) {
      this.numberLine.selectedUserName.textContent = localUser.name;
      this.numberLine.selectedUserPosition.textContent = this.numberLine.formatNumber(localUser.value);
    }
    
    this.numberLine.updateRankingTable();
  }
  
  handleUserDeleted(user) {
    // Remove from local users array
    this.numberLine.users = this.numberLine.users.filter(u => u.id !== user.id);
    
    // Remove from DOM
    const circle = document.querySelector(`[data-user-id="${user.id}"]`);
    if (circle) circle.remove();
    
    // Clear selection if deleted user was selected
    if (this.numberLine.selectedUser && this.numberLine.selectedUser.id === user.id) {
      this.numberLine.selectedUser = null;
      this.numberLine.selectedUserInfo.style.display = 'none';
    }
    
    this.numberLine.updateUI();
    this.numberLine.updateRankingTable();
  }
  
  async saveUserToDatabase(user) {
    if (!this.currentRoom || !user.isFromDatabase) return;
    
    try {
      await updateUserPosition(user.id, user.position, user.value);
    } catch (error) {
      console.error('Failed to save user to database:', error);
    }
  }
  
  async addUserToDatabase(name, imageUrl) {
    if (!this.currentRoom) return null;
    
    try {
      return await addUserToRoom(this.currentRoom.id, name, imageUrl);
    } catch (error) {
      console.error('Failed to add user to database:', error);
      throw error;
    }
  }
  
  async deleteUserFromDatabase(userId) {
    try {
      await deleteRoomUser(userId);
    } catch (error) {
      console.error('Failed to delete user from database:', error);
    }
  }
  
  showRoomHeader() {
    const roomHeader = document.getElementById('roomHeader');
    const roomName = document.getElementById('roomName');
    const inviteCode = document.getElementById('inviteCode');
    
    roomHeader.style.display = 'block';
    roomName.textContent = this.currentRoom.name;
    inviteCode.textContent = this.currentRoom.invite_code;
  }
  
  hideRoomSelection() {
    document.getElementById('roomSelection').style.display = 'none';
  }
  
  showRoomSelection() {
    document.getElementById('roomSelection').style.display = 'block';
    document.getElementById('roomHeader').style.display = 'none';
  }
  
  copyInviteCode() {
    const inviteCode = this.currentRoom.invite_code;
    navigator.clipboard.writeText(inviteCode).then(() => {
      const btn = document.getElementById('copyInviteBtn');
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      btn.style.background = '#22c55e';
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 2000);
    }).catch(() => {
      alert(`Invite code: ${inviteCode}`);
    });
  }
  
  leaveRoom() {
    if (confirm('Are you sure you want to leave this room?')) {
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
      
      this.currentRoom = null;
      localStorage.removeItem('currentRoomId');
      
      // Clear users and UI
      this.numberLine.users = [];
      this.numberLine.selectedUser = null;
      this.numberLine.userCircles.innerHTML = '';
      this.numberLine.selectedUserInfo.style.display = 'none';
      this.numberLine.updateUI();
      this.numberLine.updateRankingTable();
      
      this.showRoomSelection();
    }
  }
  
  async handleSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out failed:', error);
        window.location.href = 'auth.html';
      }
    }
  }
  
  getCurrentRoom() {
    return this.currentRoom;
  }
  
  isInRoom() {
    return !!this.currentRoom;
  }
}