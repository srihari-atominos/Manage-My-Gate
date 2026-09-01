import dotenv from 'dotenv';
dotenv.config();

// We will fetch it from localhost:3000 or whatever port the app runs on.
// But we need an auth token. Since we don't have one, we can't easily do it.
// I'll just write a script to look at the process list and see how node is running.
import { execSync } from 'child_process';
try {
  const output = execSync('wmic process where "name=\'node.exe\'" get commandline').toString();
  console.log(output);
} catch(e) {
  console.log(e);
}
