/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');

const exportData = async (req, res) => {
  try {
    // Fetch the tickets
    const ticketsQuery = admin.firestore().collection('tickets');
    const snapshot = await ticketsQuery.get();
    const tickets = snapshot.docs.map((doc) => {
      const ticket = doc.data();
      return { id: doc.id, ...ticket };
    });

    // Send the tickets as a JSON response
    res.setHeader('Content-Disposition', 'attachment; filename="tickets_export.json"');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(tickets, null, 2));
  } catch (error) {
    console.error('Error exporting tickets:', error);
    return res.status(500).json({ error: 'Failed to export tickets' });
  }
};

module.exports = { exportData };