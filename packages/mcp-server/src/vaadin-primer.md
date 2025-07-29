# Vaadin Development Primer (2025+)

**⚠️ Important: Read this document before working with Vaadin to ensure you have an accurate, up-to-date understanding of modern Vaadin development.**

## What is Modern Vaadin?

Vaadin is a **full-stack platform** for building business web applications in Java. As of 2025, Vaadin has evolved significantly and offers **two distinct development models**:

### 🌊 Vaadin Flow (Server-Side UI in Java)
- Build the **entire user interface in Java** - no HTML, CSS, or JavaScript required
- Server-side component model with automatic client-server synchronization  
- Direct access to Java ecosystem and business logic
- Perfect for Java teams who want to stay in Java for the full stack

### ⚡ Vaadin Hilla (React + TypeScript Frontend)
- Build the **UI with React and TypeScript**
- **Type-safe** automatic API generation from Java backend services
- Full client-side rendering with modern React patterns
- Perfect for teams with frontend expertise who want type safety

**Key Point**: You can mix Flow and Hilla in the same application, but most projects choose one approach. Always prefer sticking to one development model per project unless there is a definite identified need (for instance, an offline view that needs to work offline). Both development models are equally supported, the decision is primarily driven by developer preferences and team skills. 

## 🚀 Getting Started (The Modern Way)

### 1. Project Creation
**Use the Walking Skeleton approach** - not empty projects:

1. Go to [start.vaadin.com](https://start.vaadin.com)
2. Choose Flow, Hilla, or both
3. Download the generated "walking skeleton"

A **walking skeleton** is a minimal but complete application that includes:
- ✅ Production-ready Spring Security setup
- ✅ Database configuration (H2 dev / PostgreSQL prod)
- ✅ Testcontainers integration
- ✅ Feature-based package structure
- ✅ Working example view with CRUD operations
- ✅ Architecture tests with ArchUnit
- ✅ Integration tests

### 2. Requirements (2024)
- **Java 17+** (LTS versions recommended, current LTS is 21)
- **Maven** (included via Maven Wrapper)
- **Spring Boot** (foundation of all Vaadin apps)
- **Node.js** (automatically handled by Vaadin)

### 3. Running the Project
```bash
./mvnw  # Linux/Mac
mvnw    # Windows
```
Navigate to http://localhost:8080

## 📁 Modern Project Structure

Vaadin promotes **feature-based packaging** (not layer-based):

```
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
```

### Frontend Structure (Hilla only)
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

## 🔐 Built-in Security (Since 24.8)

**Modern Vaadin includes production-grade security by default:**

- **Spring Security** configuration included
- **Development mode**: In-memory users with login screen
- **Production mode**: Compatible with external identity providers
- **Method-level security** for services
- **Type-safe user ID** domain primitives

You can customize or completely replace the security setup.

## 🧩 Component Ecosystem

### Flow Components (Java)
```java
// Modern Flow component usage
@Route("dashboard")
public class DashboardView extends VerticalLayout {
    public DashboardView() {
        add(new H1("Dashboard"));
        
        Grid<Person> grid = new Grid<>(Person.class);
        grid.setColumns("firstName", "lastName", "email");
        
        Button addButton = new Button("Add Person", 
            e -> /* handle click */);
        
        add(grid, addButton);
    }
}
```

### Hilla Components (React)
```typescript
// Modern Hilla view
export default function TaskListView() {
    const [tasks, setTasks] = useState<Task[]>([]);
    
    useEffect(() => {
        TaskService.findAll().then(setTasks);
    }, []);
    
    return (
        <div>
            <h1>Tasks</h1>
            <AutoGrid service={TaskService} model={TaskModel} />
        </div>
    );
}
```

### Available Components (Both Flow & Hilla)
- **Data Entry**: TextField, ComboBox, DatePicker, Upload, etc.
- **Layouts**: VerticalLayout, HorizontalLayout, FormLayout, AppLayout
- **Data Display**: Grid, TreeGrid, Charts, Dashboard
- **Navigation**: Tabs, MenuBar, SideNav, AppLayout
- **Advanced**: CRUD, AutoGrid, AutoForm, RichTextEditor
- **Pro Components**: Charts, Spreadsheet, Board, etc.

## 🏗️ Architecture Principles

### 1. Feature-Based Organization
```
taskmanagement/          # One feature = one package
├── domain/             # Entities, value objects
├── service/            # Business logic boundary  
└── ui/                 # UI components (Flow only)
```

### 2. Application Services Pattern
```java
@Service
@Transactional
@PreAuthorize("hasRole('USER')")
public class TaskService {
    public List<Task> findAllForCurrentUser() {
        // Business logic here
    }
    
    public Task createTask(CreateTaskRequest request) {
        // Validation, domain logic, persistence
    }
}
```

### 3. Type Safety (Hilla)
- **Automatic API generation** from Java services annotated with `@BrowserCallable`.  
- **TypeScript models** generated from Java DTOs
- **Runtime validation** of API calls

## 🌐 Hilla @BrowserCallable Endpoints

Hilla's key feature is **type-safe communication** between React frontend and Java backend through `@BrowserCallable` endpoints.

### Defining Endpoints in Java

```java
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
        // Type-safe call with automatic validation
        const newTask = await TaskEndpoint.createTask(request);
        console.log('Created:', newTask);
    } catch (error) {
        console.error('Validation or business logic error:', error);
    }
};
```

### Key Benefits & Best Practices

**✅ Full Stack Type Safety:** Java DTOs automatically become TypeScript interfaces with preserved method signatures and validation.

**🎯 Best Practices:**
- Use **record classes** for DTOs and **Bean Validation** annotations
- Add `@NonNullApi` to `package-info.java` to avoid repetitive `@NotNull`
- Keep endpoints **stateless** - delegate to injected services
- Generate API after changes: `./mvnw compile vaadin:generate`

**⚠️ Important:** Only `@BrowserCallable` methods are exposed. Security annotations (`@RolesAllowed`, etc.) work on endpoints.

## 🔧 Development Tools & Workflow

### Built-in Development Features
- **Live Reload** - automatic browser refresh on changes
- **Hot Deploy** - Java changes without restart  
- **Theme Editor** - visual styling tool
- **Component Inspector** - debug component tree
- **Vaadin Copilot** - AI-powered development assistant

### IDE Support
- **IntelliJ IDEA**: Vaadin plugin available
- **VS Code**: Vaadin extension + Java Extension Pack
- **Eclipse**: Use Enterprise Java edition

### Testing
- **Unit Tests**: Standard JUnit for services
- **Integration Tests**: Testcontainers included
- **UI Tests**: Selenium with TestBench (commercial)

## 📦 Key Packages & Dependencies

### Core Vaadin (automatically included)
```xml
<!-- Vaadin BOM handles all versions -->
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-bom</artifactId>
    <version>24.8</version>
    <type>pom</type>
    <scope>import</scope>
</dependency>

<!-- Includes support for both Vaadin Flow and Hilla -->
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-spring-boot-starter</artifactId>
</dependency>
```

## 🌐 Deployment & Production

### Modern Deployment Options
- **Recommended**: Executable JAR with embedded Tomcat  
- **Containers**: Docker images with Spring Boot
- **Cloud**: Deploy to any cloud platform supporting Java

### Production Builds
```bash
./mvnw clean package -Pproduction
```

This creates an optimized build with:
- Minified frontend bundles
- Optimized component loading
- Production Spring profiles

## 🆚 Flow vs Hilla Decision Guide

### Choose Flow When:
- Team is primarily Java developers
- Want to minimize frontend complexity
- Building traditional business applications
- Need server-side security model
- Prefer component-based development

### Choose Hilla When:
- Team has React/TypeScript expertise  
- Building modern web applications
- Need client-side routing and state management
- Want to leverage React ecosystem
- Building public-facing applications

### You Can Use Both:
- Different views can use different approaches
- Flow views for admin, Hilla for user-facing
- Gradual migration strategies supported

## 🔄 Migration from Older Vaadin

If working with legacy Vaadin code:
- **Vaadin 8 → 24**: Significant changes, use migration tools
- **Vaadin 14-23 → 24**: Incremental upgrade path
- **Focus**: Move to feature-based packages and Spring Boot patterns

---

**Remember**: Modern Vaadin (24+) is a mature, full-stack platform with enterprise-grade capabilities. Always start with the walking skeleton from start.vaadin.com and follow the feature-based architecture patterns.