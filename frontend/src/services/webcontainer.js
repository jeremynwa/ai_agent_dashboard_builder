import { WebContainer } from '@webcontainer/api';

let webcontainerInstance = null;

export async function getWebContainer() {
  if (!webcontainerInstance) {
    webcontainerInstance = await WebContainer.boot();
  }
  return webcontainerInstance;
}

export async function writeFile(path, content) {
  const wc = await getWebContainer();
  await wc.fs.writeFile(path, content);
}

export async function readFile(path) {
  const wc = await getWebContainer();
  return await wc.fs.readFile(path, 'utf-8');
}

export async function installDependencies(terminal) {
  const wc = await getWebContainer();
  const installProcess = await wc.spawn('npm', ['install']);
  
  installProcess.output.pipeTo(new WritableStream({
    write(data) {
      terminal(data);
    }
  }));
  
  return installProcess.exit;
}

export async function startDevServer(terminal) {
  const wc = await getWebContainer();
  const serverProcess = await wc.spawn('npm', ['run', 'dev']);
  
  serverProcess.output.pipeTo(new WritableStream({
    write(data) {
      terminal(data);
    }
  }));
  
  wc.on('server-ready', (port, url) => {
    terminal(`\n✅ Server ready at ${url}\n`);
  });
  
  return wc;
}