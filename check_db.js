const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const convId = 'conv_1ba5ca00';

console.log(`=== ALL CHAT LOGS FOR SESSION ${convId} ===`);
db.all('SELECT id, timestamp, user_message, agent_response, summary_passed FROM chat_logs WHERE conversation_id = ? ORDER BY id ASC', [convId], (err, rows) => {
  if (err) {
    console.error(err);
    db.close();
    return;
  }
  
  rows.forEach(row => {
    console.log(`ID: ${row.id} | Timestamp: ${row.timestamp}`);
    console.log(`User: "${row.user_message}"`);
    console.log(`Agent: "${row.agent_response}"`);
    console.log(`Summary Passed:\n"${row.summary_passed}"`);
    console.log('-'.repeat(50));
  });
  db.close();
});
