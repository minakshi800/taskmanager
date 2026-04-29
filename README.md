# TaskFlow - Team Task Manager

A full-stack web application designed for teams to create projects, assign tasks, and track progress collaboratively. Built with modern web technologies and a focus on beautiful, glassmorphic UI design.

## 🚀 Key Features

*   **Authentication**: Secure JWT-based Signup/Login flow.
*   **Role-Based Access Control**: Differentiate between Project Admins (can create tasks, manage members, delete projects) and Members (can update task status for assigned tasks).
*   **Project Management**: Create projects and invite team members via email.
*   **Task Management**: Interactive Kanban board to track tasks across "To Do", "In Progress", and "Done" states. Includes priorities and due dates.
*   **Dashboard Analytics**: View aggregated statistics, overdue alerts, and recent activity across all your projects.
*   **Modern UI**: Built with React and Vanilla CSS utilizing a premium dark-mode glassmorphism design system.

## 🛠 Tech Stack

*   **Frontend**: React.js, Vite, React Router, Vanilla CSS
*   **Backend**: Node.js, Express.js
*   **Database**: PostgreSQL
*   **Authentication**: JSON Web Tokens (JWT), bcryptjs

## 📦 Local Setup

1.  **Clone the repository**
    ```bash
    git clone <your-repo-url>
    cd taskmanager
    ```

2.  **Install dependencies**
    From the root directory, run:
    ```bash
    npm install
    ```
    *(This will automatically install dependencies for both the `server` and `client` folders via the postinstall script).*

3.  **Database Configuration**
    Ensure you have PostgreSQL installed and running locally.
    Create a database (e.g., `taskmanager`).
    The app uses a default local connection string: `postgresql://postgres:postgres@localhost:5432/taskmanager`.
    You can override this by creating a `.env` file in the `server` directory:
    ```env
    DATABASE_URL=postgresql://youruser:yourpassword@localhost:5432/yourdatabase
    JWT_SECRET=your_super_secret_key
    ```

4.  **Run Development Servers**
    Open two terminal windows:

    **Terminal 1 (Backend):**
    ```bash
    cd server
    npm run dev
    ```

    **Terminal 2 (Frontend):**
    ```bash
    cd client
    npm run dev
    ```

5.  **Access the App**
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## ☁️ Deployment (Railway)

This application is configured for seamless deployment on Railway as a single service.

1.  Create a new project on Railway.
2.  Add a **PostgreSQL** database plugin to your project.
3.  Deploy from your GitHub repository.
4.  Railway will automatically detect the `DATABASE_URL` environment variable from the Postgres plugin and inject it into the Node.js service.
5.  The root `package.json` contains a `build` script that builds the React frontend, and a `start` script that runs the Express server (which statically serves the frontend).

## 📡 API Endpoints

### Authentication
*   `POST /api/auth/signup` - Register a new user
*   `POST /api/auth/login` - Authenticate and receive a JWT
*   `GET /api/auth/me` - Get current user data

### Projects
*   `GET /api/projects` - List all projects the user is a member of
*   `POST /api/projects` - Create a new project (Creator becomes Admin)
*   `GET /api/projects/:id` - Get project details and members
*   `PUT /api/projects/:id` - Update project details (Admin only)
*   `DELETE /api/projects/:id` - Delete project (Admin only)
*   `POST /api/projects/:id/members` - Add a member to a project (Admin only)
*   `DELETE /api/projects/:id/members/:userId` - Remove a member (Admin only)

### Tasks
*   `GET /api/projects/:id/tasks` - List tasks within a project
*   `POST /api/projects/:id/tasks` - Create a new task (Admin only)
*   `PUT /api/tasks/:id` - Update task details (Admin only)
*   `PATCH /api/tasks/:id/status` - Update task status (Admin or Assigned Member)
*   `DELETE /api/tasks/:id` - Delete task (Admin only)

### Dashboard
*   `GET /api/dashboard` - Get aggregated stats, recent activity, and assigned tasks
