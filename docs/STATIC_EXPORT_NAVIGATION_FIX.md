<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Export Navigation Fix

This document explains the fixes made to address navigation and authentication issues in the static export version of the Help Desk application.

## Issues Fixed

1. **Ticket Detail Navigation Issue**:
   - Problem: When clicking on a ticket from All Tickets view, the auth screen appeared briefly before redirecting to the Create Ticket screen.
   - Root cause: Authentication check in middleware was redirecting to the wrong page, and the navigation method was not maintaining auth state properly.
   - Solution: Implemented destination preservation through the authentication flow to ensure users reach their intended page.

2. **Notification Navigation Issue**:
   - Problem: When clicking on a notification, navigation to the ticket detail page was unreliable.
   - Fixed by using direct window.location.href navigation instead of Next.js router.push().

3. **Authentication Flow Improvement**:
   - Problem: After sign-in, users were always redirected to /tickets/new instead of their intended destination.
   - Solution: Added destination parameter tracking through the entire auth flow.

## Technical Details

### 1. Middleware Improvements

The middleware (`src/middleware.ts`) has been updated to:

- Add special handling for ticket detail pages with a regex pattern match
- Improve logging for better debugging
- Fix the redirection logic to avoid looping redirects
- Change the default redirect destination from `/tickets/new` to `/tickets` for authenticated users

```typescript
// Special handling for ticket detail pages
const isTicketDetailPage = /^\/tickets\/[^/]+$/.test(path) && 
                          path !== '/tickets/new' && 
                          path !== '/tickets/all';
if (isTicketDetailPage) {
  // For ticket detail pages, just check authentication but don't redirect to dashboard
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  return NextResponse.next();
}
```

### 2. TicketDetail Component Auth Check

To fix the build error with static generation, we moved the authentication logic from the page component to the TicketDetail component:

The ticket detail component (`src/components/tickets/TicketDetail.tsx`) has been updated to:

- Include explicit authentication check with proper loading states
- Handle redirection to sign-in with destination preservation
- Show appropriate loading and error messages
- Add extensive logging for debugging

```typescript
const checkAuthAndFetchTicket = async () => {
  // Wait for auth to complete before checking
  if (loading) {
    console.log('Authentication still loading, waiting...');
    return;
  }
  
  // Handle unauthenticated users
  if (!user) {
    console.log('No authenticated user, redirecting to sign-in');
    setError('You must be logged in to view this ticket.');
    
    // Store current URL as the destination for post-login redirect
    const currentPath = window.location.pathname;
    const destination = encodeURIComponent(currentPath);
    window.location.href = `/auth/signin?destination=${destination}`;
    return;
  }
  
  // Fetch ticket logic...
};
```

The page component (`src/app/(app)/tickets/[id]/page.tsx`) remains a simple server component that supports static generation:

```typescript
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function TicketPage({ params }: TicketPageProps) {
  return <TicketDetail ticketId={params.id} />;
}
```

This approach satisfies the Next.js static export requirement that files with `generateStaticParams()` cannot use 'use client' directive.

### 3. Enhanced Navigation Approach

All ticket navigation has been updated to use native HTML anchors with programmatic clicks, which is more reliable than both router.push() and direct window.location changes:

1. In TicketList.tsx:
```typescript
onClick={(e) => {
  e.preventDefault();
  console.log(`Navigating to ticket from title: ${ticket.id}`);
  
  // Use a regular link for most reliable navigation
  const link = document.createElement('a');
  link.href = `/tickets/${ticket.id}`;
  link.setAttribute('data-ticket-id', ticket.id);
  link.setAttribute('data-navigation-type', 'ticket-title');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}}
```

2. In Navbar.tsx (for notifications):
```typescript
onClick={() => {
  console.log('Navigating to ticket from notifications:', lastTicket.id);
  handleCloseNotifications();
  
  // Use a regular link for most reliable navigation
  const link = document.createElement('a');
  link.href = `/tickets/${lastTicket.id}`;
  link.setAttribute('data-ticket-id', lastTicket.id);
  link.setAttribute('data-navigation-type', 'notification');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}}
```

This approach ensures:
- Fresh page load with proper authentication check
- No stale state between page navigations
- Consistent behavior in static exports

### 4. Destination Preservation

Added a system to preserve the intended destination across the authentication flow:

1. In middleware (when redirecting to sign-in):
```typescript
// Store current path as destination
const signinUrl = new URL('/auth/signin', request.url);
if (isTicketDetailPage) {
  signinUrl.searchParams.set('destination', path);
}
return NextResponse.redirect(signinUrl);
```

2. In SignInPage.tsx (reading the destination):
```typescript
// Extract destination from URL parameters
useEffect(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const dest = params.get('destination');
    if (dest) {
      setDestination(dest);
    }
  }
}, []);
```

3. In authentication-related redirects:
```typescript
if (destination && destination.startsWith('/tickets/')) {
  window.location.href = destination;
} else {
  window.location.href = '/tickets';
}
```

This ensures that users reach their intended destination after authentication.

## Authentication Flow in Static Export

The authentication flow now works as follows:

1. User clicks a ticket from the list or notification
2. Direct page navigation triggers a full page reload
3. Middleware checks for authentication
4. Page component performs a secondary check for auth state
5. When authenticated, the ticket detail component loads

## Testing the Fix

To verify the fix:

1. Log in as admin user
2. Go to "All Tickets" page
3. Click on any ticket
4. You should see the ticket details page load correctly without being redirected to create ticket
5. Try the same flow with notifications by clicking on a notification in the bell dropdown

If at any point you get redirected to the login page, check the console logs to see what's happening with the authentication state.

## Additional Debugging

Added extensive debugging logs to the TicketDetail component:

```typescript
// Log current state and auth status
console.log(`TicketDetail: Auth loading: ${loading}, User:`, user ? user.uid : 'none', 'Role:', userData?.role);
console.log(`TicketID being viewed: ${ticketId}, Is placeholder:`, ticketId === 'placeholder');

// Add additional debugging for network requests
console.log(`Making Firestore request for document: tickets/${ticketId}`);

// Log ticket data on successful fetch
console.log('Ticket loaded successfully:', { 
  id: fetchedTicket.id, 
  title: fetchedTicket.title,
  status: fetchedTicket.status,
  participants: fetchedTicket.participants.length
});

// Log access control checks
console.log('Access check:', { 
  isParticipant, 
  userRole: userData?.role,
  isAdmin: isAdmin
});
```

## Further Improvements

For even better static export support, consider:

1. Adding a service worker for improved caching
2. Using localStorage for temporary ticket caching to improve loading experience
3. Implementing optimistic UI updates for notifications
4. Adding network state monitoring for more reliable Firestore access
5. Creating a fallback mechanism that shows cached ticket data when offline