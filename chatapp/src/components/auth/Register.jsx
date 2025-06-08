import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../../styles/auth.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Function to broadcast status
  const broadcastStatus = async (userId, status) => {
    try {
      const channel = supabase.channel('status_updates');
      await channel.send({
        type: 'broadcast',
        event: 'status_change',
        payload: {
          userId,
          status
        }
      });
    } catch (error) {
      console.error('Error broadcasting status:', error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      confirmPasswordRef.current.focus();
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create user authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('email')) {
          emailRef.current.focus();
        } else if (authError.message.includes('password')) {
          passwordRef.current.focus();
        }
        throw authError;
      }

      if (authData && authData.user) {
        // Step 2: Insert user data into public.users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            username,
            email,
            password,
            avatar_url: null,
            status: 'online',
            about: "",
            bio: null,
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          throw new Error('Failed to create user profile');
        }

        // Step 3: Broadcast online status
        await broadcastStatus(authData.user.id, 'online');

        toast.success('Account created successfully!');
        navigate('/chat');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join our chat community today</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="auth-input-group">
            <input
              ref={usernameRef}
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="auth-input-group">
            <input
              ref={emailRef}
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="auth-input-group">
            <input
              ref={passwordRef}
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Create a password"
              required
            />
          </div>

          <div className="auth-input-group">
            <input
              ref={confirmPasswordRef}
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? (
              <>
                <span className="auth-loading"></span>
                <span>Creating account...</span>
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="auth-bottom-text">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 