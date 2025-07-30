### Build stage
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY . ./

RUN npm install && npm run build

### Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a basic nginx configuration (optional)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]