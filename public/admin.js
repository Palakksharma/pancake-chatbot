// Elements
const backendModeBadge = document.getElementById('backendModeBadge');
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.admin-panel');

// Dashboard Overview Card elements
const cardTotalChats = document.getElementById('cardTotalChats');
const cardTotalTokens = document.getElementById('cardTotalTokens');
const cardTotalUsers = document.getElementById('cardTotalUsers');
const cardAvgTokens = document.getElementById('cardAvgTokens');

// Token breakdown elements
const breakdownSys = document.getElementById('breakdownSys');
const breakdownUsr = document.getElementById('breakdownUsr');
const breakdownTools = document.getElementById('breakdownTools');
const breakdownAgent = document.getElementById('breakdownAgent');
const breakdownSummary = document.getElementById('breakdownSummary');
const breakdownTotal = document.getElementById('breakdownTotal');

const barSys = document.getElementById('barSys');
const barUsr = document.getElementById('barUsr');
const barTools = document.getElementById('barTools');
const barAgent = document.getElementById('barAgent');
const barSummary = document.getElementById('barSummary');

const dashboardRecentChats = document.getElementById('dashboardRecentChats');

// Chat Monitor Elements
const adminSessionList = document.getElementById('adminSessionList');
const sessionCountBadge = document.getElementById('sessionCountBadge');
const chatViewPane = document.getElementById('chatViewPane');
const chatPaneEmptyState = document.getElementById('chatPaneEmptyState');
const chatViewContainer = document.getElementById('chatViewContainer');
const auditSessionHeaderId = document.getElementById('auditSessionHeaderId');
const auditSessionHeaderMeta = document.getElementById('auditSessionHeaderMeta');
const auditSessionTokenBadge = document.getElementById('auditSessionTokenBadge');
const auditSummaryCard = document.getElementById('auditSummaryCard');
const auditSummaryText = document.getElementById('auditSummaryText');
const chatMessageThread = document.getElementById('chatMessageThread');

// Menu Elements
const menuSearchInput = document.getElementById('menuSearchInput');
const menuTableBody = document.getElementById('menuTableBody');

// Logs Elements
const terminalConsole = document.getElementById('terminalConsole');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// Global Cache for Menu and Conversations
let cachedMenuData = [];
let globalConversations = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  initTabNavigation();
  loadBackendMode();
  loadDashboardData();
  loadMenuData();
  setupMenuSearch();
  setupLogsClear();
  setupAuditorEventListeners();

  // Refresh loop: Poll metrics and logs every 15 seconds to keep the admin updated in real-time
  setInterval(() => {
    loadDashboardData();
  }, 15000);
});

// Setup Tab Switching Navigation
function initTabNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active from all nav buttons
      navItems.forEach(n => n.classList.remove('active'));
      // Add active to clicked button
      item.classList.add('active');

      // Toggle corresponding panel
      const targetTab = item.getAttribute('data-tab');
      panels.forEach(panel => {
        if (panel.id === `panel-${targetTab}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });

      // Perform initial actions on tab load
      if (targetTab === 'chats') {
        closeChatView();
        loadAuditorSessions();
      } else if (targetTab === 'dashboard') {
        loadDashboardData();
      } else if (targetTab === 'menu') {
        loadMenuData();
      }
    });
  });
}

// Fetch general backend mode (Live vs Simulator)
async function loadBackendMode() {
  try {
    const response = await fetch('/api/session');
    const data = await response.json();
    updateModeBadge(data.mode);
  } catch (error) {
    console.error('Error fetching mode:', error);
    updateModeBadge('offline');
  }
}

// Set top header mode badge (Live or Simulator)
function updateModeBadge(mode) {
  if (mode === 'live') {
    backendModeBadge.className = 'mode-badge live-badge';
    backendModeBadge.innerHTML = '<i class="fa-solid fa-network-wired"></i> Gemini Live Mode';
  } else if (mode === 'simulator') {
    backendModeBadge.className = 'mode-badge simulator-badge';
    backendModeBadge.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Simulator Mode';
  } else {
    backendModeBadge.className = 'mode-badge';
    backendModeBadge.style.background = 'rgba(244, 63, 94, 0.1)';
    backendModeBadge.style.color = '#fda4af';
    backendModeBadge.style.border = '1px solid rgba(244, 63, 94, 0.3)';
    backendModeBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Server Offline';
  }
}

// ----------------------------------------------------
// Dashboard & Analytics Card Loading
// ----------------------------------------------------
async function loadDashboardData() {
  try {
    const response = await fetch('/api/auditor/stats');
    if (!response.ok) throw new Error('Stats endpoint failed');
    const data = await response.json();

    // Animate stats numbers
    animateNumber(cardTotalChats, data.totalSessions);
    animateNumber(cardTotalTokens, data.totalTokens);
    animateNumber(cardTotalUsers, data.totalUsers);
    animateNumber(cardAvgTokens, data.avgTokens);

    // Setup Breakdown
    const b = data.breakdown;
    const total = b.system + b.user + b.tools + b.agent + b.summary;

    breakdownSys.textContent = b.system.toLocaleString();
    breakdownUsr.textContent = b.user.toLocaleString();
    breakdownTools.textContent = b.tools.toLocaleString();
    breakdownAgent.textContent = b.agent.toLocaleString();
    breakdownSummary.textContent = b.summary.toLocaleString();
    breakdownTotal.textContent = total.toLocaleString();

    if (total > 0) {
      barSys.style.width = `${(b.system / total) * 100}%`;
      barUsr.style.width = `${(b.user / total) * 100}%`;
      barTools.style.width = `${(b.tools / total) * 100}%`;
      barAgent.style.width = `${(b.agent / total) * 100}%`;
      barSummary.style.width = `${(b.summary / total) * 100}%`;
    } else {
      barSys.style.width = '0%';
      barUsr.style.width = '0%';
      barTools.style.width = '0%';
      barAgent.style.width = '0%';
      barSummary.style.width = '0%';
    }

    // Fetch Recent conversations
    loadRecentChatsList();

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

async function loadRecentChatsList() {
  try {
    const response = await fetch('/api/auditor/sessions');
    const data = await response.json();
    const conversations = data.conversations || [];

    dashboardRecentChats.innerHTML = '';

    if (conversations.length === 0) {
      dashboardRecentChats.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">No chats logged yet.</div>';
      return;
    }

    // Take top 5 recent
    const topRecent = conversations.slice(0, 5);
    topRecent.forEach(c => {
      const row = document.createElement('div');
      row.className = 'metric-row';
      row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
      row.style.paddingBottom = '8px';

      const time = new Date(c.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = new Date(c.last_active).toLocaleDateString();

      row.innerHTML = `
        <span class="m-label" style="font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); cursor: pointer;" onclick="openAuditorChat('${c.conversation_id}')">
          <i class="fa-solid fa-comment-alt"></i> ${c.conversation_id}
        </span>
        <span class="m-value" style="font-size: 12px;">
          ${date} ${time} | <strong>${c.total_tokens} tokens</strong>
        </span>
      `;
      dashboardRecentChats.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading recent chats:', error);
  }
}

// Redirect and open a chat directly in the chat tab
window.openAuditorChat = function (convId) {
  const chatNavBtn = document.querySelector('[data-tab="chats"]');
  if (chatNavBtn) {
    chatNavBtn.click();
    setTimeout(() => {
      selectSession(convId);
    }, 150);
  }
};

// ----------------------------------------------------
// Chat Auditor Section Logic
// ----------------------------------------------------
let currentSessionId = null;

async function loadAuditorSessions() {
  try {
    const response = await fetch('/api/auditor/sessions');
    if (!response.ok) throw new Error('Failed to fetch auditor sessions');
    const data = await response.json();

    globalConversations = data.conversations || [];
    sessionCountBadge.textContent = `${globalConversations.length} sessions`;

    adminSessionList.innerHTML = '';

    if (globalConversations.length === 0) {
      adminSessionList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No sessions logged.</div>';
      return;
    }

    // Sort conversations: last active first
    const sorted = [...globalConversations].sort((a, b) => new Date(b.last_active) - new Date(a.last_active));

    sorted.forEach(c => {
      const item = document.createElement('div');
      item.className = 'session-item';
      item.id = `session-item-${c.conversation_id}`;
      if (c.conversation_id === currentSessionId) {
        item.classList.add('active');
      }

      item.onclick = () => selectSession(c.conversation_id);

      const start = new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const end = new Date(c.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = new Date(c.created_at).toLocaleDateString();

      item.innerHTML = `
        <div class="session-item-header">
          <span class="session-id-lbl">${c.conversation_id}</span>
          <span class="session-token-badge">${c.total_tokens} tokens</span>
        </div>
        <div class="session-item-date">${date} ${start} - ${end} | User: ${c.user_id}</div>
      `;
      adminSessionList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading auditor sessions:', error);
  }
}

function selectSession(convId) {
  currentSessionId = convId;
  document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(`session-item-${convId}`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
  loadConversationHistory(convId);
}

function showAuditorEmptyState(text) {
  chatPaneEmptyState.style.display = 'flex';
  chatViewContainer.style.display = 'none';
  if (text) {
    chatPaneEmptyState.querySelector('p').textContent = text;
  } else {
    chatPaneEmptyState.querySelector('p').textContent = 'Select a customer session from the left panel to audit the chat history and view token allocations.';
  }
}

function setupAuditorEventListeners() {
  // Flat sidebar uses inline onclick handlers, so no event listeners setup is required.
}

async function loadConversationHistory(convId) {
  try {
    const response = await fetch(`/api/auditor/history/${convId}`);
    if (!response.ok) throw new Error('Failed to load session details');
    const data = await response.json();
    const conv = data.conversation;
    const history = data.history || [];

    // Hide empty state, show content
    chatPaneEmptyState.style.display = 'none';
    chatViewContainer.style.display = 'flex';

    // Set Headers
    auditSessionHeaderId.textContent = `Conversation: ${conv.conversation_id}`;
    auditSessionHeaderMeta.textContent = `Started: ${formatDate(conv.created_at)} | Last Active: ${formatDate(conv.last_active)}`;
    auditSessionTokenBadge.textContent = `${conv.total_tokens} total tokens`;

    // Update Open Chat Links dynamically for this specific user
    const auditLink = document.getElementById('auditOpenUserChatLink');
    if (auditLink) {
      auditLink.style.display = 'inline-flex';
      auditLink.href = `customer.html?userId=${conv.user_id}&convId=${conv.conversation_id}`;
    }
    const globalBtn = document.getElementById('openUserChatBtn');
    if (globalBtn) {
      globalBtn.href = `customer.html?userId=${conv.user_id}&convId=${conv.conversation_id}`;
    }

    // Render Rolling Summary Box
    if (conv.rolling_summary) {
      auditSummaryCard.style.display = 'flex';
      auditSummaryText.innerHTML = conv.rolling_summary.replace(/\n/g, '<br>');
    } else {
      auditSummaryCard.style.display = 'none';
    }

    // Render Message Thread
    chatMessageThread.innerHTML = '';

    if (history.length === 0) {
      chatMessageThread.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No messages in this chat session.</div>';
      return;
    }

    history.forEach((turn, idx) => {
      // 1. User Message (Outgoing)
      const uRow = document.createElement('div');
      uRow.className = 'admin-msg-row outgoing';
      uRow.innerHTML = `
        <div class="admin-msg-bubble">
          ${formatText(turn.userMessage)}
        </div>
        <div class="admin-msg-time">${formatTime(turn.timestamp)}</div>
      `;
      chatMessageThread.appendChild(uRow);

      // 2. Bot Response (Incoming)
      const bRow = document.createElement('div');
      bRow.className = 'admin-msg-row incoming';

      const breakdownText = turn.tokens ? `
        <div class="wa-bubble-token-breakdown" style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px;">
          <span>Sys: <b class="t-sys">${turn.tokens.system}</b></span>
          <span>Usr: <b class="t-usr">${turn.tokens.user}</b></span>
          <span>Tool: <b class="t-tool">${turn.tokens.tools}</b></span>
          <span>Agt: <b class="t-agent">${turn.tokens.agent}</b></span>
          <span>Sum: <b class="t-tool" style="color: #fbbf24;">${turn.tokens.summary}</b></span>
          <span>Total: <b class="t-tot">${turn.tokens.total}</b></span>
        </div>
      ` : '';

      bRow.innerHTML = `
        <div class="admin-msg-bubble">
          ${formatText(turn.agentResponse)}
          ${breakdownText}
        </div>
        <div class="admin-msg-time">${formatTime(turn.timestamp)}</div>
      `;
      chatMessageThread.appendChild(bRow);

      // Append execution trace steps to our active server logs tab for debugging
      if (turn.stepLogs && turn.stepLogs.length > 0) {
        addConsoleLogHeader(`Audit Log Trace - Turn #${idx + 1} (${turn.userMessage})`);
        turn.stepLogs.forEach(logLine => {
          addConsoleLine(logLine);
        });
      }
    });

    // Scroll body to bottom
    const body = document.getElementById('chatViewBody');
    body.scrollTop = body.scrollHeight;

    // For mobile responsive view, toggle chat active class
    const layout = document.querySelector('.monitor-layout');
    if (layout) {
      layout.classList.add('chat-active');
    }

  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Controller function for mobile view back button
function closeChatView() {
  const layout = document.querySelector('.monitor-layout');
  if (layout) {
    layout.classList.remove('chat-active');
  }
  // Clear active highlight on session item
  document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));

  // Hide the dynamic link in header and reset global button
  const auditLink = document.getElementById('auditOpenUserChatLink');
  if (auditLink) auditLink.style.display = 'none';
  const globalBtn = document.getElementById('openUserChatBtn');
  if (globalBtn) globalBtn.href = 'customer.html';
}

// Bind to window to allow click triggers in html button
window.closeChatView = closeChatView;

// ----------------------------------------------------
// Menu Section Logic
// ----------------------------------------------------
async function loadMenuData() {
  if (cachedMenuData.length > 0) {
    renderMenuTable(cachedMenuData);
    return;
  }

  try {
    const response = await fetch('/api/menu');
    if (!response.ok) throw new Error('Menu load failed');
    cachedMenuData = await response.json();
    renderMenuTable(cachedMenuData);
  } catch (error) {
    console.error('Error loading menu:', error);
    menuTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--accent-rose);">Failed to retrieve menu.</td></tr>';
  }
}

function renderMenuTable(items) {
  menuTableBody.innerHTML = '';
  if (items.length === 0) {
    menuTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No menu items found.</td></tr>';
    return;
  }

  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="ID"><strong>${item.id}</strong></td>
      <td data-label="Item Name"><strong>${item.name}</strong></td>
      <td data-label="Category"><span class="category-badge">${item.category}</span></td>
      <td data-label="Price">
        <div class="price-edit-container" id="price-container-${item.id}">
          <span class="price-value">₹${item.price}</span>
          <button class="price-edit-btn" onclick="startEditPrice(${item.id}, ${item.price})" title="Edit Price">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
      </td>
      <td data-label="Status">
        <button class="status-btn ${item.is_available ? 'status-in-stock' : 'status-out-of-stock'}" onclick="toggleAvailability(${item.id})">
          ${item.is_available ? 'In Stock' : 'Out of Stock'}
        </button>
      </td>
      <td data-label="Description" style="color: var(--text-secondary); font-size: 13px; text-align: left; display: block; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">${item.description}</td>
    `;
    menuTableBody.appendChild(tr);
  });
}

function startEditPrice(id, currentPrice) {
  const container = document.getElementById(`price-container-${id}`);
  if (!container) return;

  container.innerHTML = `
    <div class="price-input-wrapper">
      <input type="number" class="price-edit-input" id="price-input-${id}" value="${currentPrice}" min="0" step="1" onkeydown="handlePriceKeydown(event, ${id}, ${currentPrice})">
      <button class="price-save-btn" onclick="savePrice(${id})" title="Save Price"><i class="fa-solid fa-check"></i></button>
      <button class="price-cancel-btn" onclick="cancelEditPrice(${id}, ${currentPrice})" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `;

  const input = document.getElementById(`price-input-${id}`);
  if (input) {
    input.focus();
    input.select();
  }
}

function cancelEditPrice(id, originalPrice) {
  const container = document.getElementById(`price-container-${id}`);
  if (!container) return;

  container.innerHTML = `
    <span class="price-value">₹${originalPrice}</span>
    <button class="price-edit-btn" onclick="startEditPrice(${id}, ${originalPrice})" title="Edit Price">
      <i class="fa-solid fa-pen"></i>
    </button>
  `;
}

function handlePriceKeydown(event, id, originalPrice) {
  if (event.key === 'Enter') {
    savePrice(id);
  } else if (event.key === 'Escape') {
    cancelEditPrice(id, originalPrice);
  }
}

async function savePrice(id) {
  const input = document.getElementById(`price-input-${id}`);
  if (!input) return;

  const newPrice = Number(input.value);
  if (isNaN(newPrice) || newPrice < 0) {
    alert('Please enter a valid price greater than or equal to 0.');
    return;
  }

  try {
    const response = await fetch(`/api/menu/price/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ price: newPrice })
    });

    if (!response.ok) throw new Error('Failed to update price');
    const result = await response.json();

    // Update local cache
    cachedMenuData = cachedMenuData.map(item => {
      if (item.id === id) {
        return { ...item, price: result.price };
      }
      return item;
    });

    // Restore display view
    const container = document.getElementById(`price-container-${id}`);
    if (container) {
      container.innerHTML = `
        <span class="price-value">₹${result.price}</span>
        <button class="price-edit-btn" onclick="startEditPrice(${id}, ${result.price})" title="Edit Price">
          <i class="fa-solid fa-pen"></i>
        </button>
      `;
    }
  } catch (error) {
    console.error('Error saving price:', error);
    alert('Failed to save price. Please try again.');
  }
}

window.startEditPrice = startEditPrice;
window.cancelEditPrice = cancelEditPrice;
window.handlePriceKeydown = handlePriceKeydown;
window.savePrice = savePrice;


async function toggleAvailability(id) {
  try {
    const response = await fetch(`/api/menu/toggle/${id}`, { method: 'POST' });
    if (!response.ok) throw new Error('Toggle failed');
    const result = await response.json();

    // Update local cache and re-render
    cachedMenuData = cachedMenuData.map(item => {
      if (item.id === id) {
        return { ...item, is_available: result.is_available };
      }
      return item;
    });

    // Re-render table based on current search input query
    const query = menuSearchInput.value.toLowerCase().trim();
    if (query === '') {
      renderMenuTable(cachedMenuData);
    } else {
      const filtered = cachedMenuData.filter(item => {
        return item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          String(item.price).includes(query);
      });
      renderMenuTable(filtered);
    }
  } catch (error) {
    console.error('Error toggling availability:', error);
    alert('Failed to update item availability.');
  }
}

// Bind to window to allow inline onclick trigger in dynamically rendered buttons
window.toggleAvailability = toggleAvailability;

function setupMenuSearch() {
  menuSearchInput.addEventListener('input', () => {
    const query = menuSearchInput.value.toLowerCase().trim();
    if (query === '') {
      renderMenuTable(cachedMenuData);
      return;
    }

    const filtered = cachedMenuData.filter(item => {
      return item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        String(item.price).includes(query);
    });

    renderMenuTable(filtered);
  });
}

// ----------------------------------------------------
// System Logs Tab Helpers
// ----------------------------------------------------
function addConsoleLine(text) {
  const line = document.createElement('div');
  line.className = `terminal-line ${getLogClass(text)}`;
  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  line.textContent = `[${timestamp}] ${text}`;
  terminalConsole.appendChild(line);
  terminalConsole.scrollTop = terminalConsole.scrollHeight;
}

function addConsoleLogHeader(title) {
  const line = document.createElement('div');
  line.className = 'terminal-line';
  line.style.borderTop = '1px dashed rgba(255,255,255,0.06)';
  line.style.marginTop = '12px';
  line.style.paddingTop = '8px';
  line.style.fontWeight = 'bold';
  line.style.color = 'var(--accent-purple)';
  line.textContent = `=== ${title} ===`;
  terminalConsole.appendChild(line);
}

function getLogClass(line) {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('failed')) return 'error-line';
  if (lower.includes('tool') || lower.includes('executing') || lower.includes('returned')) return 'tool-line';
  if (lower.includes('finished') || lower.includes('success') || lower.includes('updated')) return 'success-line';
  if (lower.includes('received') || lower.includes('analyzing') || lower.includes('initiate')) return 'system-line';
  return 'info-line';
}

function setupLogsClear() {
  clearLogsBtn.addEventListener('click', () => {
    terminalConsole.innerHTML = '<div class="terminal-line system-line">[Console Cleared] Listening for new traces...</div>';
  });
}

// ----------------------------------------------------
// Utility Functions
// ----------------------------------------------------
function animateNumber(element, target) {
  const start = parseInt(element.textContent.replace(/,/g, '')) || 0;
  if (start === target) {
    element.textContent = target.toLocaleString();
    return;
  }
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress * (2 - progress); // ease out quad
    const value = Math.round(start + (target - start) * ease);
    element.textContent = value.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

function formatText(text) {
  if (!text) return '';
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold: *text* -> <b>text</b>
  formatted = formatted.replace(/\*(.*?)\*/g, '<b>$1</b>');
  // Italic: _text_ -> <i>text</i>
  formatted = formatted.replace(/_(.*?)_/g, '<i>$1</i>');
  // Newlines
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
