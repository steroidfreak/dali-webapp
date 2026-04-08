require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { startServer } = require('./src/app');

startServer();
