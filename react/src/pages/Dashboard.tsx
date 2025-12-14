/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../lib/auth/AuthContext';
import { hasRole } from '../lib/utils/roleUtils';
import { getTickets } from '../lib/firebase/ticketService';
// import { getUsers } from '../lib/firebase/userService';
import { Ticket } from '../lib/types/ticket';
import { DashboardData, DateRange, DEFAULT_DATE_RANGES } from '../lib/types/dashboard';
import {
  calculateTicketMetrics,
  calculateSLAMetrics,
  calculateTechPerformance,
  calculateDailyTrends,
  getRecentActivity,
  formatDuration,
  getWorkloadColor,
} from '../lib/utils/dashboardUtils';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_tickets, setTickets] = useState<Ticket[]>([]);
  const [_users, setUsers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<string>('thisMonth');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Check if user has access to dashboard
  const hasAccess = hasRole(userData?.role, 'tech');

  useEffect(() => {
    if (!hasAccess) {
      setError('You do not have permission to view the dashboard');
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [hasAccess, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Double-check access before loading data
      if (!hasAccess) {
        setError('You do not have permission to view the dashboard');
        setLoading(false);
        return;
      }

      // Get date range
      const range = getDateRangeFromString(dateRange);

      // Load tickets and users
      const { getAllUsers } = await import('../lib/firebase/userClientService');
      const [ticketsData, usersData] = await Promise.all([
        getTickets(),
        getAllUsers()
      ]);

      setTickets(ticketsData);
      setUsers(usersData);

      // Calculate metrics
      const ticketMetrics = calculateTicketMetrics(ticketsData, range);
      const slaMetrics = calculateSLAMetrics(ticketsData, range);
      const techPerformance = calculateTechPerformance(ticketsData, usersData, range);
      const recentActivity = getRecentActivity(ticketsData, usersData);
      const dailyTrends = calculateDailyTrends(ticketsData);

      const dashboard: DashboardData = {
        overview: {
          totalTickets: ticketMetrics.total,
          openTickets: ticketMetrics.open,
          resolvedToday: ticketMetrics.resolved,
          averageResolutionTime: ticketMetrics.averageResolutionTime,
          slaCompliance: ticketMetrics.slaComplianceRate,
        },
        ticketMetrics,
        slaMetrics,
        techPerformance,
        recentActivity,
        trends: {
          daily: dailyTrends,
          weekly: [] // Could add weekly trends later
        }
      };

      setDashboardData(dashboard);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFromString = (range: string): DateRange | undefined => {
    switch (range) {
      case 'today':
        return DEFAULT_DATE_RANGES.today();
      case 'yesterday':
        return DEFAULT_DATE_RANGES.yesterday();
      case 'thisWeek':
        return DEFAULT_DATE_RANGES.thisWeek();
      case 'thisMonth':
        return DEFAULT_DATE_RANGES.thisMonth();
      case 'last30Days':
        return DEFAULT_DATE_RANGES.last30Days();
      default:
        return undefined;
    }
  };

  const handleDateRangeChange = (event: SelectChangeEvent) => {
    setDateRange(event.target.value);
  };

  const handleCardClick = (filterType: string) => {
    const isAdmin = hasRole(userData?.role, 'tech');
    const basePath = isAdmin ? '/tickets/all' : '/tickets';
    
    switch (filterType) {
      case 'total':
        navigate(`${basePath}?status=all`);
        break;
      case 'open':
        navigate(`${basePath}?status=open`);
        break;
      case 'resolved':
        navigate(`${basePath}?status=resolved`);
        break;
      default:
        navigate(basePath);
    }
  };

  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have permission to view the dashboard. Contact your administrator for access.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No dashboard data available</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Help Desk Dashboard
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Date Range</InputLabel>
          <Select
            value={dateRange}
            onChange={handleDateRangeChange}
            label="Date Range"
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="yesterday">Yesterday</MenuItem>
            <MenuItem value="thisWeek">This Week</MenuItem>
            <MenuItem value="thisMonth">This Month</MenuItem>
            <MenuItem value="last30Days">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Cards */}
      <Box sx={{ display: 'grid', gap: 3, mb: 4, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' } }}>
        <Box>
          <Card 
            onClick={() => handleCardClick('total')}
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
                transition: 'all 0.2s ease-in-out'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Tickets
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.overview.totalTickets}
                  </Typography>
                </Box>
                <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card 
            onClick={() => handleCardClick('open')}
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
                transition: 'all 0.2s ease-in-out'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Open Tickets
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.overview.openTickets}
                  </Typography>
                </Box>
                <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card 
            onClick={() => handleCardClick('resolved')}
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
                transition: 'all 0.2s ease-in-out'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Resolved
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.overview.resolvedToday}
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg Resolution
                  </Typography>
                  <Typography variant="h4">
                    {formatDuration(dashboardData.overview.averageResolutionTime)}
                  </Typography>
                </Box>
                <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    SLA Compliance
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.overview.slaCompliance.toFixed(1)}%
                  </Typography>
                </Box>
                <WarningIcon 
                  color={dashboardData.overview.slaCompliance >= 90 ? "success" : "error"} 
                  sx={{ fontSize: 40 }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Detailed Metrics */}
      <Box sx={{ display: 'grid', gap: 3, mb: 4, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {/* Ticket Distribution */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ticket Distribution
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">By Status</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Chip label={`Open: ${dashboardData.ticketMetrics.open}`} color="primary" size="small" />
                    <Chip label={`Resolved: ${dashboardData.ticketMetrics.resolved}`} color="success" size="small" />
                    <Chip label={`Closed: ${dashboardData.ticketMetrics.closed}`} color="default" size="small" />
                  </Box>
                </Box>
              </Box>
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">By Priority</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Chip label={`Urgent: ${dashboardData.ticketMetrics.urgent}`} color="error" size="small" />
                    <Chip label={`High: ${dashboardData.ticketMetrics.high}`} color="warning" size="small" />
                    <Chip label={`Medium: ${dashboardData.ticketMetrics.medium}`} color="info" size="small" />
                    <Chip label={`Low: ${dashboardData.ticketMetrics.low}`} color="default" size="small" />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* SLA Performance */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              SLA Performance
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Response Compliance: {dashboardData.slaMetrics.responseCompliance.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={dashboardData.slaMetrics.responseCompliance} 
                color={dashboardData.slaMetrics.responseCompliance >= 90 ? "success" : "error"}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Resolution Compliance: {dashboardData.slaMetrics.resolutionCompliance.toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={dashboardData.slaMetrics.resolutionCompliance} 
                color={dashboardData.slaMetrics.resolutionCompliance >= 90 ? "success" : "error"}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`On Time: ${dashboardData.slaMetrics.onTime}`} color="success" size="small" />
              <Chip label={`At Risk: ${dashboardData.slaMetrics.atRisk}`} color="warning" size="small" />
              <Chip label={`Breached: ${dashboardData.slaMetrics.totalBreached}`} color="error" size="small" />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Tech Performance */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Tech Performance
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tech</TableCell>
                <TableCell align="right">Assigned</TableCell>
                <TableCell align="right">Resolved</TableCell>
                <TableCell align="right">Avg Response</TableCell>
                <TableCell align="right">Avg Resolution</TableCell>
                <TableCell align="right">SLA Compliance</TableCell>
                <TableCell align="right">Workload</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.techPerformance.map((tech) => (
                <TableRow key={tech.techId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" />
                      {tech.techName}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{tech.assignedTickets}</TableCell>
                  <TableCell align="right">{tech.resolvedTickets}</TableCell>
                  <TableCell align="right">{formatDuration(tech.averageResponseTime)}</TableCell>
                  <TableCell align="right">{formatDuration(tech.averageResolutionTime)}</TableCell>
                  <TableCell align="right">{tech.slaCompliance.toFixed(1)}%</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={tech.workload} 
                      color={getWorkloadColor(tech.workload) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Recent Activity */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ticket</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Tech</TableCell>
                <TableCell align="right">Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.recentActivity.map((activity, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Tooltip title={activity.title}>
                      <Link 
                        to={`/tickets/${activity.ticketId}`}
                        style={{ 
                          textDecoration: 'none', 
                          color: 'inherit'
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          noWrap 
                          sx={{ 
                            maxWidth: 300,
                            '&:hover': {
                              color: 'primary.main',
                              textDecoration: 'underline'
                            },
                            cursor: 'pointer'
                          }}
                        >
                          {activity.title}
                        </Typography>
                      </Link>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={activity.action} 
                      color={activity.action === 'created' ? 'primary' : 'success'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{activity.techName || '-'}</TableCell>
                  <TableCell align="right">
                    {new Date(activity.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard;