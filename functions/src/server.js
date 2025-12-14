/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onRequest } = require('firebase-functions/v2/https');
const path = require('path');

// Set up a simple Express server to handle all requests
const express = require('express');
const server = express();

// Export the function
exports.nextServer = onRequest((req, res) => {
  // Log the request for debugging
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Serve static files from the public directory
  if (req.url.startsWith('/_next/static/') || req.url.startsWith('/static/')) {
    const staticFilePath = path.join(
      __dirname, 
      '../../.next/standalone/.next/static', 
      req.url.replace('/_next/static/', '').replace('/static/', '')
    );
    
    return res.sendFile(staticFilePath);
  }
  
  // Simulate static file serving for other static assets
  if (req.url.startsWith('/images/') || req.url.includes('.ico') || req.url.includes('.png')) {
    const publicFilePath = path.join(__dirname, '../../.next/standalone/public', req.url);
    return res.sendFile(publicFilePath);
  }
  
  // For all other routes, serve the HTML content
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Help Desk</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="/_next/static/css/app.css">
      </head>
      <body>
        <div id="__next">
          <h1>Help Desk Application</h1>
          <p>Your application is running on Firebase Hosting!</p>
          <p>This is a placeholder. Try building a complete static export instead.</p>
        </div>
      </body>
    </html>
  `);
});