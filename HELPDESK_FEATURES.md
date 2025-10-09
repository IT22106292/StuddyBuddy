# Help Desk Features Documentation

## Overview
This document describes the comprehensive helper profile management system implemented for the StuddyBuddy application.

## Features Implemented

### 1. Helper Profile Management
- Users can apply to become helpers by filling out a form with their subjects, bio, qualifications, and experience
- Approved helpers can update their profile information
- All applications go through an admin approval process

### 2. Leave Functionality
- When a helper decides to leave the program, they can use the "Leave Helper Program" option
- Instead of deleting their profile, the system marks them as "left" with a timestamp
- Their profile shows a message indicating they are no longer available
- They are no longer visible in the help desk listings

### 3. Subject Change Requests
- Approved helpers can change their subjects by updating their profile
- If subjects are changed, a new application is created for admin approval
- Until approved, the helper continues with their previous subjects
- Admins can approve or reject subject change requests

### 4. Reapplication Process
- Helpers who have left can reapply to become helpers again
- They fill out the same application form as new applicants
- Applications go through the same admin approval process
- Former helpers see a clear indication of their previous status when reapplying

### 5. Admin Management
- Admins can view all pending applications and active helpers
- Admins can approve or reject new applications
- Admins can approve subject change requests
- Admins can remove active helpers from the program

## Technical Implementation

### Data Structure
- `helpdeskApplicants/{uid}` - Stores applications with status (pending/approved/rejected/left)
- `helpdeskHelpers/{uid}` - Stores approved helper profiles
- Fields include: subjects, bio, name, email, highestQualification, yearsExperience, rating

### Special Fields
- `left: true` - Marks helpers who have left the program
- `type: "new_application" | "subject_change"` - Distinguishes application types
- `status: "pending" | "approved" | "rejected" | "left"` - Tracks application/helper status

## User Flow

### New Helper Application
1. User navigates to Help Desk
2. Clicks "Apply as Helper"
3. Fills application form with subjects, qualifications, experience, and bio
4. Submits application
5. Application appears in admin panel as "pending"
6. Admin approves or rejects application
7. If approved, user becomes visible as helper in Help Desk

### Profile Update (Non-subject changes)
1. Approved helper navigates to Help Desk
2. Clicks "Update Profile"
3. Modifies bio, qualifications, or experience
4. Saves changes immediately (no admin approval needed)

### Subject Change Request
1. Approved helper navigates to Help Desk
2. Clicks "Update Profile"
3. Changes subjects
4. Saves changes
5. System creates new application with "subject_change" type
6. Application appears in admin panel as "pending"
7. Admin approves or rejects request
8. If approved, helper's subjects are updated

### Leaving the Helper Program
1. Approved helper navigates to Help Desk
2. Clicks "Update Profile"
3. Clicks "Leave Helper Program"
4. Confirms leaving in dialog
5. System marks helper as "left" with timestamp
6. Helper is no longer visible in Help Desk listings
7. Helper's profile shows a "left the program" message
8. Helper can see a clear reapplication message if they return

### Reapplying as Helper
1. Former helper navigates to Help Desk
2. Clicks "Apply as Helper"
3. Sees a clear indication of their previous "left" status
4. Fills application form (same as new application)
5. Submits application
6. Application appears in admin panel as "pending"
7. Admin approves or rejects application
8. If approved, user becomes visible as helper again