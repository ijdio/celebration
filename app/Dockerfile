FROM node:18-alpine as build

WORKDIR /app

# Install global dependencies
RUN npm install -g @angular/cli

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy entire project
COPY . .

# Build the application with increased memory
RUN node --max_old_space_size=4096 ./node_modules/@angular/cli/bin/ng build --configuration=production

FROM nginx:alpine
COPY --from=build /app/dist/app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
