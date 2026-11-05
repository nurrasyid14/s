FROM node:20-alpine

WORKDIR /app

# Copy dependency definition files first
COPY frontend/package*.json ./

RUN npm install

# Copy frontend source
COPY frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

