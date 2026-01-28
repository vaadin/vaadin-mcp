# Vaadin 7 Development Primer

**Important: Vaadin 7 is a legacy version (2013-2018) that has reached end-of-life. This primer provides context for maintaining existing applications and guidance on upgrading to modern Vaadin.**

## Vaadin 7 Requirements

| Requirement | Version |
|-------------|---------|
| **Java** | 6+ |
| **Servlet** | 3.0+ |
| **UI Technology** | GWT (Google Web Toolkit) |
| **Build Tool** | Maven or Ant |

**Status**: End-of-life. No longer receiving updates or security patches.

## What is Vaadin 7?

Vaadin 7 is a **server-side Java web framework** built on GWT (Google Web Toolkit). The entire UI is written in Java on the server side, with GWT compiling Java to JavaScript for the client.

### Architecture

- **Server-side UI model**: All UI components exist as Java objects on the server
- **GWT widgets**: Client-side rendering using compiled GWT JavaScript widgets
- **AJAX communication**: Automatic synchronization between server and client via JSON
- **Push support**: Server-push capabilities via WebSocket or long polling

### Key Concepts

**VaadinUI**: The main entry point for applications
```java
@Theme("mytheme")
public class MyUI extends UI {
    @Override
    protected void init(VaadinRequest request) {
        setContent(new Button("Click me", e ->
            Notification.show("Hello!")));
    }
}
```

**Components**: Button, TextField, Table, Grid (introduced in 7.4+), Form, etc.

**Data Binding**: `BeanItemContainer` and `Property` interfaces for binding data to components
```java
BeanItemContainer<Person> container =
    new BeanItemContainer<>(Person.class);
container.addAll(personList);
table.setContainerDataSource(container);
```

**Themes**: Custom CSS themes extending the default Valo theme

## Key Differences from Modern Vaadin

| Aspect | Vaadin 7 | Vaadin 24+ |
|--------|----------|------------|
| **Client-side** | GWT compiled widgets | Web Components |
| **React support** | Not available | Full Hilla/React integration |
| **npm/Node.js** | Not used | Required for frontend |
| **Data binding** | BeanItemContainer | Binder API |
| **Grid** | Basic Grid (7.4+) | Advanced Grid/TreeGrid |
| **Theme system** | Valo/custom SCSS | Lumo/Aura CSS |
| **Security** | Manual integration | Built-in Spring Security |

## Working with Existing Vaadin 7 Projects

### Project Structure
```
src/
├── main/
│   ├── java/
│   │   └── com/example/
│   │       ├── MyUI.java           # Main UI class
│   │       └── views/              # View classes
│   ├── resources/
│   │   └── META-INF/
│   │       └── context.xml
│   └── webapp/
│       ├── VAADIN/
│       │   └── themes/mytheme/     # Custom theme
│       └── WEB-INF/
│           └── web.xml             # Servlet configuration
```

### Dependencies (Maven)
```xml
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-server</artifactId>
    <version>7.7.x</version>
</dependency>
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-client-compiled</artifactId>
    <version>7.7.x</version>
</dependency>
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-themes</artifactId>
    <version>7.7.x</version>
</dependency>
```

## Getting Version-Specific Help

Use the documentation search with version filter:
```
search_vaadin_docs(query: "your question", vaadin_version: "7")
```

**Note**: Vaadin 7 documentation is archived. Some features may have limited documentation available.

## Upgrade Recommendations

**Strongly recommended**: Upgrade to Vaadin 24 or 25 for:
- Active maintenance and security updates
- Modern Web Component architecture
- React/Hilla support for client-side development
- Better performance and smaller bundle sizes
- Comprehensive component library
- Spring Boot integration

### Upgrade Path

1. **Vaadin 7 → Vaadin 8**: Incremental upgrade with migration tools
2. **Vaadin 8 → Vaadin 14**: Major rewrite (GWT → Web Components)
3. **Vaadin 14 → Vaadin 24**: Smoother upgrade path

For complex applications, consider a phased migration or greenfield rewrite with modern Vaadin.

---

**Resources**:
- Archived documentation: https://vaadin.com/docs (select version 7)
- Migration guides: Search documentation for "migration" with target version
