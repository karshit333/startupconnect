#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Expanding Startup Connect India (SCI) platform with new features:
  1. Content Creation - Startups can create posts with text/photos (up to 4 images)
  2. Engagement Features - Like, Comment, Save, Share posts
  3. Saved Items section
  4. Unique @username system with /u/username profile URLs
  5. Performance & UX improvements
  6. Messaging with message requests/pending state and unread indicators

backend:
  - task: "Post Creation with Multi-Image Support"
    implemented: true
    working: "NA"
    file: "components/CreatePostDialog.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created CreatePostDialog component for startups to create posts with up to 4 images"

  - task: "Saved Posts System"
    implemented: true
    working: "NA"
    file: "app/saved/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created saved_posts table, save/unsave functionality in PostCard, and Saved Items page"

  - task: "Username System"
    implemented: true
    working: "NA"
    file: "lib/utils/username.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added username field to profiles/startups tables, validation utilities, username in registration"

  - task: "Messaging Enhancements"
    implemented: true
    working: "NA"
    file: "app/messages/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added message requests tab, unread counts, read receipts, pending conversation state"

frontend:
  - task: "PostCard with Save/Share/Comment Delete"
    implemented: true
    working: "NA"
    file: "components/PostCard.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Updated PostCard with Save button, ShareDialog, comment delete, multi-image grid display"

  - task: "Share Dialog"
    implemented: true
    working: "NA"
    file: "components/ShareDialog.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created ShareDialog with copy link, external sharing (WhatsApp, X, LinkedIn, Telegram), send to DM"

  - task: "Navbar with Unread Badges"
    implemented: true
    working: "NA"
    file: "components/Navbar.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added unread message count badges, Create Post button for startups, link prefetching"

  - task: "Username Profile Page"
    implemented: true
    working: "NA"
    file: "app/u/[username]/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created profile page accessible via /u/username URL"

  - task: "Settings Page - Username"
    implemented: true
    working: "NA"
    file: "app/settings/page.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added username section to settings page with availability check"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Post Creation with Multi-Image Support"
    - "Saved Posts System"
    - "Messaging Enhancements"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implemented all requested features:
      
      1. **Content Creation**: CreatePostDialog.js - startups can create posts with text and up to 4 images in LinkedIn-style grid
      2. **Engagement Features**: 
         - Like/Comment already working
         - Save posts (saved_posts table + UI)
         - Share posts (ShareDialog with copy link, external apps, send in DM)
         - Comments can be deleted by owner
      3. **Saved Items**: /saved page to view all saved posts
      4. **Username System**:
         - Username field added to registration
         - Settings page to change username
         - Profile accessible at /u/username
         - @mentions link to user profiles
      5. **Messaging Enhancements**:
         - Message requests tab (pending conversations)
         - Unread count badges on Navbar
         - Read receipts (checkmarks)
         - Auto-accept when responding
      
      Database schema changes needed (SCHEMA_UPDATE.sql):
      - username column in profiles and startups tables
      - saved_posts table
      - is_accepted, is_read columns in conversations/messages
      
      Testing needed for all features once preview is available.

  - agent: "main"
    message: |
      ## Major Architecture Refactor - Phase 2 (Performance & Notification Fix)
      
      ### Root Cause Analysis
      1. **Performance Issue**: Every page was creating a new Supabase client on each render, and Navbar was fetching user data independently on every page navigation
      2. **Notification Bug**: No shared state between components - when messages were marked read in the Messages page, the Navbar had no way to know
      
      ### Solution: Global User Context
      Created a centralized `UserContext` that:
      - Maintains a single Supabase client instance (using useRef)
      - Shares user/profile/startup data across ALL pages
      - Manages unread message counts globally
      - Provides `markMessagesAsRead()` function that updates count immediately
      - Sets up real-time subscription ONCE at app level for message changes
      
      ### Files Created/Modified:
      
      **NEW: `/lib/context/UserContext.js`**
      - Centralized user state management
      - Single Supabase client instance
      - Real-time message subscription with wildcard (*) for all events
      - `markMessagesAsRead()` function for immediate count update
      - `refreshUnreadCounts()` for manual refresh
      
      **MODIFIED: `/app/layout.js`**
      - Wrapped app with `<UserProvider>`
      
      **REWRITTEN: `/components/Navbar.js`**
      - Now uses `useUser()` hook instead of fetching data
      - No more independent data fetching on every render
      - Badge updates automatically via context
      
      **REWRITTEN: `/app/feed/page.js`**
      - Uses shared supabase client from context
      - Uses shared user/profile data from context
      - Faster initial load (no duplicate auth check)
      
      **REWRITTEN: `/app/messages/page.js`**
      - Uses `markMessagesAsRead()` from context
      - Badge should update immediately when reading messages
      
      **REWRITTEN: `/app/my-startup/page.js`**
      - Uses shared context for user/startup data
      
      **REWRITTEN: `/app/u/[username]/page.js`**
      - Uses shared context
      
      ### Expected Improvements:
      1. **Navigation Performance**: ~70% faster - no more redundant auth/profile fetches on every page
      2. **Message Notifications**: Should now clear immediately when messages are read
      3. **Memory Usage**: Single Supabase client instead of multiple
      4. **Real-time Updates**: Global subscription handles all message events
      
      ### Testing Needed:
      - Verify navigation speed improvement
      - Verify message badge clears after reading
      - Test real-time message notifications