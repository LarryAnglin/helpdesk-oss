/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('./cors');

/**
 * Task functions handler for the Help Desk API
 */

// Collection constants
const TASKS_COLLECTION = 'tasks';
const PROJECTS_COLLECTION = 'projects';

// Validate task status values
const VALID_TASK_STATUSES = [
  'Created',
  'Assigned',
  'In Progress',
  'Finished',
  'Cancelled',
  'Deferred',
  'Scheduled',
  'Closed'
];

// Helper to check if a status value is valid
const isValidTaskStatus = (status) => VALID_TASK_STATUSES.includes(status);

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

// Helper to get a task by ID
const getTaskById = async (taskId) => {
  try {
    const taskDoc = await admin.firestore().collection(TASKS_COLLECTION).doc(taskId).get();
    
    if (!taskDoc.exists) {
      return null;
    }
    
    return {
      id: taskDoc.id,
      ...taskDoc.data()
    };
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
};

// Helper to add task ID to project's tasks array
const addTaskToProject = async (projectId, taskId) => {
  try {
    const projectRef = admin.firestore().collection(PROJECTS_COLLECTION).doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const project = projectDoc.data();
    const tasks = project.tasks || [];
    
    if (!tasks.includes(taskId)) {
      await projectRef.update({
        tasks: [...tasks, taskId],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error adding task to project:', error);
    throw error;
  }
};

// Helper to remove task ID from project's tasks array
const removeTaskFromProject = async (projectId, taskId) => {
  try {
    const projectRef = admin.firestore().collection(PROJECTS_COLLECTION).doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const project = projectDoc.data();
    const tasks = project.tasks || [];
    
    await projectRef.update({
      tasks: tasks.filter(id => id !== taskId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing task from project:', error);
    throw error;
  }
};

// Handler for GET requests
const handleGet = async (req, res, userId) => {
  try {
    // Check if user is admin
    const admin = await isUserAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Forbidden: Only admins can access tasks' });
    }

    const { id, projectId, status } = req.query;
    
    // Get a specific task
    if (id) {
      const task = await getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      return res.status(200).json({ task });
    }
    
    // Get tasks for a project with optional status filter
    if (projectId) {
      let tasksQuery = admin.firestore().collection(TASKS_COLLECTION)
        .where('projectId', '==', projectId);
      
      if (status) {
        const statusValues = Array.isArray(status) ? status : [status];
        const validStatusValues = statusValues.filter(isValidTaskStatus);
        
        if (validStatusValues.length > 0) {
          tasksQuery = tasksQuery.where('status', 'in', validStatusValues);
        }
      }
      
      // Order by the order field for drag and drop
      tasksQuery = tasksQuery.orderBy('order', 'asc');
      
      const tasksSnapshot = await tasksQuery.get();
      const tasks = [];
      
      tasksSnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return res.status(200).json({ tasks });
    }
    
    return res.status(400).json({ error: 'Either task id or projectId is required' });
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
      return res.status(403).json({ error: 'Forbidden: Only admins can create or update tasks' });
    }

    // Handle task reordering
    if (req.body.taskOrders) {
      const batch = admin.firestore().batch();
      
      req.body.taskOrders.forEach(({ id, order }) => {
        const taskRef = admin.firestore().collection(TASKS_COLLECTION).doc(id);
        batch.update(taskRef, { 
          order,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      return res.status(200).json({ success: true });
    }
    
    // Handle task creation
    const { projectId, description, partsRequired, toolsRequired, assignedTo, dueDate, cost } = req.body;
    
    // Validate required fields
    if (!projectId || !description || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get the task count to determine order
    const tasksQuery = admin.firestore().collection(TASKS_COLLECTION)
      .where('projectId', '==', projectId);
    const tasksSnapshot = await tasksQuery.get();
    const order = tasksSnapshot.size; // New task goes at the end of the list
    
    // Create the task
    const newTask = {
      projectId,
      description,
      partsRequired: partsRequired || '',
      toolsRequired: toolsRequired || '',
      assignedTo: assignedTo || '',
      dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
      cost: Number(cost) || 0,
      status: 'Created',
      order,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const taskRef = await admin.firestore().collection(TASKS_COLLECTION).add(newTask);
    
    // Add the task ID to the project's tasks array
    await addTaskToProject(projectId, taskRef.id);
    
    // Get the created task with ID
    const task = await getTaskById(taskRef.id);
    
    return res.status(201).json({ task });
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
      return res.status(403).json({ error: 'Forbidden: Only admins can update tasks' });
    }

    const { id } = req.query;
    const { status, ...updates } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const taskRef = admin.firestore().collection(TASKS_COLLECTION).doc(id);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update status if provided
    if (status) {
      if (!isValidTaskStatus(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      await taskRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } 
    // Otherwise update other fields
    else if (Object.keys(updates).length > 0) {
      const taskData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (updates.description !== undefined) taskData.description = updates.description;
      if (updates.partsRequired !== undefined) taskData.partsRequired = updates.partsRequired;
      if (updates.toolsRequired !== undefined) taskData.toolsRequired = updates.toolsRequired;
      if (updates.assignedTo !== undefined) taskData.assignedTo = updates.assignedTo;
      if (updates.dueDate !== undefined) taskData.dueDate = admin.firestore.Timestamp.fromDate(new Date(updates.dueDate));
      if (updates.cost !== undefined) taskData.cost = Number(updates.cost);
      
      await taskRef.update(taskData);
    } else {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    // Get the updated task
    const task = await getTaskById(id);
    
    return res.status(200).json({ task });
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
      return res.status(403).json({ error: 'Forbidden: Only admins can delete tasks' });
    }

    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const taskRef = admin.firestore().collection(TASKS_COLLECTION).doc(id);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskDoc.data();
    
    // Remove the task from the project's tasks array
    await removeTaskFromProject(task.projectId, id);
    
    // Delete the task
    await taskRef.delete();
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling DELETE request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Main tasks handler
exports.handleTasks = async (req, res) => {
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