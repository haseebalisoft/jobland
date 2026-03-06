import app from './src/app.js';
import { config } from './src/config/env.js';
import { connectDB } from './src/config/db.js';

const PORT = config.port || 5000;

async function start() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();