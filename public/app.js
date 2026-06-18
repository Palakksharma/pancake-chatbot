// Elements
const chatBody = document.getElementById('chatBody');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const sendIcon = document.getElementById('sendIcon');
const typingBubble = document.getElementById('typingBubble');
const backendModeBadge = document.getElementById('backendModeBadge');
const resetSessionBtn = document.getElementById('resetSessionBtn');

// Dashboard Elements
const sessionIdVal = document.getElementById('sessionIdVal');
const sessionStartVal = document.getElementById('sessionStartVal');
const sessionActiveVal = document.getElementById('sessionActiveVal');
const cumulativeTokenCount = document.getElementById('cumulativeTokenCount');
const cumulativeProgressBar = document.getElementById('cumulativeProgressBar');



// Console Log Element
const terminalConsole = document.getElementById('terminalConsole');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// Context Settings
const MAX_CONTEXT_TOKENS = 2097152; // 2M tokens context limit for Gemini 2.5 Flash

// Auditor Elements
const auditorUserSelect = document.getElementById('auditorUserSelect');
const auditorConvSelect = document.getElementById('auditorConvSelect');
const auditorEmptyState = document.getElementById('auditorEmptyState');
const auditorHistoryList = document.getElementById('auditorHistoryList');

let globalConversations = [];

// Initialize Session on Load
document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  setupEventListeners();
  setupAuditorEventListeners();
  loadAuditorSessions();
});

// Setup event listeners for user inputs
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

  // Reset Session
  resetSessionBtn.addEventListener('click', resetSession);

  // Clear Terminal
  clearLogsBtn.addEventListener('click', () => {
    terminalConsole.innerHTML = '';
    addTerminalLine('Terminal cleared.', 'system-line');
  });
}

// Format ISO date to human readable 12h time (e.g. "12:34 PM")
function formatTime(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

// Format dates nicely
function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Text formatting for WhatsApp (bold, italic, newlines)
function formatWhatsAppText(text) {
  if (!text) return '';
  // Escape HTML tags to prevent XSS, except allow bold & italic formatting
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

// ----------------------------------------------------
// Terminal Logger Helpers
// ----------------------------------------------------
function addTerminalLine(text, className = '') {
  const line = document.createElement('div');
  line.className = `terminal-line ${className}`;
  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  line.textContent = `[${timestamp}] ${text}`;
  terminalConsole.appendChild(line);
  terminalConsole.scrollTop = terminalConsole.scrollHeight;
}

// ----------------------------------------------------
// Fetch State on Load
// ----------------------------------------------------
async function loadSession() {
  addTerminalLine('Querying backend session state...', 'system-line');
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const convId = urlParams.get('convId');
    
    let fetchUrl = '/api/session';
    const params = [];
    if (userId) params.push(`userId=${userId}`);
    if (convId) params.push(`convId=${convId}`);
    if (params.length > 0) {
      fetchUrl += '?' + params.join('&');
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error('Failed to retrieve session');

    const data = await response.json();

    // Update headers and settings
    sessionIdVal.textContent = data.sessionId;
    sessionStartVal.textContent = formatDate(data.createdAt);
    sessionActiveVal.textContent = formatDate(data.lastActive);

    // Set Mode Badge
    updateModeBadge(data.mode);

    // Set cumulative tokens
    updateCumulativeTokens(data.totalTokens);

    // Render Chat History
    if (data.history && data.history.length > 0) {
      addTerminalLine(`Loaded ${data.history.length} historical chat items from SQLite database.`, 'success-line');

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
        // Append token breakdown row
        appendTokenBreakdownRow(turn.tokens);
      });

      // Update last message token breakdown from the last history item
      const lastTurn = data.history[data.history.length - 1];
      updateTokenStats(lastTurn.tokens);

      // Print logs from the last history item to show context
      addTerminalLine('--- Resuming Session Logs ---', 'info-line');
      lastTurn.stepLogs.forEach(log => {
        addTerminalLine(log, getLogClass(log));
      });
    } else {
      addTerminalLine('New SQLite session record created. No history found.', 'info-line');
    }
  } catch (error) {
    console.error('Error loading session:', error);
    addTerminalLine('Failed to initialize session from SQLite. Server may be offline.', 'error-line');
  }
}

// ----------------------------------------------------
// Send Messages
// ----------------------------------------------------
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

  // 3. Log step to terminal
  addTerminalLine(`User submitted prompt: "${messageText}"`, 'system-line');
  addTerminalLine('Sending API post requests to /api/chat endpoint...', 'info-line');

  try {
    const startTime = Date.now();
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: messageText })
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Chat processing error');
    }

    const data = await response.json();

    // Hide Typing Indicator
    typingBubble.style.display = 'none';

    // 4. Render Agent Response bubble
    appendMessage(data.agentResponse, 'incoming', timestamp);
    // Append token breakdown row
    appendTokenBreakdownRow(data.turnTokens);

    // 5. Update session stats on dashboard
    sessionActiveVal.textContent = formatDate(new Date().toISOString());
    updateCumulativeTokens(data.cumulativeTokens);
    updateTokenStats(data.turnTokens);

    // Refresh auditor dropdowns to include new messages or summaries
    loadAuditorSessions();

    // 6. Print steps to the terminal logs
    addTerminalLine(`Server responded in ${duration} seconds. API response code 200.`, 'success-line');
    data.stepLogs.forEach(log => {
      addTerminalLine(log, getLogClass(log));
    });

  } catch (error) {
    console.error('Send error:', error);
    typingBubble.style.display = 'none';

    // Render error bubble in chat
    appendMessage('⚠️ Error: Failed to connect to server. Please try again.', 'incoming', timestamp);
    addTerminalLine(`Pipeline Error: ${error.message}`, 'error-line');
  }
}

// ----------------------------------------------------
// UI Render Helpers
// ----------------------------------------------------

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

// Update token stats on panels
function updateTokenStats(tokens) {
  // Deprecated: No longer showing last message breakdown on dashboard card.
}

// Update cumulative token counter with count animation
function updateCumulativeTokens(total) {
  const currentVal = parseInt(cumulativeTokenCount.textContent) || 0;
  animateCounter(cumulativeTokenCount, currentVal, total, 800);

  // Update progress bar scale relative to LLM context size
  const contextPct = (total / MAX_CONTEXT_TOKENS) * 100;
  const displayPct = Math.max(contextPct, 0.01).toFixed(4); // minimum 0.01% display

  cumulativeProgressBar.style.width = `${Math.min(contextPct, 100)}%`;

  // Update progress bar description label
  const labelEl = cumulativeProgressBar.parentElement.previousElementSibling.lastElementChild;
  labelEl.textContent = `${displayPct}%`;
}

// Animate numbers counting up/down smoothly
function animateCounter(element, start, end, duration) {
  if (start === end) return;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out quad
    const easeProgress = progress * (2 - progress);
    const value = Math.round(start + (end - start) * easeProgress);
    element.textContent = value.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

// Update top header mode badge (Live or Simulator)
function updateModeBadge(mode) {
  if (mode === 'live') {
    backendModeBadge.className = 'mode-badge live-badge';
    backendModeBadge.innerHTML = '<i class="fa-solid fa-network-wired"></i> Gemini Live Mode';
  } else {
    backendModeBadge.className = 'mode-badge simulator-badge';
    backendModeBadge.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Simulator Mode';
  }
}

// Classify line styles for colored console outputs
function getLogClass(logLine) {
  const lower = logLine.toLowerCase();
  if (lower.includes('error') || lower.includes('failed')) return 'error-line';
  if (lower.includes('tool') || lower.includes('executing') || lower.includes('returned')) return 'tool-line';
  if (lower.includes('finished') || lower.includes('success') || lower.includes('updated')) return 'success-line';
  if (lower.includes('received') || lower.includes('analyzing') || lower.includes('initiate')) return 'system-line';
  return 'info-line';
}

// ----------------------------------------------------
// Reset Conversations
// ----------------------------------------------------
async function resetSession() {
  if (!confirm('Are you sure you want to start a new chat conversation? Your current chat history will be archived for review.')) {
    return;
  }

  addTerminalLine('Ending active conversation session...', 'info-line');
  try {
    const response = await fetch('/api/reset', { method: 'POST' });
    if (!response.ok) throw new Error('Reset failed');

    const data = await response.json();
    addTerminalLine(data.message, 'success-line');

    // Wipe UI elements
    // Clear chat logs but preserve greeting and clear breakdown rows
    const elementsToClear = chatBody.querySelectorAll('.wa-message:not(.typing-indicator-bubble), .wa-bubble-token-breakdown');
    elementsToClear.forEach((el, idx) => {
      // Keep the first greeting message
      if (idx > 0) el.remove();
    });

    // Reset Numbers
    updateCumulativeTokens(0);
    updateTokenStats({ system: 85, user: 0, tools: 0, agent: 0, total: 85 });

    sessionActiveVal.textContent = formatDate(new Date().toISOString());

    // Refresh auditor dropdowns
    loadAuditorSessions();

  } catch (error) {
    console.error('Reset error:', error);
    addTerminalLine(`Reset pipeline failed: ${error.message}`, 'error-line');
  }
}

// ----------------------------------------------------
// Auditor Panel Frontend Logic
// ----------------------------------------------------

async function loadAuditorSessions() {
  try {
    const response = await fetch('/api/auditor/sessions');
    if (!response.ok) throw new Error('Failed to fetch auditor sessions');
    const data = await response.json();

    globalConversations = data.conversations || [];

    const currentUserId = auditorUserSelect.value;
    const currentConvId = auditorConvSelect.value;

    auditorUserSelect.innerHTML = '<option value="">-- Choose User ID --</option>';
    const users = data.users || [];
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.user_id;
      option.textContent = user.user_id;
      auditorUserSelect.appendChild(option);
    });

    if (currentUserId && users.some(u => u.user_id === currentUserId)) {
      auditorUserSelect.value = currentUserId;
      populateConversationsDropdown(currentUserId);

      if (currentConvId && globalConversations.some(c => c.conversation_id === currentConvId)) {
        auditorConvSelect.value = currentConvId;
      }
    }
  } catch (error) {
    console.error('Error loading auditor dropdowns:', error);
  }
}

function populateConversationsDropdown(userId) {
  auditorConvSelect.innerHTML = '<option value="">-- Choose Chat Session --</option>';
  if (!userId) {
    auditorConvSelect.disabled = true;
    showAuditorEmptyState();
    return;
  }

  const userConvs = globalConversations.filter(c => c.user_id === userId);

  if (userConvs.length === 0) {
    auditorConvSelect.disabled = true;
    showAuditorEmptyState("No active chat sessions found for this user.");
    return;
  }

  auditorConvSelect.disabled = false;
  userConvs.forEach((c, idx) => {
    const start = new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(c.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(c.created_at).toLocaleDateString();

    const option = document.createElement('option');
    option.value = c.conversation_id;
    option.textContent = `Chat #${userConvs.length - idx} (${date} ${start} - ${end})`;
    auditorConvSelect.appendChild(option);
  });
}

function showAuditorEmptyState(text) {
  auditorEmptyState.style.display = 'flex';
  auditorHistoryList.style.display = 'none';
  auditorHistoryList.innerHTML = '';
  if (text) {
    auditorEmptyState.textContent = text;
  } else {
    auditorEmptyState.textContent = 'Select a User and Conversation session to inspect previous chat history and turn-by-turn token breakdowns.';
  }
}

async function loadAuditorConversationHistory(convId) {
  if (!convId) {
    showAuditorEmptyState();
    return;
  }

  try {
    const response = await fetch(`/api/auditor/history/${convId}`);
    if (!response.ok) throw new Error('Failed to fetch history');
    const data = await response.json();

    auditorHistoryList.innerHTML = '';
    auditorEmptyState.style.display = 'none';
    auditorHistoryList.style.display = 'flex';

    if (data.history && data.history.length > 0) {
      data.history.forEach((turn, idx) => {
        const turnEl = document.createElement('div');
        turnEl.className = 'auditor-turn';
        const formattedTime = new Date(turn.timestamp).toLocaleString();

        turnEl.innerHTML = `
          <div class="auditor-turn-header" onclick="toggleAuditorTurn(this)">
            <span><b>Interaction #${idx + 1}</b></span>
            <div class="auditor-header-badges">
              <span class="auditor-token-badge badge-tot">${turn.tokens.total} total</span>
              <span class="auditor-token-badge badge-usr">${turn.tokens.user} user</span>
              <span class="auditor-token-badge badge-agent">${turn.tokens.agent} received</span>
              ${turn.tokens.summary > 0 ? `<span class="auditor-token-badge badge-sum">${turn.tokens.summary} summary</span>` : ''}
            </div>
            <span><i class="fa-solid fa-chevron-down"></i> Toggle</span>
          </div>
          <div class="auditor-turn-body" style="display: none;">
            <div class="auditor-time-label">${formattedTime}</div>
            <div class="auditor-box">
              <div class="auditor-box-title">USER QUERY</div>
              <div class="auditor-box-content">${turn.userMessage}</div>
            </div>
            <div class="auditor-box">
              <div class="auditor-box-title">BOT RESPONSE</div>
              <div class="auditor-box-content">${turn.agentResponse}</div>
            </div>
            
            <div class="auditor-collapsible-section">
              <div class="auditor-collapse-header" onclick="toggleSectionDetails(this)">
                <i class="fa-solid fa-caret-right"></i> Full OpenAI API input context (1 API calls)
              </div>
              <div class="auditor-collapse-body" style="display: none;">
                <pre class="auditor-code-block">${turn.stepLogs ? turn.stepLogs[0] || 'No input context captured.' : 'No context trace available.'}</pre>
              </div>
            </div>

            <div class="auditor-collapsible-section">
              <div class="auditor-collapse-header" onclick="toggleSectionDetails(this)">
                <i class="fa-solid fa-caret-right"></i> Swarm response and tool execution trace
              </div>
              <div class="auditor-collapse-body" style="display: none;">
                <pre class="auditor-code-block">${turn.stepLogs ? turn.stepLogs.slice(1).join('\n') || 'Direct direct query without tool invocation.' : 'No trace available.'}</pre>
              </div>
            </div>

            <div class="auditor-collapsible-section">
              <div class="auditor-collapse-header" onclick="toggleSectionDetails(this)">
                <i class="fa-solid fa-caret-right"></i> Context summary injected into this turn (${turn.tokens.summary || 0} tokens)
              </div>
              <div class="auditor-collapse-body" style="display: none;">
                <div class="auditor-summary-text">
                  ${turn.tokens.summary > 0 ? `Active rolling summary injected: <i>"${turn.summaryPassed || 'No summary text available.'}"</i>` : 'No context summary was active/injected for this turn.'}
                </div>
              </div>
            </div>

            <div class="auditor-collapsible-section">
              <div class="auditor-collapse-header" onclick="toggleSectionDetails(this)">
                <i class="fa-solid fa-caret-right"></i> Raw SQLite log document
              </div>
              <div class="auditor-collapse-body" style="display: none;">
                <pre class="auditor-code-block">${JSON.stringify(turn, null, 2)}</pre>
              </div>
            </div>
          </div>
        `;
        auditorHistoryList.appendChild(turnEl);
      });
    } else {
      showAuditorEmptyState("This chat session does not contain any messages.");
    }
  } catch (error) {
    console.error('Error fetching auditor logs:', error);
    showAuditorEmptyState("Failed to load log entries for this session.");
  }
}

function setupAuditorEventListeners() {
  auditorUserSelect.addEventListener('change', () => {
    populateConversationsDropdown(auditorUserSelect.value);
  });

  auditorConvSelect.addEventListener('change', () => {
    loadAuditorConversationHistory(auditorConvSelect.value);
  });
}

function appendTokenBreakdownRow(tokens) {
  if (!tokens) return;
  const row = document.createElement('div');
  row.className = 'wa-bubble-token-breakdown';
  const sumVal = tokens.summary || 0;
  row.innerHTML = `
    <span>Sys: <b class="t-sys">${tokens.system}</b></span>
    <span>Usr: <b class="t-usr">${tokens.user}</b></span>
    <span>Tool: <b class="t-tool">${tokens.tools}</b></span>
    <span>Agt: <b class="t-agent">${tokens.agent}</b></span>
    <span>Sum: <b class="t-tool" style="color: #fbbf24;">${sumVal}</b></span>
    <span>Total: <b class="t-tot">${tokens.total}</b></span>
  `;
  chatBody.insertBefore(row, typingBubble);
  chatBody.scrollTop = chatBody.scrollHeight;
}

window.toggleSectionDetails = function (headerElement) {
  const body = headerElement.nextElementSibling;
  const icon = headerElement.querySelector('i');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.className = 'fa-solid fa-caret-down';
  } else {
    body.style.display = 'none';
    icon.className = 'fa-solid fa-caret-right';
  }
};

window.toggleAuditorTurn = function (headerElement) {
  const body = headerElement.nextElementSibling;
  const icon = headerElement.querySelector('i');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.className = 'fa-solid fa-chevron-up';
  } else {
    body.style.display = 'none';
    icon.className = 'fa-solid fa-chevron-down';
  }
};
