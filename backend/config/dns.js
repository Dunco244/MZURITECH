/**
 * DNS Configuration
 * Sets Google DNS (8.8.8.8, 8.8.4.4) as the default resolver
 * This helps when network DNS is blocking certain connections (like MongoDB Atlas)
 */

const dns = require('dns');

// Set the DNS servers to Google Public DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

console.log('DNS configured to use Google DNS: 8.8.8.8, 8.8.4.4');

module.exports = dns;
