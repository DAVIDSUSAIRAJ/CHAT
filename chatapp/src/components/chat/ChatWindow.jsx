import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { supabase, createRealtimeChannel } from "../../lib/supabaseClient";
import { toast } from "react-toastify";
import "../../styles/chat.css"; /* Voice button custom styles */
import WaveSurferPlayer from "./WaveSurferPlayer";
import MusicPlayer from "./MusicPlayer";

const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const MediaIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const AudioCallIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.999.999 0 0 0-1.03.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02c-.37-1.11-.56-2.3-.56-3.53c0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
  </svg>
);

const VideoCallIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const MicIcon = ({ muted }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {muted ? (
      <>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    )}
  </svg>
);

const CameraIcon = ({ enabled }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {enabled ? (
      <>
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </>
    ) : (
      <>
        <path d="M1 1l22 22M21 21H7a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z" />
      </>
    )}
  </svg>
);

const EndCallIcon = () => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.79 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
  </svg>
);

// Add these debug helper functions at the top
const debugLog = (component, action, details = null) => {
  const timestamp = new Date().toISOString().split('T')[1];
  console.log(`[${timestamp}][${component}] ${action}`, details || '');
};

const checkMediaDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudio = devices.some(device => device.kind === 'audioinput');
    const hasVideo = devices.some(device => device.kind === 'videoinput');
    
    debugLog('Devices', 'Available devices', {
      audio: hasAudio ? 'Yes' : 'No',
      video: hasVideo ? 'Yes' : 'No',
      devices: devices.map(d => ({ kind: d.kind, label: d.label }))
    });
    
    return { hasAudio, hasVideo };
  } catch (error) {
    debugLog('Devices', 'Error checking devices', error);
    return { hasAudio: false, hasVideo: false };
  }
};

const checkStreamTracks = (stream, context) => {
  if (!stream) {
    debugLog('Stream', `${context} - No stream available`);
    return;
  }

  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();

  debugLog('Stream', `${context} - Tracks`, {
    audio: audioTracks.map(track => ({
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState
    })),
    video: videoTracks.map(track => ({
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState
    }))
  });
};

// Add this near the top of your file
const getICEServers = () => {
  return {
    iceServers: [
      // STUN Servers - help with NAT traversal
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
          // Additional STUN servers for better connectivity
          "stun:stun.stunprotocol.org:3478",
          "stun:stun.voip.blackberry.com:3478",
          "stun:stun.nextcloud.com:443"
        ],
      },
      // TURN Servers - fallback when STUN fails
      {
        urls: [
          "turn:david_chat_app.metered.live:80",
          "turn:david_chat_app.metered.live:80?transport=tcp",
          "turn:david_chat_app.metered.live:443",
          "turn:david_chat_app.metered.live:443?transport=tcp"
        ],
        username: "9ApdwHtYqVPC-81Ue3rnw7FVV7TNzaHtFZt95-ygbAJE8MyJt",
        credential: "9ApdwHtYqVPC-81Ue3rnw7FVV7TNzaHtFZt95-ygbAJE8MyJt",
        credentialType: "password"
      }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all', // Try 'relay' if still having issues
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
};

const ChatWindow = forwardRef(({
  selectedUser,
  hideHeader,
  showMediaGallery = false,
  setShowMediaGallery,
  searchText: externalSearchText,
  setSearchText: externalSetSearchText,
  isMobileView,
}, ref) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [mediaSearchText, setMediaSearchText] = useState("");
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [filteredMediaFiles, setFilteredMediaFiles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [callState, setCallState] = useState("idle");
  const [callTimer, setCallTimer] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [filePreview, setFilePreview] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [audioToUpload, setAudioToUpload] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoToUpload, setVideoToUpload] = useState(null);
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
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  // Add this state to track if we have a pending remote stream
  const [pendingRemoteStream, setPendingRemoteStream] = useState(null);

  const actualSearchText = isMobileView ? externalSearchText : searchText;
  const actualSetSearchText = isMobileView
    ? externalSetSearchText
    : setSearchText;

  const handleMediaGalleryToggle = () => {
    setShowMediaGallery(!showMediaGallery);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 767);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    fetchCurrentUser();
  }, []);

  const fetchMessages = async () => {
    if (!selectedUser || !currentUser) return;

    const { data, error } = await supabase
      .from("chat")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true });

    if (error) return;
    setMessages(data || []);
  };

  const setupChannelWithRetry = async (
    userId,
    targetUserId,
    onMessageReceived,
    maxRetries = 3
  ) => {
    let channel = null;
    let attempts = 0;

    while (attempts < maxRetries && !channel) {
      attempts++;

      try {
        // Create channel
        channel = await createRealtimeChannel("public:chat", {
          userId: userId,
          targetUserId: targetUserId,
        });

        if (!channel) {
          if (attempts < maxRetries) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          continue;
        }

        // Set up subscription
        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "chat",
            },
            onMessageReceived
          )
          .subscribe();
      } catch (error) {
        channel = null;

        if (attempts < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // If all connection attempts fail, fall back to polling
    if (!channel) {
      const pollInterval = setInterval(fetchMessages, 3000);

      return {
        unsubscribe: () => {
          clearInterval(pollInterval);
        },
      };
    }

    return channel;
  };

  // Safe unsubscribe helper
  const safeUnsubscribe = (subscription) => {
    if (!subscription) return;

    try {
      if (typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    } catch (error) {
      // Silently handle unsubscribe errors
    }
  };

  // Modify the useEffect to properly track selectedUser changes
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    // IMPORTANT: Reset subscription reference when selectedUser changes
    // This prevents unsubscribe errors when switching users
    subscriptionRef.current = null;

    // Fetch current messages
    fetchMessages();

    // Create a reference to track if the component is mounted
    let isMounted = true;

    // Define message handler to avoid code duplication
    const handleMessage = async (payload) => {
      if (!payload.new || !payload.new.id) return;

      const newMessage = payload.new;
      const isRelevantMessage =
        (newMessage.sender_id === currentUser.id &&
          newMessage.receiver_id === selectedUser.id) ||
        (newMessage.sender_id === selectedUser.id &&
          newMessage.receiver_id === currentUser.id);

      if (isRelevantMessage) {
        setMessages((prevMessages) => {
          const messageExists = prevMessages.some(
            (msg) => msg.id === newMessage.id
          );
          if (messageExists) return prevMessages;
          return [...prevMessages, newMessage];
        });
      }
    };

    // Use the improved retry mechanism
    const setup = async () => {
      const channel = await setupChannelWithRetry(
        currentUser.id,
        selectedUser.id,
        handleMessage
      );

      if (channel && isMounted) {
        subscriptionRef.current = channel;
      } else if (isMounted) {
        // Create a simple polling fallback
        const pollMessages = async () => {
          if (!isMounted) return;

          try {
            await fetchMessages();
          } catch (error) {
            // Silently handle errors
          }

          if (isMounted) {
            // Continue polling
            setTimeout(pollMessages, 3000);
          }
        };

        // Start polling
        pollMessages();

        // Store cleanup function
        subscriptionRef.current = {
          unsubscribe: () => {
            isMounted = false;
          },
          isPollingFallback: true,
        };
      }
    };

    // Start the setup process
    setup();

    // Cleanup
    return () => {
      isMounted = false;

      // Use our safe unsubscribe helper
      safeUnsubscribe(subscriptionRef.current);

      // Clear the ref to prevent double cleanup attempts
      subscriptionRef.current = null;
    };
  }, [selectedUser, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (
      (!newMessage.trim() &&
        !fileToUpload &&
        !audioToUpload &&
        !videoToUpload) ||
      !selectedUser ||
      !currentUser
    )
      return;

    try {
      let messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: newMessage.trim(),
      };

      // Handle file upload to Supabase if there's a file pending
      if (fileToUpload) {
        setUploading(true);

        try {
          const file = fileToUpload;
          const fileExt = file.name.split(".").pop();
          const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
          const filePath = `${selectedUser.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-files")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("chat-files").getPublicUrl(filePath);

          let fileTypeIcon = "📎";
          let messageText = newMessage.trim() || `${fileTypeIcon} ${file.name}`;

          if (file.type.startsWith("image/")) {
            fileTypeIcon = "🖼️";
            messageText = newMessage.trim() || `${fileTypeIcon} ${file.name}`;
          } else if (file.type.startsWith("video/")) {
            fileTypeIcon = "🎥";
            messageText = newMessage.trim() || `${fileTypeIcon} ${file.name}`;
          } else if (file.type.startsWith("audio/")) {
            const musicExtensions = ["mp3", "wav", "ogg", "m4a", "flac"];
            if (musicExtensions.includes(fileExt.toLowerCase())) {
              fileTypeIcon = "🎵";
              const nameParts = file.name.split("-");
              if (nameParts.length > 1 && !newMessage.trim()) {
                const artist = nameParts[0].trim();
                const title = nameParts
                  .slice(1)
                  .join("-")
                  .replace(`.${fileExt}`, "")
                  .trim();
                messageText = `${fileTypeIcon} ${artist} - ${title}`;
              } else {
                messageText =
                  newMessage.trim() || `${fileTypeIcon} ${file.name}`;
              }
            } else {
              fileTypeIcon = "🔊";
              messageText = newMessage.trim() || `${fileTypeIcon} ${file.name}`;
            }
          } else if (file.type.includes("pdf")) {
            fileTypeIcon = "📄";
            messageText = newMessage.trim() || `${fileTypeIcon} ${file.name}`;
          } else if (file.type.includes("document")) {
            fileTypeIcon = "📝";
            messageText = newMessage.trim() || `${fileTypeIcon} ${file.name}`;
          }

          messageToSend = {
            ...messageToSend,
            message: messageText,
            file_url: publicUrl,
            file_type: file.type,
            file_name: file.name,
          };
        } catch (error) {
          toast.error("Failed to upload file. Please try again.");
          console.error("Upload error:", error);
          setUploading(false);
          return;
        }
      }

      // Handle audio upload if there's audio recording pending
      if (audioToUpload) {
        setUploading(true);

        try {
          const fileName = `${currentUser.id}-${Date.now()}.webm`;
          const filePath = `${selectedUser.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-files")
            .upload(filePath, audioToUpload);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("chat-files").getPublicUrl(filePath);

          messageToSend = {
            ...messageToSend,
            message: newMessage.trim() || "🎤 Voice Message",
            file_url: publicUrl,
            file_type: "audio/webm",
            file_name: "Voice Message",
          };
        } catch (error) {
          toast.error("Failed to upload voice message. Please try again.");
          console.error("Audio upload error:", error);
          setUploading(false);
          return;
        }
      }

      // Handle video upload if there's video recording pending
      if (videoToUpload) {
        setUploading(true);

        try {
          const fileName = `${currentUser.id}-${Date.now()}.webm`;
          const filePath = `${selectedUser.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-files")
            .upload(filePath, videoToUpload);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("chat-files").getPublicUrl(filePath);

          messageToSend = {
            ...messageToSend,
            message: newMessage.trim() || "🎥 Video Message",
            file_url: publicUrl,
            file_type: "video/webm",
            file_name: "Video Message",
          };
        } catch (error) {
          toast.error("Failed to upload video message. Please try again.");
          console.error("Video upload error:", error);
          setUploading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("chat")
        .insert([messageToSend])
        .select()
        .single();

      if (error) {
        toast.error("Failed to send message. Please try again.");
        return;
      }

      setNewMessage("");
      setFilePreview(null);
      setFileToUpload(null);
      setAudioPreview(null);
      setAudioToUpload(null);
      setVideoPreview(null);
      setVideoToUpload(null);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error("File size should be less than 30MB");
      return;
    }

    setShowAttachmentMenu(false);

    try {
      // Create preview
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview({
            type: "image",
            url: e.target.result,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview({
            type: "video",
            url: e.target.result,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("audio/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview({
            type: "audio",
            url: e.target.result,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      } else {
        // For other file types
        setFilePreview({
          type: "file",
          name: file.name,
          size: (file.size / 1024).toFixed(2) + " KB",
        });
      }

      // Store file for later upload when send button is clicked
      setFileToUpload(file);
    } catch (error) {
      toast.error("Failed to preview file. Please try again.");
      console.error("Preview error:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(event.target)
      ) {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
    const filtered = messages.filter(
      (message) =>
        message.message?.toLowerCase().includes(searchLower) ||
        message.file_name?.toLowerCase().includes(searchLower)
    );
    setFilteredMessages(filtered);
  }, [actualSearchText, messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const media = messages
        .filter((msg) => msg.file_url)
        .map((msg) => ({
          ...msg,
          type: msg.file_type?.startsWith("image/")
            ? "image"
            : msg.file_type?.startsWith("video/")
            ? "video"
            : msg.file_type?.startsWith("audio/")
            ? "audio"
            : "file",
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
    const filtered = mediaFiles.filter(
      (file) =>
        file.message?.toLowerCase().includes(searchLower) ||
        file.file_name?.toLowerCase().includes(searchLower)
    );
    setFilteredMediaFiles(filtered);
  }, [mediaSearchText, mediaFiles]);

  const renderMessageContent = (message) => {
    if (!message.file_url) {
      return <p>{message.message}</p>;
    }

    const isImage = message.file_type?.startsWith("image/");
    const isVideo = message.file_type?.startsWith("video/");
    const isAudio = message.file_type?.startsWith("audio/");
    const isVoiceMessage = isAudio && message.message === "🎤 Voice Message";
    const isMusicFile = isAudio && !isVoiceMessage;

    return (
      <div className="file-message">
        <>
          {isImage && (
            <div className="media-preview">
              <img
                src={message.file_url}
                alt={message.file_name}
                loading="lazy"
              />
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
                artist={
                  message.message.includes("🎵")
                    ? message.message.replace("🎵", "").trim()
                    : "Unknown Artist"
                }
              />
            </div>
          )}
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="file-link"
            download={message.file_name}
          >
            {message.message}
          </a>
        </>
      </div>
    );
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
      console.error("Error stopping recording:", error);
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const startVideoRecording = async () => {
    try {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
        videoStreamRef.current = null;
      }

      setIsVideoRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: true,
      });

      videoStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;

        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.error("Error playing video preview:", playError);
          cleanupVideoRecording();
          return;
        }
      } else {
        console.error("Video preview ref not found");
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
            const videoBlob = new Blob(chunks, { type: "video/webm" });

            // Create a preview URL and save the blob for later upload
            const videoURL = URL.createObjectURL(videoBlob);
            setVideoPreview(videoURL);
            setVideoToUpload(videoBlob);

            // Clear the recording UI
            if (videoStreamRef.current) {
              videoStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());
            }

            if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = null;
            }
          }
        } catch (error) {
          console.error("Error processing video:", error);
          toast.error("Failed to process video. Please try again.");
        } finally {
          setIsVideoRecording(false);
          setRecordingTime(0);
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
          }
        }
      };

      recorder.start();
      setVideoRecorder(recorder);
      setVideoChunks(chunks);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting video recording:", error);
      toast.error(
        `Camera access failed: ${error.message}. Please check your camera permissions.`
      );
      cleanupVideoRecording();
    }
  };

  const cleanupVideoRecording = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
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
      console.error("Error stopping video recording:", error);
      cleanupVideoRecording();
    }
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
          const audioBlob = new Blob(chunks, { type: "audio/webm" });

          // Create a preview URL and save the blob for later upload
          const audioURL = URL.createObjectURL(audioBlob);
          setAudioPreview(audioURL);
          setAudioToUpload(audioBlob);
        }
        stream.getTracks().forEach((track) => track.stop());
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
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error(
        "Failed to start recording. Please check your microphone permissions."
      );
      setIsRecording(false);
    }
  };

  const handleVoiceMessageUpload = async (audioBlob) => {
    if (!currentUser || !selectedUser) return;

    setUploading(true);

    try {
      const fileName = `${currentUser.id}-${Date.now()}.webm`;
      const filePath = `${selectedUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(filePath);

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: "🎤 Voice Message",
        file_url: publicUrl,
        file_type: "audio/webm",
        file_name: "Voice Message",
      };

      const { error } = await supabase
        .from("chat")
        .insert([messageToSend])
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error("Error uploading voice message:", error);
      toast.error("Failed to send voice message. Please try again.");
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
        .from("chat-files")
        .upload(filePath, videoBlob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-files").getPublicUrl(filePath);

      const messageToSend = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        message: "🎥 Video Message",
        file_url: publicUrl,
        file_type: "video/webm",
        file_name: "Video Message",
      };

      const { error } = await supabase
        .from("chat")
        .insert([messageToSend])
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error("Error uploading video message:", error);
      toast.error("Failed to send video message. Please try again.");
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
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const servers = getICEServers();

  const createPeerConnection = async () => {
    try {
      debugLog('PeerConnection', 'Creating new connection');
      const pc = new RTCPeerConnection(servers);
      console.log(pc,"pcConnetion")
      
      // Buffer for ICE candidates received before remote description is set
      const iceCandidatesBuffer = [];
      let hasRemoteDescription = false;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          debugLog('ICE', 'New ICE candidate', event.candidate);
          sendSignalingMessage({
            type: "ice-candidate",
            candidate: event.candidate,
            from: currentUser.id,
            to: selectedUser.id,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        debugLog('ICE', 'Connection state changed', pc.iceConnectionState);
        switch(pc.iceConnectionState) {
          case 'checking':
            debugLog('ICE', 'Connecting...');
            break;
          case 'connected':
            debugLog('ICE', 'Connected');
            break;
          case 'failed':
            debugLog('ICE', 'Connection failed - attempting restart');
            pc.restartIce();
            break;
          case 'disconnected':
            debugLog('ICE', 'Disconnected - checking connection');
            // Attempt to recover from disconnected state
            setTimeout(() => {
              if (pc.iceConnectionState === 'disconnected') {
                pc.restartIce();
              }
            }, 3000);
            break;
        }
      };

      // Add method to handle buffered candidates
      pc.addBufferedCandidates = async () => {
        if (!hasRemoteDescription) return;
        
        debugLog('ICE', `Processing ${iceCandidatesBuffer.length} buffered candidates`);
        while (iceCandidatesBuffer.length > 0) {
          const candidate = iceCandidatesBuffer.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            debugLog('ICE', 'Successfully added buffered candidate');
          } catch (error) {
            debugLog('ICE', 'Error adding buffered candidate', error);
          }
        }
      };

      // Add method to handle new ICE candidates
      pc.handleIceCandidate = async (candidate) => {
        try {
          if (!hasRemoteDescription) {
            debugLog('ICE', 'Buffering ICE candidate until remote description is set');
            iceCandidatesBuffer.push(candidate);
            return;
          }

          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          debugLog('ICE', 'Successfully added ICE candidate');
        } catch (error) {
          debugLog('ICE', 'Error adding ICE candidate', error);
          // If we get an error, buffer the candidate for retry
          iceCandidatesBuffer.push(candidate);
        }
      };

      // Add method to set remote description
      pc.setRemoteDescriptionAsync = async (description) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(description));
          hasRemoteDescription = true;
          debugLog('PeerConnection', 'Remote description set successfully');
          await pc.addBufferedCandidates();
        } catch (error) {
          debugLog('PeerConnection', 'Error setting remote description', error);
          throw error;
        }
      };

      pc.ontrack = (event) => {
        debugLog('Track', 'Received remote track', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          muted: event.track.muted
        });

        if (event.streams && event.streams[0]) {
          const remoteMediaStream = event.streams[0];
          debugLog('Stream', 'Received remote stream', {
            active: remoteMediaStream.active,
            id: remoteMediaStream.id,
            trackCount: remoteMediaStream.getTracks().length
          });
          
          // Log all tracks in the stream
          remoteMediaStream.getTracks().forEach(track => {
            debugLog('Stream Track', {
              kind: track.kind,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted
            });
          });
          
          checkStreamTracks(remoteMediaStream, 'Remote Stream');
          setRemoteStream(remoteMediaStream);
          setPendingRemoteStream(remoteMediaStream);

          // Handle audio stream
          if (remoteAudioRef.current) {
            debugLog('Audio', 'Setting remote audio');
            remoteAudioRef.current.srcObject = remoteMediaStream;
          }
        }
      };

      pc.onconnectionstatechange = () => {
        debugLog('PeerConnection', 'Connection state changed', pc.connectionState);
        switch (pc.connectionState) {
          case "connected":
            debugLog('Call', 'Connection established');
            setCallState("connected");
            startCallTimer();
            break;
          case "disconnected":
          case "failed":
            debugLog('Call', 'Connection failed or disconnected');
            toast.error("Call connection lost");
            endCall();
            break;
          case "closed":
            debugLog('Call', 'Connection closed');
            endCall();
            break;
        }
      };

      peerConnectionRef.current = pc;
      setPeerConnection(pc);
      return pc;
    } catch (error) {
      debugLog('PeerConnection', 'Error creating connection', error);
      toast.error("Failed to create call connection");
      return null;
    }
  };

  const sendSignalingMessage = async (message) => {
    try {
      await supabase.channel("public:call-signals").send({
        type: "broadcast",
        event: "call-signal",
        payload: message,
      });
    } catch (error) {
      console.error("Error sending signaling message:", error);
    }
  };

  const startCall = async (withVideo = false) => {
    try {
      debugLog('Call', 'Starting call', { withVideo });
      
      // Check available devices first
      const { hasAudio, hasVideo } = await checkMediaDevices();
      if (!hasAudio) {
        throw new Error("No microphone found. Please check your audio device.");
      }
      if (withVideo && !hasVideo) {
        throw new Error("No camera found. Please check your video device.");
      }

      // Clean up any existing call state
      await cleanupCall();

      setIsVideoCall(withVideo);
      setCallState("outgoing");
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 }
        },
        video: withVideo ? {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        } : false
      };

      debugLog('Media', 'Requesting media with constraints', constraints);
      
      // Add retry logic for getting user media
      let stream;
      let retries = 3;
      while (retries > 0) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          debugLog('Media', `Failed to get media, retrying... (${retries} attempts left)`, err);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!stream) {
        throw new Error("Failed to get media stream after retries");
      }

      debugLog('Media', 'Got local stream');
      checkStreamTracks(stream, 'Local Stream');
      setLocalStream(stream);

      if (withVideo && localVideoRef.current) {
        debugLog('Video', 'Setting up local video preview');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(err => {
          debugLog('Video', 'Error playing local video', err);
          toast.error("Failed to display local video preview");
        });
      }

      const pc = await createPeerConnection();
      if (!pc) {
        throw new Error("Failed to create peer connection");
      }

      stream.getTracks().forEach(track => {
        debugLog('PeerConnection', `Adding ${track.kind} track`);
        pc.addTrack(track, stream);
      });

      debugLog('PeerConnection', 'Creating offer');
      const offer = await pc.createOffer();
      debugLog('PeerConnection', 'Setting local description');
      await pc.setLocalDescription(offer);

      sendSignalingMessage({
        type: "offer",
        offer: pc.localDescription,
        from: currentUser.id,
        to: selectedUser.id,
        isVideoCall: withVideo,
      });

      toast.info(`${withVideo ? 'Video' : 'Audio'} calling ${selectedUser.username}...`);
    } catch (error) {
      debugLog('Call', 'Error in startCall', error);
      toast.error(`Failed to start call: ${error.message}`);
      await cleanupCall();
    }
  };

  const handleIncomingCall = async (call) => {
    setIncomingCall(call);
    setIsVideoCall(call.isVideoCall || false);
    setCallState("incoming");
    toast.info(
      <div>
        <p>Incoming {call.isVideoCall ? 'video' : 'audio'} call from {selectedUser.username}</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={() => acceptCall(call)}
            style={{
              padding: "5px 10px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Accept
          </button>
          <button
            onClick={() => rejectCall()}
            style={{
              padding: "5px 10px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Reject
          </button>
        </div>
      </div>,
      { autoClose: false }
    );
  };

  const cleanupCall = async () => {
    debugLog('Cleanup', 'Starting call cleanup');
    
    // Force stop any existing MediaStreamTracks
    try {
      const allTracks = [];
      
      // Get all tracks from local stream
      if (localStream) {
        debugLog('Cleanup', 'Stopping local stream tracks');
        allTracks.push(...localStream.getTracks());
      }
      
      // Get all tracks from remote stream
      if (remoteStream) {
        debugLog('Cleanup', 'Stopping remote stream tracks');
        allTracks.push(...remoteStream.getTracks());
      }
      
      // Get any other active tracks that might be hanging
      const devices = await navigator.mediaDevices.enumerateDevices();
      for (const device of devices) {
        if (device.label) { // If we have a label, the device is active
          debugLog('Cleanup', `Found active device: ${device.kind} - ${device.label}`);
        }
      }

      // Stop all tracks
      for (const track of allTracks) {
        try {
          track.enabled = false;
          track.stop();
          debugLog('Cleanup', `Stopped track: ${track.kind}`);
        } catch (err) {
          debugLog('Cleanup', `Error stopping track: ${track.kind}`, err);
        }
      }
    } catch (err) {
      debugLog('Cleanup', 'Error during track cleanup', err);
    }

    // Clear stream references
    setLocalStream(null);
    setRemoteStream(null);

    // Close and cleanup peer connection
    if (peerConnectionRef.current) {
      debugLog('Cleanup', 'Closing peer connection');
      try {
        peerConnectionRef.current.close();
      } catch (err) {
        debugLog('Cleanup', 'Error closing peer connection', err);
      }
      peerConnectionRef.current = null;
      setPeerConnection(null);
    }

    // Clear all video/audio elements
    if (localAudioRef.current) {
      debugLog('Cleanup', 'Clearing local audio');
      localAudioRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      debugLog('Cleanup', 'Clearing remote audio');
      remoteAudioRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      debugLog('Cleanup', 'Clearing local video');
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      debugLog('Cleanup', 'Clearing remote video');
      remoteVideoRef.current.srcObject = null;
    }

    // Reset all state
    setCallState("idle");
    setCallTimer(0);
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsSpeakerOn(true);
    setIsVideoCall(false);
    setIsCameraOn(true);

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Force a garbage collection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    debugLog('Cleanup', 'Call cleanup completed');
  };

  const acceptCall = async (call) => {
    try {
      debugLog('Call', 'Starting call acceptance');
      
      // Ensure thorough cleanup first
      await cleanupCall();
      
      setIsVideoCall(call.isVideoCall);
      if(call.isVideoCall){
        setCallState("connected");
      }
      debugLog('Call', 'Accepting call with video:', call.isVideoCall);

      // Check device availability first
      const { hasAudio, hasVideo } = await checkMediaDevices();
      if (!hasAudio) {
        throw new Error("No microphone found");
      }

      // If video is requested but not available, we'll fall back to audio
      let shouldUseVideo = call.isVideoCall && hasVideo;
      if (call.isVideoCall && !hasVideo) {
        debugLog('Media', 'Video device not available, falling back to audio only');
        toast.info("Camera not available. Continuing with audio only.");
        setIsVideoCall(false);
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 }
        },
        video: shouldUseVideo ? {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        } : false
      };

      debugLog('Media', 'Requesting media with constraints', constraints);
      
      // Enhanced retry logic for getting user media
      let stream;
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          // Force release any potentially held devices
          const devices = await navigator.mediaDevices.enumerateDevices();
          for (const device of devices) {
            if (device.label) {
              debugLog('Media', `Found active device before retry: ${device.kind} - ${device.label}`);
            }
          }

          stream = await navigator.mediaDevices.getUserMedia(constraints);
          debugLog('Media', 'Successfully acquired media stream');
          break;
        } catch (err) {
          lastError = err;
          retries--;
          
          // If we failed with video, try falling back to audio-only
          if (shouldUseVideo && retries > 0) {
            debugLog('Media', 'Failed with video, trying audio-only fallback');
            shouldUseVideo = false;
            constraints.video = false;
            setIsVideoCall(false);
            continue;
          }
          
          // Provide specific error messages
          let errorMessage = "Failed to access media devices";
          if (err.name === "NotReadableError" || err.name === "AbortError") {
            errorMessage = "Device is busy or in use by another application. Please close other apps using your camera/microphone.";
          } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            errorMessage = "Permission to use camera/microphone was denied. Please check your browser permissions.";
          } else if (err.name === "NotFoundError") {
            errorMessage = "No camera/microphone found. Please check your device connections.";
          }
          
          debugLog('Media', `${errorMessage} (${retries} attempts left)`, err);
          
          if (retries === 0) {
            throw new Error(errorMessage);
          }
          
          // Longer delay between retries
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to force cleanup between attempts
          await cleanupCall();
        }
      }

      if (!stream) {
        throw lastError || new Error("Failed to get media stream after retries");
      }

      debugLog('Media', 'Got local stream');
      checkStreamTracks(stream, 'Local Stream');
      setLocalStream(stream);
      console.log(shouldUseVideo,"shouldUseVideo")
      console.log(localVideoRef.current,"localVideoRef.current")

      if (shouldUseVideo && localVideoRef.current) {
        debugLog('Video', 'Setting up local video preview');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(err => {
          debugLog('Video', 'Error playing local video', err);
        });
      }

      const pc = await createPeerConnection();
      if (!pc) throw new Error("Failed to create peer connection");

      stream.getTracks().forEach(track => {
        debugLog('PeerConnection', `Adding ${track.kind} track`);
        pc.addTrack(track, stream);
      });

      debugLog('PeerConnection', 'Setting remote description from offer');
      await pc.setRemoteDescriptionAsync(new RTCSessionDescription(call.offer));
      
      debugLog('PeerConnection', 'Creating answer');
      const answer = await pc.createAnswer();
      debugLog('PeerConnection', 'Setting local description');
      await pc.setLocalDescription(answer);

      sendSignalingMessage({
        type: "answer",
        answer: pc.localDescription,
        from: currentUser.id,
        to: call.from,
        isVideoCall: shouldUseVideo
      });

      setCallState("connected");
      startCallTimer();
      toast.dismiss();
      toast.success(`Call connected with ${selectedUser.username}`);
    } catch (error) {
      debugLog('Call', 'Error in acceptCall', error);
      toast.error(`Failed to accept call: ${error.message}`);
      await cleanupCall();
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      sendSignalingMessage({
        type: "reject",
        from: currentUser.id,
        to: incomingCall.from,
      });
    }

    cleanupCall();
    toast.dismiss();
  };

  const endCall = () => {
    sendSignalingMessage({
      type: "hangup",
      from: currentUser.id,
      to: selectedUser.id,
    });

    cleanupCall();
  };

  const startCallTimer = () => {
    // Clear any existing timer before starting a new one
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setCallTimer(0);
    callTimerRef.current = setInterval(() => {
      setCallTimer(prev => {
        const newValue = prev + 1;
        return newValue;
      });
    }, 1000);
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = isMicMuted;
        audioTracks[0].enabled = newState;
        setIsMicMuted(!newState);
        debugLog('Audio', 'Toggled microphone', { enabled: newState });
      } else {
        debugLog('Audio', 'No audio tracks found');
        toast.error("No microphone found");
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      // Set the muted property directly to the opposite of current speaker state
      remoteAudioRef.current.muted = !isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedTime = `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
    return formattedTime;
  };

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel("public:call-signals");

    channel.on("broadcast", { event: "call-signal" }, (payload) => {
      if (!payload || !payload.payload) return;

      const signal = payload.payload;

      if (signal.to !== currentUser.id) return;

      switch (signal.type) {
        case "offer":
          if (signal.from === selectedUser?.id) {
            handleIncomingCall(signal);
          }
          break;
        case "answer":
          if (callState === "outgoing" && peerConnectionRef.current) {
            peerConnectionRef.current
              .setRemoteDescriptionAsync(signal.answer)
              .then(() => {
                setCallState("connected");
                startCallTimer();
                toast.success(`Call connected with ${selectedUser.username}`);
              })
              .catch((error) => {
                debugLog('Call', 'Error setting remote description', error);
                endCall();
              });
          }
          break;
        case "ice-candidate":
          if (peerConnectionRef.current) {
            peerConnectionRef.current.handleIceCandidate(signal.candidate);
          }
          break;
        case "reject":
          if (callState === "outgoing") {
            toast.info(`${selectedUser.username} declined the call`);
            cleanupCall();
          }
          break;
        case "hangup":
          if (
            callState === "connected" ||
            callState === "incoming" ||
            callState === "outgoing"
          ) {
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
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const toggleCamera = () => {
    if (localStream && isVideoCall) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const newState = !isCameraOn;
        videoTracks[0].enabled = newState;
        setIsCameraOn(newState);
        debugLog('Video', 'Toggled camera', { enabled: newState });
      } else {
        debugLog('Video', 'No video tracks found');
        toast.error("No camera found");
      }
    }
  };

  // Add this effect to handle pending remote stream
  useEffect(() => {
    if (pendingRemoteStream && remoteVideoRef.current && isVideoCall) {
      debugLog('Video', 'Applying pending remote stream to video element');
      remoteVideoRef.current.srcObject = pendingRemoteStream;
      
      // Add event listeners for debugging
      remoteVideoRef.current.onloadedmetadata = () => {
        debugLog('Video', 'Remote video loadedmetadata event', {
          videoWidth: remoteVideoRef.current.videoWidth,
          videoHeight: remoteVideoRef.current.videoHeight,
          readyState: remoteVideoRef.current.readyState
        });
        remoteVideoRef.current.play().catch(err => {
          debugLog('Video', 'Error playing remote video', err);
          toast.error("Failed to display remote video");
        });
      };
      
      remoteVideoRef.current.onplay = () => {
        debugLog('Video', 'Remote video started playing');
      };

      remoteVideoRef.current.onerror = (err) => {
        debugLog('Video', 'Remote video error', err);
      };

      // Clear the pending stream
      setPendingRemoteStream(null);
    }
  }, [pendingRemoteStream, remoteVideoRef.current, isVideoCall]);

  // Expose startCall function to parent component
  useImperativeHandle(ref, () => ({
    startCall
  }));

  if (!selectedUser) {
    return (
      <div className="chat-window empty">
        <p>Select a user to start chatting</p>
      </div>
    );
  }

  return (
    <div
      className={`chat-window ${
        isRecording || isVideoRecording ? "recording-active" : ""
      } ${callState !== "idle" ? "call-active" : ""}`}
    >
      {!hideHeader && (
        <div className="chat-header">
          <div className="header-left">
            {selectedUser.avatar_url ? (
              <div
                className="user-avatar"
                style={{
                  background: "none",
                  backgroundImage: `url(${selectedUser.avatar_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>
            ) : (
              <div className="user-avatar">
                {selectedUser.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="user-info">
              <h3 className="username">{selectedUser.username}</h3>
              {callState !== "idle" && (
                <div className="call-status">
                  {callState === "outgoing" && <span>Calling...</span>}
                  {callState === "incoming" && <span>Incoming call...</span>}
                  {callState === "connected" && (
                    <span>On call • {formatTime(callTimer)}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="header-right">
            <div className="header-actions">
              <button
                className={`header-icon-btn ${
                  callState !== "idle" ? "active" : ""
                }`}
                onClick={() => (callState === "idle" ? startCall() : endCall())}
                title={callState === "idle" ? "Start Audio Call" : "End Call"}
              >
                {callState === "idle" ? (
                  <AudioCallIcon />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ff4136"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.79 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                    <line x1="23" y1="1" x2="1" y2="23"></line>
                  </svg>
                )}
              </button>
              <button
                className="header-icon-btn"
                onClick={() => {
                  if (callState === "idle") {
                    startCall(true); // Start video call
                  } else if (callState !== "idle" && isVideoCall) {
                    endCall();
                  }
                }}
                title={callState === "idle" ? "Start Video Call" : (isVideoCall ? "End Call" : "Video Call")}
                disabled={(callState !== "idle" && !isVideoCall)}
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
                    onClick={() => setSearchText("")}
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

      {callState === "connected" && (
        <div className="call-controls">
          <div className="call-timer">{formatTime(callTimer)}</div>
          <div className="call-actions">
            <button
              className={`call-action-btn ${isMicMuted ? "muted" : ""}`}
              onClick={toggleMic}
              title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMicMuted ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <button
              className="call-action-btn end-call"
              onClick={endCall}
              title="End Call"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.79 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                <line x1="23" y1="1" x2="1" y2="23"></line>
              </svg>
            </button>
            <button
              className={`call-action-btn ${!isSpeakerOn ? "muted" : ""}`}
              onClick={toggleSpeaker}
              title={isSpeakerOn ? "Turn Speaker Off" : "Turn Speaker On"}
            >
              {isSpeakerOn ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {callState === "incoming" && (
        <div className="incoming-call-container">
          <div className="incoming-call">
            <h3>Incoming Call</h3>
            <p>{selectedUser.username} is calling you</p>
            <div className="call-actions">
              <button
                className="call-action-btn accept-call"
                onClick={() => acceptCall(incomingCall)}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Accept</span>
              </button>
              <button
                className="call-action-btn reject-call"
                onClick={rejectCall}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M16.72 16.72A10.88 10.88 0 0 1 12 18c-2.73 0-5.14-1-7.04-2.72M3.34 7.5A10.95 10.95 0 0 0 2 12c0 2.73 1 5.14 2.72 7.04"></path>
                </svg>
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={localAudioRef}
        autoPlay
        muted
        style={{ display: "none" }}
      ></audio>
      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }}></audio>
      {/* Video call container */}
      {isVideoCall && callState !== "idle" && (
        <div className="video-call-container" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}>
          {/* Remote video - Main display */}
          <div style={{ 
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1a1a1a"
          }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: remoteStream ? "block" : "none"
              }}
            />
            {(!remoteStream || callState !== "connected") && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff"
              }}>
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  backgroundColor: "#333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "48px",
                  marginBottom: "24px",
                  border: "4px solid rgba(255,255,255,0.1)"
                }}>
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <div style={{ 
                  fontSize: "24px", 
                  marginBottom: "12px",
                  fontWeight: "500" 
                }}>
                  {selectedUser.username}
                </div>
                <div style={{ 
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.7)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: callState === "outgoing" ? "#ffc107" : "#dc3545",
                    animation: "pulse 1.5s infinite"
                  }} />
                  {callState === "outgoing" ? "Calling..." : "Connecting..."}
                </div>
              </div>
            )}
          </div>

          {/* Local video - PiP */}
          {(callState === "connected" || callState === "outgoing") && (
            <div style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: isMobileDevice ? "100px" : "180px",
              height: isMobileDevice ? "150px" : "240px",
              borderRadius: "12px",
              overflow: "hidden",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              backgroundColor: "#000",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)", // Mirror effect
                  display: "block"
                }}
              />
              {!isCameraOn && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: isMobileDevice ? "12px" : "14px",
                  fontWeight: "500"
                }}>
                  Camera Off
                </div>
              )}
            </div>
          )}

          {/* Call controls */}
          <div style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "20px",
            padding: "16px 24px",
            borderRadius: "50px",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <button
              onClick={toggleMic}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: isMicMuted ? "#dc3545" : "#28a745",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                boxShadow: `0 4px 12px ${isMicMuted ? "rgba(220,53,69,0.3)" : "rgba(40,167,69,0.3)"}`,
              }}
            >
              <MicIcon muted={isMicMuted} />
            </button>

            <button
              onClick={toggleCamera}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: isCameraOn ? "#28a745" : "#dc3545",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                boxShadow: `0 4px 12px ${isCameraOn ? "rgba(40,167,69,0.3)" : "rgba(220,53,69,0.3)"}`,
              }}
            >
              <CameraIcon enabled={isCameraOn} />
            </button>

            <button
              onClick={endCall}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#dc3545",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(220,53,69,0.3)",
              }}
            >
              <EndCallIcon />
            </button>
          </div>

          {/* Call timer and status */}
          <div style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 16px",
            borderRadius: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "#fff",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: callState === "connected" ? "#28a745" : "#ffc107"
            }}></div>
            {callState === "connected" ? (
              <span>{formatTime(callTimer)}</span>
            ) : (
              <span>{callState === "outgoing" ? "Calling..." : "Connecting..."}</span>
            )}
          </div>
        </div>
      )}

      {showMediaGallery && (
        <div className="media-gallery">
          <div className="gallery-header">
            <h3>Media Gallery</h3>
            <button
              className="close-gallery"
              onClick={() => setShowMediaGallery(false)}
              style={{
                background: "none",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                color: "#64748b",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                  onClick={() => setMediaSearchText("")}
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
                    {file.type === "image" && (
                      <>
                        <img
                          src={file.file_url}
                          alt={file.file_name}
                          onClick={() => window.open(file.file_url, "_blank")}
                        />
                        <span className="file-name">{file.file_name}</span>
                      </>
                    )}
                    {file.type === "video" && (
                      <>
                        <video
                          src={file.file_url}
                          onClick={() => window.open(file.file_url, "_blank")}
                        />
                        <span className="file-name">{file.file_name}</span>
                      </>
                    )}
                    {file.type === "audio" && (
                      <div className="audio-item">
                        {file.message === "🎤 Voice Message" ? (
                          <WaveSurferPlayer audioUrl={file.file_url} />
                        ) : (
                          <MusicPlayer
                            audioUrl={file.file_url}
                            songName={file.file_name}
                            artist={
                              file.message.includes("🎵")
                                ? file.message.replace("🎵", "").trim()
                                : "Unknown Artist"
                            }
                          />
                        )}
                        <span>{file.file_name}</span>
                      </div>
                    )}
                    {file.type === "file" && (
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
            position: "fixed",
            bottom: isMobileDevice ? "140px" : "80px",
            right: isMobileDevice ? "10px" : "20px",
            width: isMobileDevice ? "160px" : "320px",
            height: isMobileDevice ? "120px" : "240px",
            backgroundColor: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 1000,
            border: "2px solid #3a7bfd",
          }}
        >
          <video
            ref={videoPreviewRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            autoPlay
            playsInline
            muted
          />
          <div
            className="recording-indicator"
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: "rgba(0, 0, 0, 0.5)",
              padding: "4px 8px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span className="recording-dot"></span>
            <span
              className="recording-time"
              style={{
                color: "white",
                fontSize: isMobileDevice ? "10px" : "12px",
              }}
            >
              {Math.floor(recordingTime / 60)}:
              {(recordingTime % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      <div className="messages-container">
        {(isSearching ? filteredMessages : messages).map((message) => (
          <div
            key={message.id || message.created_at}
            className={`message ${
              message.sender_id === currentUser?.id ? "sent" : "received"
            } ${
              actualSearchText &&
              (message.message
                ?.toLowerCase()
                .includes(actualSearchText.toLowerCase()) ||
                message.file_name
                  ?.toLowerCase()
                  .includes(actualSearchText.toLowerCase()))
                ? "highlighted"
                : ""
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

      <form
        onSubmit={handleSendMessage}
        className="message-input"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          padding: isMobileDevice ? "8px" : "12px",
          gap: isMobileDevice ? "8px" : "12px",
        }}
      >
        {filePreview && (
          <div
            className="file-preview-container"
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "400px",
              maxWidth: "80%",
              padding: "16px",
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              borderRadius: "10px",
              margin: "0 auto 16px auto",
              border: "1px solid #e1e1e1",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                borderBottom: "1px solid #f0f0f0",
                paddingBottom: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                File Preview
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilePreview(null);
                  setFileToUpload(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#777",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f5f5f5")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div
              style={{
                width: "100%",
                maxHeight: "200px",
                overflow: "auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "8px 0",
              }}
            >
              {filePreview.type === "image" && (
                <img
                  src={filePreview.url}
                  alt={filePreview.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "160px",
                    objectFit: "contain",
                    borderRadius: "6px",
                  }}
                />
              )}

              {filePreview.type === "video" && (
                <video
                  src={filePreview.url}
                  controls
                  style={{
                    maxWidth: "100%",
                    maxHeight: "160px",
                    borderRadius: "6px",
                  }}
                />
              )}

              {filePreview.type === "audio" && (
                <audio
                  src={filePreview.url}
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "6px",
                  }}
                />
              )}

              {filePreview.type === "file" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px",
                    width: "100%",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ fontSize: "32px" }}>📄</div>
                  <div>
                    <div style={{ fontWeight: "500" }}>{filePreview.name}</div>
                    <div style={{ fontSize: "12px", color: "#777" }}>
                      {filePreview.size}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                marginTop: "12px",
                fontSize: "13px",
                color: "#777",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"></path>
                <path d="M22 8h-6"></path>
              </svg>
              Ready to send
            </div>
          </div>
        )}

        {audioPreview && (
          <div
            className="audio-preview-container"
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "400px",
              maxWidth: "80%",
              padding: "16px",
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              borderRadius: "10px",
              margin: "0 auto 16px auto",
              border: "1px solid #e1e1e1",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                borderBottom: "1px solid #f0f0f0",
                paddingBottom: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Voice Message Preview
              </div>
              <button
                type="button"
                onClick={() => {
                  setAudioPreview(null);
                  setAudioToUpload(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#777",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f5f5f5")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "12px",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🎤</div>
                <audio
                  src={audioPreview}
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "6px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                marginTop: "12px",
                fontSize: "13px",
                color: "#777",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"></path>
                <path d="M22 8h-6"></path>
              </svg>
              Ready to send
            </div>
          </div>
        )}

        {videoPreview && (
          <div
            className="audio-preview-container"
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "400px",
              maxWidth: "80%",
              padding: "16px",
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              borderRadius: "10px",
              margin: "0 auto 16px auto",
              border: "1px solid #e1e1e1",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                borderBottom: "1px solid #f0f0f0",
                paddingBottom: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Video Message Preview
              </div>
              <button
                type="button"
                onClick={() => {
                  setVideoPreview(null);
                  setVideoToUpload(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#777",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f5f5f5")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "12px",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <video
                  src={videoPreview}
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "6px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                marginTop: "12px",
                fontSize: "13px",
                color: "#777",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"></path>
                <path d="M22 8h-6"></path>
              </svg>
              Ready to send
            </div>
          </div>
        )}

        <div className="attachment-container" ref={attachmentMenuRef}>
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="attachment-btn"
            disabled={
              uploading ||
              isRecording ||
              isVideoRecording ||
              filePreview !== null ||
              audioPreview !== null ||
              videoPreview !== null
            }
            style={{
              opacity:
                filePreview !== null ||
                audioPreview !== null ||
                videoPreview !== null
                  ? 0.5
                  : 1,
              cursor:
                filePreview !== null ||
                audioPreview !== null ||
                videoPreview !== null
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {uploading ? (
              "⏳"
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </button>

          {showAttachmentMenu &&
            !filePreview &&
            !audioPreview &&
            !videoPreview && (
              <div className="attachment-menu">
                <div
                  className="attachment-option"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "*/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <span className="attachment-icon">📄</span>
                  <span className="attachment-label">Document</span>
                </div>
                <div
                  className="attachment-option"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <span className="attachment-icon">🖼️</span>
                  <span className="attachment-label">Photos</span>
                </div>
                <div
                  className="attachment-option"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "video/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <span className="attachment-icon">🎥</span>
                  <span className="attachment-label">Videos</span>
                </div>
                <div
                  className="attachment-option"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "audio/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
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
            padding: isMobileDevice ? "8px" : "12px",
            fontSize: isMobileDevice ? "14px" : "16px",
          }}
        />

        <button
          type="button"
          className={`video-btn video-record-btn ${
            isVideoRecording ? "recording" : ""
          }`}
          title={
            isVideoRecording
              ? "Release to stop recording"
              : "Hold to record video"
          }
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (
              !isVideoRecording &&
              !uploading &&
              !isRecording &&
              !filePreview &&
              !audioPreview &&
              !videoPreview
            ) {
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
            if (
              !isMobileDevice &&
              !isVideoRecording &&
              !uploading &&
              !isRecording &&
              !filePreview &&
              !audioPreview &&
              !videoPreview
            ) {
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
          disabled={
            uploading ||
            isRecording ||
            filePreview !== null ||
            audioPreview !== null ||
            videoPreview !== null
          }
          style={{
            width: isMobileDevice ? "32px" : "40px",
            height: isMobileDevice ? "32px" : "40px",
            padding: isMobileDevice ? "4px" : "8px",
            opacity:
              filePreview !== null ||
              audioPreview !== null ||
              videoPreview !== null
                ? 0.5
                : 1,
            cursor:
              filePreview !== null ||
              audioPreview !== null ||
              videoPreview !== null
                ? "not-allowed"
                : "pointer",
            display:
              filePreview !== null ||
              audioPreview !== null ||
              videoPreview !== null
                ? "none"
                : "block",
          }}
        >
          {isVideoRecording ? (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span
                className="recording-time"
                style={{ fontSize: isMobileDevice ? "10px" : "12px" }}
              >
                {Math.floor(recordingTime / 60)}:
                {(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`voice-btn voice-record-btn ${
            isRecording ? "recording" : ""
          }`}
          title={
            isRecording ? "Release to stop recording" : "Hold to record voice"
          }
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (
              !isRecording &&
              !uploading &&
              !isVideoRecording &&
              !filePreview &&
              !audioPreview &&
              !videoPreview
            ) {
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
            if (
              !isMobileDevice &&
              !isRecording &&
              !uploading &&
              !isVideoRecording &&
              !filePreview &&
              !audioPreview &&
              !videoPreview
            ) {
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
          disabled={
            uploading ||
            isVideoRecording ||
            filePreview !== null ||
            audioPreview !== null ||
            videoPreview !== null
          }
          style={{
            width: isMobileDevice ? "32px" : "40px",
            height: isMobileDevice ? "32px" : "40px",
            padding: isMobileDevice ? "4px" : "8px",
            opacity:
              filePreview !== null ||
              audioPreview !== null ||
              videoPreview !== null
                ? 0.5
                : 1,
            cursor:
              filePreview !== null ||
              audioPreview !== null ||
              videoPreview !== null
                ? "not-allowed"
                : "pointer",
            display:
              filePreview !== null ||
              audioPreview !== null ||
              videoPreview !== null
                ? "none"
                : "block",
          }}
        >
          {isRecording ? (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span
                className="recording-time"
                style={{ fontSize: isMobileDevice ? "10px" : "12px" }}
              >
                {Math.floor(recordingTime / 60)}:
                {(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
          style={{ display: "none" }}
        />
        <button
          type="submit"
          className={`send-button ${
            !newMessage.trim() &&
            !fileToUpload &&
            !audioToUpload &&
            !videoToUpload
              ? "disabled"
              : ""
          }`}
          disabled={
            (!newMessage.trim() &&
              !fileToUpload &&
              !audioToUpload &&
              !videoToUpload) ||
            isRecording ||
            isVideoRecording
          }
        >
          {(fileToUpload || audioToUpload || videoToUpload) && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "4px" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          )}
          <span>{uploading ? "Sending..." : "Send"}</span>
        </button>
      </form>
    </div>
  );
});

export default ChatWindow;
