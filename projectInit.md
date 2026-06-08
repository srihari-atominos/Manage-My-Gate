System Task: You are an expert full-stack developer agent. We are building a new enterprise application based on a strict Domain-Driven Design (DDD). This is Phase 1: Root scaffolding and configuration setup. Execute the following strictly within the workspace.

1. Monorepo Setup:

Create a parent directory for the project.

Inside the parent directory, create two sub-directories: frontend and backend.

Initialize both directories with their own independent package.json files and separate dependency management.

2. Environment & Config Strategy:

In the backend folder, create .env.example and .env files with essential placeholders (PORT, HOST, DB credentials, API keys, JWT secrets).

Create a backend/src/config/config.js file that safely exports these environment variables for the application to consume. Ensure no hardcoded values exist in the configuration.

3. Database & Entry Point Stubs:

Database Configuration: Set up the basic database configuration for [DATABASE_TYPE - e.g., MSSQL/Sequelize]. Create backend/src/config/db/sqldbConnectToDb.config.js with an async connection function.

Entry Points: Create empty/stubbed versions of backend/server.js (for database initialization and server boot) and backend/index.js (for the Express app definition) to be filled in during Phase 2.

Execution Output:
Output the exact terminal commands to install the base dependencies (like express, dotenv, cors for backend) and provide a visual summary of the directory tree created in this phase. Wait for my next prompt before writing business logic.