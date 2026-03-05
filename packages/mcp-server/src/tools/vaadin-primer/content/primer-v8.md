# Vaadin 8 Development Primer

**Important: Vaadin 8 is a legacy version (2017-2020) that has reached end-of-life. This primer provides context for maintaining existing applications and guidance on upgrading to modern Vaadin.**

## Vaadin 8 Requirements

| Requirement | Version |
|-------------|---------|
| **Java** | 8+ |
| **Servlet** | 3.1+ |
| **UI Technology** | GWT (Google Web Toolkit) |
| **Build Tool** | Maven |

**Status**: End-of-life. No longer receiving updates or security patches.

## What is Vaadin 8?

Vaadin 8 is the **last major GWT-based version** of Vaadin. It features significant improvements to data binding and component APIs while maintaining the server-side Java development model.

### Architecture

- **Server-side UI model**: All UI components exist as Java objects on the server
- **GWT widgets**: Client-side rendering using compiled GWT JavaScript widgets
- **Improved data binding**: New type-safe `Binder` API replacing legacy data model
- **Push support**: Server-push via WebSocket or long polling

### Key Improvements over Vaadin 7

**New Binder API**: Type-safe data binding with validation
```java
Binder<Person> binder = new Binder<>(Person.class);

binder.forField(nameField)
    .asRequired("Name is required")
    .bind(Person::getName, Person::setName);

binder.forField(emailField)
    .withValidator(new EmailValidator("Invalid email"))
    .bind(Person::getEmail, Person::setEmail);

binder.setBean(person);
```

**Grid Improvements**: Better rendering, inline editing, component columns
```java
Grid<Person> grid = new Grid<>(Person.class);
grid.setItems(personList);

grid.addColumn(person -> person.getFirstName() + " " + person.getLastName())
    .setCaption("Full Name");

grid.addComponentColumn(person -> new Button("Edit", e -> edit(person)))
    .setCaption("Actions");
```

**ComponentRenderer**: Embed any component in Grid cells
```java
grid.addColumn(new ComponentRenderer<>(person -> {
    Image avatar = new Image();
    avatar.setSource(new ExternalResource(person.getAvatarUrl()));
    return avatar;
}));
```

## Key Concepts

**VaadinUI**: Main entry point (same as Vaadin 7)
```java
@Theme("mytheme")
public class MyUI extends UI {
    @Override
    protected void init(VaadinRequest request) {
        setContent(new MainView());
    }
}
```

**Navigator**: View navigation within the application
```java
Navigator navigator = new Navigator(this, viewContainer);
navigator.addView("", HomeView.class);
navigator.addView("users", UserListView.class);
```

**Themes**: Valo-based themes with SCSS customization

## Key Differences from Modern Vaadin

| Aspect | Vaadin 8 | Vaadin 24+ |
|--------|----------|------------|
| **Client-side** | GWT compiled widgets | Web Components |
| **React support** | Not available | Full Hilla/React integration |
| **npm/Node.js** | Not used | Required for frontend |
| **Navigation** | Navigator class | @Route annotation |
| **Theme system** | Valo/SCSS | Lumo/Aura CSS |
| **Security** | Manual integration | Built-in Spring Security |
| **Spring Boot** | Optional add-on | First-class support |

## Working with Existing Vaadin 8 Projects

### Project Structure
```
src/
├── main/
│   ├── java/
│   │   └── com/example/
│   │       ├── MyUI.java           # Main UI class
│   │       ├── views/              # View classes
│   │       └── data/               # Data layer
│   ├── resources/
│   │   └── META-INF/
│   │       └── context.xml
│   └── webapp/
│       ├── VAADIN/
│       │   └── themes/mytheme/     # Custom theme (SCSS)
│       └── WEB-INF/
│           └── web.xml             # Servlet configuration
```

### Dependencies (Maven)
```xml
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-server</artifactId>
    <version>8.14.x</version>
</dependency>
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-client-compiled</artifactId>
    <version>8.14.x</version>
</dependency>
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-themes</artifactId>
    <version>8.14.x</version>
</dependency>
```

### Optional Spring Boot Integration
```xml
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-spring-boot-starter</artifactId>
    <version>3.x</version>
</dependency>
```

## Getting Version-Specific Help

Use the documentation search with version filter:
```
search_vaadin_docs(query: "your question", vaadin_version: "8")
```

**Note**: Vaadin 8 documentation is archived. Some features may have limited documentation available.

## Upgrade Recommendations

**Strongly recommended**: Upgrade to Vaadin 24 or 25 for:
- Active maintenance and security updates
- Modern Web Component architecture
- React/Hilla support for client-side development
- Better performance and smaller bundle sizes
- Comprehensive component library
- Native Spring Boot integration

### Upgrade Path

1. **Vaadin 8 → Vaadin 23**: Major rewrite required (GWT → Web Components)
   - Use the API-compatible Feature Pack components for smooth migration
   - Fallback option: go to Vaadin 14 if Java 8 is needed first
   - Rewrite views using new component APIs
2. **Vaadin 23 → Vaadin 24**: Smoother upgrade with mostly compatible APIs

### Migration Strategies

**Big Bang**: Complete rewrite to modern Vaadin
- Best for smaller applications
- Clean break from legacy code

**Gradual Migration with MPR**: Run Vaadin 8 views inside modern Vaadin
- Multiplatform Runtime allows legacy views alongside new ones
- Migrate view-by-view over time

---

**Resources**:
- Archived documentation: https://vaadin.com/docs (select version 8)
- Migration guides: Search documentation for "migration" or "MPR"
- Multiplatform Runtime: Search for "multiplatform runtime" in Vaadin 14 docs
