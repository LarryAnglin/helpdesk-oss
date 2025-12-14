/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { updateUser } from '@/lib/firebase/userClientService';
import { User, UserFormData } from '@/lib/types/user';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { Company } from '@/lib/types/company';
import { getAllCompanies } from '@/lib/firebase/companyService';

interface UserEditDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['user', 'tech', 'company_admin', 'organization_admin', 'system_admin', 'super_admin'] as const),
  photoURL: z.union([z.string().url('Invalid URL'), z.literal('')]).optional(),
  disabled: z.boolean(),
  companyId: z.union([z.string(), z.literal('none')]).optional(),
});

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const { toast } = useToast();
  const { user: currentUser, userData } = useAuth();
  
  // Determine user's permission level
  const isSuperAdmin = userData?.role === 'super_admin';
  const isSystemAdmin = userData?.role === 'system_admin' || isSuperAdmin;
  const isOrgAdmin = userData?.role === 'organization_admin' || isSystemAdmin;
  const isCompanyAdmin = userData?.role === 'company_admin' || isOrgAdmin;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      displayName: '',
      role: 'user',
      photoURL: '',
      disabled: false,
      companyId: 'none',
    },
  });
  
  // Load companies when dialog opens
  useEffect(() => {
    if (open && isOrgAdmin) {
      loadCompanies();
    }
  }, [open, isOrgAdmin]);
  
  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const companyList = await getAllCompanies();
      setCompanies(companyList);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        photoURL: user.photoURL || '',
        disabled: user.disabled || false,
        companyId: user.companyId || 'none',
      });
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const userData: Partial<UserFormData> = {
        ...values,
        photoURL: values.photoURL || undefined,
        companyId: values.companyId === 'none' ? undefined : values.companyId,
      };

      await updateUser(user.uid, userData);
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      
      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="user@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John Doe" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={user?.uid === currentUser?.uid || (isCompanyAdmin && !['user', 'tech'].includes(field.value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="tech">Tech</SelectItem>
                      {isCompanyAdmin && <SelectItem value="company_admin">Company Admin</SelectItem>}
                      {isOrgAdmin && <SelectItem value="organization_admin">Organization Admin</SelectItem>}
                      {isSystemAdmin && <SelectItem value="system_admin">System Admin</SelectItem>}
                      {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {user?.uid === currentUser?.uid ? 
                      "You cannot change your own role" : 
                      isCompanyAdmin && !isOrgAdmin ? 'Company admins can only edit users, techs, and company admins' : "Select the user's permission level"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isOrgAdmin && (
              <FormField
                control={form.control as any}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || 'none'}
                      disabled={loadingCompanies}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingCompanies ? 'Loading...' : 'Select a company (optional)'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Company</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assign user to a company for branding
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control as any}
              name="photoURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo URL (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://example.com/photo.jpg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="disabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={user?.uid === currentUser?.uid}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Disable account
                    </FormLabel>
                    <FormDescription>
                      {user?.uid === currentUser?.uid ? 
                        "You cannot disable your own account" : 
                        "Prevent the user from logging in"
                      }
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}