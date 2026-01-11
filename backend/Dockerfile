# Usar imagen base oficial de Node.js LTS (Alpine para menor tamaño)
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos de dependencias primero para aprovechar caché de Docker
COPY package*.json ./

# Instalar dependencias de producción
# Usamos 'ci' (clean install) para builds reproducibles
RUN npm ci --only=production

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto que usa la app
EXPOSE 3000

# Variable de entorno para producción
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

