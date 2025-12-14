/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('./cors');

/**
 * Project functions handler for the Help Desk API
 */

// Collection constants
const PROJECTS_COLLECTION = 'projects';

// Validate project status values
const VALID_PROJECT_STATUSES = [
  'Created',
  'Approved',
  'Denied',
  'In Progress',
  'Waiting',
  'Cancelled',
  'Deferred',
  'Completed'
];

// Helper to check if a status value is valid
const isValidProjectStatus = (status) => VALID_PROJECT_STATUSES.includes(status);

// Check if user is admin
const isUserAdmin = async (uid) => {
  try {
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};
    return customClaims.role === 'admin';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

// Helper to get a project by ID
const getProjectById = async (projectId) => {
  try {
    const projectDoc = await admin.firestore().collection(PROJECTS_COLLECTION).doc(projectId).get();
    
    if (!projectDoc.exists) {
      return null;
    }
    
    return {
      id: projectDoc.id,
      ...projectDoc.data()
    };
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
};

// Handler for GET requests
const handleGet = async (req, res, userId) => {
  try {
    // Check if user is admin
    const admin = await isUserAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Forbidden: Only admins can access projects' });
    }

    const { id, status } = req.query;
    
    // Get a specific project
    if (id) {
      const project = await getProjectById(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json({ project });
    }
    
    // Get all projects with optional status filter
    let projectsQuery = admin.firestore().collection(PROJECTS_COLLECTION);
    
    if (status) {
      const statusValues = Array.isArray(status) ? status : [status];
      const validStatusValues = statusValues.filter(isValidProjectStatus);
      
      if (validStatusValues.length > 0) {
        projectsQuery = projectsQuery.where('status', 'in', validStatusValues);
      }
    }
    
    // Order by creation date, newest first
    projectsQuery = projectsQuery.orderBy('createdAt', 'desc');
    
    const projectsSnapshot = await projectsQuery.get();
    const projects = [];
    
    projectsSnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({ projects });
  } catch (error) {
    console.error('Error handling GET request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Handler for POST requests
const handlePost = async (req, res, userId) => {
  try {
    // Check if user is admin
    const admin = await isUserAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Forbidden: Only admins can create projects' });
    }

    const { title, description, location, price, dueDate } = req.body;
    
    // Validate required fields
    if (!title || !description || !location || price === undefined || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the project
    const newProject = {
      title,
      description,
      location,
      price: Number(price),
      dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
      status: 'Created',
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      tasks: []
    };
    
    const projectRef = await admin.firestore().collection(PROJECTS_COLLECTION).add(newProject);
    
    // Get the created project with ID
    const project = await getProjectById(projectRef.id);
    
    return res.status(201).json({ project });
  } catch (error) {
    console.error('Error handling POST request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Handler for PUT requests
const handlePut = async (req, res, userId) => {
  try {
    // Check if user is admin
    const admin = await isUserAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Forbidden: Only admins can update projects' });
    }

    const { id } = req.query;
    const { status, ...updates } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const projectRef = admin.firestore().collection(PROJECTS_COLLECTION).doc(id);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update status if provided
    if (status) {
      if (!isValidProjectStatus(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      await projectRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } 
    // Otherwise update other fields
    else if (Object.keys(updates).length > 0) {
      const projectData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (updates.title) projectData.title = updates.title;
      if (updates.description) projectData.description = updates.description;
      if (updates.location) projectData.location = updates.location;
      if (updates.price !== undefined) projectData.price = Number(updates.price);
      if (updates.dueDate) projectData.dueDate = admin.firestore.Timestamp.fromDate(new Date(updates.dueDate));
      
      await projectRef.update(projectData);
    } else {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    // Get the updated project
    const project = await getProjectById(id);
    
    return res.status(200).json({ project });
  } catch (error) {
    console.error('Error handling PUT request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Handler for DELETE requests
const handleDelete = async (req, res, userId) => {
  try {
    // Check if user is admin
    const admin = await isUserAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Forbidden: Only admins can delete projects' });
    }

    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const projectRef = admin.firestore().collection(PROJECTS_COLLECTION).doc(id);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // TODO: In production, this should also delete associated tasks
    
    await projectRef.delete();
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling DELETE request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Main projects handler
exports.handleProjects = async (req, res) => {
  // Apply CORS middleware
  cors(req, res, async () => {
    try {
      // Authentication check
      let userId = '';
      
      // Check for Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const token = authHeader.split('Bearer ')[1];
      
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      // Handle different HTTP methods
      switch (req.method) {
        case 'GET':
          return handleGet(req, res, userId);
        case 'POST':
          return handlePost(req, res, userId);
        case 'PUT':
          return handlePut(req, res, userId);
        case 'DELETE':
          return handleDelete(req, res, userId);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};