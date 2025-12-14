/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTask, updateTask } from '@/lib/firebase/taskService';
import { Task, TaskFormData } from '@/lib/types/task';
import { User } from '@/lib/types/user';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { getAllUsers } from '@/lib/firebase/userClientService';

interface TaskFormProps {
  projectId: string;
  task?: Task | null;
  onSuccess?: () => void;
}

const formSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  partsRequired: z.string().optional(),
  toolsRequired: z.string().optional(),
  assignedTo: z.union([z.string(), z.literal('unassigned')]).optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  cost: z.number().min(0, 'Cost must be positive'),
});


export function TaskForm({ projectId, task, onSuccess }: TaskFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: task?.description || '',
      partsRequired: task?.partsRequired || '',
      toolsRequired: task?.toolsRequired || '',
      assignedTo: task?.assignedTo || 'unassigned',
      dueDate: task?.dueDate
        ? new Date(task.dueDate.toDate()).toISOString().split('T')[0]
        : '',
      cost: task?.cost || 0,
    },
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      // Filter to only show tech and admin users for assignment
      const assignableUsers = allUsers.filter(
        (user) => user.role === 'tech' || user.role === 'company_admin' || user.role === 'organization_admin' || user.role === 'system_admin' || user.role === 'super_admin'
      );
      setUsers(assignableUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const taskData: TaskFormData = {
        ...values,
        assignedTo: values.assignedTo === 'unassigned' ? '' : (values.assignedTo || ''),
        partsRequired: values.partsRequired || '',
        toolsRequired: values.toolsRequired || '',
      };

      if (task) {
        await updateTask(task.id, taskData);
        toast({
          title: 'Success',
          description: 'Task updated successfully',
        });
      } else {
        await createTask(projectId, taskData);
        toast({
          title: 'Success',
          description: 'Task created successfully',
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/projects/${projectId}`);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save task',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{task ? 'Edit Task' : 'Create Task'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the task..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="partsRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parts Required</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="List required parts" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toolsRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tools Required</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="List required tools" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || 'unassigned'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.uid} value={user.uid}>
                            {user.displayName} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {task ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}