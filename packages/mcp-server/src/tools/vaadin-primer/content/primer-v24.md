# Vaadin 24 Development Primer

**Important: Read this document before working with Vaadin 24 to ensure you have an accurate, up-to-date understanding of modern Vaadin development.**

## Available MCP Documentation Tools

When working with Vaadin, **always use these MCP tools to search the official documentation** instead of relying on potentially outdated information:

### Core Documentation Tools
- **`search_vaadin_docs`** - Search Vaadin documentation for specific topics, components, or patterns. Use this extensively to find current examples and best practices.
- **`get_full_document`** - Retrieve complete documentation pages when you need full context beyond search snippets.
- **`get_vaadin_version`** - Get the latest stable Vaadin version for dependency management.

## When to Search Vaadin Documentation

**ALWAYS search Vaadin documentation when asked about:**

### Testing & Quality Assurance
- **TestBench** - UI testing framework (search: "TestBench", "UI unit tests", "browser testing")
- **Unit testing** - Testing views and components (search: "unit testing", "testing views", "MockVaadin")
- **Integration testing** - Testing with Spring (search: "integration testing", "Spring testing")
- **End-to-end testing** - Complete application testing (search: "e2e testing", "TestBench")

### Components & UI
- Any **Vaadin component** (Button, Grid, Dialog, etc.) - Always search for component-specific documentation
- **Component styling** (search: "styling", "theming", "CSS", "Lumo")
- **Custom components** (search: "custom component", "web component", "LitElement")
- **Layouts** (search: "layout", "responsive", "VerticalLayout", "HorizontalLayout")

### Data Binding & Forms
- **Binder** - Form data binding (search: "Binder", "form validation", "data binding")
- **Data providers** - Grid and list data (search: "DataProvider", "lazy loading", "filtering")
- **Validation** - Form validation (search: "validation", "Bean Validation", "validators")

### Backend & Architecture
- **@BrowserCallable** - Hilla endpoints (search: "BrowserCallable", "endpoints", "Hilla backend")
- **Security** - Authentication, authorization (search: "security", "authentication", "Spring Security")
- **State management** - Session state, broadcasting (search: "state", "session", "UI.access", "broadcast")
- **Database access** - JPA, Spring Data (search: "database", "JPA", "repository")

### Deployment & Production
- **Production builds** (search: "production build", "production mode", "optimization")
- **Docker** (search: "Docker", "containerization")
- **Cloud deployment** (search: "cloud", "AWS", "Azure", "deployment")
- **Performance** (search: "performance", "optimization", "caching")

### Advanced Topics
- **Push** - Server-to-client updates (search: "Push", "WebSocket", "server push")
- **Collaboration Engine** - Real-time collaboration (search: "Collaboration Engine", "collaborative editing")
- **Progressive Web Apps** (search: "PWA", "offline", "service worker")
- **Custom themes** (search: "theme", "custom theme", "Lumo customization")

## Vaadin 24 Requirements

| Requirement | Version |
|-------------|---------|
| **Java** | 17+ |
| **Spring Boot** | 3.x |
| **Spring Framework** | 6.x |
| **Jakarta EE** | 10 |
| **Node.js** | Auto-handled by Vaadin |

**Maintenance**: Free maintenance until June 2026 (6 months after V25 release). Extended maintenance available.

## What is Modern Vaadin?

Vaadin is a **full-stack platform** for building business web applications in Java with **two development models**:

### Server-Side UI in Java (Flow)
- Entire UI built in Java - server-side component model with automatic client-server sync
- Choose when: Java-focused teams, traditional business apps, prefer component-based development and as the default if React is not explicitly requested

### Client-Side UI in React (Hilla), endpoints in Java
- React/TypeScript UI with type-safe automatic API generation from Java backend
- Choose when: Teams with React expertise, need client-side routing, building public-facing apps
- **Note**: In Vaadin 24, Hilla is included in `vaadin-spring-boot-starter` by default

**Key**: Projects typically choose one model. You can mix them, but only when there's a specific need (e.g., offline functionality).

## Getting Started with Vaadin 24

### Project Creation & Setup

**Note**: [start.vaadin.com](https://start.vaadin.com) only supports Vaadin 25. For Vaadin 24 projects, use one of these approaches:

**Option 1: Clone from GitHub**
```bash
git clone https://github.com/vaadin/skeleton-starter-flow-spring.git
cd skeleton-starter-flow-spring
git checkout v24
```

**Option 2: Modify a V25 project**
Download from start.vaadin.com, then update `pom.xml` to use Vaadin 24:
```xml
<vaadin.version>24.8.0</vaadin.version>
```
Also ensure Spring Boot 3.x compatibility.

**Requirements**:
- Java 17 or 21
- Maven (via wrapper)
- Spring Boot 3.x

**Run**: `./mvnw spring-boot:run` → http://localhost:8080

## Project Structure

Vaadin promotes **feature-based packaging** (not layer-based):

```
src/main/java/
├── com.example.myapp/
│   ├── Application.java              # Spring Boot main class
│   ├── base/                         # Shared/reusable code
│   │   ├── domain/
│   │   └── ui/ (Java views only)
│   ├── security/                     # Complete security setup
│   └── taskmanagement/               # Example feature package
│       ├── domain/                   # Entities, repositories
│       ├── service/                  # Business logic
│       └── ui/view/ (Java views only) # UI components
```

### Frontend Structure (React/Hilla only)
```
src/main/frontend/
├── components/                       # Reusable React components
├── security/                         # Auth context
├── views/                            # Page components
│   ├── @index.tsx                    # Main page
│   ├── @layout.tsx                   # Layout wrapper
│   └── task-list.tsx                 # Feature views
└── index.tsx                         # App entry point
```

## Theming in Vaadin 24

Vaadin 24 uses **Lumo** as the default theme with automatic theme selection:
- **Lumo Light** and **Lumo Dark** variants available
- **Material theme** also available (deprecated, will be removed in V25)
- Themes are applied via `@Theme` annotation or `application.properties`

```java
@Theme("lumo")
public class Application implements AppShellConfigurator {
}
```

## Built-in Security

**Spring Security** included by default: development mode (in-memory users), production mode (external identity providers), method-level security, type-safe user IDs. Fully customizable.

Use `VaadinWebSecurity` base class for security configuration (note: deprecated in favor of `VaadinSecurityConfigurer` in later versions).

## Creating Views

### Server-Side Java Views
Add `@Route("path")` annotation to classes extending Vaadin layouts:
```java
@Route("dashboard")
public class DashboardView extends VerticalLayout {
    // View implementation
}
```

### Client-Side React Views (Hilla)
Use **filesystem-based routing** in `src/main/frontend/views/`:
- `views/dashboard.tsx` → `/dashboard` route
- `views/@layout.tsx` → shared layout wrapper
- `views/@index.tsx` → root `/` route

## Component Ecosystem

**Use Vaadin's comprehensive component library first** before creating custom components. Vaadin 24 includes:

**Data Display & Entry**: Auto CRUD (React only), Auto Grid (React only), Auto Form (React only), Button, Checkbox, Combo Box, Custom Field, Date Picker, Date Time Picker, Email Field, Multi-Select Combo Box, Number Field, Password Field, Radio Button, Select, Text Area, Text Field, Time Picker

**Layouts**: App Layout, Form Layout, Horizontal Layout, Master-Detail Layout, Scroller, Split Layout, Vertical Layout

**Data Visualization**: Charts, Dashboard, Grid, Grid Pro, Tree Grid, Virtual List

**Navigation & UI**: Accordion, Avatar, Badge, Context Menu, Details, Dialog, Icons, List Box, Menu Bar, Notification, Popover, Side Navigation, Tabs, Tooltip

**Advanced**: Board, Card, Confirm Dialog, Cookie Consent, CRUD, Login, Map, Markdown, Message Input, Message List, Progress Bar, Rich Text Editor, Spreadsheet, Upload

**Approach**: Compose existing components and layouts before building custom ones from scratch.

## React @BrowserCallable Endpoints

React projects use **type-safe communication** between React frontend and Java backend through `@BrowserCallable` endpoints.

### Defining Endpoints in Java

```java
import com.vaadin.hilla.BrowserCallable;

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
```

### DTO Classes (Automatically Converted to TypeScript)

```java
public record CreateTaskRequest(
    @NotBlank String title,
    @Size(max = 500) String description
) {}
```

### Package-level Null Safety

Create `package-info.java` in your endpoint package to avoid repetitive `@NotNull`:

```java
@org.springframework.lang.NonNullApi
package com.example.endpoints;
```

### Calling from TypeScript

After running `./mvnw compile vaadin:generate`, you get type-safe TypeScript clients:

```typescript
import { TaskEndpoint } from 'Frontend/generated/endpoints';
import type { CreateTaskRequest } from 'Frontend/generated/com/example/data';

const createTask = async (request: CreateTaskRequest) => {
    try {
        const newTask = await TaskEndpoint.createTask(request);
        console.log('Created:', newTask);
    } catch (error) {
        console.error('Validation or business logic error:', error);
    }
};
```

### Key Benefits & Best Practices

**Full Stack Type Safety:** Java DTOs automatically become TypeScript interfaces with preserved method signatures and validation.

**Best Practices:**
- Use **record classes** for DTOs and **Bean Validation** annotations
- Add `@NonNullApi` to `package-info.java` to avoid repetitive `@NotNull`
- Keep endpoints **stateless** - delegate to injected services
- Generate API after changes: `./mvnw compile vaadin:generate`

**Important:** Only `@BrowserCallable` methods are exposed. Security annotations (`@RolesAllowed`, etc.) work on endpoints.

## Key Dependencies

**Core**: `vaadin-spring-boot-starter` dependency + `vaadin-bom` for version management

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.vaadin</groupId>
            <artifactId>vaadin-bom</artifactId>
            <version>24.x.x</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-spring-boot-starter</artifactId>
    </dependency>
</dependencies>
```

**Maven Plugin**: `vaadin-maven-plugin` handles frontend resources, optimization, TypeScript compilation, API generation (`vaadin:generate` for React projects)

## Deployment & Production

**Deployment**: Executable JAR (recommended), Docker containers, any Java-compatible cloud platform

**Production Build**: `./mvnw clean package -Pproduction` (requires the `production` Maven profile)

---

**Important**: When working on existing projects, stick to the existing patterns in the project. For new projects or when users ask for architectural guidance, recommend the feature-based package structure described above.