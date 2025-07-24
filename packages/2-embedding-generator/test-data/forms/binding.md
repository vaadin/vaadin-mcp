---
framework: flow
source_url: https://vaadin.com/docs/forms/binding
title: Fields & Binding
processed_at: 2025-07-23T14:01:01.312Z
---

# Fields & Binding

Data binding connects your form fields to your data model automatically. In Vaadin Flow, the `Binder` class provides a powerful and type-safe way to bind form fields to Java objects.

## Setting Up a Binder

To start using data binding, create a `Binder` instance for your data type:

```java
public class PersonForm extends VerticalLayout {
    private TextField firstName = new TextField("First Name");
    private TextField lastName = new TextField("Last Name");
    private EmailField email = new EmailField("Email");
    
    private Binder<Person> binder = new Binder<>(Person.class);
    
    public PersonForm() {
        add(firstName, lastName, email);
        bindFields();
    }
    
    private void bindFields() {
        binder.forField(firstName)
            .asRequired("First name is required")
            .bind(Person::getFirstName, Person::setFirstName);
            
        binder.forField(lastName)
            .asRequired("Last name is required")
            .bind(Person::getLastName, Person::setLastName);
            
        binder.forField(email)
            .asRequired("Email is required")
            .withValidator(new EmailValidator("Invalid email"))
            .bind(Person::getEmail, Person::setEmail);
    }
}
```

## Field Validation

The Binder provides built-in validation support. You can add validators to ensure data integrity:

### Required Fields

Mark fields as required using `asRequired()`:

```java
binder.forField(firstName)
    .asRequired("First name is required")
    .bind(Person::getFirstName, Person::setFirstName);
```

### Custom Validators

Create custom validation logic for complex requirements:

```java
binder.forField(age)
    .withValidator(age -> age >= 18, "Must be 18 or older")
    .bind(Person::getAge, Person::setAge);
``` 