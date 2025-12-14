/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Task } from '@/lib/types/task';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { deleteTask } from '@/lib/firebase/taskService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/AuthContext';

interface TaskListProps {
  tasks: Task[];
  projectId: string;
  onTasksChange?: () => void;
}

export function TaskList({ tasks, projectId, onTasksChange }: TaskListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useAuth();

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await deleteTask(taskId);
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
      if (onTasksChange) {
        onTasksChange();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };


  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Finished':
      case 'Closed':
        return 'success';
      case 'In Progress':
      case 'Assigned':
        return 'default';
      case 'Cancelled':
        return 'destructive';
      case 'Deferred':
      case 'Scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const isAdmin = userData?.role === 'system_admin' || userData?.role === 'super_admin';
  const isTech = userData?.role === 'tech';
  const canEdit = isAdmin || isTech;

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No tasks yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{task.description}</h3>
                  <Badge variant={getStatusBadgeVariant(task.status)}>
                    {task.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Due:</span>{' '}
                    {formatDate(task.dueDate.toDate().getTime())}
                  </div>
                  <div>
                    <span className="font-medium">Cost:</span> ${task.cost.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Assigned to:</span>{' '}
                    {task.assignedTo || 'Unassigned'}
                  </div>
                  <div>
                    <span className="font-medium">Parts:</span>{' '}
                    {task.partsRequired || 'None'}
                  </div>
                </div>
              </div>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/projects/${projectId}/tasks/edit/${task.id}`)
                      }
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}