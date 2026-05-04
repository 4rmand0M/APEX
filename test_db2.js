import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('/home/desktop-arm/Descargas/af/.env', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('routine_exercises').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
