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
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    // try to login
    const res = await supabase.auth.signInWithPassword({ email: 'test@apex.com', password: 'password123' });
    console.log("Auth:", res.data?.user ? 'Success' : 'Fail');
  }

  const { data: routines } = await supabase.from('routines').select('*').limit(1);
  if (routines && routines.length > 0) {
    const r = routines[0];
    const payload = [{
      routine_id: r.id,
      exercise_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // dummy
      order: 1,
      target_sets: 3,
      target_reps: '10',
      rest_time_seconds: 60
    }];
    console.log("Trying to insert into routine_exercises:", payload);
    const { error } = await supabase.from('routine_exercises').insert(payload);
    console.log("Insert Error:", error);
  } else {
    console.log("No routines found.");
  }
}
check();
