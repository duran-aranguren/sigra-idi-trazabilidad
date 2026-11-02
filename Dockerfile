# SIGRA · Trazabilidad I+D+i — imagen para hosting (Render, Railway, Fly.io…)
FROM node:24-slim
WORKDIR /app
COPY . .
# Datos persistentes en /data (monta ahí un disco/volumen para no perderlos al redesplegar)
RUN mkdir -p /data/uploads && chown -R node:node /data /app
ENV NODE_ENV=production IDI_PUBLICO=1 IDI_HTTPS=1 IDI_DB=/data/idi.db IDI_UPLOADS=/data/uploads PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
