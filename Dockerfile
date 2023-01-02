# syntax=docker/dockerfile:1.0-experimental
FROM node:16-slim
ARG APP_ENV
ENV APP_ENV ${APP_ENV}
# Set workdir
WORKDIR /app
# Add files from repo
ADD . .
# Install package
RUN --mount=type=cache,target=/root/.npm,rw npm config set unsafe-perm true && \
    npm install -g --unsafe-perm --allow-root && \
    npm install --unsafe-perm --allow-root
# Expose port
EXPOSE 8080
# Run application
CMD npm start
