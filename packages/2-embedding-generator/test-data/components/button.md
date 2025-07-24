---
framework: common
source_url: https://vaadin.com/docs/components/button
title: Button Component
processed_at: 2025-07-23T14:01:01.312Z
---

# Button Component

The Button component allows users to perform actions in your application. Buttons are fundamental UI elements that trigger events when clicked.

## Basic Usage

Create a simple button:

```java
Button button = new Button("Click me");
button.addClickListener(e -> {
    Notification.show("Button clicked!");
});
```

## Button Variants

Buttons support different visual styles:

### Primary Button

```java
Button primary = new Button("Primary");
primary.addThemeVariants(ButtonVariant.LUMO_PRIMARY);
```

### Secondary Button

```java
Button secondary = new Button("Secondary");
// Default style is secondary
```

### Tertiary Button

```java
Button tertiary = new Button("Tertiary");
tertiary.addThemeVariants(ButtonVariant.LUMO_TERTIARY);
```

## Icon Buttons

Add icons to enhance the user experience:

```java
Button iconButton = new Button("Save", VaadinIcon.DOWNLOAD.create());
iconButton.addThemeVariants(ButtonVariant.LUMO_PRIMARY);
``` 