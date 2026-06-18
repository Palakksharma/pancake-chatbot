const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  db.run('DELETE FROM chat_logs', (err) => {
    if (err) console.error('Error clearing chat_logs:', err);
    else console.log('Successfully cleared chat_logs table.');
  });
  db.run('DELETE FROM conversations', (err) => {
    if (err) console.error('Error clearing conversations:', err);
    else console.log('Successfully cleared conversations table.');
  });
  db.run('DELETE FROM users', (err) => {
    if (err) console.error('Error clearing users:', err);
    else console.log('Successfully cleared users table.');
  });
});

db.close(() => {
  console.log('Database reset complete. All old users, sessions, and chat logs deleted.');
});
