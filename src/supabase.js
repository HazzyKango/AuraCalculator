import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = 'https://cuwuivlynlfmxrtjhjnm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1d3Vpdmx5bmxmbXhydGpoam5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTI4MDMsImV4cCI6MjA3MjQyODgwM30.n76xnDXyOJyfmCzKWo6Kh-PkYMEzmWiOln4oTfKVKv8';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth helper functions
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = 'auth.html';
}

// Room functions
export async function createRoom(name) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Must be authenticated');
  
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name,
      invite_code: inviteCode,
      created_by: user.id
    })
    .select()
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

export async function joinRoom(inviteCode) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .maybeSingle();
    
  if (error) throw error;
  if (!data) throw new Error('Room not found with that invite code');
  return data;
}

export async function getRoomUsers(roomId) {
  const { data, error } = await supabase
    .from('room_users')
    .select('*')
    .eq('room_id', roomId)
    .order('value', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function addUserToRoom(roomId, name, imageUrl = null) {
  const { data, error } = await supabase
    .from('room_users')
    .insert({
      room_id: roomId,
      name,
      image_url: imageUrl,
      position: 50,
      value: 0
    })
    .select()
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

export async function updateUserPosition(userId, position, value) {
  const { data, error } = await supabase
    .from('room_users')
    .update({
      position,
      value,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteRoomUser(userId) {
  const { error } = await supabase
    .from('room_users')
    .delete()
    .eq('id', userId);
    
  if (error) throw error;
}

// Real-time subscriptions
export function subscribeToRoomUsers(roomId, callback) {
  return supabase
    .channel(`room_users:${roomId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'room_users',
      filter: `room_id=eq.${roomId}`
    }, callback)
    .subscribe();
}