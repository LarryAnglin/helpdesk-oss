/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Project } from '@/lib/types/project';
import { Task } from '@/lib/types/task';
import { getProjectById, updateProjectStatus } from '@/lib/firebase/projectService';
import { getProjectTasks } from '@/lib/firebase/taskService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { hasRole } from '@/lib/utils/roleUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Edit, Plus, ArrowLeft } from 'lucide-react';
import { TaskList } from './TaskList';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  const loadProjectData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [projectData, projectTasks] = await Promise.all([
        getProjectById(id),
        getProjectTasks(id),
      ]);

      if (!projectData) {
        toast({
          title: 'Error',
          description: 'Project not found',
          variant: 'destructive',
        });
        navigate('/projects');
        return;
      }

      setProject(projectData);
      setTasks(projectTasks);
    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;

    try {
      await updateProjectStatus(project.id, newStatus);
      toast({
        title: 'Success',
        description: 'Project status updated',
      });
      loadProjectData();
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'default';
      case 'Cancelled':
      case 'Denied':
        return 'destructive';
      case 'Waiting':
      case 'Deferred':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div>Loading project...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const canEdit = hasRole(userData?.role, 'tech');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        {canEdit && (
          <Button
            onClick={() => navigate(`/projects/edit/${project.id}`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Project
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{project.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(project.status)}>
                {project.status}
              </Badge>
              {canEdit && (
                <Select
                  value={project.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Created">Created</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Denied">Denied</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting">Waiting</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Deferred">Deferred</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <h3 className="font-semibold">Description</h3>
              <p className="text-gray-700 dark:text-gray-300">
                {project.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Location</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {project.location}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Price</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  ${project.price.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Due Date</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {formatDate(project.dueDate.toDate().getTime())}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Created</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {formatDate(project.createdAt.toDate().getTime())}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Tasks</h2>
          {canEdit && (
            <Button
              onClick={() => navigate(`/projects/${project.id}/tasks/new`)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          )}
        </div>
        <TaskList tasks={tasks} projectId={project.id} />
      </div>
    </div>
  );
}