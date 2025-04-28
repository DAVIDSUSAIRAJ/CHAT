import React, { useState } from 'react';
import { BsCameraVideo, BsTelephone } from 'react-icons/bs';
import { IoSearch } from 'react-icons/io5';
import { toast } from 'react-toastify';

const ChatHeader = ({ user }) => {
  const [isInCall, setIsInCall] = useState(false);

  const handleVideoCall = () => {
    if (isInCall) {
      toast.warning('You are already in a call');
      return;
    }
    setIsInCall(true);
    toast.info('Starting video call...');
    // Video call logic will be implemented here
  };

  const handleAudioCall = () => {
    if (isInCall) {
      toast.warning('You are already in a call');
      return;
    }
    setIsInCall(true);
    toast.info('Starting audio call...');
    // Audio call logic will be implemented here
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
      {/* Left side - User info */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
            {user?.name?.[0] || 'R'}
          </div>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">{user?.name || 'User'}</h2>
          <p className="text-sm text-green-500">
            {user?.status === 'online' ? 'Online' : `Last seen ${user?.lastSeen || 'recently'}`}
          </p>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-4">
        <button 
          className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isInCall ? 'bg-blue-100' : ''}`}
          onClick={handleVideoCall}
          title="Start video call"
        >
          <BsCameraVideo className={`w-5 h-5 ${isInCall ? 'text-blue-600' : 'text-gray-600'}`} />
        </button>
        <button 
          className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isInCall ? 'bg-blue-100' : ''}`}
          onClick={handleAudioCall}
          title="Start audio call"
        >
          <BsTelephone className={`w-5 h-5 ${isInCall ? 'text-blue-600' : 'text-gray-600'}`} />
        </button>
        <button 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Search messages"
        >
          <IoSearch className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader; 