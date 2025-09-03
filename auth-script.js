import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

class AuthPage {
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      'https://cuwuivlynlfmxrtjhjnm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1d3Vpdmx5bmxmbXhydGpoam5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTI4MDMsImV4cCI6MjA3MjQyODgwM30.n76xnDXyOJyfmCzKWo6Kh-PkYMEzmWiOln4oTfKVKv8'
    );
    
    this.loginTab = document.getElementById('loginTab');
    this.signupTab = document.getElementById('signupTab');
    this.loginForm = document.getElementById('loginForm');
    this.signupForm = document.getElementById('signupForm');
    
    this.setupEventListeners();
    this.checkAuthState();
  }
  
  async checkAuthState() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user) {
      window.location.href = 'index.html';
    }
  }
  
  setupEventListeners() {
    this.loginTab.addEventListener('click', () => this.switchTab('login'));
    this.signupTab.addEventListener('click', () => this.switchTab('signup'));
    
    this.loginForm.querySelector('.auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin(e);
    });
    
    this.signupForm.querySelector('.auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSignup(e);
    });
  }
  
  async handleLogin(e) {
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    const btn = e.target.querySelector('.auth-btn');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Signing In...';
    
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Success - redirect to main app
      window.location.href = 'index.html';
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'Sign In';
    }
  }
  
  async handleSignup(e) {
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    const btn = e.target.querySelector('.auth-btn');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Creating Account...';
    
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });
      
      if (error) throw error;
      
      alert('Account created successfully! You can now sign in.');
      this.switchTab('login');
    } catch (error) {
      alert(`Sign up failed: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'Create Account';
    }
  }
  
  switchTab(tab) {
    this.loginTab.classList.toggle('active', tab === 'login');
    this.signupTab.classList.toggle('active', tab === 'signup');
    this.loginForm.style.display = tab === 'login' ? 'block' : 'none';
    this.signupForm.style.display = tab === 'signup' ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AuthPage();
});