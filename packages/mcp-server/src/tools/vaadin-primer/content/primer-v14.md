# Vaadin 14 Development Primer

**Important: Vaadin 14 is a legacy LTS version (2019-2024) that has reached end-of-life. This primer provides context for maintaining existing applications and guidance on upgrading to Vaadin 24+.**

## Vaadin 14 Requirements

| Requirement | Version |
|-------------|---------|
| **Java** | 8+ (11+ recommended) |
| **Servlet** | 3.1+ |
| **Spring Boot** | 2.x |
| **Node.js** | 10+ (auto-handled by Vaadin) |
| **UI Technology** | Web Components + Flow |

**Status**: End-of-life (LTS ended 2024). Extended maintenance may be available through commercial support.

## What is Vaadin 14?

Vaadin 14 is the **first modern Web Component-based version** of Vaadin and the first Long-Term Support (LTS) release with the new architecture. It features Flow (server-side Java development with Web Components) but predates Hilla (React integration).

### Architecture

- **Web Components**: Modern client-side components (Polymer/Lit-based)
- **Flow**: Server-side Java component model with automatic client-server sync
- **npm integration**: Frontend dependencies managed via npm/Node.js
- **No Hilla/React**: Client-side development limited to Lit templates

### Key Concepts

**@Route Annotation**: Declarative view routing
```java
@Route("dashboard")
public class DashboardView extends VerticalLayout {
    public DashboardView() {
        add(new H1("Dashboard"));
    }
}
```

**Main Layout**: Shared layout wrapper
```java
@Route(value = "users", layout = MainLayout.class)
public class UsersView extends VerticalLayout {
    // View content
}
```

**Binder**: Type-safe data binding (inherited from Vaadin 8, enhanced)
```java
Binder<Person> binder = new Binder<>(Person.class);
binder.forField(nameField)
    .asRequired()
    .bind(Person::getName, Person::setName);
```

**Grid**: Modern data grid with lazy loading
```java
Grid<Person> grid = new Grid<>(Person.class, false);
grid.addColumn(Person::getName).setHeader("Name");
grid.addColumn(Person::getEmail).setHeader("Email");
grid.setItems(query -> personService.fetch(query.getOffset(), query.getLimit()));
```

## Key Differences from Modern Vaadin

| Aspect | Vaadin 14 | Vaadin 24+ |
|--------|-----------|------------|
| **React/Hilla** | Not available | Full support |
| **Spring Boot** | 2.x only | 3.x/4.x |
| **Java** | 8-17 | 17+/21+ |
| **Jakarta EE** | javax.* namespace | jakarta.* namespace |
| **Theme** | Lumo (default) | Lumo/Aura |
| **Polymer** | Polymer 3 templates | Lit templates |
| **Security** | VaadinWebSecurity | VaadinSecurityConfigurer (V25) |

## Working with Existing Vaadin 14 Projects

### Project Structure
```
src/
├── main/
│   ├── java/
│   │   └── com/example/
│   │       ├── Application.java         # Spring Boot entry point
│   │       ├── views/
│   │       │   ├── MainLayout.java      # App layout
│   │       │   └── dashboard/           # Feature views
│   │       └── data/                    # Entities, repositories
│   ├── resources/
│   │   └── application.properties
│   └── frontend/                        # Frontend resources
│       ├── styles/                      # Custom CSS
│       └── templates/                   # Lit templates (optional)
```

### Dependencies (Maven)
```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.vaadin</groupId>
            <artifactId>vaadin-bom</artifactId>
            <version>14.10.x</version>
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

### Lit Templates (Vaadin 14 Style)
```java
@Tag("user-card")
@JsModule("./templates/user-card.ts")
public class UserCard extends LitTemplate {
    @Id("name")
    private Span nameSpan;

    public void setUser(User user) {
        nameSpan.setText(user.getName());
    }
}
```

## Getting Version-Specific Help

Use the documentation search with version filter:
```
search_vaadin_docs(query: "your question", vaadin_version: "14")
```

## Upgrade Recommendations

**Strongly recommended**: Upgrade to Vaadin 24 for:
- Active maintenance and security updates
- Spring Boot 3.x support (required for new Spring ecosystem)
- Jakarta EE namespace (javax.* → jakarta.*)
- Hilla/React support for client-side development
- Performance improvements
- New components and features

### Upgrade Path: Vaadin 14 → Vaadin 24

The upgrade from Vaadin 14 to 24 is relatively straightforward compared to earlier major version jumps:

**1. Update Dependencies**
```xml
<vaadin.version>24.x.x</vaadin.version>
```

**2. Java Version**
- Minimum Java 17 required
- Java 21 recommended

**3. Spring Boot Upgrade**
- Upgrade from Spring Boot 2.x to 3.x
- Update `javax.*` imports to `jakarta.*`

**4. Namespace Migration**
```java
// Before (Vaadin 14)
import javax.servlet.annotation.WebServlet;

// After (Vaadin 24)
import jakarta.servlet.annotation.WebServlet;
```

**5. Component API Changes**
- Most Flow component APIs are compatible
- Check deprecated APIs and update as needed
- Review any Lit templates for compatibility

**6. Security Configuration**
```java
// Vaadin 14
public class SecurityConfig extends VaadinWebSecurity {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        super.configure(http);
        // ...
    }
}

// Vaadin 24+
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // VaadinSecurityConfigurer in V25
        // ...
    }
}
```

### Migration Checklist

- [ ] Update Java to 17+
- [ ] Update Spring Boot to 3.x
- [ ] Update Vaadin BOM to 24.x
- [ ] Replace javax.* with jakarta.* imports
- [ ] Review and update deprecated APIs
- [ ] Test all views and functionality
- [ ] Update custom themes if needed

---

**Resources**:
- Migration guide: Search "Vaadin 14 to 24 migration" in documentation
- Release notes: Check Vaadin 24 release notes for breaking changes
- Compatibility matrix: https://vaadin.com/docs (version compatibility section)
