# Vaadin 25 Development Primer

**Important: Read this document before working with Vaadin 25 to ensure you have an accurate, up-to-date understanding of modern Vaadin development.**

## Vaadin 25 Requirements

| Requirement | Version |
|-------------|---------|
| **Java** | 21+ |
| **Spring Boot** | 4.x |
| **Spring Framework** | 7.x |
| **Jakarta EE** | 11 |
| **Node.js** | 24+ (auto-handled by Vaadin) |
| **Gradle** | 8.14+ (if using Gradle) |

**Note**: Spring Boot 3.x and Spring Framework 6.x are **no longer supported** in Vaadin 25.

## What's New in Vaadin 25

### Performance Improvements
- **30% fewer transitive dependencies** (22 MB reduction in artifact size)
- **50%+ faster dev-mode startup** (from 3+ seconds to ~1.5 seconds)
- **27% faster deployment** to servers

### New Aura Theme
- New modern default theme called **Aura** inspired by current web design trends
- Simplified base styles make custom theming easier
- **Lumo** theme still available and fully supported
- **Material theme removed** - apps using Material need redesign

### Simplified Theming
- Themes now work as **normal CSS** with fewer framework-specific conventions
- Dynamic theme switching for light/dark mode and per-tenant branding
- **Explicit theme selection required** - no silent default theme

### Hilla Now Opt-In
- Hilla is **no longer included** in `vaadin-spring-boot-starter` by default
- Add `hilla-spring-boot-starter` separately if using React views

### Signals (Experimental)
- Reactive UI state management with element-level binding
- Available in Vaadin 25.1+

## What is Modern Vaadin?

Vaadin is a **full-stack platform** for building business web applications in Java with **two development models**:

### Server-Side UI in Java (Flow)
- Entire UI built in Java - server-side component model with automatic client-server sync
- Choose when: Java-focused teams, traditional business apps, prefer component-based development and as the default if React is not explicitly requested

### Client-Side UI in React (Hilla), endpoints in Java
- React/TypeScript UI with type-safe automatic API generation from Java backend
- Choose when: Teams with React expertise, need client-side routing, building public-facing apps
- **Note**: In Vaadin 25, you must explicitly add `hilla-spring-boot-starter` dependency

**Key**: Projects typically choose one model. You can mix them, but only when there's a specific need (e.g., offline functionality).

## Getting Started with Vaadin 25

### Project Creation & Setup
**Use [start.vaadin.com](https://start.vaadin.com)** to generate a Spring Boot project with:
- Project: Maven
- Language: Java
- Java: 21

Download the ZIP, unzip it, and open the project.

**Direct download URL**:
```
https://start.vaadin.com/skeleton
```

**Note**: start.vaadin.com generates Vaadin 25 projects (it does not support older versions).

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

## Theming in Vaadin 25

Vaadin 25 introduces **simplified CSS-based theming** - the `@Theme` annotation is no longer used.

### Available Themes
- **Aura** - New modern theme (recommended for new projects)
- **Lumo** - Classic Vaadin theme, still fully supported

### Simplified CSS Theming
- Themes work as **normal CSS stylesheets**
- No framework-specific annotations required
- Dynamic runtime theme switching supported (load/unload stylesheets)
- Use standard CSS imports to apply themes

**Note**: The Material theme has been **removed** in Vaadin 25. Search the documentation for current theming guidance.

## Built-in Security

**Spring Security** included by default: development mode (in-memory users), production mode (external identity providers), method-level security, type-safe user IDs. Fully customizable.

Use `VaadinSecurityConfigurer` for security configuration (replaces deprecated `VaadinWebSecurity`):

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return VaadinSecurityConfigurer.apply(http)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/login").permitAll()
                .anyRequest().authenticated()
            )
            .build();
    }
}
```

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

**Remember**: Add `hilla-spring-boot-starter` dependency for React support.

## Component Ecosystem

**Use Vaadin's comprehensive component library first** before creating custom components. Vaadin 25 includes:

**Data Display & Entry**: Auto CRUD (React only), Auto Grid (React only), Auto Form (React only), Button, Checkbox, Combo Box, Custom Field, Date Picker, Date Time Picker, Email Field, Multi-Select Combo Box, Number Field, Password Field, Radio Button, Select, Text Area, Text Field, Time Picker

**Layouts**: App Layout, Form Layout, Horizontal Layout, Master-Detail Layout, Scroller, Split Layout, Vertical Layout

**Data Visualization**: Charts, Dashboard, Grid, Grid Pro, Tree Grid (with flattened hierarchy mode), Virtual List

**Navigation & UI**: Accordion, Avatar, Badge, Context Menu, Details, Dialog, Icons, List Box, Menu Bar, Notification, Popover, Side Navigation, Tabs, Tooltip (with Markdown support)

**Advanced**: Card, Confirm Dialog, CRUD, Login, Map (with marker clustering), Markdown, Message Input, Message List, Progress Bar, Rich Text Editor, Spreadsheet, Upload

**Removed in V25**: Board, Cookie Consent

**Approach**: Compose existing components and layouts before building custom ones from scratch.

## React @BrowserCallable Endpoints

React projects use **type-safe communication** between React frontend and Java backend through `@BrowserCallable` endpoints.

### Dependencies for React/Hilla

```xml
<dependencies>
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-spring-boot-starter</artifactId>
    </dependency>
    <!-- Required for development mode -->
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-dev</artifactId>
        <optional>true</optional>
    </dependency>
    <!-- Required for React views in Vaadin 25 -->
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>hilla-spring-boot-starter</artifactId>
    </dependency>
</dependencies>
```

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
            <version>25.x.x</version>
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
    <!-- Required for development mode (hot reload, debug features) -->
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>vaadin-dev</artifactId>
        <optional>true</optional>
    </dependency>
    <!-- Add only if using React views -->
    <dependency>
        <groupId>com.vaadin</groupId>
        <artifactId>hilla-spring-boot-starter</artifactId>
    </dependency>
</dependencies>
```

**Maven Plugin**: `vaadin-maven-plugin` handles frontend resources, optimization, TypeScript compilation, API generation (`vaadin:generate` for React projects)

## Deployment & Production

**Deployment**: Executable JAR (recommended), Docker containers, any Java-compatible cloud platform

**Production Build**: `./mvnw clean package`

**Note**: Vaadin 25 **no longer requires** a dedicated `production` Maven profile. Standard Java build conventions now apply - both Maven and Gradle build production artifacts by default, with development builds only in IDE environments.

---

**Important**: When working on existing projects, stick to the existing patterns in the project. For new projects or when users ask for architectural guidance, recommend the feature-based package structure described above.

## Migration from Vaadin 24

If migrating from Vaadin 24, note these key changes:
- Update to **Java 21** and **Spring Boot 4**
- Replace Material theme with Aura or Lumo
- Add explicit theme selection (no default theme)
- Add `hilla-spring-boot-starter` if using React views
- Replace `VaadinWebSecurity` with `VaadinSecurityConfigurer`
- Remove `production` Maven profile (no longer needed)
- Update offline license for Vaadin 25+