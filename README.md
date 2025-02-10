<p align="center">
  <a href="https://universitariadecolombia.edu.co/" target="blank"><img src="./.github/Images/Logo_universitaria.png" width="" alt="Logo Universitaria de colombia" /></a>
</p>


<p align="center">
  <a href="https://www.facebook.com/universitariaco/" target="_blank"><img src="https://img.shields.io/badge/Facebook-follow%20us-blue?style=flat" alt="Facebook" /></a>
  <a href="https://www.instagram.com/universitaria_oficial/" target="_blank"><img src="https://img.shields.io/badge/Instagram-follow%20us-pink?style=flat" alt="Instagram" /></a>
  <a href="https://universitariadecolombia.edu.co/" target="_blank"><img src="https://img.shields.io/badge/Pagina%20Oficial-Visitanos-green?style=flat" alt="Página Oficial" /></a>
</p>


# Proyecto Final - Sistema de Gestión de Biblioteca Universitaria

## Tabla de Contenidos
- [Proyecto Final - Sistema de Gestión de Biblioteca Universitaria](#proyecto-final---sistema-de-gestión-de-biblioteca-universitaria)
  - [Tabla de Contenidos](#tabla-de-contenidos)
  - [Presentación del Proyecto](#presentación-del-proyecto)
    - [Título: Sistema Integral de Gestión Bibliotecaria](#título-sistema-integral-de-gestión-bibliotecaria)
    - [Integrantes del Equipo:](#integrantes-del-equipo)
    - [Institución: Universidad de Colombia](#institución-universidad-de-colombia)
  - [1. Introducción](#1-introducción)
  - [2. Objetivos](#2-objetivos)
    - [Objetivo General](#objetivo-general)
    - [Objetivos Específicos](#objetivos-específicos)
  - [3. Arquitectura Tecnológica](#3-arquitectura-tecnológica)
    - [Backend](#backend)
    - [Principales Características Técnicas](#principales-características-técnicas)
  - [4. Funcionalidades Principales](#4-funcionalidades-principales)
    - [Módulo de Autenticación](#módulo-de-autenticación)
    - [Módulo de Préstamos](#módulo-de-préstamos)
    - [Módulo de Devoluciones](#módulo-de-devoluciones)
    - [Módulo de Multas](#módulo-de-multas)
  - [5. Características de Seguridad](#5-características-de-seguridad)
  - [6. Estructura de Datos](#6-estructura-de-datos)
    - [Modelos Principales](#modelos-principales)
  - [7. Servicios Adicionales](#7-servicios-adicionales)
    - [Almacenamiento en la Nube](#almacenamiento-en-la-nube)
    - [Conexión a Base de Datos](#conexión-a-base-de-datos)
  - [8. Buenas Prácticas Implementadas](#8-buenas-prácticas-implementadas)
  - [9. Desafíos y Soluciones](#9-desafíos-y-soluciones)
    - [Desafíos Encontrados](#desafíos-encontrados)
    - [Soluciones Implementadas](#soluciones-implementadas)
  - [10. Trabajo a Futuro](#10-trabajo-a-futuro)
  - [Conclusiones](#conclusiones)

## Presentación del Proyecto

### Título: Sistema Integral de Gestión Bibliotecaria

### Integrantes del Equipo:
- Juan Camilo Solano Rodríguez
- Javier Moreno
- Gustavo Holguín

### Institución: Universidad de Colombia

## 1. Introducción

El presente proyecto desarrolla un sistema de gestión bibliotecaria integral, diseñado para optimizar y modernizar los procesos de administración, préstamo y control de recursos bibliográficos en una institución universitaria.

## 2. Objetivos

### Objetivo General
Crear una solución tecnológica completa que simplifique la gestión bibliotecaria, mejorando la experiencia tanto para usuarios como para administradores.

### Objetivos Específicos
- Implementar un sistema de autenticación seguro
- Gestionar préstamos y devoluciones de libros
- Controlar el inventario de recursos bibliográficos
- Proporcionar herramientas de administración eficientes

## 3. Arquitectura Tecnológica

### Backend
- **Lenguaje**: TypeScript
- **Framework**: Express.js
- **Base de Datos**: MongoDB
- **Autenticación**: JWT (JSON Web Tokens)
- **Servicios Adicionales**: AWS S3 para almacenamiento de archivos

### Principales Características Técnicas
- Middleware de autenticación robusto
- Sistema de roles (Admin/Usuario)
- Validaciones de seguridad en cada endpoint
- Manejo de errores estructurado

## 4. Funcionalidades Principales

### Módulo de Autenticación
- Inicio de sesión con Google
- Validación de tokens
- Control de acceso por roles
- Gestión de sesiones

### Módulo de Préstamos
- Registro de préstamos
- Renovación de préstamos
- Verificación de estados
- Control de inventario

### Módulo de Devoluciones
- Registro de devoluciones
- Verificación de estado de libros
- Gestión de multas por atrasos o daños

### Módulo de Multas
- Generación automática de multas
- Procesamiento de pagos
- Informes de multas por usuario

## 5. Características de Seguridad

- Autenticación mediante JWT
- Validación de permisos por rol
- Protección contra ataques comunes
- Registro y logging de acciones
- Sanitización de inputs
- Control de acceso granular

## 6. Estructura de Datos

### Modelos Principales
- **Usuario**
  - Información personal
  - Roles y permisos
  - Estado de cuenta

- **Libro**
  - Detalles bibliográficos
  - Inventario
  - Estado de conservación

- **Préstamo**
  - Información de usuario y libro
  - Estados de préstamo
  - Costos y renovaciones

- **Multa**
  - Vinculación a préstamos
  - Estados de pago
  - Tipos de multa

## 7. Servicios Adicionales

### Almacenamiento en la Nube
- Servicio AWS S3 para gestión de archivos
- Subida y eliminación de imágenes
- Generación de URLs públicas

### Conexión a Base de Datos
- Patrón Singleton para MongoDB
- Gestión de conexiones
- Monitoreo de estado de conexión

## 8. Buenas Prácticas Implementadas

- Documentación detallada
- Código TypeScript con tipado estricto
- Principios SOLID
- Manejo de errores consistente
- Seguridad como prioridad
- Escalabilidad del sistema

## 9. Desafíos y Soluciones

### Desafíos Encontrados
- Autenticación segura
- Gestión de préstamos complejos
- Control de inventario

### Soluciones Implementadas
- JWT con validaciones múltiples
- Middlewares de control de estado
- Sistema de inventario dinámico

## 10. Trabajo a Futuro

- Implementación de API pública
- Integración con más servicios
- Panel de analytics
- Mejoras de UI/UX
- Expansión de funcionalidades

## Conclusiones

El proyecto representa una solución tecnológica moderna para la gestión bibliotecaria, combinando seguridad, eficiencia y escalabilidad.

---

**Nota**: Este documento representa un resumen ejecutivo del proyecto, destacando sus principales características, arquitectura y contribuciones tecnológicas.