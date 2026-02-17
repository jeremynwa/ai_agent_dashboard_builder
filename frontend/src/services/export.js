import JSZip from 'jszip';
import { fromSandpackFiles } from './files-template';

export async function exportToZip(files) {
  const zip = new JSZip();

  // Support both Sandpack flat format and legacy tree format
  let flatFiles;
  if (files && typeof Object.values(files)[0] === 'string') {
    // Sandpack flat format: { '/path': 'code' }
    flatFiles = fromSandpackFiles(files);
  } else if (files && Object.values(files)[0]?.file) {
    // Legacy WebContainer tree format (backward compat)
    flatFiles = {};
    const addFiles = (obj, path = '') => {
      for (const [name, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}/${name}` : name;
        if (value.directory) {
          addFiles(value.directory, fullPath);
        } else if (value.file) {
          flatFiles[fullPath] = value.file.contents;
        }
      }
    };
    addFiles(files);
  } else {
    flatFiles = files;
  }

  // Add all source files
  for (const [path, content] of Object.entries(flatFiles)) {
    zip.file(path, content);
  }

  // Add package.json if not present (Sandpack template handles it, but export needs it)
  if (!flatFiles['package.json']) {
    zip.file('package.json', JSON.stringify({
      name: "generated-app",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        recharts: "^2.12.0"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.0.0",
        vite: "^5.0.0"
      }
    }, null, 2));
  }

  // Add vite.config.js if not present
  if (!flatFiles['vite.config.js']) {
    zip.file('vite.config.js', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
})
`);
  }

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
