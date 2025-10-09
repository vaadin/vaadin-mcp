/**
 * Vaadin Development Primer Content
 * 
 * This file exports the primer content as a TypeScript constant to avoid 
 * the need for file system operations and custom build scripts.
 */

export const VAADIN_PRIMER_CONTENT = `# Vaadin Development Primer (2025+)

**⚠️ Important: Read this document before working with Vaadin to ensure you have an accurate, up-to-date understanding of modern Vaadin development.**

## 🔧 Available MCP Documentation Tools

When working with Vaadin, **always use these MCP tools to search the official documentation** instead of relying on potentially outdated information:

### Core Documentation Tools
- **\`search_vaadin_docs\`** - Search Vaadin documentation for specific topics, components, or patterns. Use this extensively to find current examples and best practices.
- **\`get_full_document\`** - Retrieve complete documentation pages when you need full context beyond search snippets.
- **\`get_vaadin_version\`** - Get the latest stable Vaadin version for dependency management.

## What is Modern Vaadin?

Vaadin is a **full-stack platform** for building business web applications in Java with **two development models**:

### 🌊 Vaadin Flow (Server-Side UI in Java)
- Entire UI built in Java - server-side component model with automatic client-server sync
- Choose when: Java-focused teams, traditional business apps, prefer component-based development and as the default if Hilla is not explicitly requested

### ⚡ Vaadin Hilla (React + TypeScript Frontend)  
- React/TypeScript UI with type-safe automatic API generation from Java backend
- Choose when: Teams with React expertise, need client-side routing, building public-facing apps

**Key**: Projects typically choose one model. You can mix them, but only when there's a specific need (e.g., offline functionality). 

## 🚀 Getting Started (The Modern Way)

To generate a new Vaadin project with the latest stable version, download the zip from https://start.vaadin.com/skeleton

To get the latest pre-release, use https://start.vaadin.com/skeleton?platformVersion=pre

### Project Creation & Setup
**Use [start.vaadin.com](https://start.vaadin.com)** to generate a Spring Boot project with:
- Project: Maven
- Language: Java
- Java: 21

Download the ZIP, unzip it, and open the project.

**Direct download (no browser)**:
- Example ZIP URL (Maven, Java 21, Vaadin): \`https://start.vaadin.com/skeleton\`
- Example ZIP URL for Vaadin pre-release: \`https://start.vaadin.com/skeleton?platformVersion=pre\`


**Requirements**: Java 21, Maven (via wrapper), Spring Boot foundation, Node.js (auto-handled)

**Run**: \`./mvnw spring-boot:run\` → http://localhost:8080

## 📁 Modern Project Structure

Vaadin promotes **feature-based packaging** (not layer-based):

\`\`\`
src/main/java/
├── com.example.myapp/
│   ├── Application.java              # Spring Boot main class
│   ├── base/                         # Shared/reusable code
│   │   ├── domain/
│   │   └── ui/ (Flow only)
│   ├── security/                     # Complete security setup
│   └── taskmanagement/               # Example feature package
│       ├── domain/                   # Entities, repositories
│       ├── service/                  # Business logic
│       └── ui/view/ (Flow only)      # UI components
\`\`\`

### Frontend Structure (Hilla only)
\`\`\`
src/main/frontend/
├── components/                       # Reusable React components
├── security/                         # Auth context
├── views/                            # Page components
│   ├── @index.tsx                    # Main page
│   ├── @layout.tsx                   # Layout wrapper
│   └── task-list.tsx                 # Feature views
└── index.tsx                         # App entry point
\`\`\`

## 🔐 Built-in Security

**Spring Security** included by default: development mode (in-memory users), production mode (external identity providers), method-level security, type-safe user IDs. Fully customizable.

## 🌐 Creating Views

### Flow Views (Java)
Add \`@Route("path")\` annotation to classes extending Vaadin layouts:
\`\`\`java
@Route("dashboard")
public class DashboardView extends VerticalLayout {
    // View implementation
}
\`\`\`

### Hilla Views (React)
Use **filesystem-based routing** in \`src/main/frontend/views/\`:
- \`views/dashboard.tsx\` → \`/dashboard\` route
- \`views/@layout.tsx\` → shared layout wrapper
- \`views/@index.tsx\` → root \`/\` route

## 🧩 Component Ecosystem

**Use Vaadin's comprehensive component library first** before creating custom components. Vaadin includes:

**Data Display & Entry**: Auto CRUD (Hilla only), Auto Grid (Hilla only), Auto Form (Hilla only), Button, Checkbox, Combo Box, Custom Field, Date Picker, Date Time Picker, Email Field, Multi-Select Combo Box, Number Field, Password Field, Radio Button, Select, Text Area, Text Field, Time Picker

**Layouts**: App Layout, Form Layout, Horizontal Layout, Master-Detail Layout, Scroller, Split Layout, Vertical Layout

**Data Visualization**: Charts (multiple types - search for specific chart components using provided tools), Dashboard, Grid, Grid Pro, Tree Grid, Virtual List

**Navigation & UI**: Accordion, Avatar, Badge, Context Menu, Details, Dialog, Icons, List Box, Menu Bar, Notification, Popover, Side Navigation, Tabs, Tooltip

**Advanced**: Board, Card, Confirm Dialog, Cookie Consent, CRUD, Login, Map, Markdown, Message Input, Message List, Progress Bar, Rich Text Editor, Spreadsheet, Upload

**Approach**: Compose existing components and layouts before building custom ones from scratch.

## 🏗️ Architecture Principles

**Feature-Based Organization**: Each feature in its own package (domain, service, ui). Use \`@Service\` + \`@Transactional\` + security annotations for business logic.

**Hilla Type Safety**: \`@BrowserCallable\` services auto-generate TypeScript APIs with runtime validation.

## 🌐 Hilla @BrowserCallable Endpoints

Hilla's key feature is **type-safe communication** between React frontend and Java backend through \`@BrowserCallable\` endpoints.

### Defining Endpoints in Java

\`\`\`java
@BrowserCallable
@Service
public class TaskEndpoint {
    
    private final TaskService taskService;
    
    // Simple method with validation
    public Task createTask(@Valid CreateTaskRequest request) {
        return taskService.createTask(request);
    }
    
    // Method that can throw exceptions
    public void deleteTask(UUID taskId) throws TaskNotFoundException {
        taskService.deleteTask(taskId);
    }
}
\`\`\`

### DTO Classes (Automatically Converted to TypeScript)

\`\`\`java
public record CreateTaskRequest(
    @NotBlank String title,
    @Size(max = 500) String description
) {}
\`\`\`

### Package-level Null Safety

Create \`package-info.java\` in your endpoint package to avoid repetitive \`@NotNull\`:

\`\`\`java
@org.springframework.lang.NonNullApi
package com.example.endpoints;
\`\`\`

### Calling from TypeScript

After running \`./mvnw compile vaadin:generate\`, you get type-safe TypeScript clients:

\`\`\`typescript
import { TaskEndpoint } from 'Frontend/generated/endpoints';
import type { CreateTaskRequest } from 'Frontend/generated/com/example/data';

const createTask = async (request: CreateTaskRequest) => {
    try {
        // Type-safe call with automatic validation
        const newTask = await TaskEndpoint.createTask(request);
        console.log('Created:', newTask);
    } catch (error) {
        console.error('Validation or business logic error:', error);
    }
};
\`\`\`

### Key Benefits & Best Practices

**✅ Full Stack Type Safety:** Java DTOs automatically become TypeScript interfaces with preserved method signatures and validation.

**🎯 Best Practices:**
- Use **record classes** for DTOs and **Bean Validation** annotations
- Add \`@NonNullApi\` to \`package-info.java\` to avoid repetitive \`@NotNull\`
- Keep endpoints **stateless** - delegate to injected services
- Generate API after changes: \`./mvnw compile vaadin:generate\`

**⚠️ Important:** Only \`@BrowserCallable\` methods are exposed. Security annotations (\`@RolesAllowed\`, etc.) work on endpoints.

## 📦 Key Dependencies

**Core**: \`vaadin-spring-boot-starter\` dependency + \`vaadin-bom\` for version management
**Maven Plugin**: \`vaadin-maven-plugin\` handles frontend resources, optimization, TypeScript compilation, API generation (\`vaadin:generate\` for Hilla)

## 🌐 Deployment & Production

**Deployment**: Executable JAR (recommended), Docker containers, any Java-compatible cloud platform

**Production Build**: \`./mvnw clean package -Pproduction\` (creates optimized bundles, minification, production profiles)

---

**Important**: When working on existing projects, stick to the existing patterns in the project. For new projects or when users ask for architectural guidance, recommend the feature-based package structure described above.`;
