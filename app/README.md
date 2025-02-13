# Celebration Frontend Application

## Overview
A modern, responsive Angular application for event scheduling and management.

## Technologies Used
- Angular 19
- TypeScript
- RxJS
- Angular Material
- Moment.js (for date/time handling)

## Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Angular CLI 19.x

## Project Structure
```
src/
├── app/
│   ├── components/
│   │   ├── calendar/
│   │   ├── event-dialog/
│   │   └── sidenav/
│   ├── models/
│   ├── services/
│   └── app.module.ts
├── assets/
└── styles/
```

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
# Start development server
ng serve

# Open browser to http://localhost:4200
```

### 3. Build for Production
```bash
# Compile and optimize
ng build --configuration=production
```

## Available Scripts

### Development
```bash
# Start development server
npm start

# Run with specific port
ng serve --port 4200
```

### Testing
```bash
# Run unit tests
npm test

# Run end-to-end tests
npm run e2e
```

### Build
```bash
# Development build
npm run build

# Production build
npm run build:prod
```

## Code Generation
```bash
# Generate component
ng generate component component-name

# Generate service
ng generate service service-name
```

## Configuration

### Environment Files
- `environment.ts`: Development configuration
- `environment.prod.ts`: Production configuration

### Customize Configuration
Edit `angular.json` to modify build and serve settings.

## Performance Optimization
- Lazy loading of modules
- Ahead-of-Time (AOT) compilation
- Production build minimization

## Troubleshooting
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Edge (latest)

## Known Limitations
- Requires modern browser with ES6 support
- Limited to weekly recurring events
- No user authentication in this version

## Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create pull request

## License
ISC License
