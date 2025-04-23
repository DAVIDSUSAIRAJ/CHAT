import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/profile.css';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        navigate('/login');
        return;
      }

      // Fetch user details from the users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
      } else if (data) {
        setUser(data);
        setUsername(data.username || '');
        setEmail(data.email || '');
        setAvatarUrl(data.avatar_url);
      }
      
      setLoading(false);
    };

    fetchUserData();
  }, [navigate]);

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          username,
          avatar_url: avatarUrl 
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      } else {
        setUser({...user, username, avatar_url: avatarUrl});
        setIsEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred.');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type is image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    // Validate file size (less than 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB.');
      return;
    }

    setUploading(true);
    
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Set the avatar URL
      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Trigger file input click
  const openFileSelector = () => {
    fileInputRef.current.click();
  };

  // Handle navigation back to chat
  const handleBackToChat = () => {
    navigate('/chat');
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-loading">Loading profile data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <button className="back-button" onClick={handleBackToChat}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>Welcome Back</h1>
          <div className="profile-subtitle">Manage your profile information</div>
        </div>

        <div className="profile-avatar">
          {avatarUrl ? (
            <div 
              className="avatar-image" 
              style={{ backgroundImage: `url(${avatarUrl})` }}
              onClick={isEditing ? openFileSelector : undefined}
            >
              {isEditing && (
                <div className="avatar-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="avatar-circle"
              onClick={isEditing ? openFileSelector : undefined}
            >
              {username ? username[0].toUpperCase() : '?'}
              {isEditing && (
                <div className="avatar-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
              )}
            </div>
          )}
          {isEditing && (
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleAvatarUpload}
            />
          )}
        </div>

        <form onSubmit={handleUpdateProfile} className="profile-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              readOnly
            />
          </div>

          <div className="profile-actions">
            {isEditing ? (
              <>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={updateLoading || uploading}
                >
                  {updateLoading || uploading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset to original values
                    setUsername(user.username || '');
                    setAvatarUrl(user.avatar_url);
                  }}
                  disabled={updateLoading || uploading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                type="button" 
                className="edit-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditing(true);
                }}
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>

        <div className="back-to-chat">
          <button onClick={handleBackToChat}>
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 