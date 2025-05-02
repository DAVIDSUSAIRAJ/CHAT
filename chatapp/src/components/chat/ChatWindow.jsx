import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import '../../styles/chat.css'; /* Voice button custom styles */
import WaveSurferPlayer from './WaveSurferPlayer';
import MusicPlayer from './MusicPlayer';

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const MediaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const AudioCallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.999.999 0 0 0-1.03.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02c-.37-1.11-.56-2.3-.56-3.53c0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
  </svg>
);

const VideoCallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const ChatWindow = ({ 
  selectedUser, 
  hideHeader,
  showMediaGallery = false,
  setShowMediaGallery,
  searchText: externalSearchText,
  setSearchText: externalSetSearchText,
  isMobileView 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mediaSearchText, setMediaSearchText] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [filteredMediaFiles, setFilteredMediaFiles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [callState, setCallState] = useState('idle');
  const [callTimer, setCallTimer] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const callTimerRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callChannelRef = useRef(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecorder, setVideoRecorder] = useState(null);
  const [videoChunks, setVideoChunks] = useState([]);
  const videoPreviewRef = useRef(null);
  const videoStreamRef = useRef(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const actualSearchText = isMobileView ? externalSearchText : searchText;
  const actualSetSearchText = isMobileView ? externalSetSearchText : setSearchText;

  const handleMediaGalleryToggle = () => {
    setShowMediaGallery(!showMediaGallery);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 767);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    fetchCurrentUser();
  }, []);

  const fetchMessages = async () => {
    if (!selectedUser || !currentUser) return;

    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) return;
    setMessages(data || []);
  };

  useEffect(() => {
    if (!selectedUser || !currentUser) return;
  
    // Unsubscribe any previous channel
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
  
    // Fetch current messages
    fetchMessages();
  
    // ✅ Listen for auth state to be hydrated
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        console.warn('No session, skipping Realtime');
        return;
      }
  
      console.log('✅ Session from onAuthStateChange:', session);
  
      const channel = supabase.channel('public:chat')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat'
          },
          async (payload) => {
            if (!payload.new || !payload.new.id) return;
  
            const newMessage = payload.new;
            const isRelevantMessage =
              (newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedUser.id) ||
              (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === currentUser.id);
  
            if (isRelevantMessage) {
              setMessages(prevMessages => {
                const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                if (messageExists) return prevMessages;
                return [...prevMessages, newMessage];
              });
            }
          }
        )
        .subscribe();
  
      subscriptionRef.current = channel;
    });
  
    // ✅ Cleanup
    return () => {
      authListener.subscription.unsubscribe();
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [selectedUser, currentUser]);
  
  
  

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedUser) return;

    const messageToSend = {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      message: newMessage.trim()
    };

    setNewMessage('');

    try {
      const { error } = await supabase
        .from('chat')
        .insert([messageToSend])
        .select()
        .single();

      if (error) {
        toast.error('Failed to send message. Please try again.');
        return;
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error('File size should be less than 30MB');
      return;
    }

    setUploading(true);
    setShowAttachmentMenu(false);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `${selectedUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      let fileTypeIcon = '📎';
      let messageText = `${fileTypeIcon} ${file.name}`;

      if (file.type.startsWith('image/')) {
        fileTypeIcon = '🖼️';
        messageText = `${fileTypeIcon} ${file.name}`;
      } else if (file.type.startsWith('video/')) {
        fileTypeIcon = '🎥';
        messageText = `${fileTypeIcon} ${file.name}`;
      } else if (file.type.startsWith('audio/')) {
        const musicExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
        if (musicExtensions.includes(fileExt.toLowerCase())) {
          fileTypeIcon = '🎵';
          const nameParts = file.name.split('-');
          if (nameParts.length > 1) {
            const artist = nameParts[0].trim();
            const title = nameParts.slice(1).join('-').replace(`.${fileExt}`, '').trim();
            messageText = `${fileTypeIcon} ${artist} - ${title}`;
          } else {
            messageText = `${fileTypeIcon} ${file.name}`;
          }
        } else {
          fileTypeIcon = '🔊';
          messageText = `${fileTypeIcon} ${file.name}`;
        }
      } else if (file.type.includes('pdf')) {
        fileTypeIcon = '📄';
        messageText = `${fileTypeIcon} ${file.name}`;
      } else if (file.type.includes('document')) {
        fileTypeIcon = '📝';
        messageText = `${fileTypeIcon} ${file.name}`;
      }

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: messageText,
        file_url: publicUrl,
        file_type: file.type,
        file_name: file.name
      };

      const { error } = await supabase
        .from('chat')
        .insert([messageToSend])
        .select()
        .single();

      if (error) throw error;

    } catch (error) {
      toast.error('Failed to upload file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!actualSearchText?.trim()) {
      setFilteredMessages(messages);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchLower = actualSearchText.toLowerCase();
    const filtered = messages.filter(message => 
      message.message?.toLowerCase().includes(searchLower) ||
      message.file_name?.toLowerCase().includes(searchLower)
    );
    setFilteredMessages(filtered);
  }, [actualSearchText, messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const media = messages.filter(msg => msg.file_url).map(msg => ({
        ...msg,
        type: msg.file_type?.startsWith('image/') ? 'image' : 
              msg.file_type?.startsWith('video/') ? 'video' : 
              msg.file_type?.startsWith('audio/') ? 'audio' : 'file'
      }));
      setMediaFiles(media);
      setFilteredMediaFiles(media);
    }
  }, [messages]);

  useEffect(() => {
    if (!mediaSearchText?.trim()) {
      setFilteredMediaFiles(mediaFiles);
      return;
    }

    const searchLower = mediaSearchText.toLowerCase();
    const filtered = mediaFiles.filter(file => 
      file.message?.toLowerCase().includes(searchLower) ||
      file.file_name?.toLowerCase().includes(searchLower)
    );
    setFilteredMediaFiles(filtered);
  }, [mediaSearchText, mediaFiles]);

  const renderMessageContent = (message) => {
    if (!message.file_url) {
      return <p>{message.message}</p>;
    }

    const isImage = message.file_type?.startsWith('image/');
    const isVideo = message.file_type?.startsWith('video/');
    const isAudio = message.file_type?.startsWith('audio/');
    const isVoiceMessage = isAudio && message.message === '🎤 Voice Message';
    const isMusicFile = isAudio && !isVoiceMessage;

    return (
      <div className="file-message">
          <>
            {isImage && (
              <div className="media-preview">
                <img src={message.file_url} alt={message.file_name} loading="lazy" />
              </div>
            )}
            {isVideo && (
              <div className="media-preview">
                <video controls>
                  <source src={message.file_url} type={message.file_type} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {isVoiceMessage && (
              <div className="media-preview voice-message-preview">
                <WaveSurferPlayer audioUrl={message.file_url} />
              </div>
            )}
            {isMusicFile && (
              <div className="media-preview music-preview">
                <MusicPlayer 
                  audioUrl={message.file_url} 
                  songName={message.file_name} 
                  artist={message.message.includes('🎵') ? message.message.replace('🎵', '').trim() : 'Unknown Artist'} 
                />
              </div>
            )}
            <a href={message.file_url} 
               target="_blank" 
               rel="noopener noreferrer" 
               className="file-link"
               download={message.file_name}>
              {message.message}
            </a>
          </>
   
      </div>
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          await handleVoiceMessageUpload(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingTime(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setRecordingTime(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check your microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const startVideoRecording = async () => {
    try {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      
      setIsVideoRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: true
      });
      
      videoStreamRef.current = stream;
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.error('Error playing video preview:', playError);
          cleanupVideoRecording();
          return;
        }
      } else {
        console.error('Video preview ref not found');
        cleanupVideoRecording();
        return;
      }

      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          if (chunks.length > 0) {
            const videoBlob = new Blob(chunks, { type: 'video/webm' });
            await handleVideoMessageUpload(videoBlob);
          }
        } catch (error) {
          console.error('Error processing video:', error);
          toast.error('Failed to process video. Please try again.');
        } finally {
          cleanupVideoRecording();
        }
      };

      recorder.start();
      setVideoRecorder(recorder);
      setVideoChunks(chunks);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting video recording:', error);
      toast.error(`Camera access failed: ${error.message}. Please check your camera permissions.`);
      cleanupVideoRecording();
    }
  };

  const cleanupVideoRecording = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    setIsVideoRecording(false);
    setVideoRecorder(null);
    setVideoChunks([]);
    setRecordingTime(0);
  };

  const stopVideoRecording = () => {
    try {
      if (videoRecorder && isVideoRecording) {
        videoRecorder.stop();
      }
    } catch (error) {
      console.error('Error stopping video recording:', error);
      cleanupVideoRecording();
    }
  };

  const handleVoiceMessageUpload = async (audioBlob) => {
    if (!currentUser || !selectedUser) return;

    setUploading(true);

    try {
      const fileName = `${currentUser.id}-${Date.now()}.webm`;
      const filePath = `${selectedUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: '🎤 Voice Message',
        file_url: publicUrl,
        file_type: 'audio/webm',
        file_name: 'Voice Message'
      };

      const { error } = await supabase
        .from('chat')
        .insert([messageToSend])
        .select()
        .single();

      if (error) throw error;

    } catch (error) {
      console.error('Error uploading voice message:', error);
      toast.error('Failed to send voice message. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoMessageUpload = async (videoBlob) => {
    if (!currentUser || !selectedUser) return;

    setUploading(true);

    try {
      const fileName = `${currentUser.id}-${Date.now()}.webm`;
      const filePath = `${selectedUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, videoBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: '🎥 Video Message',
        file_url: publicUrl,
        file_type: 'video/webm',
        file_name: 'Video Message'
      };

      const { error } = await supabase
        .from('chat')
        .insert([messageToSend])
        .select()
        .single();

      if (error) throw error;

    } catch (error) {
      console.error('Error uploading video message:', error);
      toast.error('Failed to send video message. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
  };
  
  const createPeerConnection = async () => {
    try {
      const pc = new RTCPeerConnection(servers);
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            from: currentUser.id,
            to: selectedUser.id
          });
        }
      };
      
      pc.onconnectionstatechange = (event) => {
        switch(pc.connectionState) {
          case 'connected':
            console.log('WebRTC connection established');
            setCallState('connected');
            startCallTimer();
            break;
          case 'disconnected':
          case 'failed':
            console.log('WebRTC connection failed or disconnected');
            endCall();
            break;
          case 'closed':
            console.log('WebRTC connection closed');
            endCall();
            break;
        }
      };
      
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        }
      };
      
      peerConnectionRef.current = pc;
      setPeerConnection(pc);
      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      toast.error('Failed to create call connection');
      return null;
    }
  };
  
  const sendSignalingMessage = async (message) => {
    try {
      await supabase.channel('public:call-signals').send({
        type: 'broadcast',
        event: 'call-signal',
        payload: message
      });
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  };
  
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      
      const pc = await createPeerConnection();
      if (!pc) return;
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      sendSignalingMessage({
        type: 'offer',
        offer: pc.localDescription,
        from: currentUser.id,
        to: selectedUser.id
      });
      
      setCallState('outgoing');
      toast.info(`Calling ${selectedUser.username}...`);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call. Please check your microphone permissions.');
      setCallState('idle');
    }
  };
  
  const handleIncomingCall = async (call) => {
    setIncomingCall(call);
    setCallState('incoming');
    toast.info(
      <div>
        <p>Incoming call from {selectedUser.username}</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            onClick={() => acceptCall(call)}
            style={{ padding: '5px 10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Accept
          </button>
          <button 
            onClick={() => rejectCall()}
            style={{ padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Reject
          </button>
        </div>
      </div>,
      { autoClose: false }
    );
  };
  
  const acceptCall = async (call) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      
      const pc = await createPeerConnection();
      if (!pc) return;
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendSignalingMessage({
        type: 'answer',
        answer: pc.localDescription,
        from: currentUser.id,
        to: call.from
      });
      
      setCallState('connected');
      startCallTimer();
      toast.dismiss();
      toast.success(`Call connected with ${selectedUser.username}`);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call. Please check your microphone permissions.');
      rejectCall();
    }
  };
  
  const rejectCall = () => {
    if (incomingCall) {
      sendSignalingMessage({
        type: 'reject',
        from: currentUser.id,
        to: incomingCall.from
      });
    }
    
    cleanupCall();
    toast.dismiss();
  };
  
  const endCall = () => {
    sendSignalingMessage({
      type: 'hangup',
      from: currentUser.id,
      to: selectedUser.id
    });
    
    cleanupCall();
  };
  
  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      setPeerConnection(null);
    }
    
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    setRemoteStream(null);
    setCallState('idle');
    setCallTimer(0);
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsSpeakerOn(true);
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };
  
  const startCallTimer = () => {
    setCallTimer(0);
    callTimerRef.current = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
  };
  
  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const enabled = !isMicMuted;
        audioTracks[0].enabled = enabled;
        setIsMicMuted(!enabled);
      }
    }
  };
  
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!currentUser) return;
    
    const channel = supabase.channel('public:call-signals');
    
    channel.on('broadcast', { event: 'call-signal' }, (payload) => {
      if (!payload || !payload.payload) return;
      
      const signal = payload.payload;
      
      if (signal.to !== currentUser.id) return;
      
      switch (signal.type) {
        case 'offer':
          if (signal.from === selectedUser?.id) {
            handleIncomingCall(signal);
          }
          break;
        case 'answer':
          if (callState === 'outgoing' && peerConnectionRef.current) {
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.answer))
              .then(() => {
                setCallState('connected');
                startCallTimer();
                toast.success(`Call connected with ${selectedUser.username}`);
              })
              .catch(error => {
                console.error('Error setting remote description:', error);
                endCall();
              });
          }
          break;
        case 'ice-candidate':
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .catch(error => console.error('Error adding ICE candidate:', error));
          }
          break;
        case 'reject':
          if (callState === 'outgoing') {
            toast.info(`${selectedUser.username} declined the call`);
            cleanupCall();
          }
          break;
        case 'hangup':
          if (callState === 'connected' || callState === 'incoming' || callState === 'outgoing') {
            toast.info(`Call ended by ${selectedUser.username}`);
            cleanupCall();
          }
          break;
      }
    });
    
    channel.subscribe();
    callChannelRef.current = channel;
    
    return () => {
      if (callChannelRef.current) {
        callChannelRef.current.unsubscribe();
      }
    };
  }, [currentUser, selectedUser, callState]);
  
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  if (!selectedUser) {
    return (
      <div className="chat-window empty">
        <p>Select a user to start chatting</p>
      </div>
    );
  }
  
  return (
    <div className={`chat-window ${isRecording || isVideoRecording ? 'recording-active' : ''} ${callState !== 'idle' ? 'call-active' : ''}`}>
      {!hideHeader && (
        <div className="chat-header">
          <div className="header-left">
            {selectedUser.avatar_url ? (
              <div className="user-avatar" style={{ 
                background: 'none',
                backgroundImage: `url(${selectedUser.avatar_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}></div>
            ) : (
              <div className="user-avatar">
                {selectedUser.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="user-info">
              <h3 className="username">{selectedUser.username}</h3>
              {callState !== 'idle' && (
                <div className="call-status">
                  {callState === 'outgoing' && <span>Calling...</span>}
                  {callState === 'incoming' && <span>Incoming call...</span>}
                  {callState === 'connected' && <span>On call • {formatTime(callTimer)}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="header-right">
            <div className="header-actions">
              <button 
                className={`header-icon-btn ${callState !== 'idle' ? 'active' : ''}`}
                onClick={() => callState === 'idle' ? startCall() : endCall()}
                title={callState === 'idle' ? "Start Audio Call" : "End Call"}
              >
                {callState === 'idle' ? <AudioCallIcon /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4136" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                    <line x1="23" y1="1" x2="1" y2="23"></line>
                  </svg>
                )}
              </button>
              <button 
                className="header-icon-btn"
                onClick={() => {/* TODO: Implement video call */}}
                title="Video Call"
                disabled={callState !== 'idle'}
              >
                <VideoCallIcon />
              </button>
              <button 
                className="media-btn"
                onClick={handleMediaGalleryToggle}
                title="View Media"
              >
                <MediaIcon />
              </button>
            </div>
            <div className="search-container">
              <div className="search-icon">
                {searchText ? (
                  <button 
                    className="clear-search" 
                    onClick={() => setSearchText('')}
                  >
                    <CloseIcon />
                  </button>
                ) : (
                  <SearchIcon />
                )}
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search messages..."
                className="search-input"
              />
            </div>
          </div>
        </div>
      )}

      {callState === 'connected' && (
        <div className="call-controls">
          <div className="call-timer">{formatTime(callTimer)}</div>
          <div className="call-actions">
            <button 
              className={`call-action-btn ${isMicMuted ? 'muted' : ''}`}
              onClick={toggleMic}
              title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMicMuted ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              )}
            </button>
            <button 
              className="call-action-btn end-call"
              onClick={endCall}
              title="End Call"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.79 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                <line x1="23" y1="1" x2="1" y2="23"></line>
              </svg>
            </button>
            <button 
              className={`call-action-btn ${!isSpeakerOn ? 'muted' : ''}`}
              onClick={toggleSpeaker}
              title={isSpeakerOn ? "Turn Speaker Off" : "Turn Speaker On"}
            >
              {isSpeakerOn ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {callState === 'incoming' && (
        <div className="incoming-call-container">
          <div className="incoming-call">
            <h3>Incoming Call</h3>
            <p>{selectedUser.username} is calling you</p>
            <div className="call-actions">
              <button 
                className="call-action-btn accept-call"
                onClick={() => acceptCall(incomingCall)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Accept</span>
              </button>
              <button 
                className="call-action-btn reject-call"
                onClick={rejectCall}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M16.72 16.72A10.88 10.88 0 0 1 12 18c-2.73 0-5.14-1-7.04-2.72M3.34 7.5A10.95 10.95 0 0 0 2 12c0 2.73 1 5.14 2.72 7.04"></path>
                </svg>
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }}></audio>
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }}></audio>

      {showMediaGallery && (
        <div className="media-gallery">
          <div className="gallery-header">
            <h3>Media Gallery</h3>
            <button 
              className="close-gallery"
              onClick={() => setShowMediaGallery(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                color: '#64748b',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="gallery-search">
            <div className="search-icon">
              {mediaSearchText ? (
                <button 
                  className="clear-search" 
                  onClick={() => setMediaSearchText('')}
                >
                  <CloseIcon />
                </button>
              ) : (
                <SearchIcon />
              )}
            </div>
            <input
              type="text"
              value={mediaSearchText}
              onChange={(e) => setMediaSearchText(e.target.value)}
              placeholder="Search media..."
              className="search-input"
            />
          </div>
          <div className="gallery-content">
            {filteredMediaFiles.length > 0 ? (
              <div className="media-grid">
                {filteredMediaFiles.map((file, index) => (
                  <div key={index} className="media-item">
                    {file.type === 'image' && (
                      <>
                        <img 
                          src={file.file_url} 
                          alt={file.file_name}
                          onClick={() => window.open(file.file_url, '_blank')}
                        />
                        <span className="file-name">{file.file_name}</span>
                      </>
                    )}
                    {file.type === 'video' && (
                      <>
                        <video 
                          src={file.file_url}
                          onClick={() => window.open(file.file_url, '_blank')}
                        />
                        <span className="file-name">{file.file_name}</span>
                      </>
                    )}
                    {file.type === 'audio' && (
                      <div className="audio-item">
                        {file.message === '🎤 Voice Message' ? (
                          <WaveSurferPlayer audioUrl={file.file_url} />
                        ) : (
                          <MusicPlayer 
                            audioUrl={file.file_url} 
                            songName={file.file_name} 
                            artist={file.message.includes('🎵') ? file.message.replace('🎵', '').trim() : 'Unknown Artist'} 
                          />
                        )}
                        <span>{file.file_name}</span>
                      </div>
                    )}
                    {file.type === 'file' && (
                      <div className="file-item">
                        <a 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          download={file.file_name}
                        >
                          {file.message}
                        </a>
                        <span className="file-name">{file.file_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-media">
                <p>No media files found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isVideoRecording && (
        <div 
          className="video-preview-container"
          style={{
            position: 'fixed',
            bottom: isMobileDevice ? '140px' : '80px',
            right: isMobileDevice ? '10px' : '20px',
            width: isMobileDevice ? '160px' : '320px',
            height: isMobileDevice ? '120px' : '240px',
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            zIndex: 1000,
            border: '2px solid #3a7bfd'
          }}
        >
          <video 
            ref={videoPreviewRef} 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            autoPlay 
            playsInline 
            muted
          />
          <div className="recording-indicator"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '4px 8px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span className="recording-dot"></span>
            <span className="recording-time"
              style={{
                color: 'white',
                fontSize: isMobileDevice ? '10px' : '12px'
              }}
            >
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      <div className="messages-container">
        {(isSearching ? filteredMessages : messages).map((message) => (
          <div
            key={message.id || message.created_at}
            className={`message ${message.sender_id === currentUser?.id ? 'sent' : 'received'} ${
              actualSearchText && 
              (message.message?.toLowerCase().includes(actualSearchText.toLowerCase()) ||
               message.file_name?.toLowerCase().includes(actualSearchText.toLowerCase()))
                ? 'highlighted'
                : ''
            }`}
          >
            <div className="message-content">
              {renderMessageContent(message)}
              <span className="message-time">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input" style={{ 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: isMobileDevice ? '8px' : '12px',
        gap: isMobileDevice ? '8px' : '12px'
      }}>
        <div className="attachment-container" ref={attachmentMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="attachment-btn"
            disabled={uploading || isRecording || isVideoRecording}
          >
            {uploading ? '⏳' : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>}
          </button>
          
          {showAttachmentMenu && (
            <div className="attachment-menu">
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = '*/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">📄</span>
                <span className="attachment-label">Document</span>
              </div>
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">🖼️</span>
                <span className="attachment-label">Photos</span>
              </div>
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'video/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">🎥</span>
                <span className="attachment-label">Videos</span>
              </div>
              <div className="attachment-option" onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'audio/*';
                  fileInputRef.current.click();
                }
              }}>
                <span className="attachment-icon">🎵</span>
                <span className="attachment-label">Audio</span>
              </div>
            </div>
          )}
        </div>
        
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
          className="message-input-field"
          disabled={isRecording || isVideoRecording}
          style={{
            flex: 1,
            padding: isMobileDevice ? '8px' : '12px',
            fontSize: isMobileDevice ? '14px' : '16px'
          }}
        />

        <button
          type="button"
          className={`video-btn video-record-btn ${isVideoRecording ? 'recording' : ''}`}
          title={isVideoRecording ? "Release to stop recording" : "Hold to record video"}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isVideoRecording && !uploading && !isRecording) {
              startVideoRecording();
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isVideoRecording) {
              stopVideoRecording();
            }
          }}
          onMouseDown={(e) => {
            if (!isMobileDevice && !isVideoRecording && !uploading && !isRecording) {
              e.preventDefault();
              startVideoRecording();
            }
          }}
          onMouseUp={(e) => {
            if (!isMobileDevice && isVideoRecording) {
              e.preventDefault();
              stopVideoRecording();
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobileDevice && isVideoRecording) {
              e.preventDefault();
              stopVideoRecording();
            }
          }}
          disabled={uploading || isRecording}
          style={{
            width: isMobileDevice ? '32px' : '40px',
            height: isMobileDevice ? '32px' : '40px',
            padding: isMobileDevice ? '4px' : '8px'
          }}
        >
          {isVideoRecording ? (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span className="recording-time" style={{ fontSize: isMobileDevice ? '10px' : '12px' }}>
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`voice-btn voice-record-btn ${isRecording ? 'recording' : ''}`}
          title={isRecording ? "Release to stop recording" : "Hold to record voice"}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isRecording && !uploading && !isVideoRecording) {
              startRecording();
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isRecording) {
              stopRecording();
            }
          }}
          onMouseDown={(e) => {
            if (!isMobileDevice && !isRecording && !uploading && !isVideoRecording) {
              e.preventDefault();
              startRecording();
            }
          }}
          onMouseUp={(e) => {
            if (!isMobileDevice && isRecording) {
              e.preventDefault();
              stopRecording();
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobileDevice && isRecording) {
              e.preventDefault();
              stopRecording();
            }
          }}
          disabled={uploading || isVideoRecording}
          style={{
            width: isMobileDevice ? '32px' : '40px',
            height: isMobileDevice ? '32px' : '40px',
            padding: isMobileDevice ? '4px' : '8px'
          }}
        >
          {isRecording ? (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span className="recording-time" style={{ fontSize: isMobileDevice ? '10px' : '12px' }}>
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button 
          type="submit" 
          className="send-button" 
          disabled={(!newMessage.trim() && !uploading) || isRecording || isVideoRecording}
          style={{
            padding: isMobileDevice ? '8px 12px' : '12px 16px',
            fontSize: isMobileDevice ? '14px' : '16px'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;