# Task Management API

A Node.js-based task management API designed with a focus on reliability, validation, and test coverage. The project includes improvements over an existing codebase, addressing edge cases and enhancing functionality.

---

## 🚀 Features

* Create, update, delete tasks
* Mark tasks as complete
* Task filtering and pagination
* Task assignment to users
* Input validation and error handling
* Unit & integration tests

---

## 🛠️ Tech Stack

* Node.js
* Express.js
* Jest (Testing)
* Supertest

---

## 📦 Setup Instructions

```bash
git clone <your-repo-link>
cd task-management-api
npm install
npm start
```

Server runs on:

```
http://localhost:3000
```

---

## 🧪 Running Tests

```bash
npm test
```

For coverage:

```bash
npm run coverage
```

---

## 🐞 Improvements & Fixes

* Added validation for required fields (e.g., title)
* Handled edge cases like duplicate completion
* Improved pagination handling
* Fixed inconsistent error responses

---

## ✨ New Feature: Task Assignment

Implemented:

```
PATCH /tasks/:id/assign
```

### Behavior:

* Assigns a task to a user
* Validates input
* Handles invalid task IDs

---

## 📌 API Endpoints

| Method | Endpoint            | Description   |
| ------ | ------------------- | ------------- |
| GET    | /tasks              | Get all tasks |
| POST   | /tasks              | Create task   |
| PATCH  | /tasks/:id/complete | Mark complete |
| PATCH  | /tasks/:id/assign   | Assign task   |
| DELETE | /tasks/:id          | Delete task   |

---

## 📈 Notes

This project focuses on improving an existing system by identifying issues, enhancing robustness, and ensuring reliability through testing.
