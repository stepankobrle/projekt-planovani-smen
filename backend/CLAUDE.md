# Backend Instructions

## Stack

- NestJS
- Prisma (ORM)
- TypeScript

## Best Practices

- Use the latest NestJS features and recommended patterns (modules, guards, interceptors, pipes).
- Use Prisma Client for all database access – no raw SQL unless explicitly requested.
- Follow NestJS dependency injection principles.
- Validate all incoming data using class-validator and class-transformer DTOs.
- Use proper HTTP status codes and structured error handling via NestJS exception filters.

## Project Context

- REST API pro správu uživatelů, dostupností, směn a rozvrhů.
- Obsahuje plánovací logiku pro automatické generování optimálního rozvrhu na základě dostupností zaměstnanců.
- Export rozvrhu do PDF a .ics (kalendářový soubor).
- Role: ADMIN, EMPLOYEE.
