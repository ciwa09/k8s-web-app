# Use the official Node.js image as the base image
#FROM node:14
FROM node:alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json
COPY package*.json ./
COPY index.js ./

# Copy your application files to the container
COPY public ./public
COPY views ./views

# Install app dependencies
RUN npm install

# Expose the port your app is running on
EXPOSE 8080

# Command to start your app
CMD [ "node", "index.js" ]
