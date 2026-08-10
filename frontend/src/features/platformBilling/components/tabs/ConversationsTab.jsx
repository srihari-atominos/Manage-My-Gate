import React, { useState, useRef, useEffect } from 'react';

const ConversationsTab = ({ lead }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi, can we get a 15-day free trial before signing the annual contract?", sender: lead?.contactName || "John Smith", time: "Today 10:20 AM", isMe: false, channel: 'PLATFORM' },
    { id: 2, text: `Sure ${lead?.contactName ? lead.contactName.split(' ')[0] : 'John'}! I'm activating your 15-day free trial now. Auto-provisioning is setting up your workspace.`, sender: "Platform Admin", time: "Today 10:35 AM", isMe: true, channel: 'PLATFORM' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('PLATFORM');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (selectedChannel === 'WHATSAPP') {
      if (!phone) {
        alert('No phone number available for WhatsApp');
        return;
      }
    } else if (selectedChannel === 'SMS') {
      if (!phone) {
        alert('No phone number available for SMS');
        return;
      }
    } else if (selectedChannel === 'GMAIL') {
      if (!email) {
        alert('No email available for Gmail');
        return;
      }
    }

    // Call the backend API (this is a mockup of what the service call would look like)
    // await platformBillingService.sendConversationMessage({ ... })
    console.log(`[Backend API] Sent message via ${selectedChannel} to ${selectedChannel === 'GMAIL' ? email : phone}`);
    
    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: "Platform Admin",
      time: "Just now",
      isMe: true,
      channel: selectedChannel
    };
    setMessages([...messages, newMessage]);
    setInputValue('');
    
    // Simulate real backend confirmation
    alert(`Message successfully submitted to the backend to be sent via ${selectedChannel}.`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const phone = lead?.phone || lead?.contactPhone || lead?.mobile || '';
  const email = lead?.email || lead?.contactEmail || '';

  return (
    <div className="panel-body grid2" style={{ padding: 0 }}>
      <div className="panel shadow-none" style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
        <div className="panel-head d-flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '15px' }}>
          <div className="d-flex align-center gap-2">
            <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>Thread History</h2>
            <span className="badge green">Synced</span>
          </div>
          <div className="text-sm text-muted d-flex align-center gap-3" style={{ whiteSpace: 'nowrap' }}>
            {phone && <span>📞 {phone}</span>}
            {email && <span>✉️ {email}</span>}
          </div>
        </div>
        <div className="chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 15px' }}>
          <div className="messages" style={{ flex: 1, maxHeight: '400px', overflowY: 'auto', paddingBottom: '10px' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`msg ${msg.isMe ? 'me' : ''}`}>
                <div className="bubble">
                  {msg.text}
                </div>
                <div className="msg-info">
                  {msg.sender} · {msg.time} 
                  {msg.channel && msg.channel !== 'PLATFORM' && (
                    <span className="badge ml-2" style={{ fontSize: '0.7em', padding: '2px 6px', opacity: 0.8 }}>
                      via {msg.channel}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: 'auto' }}>
            <div className="d-flex gap-2 align-center mb-2" style={{ flexWrap: 'wrap' }}>
              <span className="text-sm text-muted">Send via:</span>
              <button 
                className={`btn small ${selectedChannel === 'PLATFORM' ? 'primary' : 'outline'}`} 
                onClick={() => setSelectedChannel('PLATFORM')}
              >Platform</button>
              <button 
                className={`btn small ${selectedChannel === 'WHATSAPP' ? 'primary' : 'outline'}`} 
                onClick={() => setSelectedChannel('WHATSAPP')}
              >WhatsApp</button>
              <button 
                className={`btn small ${selectedChannel === 'SMS' ? 'primary' : 'outline'}`} 
                onClick={() => setSelectedChannel('SMS')}
              >SMS</button>
              <button 
                className={`btn small ${selectedChannel === 'GMAIL' ? 'primary' : 'outline'}`} 
                onClick={() => setSelectedChannel('GMAIL')}
              >Gmail</button>
            </div>
            
            <div className="composer d-flex gap-2">
              <input 
                className="input" 
                style={{ flex: 1 }}
                placeholder={`Type reply to send via ${selectedChannel.toLowerCase()}...`} 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn primary" onClick={handleSend}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationsTab;
