---
framework: hilla
source_url: https://vaadin.com/docs/forms/validation
title: Form Validation
processed_at: 2025-07-23T14:01:01.312Z
---

# Form Validation

Form validation ensures that user input meets your application's requirements before processing. Hilla provides powerful client-side and server-side validation capabilities.

## Client-Side Validation

Hilla forms support real-time validation in the browser:

```typescript
import { field, form } from '@hilla/form';
import { Email, NotEmpty, Size } from '@hilla/form/validators';

interface PersonData {
  firstName: string;
  lastName: string;
  email: string;
}

const personForm = form(PersonData, {
  firstName: field(NotEmpty({ message: 'First name is required' })),
  lastName: field(NotEmpty({ message: 'Last name is required' })),
  email: field(
    NotEmpty({ message: 'Email is required' }),
    Email({ message: 'Invalid email format' })
  )
});
```

## Server-Side Validation

Always validate data on the server for security:

```java
@Endpoint
public class PersonEndpoint {
    
    public void savePerson(@Valid PersonData person) {
        // Validation is automatically applied
        personService.save(person);
    }
}

public class PersonData {
    @NotEmpty(message = "First name is required")
    @Size(min = 2, max = 50, message = "Name must be 2-50 characters")
    private String firstName;
    
    @NotEmpty(message = "Last name is required") 
    @Size(min = 2, max = 50, message = "Name must be 2-50 characters")
    private String lastName;
    
    @NotEmpty(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
}
``` 