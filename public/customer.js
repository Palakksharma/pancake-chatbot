// Elements
const chatBody = document.getElementById('chatBody');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const sendIcon = document.getElementById('sendIcon');
const typingBubble = document.getElementById('typingBubble');

// Initialize Session on Load
document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  setupEventListeners();
});

// Setup input and send click event listeners
function setupEventListeners() {
  // Input tracking to change icon (mic vs paper-plane)
  userInput.addEventListener('input', () => {
    if (userInput.value.trim() !== '') {
      sendIcon.className = 'fa-solid fa-paper-plane';
    } else {
      sendIcon.className = 'fa-solid fa-microphone';
    }
  });

  // Enter key sends message
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Send button click
  sendBtn.addEventListener('click', sendMessage);
}

// Format ISO date to human readable 12h time (e.g. "12:34 PM")
function formatTime(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

// Text formatting for WhatsApp (bold, italic, newlines)
function formatWhatsAppText(text) {
  if (!text) return '';
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold: *text* -> <b>text</b>
  formatted = formatted.replace(/\*(.*?)\*/g, '<b>$1</b>');
  // Italic: _text_ -> <i>text</i>
  formatted = formatted.replace(/_(.*?)_/g, '<i>$1</i>');
  // Newlines: \n -> <br>
  formatted = formatted.replace(/\n/g, '<br>');

  // Find upi:// pay links and display the QR card below
  const upiRegex = /upi:\/\/pay\?[^\s<"']+/gi;
  const matches = formatted.match(upiRegex);
  if (matches) {
    matches.forEach(upiLink => {
      // Decode link for parsing parameters
      const decodedLink = upiLink.replace(/&amp;/g, '&');
      let amount = '0';
      try {
        const urlParams = new URLSearchParams(decodedLink.split('?')[1]);
        amount = urlParams.get('am') || '0';
      } catch (e) {
        console.error('Failed to parse UPI amount:', e);
      }

      const qrCardHtml = `
        <br>
        <div class="upi-qr-card">
          <div class="upi-qr-title">
            <i class="fa-solid fa-qrcode" style="color: #10b981;"></i> Scan to Pay via UPI
          </div>
          <div class="upi-qr-wrapper">
            <img class="upi-qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(decodedLink)}" alt="Scan UPI QR Code" />
          </div>
          <div class="upi-qr-amount">₹${amount}</div>
          <a href="${decodedLink}" class="upi-pay-link" target="_blank">
            Pay Instantly
          </a>
        </div>
        <br>
      `;
      formatted = formatted.replace(upiLink, `<code style="font-family: var(--font-mono); font-size: 11px; background: rgba(0,0,0,0.2); padding: 2px 4px; border-radius: 4px; word-break: break-all; display: block; margin-bottom: 8px;">${upiLink}</code>${qrCardHtml}`);
    });
  }

  return formatted;
}

// Load session history on page load
async function loadSession() {
  try {
    const response = await fetch('/api/session');
    if (!response.ok) throw new Error('Failed to retrieve session');

    const data = await response.json();

    // Render Chat History
    if (data.history && data.history.length > 0) {
      let lastConvId = null;
      data.history.forEach(turn => {
        if (lastConvId !== null && turn.conversationId !== lastConvId) {
          appendSessionDivider(turn.conversationId);
        }
        lastConvId = turn.conversationId;

        // Append user prompt bubble
        appendMessage(turn.userMessage, 'outgoing', turn.timestamp);
        // Append agent response bubble
        appendMessage(turn.agentResponse, 'incoming', turn.timestamp);
      });
    }
  } catch (error) {
    console.error('Error loading session:', error);
  }
}

// Send user message and fetch response
async function sendMessage() {
  const messageText = userInput.value.trim();
  if (messageText === '') return;

  // Clear Input
  userInput.value = '';
  sendIcon.className = 'fa-solid fa-microphone';

  const timestamp = new Date().toISOString();

  // 1. Render User Message bubble
  appendMessage(messageText, 'outgoing', timestamp);

  // 2. Show Typing Indicator bubble
  typingBubble.style.display = 'block';
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: messageText })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Chat processing error');
    }

    const data = await response.json();

    // Hide Typing Indicator
    typingBubble.style.display = 'none';

    // 3. Render Agent Response bubble
    appendMessage(data.agentResponse, 'incoming', timestamp);

  } catch (error) {
    console.error('Send error:', error);
    typingBubble.style.display = 'none';

    // Render error bubble in chat
    appendMessage('⚠️ Error: Failed to connect to server. Please try again.', 'incoming', timestamp);
  }
}

// Append a chat bubble to the scroll window
function appendMessage(text, direction, timestamp) {
  const bubble = document.createElement('div');
  bubble.className = `wa-message wa-${direction}`;

  const textDiv = document.createElement('div');
  textDiv.className = 'wa-message-text';
  textDiv.innerHTML = formatWhatsAppText(text);

  const timeDiv = document.createElement('div');
  timeDiv.className = 'wa-message-time';
  timeDiv.textContent = formatTime(timestamp);

  if (direction === 'outgoing') {
    const ticks = document.createElement('span');
    ticks.className = 'wa-ticks';
    ticks.innerHTML = ' ✓✓';
    timeDiv.appendChild(ticks);
  }

  bubble.appendChild(textDiv);
  bubble.appendChild(timeDiv);

  // Insert before the typing bubble
  chatBody.insertBefore(bubble, typingBubble);

  // Scroll to bottom
  chatBody.scrollTop = chatBody.scrollHeight;
}

function appendSessionDivider(nextConvId) {
  const divider = document.createElement('div');
  divider.className = 'session-divider';
  divider.style.display = 'flex';
  divider.style.alignItems = 'center';
  divider.style.justifyContent = 'center';
  divider.style.margin = '20px 0';
  divider.style.position = 'relative';

  divider.innerHTML = `
    <div style="flex-grow: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
    <span style="background: rgba(30, 41, 59, 0.8); color: #94a3b8; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(255, 255, 255, 0.08); margin: 0 12px; display: inline-flex; align-items: center; gap: 6px;">
      <i class="fa-solid fa-arrows-left-right-to-line"></i> New Session Started (${nextConvId})
    </span>
    <div style="flex-grow: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
  `;

  chatBody.insertBefore(divider, typingBubble);
}
