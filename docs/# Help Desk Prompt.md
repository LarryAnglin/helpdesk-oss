<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Help Desk Prompt

## Overview
This is a web app that tracks tickets from a customer.  It runs on Node.js.  It is a NextJS app written in Typescript.  It uses the MaterialUI component library where possible.  Styling is with PostCSS and TailwindCSS.  

Customers must have an account before they can submit a ticket.  Anyone in a specified email domain can create an account.  Only Authenticate with Google is supported for authentication.

## Program Flow
The app always opens to the login page.  The login page has a link to the signup page.  To sign up, users must provide an email address in the specific domain and their name.  Once signed up, they can login.  The signin page has a reset password link.

If a user is logged in, they are directed to the page to submit a ticket.  A ticket is a simple form that includes the following fields:

* A short summary of the problem - this is the title of the ticket.
* Priority - a dopdown of Low, Medium, High, Urgent
* A dropdown that selects their location.  The options are:
- RCL
- RCL-EH
- My Home
- Other
* A checkmark that indicates whether are not they are on the VPN.
* A box to enter what computer is experincing this problem.
* A larger box to describe the problem with explicit intructions to include all information required to recreate the problem.
* An attachment window.  Files can be images, videos or documents.  Multiple files can be attached.
* A submit button.
* A cancel button.

### Ticket handling
When a ticket is submited, a record is created in the firestore database. The program will use Google Pub/Sub to send an email to the support address.  The submitter will recieve a copy of that email. Replies to that email will be recorded in the database by the program.  The replay only needs the text the user input and any attachments.  Each subsequent reply is stored in the same record.  

The tech support technician can add users to the ticket, they can also change the submitter.  

When a support technician logs in, they will see a list of all the open tickets.  There will be a button to show all tickets, not just open tickets, but it defaults to open tickets.  The program supports deep linking to share a URL to a specific ticket.  All the fields submitted are visible to the technician.  The tech can choose to reply to the submitter, which will present a text box that supports markdown for the tech to respond to the user.  The tech can also choose to write a private note which will present a text box but the notes will only be saved in the database and not visible to the submitter.  

If the tech changes the status of a ticket, the submitter recieves a notification.

### User Management
There will be a user management screen where techs can edit and delete users.  There are three types of users - Super Admin, Tech, and User.  The Super Admin has all rights.  The Tech has all rights except changing themselves to Super  Admin.  The User can only read tickets that they submitted or were added to.  Users cannot read notes, only the information that was sent ot the user.

### Configuration
When logged in as admin, a configuration button will be visible.  Clicking it shows the configuration screen.  These items can be configured:

- Company Name
- Company Logo (a file upload)
- Support Email
- Support Phone

When logged in as an admin, there will be an export button that will export all the tickets.

### Tech Stack

* Firebase 
    - authentication
    - firestore database
    - functions
    - storage

* Google Pub/Sub

* NextJS
    - Typescript
    - MaterialUI
    - PostCSS
    - TaildwindCSS

### Security
User Firebase secrets for any confidential information such as:
- Firebase keys
- SMTP server keys
- API keys

### Guidelines
- Use typescript.
- This is a Firebase app, feel free to use the Firebase Admin API in the scripts.
- Use Next API routes and functions where appropriate.
- Add any features that are essetial to help desk ticketing systems.
- Attachments should be saved to Firebase Storage