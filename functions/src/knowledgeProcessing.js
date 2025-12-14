/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const { google } = require('googleapis');
const { handleOptionsRequest } = require('./cors');

/**
 * Process Knowledge Source - Main Cloud Function
 * Handles processing of different knowledge source types
 */
exports.processKnowledgeSource = onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }
  
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Invalid token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { sourceId } = req.body;
    
    if (!sourceId) {
      return res.status(400).json({ error: 'Source ID is required' });
    }

    // Get source from Firestore
    const sourceDoc = await admin.firestore()
      .collection('knowledgeSources')
      .doc(sourceId)
      .get();

    if (!sourceDoc.exists) {
      return res.status(404).json({ error: 'Knowledge source not found' });
    }

    const source = { id: sourceDoc.id, ...sourceDoc.data() };

    // Check if source is enabled
    if (!source.enabled) {
      return res.status(400).json({ error: 'Source is disabled' });
    }

    // Update status to processing
    await admin.firestore()
      .collection('knowledgeSources')
      .doc(sourceId)
      .update({
        processingStatus: 'processing',
        lastError: null,
        updatedAt: admin.firestore.Timestamp.now()
      });

    let result;
    try {
      // Process based on source type
      switch (source.type) {
        case 'website':
          result = await processWebsiteSource(source);
          break;
        case 'google_sheet':
          result = await processGoogleSheetSource(source);
          break;
        case 'google_doc':
          result = await processGoogleDocSource(source);
          break;
        case 'pdf_upload':
          result = await processPDFUploadSource(source);
          break;
        case 'pdf_url':
          result = await processPDFUrlSource(source);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      // Update source with success status
      await admin.firestore()
        .collection('knowledgeSources')
        .doc(sourceId)
        .update({
          processingStatus: 'completed',
          lastProcessed: admin.firestore.Timestamp.now(),
          contentCount: result.contentCount,
          tokenCount: result.tokenCount,
          lastError: null,
          updatedAt: admin.firestore.Timestamp.now()
        });

      res.status(200).json({
        success: true,
        message: `Successfully processed ${result.contentCount} items`,
        contentCount: result.contentCount,
        tokenCount: result.tokenCount
      });

    } catch (processingError) {
      console.error('Error processing source:', processingError);
      
      // Update source with error status
      await admin.firestore()
        .collection('knowledgeSources')
        .doc(sourceId)
        .update({
          processingStatus: 'error',
          lastError: processingError.message,
          updatedAt: admin.firestore.Timestamp.now()
        });

      res.status(500).json({
        error: 'Processing failed',
        message: processingError.message
      });
    }

  } catch (error) {
    console.error('Error in processKnowledgeSource:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process Website Source
 * Adapted from larryai getCachedWebsiteContent function
 */
async function processWebsiteSource(source) {
  const { config } = source;
  const urls = config.urls || [config.url]; // Support multiple URLs
  const processedContent = [];
  let totalTokens = 0;

  // Clear existing content for this source first
  await clearExistingContent(source.id);

  for (const url of urls) {
    try {
      console.log(`Processing website: ${url}`);
      
      // Scrape the website (adapted from larryai)
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HelpDeskBot/1.0)'
        },
        timeout: 30000
      });
      
      const $ = cheerio.load(response.data);
      $('script, style, noscript').remove();
      
      const title = $('title').text() || $('h1').first().text() || 'Untitled';
      let content = '';
      
      const contentSelectors = [
        'main', 'article', '[role="main"]', '.content', '#content', '.main-content', '#main-content'
      ];
      
      let mainContent = null;
      for (const selector of contentSelectors) {
        if ($(selector).length > 0) {
          mainContent = $(selector);
          break;
        }
      }
      
      if (mainContent) {
        content = mainContent.text();
      } else {
        content = $('body').text();
      }
      
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      // Limit content length to prevent token overflow
      const maxContentLength = 50000;
      if (content.length > maxContentLength) {
        content = content.substring(0, maxContentLength) + '... [truncated]';
      }
      
      const structuredData = {
        title: title,
        description: $('meta[name="description"]').attr('content') || '',
        headings: $('h1, h2, h3').map((i, el) => $(el).text().trim()).get(),
        images: $('img').map((i, el) => ({
          src: $(el).attr('src'),
          alt: $(el).attr('alt') || ''
        })).get().filter(img => img.src),
        links: $('a').map((i, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href')
        })).get().filter(link => link.href && link.text)
      };

      // Add domain-specific data extraction
      if (url.includes('your-domain.com')) {
        const amenities = $('.amenity-item, .amenities li').map((i, el) => $(el).text().trim()).get();
        const accommodations = $('.accommodation-item, .room-type').map((i, el) => $(el).text().trim()).get();
        const activities = $('.activity-item, .activities li').map((i, el) => $(el).text().trim()).get();
        
        if (amenities.length > 0) structuredData.amenities = amenities;
        if (accommodations.length > 0) structuredData.accommodations = accommodations;
        if (activities.length > 0) structuredData.activities = activities;
      }

      // Estimate token count (rough estimation: 1 token ≈ 4 characters)
      const tokenCount = Math.ceil(content.length / 4);
      totalTokens += tokenCount;

      // Save to knowledgeContent collection
      const contentDoc = {
        sourceId: source.id,
        title: title,
        content: content,
        url: url,
        tokenCount: tokenCount,
        metadata: structuredData,
        processedAt: admin.firestore.Timestamp.now(),
        scrapedAt: new Date().toISOString()
      };

      const docRef = await admin.firestore()
        .collection('knowledgeContent')
        .add(contentDoc);

      processedContent.push({ id: docRef.id, ...contentDoc });
      
      console.log(`✅ Processed ${url}: ${tokenCount} tokens, ${content.length} chars`);

    } catch (error) {
      console.error(`❌ Failed to process ${url}:`, error);
      // Continue with other URLs but don't fail the entire process
      // TODO: Could save error info to a separate collection for debugging
    }
  }

  return {
    contentCount: processedContent.length,
    tokenCount: totalTokens,
    processedContent
  };
}

/**
 * Process Google Sheet Source
 * Adapted from larryai test-sheets-access.js and functions/index.js
 */
async function processGoogleSheetSource(source) {
  const { config } = source;
  const spreadsheetId = extractSpreadsheetId(config.url);
  
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL');
  }

  try {
    // Check if service account is available
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('Google Service Account key not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY in Cloud Functions secrets.');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // Set up authentication
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    console.log(`Processing Google Sheet: ${spreadsheetId}`);

    // Clear existing content for this source first
    await clearExistingContent(source.id);

    // Get spreadsheet metadata first to get the title and verify access
    const driveResponse = await drive.files.get({
      fileId: spreadsheetId,
      fields: 'id,name,mimeType,modifiedTime,webViewLink'
    });

    if (driveResponse.data.mimeType !== 'application/vnd.google-apps.spreadsheet') {
      throw new Error('File is not a Google Spreadsheet');
    }

    // Get detailed spreadsheet data with grid content
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      includeGridData: true
    });

    let fullContent = `Spreadsheet: ${driveResponse.data.name}\n\n`;
    let totalTokens = 0;
    const processedContent = [];

    // Extract content from all sheets
    if (spreadsheet.data.sheets) {
      for (const sheet of spreadsheet.data.sheets) {
        const sheetTitle = sheet.properties.title;
        let sheetContent = `Sheet: ${sheetTitle}\n`;
        
        if (sheet.data && sheet.data[0] && sheet.data[0].rowData) {
          const rows = [];
          sheet.data[0].rowData.forEach((row, rowIndex) => {
            if (row.values) {
              const rowContent = row.values
                .map(cell => cell.formattedValue || '')
                .join('\t');
              if (rowContent.trim()) {
                rows.push(rowContent);
                sheetContent += `${rowContent}\n`;
              }
            }
          });
          
          console.log(`  Sheet "${sheetTitle}": ${rows.length} rows`);
        }
        
        sheetContent += '\n';
        fullContent += sheetContent;

        // Create a separate content entry for each sheet
        const tokenCount = Math.ceil(sheetContent.length / 4);
        totalTokens += tokenCount;

        const contentDoc = {
          sourceId: source.id,
          title: `${driveResponse.data.name} - ${sheetTitle}`,
          content: sheetContent,
          url: `${config.url}#gid=${sheet.properties.sheetId}`,
          tokenCount: tokenCount,
          metadata: {
            spreadsheetId: spreadsheetId,
            sheetTitle: sheetTitle,
            sheetId: sheet.properties.sheetId,
            lastModified: driveResponse.data.modifiedTime,
            mimeType: driveResponse.data.mimeType,
            webViewLink: driveResponse.data.webViewLink
          },
          processedAt: admin.firestore.Timestamp.now(),
          scrapedAt: new Date().toISOString()
        };

        const docRef = await admin.firestore()
          .collection('knowledgeContent')
          .add(contentDoc);

        processedContent.push({ id: docRef.id, ...contentDoc });
      }
    }

    console.log(`✅ Processed Google Sheet ${spreadsheetId}: ${processedContent.length} sheets, ${totalTokens} tokens`);

    return {
      contentCount: processedContent.length,
      tokenCount: totalTokens,
      processedContent
    };

  } catch (error) {
    if (error.code === 403) {
      throw new Error(`Access denied to Google Sheet. Please share the spreadsheet with the service account email and ensure it has Viewer permissions. Error: ${error.message}`);
    } else if (error.code === 404) {
      throw new Error(`Google Sheet not found. Please check the URL and ensure the spreadsheet exists. Error: ${error.message}`);
    } else {
      console.error('Error processing Google Sheet:', error);
      throw new Error(`Failed to process Google Sheet: ${error.message}`);
    }
  }
}

/**
 * Process Google Doc Source
 * Adapted from larryai functions/index.js
 */
async function processGoogleDocSource(source) {
  const { config } = source;
  const docId = extractDocumentId(config.url);
  
  if (!docId) {
    throw new Error('Invalid Google Docs URL');
  }

  try {
    // Check if service account is available
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('Google Service Account key not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY in Cloud Functions secrets.');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // Set up authentication
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: [
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    });

    const authClient = await auth.getClient();
    const docs = google.docs({ version: 'v1', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    console.log(`Processing Google Doc: ${docId}`);

    // Clear existing content for this source first
    await clearExistingContent(source.id);

    // Get document metadata first
    const driveResponse = await drive.files.get({
      fileId: docId,
      fields: 'id,name,mimeType,modifiedTime,webViewLink'
    });

    if (driveResponse.data.mimeType !== 'application/vnd.google-apps.document') {
      throw new Error('File is not a Google Document');
    }

    // Get document content
    const docResponse = await docs.documents.get({ documentId: docId });
    
    // Extract text content from the document
    const content = extractTextFromDoc(docResponse.data);
    
    // Estimate token count
    const tokenCount = Math.ceil(content.length / 4);

    // Save to knowledgeContent collection
    const contentDoc = {
      sourceId: source.id,
      title: driveResponse.data.name,
      content: content,
      url: config.url,
      tokenCount: tokenCount,
      metadata: {
        documentId: docId,
        lastModified: driveResponse.data.modifiedTime,
        mimeType: driveResponse.data.mimeType,
        webViewLink: driveResponse.data.webViewLink
      },
      processedAt: admin.firestore.Timestamp.now(),
      scrapedAt: new Date().toISOString()
    };

    const docRef = await admin.firestore()
      .collection('knowledgeContent')
      .add(contentDoc);

    console.log(`✅ Processed Google Doc ${docId}: ${tokenCount} tokens, ${content.length} chars`);

    return {
      contentCount: 1,
      tokenCount: tokenCount,
      processedContent: [{ id: docRef.id, ...contentDoc }]
    };

  } catch (error) {
    if (error.code === 403) {
      throw new Error(`Access denied to Google Doc. Please share the document with the service account email and ensure it has Viewer permissions. Error: ${error.message}`);
    } else if (error.code === 404) {
      throw new Error(`Google Doc not found. Please check the URL and ensure the document exists. Error: ${error.message}`);
    } else {
      console.error('Error processing Google Doc:', error);
      throw new Error(`Failed to process Google Doc: ${error.message}`);
    }
  }
}

/**
 * Process PDF Upload Source
 */
async function processPDFUploadSource(source) {
  // TODO: Implement PDF text extraction
  throw new Error('PDF upload processing not yet implemented - requires PDF parsing library');
}

/**
 * Process PDF URL Source
 */
async function processPDFUrlSource(source) {
  // TODO: Implement PDF download and text extraction
  throw new Error('PDF URL processing not yet implemented - requires PDF parsing library');
}

/**
 * Utility Functions
 */
function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function extractDocumentId(url) {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Clear existing content for a knowledge source
 */
async function clearExistingContent(sourceId) {
  try {
    const existingContent = await admin.firestore()
      .collection('knowledgeContent')
      .where('sourceId', '==', sourceId)
      .get();

    if (!existingContent.empty) {
      const batch = admin.firestore().batch();
      existingContent.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Cleared ${existingContent.size} existing content items for source ${sourceId}`);
    }
  } catch (error) {
    console.error('Error clearing existing content:', error);
    // Don't throw - this is not critical to the processing
  }
}

/**
 * Extract text content from Google Docs response
 * Adapted from larryai extractTextFromDoc function
 */
function extractTextFromDoc(doc) {
  let text = '';
  
  if (doc.body && doc.body.content) {
    for (const element of doc.body.content) {
      if (element.paragraph) {
        const paragraph = element.paragraph;
        if (paragraph.elements) {
          for (const elem of paragraph.elements) {
            if (elem.textRun && elem.textRun.content) {
              text += elem.textRun.content;
            }
          }
        }
      } else if (element.table) {
        // Handle tables
        for (const row of element.table.tableRows) {
          for (const cell of row.tableCells) {
            if (cell.content) {
              for (const cellElement of cell.content) {
                if (cellElement.paragraph && cellElement.paragraph.elements) {
                  for (const elem of cellElement.paragraph.elements) {
                    if (elem.textRun && elem.textRun.content) {
                      text += elem.textRun.content;
                    }
                  }
                }
              }
            }
          }
          text += '\n'; // End of table row
        }
      }
    }
  }
  
  return text.trim();
}