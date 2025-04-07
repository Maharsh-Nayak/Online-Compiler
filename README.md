# Online-Compiler
This is an online compiler

## Docker Setup

You can also run the entire application using Docker:

1. Make sure you have [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

2. Build and start the containers:
   ```
   docker-compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

4. To stop the containers:
   ```
   docker-compose down
   ```

5. To view logs:
   ```
   docker-compose logs -f
   ```
