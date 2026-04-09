# Node.js TypeScript Boilerplate

A modern, scalable, and production-ready backend boilerplate built with Node.js, TypeScript, Express, MongoDB, and Socket.IO. This boilerplate provides a solid foundation for building social platforms, content management systems, or any robust web application.

## Features

- **TypeScript**: Typed development for better maintainability and error catching.
- **Authentication**: JWT-based auth with signup, login, password reset, and role-based access control.
- **Social Auth**: Integrated Google OAuth via Passport.js.
- **Real-time**: Real-time communication support with Socket.IO.
- **File Management**: Support for local and AWS S3 file uploads with image optimization (Sharp).
- **Validation**: Request validation using Zod schemas.
- **Error Handling**: Centralized global error handling with clear error responses.
- **Email**: Integrated email service support via SMTP.
- **Push Notifications**: Integrated Firebase Admin SDK for push notifications.
- **Modular Architecture**: Structured into modules (user, auth, chat, message, notification, etc.) for scalability.

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Validation**: Zod
- **Logging**: Morgan & Winston
- **Auth**: Passport.js & JWT
- **Image Processing**: Sharp

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add the necessary configuration (see `.env.example` if available).

### Running the Application

- **Development Mode**:

  ```bash
  npm run start
  ```

- **Build**:

  ```bash
  npm run build
  ```

- **Production Mode**:
  ```bash
  npm run start:prod
  ```

## Project Structure

```
src/
├── app/
│   ├── builder/        # Query builders
│   ├── errors/         # Custom error classes and handlers
│   ├── middleware/     # Custom Express middlewares
│   ├── modules/        # Feature-based modules (user, auth, etc.)
├── config/             # Configuration files
├── helpers/            # Utility helpers
├── interfaces/         # Global TypeScript interfaces
├── routes/             # API routes definition
├── shared/             # Shared utilities
├── utils/              # Utility functions
├── server.ts           # Entry point
└── app.ts              # Express application setup
```

## Scripts

- `npm run start`: Start the development server.
- `npm run build`: Compile TypeScript to JavaScript.
- `npm run start:prod`: Run the compiled server.
- `npm run lint:check`: Run ESLint to check for code issues.
- `npm run lint:fix`: Run ESLint and fix issues automatically.
- `npm run prettier:check`: Check code formatting with Prettier.
- `npm run prettier:fix`: Format code with Prettier.

## License

ISC
