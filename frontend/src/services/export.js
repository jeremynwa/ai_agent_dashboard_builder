import JSZip from 'jszip';

export async function exportToZip(files) {
  const zip = new JSZip();

  const addFiles = (obj, path = '') => {
    for (const [name, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}/${name}` : name;
      
      if (value.directory) {
        addFiles(value.directory, fullPath);
      } else if (value.file) {
        zip.file(fullPath, value.file.contents);
      }
    }
  };

  addFiles(files);

  // Ajouter Dockerfile
  zip.file('Dockerfile', `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
`);

  // Ajouter docker-compose.yml
  zip.file('docker-compose.yml', `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
`);

  // Ajouter README
  zip.file('README.md', `# Generated App

## Option 1: Avec Docker
\`\`\`
docker-compose up
\`\`\`
Ouvre http://localhost:3000

## Option 2: Sans Docker
\`\`\`
npm install
npm run dev
\`\`\`
Ouvre http://localhost:3000
`);

  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Télécharger
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'app-export.zip';
  a.click();
  URL.revokeObjectURL(url);
}