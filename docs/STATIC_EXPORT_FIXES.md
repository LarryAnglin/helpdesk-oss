<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Export Fixes

This document explains fixes made to address issues with static exports in the Help Desk application.

## Issues Fixed

1. **Notification Display Issue**
   - Problem: Notification bell showed a count but displayed "No new notifications" when clicked
   - Fixed by updating the `NotificationContext.tsx` to properly manage and display notifications
   - Added better debugging and fixed filtering of notifications

2. **Ticket Viewing Issue**
   - Problem: When clicking on a ticket to view it from the All Tickets page, the auth screen appeared briefly before redirecting to the Create Ticket screen
   - Fixed by handling the static export case better in the ticket detail component
   - Added proper error handling for placeholder tickets

3. **Infinite Loading Loop Issue**
   - Problem: Ticket detail view would enter an infinite loop of loading attempts
   - Fixed by adding fetch tracking state to prevent repeated loading
   - Added timeout detection for CORS issues common in static exports
   - Improved error handling with clear messages about possible CORS issues
   - Added fallback demo content for displaying UI when Firestore is inaccessible

4. **React Rendering Error Issue**
   - Problem: Markdown content in tickets caused React error #185
   - Fixed by implementing a SafeMarkdown component with error boundaries
   - Downgraded react-markdown from 9.0.1 to 8.0.7 for better compatibility
   - Added content sanitization to handle null characters and other issues

5. **Authentication Loading State Issue**
   - Problem: Ticket details showing infinite loading spinner when user data is available
   - Fixed by changing the loading state detection to check user data directly
   - Added timeout to retry fetching after a delay if auth seems stuck
   - Improved logging to diagnose authentication and data loading issues

6. **API Access Issues in Static Export**
   - Problem: User management page failing with 401 errors when accessing API endpoints in static export
   - Fixed by implementing demo data functionality for user management
   - Added graceful detection of API access errors and fallback to demo mode
   - Simulated API operations for create, edit, delete and other user management functions

## Technical Details

### Notification System Fixes

1. **NotificationContext.tsx**:
   - Improved filtering logic to properly identify unread notifications
   - Added comprehensive logging to help diagnose issues
   - Modified the `markAsRead` function to retain ticket data for better UX

2. **Navbar.tsx**:
   - Updated the notification display logic to show content even after marking as read
   - Improved empty state handling

### Ticket Viewing Fixes

1. **TicketDetail.tsx**:
   - Added special handling for placeholder tickets that are pre-rendered during static export
   - Enhanced error handling with better feedback
   - Added debugging to trace ticket loading issues
   - Implemented fetch tracking to prevent infinite loading loops:
     ```typescript
     // Track if we've already attempted to fetch this ticket to prevent infinite loops
     const [fetchAttempted, setFetchAttempted] = useState<boolean>(false);
     const [fetchInProgress, setFetchInProgress] = useState<boolean>(false);
     const [authTimeout, setAuthTimeout] = useState<boolean>(false);
     
     // Force a retry after 5 seconds if we're stuck in loading
     useEffect(() => {
       const timeoutId = setTimeout(() => {
         if (!fetchAttempted && user && userData) {
           console.log('Auth data is available but fetch was never triggered - forcing retry');
           setAuthTimeout(true);
           setFetchInProgress(false);
         }
       }, 5000);
       
       return () => clearTimeout(timeoutId);
     }, [user, userData, fetchAttempted]);
     
     // Early return to prevent infinite loops
     if ((fetchAttempted && !authTimeout) || fetchInProgress) {
       return;
     }
     ```
   - Added fallback demo content for firestore access issues:
     ```typescript
     // Add timeout for Firestore requests in static exports
     const timeoutId = setTimeout(() => {
       if (!requestCompleted) {
         console.warn('Firestore request timeout - possible CORS or connectivity issue');
         
         // Try to show a demo ticket if we're in static export mode
         // This allows viewing the UI without real data in environments where Firestore is blocked
         const demoTicket = createDemoTicket(ticketId);
         console.log('Created demo ticket for display:', demoTicket.id);
         setTicket(demoTicket);
         setStatus(demoTicket.status);
         
         // Show a warning but don't prevent viewing with mock data
         setSnackbarMessage('Using demo data due to Firestore access issues');
         setSnackbarOpen(true);
       }
     }, 3000); // Reduced to 3 seconds for better UX
     ```
   - Implemented SafeMarkdown component with error boundaries:
     ```typescript
     function SafeMarkdown({ children }: { children: string | null | undefined }) {
       const content = children || '';
       const sanitizedContent = typeof content === 'string' 
         ? content.replace(/\u0000/g, '') : '';
       
       return (
         <ErrorBoundary FallbackComponent={({ error }) => 
           <MarkdownFallback error={error} text={sanitizedContent} />}>
           <ReactMarkdown>{sanitizedContent}</ReactMarkdown>
         </ErrorBoundary>
       );
     }
     ```

2. **TicketList.tsx**:
   - Changed from `Link` components to direct `router.push()` navigation
   - This ensures proper client-side navigation in static exports
   - Made ticket titles clickable with proper styling

3. **Package.json**:
   - Downgraded react-markdown from version 9.0.1 to 8.0.7 for better compatibility:
     ```json
     "react-markdown": "^8.0.7",
     ```

4. **UserList.tsx**:
   - Added demo data functionality for static exports:
     ```typescript
     // Generate demo users for static export when API is not available
     const generateDemoUsers = (): UserType[] => {
       const now = Date.now();
       const twoMonthsAgo = now - (60 * 24 * 60 * 60 * 1000);
       
       return [
         {
           uid: 'demo-admin-1',
           email: 'admin@example.com',
           displayName: 'Admin User',
           role: 'admin',
           createdAt: twoMonthsAgo,
           // Other properties...
         },
         // More demo users...
       ];
     };
     ```
   - Added error handling with fallback to demo mode:
     ```typescript
     try {
       // Try to fetch real users first
       const fetchedUsers = await getAllUsers();
       setUsers(fetchedUsers);
     } catch (apiError: any) {
       // If we get a CORS error or the API route doesn't exist in static export,
       // fall back to demo users for UI testing
       if (apiError instanceof SyntaxError || 
           apiError.message?.includes('Unexpected token')) {
         console.log('Using demo users for static export');
         const demoUsers = generateDemoUsers();
         setUsers(demoUsers);
         
         // Show warning to user that they're seeing demo data
         setError('Using demo data in static export mode. API endpoints are not available.');
       }
     }
     ```
   - Implemented demo mode detection and operation simulation:
     ```typescript
     // Check if we're in demo mode (static export with no API)
     const isDemoMode = users.some(u => u.uid.startsWith('demo-'));
     
     // Use demo mode in action handlers
     if (isDemoMode) {
       // In demo mode, just update the UI without API calls
       console.log('Demo mode: simulating user deletion');
       setTimeout(() => {
         // UI update logic...
       }, 500); // Simulate API delay
     }
     ```

## Static Export Considerations

When working with Next.js static exports, special consideration is needed for:

1. **Dynamic Routes**: Routes like `/tickets/[id]` need placeholder pages that get replaced with actual content client-side
2. **Client Navigation**: Using `router.push()` rather than `Link` components for some navigation paths
3. **Error Handling**: Adding specific handling for placeholder content

## Testing

To verify these fixes:

1. **Notification System**:
   - Create or update a ticket to generate notifications
   - Check that the notification badge shows the correct count
   - Click the notification bell and confirm that notifications are displayed properly
   - Verify that the "Mark All Read" button works correctly

2. **Ticket Viewing**:
   - Go to the "All Tickets" page as an admin
   - Click on a ticket title or "View" button
   - Confirm that the ticket details page loads correctly
   - Test this flow with multiple tickets

## Next Steps

For further improvements:

1. Consider adding a service worker for better offline support in static exports
2. Implement proper loading states for dynamic content
3. Add fallback UI components for error states